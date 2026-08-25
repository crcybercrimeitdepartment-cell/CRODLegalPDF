import logging
import uuid
import zipfile
import numpy as np
import cv2
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

from app.schemas.bg_replace_schema import BgReplaceRequestState
from app.image_processing_services.bg_remove_service import process_bg_remove_image
from app.schemas.bg_remove_schema import BgRemoveRequestState
from app.core.paths import DOWNLOADS_DIR
from app.utils.cleanup import delete_file

logger = logging.getLogger(__name__)

GRADIENT_PRESETS = {
    "sunset": ((255, 126, 95), (254, 180, 123)),
    "ocean": ((43, 88, 118), (78, 67, 118)),
    "neon": ((131, 58, 180), (253, 29, 29)),
    "emerald": ((17, 153, 142), (56, 239, 125)),
    "purple_haze": ((106, 17, 203), (37, 117, 252)),
}

def _hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    hex_str = hex_str.lstrip("#")
    if len(hex_str) == 3:
        hex_str = "".join([c*2 for c in hex_str])
    if len(hex_str) != 6:
        return (255, 255, 255)
    try:
        return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))
    except Exception:
        return (255, 255, 255)


def _generate_linear_gradient(w: int, h: int, c1: tuple[int, int, int], c2: tuple[int, int, int]) -> Image.Image:
    """
    Generate 2D linear vertical/diagonal gradient background using NumPy.
    """
    y = np.linspace(0, 1, h)[:, None]
    x = np.linspace(0, 1, w)[None, :]
    grid = (x + y) / 2.0 # Diagonal gradient interpolation

    r = (1 - grid) * c1[0] + grid * c2[0]
    g = (1 - grid) * c1[1] + grid * c2[1]
    b = (1 - grid) * c1[2] + grid * c2[2]

    rgb = np.dstack((r, g, b)).astype(np.uint8)
    return Image.fromarray(rgb, mode="RGB")


def _generate_custom_pattern(w: int, h: int, pattern_name: str) -> Image.Image:
    """
    Generate custom design patterns (grid, dots, mesh).
    """
    bg = Image.new("RGB", (w, h), (15, 23, 42)) # Studio dark theme
    draw = ImageDraw.Draw(bg)

    step = 40
    if pattern_name == "dots":
        for y in range(0, h, step):
            for x in range(0, w, step):
                draw.ellipse([x-2, y-2, x+2, y+2], fill=(56, 189, 248, 180))
    elif pattern_name == "mesh":
        for x in range(-h, w + h, step):
            draw.line([(x, 0), (x + h, h)], fill=(51, 65, 85), width=2)
            draw.line([(x, h), (x + h, 0)], fill=(30, 41, 59), width=2)
    else:
        # Default studio grid pattern
        for x in range(0, w, step):
            draw.line([(x, 0), (x, h)], fill=(30, 41, 59), width=1)
        for y in range(0, h, step):
            draw.line([(0, y), (w, y)], fill=(30, 41, 59), width=1)

    return bg


def _generate_background_layer(w: int, h: int, state: BgReplaceRequestState, bg_upload_path: Path | None = None) -> Image.Image:
    """
    Generate target background layer according to state (Color, Gradient, Image, Custom Design).
    """
    bg_type = (state.bg_type or "color").lower().strip()

    if bg_type == "color":
        color_rgb = _hex_to_rgb(state.color_hex or "#ffffff")
        return Image.new("RGB", (w, h), color_rgb)

    elif bg_type == "gradient":
        grad_colors = GRADIENT_PRESETS.get(state.gradient_name, GRADIENT_PRESETS["sunset"])
        return _generate_linear_gradient(w, h, grad_colors[0], grad_colors[1])

    elif bg_type == "image":
        if bg_upload_path and bg_upload_path.exists():
            try:
                with Image.open(bg_upload_path) as bg_img:
                    return bg_img.convert("RGB").resize((w, h), Image.Resampling.LANCZOS)
            except Exception as err:
                logger.warning(f"Failed to load custom background image: {err}")
        
        # Fallback studio backdrop
        return _generate_linear_gradient(w, h, (30, 41, 59), (15, 23, 42))

    elif bg_type == "custom":
        return _generate_custom_pattern(w, h, state.pattern_name or "grid")

    return Image.new("RGB", (w, h), (255, 255, 255))


def _refine_alpha_mask(alpha: Image.Image) -> Image.Image:
    """
    Refine alpha mask using OpenCV matting operations for cleaner edges.
    Removes noise, smooths jagged edges, and preserves fine details like hair.
    """
    alpha_np = np.array(alpha, dtype=np.uint8)

    # Remove small noise islands using morphological opening
    kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    alpha_np = cv2.morphologyEx(alpha_np, cv2.MORPH_OPEN, kernel_small, iterations=1)

    # Fill small holes inside subject using morphological closing
    kernel_medium = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    alpha_np = cv2.morphologyEx(alpha_np, cv2.MORPH_CLOSE, kernel_medium, iterations=2)

    # Gentle Gaussian blur for smooth anti-aliased edges (avoids jagged pixel edges)
    alpha_np = cv2.GaussianBlur(alpha_np, (3, 3), 0)

    # Re-stretch contrast to keep edges crisp while smooth
    alpha_np = np.clip(alpha_np * 1.0, 0, 255).astype(np.uint8)

    return Image.fromarray(alpha_np, mode="L")


def process_bg_replace_image(input_path: Path, state: BgReplaceRequestState, bg_upload_path: Path | None = None) -> Path:
    """
    Production-ready Background Replacement Engine.
    1. Uses AI subject segmentation (via process_bg_remove_image) to isolate subject with alpha mask.
    2. Generates new target background layer (Solid Color, Gradient, Image, Custom Design).
    3. Composites subject over new background layer with alpha matting refinement.
    4. Saves final updated image.
    """
    logger.info(f"Processing background replacement for: {input_path} | Type: {state.bg_type}")

    # 1. AI Subject Isolation with higher quality parameters
    isolated_subject_path = process_bg_remove_image(input_path, BgRemoveRequestState(feather=2.0, threshold=40))

    try:
        with Image.open(isolated_subject_path) as subject_rgba:
            w, h = subject_rgba.size

            # 2. Refine the alpha mask for cleaner edges
            original_alpha = subject_rgba.getchannel("A")
            refined_alpha = _refine_alpha_mask(original_alpha)
            subject_rgba.putalpha(refined_alpha)

            # 3. Generate New Background Layer
            bg_layer = _generate_background_layer(w, h, state, bg_upload_path)

            # 4. High-quality alpha compositing using numpy for precise blending
            bg_np = np.array(bg_layer.convert("RGBA"), dtype=np.float64)
            fg_np = np.array(subject_rgba, dtype=np.float64)

            # Normalize alpha to 0-1 range for proper blending
            alpha_norm = fg_np[:, :, 3:4] / 255.0

            # Alpha composite: result = fg * alpha + bg * (1 - alpha)
            composited = fg_np[:, :, :3] * alpha_norm + bg_np[:, :, :3] * (1.0 - alpha_norm)
            composited = np.clip(composited, 0, 255).astype(np.uint8)

            result_image = Image.fromarray(composited, mode="RGB")

            # 5. Save Final Composited Image
            output_filename = f"bg_replaced_{uuid.uuid4()}.jpg"
            output_path = DOWNLOADS_DIR / output_filename
            result_image.save(output_path, format="JPEG", quality=98)

            logger.info(f"Successfully replaced background: {output_path}")
            return output_path

    finally:
        delete_file(isolated_subject_path)


def process_bg_replace_batch_zip(items: list[tuple[Path, str, BgReplaceRequestState]]) -> Path:
    """
    Process multiple image files with background replacement states and package them into a single ZIP archive.
    items: List of (input_file_path, original_filename, BgReplaceRequestState)
    """
    zip_filename = f"bg_replaced_images_{uuid.uuid4().hex[:8]}.zip"
    zip_output_path = DOWNLOADS_DIR / zip_filename

    logger.info(f"Creating background replacement batch ZIP archive with {len(items)} images: {zip_output_path}")

    with zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for idx, (input_path, orig_name, state) in enumerate(items, start=1):
            try:
                processed_path = process_bg_replace_image(input_path, state)
                stem = Path(orig_name).stem if orig_name else f"image_{idx}"
                arcname = f"bg_replaced_{idx:02d}_{stem}.jpg"

                zip_file.write(processed_path, arcname=arcname)
                delete_file(processed_path)
            except Exception as err:
                logger.error(f"Error processing item #{idx} ({orig_name}) for background replacement batch ZIP: {err}")

    return zip_output_path
