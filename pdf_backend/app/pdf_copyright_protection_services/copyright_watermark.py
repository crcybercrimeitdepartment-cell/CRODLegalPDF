"""
Copyright Watermark Service — PDF Copyright Protection Section.

Applies a visible copyright watermark (text or image) onto PDF pages
with configurable position, font size, opacity, rotation, and page
selection. Preserves original PDF content.
"""

from __future__ import annotations

import logging
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024

POSITION_PRESETS = {
    "center": lambda pw, ph: (pw / 2, ph / 2),
    "top-left": lambda pw, ph: (pw * 0.15, ph * 0.15),
    "top-center": lambda pw, ph: (pw / 2, ph * 0.15),
    "top-right": lambda pw, ph: (pw * 0.85, ph * 0.15),
    "middle-left": lambda pw, ph: (pw * 0.15, ph / 2),
    "middle-right": lambda pw, ph: (pw * 0.85, ph / 2),
    "bottom-left": lambda pw, ph: (pw * 0.15, ph * 0.85),
    "bottom-center": lambda pw, ph: (pw / 2, ph * 0.85),
    "bottom-right": lambda pw, ph: (pw * 0.85, ph * 0.85),
}


class CopyrightWatermarkService:
    """Apply visible copyright watermark to PDF pages."""

    def _sanitize_filename(self, filename: str) -> str:
        if not filename:
            return "document.pdf"
        clean = Path(filename).name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document.pdf"

    def _validate_pdf(self, pdf_bytes: bytes) -> None:
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError("File size exceeds the 200 MB limit.")
        if not pdf_bytes[:5].startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")

    def _parse_pages(self, page_str: str, total: int) -> List[int]:
        if not page_str or page_str.strip().lower() == "all":
            return list(range(total))
        pages = set()
        for part in page_str.split(","):
            part = part.strip()
            if "-" in part:
                rng = part.split("-", 1)
                try:
                    start = max(1, int(rng[0].strip()))
                    end = min(total, int(rng[1].strip()))
                    pages.update(range(start - 1, end))
                except (ValueError, IndexError):
                    continue
            else:
                try:
                    p = int(part)
                    if 1 <= p <= total:
                        pages.add(p - 1)
                except ValueError:
                    continue
        return sorted(pages) if pages else list(range(total))

    def _hex_to_rgb(self, hex_color: str) -> Tuple[float, float, float]:
        hex_color = hex_color.lstrip("#")
        if len(hex_color) == 3:
            hex_color = "".join(c * 2 for c in hex_color)
        try:
            return tuple(int(hex_color[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
        except (ValueError, IndexError):
            return (0.8, 0.8, 0.8)

    def apply_text_watermark(
        self,
        pdf_bytes: bytes,
        original_filename: str,
        session_id: str,
        watermark_text: str = "",
        position: str = "center",
        font_size: int = 60,
        opacity: float = 0.3,
        rotation: float = 45.0,
        color: str = "#888888",
        pages: str = "all",
    ) -> Dict[str, Any]:
        """Apply a visible text watermark to PDF pages."""
        self._validate_pdf(pdf_bytes)
        if not watermark_text.strip():
            raise ValueError("Watermark text is required.")

        font_size = max(8, min(200, font_size))
        opacity = max(0.05, min(1.0, opacity))
        rotation = rotation % 360

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")

        total = len(doc)
        page_indices = self._parse_pages(pages, total)
        color_rgb = self._hex_to_rgb(color)

        for idx in page_indices:
            page = doc[idx]
            rect = page.rect
            tw = len(watermark_text.strip()) * font_size * 0.5
            th = font_size * 1.2

            calc = POSITION_PRESETS.get(position, POSITION_PRESETS["center"])
            cx, cy = calc(rect.width, rect.height)
            x = cx - tw / 2
            y = cy + th / 2

            point = fitz.Point(x, y)
            center = fitz.Point(cx, cy)
            page.insert_text(
                point,
                watermark_text.strip(),
                fontname="helv",
                fontsize=font_size,
                color=color_rgb,
                fill_opacity=opacity,
                morph=(center, fitz.Matrix(-rotation)),
                overlay=True,
            )

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        clean_name = self._sanitize_filename(original_filename)
        out_filename = f"watermark_{clean_name}"
        out_path = out_dir / out_filename

        output_bytes = doc.write(garbage=4, deflate=True)
        total_pages = len(doc)
        doc.close()
        out_path.write_bytes(output_bytes)

        return {
            "success": True,
            "session_id": session_id,
            "original_filename": clean_name,
            "saved_filename": out_filename,
            "total_pages": total_pages,
            "watermark_type": "text",
            "watermark_text": watermark_text.strip(),
            "position": position,
            "font_size": font_size,
            "opacity": opacity,
            "rotation": rotation,
            "pages_applied": len(page_indices),
            "download_url": f"/pdf-copyright-protection/watermark/download/{session_id}",
            "message": f"Watermark applied to {len(page_indices)} page(s).",
        }

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Processed PDF not found for this session.")
        return files[0], files[0].name


copyright_watermark_service = CopyrightWatermarkService()
