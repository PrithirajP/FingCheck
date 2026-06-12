import cv2
import base64
import numpy as np
import torch
from PIL import Image
from torchvision import transforms
from torchvision.models.detection import ssd300_vgg16
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

IMAGE_SIZE = 300
NUM_CLASSES = 2
CONFIDENCE_THRESHOLD = 0.5

# 1. Load the PyTorch Model
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = ssd300_vgg16(weights=None, num_classes=NUM_CLASSES)
model.load_state_dict(torch.load("best_model_val.pth", map_location=device))
model.to(device)
model.eval()

transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

class FingerprintRequest(BaseModel):
    image_base64: str

def predict_bbox(model, image, transform):
    pil_img = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    tensor = transform(pil_img).unsqueeze(0).to(device)
    with torch.no_grad():
        output = model(tensor)[0]
    if len(output['boxes']) == 0:
        return None, 0.0
    scores = output['scores'].cpu().numpy()
    boxes = output['boxes'].cpu().numpy()
    best_idx = np.argmax(scores)
    return boxes[best_idx], scores[best_idx]

def scale_bbox(bbox, original_size, model_size=300):
    orig_w, orig_h = original_size
    x_min, y_min, x_max, y_max = bbox
    return [
        int(x_min * orig_w / model_size),
        int(y_min * orig_h / model_size),
        int(x_max * orig_w / model_size),
        int(y_max * orig_h / model_size)
    ]

def erase_with_ellipse(image, bbox, padding_ratio=0.05, blur_size=25):
    x_min, y_min, x_max, y_max = bbox
    cx = int((x_min + x_max) / 2)
    cy = int((y_min + y_max) / 2)
    semi_x = int((x_max - x_min) / 2 * (1 - padding_ratio))
    semi_y = int((y_max - y_min) / 2 * (1 - padding_ratio))
    
    mask = np.zeros(image.shape[:2], dtype=np.uint8)
    cv2.ellipse(mask, (cx, cy), (semi_x, semi_y), 0, 0, 360, 255, -1)
    
    blur_size = blur_size if blur_size % 2 == 1 else blur_size + 1
    mask_soft = cv2.GaussianBlur(mask, (blur_size, blur_size), 0)
    mask_norm = mask_soft.astype(float) / 255.0
    
    if len(image.shape) == 3:
        result = image.copy()
        for c in range(3):
            result[:, :, c] = (image[:, :, c] * (1 - mask_norm) + 255 * mask_norm).astype(np.uint8)
    else:
        result = (image * (1 - mask_norm) + 255 * mask_norm).astype(np.uint8)
    return result

def enhance_for_handoff(erased_img):
    """Processes the image to be completely ready for the Go SourceAFIS port."""
    if len(erased_img.shape) == 3:
        gray = cv2.cvtColor(erased_img, cv2.COLOR_BGR2GRAY)
    else:
        gray = erased_img
        
    # Binarize to clean up the blurred ellipse gradient into sharp black/white
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Encode as PNG to send back to Go
    _, buffer = cv2.imencode('.png', binary)
    return base64.b64encode(buffer).decode('utf-8')

@app.post("/api/v1/fingerprint/extract")
async def extract_fingerprint(request: FingerprintRequest):
    try:
        # Decode Base64 sent from Go Backend
        header, encoded = request.image_base64.split(",", 1) if "," in request.image_base64 else ("", request.image_base64)
        img_bytes = base64.b64decode(encoded)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        orig_h, orig_w = image.shape[:2]
        
        # Run Object Detection to find overlap
        bbox_300, score = predict_bbox(model, image, transform)
        
        # Erase the overlap if detected
        if bbox_300 is not None and score >= CONFIDENCE_THRESHOLD:
            bbox = scale_bbox(bbox_300, (orig_w, orig_h))
            processed_image = erase_with_ellipse(image, bbox) 
        else:
            processed_image = image 
            
        # Enhance and encode the cleaned image
        clean_b64_image = enhance_for_handoff(processed_image)
        
        return {
            "status": "success",
            "confidence": float(score),
            "cleaned_image_base64": clean_b64_image # Sending image back instead of template
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))