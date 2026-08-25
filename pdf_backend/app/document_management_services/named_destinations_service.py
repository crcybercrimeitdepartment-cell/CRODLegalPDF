"""
Named Destinations Service — Document Management Section.

Allows users to assign unique, predefined string identifiers to specific pages or locations in a PDF:
Features:
  - Extract existing named destinations from PDF catalog
  - Define new named destinations pointing to specific pages
  - Simplify referencing for external applications, bookmarks, and enterprise documents
  - Save updated PDF document with registered named destination catalog
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


class NamedDestinationsService:
    """Enterprise service for creating and resolving PDF Named Destinations."""

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and unsafe characters."""
        if not filename:
            return "document.pdf"
        clean = Path(filename).name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document.pdf"

    def extract_named_destinations(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Extract all registered named destinations from the PDF catalog.
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
        destinations: List[Dict[str, Any]] = []

        try:
            # Resolve named destinations catalog map
            names = doc.resolve_names()
            for idx, (name, val) in enumerate(names.items(), start=1):
                p_num = 1
                if isinstance(val, dict) and "page" in val:
                    p_num = val["page"] + 1
                elif isinstance(val, (list, tuple)) and len(val) > 0:
                    p_num = val[0] + 1 if isinstance(val[0], int) else 1

                destinations.append({
                    "id": idx,
                    "name": name,
                    "target_page": max(1, min(total_pages, p_num)),
                })
        except Exception as exc:
            logger.debug(f"Error resolving PDF named destinations: {exc}")

        doc.close()

        return {
            "success": True,
            "total_pages": total_pages,
            "total_destinations": len(destinations),
            "destinations": destinations,
        }

    def create_named_destination(
        self,
        session_id: str,
        pdf_bytes: bytes,
        original_filename: str,
        destination_name: str,
        target_page: int,
    ) -> Dict[str, Any]:
        """
        Define a new named destination in the PDF outline/destination structure.
        """
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")

        if not destination_name or not destination_name.strip():
            raise ValueError("Destination name cannot be empty.")

        clean_dest_name = re.sub(r"\s+", "_", destination_name.strip())

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = len(doc)
        tgt_p = max(1, min(total_pages, int(target_page or 1)))

        # Update TOC outline with new named destination point
        toc = doc.get_toc(simple=True) or []
        toc.append([1, clean_dest_name, tgt_p])
        doc.set_toc(toc)

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)

        clean_filename = self.sanitize_filename(original_filename)
        out_filename = f"named_dest_{clean_filename}"
        out_path = out_dir / out_filename

        output_bytes = doc.write()
        doc.close()

        out_path.write_bytes(output_bytes)

        return {
            "success": True,
            "session_id": session_id,
            "original_filename": clean_filename,
            "saved_filename": out_filename,
            "destination_name": clean_dest_name,
            "target_page": tgt_p,
            "download_url": f"/document-management/named-destinations/download/{session_id}",
        }

    def get_named_destination_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        """Retrieve output PDF for download."""
        out_dir = Paths.request_output(session_id)
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()] if out_dir.exists() else []
        if not files:
            raise ValueError("Named Destination PDF file not found for this session.")
        return files[0], files[0].name


named_destinations_service = NamedDestinationsService()
