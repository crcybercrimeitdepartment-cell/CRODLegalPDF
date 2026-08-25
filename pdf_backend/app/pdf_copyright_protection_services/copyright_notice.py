"""
Copyright Notice Service — PDF Copyright Protection Section.

Stamps a copyright notice text directly onto PDF pages at a chosen
position with configurable font size, opacity, and page selection.
Preserves original PDF content.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024

POSITION_MAP = {
    "top": lambda pw, ph, tw, th: (pw / 2 - tw / 2, 30),
    "bottom": lambda pw, ph, tw, th: (pw / 2 - tw / 2, ph - 30),
    "center": lambda pw, ph, tw, th: (pw / 2 - tw / 2, ph / 2),
    "top-left": lambda pw, ph, tw, th: (20, 30),
    "top-right": lambda pw, ph, tw, th: (pw - tw - 20, 30),
    "bottom-left": lambda pw, ph, tw, th: (20, ph - 30),
    "bottom-right": lambda pw, ph, tw, th: (pw - tw - 20, ph - 30),
}


class CopyrightNoticeService:
    """Stamp a copyright notice text onto PDF pages."""

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

    def apply_notice(
        self,
        pdf_bytes: bytes,
        original_filename: str,
        session_id: str,
        notice_text: str = "",
        position: str = "bottom",
        font_size: int = 12,
        opacity: float = 1.0,
        pages: str = "all",
    ) -> Dict[str, Any]:
        """Stamp copyright notice onto PDF pages."""
        self._validate_pdf(pdf_bytes)
        if not notice_text.strip():
            raise ValueError("Copyright notice text is required.")

        font_size = max(6, min(72, font_size))
        opacity = max(0.0, min(1.0, opacity))

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")

        total = len(doc)
        page_indices = self._parse_pages(pages, total)

        for idx in page_indices:
            page = doc[idx]
            rect = page.rect
            tw = len(notice_text) * font_size * 0.5
            th = font_size * 1.2

            calc = POSITION_MAP.get(position, POSITION_MAP["bottom"])
            x, y = calc(rect.width, rect.height, tw, th)

            page.insert_text(
                fitz.Point(x, y),
                notice_text.strip(),
                fontname="helv",
                fontsize=font_size,
                color=(0, 0, 0),
                fill_opacity=opacity,
                overlay=True,
            )

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        clean_name = self._sanitize_filename(original_filename)
        out_filename = f"notice_{clean_name}"
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
            "notice_text": notice_text.strip(),
            "position": position,
            "font_size": font_size,
            "opacity": opacity,
            "pages_applied": len(page_indices),
            "download_url": f"/pdf-copyright-protection/notice/download/{session_id}",
            "message": f"Copyright notice applied to {len(page_indices)} page(s).",
        }

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Processed PDF not found for this session.")
        return files[0], files[0].name


copyright_notice_service = CopyrightNoticeService()
