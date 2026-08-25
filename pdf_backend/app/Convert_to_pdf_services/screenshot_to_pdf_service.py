"""
Screenshot to PDF conversion service.
Supports auto-crop (perspective detection/deskewing) and scan enhancement.
"""

from __future__ import annotations

import io
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Tuple, Optional

import numpy as np
import cv2
from PIL import Image, ImageEnhance, ImageFilter
from pypdf import PdfWriter, PdfReader

from app.core.paths import Paths
from app.Convert_to_pdf_services.jpg_to_pdf_service import (
    _sanitize_filename,
    _resolve_page_size,
    _resolve_margins,
    _fit_image,
    _quality_to_jpeg_q,
    _apply_exif_orientation,
    _to_rgb
)

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"}

def _order_points(pts: np.ndarray) -> np.ndarray:
    """Order coordinates: top-left, top-right, bottom-right, bottom-left."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def _four_point_transform(image: np.ndarray, pts: np.ndarray) -> np.ndarray:
    """Apply perspective transform to crop and flatten a document."""
    rect = _order_points(pts)
    (tl, tr, br, bl) = rect

    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))

    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))

    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    return warped

def _auto_crop(pil_img: Image.Image) -> Image.Image:
    """
    Detect document boundary and crop/deskew.
    Returns original image if no confident document boundary is found.
    """
    # Convert PIL Image to OpenCV format (BGR)
    open_cv_image = np.array(pil_img)
    # Convert RGB to BGR
    if len(open_cv_image.shape) == 3 and open_cv_image.shape[2] == 3:
        image = open_cv_image[:, :, ::-1].copy()
    elif len(open_cv_image.shape) == 3 and open_cv_image.shape[2] == 4:
        image = cv2.cvtColor(open_cv_image, cv2.COLOR_RGBA2BGR)
    else:
        if len(open_cv_image.shape) == 2:
            image = cv2.cvtColor(open_cv_image, cv2.COLOR_GRAY2BGR)
        else:
            image = open_cv_image.copy()

    orig = image.copy()
    
    # Resize for faster edge detection
    ratio = image.shape[0] / 500.0
    
    if ratio > 1:
        image = cv2.resize(image, (int(image.shape[1] / ratio), 500))
    else:
        ratio = 1.0

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(gray, 75, 200)

    cnts = cv2.findContours(edged.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    cnts = cnts[0] if len(cnts) == 2 else cnts[1]
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:5]

    screenCnt = None
    min_area = 0.1 * (image.shape[0] * image.shape[1])
    
    for c in cnts:
        area = cv2.contourArea(c)
        if area < min_area:
            continue
            
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)

        if len(approx) == 4:
            screenCnt = approx
            break

    if screenCnt is None:
        return pil_img # Fallback to original

    warped = _four_point_transform(orig, screenCnt.reshape(4, 2) * ratio)
    warped_rgb = cv2.cvtColor(warped, cv2.COLOR_BGR2RGB)
    return Image.fromarray(warped_rgb)


def _enhance_scan(pil_img: Image.Image, mode: str) -> Image.Image:
    """Apply enhancements based on scan mode."""
    if mode == "original":
        return pil_img
        
    if mode == "document":
        img = pil_img.convert("L")
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.0)
        enhancer_bright = ImageEnhance.Brightness(img)
        img = enhancer_bright.enhance(1.1)
        img = img.filter(ImageFilter.SHARPEN)
        return img.convert("RGB")
        
    if mode == "auto":
        img = pil_img.convert("RGB")
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.2)
        enhancer_sharp = ImageEnhance.Sharpness(img)
        img = enhancer_sharp.enhance(1.5)
        return img


class ScreenshotToPdfService:
    def validate_image_file(self, file_path: Path) -> None:
        if not file_path.exists():
            raise ValueError(f"File not found: {file_path.name}")
        ext = file_path.suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"File '{file_path.name}' is not a supported image type.")
        if file_path.stat().st_size > 50 * 1024 * 1024:
            raise ValueError(f"File '{file_path.name}' exceeds the 50MB limit.")

    async def process(
        self,
        upload_dir: Path,
        filenames: List[str],
        page_size: str,
        orientation: str,
        fit_mode: str,
        margin_preset: str,
        custom_margin_top: str,
        custom_margin_right: str,
        custom_margin_bottom: str,
        custom_margin_left: str,
        custom_page_width: str,
        custom_page_height: str,
        custom_page_unit: str,
        dpi: int,
        quality: str,
        bg_color_hex: str,
        auto_crop: bool,
        scan_mode: str,
        rotations: Dict[str, int]
    ) -> Path:
        out_pdf_path = upload_dir / "output.pdf"
        pdf_writer = PdfWriter()

        margins = _resolve_margins(
            margin_preset, custom_margin_top, custom_margin_right,
            custom_margin_bottom, custom_margin_left
        )
        mt, mr, mb, ml = margins
        jpeg_q = _quality_to_jpeg_q(quality)
        bg_color = (255, 255, 255)
        if bg_color_hex and len(bg_color_hex) == 7:
            try:
                bg_color = (
                    int(bg_color_hex[1:3], 16),
                    int(bg_color_hex[3:5], 16),
                    int(bg_color_hex[5:7], 16)
                )
            except ValueError:
                pass

        for fn in filenames:
            file_path = upload_dir / fn
            self.validate_image_file(file_path)

            try:
                img = Image.open(file_path)
                img = _apply_exif_orientation(img)
                
                rot = rotations.get(fn, 0) % 360
                if rot != 0:
                    img = img.rotate(-rot, expand=True)

                if auto_crop:
                    img = _auto_crop(img)
                
                if scan_mode in ("auto", "document"):
                    img = _enhance_scan(img, scan_mode)

                img = _to_rgb(img, bg_color)

                w_px, h_px = img.size
                w_pt, h_pt = _resolve_page_size(
                    page_size, orientation,
                    custom_page_width, custom_page_height, custom_page_unit,
                    w_px, h_px, dpi
                )

                safe_w = max(1.0, w_pt - ml - mr)
                safe_h = max(1.0, h_pt - mt - mb)

                x, y, draw_w, draw_h = _fit_image(w_px, h_px, safe_w, safe_h, fit_mode)

                canvas = Image.new("RGB", (int(w_pt * dpi / 72.0), int(h_pt * dpi / 72.0)), bg_color)
                
                draw_w_px = int(draw_w * dpi / 72.0)
                draw_h_px = int(draw_h * dpi / 72.0)
                
                resized_img = img.resize((draw_w_px, draw_h_px), Image.Resampling.LANCZOS)
                
                x_px = int((ml + x) * dpi / 72.0)
                y_px = int((mt + y) * dpi / 72.0)
                
                canvas.paste(resized_img, (x_px, y_px))
                
                page_io = io.BytesIO()
                canvas.save(page_io, format="PDF", resolution=dpi, quality=jpeg_q)
                page_io.seek(0)
                
                single_page_reader = PdfReader(page_io)
                pdf_writer.add_page(single_page_reader.pages[0])
                
            except Exception as e:
                logger.error(f"Error processing image {fn}: {str(e)}")
                raise ValueError(f"Failed to process {fn}. Ensure it's a valid image.")

        if len(pdf_writer.pages) == 0:
            raise ValueError("No valid pages were generated.")

        with open(out_pdf_path, "wb") as f:
            pdf_writer.write(f)

        return out_pdf_path

screenshot_to_pdf_service = ScreenshotToPdfService()
