import logging
import uuid
import zipfile
from pathlib import Path
from PIL import Image

from app.schemas.convert_schema import ConvertRequestState
from app.core.paths import DOWNLOADS_DIR
from app.utils.cleanup import delete_file

logger = logging.getLogger(__name__)

FORMAT_MAP = {
    "jpg": {"pil_fmt": "JPEG", "ext": ".jpg", "supports_alpha": False, "mime": "image/jpeg"},
    "jpeg": {"pil_fmt": "JPEG", "ext": ".jpg", "supports_alpha": False, "mime": "image/jpeg"},
    "png": {"pil_fmt": "PNG", "ext": ".png", "supports_alpha": True, "mime": "image/png"},
    "webp": {"pil_fmt": "WEBP", "ext": ".webp", "supports_alpha": True, "mime": "image/webp"},
    "bmp": {"pil_fmt": "BMP", "ext": ".bmp", "supports_alpha": False, "mime": "image/bmp"},
    "tiff": {"pil_fmt": "TIFF", "ext": ".tiff", "supports_alpha": True, "mime": "image/tiff"},
    "gif": {"pil_fmt": "GIF", "ext": ".gif", "supports_alpha": True, "mime": "image/gif"},
}

def _apply_format_conversion_logic(img: Image.Image, state: ConvertRequestState, fmt_info: dict) -> Image.Image:
    """
    Core conversion logic handler for Pillow Image.
    """
    has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)

    if fmt_info["supports_alpha"]:
        # Target format supports transparency (PNG, WEBP, TIFF, GIF)
        if has_alpha and state.preserve_alpha:
            try:
                return img.convert("RGBA")
            except Exception as err:
                logger.warning(f"Alpha conversion fallback to RGB: {err}")
                return img.convert("RGB")
        else:
            return img.convert("RGB")
    else:
        # Target format does NOT support transparency (JPG, BMP)
        if has_alpha:
            # Sirf transparent input image ko white background par blend karte hain
            try:
                rgba_img = img.convert("RGBA")
                bg = Image.new("RGB", rgba_img.size, (255, 255, 255))
                bg.paste(rgba_img, mask=rgba_img.split()[3])
                return bg
            except Exception as err:
                logger.warning(f"White background blend fallback: {err}")
                return img.convert("RGB")
        else:
            # Normal RGB image ko directly convert karte hain without extra blending
            return img.convert("RGB")


def process_convert_image(input_path: Path, state: ConvertRequestState) -> Path:
    """
    Production-ready Image Format Conversion Engine using Pillow.
    Converts uploaded image to requested target format (JPG, PNG, WEBP, BMP, TIFF, GIF).
    Returns path to converted output file for download.
    """
    target_key = (state.target_format or "png").lower().strip()
    fmt_info = FORMAT_MAP.get(target_key, FORMAT_MAP["png"])

    logger.info(f"Processing format conversion for: {input_path} -> Target: {fmt_info['pil_fmt']} (Quality: {state.quality})")

    with Image.open(input_path) as img:
        result_img = _apply_format_conversion_logic(img, state, fmt_info)

        output_filename = f"converted_{uuid.uuid4()}{fmt_info['ext']}"
        output_path = DOWNLOADS_DIR / output_filename

        save_kwargs = {}
        if fmt_info["pil_fmt"] in ("JPEG", "WEBP"):
            save_kwargs["quality"] = max(1, min(100, state.quality))

        result_img.save(output_path, format=fmt_info["pil_fmt"], **save_kwargs)
        logger.info(f"Successfully converted image to {fmt_info['pil_fmt']}: {output_path}")
        return output_path


def process_convert_preview_image(input_path: Path, state: ConvertRequestState) -> Path:
    """
    Generate web-compatible PNG image preview representing the converted result.
    Applies target format transparency & white-background blending rules, but saves output as PNG for HTML browser rendering.
    """
    target_key = (state.target_format or "png").lower().strip()
    fmt_info = FORMAT_MAP.get(target_key, FORMAT_MAP["png"])

    with Image.open(input_path) as img:
        result_img = _apply_format_conversion_logic(img, state, fmt_info)

        output_filename = f"preview_{uuid.uuid4()}.png"
        preview_path = DOWNLOADS_DIR / output_filename
        result_img.save(preview_path, format="PNG")
        return preview_path


def process_convert_batch_zip(items: list[tuple[Path, str, ConvertRequestState]]) -> Path:
    """
    Process multiple image files with target format states and package them into a single ZIP archive.
    items: List of (input_file_path, original_filename, ConvertRequestState)
    """
    zip_filename = f"converted_images_{uuid.uuid4().hex[:8]}.zip"
    zip_output_path = DOWNLOADS_DIR / zip_filename

    logger.info(f"Creating convert batch ZIP archive with {len(items)} images: {zip_output_path}")

    with zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for idx, (input_path, orig_name, state) in enumerate(items, start=1):
            try:
                processed_path = process_convert_image(input_path, state)
                stem = Path(orig_name).stem if orig_name else f"image_{idx}"
                ext = processed_path.suffix
                arcname = f"converted_{idx:02d}_{stem}{ext}"

                zip_file.write(processed_path, arcname=arcname)
                delete_file(processed_path)
            except Exception as err:
                logger.error(f"Error processing item #{idx} ({orig_name}) for convert batch ZIP: {err}")

    return zip_output_path
