"""
Internal Links Service — Document Management Section.

Allows users to create, manage, and inspect internal page-to-page jump links and cross-references:
Features:
  - Extract existing internal page navigation links (fitz.LINK_GOTO)
  - Create internal jump links pointing from specific text or regions to destination pages
  - Improve reading efficiency in large PDF documents
  - Secure temporary PDF generation and session output management
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


class InternalLinksService:
    """Enterprise service for creating and managing internal PDF page jump links."""

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and unsafe characters."""
        if not filename:
            return "document.pdf"
        clean = Path(filename).name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document.pdf"

    def extract_internal_links(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Extract all existing internal page-to-page jump links from the PDF document.
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
        internal_links: List[Dict[str, Any]] = []
        link_id = 1

        for page_idx in range(total_pages):
            page = doc[page_idx]
            links = page.get_links() or []

            for l in links:
                if l.get("kind") == fitz.LINK_GOTO:
                    target_page = l.get("page", 0) + 1
                    rect = [round(c, 2) for c in list(l.get("from", [0, 0, 0, 0]))]
                    internal_links.append({
                        "id": link_id,
                        "source_page": page_idx + 1,
                        "target_page": target_page,
                        "rect": rect,
                        "description": f"Page {page_idx + 1} ➔ Page {target_page}"
                    })
                    link_id += 1

        doc.close()

        return {
            "success": True,
            "total_pages": total_pages,
            "total_internal_links": len(internal_links),
            "internal_links": internal_links,
        }

    def add_internal_link(
        self,
        session_id: str,
        pdf_bytes: bytes,
        original_filename: str,
        source_page: int,
        target_page: int,
        search_text: str = "",
        rect_coords: Optional[List[float]] = None,
    ) -> Dict[str, Any]:
        """
        Add a internal page jump link pointing from source_page to target_page.
        """
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = len(doc)

        src_p = max(1, min(total_pages, int(source_page or 1)))
        tgt_p = max(1, min(total_pages, int(target_page or 1)))

        page = doc[src_p - 1]
        rect = None

        if rect_coords and isinstance(rect_coords, list) and len(rect_coords) == 4:
            rect = fitz.Rect(rect_coords[0], rect_coords[1], rect_coords[2], rect_coords[3])
        elif search_text and search_text.strip():
            quads = page.search_for(search_text.strip())
            if quads:
                rect = quads[0]

        if not rect:
            # Default highlight box on top left of source page if no search text matched
            rect = fitz.Rect(50, 50, 250, 75)

        link_dict = {
            "kind": fitz.LINK_GOTO,
            "from": rect,
            "page": tgt_p - 1
        }
        page.insert_link(link_dict)

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)

        clean_filename = self.sanitize_filename(original_filename)
        out_filename = f"internal_link_{clean_filename}"
        out_path = out_dir / out_filename

        output_bytes = doc.write(garbage=4, deflate=True)
        doc.close()

        out_path.write_bytes(output_bytes)

        return {
            "success": True,
            "session_id": session_id,
            "original_filename": clean_filename,
            "saved_filename": out_filename,
            "source_page": src_p,
            "target_page": tgt_p,
            "download_url": f"/document-management/internal-links/download/{session_id}",
        }

    def get_internal_link_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        """Retrieve output PDF for download."""
        out_dir = Paths.request_output(session_id)
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()] if out_dir.exists() else []
        if not files:
            raise ValueError("Internal link PDF file not found for this session.")
        return files[0], files[0].name


internal_links_service = InternalLinksService()
