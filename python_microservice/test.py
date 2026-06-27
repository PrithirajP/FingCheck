import base64
import requests
import cv2
import numpy as np
import os

# --- Configuration ---
API_URL = "http://127.0.0.1:8000/api/v1/fingerprint/extract"
IMAGE_PATH = "img1.jpeg"  # <-- CHANGE THIS to your image file's name
OUTPUT_DIR = "results"         # Folder where the outputs will be saved

def setup():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

def encode_local_image(filepath):
    """Reads a local image and converts it to a Base64 string."""
    with open(filepath, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    return encoded_string

def save_base64_image(b64_string, output_filename):
    """Decodes a Base64 string (stripping the prefix) and saves it to disk."""
    # Remove the "data:image/png;base64," prefix if it exists
    if "," in b64_string:
        b64_string = b64_string.split(",")[1]
        
    img_data = base64.b64decode(b64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, output_filename), img)
    print(f"✅ Saved: {output_filename}")

def test_api():
    print(f"Preparing to send '{IMAGE_PATH}' to the API...")
    
    if not os.path.exists(IMAGE_PATH):
        print(f"❌ Error: Could not find image at '{IMAGE_PATH}'. Please check the path.")
        return

    # 1. Encode the image
    b64_image = encode_local_image(IMAGE_PATH)
    
    # 2. Prepare the payload
    payload = {
        "image_base64": b64_image
    }
    
    # 3. Send the request
    print("Sending request... (this might take a second if the model is processing)")
    try:
        response = requests.post(API_URL, json=payload)
        response.raise_for_status() # Raise an exception for bad status codes
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to the API. Is your FastAPI server running?")
        return
    except requests.exceptions.HTTPError as err:
        print(f"❌ HTTP Error: {err}")
        print(f"Details: {response.text}")
        return

    # 4. Parse the response
    data = response.json()
    
    print("\n--- Response Received ---")
    print(f"Status: {data.get('status')}")
    print(f"Message: {data.get('message')}")
    print(f"Confidence: {data.get('confidence', 0):.4f}")
    print("-------------------------\n")

    # 5. Save the Overlap Visualization (if detected)
    overlap_b64 = data.get("overlap_base64")
    if overlap_b64:
        save_base64_image(overlap_b64, "0_overlap_detection.png")

    # 6. Save the Separated Images
    separated_images = data.get("separated_images", [])
    if not separated_images:
        print("No separated images were returned.")
    else:
        for idx, sep_b64 in enumerate(separated_images, start=1):
            save_base64_image(sep_b64, f"separated_fingerprint_{idx}.png")
            
    print("\n🎉 Testing complete! Check the 'results' folder.")

if __name__ == "__main__":
    setup()
    test_api()