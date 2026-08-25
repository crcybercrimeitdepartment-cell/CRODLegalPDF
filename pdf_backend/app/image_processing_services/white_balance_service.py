import logging
import uuid
import zipfile
import numpy as np
import cv2
from pathlib import Path
from PIL import Image

from app.schemas.white_balance_schema import WhiteBalanceRequestState
from app.core.paths import DOWNLOADS_DIR
from app.utils.cleanup import delete_file

logger = logging.getLogger(__name__)


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


def _apply_manual_temperature_tint(img_bgr: np.ndarray, temp: int, tint: int) -> np.ndarray:
    """
    Apply manual Temperature (-100 Cool to +100 Warm) and Tint (-100 Green to +100 Magenta).
    """
    temp_factor = max(-100, min(100, temp)) / 100.0
    tint_factor = max(-100, min(100, tint)) / 100.0

    # Base gains
    r_gain = 1.0
    g_gain = 1.0
    b_gain = 1.0

    # 1. Temperature Adjustment (Cool Blue vs Warm Amber)
    if temp_factor > 0: # Warm (Increase Red, decrease Blue)
        r_gain += temp_factor * 0.35
        b_gain -= temp_factor * 0.25
    elif temp_factor < 0: # Cool (Increase Blue, decrease Red)
        b_gain += abs(temp_factor) * 0.35
        r_gain -= abs(temp_factor) * 0.25

    # 2. Tint Adjustment (Green vs Magenta)
    if tint_factor > 0: # Magenta (Decrease Green, slight Red/Blue boost)
        g_gain -= tint_factor * 0.25
        r_gain *= (1.0 + tint_factor * 0.12)
        b_gain *= (1.0 + tint_factor * 0.12)
    elif tint_factor < 0: # Green (Increase Green)
        g_gain += abs(tint_factor) * 0.30

    res = np.zeros_like(img_bgr, dtype=np.float32)
    res[:, :, 0] = np.clip(img_bgr[:, :, 0] * b_gain, 0, 255)
    res[:, :, 1] = np.clip(img_bgr[:, :, 1] * g_gain, 0, 255)
    res[:, :, 2] = np.clip(img_bgr[:, :, 2] * r_gain, 0, 255)

    return res.astype(np.uint8)


def process_white_balance_image(input_path: Path, state: WhiteBalanceRequestState) -> Path:
    """
    Production-ready White Balance Engine using OpenCV & Pillow.
    Automatically preserves alpha channel transparency without any user toggle.
    """
    logger.info(f"Processing White Balance for: {input_path} | Mode: {state.mode} | Temp: {state.temperature} | Tint: {state.tint}")

    # Step 1: Open with PIL & Automatically Extract Alpha Transparency if present
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

    # Step 3: Execute White Balance Processing
    if (state.mode or "").lower() == "auto":
        processed_bgr = _apply_gray_world_awb(img_bgr)
    else:
        processed_bgr = _apply_manual_temperature_tint(img_bgr, state.temperature, state.tint)

    # Step 4: Convert back to PIL Image & Automatically Re-attach Alpha Channel
    processed_rgb = cv2.cvtColor(processed_bgr, cv2.COLOR_BGR2RGB)
    result_pil = Image.fromarray(processed_rgb)

    if has_alpha and alpha_channel:
        result_pil = result_pil.convert("RGBA")
        result_pil.putalpha(alpha_channel)

    # Step 5: Export Output Image
    ext = ".png" if has_alpha or orig_format.upper() == "PNG" else ".jpg"
    output_filename = f"white_balanced_{uuid.uuid4()}{ext}"
    output_path = DOWNLOADS_DIR / output_filename

    if ext == ".jpg" and result_pil.mode == "RGBA":
        bg = Image.new("RGB", result_pil.size, (255, 255, 255))
        bg.paste(result_pil, mask=result_pil.split()[3])
        result_pil = bg

    result_pil.save(output_path, quality=98)
    logger.info(f"Successfully processed white balanced image: {output_path}")

    return output_path


def process_white_balance_batch_zip(
    items: list[tuple[Path, str, WhiteBalanceRequestState]]
) -> tuple[Path, dict]:
    """
    Process multiple image files independently with White Balance Adjustment and package into a ZIP archive.
    Captures exact error details per file so the frontend can report failures explicitly to the user.
    Returns (zip_output_path, summary_dict).
    """
    zip_filename = f"white_balanced_images_{uuid.uuid4().hex[:8]}.zip"
    zip_output_path = DOWNLOADS_DIR / zip_filename

    logger.info(f"Creating white balance batch ZIP archive with {len(items)} images: {zip_output_path}")

    processed_count = 0
    failures = []
    successes = []

    with zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for idx, (input_path, orig_name, state) in enumerate(items, start=1):
            try:
                processed_path = process_white_balance_image(input_path, state)
                stem = Path(orig_name).stem if orig_name else f"image_{idx}"
                ext = processed_path.suffix
                arcname = f"white_balanced_{idx:02d}_{stem}{ext}"

                zip_file.write(processed_path, arcname=arcname)
                delete_file(processed_path)
                processed_count += 1
                successes.append(orig_name)
            except Exception as err:
                error_msg = str(err)
                logger.error(f"Error processing item #{idx} ({orig_name}) for white balance batch ZIP: {error_msg}", exc_info=True)
                failures.append({
                    "filename": orig_name,
                    "reason": error_msg
                })

    if processed_count == 0:
        delete_file(zip_output_path)
        raise ValueError("Failed to process any valid images for batch ZIP archive.")

    summary = {
        "total": len(items),
        "successful_count": processed_count,
        "failed_count": len(failures),
        "failures": failures,
        "successes": successes
    }

    return zip_output_path, summary
