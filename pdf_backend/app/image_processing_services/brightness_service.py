import logging
import uuid
import zipfile
from pathlib import Path
from PIL import Image, ImageEnhance

from app.schemas.brightness_schema import BrightnessRequestState
from app.core.paths import DOWNLOADS_DIR
from app.utils.cleanup import delete_file

logger = logging.getLogger(__name__)

def process_brightness_image(input_path: Path, state: BrightnessRequestState) -> Path:
    """
    Production-ready Image Brightness Adjustment Engine using Pillow ImageEnhance.Brightness.
    Maps brightness level (-100% to +100%) to enhancement factor (0.0 to 2.0).
    Preserves RGBA transparency and alpha channels.
    """
    logger.info(f"Processing brightness request for: {input_path} | Level: {state.brightness}%")

    brightness_val = max(-100.0, min(100.0, float(state.brightness)))
    # Factor mapping: -100% -> 0.0 (dark), 0% -> 1.0 (normal), +100% -> 2.0 (bright)
    factor = max(0.0, 1.0 + (brightness_val / 100.0))

    with Image.open(input_path) as img:
        orig_format = img.format or "PNG"
        has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)

        alpha_channel = None
        if has_alpha:
            alpha_channel = img.convert("RGBA").getchannel("A")
            image = img.convert("RGB")
        else:
            image = img.convert("RGB")

        # Execute Brightness Enhancement
        enhancer = ImageEnhance.Brightness(image)
        result_img = enhancer.enhance(factor)

        # Re-attach alpha channel if RGBA
        if has_alpha and alpha_channel:
            result_img = result_img.convert("RGBA")
            result_img.putalpha(alpha_channel)

        # Export adjusted image
        ext = ".png" if has_alpha or orig_format.upper() == "PNG" else ".jpg"
        output_filename = f"brightness_{uuid.uuid4()}{ext}"
        output_path = DOWNLOADS_DIR / output_filename

        # Convert RGBA to RGB for JPEG save
        if ext == ".jpg" and result_img.mode == "RGBA":
            bg = Image.new("RGB", result_img.size, (255, 255, 255))
            bg.paste(result_img, mask=result_img.split()[3])
            result_img = bg

        result_img.save(output_path, quality=98)
        logger.info(f"Successfully processed brightness image: {output_path}")
        return output_path


def process_brightness_batch_zip(items: list[tuple[Path, str, BrightnessRequestState]]) -> Path:
    """
    Process multiple image files with brightness states and package them into a single ZIP archive.
    items: List of (input_file_path, original_filename, BrightnessRequestState)
    """
    zip_filename = f"brightness_images_{uuid.uuid4().hex[:8]}.zip"
    zip_output_path = DOWNLOADS_DIR / zip_filename

    logger.info(f"Creating brightness batch ZIP archive with {len(items)} images: {zip_output_path}")

    with zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for idx, (input_path, orig_name, state) in enumerate(items, start=1):
            try:
                processed_path = process_brightness_image(input_path, state)
                stem = Path(orig_name).stem if orig_name else f"image_{idx}"
                ext = processed_path.suffix
                arcname = f"brightness_{idx:02d}_{stem}{ext}"

                zip_file.write(processed_path, arcname=arcname)
                delete_file(processed_path)
            except Exception as err:
                logger.error(f"Error processing item #{idx} ({orig_name}) for brightness batch ZIP: {err}")

    return zip_output_path
