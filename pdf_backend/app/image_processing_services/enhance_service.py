import logging
import uuid
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance, ImageFilter

from app.schemas.enhance_schema import EnhanceRequestState
from app.core.paths import DOWNLOADS_DIR

logger = logging.getLogger(__name__)

def process_enhance_image(input_path: Path, state: EnhanceRequestState) -> Path:
    """
    Production-ready Python AI Image Enhancement Engine.
    Multi-stage optimization for clarity, color balance, sharpening, and noise reduction.
    Strictly scoped to Image Enhancement.
    """
    logger.info(f"Processing enhance request for: {input_path} | Level: {state.enhancement_level}")
    
    with Image.open(input_path) as img:
        orig_format = img.format or "PNG"
        has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
        
        # Save alpha channel if transparent
        alpha_channel = None
        if has_alpha:
            alpha_channel = img.convert("RGBA").getchannel("A")
            image = img.convert("RGB")
        else:
            image = img.convert("RGB")

        level = (state.enhancement_level or "medium").lower()

        # Configure level-based scaling factors
        if level == "low":
            contrast_factor = 1.15
            color_factor = 1.15
            sharp_percent = 120
            sharp_radius = 1.5
            autocontrast_cutoff = 0.2
        elif level == "high":
            contrast_factor = 1.45
            color_factor = 1.35
            sharp_percent = 220
            sharp_radius = 2.2
            autocontrast_cutoff = 0.8
        elif level == "ultra":
            contrast_factor = 1.65
            color_factor = 1.45
            sharp_percent = 300
            sharp_radius = 2.8
            autocontrast_cutoff = 1.2
        else: # medium (default)
            contrast_factor = 1.30
            color_factor = 1.25
            sharp_percent = 170
            sharp_radius = 1.8
            autocontrast_cutoff = 0.5

        # 1. Auto-Contrast & Dynamic Range Expansion
        try:
            image = ImageOps.autocontrast(image, cutoff=autocontrast_cutoff)
            logger.debug(f"Applied Auto-Contrast (cutoff={autocontrast_cutoff})")
        except Exception as err:
            logger.warning(f"Auto-contrast skip: {err}")

        # 2. Color Balance & Vibrance Enhancement
        if state.auto_color_balance:
            image = ImageEnhance.Color(image).enhance(color_factor)
            logger.debug(f"Applied Color Vibrance (factor={color_factor})")

        # 3. Dynamic Contrast Tuning
        image = ImageEnhance.Contrast(image).enhance(contrast_factor)

        # 4. Smart Detail Sharpening (UnsharpMask for blurry photos & scanned text)
        image = image.filter(
            ImageFilter.UnsharpMask(radius=sharp_radius, percent=sharp_percent, threshold=3)
        )
        image = image.filter(ImageFilter.DETAIL)
        logger.debug(f"Applied UnsharpMask Sharpening (radius={sharp_radius}, percent={sharp_percent}%)")

        # 5. Denoising & Smooth Noise Reduction
        if state.denoise:
            # Blend smooth filter for subtle noise reduction while preserving edges
            smoothed = image.filter(ImageFilter.SMOOTH_MORE)
            image = Image.blend(image, smoothed, alpha=0.15)
            logger.debug("Applied Denoise Smoothing")

        # Re-attach alpha channel if originally RGBA
        if has_alpha and alpha_channel:
            image = image.convert("RGBA")
            image.putalpha(alpha_channel)

        # Export optimized image
        ext = ".png" if has_alpha or orig_format.upper() == "PNG" else ".jpg"
        output_filename = f"enhanced_{uuid.uuid4()}{ext}"
        output_path = DOWNLOADS_DIR / output_filename

        # Convert RGBA to RGB for JPEG output
        if ext == ".jpg" and image.mode == "RGBA":
            bg = Image.new("RGB", image.size, (255, 255, 255))
            bg.paste(image, mask=image.split()[3])
            image = bg

        image.save(output_path, quality=98)
        logger.info(f"Successfully processed enhanced image: {output_path}")
        return output_path


def process_enhance_batch_zip(items: list[tuple[Path, str, EnhanceRequestState]]) -> Path:
    """
    Process multiple image files with enhancement states and package them into a single ZIP archive.
    items: List of (input_file_path, original_filename, EnhanceRequestState)
    """
    import zipfile
    from app.utils.cleanup import delete_file

    zip_filename = f"enhanced_images_{uuid.uuid4().hex[:8]}.zip"
    zip_output_path = DOWNLOADS_DIR / zip_filename

    logger.info(f"Creating enhance batch ZIP archive with {len(items)} images: {zip_output_path}")

    with zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for idx, (input_path, orig_name, state) in enumerate(items, start=1):
            try:
                processed_path = process_enhance_image(input_path, state)
                stem = Path(orig_name).stem if orig_name else f"image_{idx}"
                ext = processed_path.suffix
                arcname = f"enhanced_{idx:02d}_{stem}{ext}"

                zip_file.write(processed_path, arcname=arcname)
                delete_file(processed_path)
            except Exception as err:
                logger.error(f"Error processing item #{idx} ({orig_name}) for enhance batch ZIP: {err}")

    return zip_output_path
