import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)

def analyze_blur(image_bytes: bytes) -> str:
    """
    Analyzes image sharpness using the variance of the Laplacian.
    Returns a user-friendly status message.
    """
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    
    if image is None:
        return "Ready to process."
        
    # Resize for faster analysis if very large
    h, w = image.shape[:2]
    if max(h, w) > 1000:
        scale = 1000 / max(h, w)
        image = cv2.resize(image, (0, 0), fx=scale, fy=scale)
        
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    if variance < 50:
        return "Severe blur detected. Enhancement may improve clarity, but missing details cannot be fully recovered."
    elif variance > 1000:
        return "Image is already relatively sharp. Light enhancement (Low) recommended."
    else:
        return "Mild to medium blur detected. Ready for enhancement."

def apply_deblur(image_bytes: bytes, level: str) -> bytes:
    """
    Applies controlled denoising and unsharp masking to reduce blur.
    Handles RGBA transparency and protects against excessive memory usage.
    """
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_UNCHANGED)
    
    if image is None:
        raise ValueError("Invalid image data.")
        
    h, w = image.shape[:2]
    total_pixels = h * w
    
    # Check for alpha channel
    has_alpha = len(image.shape) == 3 and image.shape[2] == 4
    if has_alpha:
        bgr = image[:, :, :3]
        alpha = image[:, :, 3]
    else:
        bgr = image
        alpha = None

    # Determine safe parameters based on level
    # Bilateral filter is very slow on huge images, so we disable it for > 12MP
    use_bilateral = total_pixels < 12_000_000
    
    if level == "low":
        k_size = 5
        sigma = 1.5
        amount = 1.0
        bf_d = 5 if use_bilateral else 0
    elif level == "medium":
        k_size = 0  # 0 means calculated from sigma
        sigma = 2.0
        amount = 2.0
        bf_d = 7 if use_bilateral else 0
    elif level == "high":
        k_size = 0
        sigma = 3.0
        amount = 3.5
        bf_d = 9 if use_bilateral else 0
    else:
        raise ValueError("Invalid level")

    weight_original = 1.0 + amount
    weight_blur = -amount

    try:
        processed = bgr.copy()
        
        # 1. Edge-preserving Denoising (Bilateral Filter)
        if bf_d > 0:
            # Stronger noise reduction to compensate for aggressive sharpening
            processed = cv2.bilateralFilter(processed, bf_d, 75, 75)
            
        # 2. Unsharp Masking (Strong Sharpening)
        blurred = cv2.GaussianBlur(processed, (k_size, k_size), sigma)
        processed = cv2.addWeighted(processed, weight_original, blurred, weight_blur, 0)

        
        # Merge alpha back if it existed
        if has_alpha:
            result = cv2.merge((processed[:, :, 0], processed[:, :, 1], processed[:, :, 2], alpha))
            ext = ".png"
        else:
            result = processed
            ext = ".jpg"
            
        # Encode
        if ext == ".png":
            success, buffer = cv2.imencode(".png", result)
        else:
            success, buffer = cv2.imencode(".jpg", result, [cv2.IMWRITE_JPEG_QUALITY, 95])
            
        if not success:
            raise RuntimeError("Failed to encode processed image.")
            
        return buffer.tobytes()
        
    except Exception as e:
        logger.error(f"Error during deblur processing: {str(e)}")
        # If processing fails (e.g. out of memory), return original safely
        return image_bytes
