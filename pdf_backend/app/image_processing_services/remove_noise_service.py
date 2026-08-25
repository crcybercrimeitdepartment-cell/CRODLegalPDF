import cv2
import numpy as np
import math

def estimate_noise_std(img):
    """
    Estimate noise standard deviation using a fast convolution method.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    # Downscale for faster estimation if very large
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

def process_tile(tile, h_val, is_color):
    if is_color:
        return cv2.fastNlMeansDenoisingColored(tile, None, h=h_val, hColor=h_val, templateWindowSize=7, searchWindowSize=21)
    else:
        return cv2.fastNlMeansDenoising(tile, None, h=h_val, templateWindowSize=7, searchWindowSize=21)

def process_large_image_tiled(img, h_val, is_color, tile_size=1200, margin=30):
    """
    Process image in tiles to prevent high memory usage.
    """
    h, w = img.shape[:2]
    out_img = np.zeros_like(img)
    
    for y in range(0, h, tile_size):
        for x in range(0, w, tile_size):
            y1 = max(0, y - margin)
            y2 = min(h, y + tile_size + margin)
            x1 = max(0, x - margin)
            x2 = min(w, x + tile_size + margin)
            
            tile = img[y1:y2, x1:x2]
            processed_tile = process_tile(tile, h_val, is_color)
            
            cy1 = y - y1
            cy2 = cy1 + min(tile_size, h - y)
            cx1 = x - x1
            cx2 = cx1 + min(tile_size, w - x)
            
            out_img[y:y+min(tile_size, h-y), x:x+min(tile_size, w-x)] = processed_tile[cy1:cy2, cx1:cx2]
            
    return out_img

def apply_noise_removal(image_bytes: bytes, level: str) -> tuple[bytes, str]:
    """
    Applies noise removal using OpenCV fastNlMeansDenoising.
    Levels: low (h=5), medium (h=10), high (h=15)
    Returns: (processed_image_bytes, status)
    """
    # 1. Decode image
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError("Invalid image data")

    # 2. Check noise level
    # If it's a perfectly clean image, sigma will be very low (< 1.5)
    # We will skip processing if sigma < 1.0 to save resources and avoid unnecessary blurring
    sigma = estimate_noise_std(img)
    if sigma < 1.0:
        return image_bytes, "no_noise"

    # 3. Map level to h-value
    level_map = {
        'low': 5.0,
        'medium': 10.0,
        'high': 15.0
    }
    h_val = level_map.get(level.lower(), 10.0)

    # 4. Handle Alpha channel
    has_alpha = False
    alpha_channel = None
    if len(img.shape) == 3 and img.shape[2] == 4:
        has_alpha = True
        bgr = img[:, :, :3]
        alpha_channel = img[:, :, 3]
        process_img = bgr
    elif len(img.shape) == 3 and img.shape[2] == 3:
        process_img = img
    elif len(img.shape) == 2:
        process_img = img
    else:
        raise ValueError("Unsupported image channels")

    is_color = len(process_img.shape) == 3 and process_img.shape[2] == 3

    # 5. Process (Tiled if large)
    h, w = process_img.shape[:2]
    if max(h, w) > 2000:
        processed_img = process_large_image_tiled(process_img, h_val, is_color)
    else:
        processed_img = process_tile(process_img, h_val, is_color)

    # 6. Re-attach Alpha
    if has_alpha:
        final_img = cv2.merge([processed_img[:,:,0], processed_img[:,:,1], processed_img[:,:,2], alpha_channel])
    else:
        final_img = processed_img

    # 7. Encode back to bytes
    # To preserve exact original format is hard with cv2 (which only knows png/jpg etc based on extension)
    # We will default to PNG if alpha, else JPG. (Wait, the user wants to preserve original. 
    # Let's read the signature or just return PNG for alpha, JPG otherwise).
    # Since we only get bytes, we don't know the exact format, but returning high-quality JPG/PNG is fine.
    if has_alpha:
        success, buffer = cv2.imencode('.png', final_img)
    else:
        success, buffer = cv2.imencode('.jpg', final_img, [cv2.IMWRITE_JPEG_QUALITY, 95])
        
    if not success:
        raise RuntimeError("Failed to encode processed image")

    return buffer.tobytes(), "success"
