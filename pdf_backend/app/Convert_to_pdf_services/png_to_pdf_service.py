"""
PNG to PDF conversion service.
Specialized for handling PNG transparency, compositing, and alignment.
"""

from __future__ import annotations

import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

from PIL import Image, ImageColor
import pikepdf

from app.core.paths import Paths
from app.Convert_to_pdf_services.jpg_to_pdf_service import (
    _sanitize_filename,
    _resolve_page_size,
    _resolve_margins,
    _add_page_number_to_img,
)

logger = logging.getLogger(__name__)

def _parse_color(color_str: str, default: Tuple[int, int, int] = (255, 255, 255)) -> Tuple[int, int, int]:
    """Parse hex or named color to RGB tuple."""
    if not color_str:
        return default
    try:
        rgb = ImageColor.getrgb(color_str)
        return rgb[:3]
    except Exception:
        return default

def _fit_image_aligned(
    img_w: int, img_h: int,
    area_w: float, area_h: float,
    fit_mode: str,
    alignment: str = "center"
) -> Tuple[float, float, float, float]:
    """
    Return (x, y, draw_w, draw_h) in points inside the area box, with alignment support.
    """
    img_ratio = img_w / img_h
    area_ratio = area_w / area_h

    if fit_mode == "fill":
        if img_ratio > area_ratio:
            draw_h = area_h
            draw_w = draw_h * img_ratio
        else:
            draw_w = area_w
            draw_h = draw_w / img_ratio
    elif fit_mode == "stretch":
        draw_w, draw_h = area_w, area_h
    elif fit_mode == "original":
        draw_w = img_w * 72.0 / 96.0
        draw_h = img_h * 72.0 / 96.0
        if draw_w > area_w or draw_h > area_h:
            scale = min(area_w / draw_w, area_h / draw_h)
            draw_w *= scale
            draw_h *= scale
    else:  # "fit"
        if img_ratio > area_ratio:
            draw_w = area_w
            draw_h = draw_w / img_ratio
        else:
            draw_h = area_h
            draw_w = draw_h * img_ratio

    # Apply Alignment
    x = (area_w - draw_w) / 2
    y = (area_h - draw_h) / 2
    
    if alignment == "left":
        x = 0
    elif alignment == "right":
        x = area_w - draw_w
    elif alignment == "top":
        y = 0
    elif alignment == "bottom":
        y = area_h - draw_h

    return x, y, draw_w, draw_h

class PngToPdfService:
    
    def validate_image_file(self, file_path: Path) -> None:
        if not file_path.exists():
            raise ValueError(f"File not found: {file_path.name}")
        ext = file_path.suffix.lower()
        if ext != ".png":
            raise ValueError(f"File '{file_path.name}' is not a PNG.")
        if file_path.stat().st_size > 100 * 1024 * 1024:
            raise ValueError(f"File '{file_path.name}' exceeds the 100MB limit.")

    async def process(
        self,
        request_id: str,
        filenames: List[str],
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        
        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        if not filenames:
            raise ValueError("No PNG images provided.")

        # Extract config
        page_size       = config.get("page_size", "a4")
        orientation     = config.get("orientation", "auto")
        fit_mode        = config.get("fit_mode", "fit")
        alignment       = config.get("alignment", "center")
        margin_preset   = config.get("margin_preset", "medium")
        
        custom_mt       = config.get("custom_margin_top", "10")
        custom_mr       = config.get("custom_margin_right", "10")
        custom_mb       = config.get("custom_margin_bottom", "10")
        custom_ml       = config.get("custom_margin_left", "10")
        
        custom_pw       = config.get("custom_page_width", "210")
        custom_ph       = config.get("custom_page_height", "297")
        custom_pu       = config.get("custom_page_unit", "mm")
        
        dpi_str         = config.get("dpi", "150")
        quality         = config.get("quality", "high")
        rotation_str    = config.get("rotation", "0")
        
        bg_color_str    = config.get("bg_color", "#ffffff")
        transparent_bg  = config.get("transparent_bg", False)
        
        pn_enabled      = config.get("page_numbers_enabled", False)
        pn_start        = int(config.get("page_numbers_start", "1"))
        pn_pos          = config.get("page_numbers_position", "bottom-center")
        
        pdf_title       = config.get("pdf_title", "")
        pdf_author      = config.get("pdf_author", "")
        pdf_subject     = config.get("pdf_subject", "")
        pdf_keywords    = config.get("pdf_keywords", "")
        output_filename = config.get("output_filename", "converted_pngs")

        try:
            dpi_val = float(dpi_str)
        except ValueError:
            dpi_val = 150.0

        try:
            rotation_val = int(rotation_str)
        except ValueError:
            rotation_val = 0

        # Output filename setup
        if not output_filename.lower().endswith(".pdf"):
            output_filename += ".pdf"
        safe_name = _sanitize_filename(output_filename)

        bg_rgb = _parse_color(bg_color_str, (255, 255, 255))
        margin_t, margin_r, margin_b, margin_l = _resolve_margins(
            margin_preset, custom_mt, custom_mr, custom_mb, custom_ml
        )

        page_canvases: List[Image.Image] = []

        for idx, filename in enumerate(filenames):
            img_path = upload_dir / filename
            self.validate_image_file(img_path)

            try:
                img = Image.open(img_path)
                img.load()
            except Exception as e:
                raise ValueError(f"Could not open PNG '{filename}': {e}")

            if rotation_val != 0:
                img = img.rotate(rotation_val * -1, expand=True) # Pillow rotate goes CCW

            # Handle Transparency compositing
            if img.mode in ("RGBA", "LA", "PA", "P"):
                img = img.convert("RGBA")
                if transparent_bg:
                    # Keep RGBA (Pillow saves RGBA to PDF with a mask)
                    rgb_img = img
                else:
                    # Composite over solid background
                    bg = Image.new("RGBA", img.size, bg_rgb + (255,))
                    bg.paste(img, mask=img)
                    rgb_img = bg.convert("RGB")
            else:
                rgb_img = img.convert("RGB")

            img_w, img_h = rgb_img.size
            page_w_pt, page_h_pt = _resolve_page_size(
                page_size, orientation, img_w, img_h, dpi_val, custom_pw, custom_ph, custom_pu
            )

            # Build Page Canvas
            canvas_mode = "RGBA" if transparent_bg else "RGB"
            canvas_bg = (0, 0, 0, 0) if transparent_bg else bg_rgb
            
            # Pixel dimensions for canvas
            canvas_w_px = int(page_w_pt * dpi_val / 72.0)
            canvas_h_px = int(page_h_pt * dpi_val / 72.0)
            
            canvas = Image.new(canvas_mode, (canvas_w_px, canvas_h_px), canvas_bg)

            # Margins
            area_w_pt = max(1.0, page_w_pt - margin_l - margin_r)
            area_h_pt = max(1.0, page_h_pt - margin_t - margin_b)

            # Fit
            dx_pt, dy_pt, dw_pt, dh_pt = _fit_image_aligned(img_w, img_h, area_w_pt, area_h_pt, fit_mode, alignment)

            paste_x = int((margin_l + dx_pt) * dpi_val / 72.0)
            paste_y = int((margin_t + dy_pt) * dpi_val / 72.0)
            paste_w = int(dw_pt * dpi_val / 72.0)
            paste_h = int(dh_pt * dpi_val / 72.0)
            
            # Prevent zero size
            paste_w = max(1, paste_w)
            paste_h = max(1, paste_h)

            resized = rgb_img.resize((paste_w, paste_h), Image.Resampling.LANCZOS)
            
            if transparent_bg:
                canvas.paste(resized, (paste_x, paste_y), mask=resized)
            else:
                canvas.paste(resized, (paste_x, paste_y))
            
            if pn_enabled:
                page_num_display = pn_start + idx
                font_px = max(18, int(dpi_val / 6))
                canvas = _add_page_number_to_img(canvas, page_num_display, pn_pos, font_px)

            # Pillow PDF save does not support RGBA directly without flattening unless using specific tricks,
            # but usually it's best to convert to RGB at the very end if transparent_bg is true,
            # as PDF pages are intrinsically opaque unless there's an explicit white background.
            # We'll save it as RGB if user didn't specify transparent bg.
            if not transparent_bg:
                canvas = canvas.convert("RGB")
            
            page_canvases.append(canvas)
            img.close()

        if not page_canvases:
            raise ValueError("No pages were rendered.")

        output_path = output_dir / safe_name
        first_page = page_canvases[0]
        rest_pages = page_canvases[1:]

        # If transparent_bg is selected, save_all in RGBA mode
        first_page.save(
            output_path,
            format="PDF",
            save_all=True,
            append_images=rest_pages,
            resolution=dpi_val,
        )

        for c in page_canvases:
            c.close()

        # Metadata Injection
        if pdf_title or pdf_author or pdf_subject or pdf_keywords:
            try:
                with pikepdf.open(output_path, allow_overwriting_input=True) as pdf:
                    with pdf.open_metadata() as meta:
                        if pdf_title: meta["dc:title"] = pdf_title
                        if pdf_author: meta["dc:creator"] = pdf_author
                        if pdf_subject: meta["dc:description"] = pdf_subject
                        if pdf_keywords: meta["pdf:Keywords"] = pdf_keywords
                        meta["pdf:Producer"] = "PDF Tools - PNG to PDF"
                    pdf.save(output_path)
            except Exception as pe:
                logger.warning(f"Metadata injection failed: {pe}")

        if not output_path.exists():
            raise RuntimeError("PDF generation failed.")

        return {
            "success": True,
            "request_id": request_id,
            "pdf_filename": safe_name,
            "page_count": len(filenames),
        }

png_to_pdf_service = PngToPdfService()
