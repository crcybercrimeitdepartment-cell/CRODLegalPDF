import logging
import uuid
from pathlib import Path
from PIL import Image

from app.schemas.flip_schema import FlipRequestState
from app.core.paths import DOWNLOADS_DIR

logger = logging.getLogger(__name__)

def process_flip_image(input_path: Path, state: FlipRequestState) -> Path:
    """
    Process single image for horizontal and vertical flip operations using Pillow.
    Strictly restricted to Flip operations.
    """
    logger.info(f"Processing flip request for: {input_path} | H: {state.flip_horizontal}, V: {state.flip_vertical}")
    
    with Image.open(input_path) as img:
        orig_format = img.format or "PNG"
        has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
        
        if has_alpha:
            image = img.convert("RGBA")
        else:
            image = img.convert("RGB")

        # 1. Horizontal Flip (Left <-> Right)
        if state.flip_horizontal:
            image = image.transpose(Image.FLIP_LEFT_RIGHT)
            logger.debug("Applied Horizontal Flip (FLIP_LEFT_RIGHT)")

        # 2. Vertical Flip (Top <-> Bottom)
        if state.flip_vertical:
            image = image.transpose(Image.FLIP_TOP_BOTTOM)
            logger.debug("Applied Vertical Flip (FLIP_TOP_BOTTOM)")

        # Save to downloads directory
        ext = ".png" if has_alpha or orig_format.upper() == "PNG" else ".jpg"
        output_filename = f"flipped_{uuid.uuid4()}{ext}"
        output_path = DOWNLOADS_DIR / output_filename

        # Convert RGBA to RGB for JPEG save
        if ext == ".jpg" and image.mode == "RGBA":
            bg = Image.new("RGB", image.size, (255, 255, 255))
            bg.paste(image, mask=image.split()[3])
            image = bg

        image.save(output_path, quality=95)
        logger.info(f"Successfully processed flipped image: {output_path}")
        return output_path


def process_flip_batch_zip(items: list[tuple[Path, str, FlipRequestState]]) -> Path:
    """
    Process multiple image files with flip states and package them into a single ZIP archive.
    items: List of (input_file_path, original_filename, FlipRequestState)
    """
    import zipfile
    from app.utils.cleanup import delete_file

    zip_filename = f"flipped_images_{uuid.uuid4().hex[:8]}.zip"
    zip_output_path = DOWNLOADS_DIR / zip_filename

    logger.info(f"Creating flip batch ZIP archive with {len(items)} images: {zip_output_path}")

    with zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for idx, (input_path, orig_name, state) in enumerate(items, start=1):
            try:
                processed_path = process_flip_image(input_path, state)
                stem = Path(orig_name).stem if orig_name else f"image_{idx}"
                ext = processed_path.suffix
                arcname = f"flipped_{idx:02d}_{stem}{ext}"

                zip_file.write(processed_path, arcname=arcname)
                delete_file(processed_path)
            except Exception as err:
                logger.error(f"Error processing item #{idx} ({orig_name}) for flip batch ZIP: {err}")

    return zip_output_path
