import base64
import cv2
import numpy as np
import io

def decode_base64_image(base64_str: str) -> np.ndarray:
    header, encoded = base64_str.split(",", 1) if "," in base64_str else ("", base64_str)
    img_bytes = base64.b64decode(encoded)
    np_arr = np.frombuffer(img_bytes, np.uint8)
    return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

def encode_image_base64(image: np.ndarray) -> str:
    is_success, buffer = cv2.imencode('.png', image)
    if not is_success:
        raise ValueError("Could not encode image to base64")
    io_buf = io.BytesIO(buffer)
    return base64.b64encode(io_buf.getvalue()).decode('utf-8')

def erase_with_ellipse(image, bbox, padding_ratio=0.05, blur_size=25):
    x_min, y_min, x_max, y_max = bbox
    cx     = int((x_min + x_max) / 2)
    cy     = int((y_min + y_max) / 2)
    semi_x = int((x_max - x_min) / 2 * (1 - padding_ratio))
    semi_y = int((y_max - y_min) / 2 * (1 - padding_ratio))
    mask      = np.zeros(image.shape[:2], dtype=np.uint8)
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

def preprocess_gentle(img_array):
    if len(img_array.shape) == 3:
        img = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
    else:
        img = img_array.copy()
        
    clahe    = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(img)
    blurred  = cv2.GaussianBlur(enhanced, (3, 3), 0.8)
    binary   = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, blockSize=25, C=8
    )
    kernel_small = np.ones((2, 2), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel_small, iterations=1)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN,  kernel_small, iterations=1)
    return img, enhanced, binary