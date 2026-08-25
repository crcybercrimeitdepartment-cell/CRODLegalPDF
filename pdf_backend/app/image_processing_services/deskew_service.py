import cv2
import numpy as np
import math
import logging

logger = logging.getLogger(__name__)

def get_hough_lines_angle(edges, max_skew=15):
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 100, minLineLength=100, maxLineGap=20)
    angles = []
    weights = []
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line.flatten()[:4]
            if x2 - x1 == 0:
                angle = 90.0
            else:
                angle = math.degrees(math.atan((y2 - y1) / (x2 - x1)))
                
            # Focus on horizontal/vertical lines that are slightly skewed
            if -max_skew <= angle <= max_skew:
                angles.append(angle)
                length = math.hypot(x2 - x1, y2 - y1)
                weights.append(length)
            elif 90 - max_skew <= angle <= 90:
                angles.append(angle - 90)
                length = math.hypot(x2 - x1, y2 - y1)
                weights.append(length)
            elif -90 <= angle <= -90 + max_skew:
                angles.append(angle + 90)
                length = math.hypot(x2 - x1, y2 - y1)
                weights.append(length)

    if angles:
        return np.average(angles, weights=weights), len(angles)
    return None, 0

def detect_skew(image_bytes: bytes) -> tuple[float, float, str, int, int]:
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Invalid image data.")
        
    orig_h, orig_w = image.shape[:2]
    
    # Resize for faster and more reliable line processing if too large
    scale = 1.0
    if max(orig_h, orig_w) > 1500:
        scale = 1500.0 / max(orig_h, orig_w)
        proc_img = cv2.resize(image, (int(orig_w * scale), int(orig_h * scale)))
    else:
        proc_img = image.copy()
        
    gray = cv2.cvtColor(proc_img, cv2.COLOR_BGR2GRAY)
    
    # Method 1: Canny + Hough
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 50, 150, apertureSize=3)
    angle_hough, count_hough = get_hough_lines_angle(edges)
    
    # Method 2: Threshold + MinAreaRect (contour analysis)
    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    
    # Dilation to connect text horizontally
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (30, 5))
    dilate = cv2.dilate(thresh, kernel, iterations=1)
    contours, _ = cv2.findContours(dilate, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    
    angles_rect = []
    weights_rect = []
    for c in contours:
        area = cv2.contourArea(c)
        if area > 500:
            rect = cv2.minAreaRect(c)
            angle = rect[2]
            w, h = rect[1]
            if w == 0 or h == 0: continue
            
            # Handle different OpenCV version angle formats
            if angle < -45:
                angle = 90 + angle
            elif angle > 45:
                angle = angle - 90
                
            if -15 <= angle <= 15:
                angles_rect.append(angle)
                weights_rect.append(area)
                
    if angles_rect:
        angle_rect = np.average(angles_rect, weights=weights_rect)
        count_rect = len(angles_rect)
    else:
        angle_rect, count_rect = None, 0
        
    # Aggregate logic
    final_angle = 0.0
    confidence = 0.0
    
    if count_hough >= 3 and count_rect >= 2:
        # Both methods worked
        if abs(angle_hough - angle_rect) < 3.0:
            final_angle = (angle_hough + angle_rect) / 2.0
            confidence = min(1.0, (count_hough + count_rect) / 20.0)
        else:
            # Prefer Hough for text/lines
            final_angle = angle_hough
            confidence = min(0.8, count_hough / 10.0)
    elif count_hough >= 3:
        final_angle = angle_hough
        confidence = min(0.9, count_hough / 10.0)
    elif count_rect >= 2:
        final_angle = angle_rect
        confidence = min(0.8, count_rect / 5.0)
    else:
        final_angle = 0.0
        confidence = 0.0
        
    status = "detected"
    if confidence == 0:
        status = "detection_failed"
    elif confidence < 0.4:
        status = "low_confidence"
        
    if abs(final_angle) < 0.2 and status != "detection_failed":
        status = "no_skew"
        final_angle = 0.0
        
    return float(final_angle), float(confidence), status, orig_w, orig_h

def apply_deskew(image_bytes: bytes, angle: float, file_ext: str = ".jpg") -> bytes:
    if abs(angle) < 0.1:
        # No significant rotation needed, return original safely
        return image_bytes
        
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError("Invalid image data.")
        
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    
    # OpenCV getRotationMatrix2D takes positive angle for counter-clockwise rotation.
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    
    # Compute new bounding dimensions so the image isn't clipped
    cos = np.abs(M[0, 0])
    sin = np.abs(M[0, 1])
    
    nW = int((h * sin) + (w * cos))
    nH = int((h * cos) + (w * sin))
    
    # Adjust rotation matrix to take translation into account
    M[0, 2] += (nW / 2) - center[0]
    M[1, 2] += (nH / 2) - center[1]
    
    is_png = (len(image.shape) == 3 and image.shape[2] == 4)
    
    if is_png:
        # Transparent background for PNG
        borderValue = (0, 0, 0, 0)
        ext = '.png'
    else:
        # White background for JPG
        borderValue = (255, 255, 255)
        ext = '.jpg'
        if file_ext.lower() in ['.webp']:
            ext = '.webp'
        
    rotated = cv2.warpAffine(image, M, (nW, nH), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=borderValue)
    
    encode_param = []
    if ext in ['.jpg', '.jpeg']:
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 95]
        
    is_success, buffer = cv2.imencode(ext, rotated, encode_param)
    if not is_success:
        raise ValueError("Failed to encode rotated image.")
        
    return buffer.tobytes()
