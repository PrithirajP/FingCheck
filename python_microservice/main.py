import cv2
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from config import CONFIDENCE_THRESHOLD
from utils import decode_base64_image, encode_image_base64
from detector import predict_bbox, scale_bbox
import separator

app = FastAPI()

class FingerprintRequest(BaseModel):
    image_base64: str

@app.post("/api/v1/fingerprint/extract")
async def extract_fingerprint(request: FingerprintRequest):
    try:
        # 1. Decode
        image = decode_base64_image(request.image_base64)
        orig_h, orig_w = image.shape[:2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, binary_full = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # 2. Detect
        bbox_300, score = predict_bbox(image)
        
        # 3. Separate
        if bbox_300 is not None and score >= CONFIDENCE_THRESHOLD:
            bbox = scale_bbox(bbox_300, (orig_w, orig_h))
            x_min, y_min, x_max, y_max = bbox
            
            roi_gray = gray[y_min:y_max, x_min:x_max]
            roi_binary = binary_full[y_min:y_max, x_min:x_max]
            
            components, _ = separator.extract_ridge_components(roi_binary, roi_gray)
            affinity = separator.build_affinity_matrix(components)
            labels = separator.cluster_components(components, affinity)
            
            sep1, sep2 = separator.reconstruct_full_ridges(components, labels, roi_binary)
            sep1_clean = separator.clean_separation(sep1)
            
            final_binary = binary_full.copy()
            final_binary[y_min:y_max, x_min:x_max] = sep1_clean 
            
            primary_fingerprint = cv2.bitwise_not(final_binary)
        else:
            primary_fingerprint = cv2.bitwise_not(binary_full)
            
        # 4. Encode & Return
        clean_b64_image = encode_image_base64(primary_fingerprint)
        
        return {
            "status": "success",
            "confidence": float(score),
            "cleaned_image_base64": clean_b64_image
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))