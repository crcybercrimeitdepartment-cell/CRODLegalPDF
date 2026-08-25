import logging
import uuid
import zipfile
from pathlib import Path
from PIL import Image

from app.schemas.rotate_schema import RotateRequestState
from app.core.paths import DOWNLOADS_DIR
from app.utils.cleanup import delete_file

logger = logging.getLogger(__name__)

def process_rotate_image(input_path: Path, state: RotateRequestState) -> Path:
    """
    Production-ready Image Rotation Engine using Pillow.
    Executes high-quality rotation with canvas expansion to prevent image clipping.
    Preserves RGBA transparency and image quality.
    """
    logger.info(f"Processing rotate request for: {input_path} | Angle: {state.angle}°")

    with Image.open(input_path) as img:
        orig_format = img.format or "PNG"
        orig_w, orig_h = img.size
        logger.debug(f"Original image size: {orig_w}x{orig_h} px | Format: {orig_format}")

        has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)

        # Preserve RGBA transparency or convert to RGB
        if has_alpha:
            image = img.convert("RGBA")
        else:
            image = img.convert("RGB")

        # Convert clockwise user angle to Pillow counter-clockwise rotation angle
        angle_cw = state.angle % 360
        pil_angle = (360 - angle_cw) % 360

        if pil_angle != 0:
            rotated_img = image.rotate(pil_angle, expand=state.expand, resample=Image.Resampling.BICUBIC)
            logger.debug(f"Rotated image by {state.angle}° | New size: {rotated_img.width}x{rotated_img.height} px")
        else:
            rotated_img = image.copy()

        # Determine file extension
        ext = ".png" if has_alpha or orig_format.upper() == "PNG" else ".jpg"
        output_filename = f"rotated_{uuid.uuid4()}{ext}"
        output_path = DOWNLOADS_DIR / output_filename

        # Convert RGBA to RGB if output format is JPEG
        if ext == ".jpg" and rotated_img.mode == "RGBA":
            bg = Image.new("RGB", rotated_img.size, (255, 255, 255))
            bg.paste(rotated_img, mask=rotated_img.split()[3])
            rotated_img = bg

        rotated_img.save(output_path, quality=98)
        logger.info(f"Successfully processed rotated image: {output_path}")
        return output_path


def process_rotate_batch_zip(items: list[tuple[Path, str, RotateRequestState]]) -> Path:
    """
    Process multiple image files with independent rotation states and package successful ones into a ZIP archive.
    Handles individual file failures gracefully without breaking the batch.
    items: List of (input_file_path, original_filename, RotateRequestState)
    """
    zip_filename = f"rotated_images_{uuid.uuid4().hex[:8]}.zip"
    zip_output_path = DOWNLOADS_DIR / zip_filename

    logger.info(f"Creating rotate batch ZIP archive with {len(items)} images: {zip_output_path}")

    processed_count = 0
    with zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for idx, (input_path, orig_name, state) in enumerate(items, start=1):
            try:
                processed_path = process_rotate_image(input_path, state)
                stem = Path(orig_name).stem if orig_name else f"image_{idx}"
                ext = processed_path.suffix
                arcname = f"rotated_{idx:02d}_{stem}{ext}"

                zip_file.write(processed_path, arcname=arcname)
                delete_file(processed_path)
                processed_count += 1
            except Exception as err:
                logger.error(f"Error rotating item #{idx} ({orig_name}) for batch ZIP: {err}", exc_info=True)

    if processed_count == 0:
        delete_file(zip_output_path)
        raise ValueError("Failed to process any valid rotated images for batch ZIP archive.")

    return zip_output_path
