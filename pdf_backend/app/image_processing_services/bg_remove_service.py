import logging
import uuid
import zipfile
import numpy as np
import cv2
from pathlib import Path
from PIL import Image, ImageFilter

from app.schemas.bg_remove_schema import BgRemoveRequestState
from app.core.paths import DOWNLOADS_DIR
from app.utils.cleanup import delete_file

logger = logging.getLogger(__name__)

# Global session variable for rembg to avoid re-initializing ONNX session on every request
_REMBG_SESSION = None

def _get_rembg_session():
    global _REMBG_SESSION
    if _REMBG_SESSION is None:
        try:
            import rembg
            # Try isnet-general-use first (highest quality), fallback to u2net, then u2netp
            loaded = False
            for model_name in ["isnet-general-use", "u2net", "u2netp"]:
                try:
                    _REMBG_SESSION = rembg.new_session(model_name)
                    logger.info(f"rembg session initialized with model: {model_name}")
                    loaded = True
                    break
                except Exception as model_err:
                    logger.debug(f"Model {model_name} failed: {model_err}")
                    continue
            if not loaded:
                raise Exception("No rembg model could be loaded")
        except Exception as err:
            logger.warning(f"Could not initialize rembg session: {err}")
            _REMBG_SESSION = False
    return _REMBG_SESSION if _REMBG_SESSION is not False else None


def _remove_bg_fast_opencv(input_path: Path) -> Image.Image:
    """
    Improved OpenCV GrabCut Matting Engine for Background Removal.
    Uses higher resolution and more iterations for better quality edges.
    """
    img_bgr = cv2.imread(str(input_path))
    if img_bgr is None:
        raise ValueError("Failed to read image for background removal.")

    orig_h, orig_w = img_bgr.shape[:2]

    # Process at 640px for better edge detection quality
    max_dim = 640
    if max(orig_h, orig_w) > max_dim:
        scale = max_dim / float(max(orig_h, orig_w))
        proc_w = max(10, int(orig_w * scale))
        proc_h = max(10, int(orig_h * scale))
        img_proc = cv2.resize(img_bgr, (proc_w, proc_h), interpolation=cv2.INTER_AREA)
    else:
        img_proc = img_bgr
        proc_h, proc_w = orig_h, orig_w

    # Central bounding box with slightly wider margin for better foreground detection
    margin_w = max(1, int(proc_w * 0.03))
    margin_h = max(1, int(proc_h * 0.03))
    rect = (margin_w, margin_h, max(1, proc_w - (2 * margin_w)), max(1, proc_h - (2 * margin_h)))

    mask = np.zeros((proc_h, proc_w), np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    # More GrabCut iterations for better accuracy (5 instead of 2)
    cv2.grabCut(img_proc, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)

    # Extract foreground mask
    mask_fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

    # Morphological operations for cleaner mask
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    mask_fg = cv2.morphologyEx(mask_fg, cv2.MORPH_CLOSE, kernel_close, iterations=2)

    kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask_fg = cv2.morphologyEx(mask_fg, cv2.MORPH_OPEN, kernel_open, iterations=1)

    # Gentle blur for smooth edges
    mask_fg = cv2.GaussianBlur(mask_fg, (3, 3), 0)

    # Scale alpha mask back to original full-resolution dimensions with LANCZOS equivalent
    mask_fg_full = cv2.resize(mask_fg, (orig_w, orig_h), interpolation=cv2.INTER_LANCZOS4)

    # Read original full-size image in RGBA mode
    with Image.open(input_path) as orig_pil:
        orig_rgba = orig_pil.convert("RGBA")
        alpha_channel = Image.fromarray(mask_fg_full, mode="L")
        orig_rgba.putalpha(alpha_channel)
        return orig_rgba


def process_bg_remove_image(input_path: Path, state: BgRemoveRequestState) -> Path:
    """
    Production-ready AI Background Removal Engine with Refinement Controls (Feathering & Mask Threshold).
    Preserves subject detail, isolates foreground, and exports crisp transparent PNG.
    """
    logger.info(f"Processing background removal for: {input_path} | Feather: {state.feather}px | Threshold: {state.threshold}%")

    rgba_img = None

    # Try AI model rembg if installed and session ready
    session = _get_rembg_session()
    if session is not None:
        try:
            import rembg
            with Image.open(input_path) as img:
                orig_w, orig_h = img.size

                # Upscale to 1024px for high-quality ONNX model inference (better edge detail)
                max_dim = 1024
                if max(orig_w, orig_h) > max_dim:
                    scale = max_dim / float(max(orig_w, orig_h))
                    proc_w = int(orig_w * scale)
                    proc_h = int(orig_h * scale)
                    img_proc = img.resize((proc_w, proc_h), Image.Resampling.LANCZOS)
                else:
                    img_proc = img
                    proc_w, proc_h = orig_w, orig_h

                img_rgba = img_proc.convert("RGBA")
                result_proc = rembg.remove(img_rgba, session=session)

                # Upscale alpha channel back to full original resolution with LANCZOS for sharp edges
                if (proc_w, proc_h) != (orig_w, orig_h):
                    alpha_proc = result_proc.getchannel("A")
                    alpha_full = alpha_proc.resize((orig_w, orig_h), Image.Resampling.LANCZOS)
                    orig_rgba = img.convert("RGBA")
                    orig_rgba.putalpha(alpha_full)
                    rgba_img = orig_rgba
                else:
                    rgba_img = result_proc

                logger.info("Executed rembg AI model background removal successfully.")
        except Exception as err:
            logger.warning(f"rembg processing error: {err}. Falling back to OpenCV Fast Engine.")
            rgba_img = None

    if rgba_img is None:
        rgba_img = _remove_bg_fast_opencv(input_path)
        logger.info("Executed OpenCV Fast Matting background removal engine successfully.")

    # Ensure RGBA mode
    if rgba_img.mode != "RGBA":
        rgba_img = rgba_img.convert("RGBA")

    # Step 3: Apply Required Refinements (Mask Threshold & Edge Feathering)
    alpha = rgba_img.getchannel("A")

    # A. Threshold Refinement (Cutoff adjustment around default 50%)
    thresh_val = max(0, min(100, state.threshold))
    if thresh_val != 50:
        cutoff = int((thresh_val / 100.0) * 255)
        alpha_np = np.array(alpha, dtype=np.uint8)
        alpha_np = np.where(alpha_np >= cutoff, alpha_np, 0)
        alpha = Image.fromarray(alpha_np, mode="L")

    # B. Edge Feathering Refinement (GaussianBlur smoothing on alpha channel)
    feather_radius = max(0.0, min(20.0, float(state.feather)))
    if feather_radius > 0:
        # Use mild feathering for smooth anti-aliased edges
        alpha = alpha.filter(ImageFilter.GaussianBlur(radius=feather_radius))

    rgba_img.putalpha(alpha)

    # Step 4: Save Processed Transparent PNG Output
    output_filename = f"bg_removed_{uuid.uuid4()}.png"
    output_path = DOWNLOADS_DIR / output_filename
    rgba_img.save(output_path, format="PNG")

    logger.info(f"Successfully removed background: {output_path}")
    return output_path


def process_bg_remove_batch_zip(items: list[tuple[Path, str, BgRemoveRequestState]]) -> Path:
    """
    Process multiple image files with background removal states and package them into a single ZIP archive.
    items: List of (input_file_path, original_filename, BgRemoveRequestState)
    """
    zip_filename = f"bg_removed_images_{uuid.uuid4().hex[:8]}.zip"
    zip_output_path = DOWNLOADS_DIR / zip_filename

    logger.info(f"Creating background removal batch ZIP archive with {len(items)} images: {zip_output_path}")

    with zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for idx, (input_path, orig_name, state) in enumerate(items, start=1):
            try:
                processed_path = process_bg_remove_image(input_path, state)
                stem = Path(orig_name).stem if orig_name else f"image_{idx}"
                arcname = f"bg_removed_{idx:02d}_{stem}.png"

                zip_file.write(processed_path, arcname=arcname)
                delete_file(processed_path)
            except Exception as err:
                logger.error(f"Error processing item #{idx} ({orig_name}) for background removal batch ZIP: {err}")

    return zip_output_path
