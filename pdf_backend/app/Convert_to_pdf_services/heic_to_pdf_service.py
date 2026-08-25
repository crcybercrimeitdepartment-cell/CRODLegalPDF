"""
HEIC to PDF conversion service.

Uses Pillow with the pillow-heif plugin for image handling and PyMuPDF (fitz)
or pypdf for PDF assembly.
"""

from __future__ import annotations

import io
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

import pillow_heif
from PIL import Image

# Register pillow-heif to allow Image.open() to open HEIC files natively
pillow_heif.register_heif_opener()

from pypdf import PdfWriter
import fitz  # PyMuPDF for drawing/metadata if needed, or we can use Pillow's PDF export

from app.core.paths import Paths

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Standard page sizes in points (1 pt = 1/72 inch)
PAGE_SIZES_PT: Dict[str, Tuple[float, float]] = {
    "a4":     (595.28, 841.89),
    "a3":     (841.89, 1190.55),
    "a5":     (419.53, 595.28),
    "letter": (612.00, 792.00),
    "legal":  (612.00, 1008.00),
}

# Margin presets in points
MARGIN_PRESETS: Dict[str, float] = {
    "none":   0.0,
    "small":  14.17,   # ~5 mm
    "medium": 28.35,   # ~10 mm
    "large":  56.69,   # ~20 mm
}

# EXIF orientation tag
EXIF_ORIENTATION_TAG = 274

# Strictly HEIC as per user request
ALLOWED_EXTENSIONS = {".heic"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sanitize_filename(name: str) -> str:
    """Remove unsafe characters from a filename."""
    name = os.path.basename(name)
    name = re.sub(r'[^\w\-. ]', '_', name)
    name = name.strip(". ")
    return name or "converted_heic"


def _apply_exif_orientation(img: Image.Image) -> Image.Image:
    """Rotate / flip image to match EXIF orientation tag."""
    try:
        exif_data = img.getexif()
        if exif_data is None:
            return img
        orientation = exif_data.get(EXIF_ORIENTATION_TAG)
        if orientation == 2:
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
        elif orientation == 3:
            img = img.rotate(180, expand=True)
        elif orientation == 4:
            img = img.transpose(Image.FLIP_TOP_BOTTOM)
        elif orientation == 5:
            img = img.rotate(-90, expand=True).transpose(Image.FLIP_LEFT_RIGHT)
        elif orientation == 6:
            img = img.rotate(-90, expand=True)
        elif orientation == 7:
            img = img.rotate(90, expand=True).transpose(Image.FLIP_LEFT_RIGHT)
        elif orientation == 8:
            img = img.rotate(90, expand=True)
    except Exception:
        pass
    return img


def _to_rgb(img: Image.Image, bg_color: Tuple[int, int, int] = (255, 255, 255)) -> Image.Image:
    """Convert any PIL image mode to RGB, handling transparency safely."""
    if img.mode == "RGB":
        return img
    if img.mode in ("RGBA", "LA", "PA"):
        background = Image.new("RGB", img.size, bg_color)
        mask = img.split()[-1] if img.mode in ("RGBA", "LA") else None
        if img.mode == "PA":
            img = img.convert("RGBA")
            mask = img.split()[-1]
        if mask:
            background.paste(img.convert("RGB"), mask=mask)
        else:
            background.paste(img.convert("RGB"))
        return background
    return img.convert("RGB")


def _parse_custom_dims(width_str: str, height_str: str, unit: str) -> Tuple[float, float]:
    """Parse custom page dimensions and return (width_pt, height_pt)."""
    try:
        w = float(width_str)
        h = float(height_str)
    except (ValueError, TypeError):
        raise ValueError("Custom page dimensions must be valid numbers.")

    if w <= 0 or h <= 0:
        raise ValueError("Custom page dimensions must be positive.")
    if unit == "mm":
        w = w * 72 / 25.4
        h = h * 72 / 25.4
    elif unit == "inch":
        w = w * 72
        h = h * 72
    elif unit == "pt":
        pass
    else:
        raise ValueError(f"Unknown unit '{unit}'. Use mm, inch, or pt.")

    if w > 14400 or h > 14400:
        raise ValueError("Custom page dimensions are too large.")
    return w, h


def _resolve_page_size(
    page_size: str,
    orientation: str,
    img_w: int,
    img_h: int,
    dpi: float,
    custom_w_str: str = "",
    custom_h_str: str = "",
    custom_unit: str = "mm",
) -> Tuple[float, float]:
    if page_size == "original":
        eff_dpi = dpi if dpi > 0 else 96.0
        w_pt = img_w * 72.0 / eff_dpi
        h_pt = img_h * 72.0 / eff_dpi
    elif page_size == "custom":
        w_pt, h_pt = _parse_custom_dims(custom_w_str, custom_h_str, custom_unit)
    else:
        size_key = page_size.lower()
        if size_key not in PAGE_SIZES_PT:
            raise ValueError(f"Unknown page size '{page_size}'.")
        w_pt, h_pt = PAGE_SIZES_PT[size_key]

    if orientation == "portrait":
        if w_pt > h_pt:
            w_pt, h_pt = h_pt, w_pt
    elif orientation == "landscape":
        if h_pt > w_pt:
            w_pt, h_pt = h_pt, w_pt
    elif orientation == "auto":
        if img_w > img_h and h_pt > w_pt:
            w_pt, h_pt = h_pt, w_pt
        elif img_h >= img_w and w_pt > h_pt:
            w_pt, h_pt = h_pt, w_pt

    return w_pt, h_pt


def _resolve_margins(
    margin_preset: str,
    custom_top: str = "0",
    custom_right: str = "0",
    custom_bottom: str = "0",
    custom_left: str = "0",
) -> Tuple[float, float, float, float]:
    if margin_preset == "custom":
        try:
            top    = float(custom_top)    * 72 / 25.4
            right  = float(custom_right)  * 72 / 25.4
            bottom = float(custom_bottom) * 72 / 25.4
            left   = float(custom_left)   * 72 / 25.4
        except (ValueError, TypeError):
            raise ValueError("Custom margin values must be valid numbers (in mm).")
        if any(v < 0 for v in (top, right, bottom, left)):
            raise ValueError("Margin values cannot be negative.")
        return top, right, bottom, left
    m = MARGIN_PRESETS.get(margin_preset, 0.0)
    return m, m, m, m


def _fit_image(
    img_w: int, img_h: int,
    area_w: float, area_h: float,
    fit_mode: str,
) -> Tuple[float, float, float, float]:
    img_ratio = img_w / img_h
    area_ratio = area_w / area_h

    if fit_mode == "fill":
        if img_ratio > area_ratio:
            draw_h = area_h
            draw_w = draw_h * img_ratio
        else:
            draw_w = area_w
            draw_h = draw_w / img_ratio
        x = (area_w - draw_w) / 2
        y = (area_h - draw_h) / 2

    elif fit_mode == "original":
        draw_w = img_w * 72.0 / 96.0
        draw_h = img_h * 72.0 / 96.0
        if draw_w > area_w or draw_h > area_h:
            scale = min(area_w / draw_w, area_h / draw_h)
            draw_w *= scale
            draw_h *= scale
        x = (area_w - draw_w) / 2
        y = (area_h - draw_h) / 2

    else:  # "fit" / "fit_proportionally"
        if img_ratio > area_ratio:
            draw_w = area_w
            draw_h = draw_w / img_ratio
        else:
            draw_h = area_h
            draw_w = draw_h * img_ratio
        x = (area_w - draw_w) / 2
        y = (area_h - draw_h) / 2

    return x, y, draw_w, draw_h


# ---------------------------------------------------------------------------
# Main service
# ---------------------------------------------------------------------------

class HeicToPdfService:
    """Convert HEIC images into PDF documents."""

    MAX_IMAGE_BYTES = 50 * 1024 * 1024

    def validate_heic_file(self, path: Path) -> None:
        """Raise ValueError if the file is not a valid HEIC."""
        if not path.exists():
            raise ValueError(f"File not found: {path.name}")
        if path.stat().st_size == 0:
            raise ValueError(f"File '{path.name}' is empty.")
        if path.stat().st_size > self.MAX_IMAGE_BYTES:
            raise ValueError(f"File '{path.name}' exceeds the 50 MB size limit.")
        ext = path.suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"File '{path.name}' has an unsupported extension. Only .heic is allowed.")
        
        # Test loading with Pillow to verify it's a readable HEIC/HEIF
        try:
            with Image.open(path) as img:
                img.verify()
        except Exception as e:
            raise ValueError(f"Could not read HEIC file '{path.name}'. It may be corrupted or unsupported.")

    async def process(
        self,
        request_id: str,
        files_config: List[Dict[str, Any]],
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Convert HEIC images to PDF(s).
        files_config = [{"filename": "...", "rotation": 0}, ...]
        Returns dict with success, request_id, and results.
        """
        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        if not files_config:
            raise ValueError("No HEIC files were provided for conversion.")

        # --- Extract config ---
        page_size       = config.get("page_size", "a4").lower()
        orientation     = config.get("orientation", "auto").lower()
        fit_mode        = config.get("fit_mode", "fit").lower()
        margin_preset   = config.get("margin_preset", "medium").lower()
        custom_m_top    = config.get("custom_margin_top",    "10")
        custom_m_right  = config.get("custom_margin_right",  "10")
        custom_m_bottom = config.get("custom_margin_bottom", "10")
        custom_m_left   = config.get("custom_margin_left",   "10")
        custom_pw       = config.get("custom_page_width",  "210")
        custom_ph       = config.get("custom_page_height", "297")
        custom_pu       = config.get("custom_page_unit",    "mm")
        
        output_mode     = config.get("output_mode", "combine")
        
        bg_hex          = config.get("bg_color", "#ffffff").lstrip("#")
        
        quality         = config.get("quality", "medium").lower()
        compression     = config.get("compression", "medium").lower()
        remove_meta     = str(config.get("remove_metadata", "false")).lower() == "true"
        
        pdf_title    = config.get("pdf_title", "")
        pdf_author   = config.get("pdf_author", "")
        pdf_subject  = config.get("pdf_subject", "")
        pdf_keywords = config.get("pdf_keywords", "")
        
        raw_name = config.get("output_filename", "converted_heic")
        safe_name = _sanitize_filename(raw_name)
        if not safe_name.lower().endswith(".pdf"):
            safe_name += ".pdf"

        try:
            bg_color = tuple(int(bg_hex[i:i+2], 16) for i in (0, 2, 4))
        except Exception:
            bg_color = (255, 255, 255)

        margin_top, margin_right, margin_bottom, margin_left = _resolve_margins(
            margin_preset, custom_m_top, custom_m_right, custom_m_bottom, custom_m_left
        )

        results = []
        
        if output_mode == "combine":
            out_doc = fitz.open()
            for f_conf in files_config:
                self._process_single_heic(
                    f_conf=f_conf,
                    upload_dir=upload_dir,
                    out_doc=out_doc,
                    page_size=page_size,
                    orientation=orientation,
                    fit_mode=fit_mode,
                    margin_top=margin_top,
                    margin_right=margin_right,
                    margin_bottom=margin_bottom,
                    margin_left=margin_left,
                    custom_pw=custom_pw,
                    custom_ph=custom_ph,
                    custom_pu=custom_pu,
                    bg_color=bg_color,
                    quality=quality,
                    remove_meta=remove_meta
                )
            
            output_path = output_dir / safe_name
            out_doc.save(
                str(output_path),
                deflate=True if compression in ["medium", "high"] else False,
                garbage=4 if compression == "high" else 0
            )
            out_doc.close()
            
            self._apply_metadata(output_path, pdf_title, pdf_author, pdf_subject, pdf_keywords)
            
            results.append({
                "original": [c["filename"] for c in files_config],
                "pdf_filename": safe_name
            })
            
        else: # individual
            for idx, f_conf in enumerate(files_config):
                out_doc = fitz.open()
                self._process_single_heic(
                    f_conf=f_conf,
                    upload_dir=upload_dir,
                    out_doc=out_doc,
                    page_size=page_size,
                    orientation=orientation,
                    fit_mode=fit_mode,
                    margin_top=margin_top,
                    margin_right=margin_right,
                    margin_bottom=margin_bottom,
                    margin_left=margin_left,
                    custom_pw=custom_pw,
                    custom_ph=custom_ph,
                    custom_pu=custom_pu,
                    bg_color=bg_color,
                    quality=quality,
                    remove_meta=remove_meta
                )
                
                filename = f_conf["filename"]
                name_stem = Path(filename).stem
                indiv_name = f"{_sanitize_filename(name_stem)}.pdf"
                output_path = output_dir / indiv_name
                
                out_doc.save(
                    str(output_path),
                    deflate=True if compression in ["medium", "high"] else False,
                    garbage=4 if compression == "high" else 0
                )
                out_doc.close()
                
                self._apply_metadata(output_path, pdf_title, pdf_author, pdf_subject, pdf_keywords)
                
                results.append({
                    "original": filename,
                    "pdf_filename": indiv_name
                })

        return {
            "success": True,
            "request_id": request_id,
            "results": results
        }

    def _process_single_heic(
        self,
        f_conf: Dict[str, Any],
        upload_dir: Path,
        out_doc: fitz.Document,
        page_size: str,
        orientation: str,
        fit_mode: str,
        margin_top: float,
        margin_right: float,
        margin_bottom: float,
        margin_left: float,
        custom_pw: str,
        custom_ph: str,
        custom_pu: str,
        bg_color: tuple,
        quality: str,
        remove_meta: bool
    ):
        filename = f_conf["filename"]
        img_path = upload_dir / filename
        self.validate_heic_file(img_path)

        user_rotation = int(f_conf.get("rotation", 0))

        # Decode HEIC
        with Image.open(img_path) as img:
            img = _apply_exif_orientation(img)
            
            if remove_meta:
                # Stripping exif by creating a fresh copy
                data = list(img.getdata())
                img_no_meta = Image.new(img.mode, img.size)
                img_no_meta.putdata(data)
                img = img_no_meta
                
            if user_rotation:
                # Negative because CSS rotate(90) vs PIL rotate(90) are often opposite
                img = img.rotate(-user_rotation, expand=True)
                
            img = _to_rgb(img, bg_color)
            img_w, img_h = img.size
            dpi = img.info.get("dpi", (96.0, 96.0))[0]

            # Compress to JPEG stream in memory for fitz insertion
            q_map = {"low": 60, "medium": 85, "high": 95, "original": 100}
            q_val = q_map.get(quality, 85)
            
            img_bytes = io.BytesIO()
            img.save(img_bytes, format="JPEG", quality=q_val)
            img_data = img_bytes.getvalue()

        # Page calculations
        page_w_pt, page_h_pt = _resolve_page_size(
            page_size, orientation,
            img_w, img_h, dpi,
            custom_pw, custom_ph, custom_pu
        )

        area_w = page_w_pt - margin_left - margin_right
        area_h = page_h_pt - margin_top - margin_bottom

        if area_w <= 0 or area_h <= 0:
            logger.warning("Margins leave no drawable area — using full page.")
            area_w = page_w_pt
            area_h = page_h_pt
            margin_left = margin_top = 0

        # Alignment calculations (center)
        x, y, draw_w, draw_h = _fit_image(img_w, img_h, area_w, area_h, fit_mode)
        target_rect = fitz.Rect(
            margin_left + x,
            margin_top + y,
            margin_left + x + draw_w,
            margin_top + y + draw_h
        )

        out_page = out_doc.new_page(width=page_w_pt, height=page_h_pt)

        # Draw Background
        out_page.draw_rect(out_page.rect, color=(bg_color[0]/255, bg_color[1]/255, bg_color[2]/255), fill=(bg_color[0]/255, bg_color[1]/255, bg_color[2]/255))
            
        out_page.insert_image(target_rect, stream=img_data)


    def _apply_metadata(self, pdf_path: Path, title: str, author: str, subject: str, keywords: str) -> None:
        """Inject metadata using pikepdf."""
        if not any([title, author, subject, keywords]):
            return
            
        try:
            import pikepdf
            with pikepdf.open(pdf_path, allow_overwriting_input=True) as pdf:
                with pdf.open_metadata() as meta:
                    if title:    meta["dc:title"]       = title
                    if author:   meta["dc:creator"]     = author
                    if subject:  meta["dc:description"] = subject
                    if keywords: meta["pdf:Keywords"]   = keywords
                    meta["pdf:Producer"] = "PDF Tools (HEIC)"
                pdf.save(pdf_path, compress_streams=True)
        except Exception as pe:
            logger.warning(f"pikepdf metadata step failed: {pe}")

# Singleton
heic_to_pdf_service = HeicToPdfService()
