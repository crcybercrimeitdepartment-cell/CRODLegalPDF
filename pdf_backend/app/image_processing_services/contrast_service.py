import logging
import uuid
import zipfile
from pathlib import Path
from PIL import Image, ImageEnhance, ImageOps

from app.schemas.contrast_schema import ContrastRequestState
from app.core.paths import DOWNLOADS_DIR
from app.utils.cleanup import delete_file

logger = logging.getLogger(__name__)

def process_contrast_image(input_path: Path, state: ContrastRequestState) -> Path:
    """
    Production-ready Image Contrast Adjustment Engine using Pillow ImageEnhance.Contrast & ImageOps.autocontrast.
    Supports Manual mode (-100% to +100%) and Automatic mode (histogram dynamic range stretching).
    Preserves RGBA transparency and alpha channels.
    """
    mode = (state.mode or "manual").lower()
    logger.info(f"Processing contrast request for: {input_path} | Mode: {mode} | Level: {state.contrast}%")

    with Image.open(input_path) as img:
        orig_format = img.format or "PNG"
        has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)

        alpha_channel = None
        if has_alpha:
            alpha_channel = img.convert("RGBA").getchannel("A")
            image = img.convert("RGB")
        else:
            image = img.convert("RGB")

        if mode == "auto":
            # Automatic Contrast Adjustment (Histogram stretching with cutoff)
            try:
                result_img = ImageOps.autocontrast(image, cutoff=0.5)
            except Exception as err:
                logger.warning(f"Auto-contrast fallback to manual: {err}")
                result_img = image
        else:
            # Manual Contrast Adjustment (-100% -> 0.0, 0% -> 1.0, +100% -> 2.0)
            contrast_val = max(-100.0, min(100.0, float(state.contrast)))
            factor = max(0.0, 1.0 + (contrast_val / 100.0))
            enhancer = ImageEnhance.Contrast(image)
            result_img = enhancer.enhance(factor)

        # Re-attach alpha channel if RGBA
        if has_alpha and alpha_channel:
            result_img = result_img.convert("RGBA")
            result_img.putalpha(alpha_channel)

        # Export adjusted image
        ext = ".png" if has_alpha or orig_format.upper() == "PNG" else ".jpg"
        output_filename = f"contrast_{uuid.uuid4()}{ext}"
        output_path = DOWNLOADS_DIR / output_filename

        # Convert RGBA to RGB for JPEG save
        if ext == ".jpg" and result_img.mode == "RGBA":
            bg = Image.new("RGB", result_img.size, (255, 255, 255))
            bg.paste(result_img, mask=result_img.split()[3])
            result_img = bg

        result_img.save(output_path, quality=98)
        logger.info(f"Successfully processed contrast image: {output_path}")
        return output_path


def process_contrast_batch_zip(items: list[tuple[Path, str, ContrastRequestState]]) -> Path:
    """
    Process multiple image files with contrast states and package them into a single ZIP archive.
    items: List of (input_file_path, original_filename, ContrastRequestState)
    """
    zip_filename = f"contrast_images_{uuid.uuid4().hex[:8]}.zip"
    zip_output_path = DOWNLOADS_DIR / zip_filename

    logger.info(f"Creating contrast batch ZIP archive with {len(items)} images: {zip_output_path}")

    with zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for idx, (input_path, orig_name, state) in enumerate(items, start=1):
            try:
                processed_path = process_contrast_image(input_path, state)
                stem = Path(orig_name).stem if orig_name else f"image_{idx}"
                ext = processed_path.suffix
                arcname = f"contrast_{idx:02d}_{stem}{ext}"

                zip_file.write(processed_path, arcname=arcname)
                delete_file(processed_path)
            except Exception as err:
                logger.error(f"Error processing item #{idx} ({orig_name}) for contrast batch ZIP: {err}")

    return zip_output_path
