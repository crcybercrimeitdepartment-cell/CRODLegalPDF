"""
Bookmark Management Service — Document Management Section.

Provides full lifecycle management for PDF bookmarks (table of outlines):
  - Extract existing document bookmark hierarchy
  - Create new bookmarks pointing to specific pages
  - Edit bookmark titles and target pages
  - Reorder, indent, or outdent bookmark level hierarchies
  - Delete individual bookmarks or clear outlines
  - Save updated PDF documents with updated navigation structure
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


class BookmarkManagementService:
    """Enterprise service for PDF bookmark extraction, creation, editing, and structure updates."""

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and unsafe characters."""
        if not filename:
            return "document.pdf"
        clean = Path(filename).name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document.pdf"

    def extract_bookmarks(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Extract full outline / bookmark hierarchy from PDF document.
        Returns total pages and list of bookmarks [{"id": int, "level": int, "title": str, "page": int}].
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
        doc.close()

        bookmarks: List[Dict[str, Any]] = []
        for idx, item in enumerate(toc, start=1):
            level = item[0] if len(item) > 0 else 1
            title = item[1] if len(item) > 1 else f"Section {idx}"
            page = item[2] if len(item) > 2 else 1
            bookmarks.append({
                "id": idx,
                "level": max(1, min(6, int(level))),
                "title": str(title),
                "page": max(1, min(total_pages, int(page))),
            })

        return {
            "success": True,
            "total_pages": total_pages,
            "total_bookmarks": len(bookmarks),
            "bookmarks": bookmarks,
        }

    def update_bookmarks(
        self,
        session_id: str,
        pdf_bytes: bytes,
        original_filename: str,
        bookmarks_list: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Update the PDF document outline / bookmarks with the provided structure.
        """
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError("File size exceeds maximum limit of 100 MB.")

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = len(doc)

        # Convert input dictionary list into PyMuPDF TOC list: [[level, title, page], ...]
        new_toc: List[List[Any]] = []
        for item in bookmarks_list:
            title = str(item.get("title", "")).strip()
            if not title:
                continue
            level = max(1, min(6, int(item.get("level", 1))))
            page = max(1, min(total_pages, int(item.get("page", 1))))
            new_toc.append([level, title, page])

        # Apply new table of contents to PDF document
        doc.set_toc(new_toc)

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)

        clean_filename = self.sanitize_filename(original_filename)
        out_filename = f"bookmarks_updated_{clean_filename}"
        out_path = out_dir / out_filename

        output_bytes = doc.write()
        doc.close()

        out_path.write_bytes(output_bytes)

        return {
            "success": True,
            "session_id": session_id,
            "original_filename": clean_filename,
            "saved_filename": out_filename,
            "total_bookmarks": len(new_toc),
            "download_url": f"/document-management/bookmark-management/download/{session_id}",
        }

    def get_bookmark_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        """Retrieve output PDF for download."""
        out_dir = Paths.request_output(session_id)
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()] if out_dir.exists() else []
        if not files:
            raise ValueError("Bookmark updated PDF file not found for this session.")
        return files[0], files[0].name


bookmark_management_service = BookmarkManagementService()
