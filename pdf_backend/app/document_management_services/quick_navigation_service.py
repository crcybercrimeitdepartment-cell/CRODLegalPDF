"""
Quick Navigation Service — Document Management Section.

Generates a unified navigation tree for PDF documents enabling instant jump-to-section & jump-to-page:
Features:
  - Extract outline tree, section headings, and page jump indices
  - Fast page navigation map for large PDF files
  - Document structure breakdown
"""

from __future__ import annotations

import io
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024


class QuickNavigationService:
    """Enterprise service for generating fast PDF navigation maps and jump trees."""

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and unsafe characters."""
        if not filename:
            return "document.pdf"
        clean = Path(filename).name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document.pdf"

    def get_navigation_tree(self, pdf_bytes: bytes, original_filename: str = "") -> Dict[str, Any]:
        """
        Generate unified quick navigation tree including bookmarks, pages map, and section shortcuts.
        """
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError("File size exceeds maximum limit of 100 MB.")
        if not pdf_bytes.startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")

        total_pages = len(doc)
        toc = doc.get_toc(simple=True) or []

        # Build bookmarks navigation items
        bookmarks_tree: List[Dict[str, Any]] = []
        for idx, item in enumerate(toc, start=1):
            bookmarks_tree.append({
                "id": idx,
                "level": item[0] if len(item) > 0 else 1,
                "title": item[1] if len(item) > 1 else f"Section {idx}",
                "page": item[2] if len(item) > 2 else 1,
            })

        # Build pages list shortcuts
        pages_map: List[Dict[str, Any]] = []
        for p in range(1, total_pages + 1):
            page_obj = doc[p - 1]
            first_line = ""
            txt = page_obj.get_text("text").strip()
            if txt:
                lines = [l.strip() for l in txt.splitlines() if l.strip()]
                first_line = lines[0] if lines else ""

            pages_map.append({
                "page": p,
                "title": f"Page {p}" + (f": {first_line[:40]}..." if first_line else ""),
            })

        doc.close()

        return {
            "success": True,
            "filename": self.sanitize_filename(original_filename),
            "total_pages": total_pages,
            "total_bookmarks": len(bookmarks_tree),
            "bookmarks": bookmarks_tree,
            "pages_map": pages_map,
        }


quick_navigation_service = QuickNavigationService()
