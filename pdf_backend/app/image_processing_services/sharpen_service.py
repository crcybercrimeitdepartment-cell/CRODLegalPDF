import logging
import uuid
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False

from app.schemas.sharpen_schema import SharpenRequestState
from app.core.paths import DOWNLOADS_DIR

logger = logging.getLogger(__name__)

def process_sharpen_image(input_path: Path, state: SharpenRequestState) -> Path:
    """
    Production-ready Sharpening Engine (OpenCV Unsharp Mask with Pillow Fallback).
    Formula: Sharpened = cv2.addWeighted(image, 1 + alpha, GaussianBlur(image), -alpha, 0)
    where alpha = intensity / 50.0
    """
    logger.info(f"Processing sharpen request for: {input_path} | Intensity: {state.intensity}% | OpenCV: {HAS_OPENCV}")

    intensity = max(0.0, min(100.0, float(state.intensity)))
    alpha = intensity / 50.0  # 50% = 1.0 alpha factor, 100% = 2.0 alpha factor

    with Image.open(input_path) as PIL_img:
        orig_format = PIL_img.format or "PNG"
        has_alpha = PIL_img.mode in ("RGBA", "LA") or (PIL_img.mode == "P" and "transparency" in PIL_img.info)

        if HAS_OPENCV:
            # --- Primary OpenCV Unsharp Mask Execution ---
            if has_alpha:
                img_rgba = np.array(PIL_img.convert("RGBA"))
                bgr_img = cv2.cvtColor(img_rgba[:, :, :3], cv2.COLOR_RGB2BGR)
                alpha_channel = img_rgba[:, :, 3]
            else:
                bgr_img = cv2.cvtColor(np.array(PIL_img.convert("RGB")), cv2.COLOR_RGB2BGR)
                alpha_channel = None

            # 1. Apply Gaussian Blur
            blurred_img = cv2.GaussianBlur(bgr_img, (0, 0), sigmaX=3.0)

            # 2. Weighted Addition: Sharpened = (1 + alpha)*Original - alpha*Blurred
            sharpened_bgr = cv2.addWeighted(bgr_img, 1.0 + alpha, blurred_img, -alpha, 0)
            sharpened_bgr = np.clip(sharpened_bgr, 0, 255).astype(np.uint8)

            sharpened_rgb = cv2.cvtColor(sharpened_bgr, cv2.COLOR_BGR2RGB)

            if has_alpha and alpha_channel is not None:
                rgba_result = np.dstack((sharpened_rgb, alpha_channel))
                result_img = Image.fromarray(rgba_result, mode="RGBA")
            else:
                result_img = Image.fromarray(sharpened_rgb, mode="RGB")
        else:
            # --- Fallback Pure Pillow Unsharp Mask ---
            if has_alpha:
                image = PIL_img.convert("RGBA")
            else:
                image = PIL_img.convert("RGB")

            percent = int(intensity * 3.0)  # 50% -> 150%, 100% -> 300%
            result_img = image.filter(ImageFilter.UnsharpMask(radius=2.0, percent=percent, threshold=2))
            result_img = ImageEnhance.Sharpness(result_img).enhance(1.0 + (intensity / 100.0))

    # Export sharpened image to downloads directory
    ext = ".png" if has_alpha or orig_format.upper() == "PNG" else ".jpg"
    output_filename = f"sharpened_{uuid.uuid4()}{ext}"
    output_path = DOWNLOADS_DIR / output_filename

    # Convert RGBA to RGB if output format is JPEG
    if ext == ".jpg" and result_img.mode == "RGBA":
        bg = Image.new("RGB", result_img.size, (255, 255, 255))
        bg.paste(result_img, mask=result_img.split()[3])
        result_img = bg

    result_img.save(output_path, quality=98)
    logger.info(f"Successfully processed sharpened image: {output_path}")
    return output_path


def process_sharpen_batch_zip(items: list[tuple[Path, str, SharpenRequestState]]) -> Path:
    """
    Process multiple image files with sharpening states and package them into a single ZIP archive.
    items: List of (input_file_path, original_filename, SharpenRequestState)
    """
    import zipfile
    from app.utils.cleanup import delete_file

    zip_filename = f"sharpened_images_{uuid.uuid4().hex[:8]}.zip"
    zip_output_path = DOWNLOADS_DIR / zip_filename

    logger.info(f"Creating batch ZIP archive with {len(items)} images: {zip_output_path}")

    with zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for idx, (input_path, orig_name, state) in enumerate(items, start=1):
            try:
                processed_path = process_sharpen_image(input_path, state)
                stem = Path(orig_name).stem if orig_name else f"image_{idx}"
                ext = processed_path.suffix
                arcname = f"sharpened_{idx:02d}_{stem}{ext}"

                zip_file.write(processed_path, arcname=arcname)
                delete_file(processed_path)
            except Exception as err:
                logger.error(f"Error processing item #{idx} ({orig_name}) for batch ZIP: {err}")

    return zip_output_path
