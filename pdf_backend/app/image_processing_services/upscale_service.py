import logging
import uuid
import zipfile
from pathlib import Path
from PIL import Image

from app.schemas.upscale_schema import UpscaleRequestState
from app.core.paths import DOWNLOADS_DIR
from app.utils.cleanup import delete_file

logger = logging.getLogger(__name__)

def process_upscale_image(input_path: Path, state: UpscaleRequestState) -> Path:
    """
    High-quality image upscaling engine using Pillow's Lanczos resampling.
    This does NOT use deep learning models. It performs standard mathematical high-quality interpolation.
    Validates dimensions and preserves alpha transparency channels.
    """
    logger.info(f"Processing upscale request for: {input_path} | Scale Factor: {state.scale_factor}x")

    with Image.open(input_path) as img:
        orig_format = img.format or "PNG"
        orig_w, orig_h = img.size
        logger.debug(f"Original dimensions: {orig_w}x{orig_h} px | Format: {orig_format}")

        # Calculate target dimensions
        target_w = orig_w * state.scale_factor
        target_h = orig_h * state.scale_factor

        # Safety boundary limits check (Cap at 10,000 px in either dimension)
        if target_w > 10000 or target_h > 10000:
            raise ValueError(
                f"Upscaled image size ({target_w}x{target_h}px) exceeds the safe limit of 10,000 pixels in either dimension."
            )

        # Check for alpha channel transparency support
        has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)

        if has_alpha:
            image = img.convert("RGBA")
        else:
            image = img.convert("RGB")

        # Perform high-quality Lanczos resampling
        upscaled_img = image.resize((target_w, target_h), resample=Image.Resampling.LANCZOS)
        logger.debug(f"Upscaled image from {orig_w}x{orig_h} to {upscaled_img.width}x{upscaled_img.height}")

        # Select file extension
        ext = ".png" if has_alpha or orig_format.upper() == "PNG" else ".jpg"
        output_filename = f"upscaled_{uuid.uuid4()}{ext}"
        output_path = DOWNLOADS_DIR / output_filename

        # Flatten transparent background for JPEG output
        if ext == ".jpg" and upscaled_img.mode == "RGBA":
            bg = Image.new("RGB", upscaled_img.size, (255, 255, 255))
            bg.paste(upscaled_img, mask=upscaled_img.split()[3])
            upscaled_img = bg

        upscaled_img.save(output_path, quality=98)
        logger.info(f"Successfully processed upscaled image: {output_path}")
        return output_path


def process_upscale_batch_zip(items: list[tuple[Path, str, UpscaleRequestState]]) -> tuple[Path | None, dict]:
    """
    Process multiple images and package the successful ones into a ZIP file.
    Does not crash on single file failure, but keeps a detailed status report.
    Returns:
        (zip_file_path, report_dict)
    """
    zip_filename = f"upscaled_images_{uuid.uuid4().hex[:8]}.zip"
    zip_output_path = DOWNLOADS_DIR / zip_filename

    total_count = len(items)
    successful = []
    failures = []

    logger.info(f"Starting batch upscaling for {total_count} images.")

    zip_created = False
    zip_file = None

    try:
        for idx, (input_path, orig_name, state) in enumerate(items, start=1):
            try:
                processed_path = process_upscale_image(input_path, state)
                
                # Lazily open ZIP archive only when we have at least one successful file
                if not zip_created:
                    zip_file = zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED)
                    zip_created = True

                stem = Path(orig_name).stem if orig_name else f"image_{idx}"
                ext = processed_path.suffix
                arcname = f"upscaled_{idx:02d}_{stem}{ext}"

                zip_file.write(processed_path, arcname=arcname)
                delete_file(processed_path)
                
                successful.append(orig_name)
            except Exception as err:
                error_msg = str(err)
                logger.error(f"Error upscaling item #{idx} ({orig_name}) for batch ZIP: {error_msg}")
                failures.append({
                    "filename": orig_name,
                    "reason": error_msg
                })

        if zip_file:
            zip_file.close()

    except Exception as general_err:
        logger.error(f"Unexpected error in batch ZIP generation: {general_err}")
        if zip_file:
            try:
                zip_file.close()
            except Exception:
                pass
        if zip_output_path.exists():
            delete_file(zip_output_path)
        raise general_err

    # Clean up ZIP if no images were successfully processed
    if not zip_created or len(successful) == 0:
        if zip_output_path.exists():
            delete_file(zip_output_path)
        zip_output_path = None

    report = {
        "total": total_count,
        "successful_count": len(successful),
        "failed_count": len(failures),
        "successful": successful,
        "failures": failures
    }

    return zip_output_path, report
