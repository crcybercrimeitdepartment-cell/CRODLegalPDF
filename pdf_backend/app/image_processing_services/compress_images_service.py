import logging
import uuid
import zipfile
import shutil
from pathlib import Path
from PIL import Image

from app.schemas.compress_images_schema import CompressImagesRequestState
from app.core.paths import DOWNLOADS_DIR
from app.utils.cleanup import delete_file

logger = logging.getLogger(__name__)

# Protect against decompression bomb attacks
Image.MAX_IMAGE_PIXELS = 89_478_485


def process_compress_image(
    input_path: Path, 
    state: CompressImagesRequestState
) -> tuple[Path, dict]:
    """
    Production-ready Image Compression Engine.
    Strictly preserves original file format (JPG->JPG, PNG->PNG, WEBP->WEBP) and image dimensions.
    Preserves alpha channel transparency (PNG/WebP).
    Returns (output_file_path, stats_dict).
    """
    orig_size_bytes = input_path.stat().st_size
    level = state.level.lower()
    logger.info(f"Processing Image Compression for: {input_path} | Level: {level} | Orig Size: {orig_size_bytes} bytes")

    with Image.open(input_path) as PIL_img:
        orig_format = (PIL_img.format or "JPEG").upper()
        if orig_format == "JPG":
            orig_format = "JPEG"

        orig_w, orig_h = PIL_img.size
        has_alpha = PIL_img.mode in ("RGBA", "LA") or (PIL_img.mode == "P" and "transparency" in PIL_img.info)

        # Prepare unique output filename preserving extension/format
        suffix = input_path.suffix.lower()
        if not suffix:
            suffix = ".png" if orig_format == "PNG" else ".jpg"

        output_filename = f"compressed_{uuid.uuid4()}{suffix}"
        output_path = DOWNLOADS_DIR / output_filename

        # Apply format-specific encoding parameters
        if orig_format in ("JPEG", "JPG"):
            quality_map = {"low": 85, "balanced": 70, "high": 52}
            quality_val = quality_map.get(level, 70)
            
            # If RGBA JPEG (rare), convert to RGB on white background
            save_img = PIL_img
            if save_img.mode in ("RGBA", "P", "LA"):
                bg = Image.new("RGB", save_img.size, (255, 255, 255))
                if save_img.mode == "P":
                    save_img = save_img.convert("RGBA")
                if "A" in save_img.mode:
                    bg.paste(save_img, mask=save_img.split()[-1])
                else:
                    bg.paste(save_img)
                save_img = bg

            save_img.save(output_path, format="JPEG", quality=quality_val, optimize=True)

        elif orig_format == "WEBP":
            quality_map = {"low": 85, "balanced": 70, "high": 52}
            quality_val = quality_map.get(level, 70)
            PIL_img.save(output_path, format="WEBP", quality=quality_val, method=6)

        elif orig_format == "PNG":
            if level == "high":
                # Attempt palette quantization for high level if safe
                try:
                    quantized = PIL_img.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
                    quantized.save(output_path, format="PNG", optimize=True, compress_level=9)
                except Exception as q_err:
                    logger.debug(f"PNG Quantization skipped, using lossless PNG optimization: {q_err}")
                    PIL_img.save(output_path, format="PNG", optimize=True, compress_level=9)
            else:
                # Lossless PNG optimization for low/balanced levels
                PIL_img.save(output_path, format="PNG", optimize=True, compress_level=9)

        elif orig_format == "TIFF":
            compress_type = "tiff_lzw" if level != "high" else "jpeg"
            try:
                PIL_img.save(output_path, format="TIFF", compression=compress_type)
            except Exception:
                PIL_img.save(output_path, format="TIFF")

        else:
            # Fallback for BMP / others: save with default format
            PIL_img.save(output_path, format=orig_format)

    # Read verified output size
    compressed_size_bytes = output_path.stat().st_size

    # Guardrail: If compressed size is somehow larger than original, return copy of original
    if compressed_size_bytes >= orig_size_bytes:
        shutil.copy2(input_path, output_path)
        compressed_size_bytes = orig_size_bytes
        logger.info(f"Compressed file was not smaller than original. Retained original file size: {orig_size_bytes} bytes")

    savings_bytes = max(0, orig_size_bytes - compressed_size_bytes)
    savings_percent = round((savings_bytes / orig_size_bytes) * 100, 1) if orig_size_bytes > 0 else 0.0

    stats = {
        "orig_size_bytes": orig_size_bytes,
        "compressed_size_bytes": compressed_size_bytes,
        "savings_bytes": savings_bytes,
        "savings_percent": savings_percent,
        "format": orig_format,
        "dimensions": f"{orig_w}x{orig_h}"
    }

    logger.info(f"Successfully compressed image: {output_path} | Stats: {stats}")
    return output_path, stats


def process_compress_batch_zip(
    items: list[tuple[Path, str, CompressImagesRequestState]]
) -> tuple[Path, dict]:
    """
    Process multiple image files independently with Compression and package into a disk-buffered ZIP archive.
    Captures exact error details per file so the frontend can report failures explicitly to the user.
    Returns (zip_output_path, summary_dict).
    """
    zip_filename = f"compressed_images_{uuid.uuid4().hex[:8]}.zip"
    zip_output_path = DOWNLOADS_DIR / zip_filename

    logger.info(f"Creating compression batch ZIP archive on disk with {len(items)} images: {zip_output_path}")

    processed_count = 0
    failures = []
    successes = []
    total_orig_bytes = 0
    total_compressed_bytes = 0

    with zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for idx, (input_path, orig_name, state) in enumerate(items, start=1):
            try:
                processed_path, stats = process_compress_image(input_path, state)
                stem = Path(orig_name).stem if orig_name else f"image_{idx}"
                ext = processed_path.suffix
                arcname = f"compressed_{idx:02d}_{stem}{ext}"

                zip_file.write(processed_path, arcname=arcname)
                delete_file(processed_path)

                processed_count += 1
                successes.append({
                    "filename": orig_name,
                    "orig_bytes": stats["orig_size_bytes"],
                    "compressed_bytes": stats["compressed_size_bytes"],
                    "savings_percent": stats["savings_percent"]
                })
                total_orig_bytes += stats["orig_size_bytes"]
                total_compressed_bytes += stats["compressed_size_bytes"]

            except Exception as err:
                error_msg = str(err)
                logger.error(f"Error processing item #{idx} ({orig_name}) for compression batch ZIP: {error_msg}", exc_info=True)
                failures.append({
                    "filename": orig_name,
                    "reason": error_msg
                })

    if processed_count == 0:
        delete_file(zip_output_path)
        raise ValueError("Failed to compress any valid images for batch ZIP archive.")

    total_saved_bytes = max(0, total_orig_bytes - total_compressed_bytes)
    total_savings_percent = round((total_saved_bytes / total_orig_bytes) * 100, 1) if total_orig_bytes > 0 else 0.0

    summary = {
        "total": len(items),
        "successful_count": processed_count,
        "failed_count": len(failures),
        "total_orig_bytes": total_orig_bytes,
        "total_compressed_bytes": total_compressed_bytes,
        "total_savings_percent": total_savings_percent,
        "failures": failures,
        "successes": successes
    }

    return zip_output_path, summary
