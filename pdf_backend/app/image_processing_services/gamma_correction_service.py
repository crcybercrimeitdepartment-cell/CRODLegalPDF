import logging
import uuid
import zipfile
import numpy as np
import cv2
from pathlib import Path
from PIL import Image

from app.schemas.gamma_correction_schema import GammaCorrectionRequestState
from app.core.paths import DOWNLOADS_DIR
from app.utils.cleanup import delete_file

logger = logging.getLogger(__name__)


def process_gamma_correction_image(input_path: Path, state: GammaCorrectionRequestState) -> Path:
    """
    Production-ready Gamma Correction Engine using OpenCV & NumPy LUT (Lookup Table).
    Formula: output = ((input / 255.0) ** (1.0 / gamma)) * 255.0
    Automatically preserves alpha channel transparency without any user toggle.
    """
    gamma_val = max(0.1, min(3.0, float(state.gamma)))
    logger.info(f"Processing Gamma Correction for: {input_path} | Gamma: {gamma_val}")

    # Step 1: Open with PIL & Automatically Extract Alpha Transparency if present
    with Image.open(input_path) as PIL_img:
        orig_format = PIL_img.format or "PNG"
        has_alpha = PIL_img.mode in ("RGBA", "LA") or (PIL_img.mode == "P" and "transparency" in PIL_img.info)
        
        alpha_channel = None
        if has_alpha:
            alpha_channel = PIL_img.convert("RGBA").getchannel("A")
            rgb_pil = PIL_img.convert("RGB")
        else:
            rgb_pil = PIL_img.convert("RGB")

    # Step 2: Convert to OpenCV BGR numpy array
    rgb_np = np.array(rgb_pil)
    img_bgr = cv2.cvtColor(rgb_np, cv2.COLOR_RGB2BGR)

    # Step 3: Build 256-entry Lookup Table (LUT) for Gamma Correction
    inv_gamma = 1.0 / gamma_val
    table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in range(256)]).astype("uint8")

    # Step 4: Execute OpenCV fast LUT transformation
    processed_bgr = cv2.LUT(img_bgr, table)

    # Step 5: Convert back to PIL Image & Automatically Re-attach Alpha Channel
    processed_rgb = cv2.cvtColor(processed_bgr, cv2.COLOR_BGR2RGB)
    result_pil = Image.fromarray(processed_rgb)

    if has_alpha and alpha_channel:
        result_pil = result_pil.convert("RGBA")
        result_pil.putalpha(alpha_channel)

    # Step 6: Export Output Image
    ext = ".png" if has_alpha or orig_format.upper() == "PNG" else ".jpg"
    output_filename = f"gamma_corrected_{uuid.uuid4()}{ext}"
    output_path = DOWNLOADS_DIR / output_filename

    if ext == ".jpg" and result_pil.mode == "RGBA":
        bg = Image.new("RGB", result_pil.size, (255, 255, 255))
        bg.paste(result_pil, mask=result_pil.split()[3])
        result_pil = bg

    result_pil.save(output_path, quality=98)
    logger.info(f"Successfully processed gamma corrected image: {output_path}")

    return output_path


def process_gamma_correction_batch_zip(
    items: list[tuple[Path, str, GammaCorrectionRequestState]]
) -> tuple[Path, dict]:
    """
    Process multiple image files independently with Gamma Correction and package into a ZIP archive.
    Captures exact error details per file so the frontend can report failures explicitly to the user.
    Returns (zip_output_path, summary_dict).
    """
    zip_filename = f"gamma_corrected_images_{uuid.uuid4().hex[:8]}.zip"
    zip_output_path = DOWNLOADS_DIR / zip_filename

    logger.info(f"Creating gamma correction batch ZIP archive with {len(items)} images: {zip_output_path}")

    processed_count = 0
    failures = []
    successes = []

    with zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for idx, (input_path, orig_name, state) in enumerate(items, start=1):
            try:
                processed_path = process_gamma_correction_image(input_path, state)
                stem = Path(orig_name).stem if orig_name else f"image_{idx}"
                ext = processed_path.suffix
                arcname = f"gamma_corrected_{idx:02d}_{stem}{ext}"

                zip_file.write(processed_path, arcname=arcname)
                delete_file(processed_path)
                processed_count += 1
                successes.append(orig_name)
            except Exception as err:
                error_msg = str(err)
                logger.error(f"Error processing item #{idx} ({orig_name}) for gamma correction batch ZIP: {error_msg}", exc_info=True)
                failures.append({
                    "filename": orig_name,
                    "reason": error_msg
                })

    if processed_count == 0:
        delete_file(zip_output_path)
        raise ValueError("Failed to process any valid images for batch ZIP archive.")

    summary = {
        "total": len(items),
        "successful_count": processed_count,
        "failed_count": len(failures),
        "failures": failures,
        "successes": successes
    }

    return zip_output_path, summary
