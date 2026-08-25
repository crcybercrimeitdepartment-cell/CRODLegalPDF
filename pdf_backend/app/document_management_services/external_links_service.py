"""
External Links Service — Document Management Section.

Enables users to connect PDF documents to external websites, online resources, and email addresses:
Features:
  - Extract existing external Web URLs (http/https) and Email addresses (mailto:)
  - Add new external URL links or Email links to specific text or page areas
  - Improve document usability and resource connectivity
  - Output interactive PDF document with download URL
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


class ExternalLinksService:
    """Enterprise service for adding and managing external web & email links in PDF documents."""

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and unsafe characters."""
        if not filename:
            return "document.pdf"
        clean = Path(filename).name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document.pdf"

    def extract_external_links(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Extract all external URLs and Email links from the PDF document.
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
        external_links: List[Dict[str, Any]] = []
        link_id = 1

        for page_idx in range(total_pages):
            page = doc[page_idx]
            links = page.get_links() or []

            for l in links:
                if l.get("kind") == fitz.LINK_URI:
                    uri = l.get("uri", "")
                    rect = [round(c, 2) for c in list(l.get("from", [0, 0, 0, 0]))]
                    link_type = "Email Address" if uri.startswith("mailto:") else "Web Website URL"

                    external_links.append({
                        "id": link_id,
                        "page": page_idx + 1,
                        "type": link_type,
                        "uri": uri,
                        "rect": rect,
                    })
                    link_id += 1

        doc.close()

        return {
            "success": True,
            "total_pages": total_pages,
            "total_external_links": len(external_links),
            "external_links": external_links,
        }

    def add_external_link(
        self,
        session_id: str,
        pdf_bytes: bytes,
        original_filename: str,
        page_number: int,
        target_url_or_email: str,
        search_text: str = "",
        rect_coords: Optional[List[float]] = None,
    ) -> Dict[str, Any]:
        """
        Add a Web URL or Email hyperlink to source page.
        """
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")

        if not target_url_or_email or not target_url_or_email.strip():
            raise ValueError("Target URL or Email address cannot be empty.")

        target = target_url_or_email.strip()
        if not target.startswith("http://") and not target.startswith("https://") and not target.startswith("mailto:"):
            if "@" in target:
                target = "mailto:" + target
            else:
                target = "https://" + target

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = len(doc)
        src_p = max(1, min(total_pages, int(page_number or 1)))

        page = doc[src_p - 1]
        rect = None

        if rect_coords and isinstance(rect_coords, list) and len(rect_coords) == 4:
            rect = fitz.Rect(rect_coords[0], rect_coords[1], rect_coords[2], rect_coords[3])
        elif search_text and search_text.strip():
            quads = page.search_for(search_text.strip())
            if quads:
                rect = quads[0]

        if not rect:
            rect = fitz.Rect(50, 50, 250, 75)

        link_dict = {
            "kind": fitz.LINK_URI,
            "from": rect,
            "uri": target
        }
        page.insert_link(link_dict)

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)

        clean_filename = self.sanitize_filename(original_filename)
        out_filename = f"external_link_{clean_filename}"
        out_path = out_dir / out_filename

        output_bytes = doc.write(garbage=4, deflate=True)
        doc.close()

        out_path.write_bytes(output_bytes)

        return {
            "success": True,
            "session_id": session_id,
            "original_filename": clean_filename,
            "saved_filename": out_filename,
            "page": src_p,
            "target_uri": target,
            "download_url": f"/document-management/external-links/download/{session_id}",
        }

    def get_external_link_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        """Retrieve output PDF for download."""
        out_dir = Paths.request_output(session_id)
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()] if out_dir.exists() else []
        if not files:
            raise ValueError("External link PDF file not found for this session.")
        return files[0], files[0].name


external_links_service = ExternalLinksService()
