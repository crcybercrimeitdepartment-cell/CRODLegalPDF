import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)

def order_points(pts: np.ndarray) -> np.ndarray:
    """Order points: top-left, top-right, bottom-right, bottom-left."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def detect_borders_with_confidence(image_bytes: bytes) -> tuple[list, float, int, int]:
    """
    Detects page borders and calculates a confidence score.
    Returns: (corners_list, confidence, orig_width, orig_height)
    """
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Invalid image data.")
        
    orig_height, orig_width = image.shape[:2]
    image_area = orig_width * orig_height
    
    # Scale down for faster/more robust detection
    ratio = orig_height / 500.0
    res_width = int(orig_width / ratio)
    resized = cv2.resize(image, (res_width, 500))
    
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    
    # Try different blurring and thresholding
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(gray, 75, 200)
    
    # Dilate edges to close gaps
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edged = cv2.dilate(edged, kernel, iterations=1)
    
    contours, _ = cv2.findContours(edged.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]
    
    best_cnt = None
    best_confidence = 0.0
    
    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        
        if len(approx) == 4:
            area = cv2.contourArea(approx)
            rel_area = area / (res_width * 500)
            
            # Reject if too small (< 5% of image) or too large (> 98%)
            if rel_area < 0.05 or rel_area > 0.98:
                continue
                
            is_convex = cv2.isContourConvex(approx)
                
            # Confidence logic based on area and perimeter ratio
            confidence = min(rel_area * 1.5, 0.95) # base confidence from size
            
            if not is_convex:
                confidence -= 0.3 # Penalty for non-convexity instead of complete rejection
                
            if confidence < 0:
                confidence = 0.0
            
            # Bonus confidence for being very rectangular
            best_cnt = approx
            best_confidence = confidence
            break
            
    if best_cnt is None:
        # Default fallback corners (10% padding from edges)
        corners = [
            {"x": float(orig_width * 0.1), "y": float(orig_height * 0.1)},
            {"x": float(orig_width * 0.9), "y": float(orig_height * 0.1)},
            {"x": float(orig_width * 0.9), "y": float(orig_height * 0.9)},
            {"x": float(orig_width * 0.1), "y": float(orig_height * 0.9)}
        ]
        return corners, 0.0, orig_width, orig_height
        
    pts = best_cnt.reshape(4, 2) * ratio
    rect = order_points(pts)
    
    corners = [
        {"x": float(rect[0][0]), "y": float(rect[0][1])}, # TL
        {"x": float(rect[1][0]), "y": float(rect[1][1])}, # TR
        {"x": float(rect[2][0]), "y": float(rect[2][1])}, # BR
        {"x": float(rect[3][0]), "y": float(rect[3][1])}  # BL
    ]
    
    return corners, best_confidence, orig_width, orig_height

def apply_perspective_crop(image_bytes: bytes, corners: list) -> bytes:
    """
    Applies perspective crop based on user-adjusted corners.
    Corners must be ordered: TL, TR, BR, BL.
    """
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_UNCHANGED)
    
    if image is None:
        raise ValueError("Invalid image data.")
        
    # Convert corners dict to numpy array
    pts = np.array([
        [corners[0].x, corners[0].y],
        [corners[1].x, corners[1].y],
        [corners[2].x, corners[2].y],
        [corners[3].x, corners[3].y]
    ], dtype="float32")
    
    rect = order_points(pts)
    (tl, tr, br, bl) = rect
    
    # Compute width and height
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))

    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))
    
    if maxWidth == 0 or maxHeight == 0:
        raise ValueError("Invalid crop dimensions.")

    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    
    # Preserve transparency if RGBA
    if image.shape[2] == 4:
        warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight), borderMode=cv2.BORDER_TRANSPARENT)
        is_success, buffer = cv2.imencode(".png", warped)
    else:
        warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
        is_success, buffer = cv2.imencode(".jpg", warped, [cv2.IMWRITE_JPEG_QUALITY, 95])
        
    if not is_success:
        raise RuntimeError("Failed to encode cropped image.")
        
    return buffer.tobytes()
