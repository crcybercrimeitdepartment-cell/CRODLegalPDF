"""
Hyperlink Support Service — Document Management Section.

Allows users to create, view, edit, and remove interactive hyperlinks inside PDF documents:
Features:
  - Extract existing external Web URLs (http/https), Email addresses (mailto:), and internal page jump links
  - Add new clickable URL links, page jump links, or email link annotations to specified page regions
  - Edit or delete hyperlink annotations
  - Output interactive PDF document generation and session download
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


class HyperlinkSupportService:
    """Enterprise service for extracting and managing hyperlinks in PDF documents."""

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and unsafe characters."""
        if not filename:
            return "document.pdf"
        clean = Path(filename).name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document.pdf"

    def extract_hyperlinks(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Extract all existing links (URLs, emails, internal page jumps) from PDF document.
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
        links: List[Dict[str, Any]] = []
        link_id = 1

        for page_idx in range(total_pages):
            page = doc[page_idx]
            page_links = page.get_links() or []

            for l in page_links:
                kind = l.get("kind", 0)
                rect = [round(c, 2) for c in list(l.get("from", [0, 0, 0, 0]))]
                uri = l.get("uri", "")
                target_page = l.get("page", 0) + 1 if "page" in l else None

                link_type = "URI / Web"
                if kind == fitz.LINK_GOTO:
                    link_type = "Internal Page Jump"
                    uri = f"Jump to Page {target_page}"
                elif uri.startswith("mailto:"):
                    link_type = "Email Address"

                links.append({
                    "id": link_id,
                    "page": page_idx + 1,
                    "type": link_type,
                    "uri": uri,
                    "target_page": target_page,
                    "rect": rect,
                })
                link_id += 1

        doc.close()

        return {
            "success": True,
            "total_pages": total_pages,
            "total_links": len(links),
            "links": links,
        }

    def apply_hyperlinks(
        self,
        session_id: str,
        pdf_bytes: bytes,
        original_filename: str,
        links_to_add: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Add new Web URLs or Internal Page Jump hyperlinks to PDF document.
        """
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = len(doc)
        added_count = 0

        for item in links_to_add:
            p_num = max(1, min(total_pages, int(item.get("page", 1))))
            page = doc[p_num - 1]

            link_type = str(item.get("type", "url")).lower()
            target = str(item.get("target", "")).strip()

            # Coordinates or search text
            rect_coords = item.get("rect")
            search_text = item.get("search_text", "").strip()

            rect = None
            has_matched_text = False
            if rect_coords and isinstance(rect_coords, list) and len(rect_coords) == 4:
                rect = fitz.Rect(rect_coords[0], rect_coords[1], rect_coords[2], rect_coords[3])
                has_matched_text = True
            elif search_text:
                quads = page.search_for(search_text)
                if quads:
                    rect = quads[0]
                    has_matched_text = True

            if not rect:
                # Default position box on top of page if no rect provided
                rect = fitz.Rect(50, 50, 250, 75)

            if link_type in ["url", "web", "uri"]:
                if not target.startswith("http://") and not target.startswith("https://") and not target.startswith("mailto:"):
                    target = "https://" + target
                link_dict = {"kind": fitz.LINK_URI, "from": rect, "uri": target}
                page.insert_link(link_dict)
                if has_matched_text:
                    p1 = fitz.Point(rect.x0, rect.y1 + 1)
                    p2 = fitz.Point(rect.x1, rect.y1 + 1)
                    page.draw_line(p1, p2, color=(0.1, 0.4, 0.9), width=1)
                added_count += 1

            elif link_type in ["page", "goto", "jump"]:
                try:
                    t_page = max(1, min(total_pages, int(target)))
                    link_dict = {"kind": fitz.LINK_GOTO, "from": rect, "page": t_page - 1}
                    page.insert_link(link_dict)
                    if has_matched_text:
                        p1 = fitz.Point(rect.x0, rect.y1 + 1)
                        p2 = fitz.Point(rect.x1, rect.y1 + 1)
                        page.draw_line(p1, p2, color=(0.1, 0.4, 0.9), width=1)
                    added_count += 1
                except ValueError:
                    pass

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)

        clean_filename = self.sanitize_filename(original_filename)
        out_filename = f"hyperlinked_{clean_filename}"
        out_path = out_dir / out_filename

        output_bytes = doc.write(garbage=4, deflate=True)
        doc.close()

        out_path.write_bytes(output_bytes)

        return {
            "success": True,
            "session_id": session_id,
            "original_filename": clean_filename,
            "saved_filename": out_filename,
            "total_links_added": added_count,
            "download_url": f"/document-management/hyperlink-support/download/{session_id}",
        }

    def get_hyperlink_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        """Retrieve output PDF for download."""
        out_dir = Paths.request_output(session_id)
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()] if out_dir.exists() else []
        if not files:
            raise ValueError("Hyperlinked PDF file not found for this session.")
        return files[0], files[0].name


hyperlink_support_service = HyperlinkSupportService()
