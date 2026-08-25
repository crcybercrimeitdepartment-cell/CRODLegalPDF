import cv2
import numpy as np
import math
import logging

logger = logging.getLogger(__name__)

def estimate_noise_std(img):
    """Estimate noise standard deviation using a fast convolution method."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    h, w = gray.shape
    if max(h, w) > 1500:
        scale = 1500 / max(h, w)
        gray = cv2.resize(gray, (int(w * scale), int(h * scale)))
    
    H, W = gray.shape
    if H < 3 or W < 3: return 0.0
    
    M = np.array([[1, -2, 1],
                  [-2, 4, -2],
                  [1, -2, 1]], dtype=np.float32)
    
    filtered = cv2.filter2D(gray.astype(np.float32), -1, M)
    sigma = np.sum(np.abs(filtered)) * math.sqrt(0.5 * math.pi) / (6 * (W-2) * (H-2))
    return float(sigma)

def analyze_noise(image_bytes: bytes) -> str:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image")
        
    sigma = estimate_noise_std(img)
    
    if sigma < 1.0:
        return "Image is relatively clean. A low setting is recommended."
    elif sigma < 4.0:
        return "Mild noise detected. Medium setting recommended."
    else:
        return "Heavy noise detected. Medium or High setting recommended."

def process_tile(tile, h_val, is_color, is_heavy):
    if is_color:
        denoised = cv2.fastNlMeansDenoisingColored(tile, None, h=h_val, hColor=h_val, templateWindowSize=7, searchWindowSize=21)
    else:
        denoised = cv2.fastNlMeansDenoising(tile, None, h=h_val, templateWindowSize=7, searchWindowSize=21)
        
    if is_heavy:
        # Subtle unsharp masking to recover edge micro-contrast lost during heavy NL-Means
        blur = cv2.GaussianBlur(denoised, (0, 0), 1.0)
        # amount = 0.3
        denoised = cv2.addWeighted(denoised, 1.3, blur, -0.3, 0)
        
    return denoised

def process_large_image_tiled(img, h_val, is_color, is_heavy, tile_size=1200, margin=30):
    """Process image in tiles to prevent high memory usage with NL-Means."""
    h, w = img.shape[:2]
    out_img = np.zeros_like(img)
    
    for y in range(0, h, tile_size):
        for x in range(0, w, tile_size):
            y1 = max(0, y - margin)
            y2 = min(h, y + tile_size + margin)
            x1 = max(0, x - margin)
            x2 = min(w, x + tile_size + margin)
            
            tile = img[y1:y2, x1:x2]
            processed_tile = process_tile(tile, h_val, is_color, is_heavy)
            
            cy1 = y - y1
            cy2 = cy1 + min(tile_size, h - y)
            cx1 = x - x1
            cx2 = cx1 + min(tile_size, w - x)
            
            out_img[y:y+min(tile_size, h-y), x:x+min(tile_size, w-x)] = processed_tile[cy1:cy2, cx1:cx2]
            
    return out_img

def apply_image_denoise(image_bytes: bytes, level: str) -> bytes:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError("Invalid image data")

    if level == "low":
        h_val = 3.0
        is_heavy = False
    elif level == "medium":
        h_val = 6.0
        is_heavy = True
    elif level == "high":
        h_val = 12.0
        is_heavy = True
    else:
        raise ValueError("Invalid level")

    has_alpha = False
    alpha_channel = None
    if len(img.shape) == 3 and img.shape[2] == 4:
        has_alpha = True
        process_img = img[:, :, :3]
        alpha_channel = img[:, :, 3]
    elif len(img.shape) == 3 and img.shape[2] == 3:
        process_img = img
    elif len(img.shape) == 2:
        process_img = img
    else:
        raise ValueError("Unsupported image format")

    is_color = len(process_img.shape) == 3 and process_img.shape[2] == 3
    h, w = process_img.shape[:2]

    try:
        # NL-Means uses huge amounts of RAM, so tile images > 1500px
        if max(h, w) > 1500:
            processed = process_large_image_tiled(process_img, h_val, is_color, is_heavy)
        else:
            processed = process_tile(process_img, h_val, is_color, is_heavy)
            
        if has_alpha:
            if len(processed.shape) == 2:
                processed = cv2.cvtColor(processed, cv2.COLOR_GRAY2BGR)
            final_img = cv2.merge((processed[:, :, 0], processed[:, :, 1], processed[:, :, 2], alpha_channel))
            ext = '.png'
            params = []
        else:
            final_img = processed
            ext = '.jpg'
            params = [cv2.IMWRITE_JPEG_QUALITY, 95]
            
        success, buffer = cv2.imencode(ext, final_img, params)
        if not success:
            raise ValueError("Failed to encode processed image")
            
        return buffer.tobytes()
        
    except Exception as e:
        logger.error(f"Denoise Error: {e}")
        raise ValueError("Processing failed due to memory or format limits.")
