import logging
import uuid
from pathlib import Path
from PIL import Image, ImageEnhance, ImageDraw, ImageFont

from app.schemas.image_processing_schema import ImageEditorRequestState, TextOverlayState
from app.core.paths import DOWNLOADS_DIR

logger = logging.getLogger(__name__)


def hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    """Convert hex color string to RGB tuple."""
    hex_str = hex_str.lstrip("#")
    if len(hex_str) == 3:
        hex_str = "".join([c * 2 for c in hex_str])
    if len(hex_str) != 6:
        return (255, 255, 255)
    try:
        return (int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16))
    except ValueError:
        return (255, 255, 255)

def apply_sepia_filter(image: Image.Image) -> Image.Image:
    """Apply sepia filter matrix to an image."""
    has_alpha = image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info)
    img_rgb = image.convert("RGB")
    
    width, height = img_rgb.size
    pixels = img_rgb.load()
    
    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]
            tr = int(0.393 * r + 0.769 * g + 0.189 * b)
            tg = int(0.349 * r + 0.686 * g + 0.168 * b)
            tb = int(0.272 * r + 0.534 * g + 0.131 * b)
            pixels[x, y] = (min(255, tr), min(255, tg), min(255, tb))
            
    if has_alpha:
        alpha = image.convert("RGBA").getchannel("A")
        img_rgb = img_rgb.convert("RGBA")
        img_rgb.putalpha(alpha)
        return img_rgb
    return img_rgb

def apply_black_white_filter(image: Image.Image) -> Image.Image:
    """Apply high contrast black & white filter."""
    has_alpha = image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info)
    gray = image.convert("L")
    # Enhance contrast for sharp black and white look
    enhanced = ImageEnhance.Contrast(gray).enhance(2.0)
    
    if has_alpha:
        res = enhanced.convert("RGBA")
        alpha = image.convert("RGBA").getchannel("A")
        res.putalpha(alpha)
        return res
    return enhanced.convert("RGB")

def apply_text_overlay(image: Image.Image, text_state: TextOverlayState) -> Image.Image:
    """Render text overlay on image with font fallback and bold/italic font selection."""
    draw = ImageDraw.Draw(image)
    rgb_color = hex_to_rgb(text_state.color)
    
    # Select candidate font family based on bold & italic flags
    if text_state.is_bold and text_state.is_italic:
        font_candidates = [
            "C:\\Windows\\Fonts\\arialbi.ttf", "C:\\Windows\\Fonts\\calibrii.ttf", 
            "arialbi.ttf", "arialbd.ttf", "arial.ttf"
        ]
    elif text_state.is_bold:
        font_candidates = [
            "C:\\Windows\\Fonts\\arialbd.ttf", "C:\\Windows\\Fonts\\calibrib.ttf", 
            "arialbd.ttf", "arial.ttf"
        ]
    elif text_state.is_italic:
        font_candidates = [
            "C:\\Windows\\Fonts\\ariali.ttf", "C:\\Windows\\Fonts\\calibrii.ttf", 
            "ariali.ttf", "arial.ttf"
        ]
    else:
        font_candidates = [
            "C:\\Windows\\Fonts\\arial.ttf", "C:\\Windows\\Fonts\\calibri.ttf", 
            "C:\\Windows\\Fonts\\segui.ttf", "arial.ttf", "dejavusans.ttf"
        ]

    font = None
    for fname in font_candidates:
        try:
            font = ImageFont.truetype(fname, size=text_state.font_size)
            break
        except Exception:
            continue
            
    if font is None:
        try:
            font = ImageFont.load_default(size=text_state.font_size)
        except Exception:
            font = ImageFont.load_default()

    # Draw text
    draw.text(
        (text_state.x, text_state.y), 
        text_state.text, 
        fill=rgb_color, 
        font=font
    )
    return image


def process_image_editor(input_path: Path, state: ImageEditorRequestState) -> Path:
    """
    Process image using Pillow according to requested editing state.
    Deterministic Pipeline Order:
    1. Load Image
    2. Crop
    3. Resize
    4. Rotate
    5. Flip
    6. Brightness
    7. Contrast
    8. Saturation
    9. Sharpness
    10. Filter
    11. Text
    12. Export
    """
    logger.info(f"Processing image editor request for: {input_path}")
    
    with Image.open(input_path) as img:
        # Retain original format or default to PNG
        orig_format = img.format or "PNG"
        has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
        
        # Convert paletted/L to RGB/RGBA for processing
        if has_alpha:
            image = img.convert("RGBA")
        else:
            image = img.convert("RGB")

        # 2. Crop
        if state.crop:
            w, h = image.size
            left = max(0, min(state.crop.left, w - 1))
            top = max(0, min(state.crop.top, h - 1))
            right = max(left + 1, min(state.crop.right, w))
            bottom = max(top + 1, min(state.crop.bottom, h))
            image = image.crop((left, top, right, bottom))
            logger.debug(f"Cropped image to box: ({left}, {top}, {right}, {bottom})")

        # 3. Resize
        if state.resize:
            target_w = state.resize.width
            target_h = state.resize.height
            if state.resize.keep_aspect_ratio:
                curr_w, curr_h = image.size
                ratio = min(target_w / curr_w, target_h / curr_h)
                target_w = max(1, int(curr_w * ratio))
                target_h = max(1, int(curr_h * ratio))
            image = image.resize((target_w, target_h), Image.Resampling.LANCZOS)
            logger.debug(f"Resized image to: {target_w}x{target_h}")

        # 4. Rotate (Clockwise rotation)
        if state.rotation and state.rotation % 360 != 0:
            # Positive angle in state means clockwise -> PIL rotate uses counter-clockwise
            angle = (360 - (state.rotation % 360)) % 360
            image = image.rotate(angle, expand=True)
            logger.debug(f"Rotated image by {state.rotation} degrees")

        # 5. Flip
        if state.flip_horizontal:
            image = image.transpose(Image.FLIP_LEFT_RIGHT)
        if state.flip_vertical:
            image = image.transpose(Image.FLIP_TOP_BOTTOM)

        # 6. Brightness
        if state.brightness != 1.0:
            image = ImageEnhance.Brightness(image).enhance(state.brightness)

        # 7. Contrast
        if state.contrast != 1.0:
            image = ImageEnhance.Contrast(image).enhance(state.contrast)

        # 8. Saturation
        if state.saturation != 1.0:
            image = ImageEnhance.Color(image).enhance(state.saturation)

        # 9. Sharpness
        if state.sharpness != 1.0:
            image = ImageEnhance.Sharpness(image).enhance(state.sharpness)

        # 10. Filter
        filter_mode = (state.filter or "original").lower()
        if filter_mode == "grayscale":
            image = ImageEnhance.Color(image).enhance(0.0)
        elif filter_mode == "sepia":
            image = apply_sepia_filter(image)
        elif filter_mode == "black_white":
            image = apply_black_white_filter(image)

        # 11. Text Overlay
        if state.text and state.text.text.strip():
            image = apply_text_overlay(image, state.text)

        # 12. Export
        ext = ".png" if has_alpha or orig_format.upper() == "PNG" else ".jpg"
        output_filename = f"edited_{uuid.uuid4()}{ext}"
        output_path = DOWNLOADS_DIR / output_filename


        # Ensure RGBA is converted to RGB if output is JPEG
        if ext == ".jpg" and image.mode == "RGBA":
            bg = Image.new("RGB", image.size, (255, 255, 255))
            bg.paste(image, mask=image.split()[3])
            image = bg

        image.save(output_path, quality=95)
        logger.info(f"Successfully processed edited image: {output_path}")
        return output_path
