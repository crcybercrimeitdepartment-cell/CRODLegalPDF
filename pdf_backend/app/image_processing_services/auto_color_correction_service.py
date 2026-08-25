import logging
import uuid
import zipfile
import numpy as np
import cv2
from pathlib import Path
from PIL import Image

from app.schemas.auto_color_correction_schema import AutoColorCorrectionRequestState, ColorAnalysisMetrics
from app.core.paths import DOWNLOADS_DIR
from app.utils.cleanup import delete_file

logger = logging.getLogger(__name__)


def _analyze_color_characteristics(img_bgr: np.ndarray) -> ColorAnalysisMetrics:
    """
    Analyze image color channels, color cast, lightness distribution, and dynamic range.
    """
    b_mean, g_mean, r_mean = np.mean(img_bgr[:, :, 0]), np.mean(img_bgr[:, :, 1]), np.mean(img_bgr[:, :, 2])
    
    # Color Cast Analysis
    if r_mean > g_mean + 10 and r_mean > b_mean + 10:
        cast_type = "Warm (Red/Yellow) Cast"
    elif b_mean > r_mean + 10 and b_mean > g_mean + 10:
        cast_type = "Cool (Blueish) Cast"
    elif g_mean > r_mean + 12 and g_mean > b_mean + 12:
        cast_type = "Greenish Tint"
    elif max(r_mean, g_mean, b_mean) - min(r_mean, g_mean, b_mean) < 8:
        cast_type = "Neutral (Balanced)"
    else:
        cast_type = "Slight Color Shift"

    # Convert to LAB for Lightness & Contrast Analysis
    img_lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l_channel = img_lab[:, :, 0]
    l_mean = np.mean(l_channel)
    l_std = np.std(l_channel)

    if l_mean < 85:
        brightness_status = "Underexposed (Shadows Boosted)"
    elif l_mean > 195:
        brightness_status = "High Exposure (Tones Balanced)"
    else:
        brightness_status = "Optimal Exposure"

    if l_std < 35:
        contrast_status = "Flat (Dynamic Range Expanded)"
    else:
        contrast_status = "Optimal Range"

    return ColorAnalysisMetrics(
        color_cast_detected=cast_type,
        white_balance_status="Calibrated (Gray World)",
        brightness_level=brightness_status,
        contrast_range=contrast_status
    )


def _apply_gray_world_awb(img_bgr: np.ndarray) -> np.ndarray:
    """
    Execute Gray World Auto White Balance to neutralize color casts automatically.
    """
    b_mean = np.mean(img_bgr[:, :, 0])
    g_mean = np.mean(img_bgr[:, :, 1])
    r_mean = np.mean(img_bgr[:, :, 2])

    gray_mean = (b_mean + g_mean + r_mean) / 3.0

    scale_b = gray_mean / (b_mean + 1e-5)
    scale_g = gray_mean / (g_mean + 1e-5)
    scale_r = gray_mean / (r_mean + 1e-5)

    res = np.zeros_like(img_bgr, dtype=np.float32)
    res[:, :, 0] = np.clip(img_bgr[:, :, 0] * scale_b, 0, 255)
    res[:, :, 1] = np.clip(img_bgr[:, :, 1] * scale_g, 0, 255)
    res[:, :, 2] = np.clip(img_bgr[:, :, 2] * scale_r, 0, 255)

    return res.astype(np.uint8)


def _apply_percentile_level_stretching(img_bgr: np.ndarray) -> np.ndarray:
    """
    Per-channel 0.5% - 99.5% percentile histogram level stretching.
    """
    result = np.zeros_like(img_bgr)
    for c in range(3):
        channel = img_bgr[:, :, c]
        p_low, p_high = np.percentile(channel, (0.5, 99.5))
        if p_high > p_low:
            stretched = (channel - p_low) * (255.0 / (p_high - p_low))
            result[:, :, c] = np.clip(stretched, 0, 255).astype(np.uint8)
        else:
            result[:, :, c] = channel
    return result


def _apply_lab_clahe(img_bgr: np.ndarray) -> np.ndarray:
    """
    Apply Contrast Limited Adaptive Histogram Equalization on CIELAB Lightness channel.
    """
    img_lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(img_lab)

    clahe = cv2.createCLAHE(clipLimit=1.8, tileGridSize=(8, 8))
    cl = clahe.apply(l)

    # Blend original lightness with CLAHE for natural appearance
    l_blended = cv2.addWeighted(l, 0.4, cl, 0.6, 0)

    limg = cv2.merge((l_blended, a, b))
    return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)


def process_auto_color_correction_image(
    input_path: Path, 
    state: AutoColorCorrectionRequestState = AutoColorCorrectionRequestState()
) -> tuple[Path, ColorAnalysisMetrics]:
    """
    Production-ready Auto Color Correction Engine.
    Executes Gray World White Balance, Multi-channel Percentile Level Stretching, and LAB CLAHE.
    Preserves RGBA transparency channel if present.
    """
    logger.info(f"Processing Auto Color Correction for: {input_path}")

    # Step 1: Open with PIL to handle alpha channel and format detection safely
    with Image.open(input_path) as PIL_img:
        orig_format = PIL_img.format or "PNG"
        has_alpha = PIL_img.mode in ("RGBA", "LA") or (PIL_img.mode == "P" and "transparency" in PIL_img.info)
        
        alpha_channel = None
        if has_alpha:
            alpha_channel = PIL_img.convert("RGBA").getchannel("A")
            rgb_pil = PIL_img.convert("RGB")
        else:
            rgb_pil = PIL_img.convert("RGB")

    # Step 2: Convert to OpenCV BGR numpy array
    rgb_np = np.array(rgb_pil)
    img_bgr = cv2.cvtColor(rgb_np, cv2.COLOR_RGB2BGR)

    # Step 3: Analyze Image Color Characteristics
    metrics = _analyze_color_characteristics(img_bgr)
    logger.info(f"Color Analysis: {metrics}")

    # Step 4: Execute Auto Color Correction Pipeline
    # 4a. Gray World Auto White Balance
    awb_bgr = _apply_gray_world_awb(img_bgr)
    
    # 4b. Multi-channel Percentile Histogram Level Stretching
    stretched_bgr = _apply_percentile_level_stretching(awb_bgr)

    # 4c. LAB CLAHE Lightness Adjustment
    final_bgr = _apply_lab_clahe(stretched_bgr)

    # Step 5: Convert back to PIL Image & Re-attach Alpha if applicable
    final_rgb = cv2.cvtColor(final_bgr, cv2.COLOR_BGR2RGB)
    corrected_pil = Image.fromarray(final_rgb)

    if has_alpha and alpha_channel and state.preserve_alpha:
        corrected_pil = corrected_pil.convert("RGBA")
        corrected_pil.putalpha(alpha_channel)

    # Step 6: Export Output Image
    ext = ".png" if (has_alpha and state.preserve_alpha) or orig_format.upper() == "PNG" else ".jpg"
    output_filename = f"auto_color_corrected_{uuid.uuid4()}{ext}"
    output_path = DOWNLOADS_DIR / output_filename

    if ext == ".jpg" and corrected_pil.mode == "RGBA":
        bg = Image.new("RGB", corrected_pil.size, (255, 255, 255))
        bg.paste(corrected_pil, mask=corrected_pil.split()[3])
        corrected_pil = bg

    corrected_pil.save(output_path, quality=98)
    logger.info(f"Successfully saved auto color corrected image: {output_path}")

    return output_path, metrics


def process_auto_color_correction_batch_zip(
    items: list[tuple[Path, str, AutoColorCorrectionRequestState]]
) -> Path:
    """
    Process multiple image files independently with Auto Color Correction and package into a ZIP archive.
    Handles individual file failures gracefully without breaking the batch.
    items: List of (input_file_path, original_filename, AutoColorCorrectionRequestState)
    """
    zip_filename = f"auto_color_corrected_images_{uuid.uuid4().hex[:8]}.zip"
    zip_output_path = DOWNLOADS_DIR / zip_filename

    logger.info(f"Creating auto color correction batch ZIP archive with {len(items)} images: {zip_output_path}")

    processed_count = 0
    with zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for idx, (input_path, orig_name, state) in enumerate(items, start=1):
            try:
                processed_path, _ = process_auto_color_correction_image(input_path, state)
                stem = Path(orig_name).stem if orig_name else f"image_{idx}"
                ext = processed_path.suffix
                arcname = f"auto_color_corrected_{idx:02d}_{stem}{ext}"

                zip_file.write(processed_path, arcname=arcname)
                delete_file(processed_path)
                processed_count += 1
            except Exception as err:
                logger.error(f"Error processing item #{idx} ({orig_name}) for auto color correction batch ZIP: {err}", exc_info=True)

    if processed_count == 0:
        delete_file(zip_output_path)
        raise ValueError("Failed to process any valid images for batch ZIP archive.")

    return zip_output_path
