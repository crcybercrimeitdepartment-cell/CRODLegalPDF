"""
SVG to PDF conversion service.

Uses PyMuPDF (fitz) to correctly parse and render SVG vectors without rasterization,
preserving vector quality, paths, text, and gradients.
"""

from __future__ import annotations

import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

import fitz  # PyMuPDF

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

# Allowed extensions
ALLOWED_EXTENSIONS = {".svg"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sanitize_filename(name: str) -> str:
    """Remove unsafe characters from a filename."""
    name = os.path.basename(name)
    name = re.sub(r'[^\w\-. ]', '_', name)
    name = name.strip(". ")
    return name or "converted_svg"


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
    elif unit == "cm":
        w = w * 72 / 2.54
        h = h * 72 / 2.54
    elif unit == "inch":
        w = w * 72
        h = h * 72
    elif unit == "pt":
        pass
    else:
        raise ValueError(f"Unknown unit '{unit}'. Use mm, cm, inch, or pt.")

    if w > 14400 or h > 14400:  # 200 inch max
        raise ValueError("Custom page dimensions are too large.")
    return w, h


def _resolve_page_size(
    page_size: str,
    orientation: str,
    img_w: float,
    img_h: float,
    custom_w_str: str = "",
    custom_h_str: str = "",
    custom_unit: str = "mm",
) -> Tuple[float, float]:
    """Return (page_width_pt, page_height_pt) for given settings."""
    
    if page_size == "original":
        w_pt = img_w
        h_pt = img_h
    elif page_size == "custom":
        w_pt, h_pt = _parse_custom_dims(custom_w_str, custom_h_str, custom_unit)
    else:
        size_key = page_size.lower()
        if size_key not in PAGE_SIZES_PT:
            raise ValueError(f"Unknown page size '{page_size}'.")
        w_pt, h_pt = PAGE_SIZES_PT[size_key]

    # Apply orientation
    if orientation == "portrait":
        if w_pt > h_pt:
            w_pt, h_pt = h_pt, w_pt
    elif orientation == "landscape":
        if h_pt > w_pt:
            w_pt, h_pt = h_pt, w_pt
    elif orientation == "auto":
        # Match SVG shape
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
    """Return (top, right, bottom, left) margin in points."""
    if margin_preset == "custom":
        try:
            top    = float(custom_top)    * 72 / 25.4  # treat as mm
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


def _get_target_rect(
    img_w: float, img_h: float,
    area_w: float, area_h: float,
    ml: float, mt: float,
    fit_mode: str,
    alignment: str,
    custom_scale: float = 100.0
) -> fitz.Rect:
    """
    Return fitz.Rect describing where the SVG should be drawn on the page.
    """
    img_ratio = img_w / img_h if img_h else 1
    area_ratio = area_w / area_h if area_h else 1

    draw_w = img_w
    draw_h = img_h

    if fit_mode == "fill":
        if img_ratio > area_ratio:
            draw_h = area_h
            draw_w = draw_h * img_ratio
        else:
            draw_w = area_w
            draw_h = draw_w / img_ratio

    elif fit_mode == "fit":
        if img_ratio > area_ratio:
            draw_w = area_w
            draw_h = draw_w / img_ratio
        else:
            draw_h = area_h
            draw_w = draw_h * img_ratio
            
    elif fit_mode == "custom":
        scale = custom_scale / 100.0
        draw_w = img_w * scale
        draw_h = img_h * scale

    # Default original: draw_w and draw_h remain img_w and img_h

    # Now handle alignment within area_w, area_h
    x = 0.0
    y = 0.0

    if "center" in alignment:
        x = (area_w - draw_w) / 2
    if "right" in alignment:
        x = area_w - draw_w
        
    if "center" in alignment and "top" not in alignment and "bottom" not in alignment:
        y = (area_h - draw_h) / 2
    elif "bottom" in alignment:
        y = area_h - draw_h
    elif "top" in alignment:
        y = 0
    else:
        # Default middle
        y = (area_h - draw_h) / 2

    # Add margins back
    x += ml
    y += mt

    return fitz.Rect(x, y, x + draw_w, y + draw_h)


# ---------------------------------------------------------------------------
# Main service
# ---------------------------------------------------------------------------

class SvgToPdfService:
    """Convert SVG vector images into PDF documents."""

    MAX_IMAGE_BYTES = 50 * 1024 * 1024

    def validate_svg_file(self, path: Path) -> None:
        """Raise ValueError if the file is not a valid SVG."""
        if not path.exists():
            raise ValueError(f"File not found: {path.name}")
        if path.stat().st_size == 0:
            raise ValueError(f"File '{path.name}' is empty.")
        if path.stat().st_size > self.MAX_IMAGE_BYTES:
            raise ValueError(f"File '{path.name}' exceeds the 50 MB size limit.")
        ext = path.suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"File '{path.name}' has an unsupported extension. Only .svg is allowed.")
        
        # Simple heuristic check for XML/SVG signature to reject spoofed files
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                header = f.read(1024).lower()
                if "<svg" not in header:
                    raise ValueError(f"File '{path.name}' does not appear to be a valid SVG file.")
        except Exception as e:
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"Could not read file '{path.name}'.")

    async def process(
        self,
        request_id: str,
        filenames: List[str],
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Convert SVG images to PDF(s).
        Returns dict with success, request_id, and results.
        """
        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        if not filenames:
            raise ValueError("No SVG files were provided for conversion.")

        # --- Extract config ---
        page_size       = config.get("page_size", "a4").lower()
        orientation     = config.get("orientation", "auto").lower()
        fit_mode        = config.get("fit_mode", "fit").lower()
        custom_scale    = float(config.get("custom_scale", 100))
        alignment       = config.get("alignment", "center").lower()
        margin_preset   = config.get("margin_preset", "medium").lower()
        custom_m_top    = config.get("custom_margin_top",    "10")
        custom_m_right  = config.get("custom_margin_right",  "10")
        custom_m_bottom = config.get("custom_margin_bottom", "10")
        custom_m_left   = config.get("custom_margin_left",   "10")
        custom_pw       = config.get("custom_page_width",  "210")
        custom_ph       = config.get("custom_page_height", "297")
        custom_pu       = config.get("custom_page_unit",    "mm")
        
        output_mode     = config.get("output_mode", "combine") # combine or individual
        
        bg_hex          = config.get("bg_color", "#ffffff").lstrip("#")
        bg_transparent  = config.get("bg_transparent", False)
        
        bg_color = None
        if not bg_transparent:
            try:
                bg_color = tuple(int(bg_hex[i:i+2], 16) / 255.0 for i in (0, 2, 4))
            except Exception:
                bg_color = (1.0, 1.0, 1.0) # default white

        # PDF metadata
        pdf_title    = config.get("pdf_title", "")
        pdf_author   = config.get("pdf_author", "")
        pdf_subject  = config.get("pdf_subject", "")
        pdf_keywords = config.get("pdf_keywords", "")
        
        raw_name = config.get("output_filename", "converted_svg")
        safe_name = _sanitize_filename(raw_name)
        if not safe_name.lower().endswith(".pdf"):
            safe_name += ".pdf"
            
        margin_top, margin_right, margin_bottom, margin_left = _resolve_margins(
            margin_preset, custom_m_top, custom_m_right, custom_m_bottom, custom_m_left
        )

        results = []
        
        if output_mode == "combine":
            out_doc = fitz.open()
            for filename in filenames:
                self._process_single_svg(
                    filename=filename,
                    upload_dir=upload_dir,
                    out_doc=out_doc,
                    page_size=page_size,
                    orientation=orientation,
                    fit_mode=fit_mode,
                    custom_scale=custom_scale,
                    alignment=alignment,
                    margin_top=margin_top,
                    margin_right=margin_right,
                    margin_bottom=margin_bottom,
                    margin_left=margin_left,
                    custom_pw=custom_pw,
                    custom_ph=custom_ph,
                    custom_pu=custom_pu,
                    bg_color=bg_color
                )
            
            output_path = output_dir / safe_name
            out_doc.save(str(output_path))
            out_doc.close()
            
            self._apply_metadata(output_path, pdf_title, pdf_author, pdf_subject, pdf_keywords)
            
            results.append({
                "original": filenames,
                "pdf_filename": safe_name
            })
            
        else: # individual
            for idx, filename in enumerate(filenames):
                out_doc = fitz.open()
                self._process_single_svg(
                    filename=filename,
                    upload_dir=upload_dir,
                    out_doc=out_doc,
                    page_size=page_size,
                    orientation=orientation,
                    fit_mode=fit_mode,
                    custom_scale=custom_scale,
                    alignment=alignment,
                    margin_top=margin_top,
                    margin_right=margin_right,
                    margin_bottom=margin_bottom,
                    margin_left=margin_left,
                    custom_pw=custom_pw,
                    custom_ph=custom_ph,
                    custom_pu=custom_pu,
                    bg_color=bg_color
                )
                
                # Create individual name
                name_stem = Path(filename).stem
                indiv_name = f"{_sanitize_filename(name_stem)}.pdf"
                output_path = output_dir / indiv_name
                out_doc.save(str(output_path))
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

    def _process_single_svg(
        self,
        filename: str,
        upload_dir: Path,
        out_doc: fitz.Document,
        page_size: str,
        orientation: str,
        fit_mode: str,
        custom_scale: float,
        alignment: str,
        margin_top: float,
        margin_right: float,
        margin_bottom: float,
        margin_left: float,
        custom_pw: str,
        custom_ph: str,
        custom_pu: str,
        bg_color: tuple | None
    ):
        img_path = upload_dir / filename
        self.validate_svg_file(img_path)

        try:
            # fitz opens SVG as a single page PDF internally
            src_doc = fitz.open(str(img_path))
            # Wait, opening SVG directly with fitz might return a Document, but we need PDF format to embed as vector.
            pdf_bytes = src_doc.convert_to_pdf()
            src_pdf = fitz.open("pdf", pdf_bytes)
            src_page = src_pdf[0]
            src_rect = src_page.rect
            img_w, img_h = src_rect.width, src_rect.height
        except Exception as e:
            raise ValueError(f"Could not parse SVG '{filename}'. Ensure it is a valid SVG format. Error: {str(e)}")

        page_w_pt, page_h_pt = _resolve_page_size(
            page_size, orientation,
            img_w, img_h,
            custom_pw, custom_ph, custom_pu
        )

        area_w = page_w_pt - margin_left - margin_right
        area_h = page_h_pt - margin_top - margin_bottom

        if area_w <= 0 or area_h <= 0:
            logger.warning("Margins leave no drawable area — using full page.")
            area_w = page_w_pt
            area_h = page_h_pt
            margin_left = margin_top = 0

        target_rect = _get_target_rect(
            img_w, img_h,
            area_w, area_h,
            margin_left, margin_top,
            fit_mode, alignment, custom_scale
        )

        out_page = out_doc.new_page(width=page_w_pt, height=page_h_pt)

        # Draw Background
        if bg_color:
            out_page.draw_rect(out_page.rect, color=bg_color, fill=bg_color)
            
        # Draw SVG vector page onto the new page
        out_page.show_pdf_page(
            target_rect,
            src_pdf,
            0,
            keep_proportion=(fit_mode != "fill")
        )
        
        src_pdf.close()
        src_doc.close()


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
                    meta["pdf:Producer"] = "PDF Tools"
                pdf.save(pdf_path, compress_streams=True)
        except Exception as pe:
            logger.warning(f"pikepdf metadata step failed (PDF still valid): {pe}")

# Singleton
svg_to_pdf_service = SvgToPdfService()
