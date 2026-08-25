import logging
import uuid
import zipfile
from pathlib import Path
from PIL import Image

from app.schemas.crop_schema import CropRequestState
from app.core.paths import DOWNLOADS_DIR
from app.utils.cleanup import delete_file

logger = logging.getLogger(__name__)

def process_crop_image(input_path: Path, state: CropRequestState) -> Path:
    """
    Production-ready Image Cropping Engine using Pillow.
    Strictly validates and clamps crop coordinates against full original image dimensions.
    Preserves RGBA transparency and image quality.
    """
    logger.info(f"Processing crop request for: {input_path} | Coordinates: ({state.left}, {state.top}, {state.right}, {state.bottom})")

    with Image.open(input_path) as img:
        orig_format = img.format or "PNG"
        orig_w, orig_h = img.size

        # 1. Strict coordinate clamping and validation
        left = max(0, min(state.left, orig_w - 1))
        top = max(0, min(state.top, orig_h - 1))
        right = max(left + 1, min(state.right, orig_w))
        bottom = max(top + 1, min(state.bottom, orig_h))

        if right <= left or bottom <= top:
            raise ValueError(f"Invalid crop dimensions: box ({left}, {top}, {right}, {bottom}) for image size {orig_w}x{orig_h}")

        has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
        
        # 2. Preserve RGBA mode or convert to RGB
        if has_alpha:
            image = img.convert("RGBA")
        else:
            image = img.convert("RGB")

        # 3. Perform Pillow Crop
        cropped_img = image.crop((left, top, right, bottom))
        logger.debug(f"Cropped image from {orig_w}x{orig_h} to {cropped_img.width}x{cropped_img.height}")

        # 4. Save to downloads directory
        ext = ".png" if has_alpha or orig_format.upper() == "PNG" else ".jpg"
        output_filename = f"cropped_{uuid.uuid4()}{ext}"
        output_path = DOWNLOADS_DIR / output_filename

        # Convert RGBA to RGB if output format is JPEG
        if ext == ".jpg" and cropped_img.mode == "RGBA":
            bg = Image.new("RGB", cropped_img.size, (255, 255, 255))
            bg.paste(cropped_img, mask=cropped_img.split()[3])
            cropped_img = bg

        cropped_img.save(output_path, quality=98)
        logger.info(f"Successfully processed cropped image: {output_path}")
        return output_path


def process_crop_batch_zip(items: list[tuple[Path, str, CropRequestState]]) -> Path:
    """
    Process multiple image files with independent crop states and package successful ones into a ZIP archive.
    Handles individual file failures gracefully without breaking the entire batch.
    items: List of (input_file_path, original_filename, CropRequestState)
    """
    zip_filename = f"cropped_images_{uuid.uuid4().hex[:8]}.zip"
    zip_output_path = DOWNLOADS_DIR / zip_filename

    logger.info(f"Creating crop batch ZIP archive with {len(items)} images: {zip_output_path}")

    processed_count = 0
    with zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for idx, (input_path, orig_name, state) in enumerate(items, start=1):
            try:
                processed_path = process_crop_image(input_path, state)
                stem = Path(orig_name).stem if orig_name else f"image_{idx}"
                ext = processed_path.suffix
                arcname = f"cropped_{idx:02d}_{stem}{ext}"

                zip_file.write(processed_path, arcname=arcname)
                delete_file(processed_path)
                processed_count += 1
            except Exception as err:
                logger.error(f"Error cropping item #{idx} ({orig_name}) for batch ZIP: {err}", exc_info=True)

    if processed_count == 0:
        delete_file(zip_output_path)
        raise ValueError("Failed to process any valid cropped images for batch ZIP archive.")

    return zip_output_path
