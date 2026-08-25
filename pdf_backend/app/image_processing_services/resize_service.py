import logging
import uuid
import zipfile
from pathlib import Path
from PIL import Image

from app.schemas.resize_schema import ResizeRequestState
from app.core.paths import DOWNLOADS_DIR
from app.utils.cleanup import delete_file

logger = logging.getLogger(__name__)

def process_resize_image(input_path: Path, state: ResizeRequestState) -> Path:
    """
    Production-ready Image Resizing Engine using Pillow Lanczos Resampling.
    Strictly validates target width and height (1 to 10,000 px).
    Preserves RGBA transparency and image quality.
    """
    logger.info(f"Processing resize request for: {input_path} | Target Dimensions: {state.width}x{state.height} px")

    # Validate target dimensions
    if state.width < 1 or state.width > 10000 or state.height < 1 or state.height > 10000:
        raise ValueError(f"Invalid target dimensions: {state.width}x{state.height} px. Must be between 1 and 10,000 pixels.")

    with Image.open(input_path) as img:
        orig_format = img.format or "PNG"
        orig_w, orig_h = img.size
        logger.debug(f"Original image dimensions: {orig_w}x{orig_h} px | Format: {orig_format}")

        has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
        
        # Preserve RGBA mode or convert to RGB
        if has_alpha:
            image = img.convert("RGBA")
        else:
            image = img.convert("RGB")

        # Perform high-quality Lanczos Resampling Resize
        resized_img = image.resize((state.width, state.height), resample=Image.Resampling.LANCZOS)
        logger.debug(f"Resized image from {orig_w}x{orig_h} to {resized_img.width}x{resized_img.height}")

        # Determine file extension
        ext = ".png" if has_alpha or orig_format.upper() == "PNG" else ".jpg"
        output_filename = f"resized_{uuid.uuid4()}{ext}"
        output_path = DOWNLOADS_DIR / output_filename

        # Convert RGBA to RGB if saving to JPEG format
        if ext == ".jpg" and resized_img.mode == "RGBA":
            bg = Image.new("RGB", resized_img.size, (255, 255, 255))
            bg.paste(resized_img, mask=resized_img.split()[3])
            resized_img = bg

        resized_img.save(output_path, quality=98)
        logger.info(f"Successfully processed resized image: {output_path}")
        return output_path


def process_resize_batch_zip(items: list[tuple[Path, str, ResizeRequestState]]) -> Path:
    """
    Process multiple image files with independent resize states and package successful ones into a ZIP archive.
    Handles individual file failures gracefully without breaking the entire batch.
    items: List of (input_file_path, original_filename, ResizeRequestState)
    """
    zip_filename = f"resized_images_{uuid.uuid4().hex[:8]}.zip"
    zip_output_path = DOWNLOADS_DIR / zip_filename

    logger.info(f"Creating resize batch ZIP archive with {len(items)} images: {zip_output_path}")

    processed_count = 0
    with zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for idx, (input_path, orig_name, state) in enumerate(items, start=1):
            try:
                processed_path = process_resize_image(input_path, state)
                stem = Path(orig_name).stem if orig_name else f"image_{idx}"
                ext = processed_path.suffix
                arcname = f"resized_{idx:02d}_{stem}{ext}"

                zip_file.write(processed_path, arcname=arcname)
                delete_file(processed_path)
                processed_count += 1
            except Exception as err:
                logger.error(f"Error resizing item #{idx} ({orig_name}) for batch ZIP: {err}", exc_info=True)

    if processed_count == 0:
        delete_file(zip_output_path)
        raise ValueError("Failed to process any valid resized images for batch ZIP archive.")

    return zip_output_path
