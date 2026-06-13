from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import torch
from torchvision.models.detection import ssd300_vgg16
import cv2
import numpy as np

from config import NUM_CLASSES, MODEL_PATH, CONFIDENCE_THRESHOLD
from utils import (
    decode_base64_image, encode_image_base64,
    erase_with_ellipse, preprocess_gentle
)
from detector import predict_bbox, scale_bbox
import separator

app = FastAPI(title="Fingerprint Separation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = None

@app.on_event("startup")
async def load_model():
    global model
    print(f"Loading PyTorch model on {device}...")
    try:
        temp_model = ssd300_vgg16(weights=None, num_classes=NUM_CLASSES)
        state_dict = torch.load(MODEL_PATH, map_location=device)
        temp_model.load_state_dict(state_dict)
        temp_model = temp_model.to(device)
        
        temp_model.eval()
        for module in temp_model.modules():
            module.training = False
            
        model = temp_model
        print(f"Model loaded successfully on {device}.")
        
    except Exception as e:
        print(f"Failed to load model: {e}")
        model = None 

# Accepts JSON {"image_base64": "..."} from your Go Backend
class FingerprintRequest(BaseModel):
    image_base64: str

@app.post("/api/v1/fingerprint/extract")
async def extract_fingerprint(request: FingerprintRequest):
    if not model:
        raise HTTPException(status_code=503, detail="Model is not loaded. Check server logs.")

    try:
        # 1. Decode
        image = decode_base64_image(request.image_base64)
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image data.")
            
        orig_h, orig_w = image.shape[:2]

        # 2. Detect Overlap
        bbox_300, score = predict_bbox(model, image)

        # Early Exit: Return original image dynamically packaged
        if bbox_300 is None or score < CONFIDENCE_THRESHOLD:
            return {
                "status": "warning",
                "message": "No overlap detected.",
                "confidence": float(score),
                "overlap_base64": None,
                "separated_images": [f"data:image/png;base64,{encode_image_base64(image)}"]
            }

        # 3. Scale bbox and Viz
        bbox = scale_bbox(bbox_300, (orig_w, orig_h))
        
        overlap_viz = image.copy()
        cv2.rectangle(overlap_viz, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 0), 3)
        overlap_base64_data = encode_image_base64(overlap_viz)

        # 4. Erase & Separate
        erased_img = erase_with_ellipse(image, bbox)
        original, enhanced, binary = preprocess_gentle(erased_img)
        components, thinned = separator.extract_ridge_components(binary, enhanced, min_size=15) 

        # We keep outputs in a list. If your model grows to support N fingerprints, 
        # this code will automatically scale and format correctly.
        produced_images = []

        if len(components) < 2:
            sep_1, sep_2 = separator.spatial_fallback_split(binary)
            produced_images.extend([sep_1, sep_2])
        else:
            affinity = separator.build_affinity_matrix(components, max_dist=120, ori_weight=0.4, spatial_weight=0.6)
            labels = separator.cluster_components(components, affinity)
            sep_1, sep_2 = separator.reconstruct_full_ridges(components, labels, binary, thinned)
            sep_1, sep_2 = separator.refine_boundary(sep_1, sep_2, enhanced, block_size=16)
            produced_images.extend([sep_1, sep_2])

        # Clean images, invert (255 - x) and Base64 encode sequentially
        separated_base64_list = []
        for sep_img in produced_images:
            cleaned_sep = separator.clean_separation(sep_img, min_size=15)
            final_fp = 255 - cleaned_sep  
            encoded_fp = f"data:image/png;base64,{encode_image_base64(final_fp)}"
            separated_base64_list.append(encoded_fp)

        return {
            "status": "success",
            "message": "Fingerprints separated successfully.",
            "confidence": float(score),
            "overlap_base64": f"data:image/png;base64,{overlap_base64_data}",
            "separated_images": separated_base64_list
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)