import cv2
import torch
import numpy as np
from PIL import Image
from torchvision import transforms
from torchvision.models.detection import ssd300_vgg16
from config import IMAGE_SIZE, NUM_CLASSES, MODEL_PATH, NORM_MEAN, NORM_STD

# Initialize Device and Model
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = ssd300_vgg16(weights=None, num_classes=NUM_CLASSES)
model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
model.to(device)
model.eval()

transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=NORM_MEAN, std=NORM_STD)
])

def predict_bbox(image):
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

def scale_bbox(bbox, original_size, model_size=IMAGE_SIZE):
    orig_w, orig_h = original_size
    x_min, y_min, x_max, y_max = bbox
    return [
        int(x_min * orig_w / model_size),
        int(y_min * orig_h / model_size),
        int(x_max * orig_w / model_size),
        int(y_max * orig_h / model_size)
    ]