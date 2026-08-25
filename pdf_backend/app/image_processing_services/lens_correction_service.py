import cv2
import numpy as np

def auto_detect_distortion(image_bytes: bytes) -> tuple[str | None, float]:
    """
    Attempts to detect if the image has significant barrel or pincushion distortion.
    Without EXIF data or a calibration grid, this is extremely difficult to do reliably.
    To avoid false positives and aggressive incorrect corrections (as requested),
    we fall back to manual unless we are absolutely certain (which is rare).
    """
    # For a truly reliable production system without AI models, 
    # we return None to prompt manual adjustment.
    return None, 0.0

def apply_lens_correction(image_bytes: bytes, mode: str, strength: int) -> bytes:
    """
    Applies generic lens correction using OpenCV undistort.
    Strength is mapped from 0-100 to a safe k1 distortion coefficient (0.0 to 0.4).
    """
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError("Invalid image data.")
        
    if strength == 0 and mode != "auto":
        # No correction needed
        is_png = len(image.shape) == 3 and image.shape[2] == 4
        ext = ".png" if is_png else ".jpg"
        success, buffer = cv2.imencode(ext, image)
        if not success:
            raise RuntimeError("Failed to encode image.")
        return buffer.tobytes()
        
    h, w = image.shape[:2]
    
    # Generic Camera Matrix
    fx = max(w, h)
    fy = fx
    cx = w / 2.0
    cy = h / 2.0
    K = np.array([[fx, 0, cx], [0, fy, cy], [0, 0, 1]], dtype=np.float32)
    
    # Initialize coefficients
    k1 = k2 = k3 = k4 = 0.0
    strength_norm = strength / 100.0
    
    if mode == "barrel":
        k1 = -0.4 * strength_norm
    elif mode == "pincushion":
        k1 = 0.4 * strength_norm
    elif mode == "mustache":
        # Mustache: bulging center (negative k1) and pinched edges (positive k2)
        k1 = -0.3 * strength_norm
        k2 = 0.5 * strength_norm
    elif mode == "wide_angle":
        # Mild flattening
        k1 = -0.15 * strength_norm
        k2 = 0.05 * strength_norm
    elif mode == "auto":
        k1 = 0.05
    
    D = np.array([k1, k2, 0, 0, k3], dtype=np.float32)
    
    if mode == "fisheye":
        # Fisheye uses a different distortion model
        D_fish = np.array([0.0, 0.0, 0.0, 0.0], dtype=np.float32)
        # For fisheye, k1 acts strongly
        D_fish[0] = -0.1 * strength_norm
        D_fish[1] = 0.05 * strength_norm
        # Get optimal matrix for fisheye
        new_K = cv2.fisheye.estimateNewCameraMatrixForUndistortRectify(K, D_fish, (w, h), np.eye(3), balance=1.0)
        
        # In fisheye, cv2.fisheye.undistortImage requires K and D as 1D/2D arrays
        # Map parameters
        map1, map2 = cv2.fisheye.initUndistortRectifyMap(K, D_fish, np.eye(3), new_K, (w, h), cv2.CV_16SC2)
        dst = cv2.remap(image, map1, map2, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    else:
        # Standard polynomial distortion
        # Get optimal new camera matrix. alpha=1 means all original pixels are retained.
        new_K, roi = cv2.getOptimalNewCameraMatrix(K, D, (w, h), 1, (w, h))
        dst = cv2.undistort(image, K, D, None, new_K)
    
    # We do NOT crop by ROI because users want to preserve dimensions where practical
    # and not clip content.
    # However, undistort might leave black borders.
    # If the image has an alpha channel, we want the borders to be transparent.
    if len(image.shape) == 3 and image.shape[2] == 4:
        # Transparent borders might already be handled by undistort if the original
        # background was transparent, but usually undistort fills with 0.
        # Since 0 in alpha means transparent, it's perfect.
        success, buffer = cv2.imencode(".png", dst)
    else:
        success, buffer = cv2.imencode(".jpg", dst, [cv2.IMWRITE_JPEG_QUALITY, 95])
        
    if not success:
        raise RuntimeError("Failed to encode corrected image.")
        
    return buffer.tobytes()
