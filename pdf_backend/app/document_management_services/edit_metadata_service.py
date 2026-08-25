"""
Edit Metadata Service — Document Management Section.

Allows users to view and modify PDF document metadata properties:
Features:
  - Extract document properties: Title, Author, Subject, Keywords, Creator, Producer, Creation & Modification dates
  - Modify and update metadata dictionary fields
  - Improve document searchability, file indexing, and enterprise document organization
  - Save modified PDF document with updated metadata
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


class EditMetadataService:
    """Enterprise service for reading and updating PDF document metadata."""

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and unsafe characters."""
        if not filename:
            return "document.pdf"
        clean = Path(filename).name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document.pdf"

    def extract_metadata(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Extract PDF document metadata dictionary.
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

        meta = doc.metadata or {}
        total_pages = len(doc)
        doc.close()

        return {
            "success": True,
            "total_pages": total_pages,
            "metadata": {
                "title": meta.get("title", "") or "",
                "author": meta.get("author", "") or "",
                "subject": meta.get("subject", "") or "",
                "keywords": meta.get("keywords", "") or "",
                "creator": meta.get("creator", "") or "",
                "producer": meta.get("producer", "") or "",
                "creation_date": meta.get("creationDate", "") or "",
                "mod_date": meta.get("modDate", "") or "",
                "format": meta.get("format", "PDF 1.4") or "",
            }
        }

    def update_metadata(
        self,
        session_id: str,
        pdf_bytes: bytes,
        original_filename: str,
        title: str = "",
        author: str = "",
        subject: str = "",
        keywords: str = "",
        creator: str = "",
        producer: str = "",
    ) -> Dict[str, Any]:
        """
        Update metadata fields of PDF document and save output.
        """
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        current_meta = doc.metadata or {}

        new_meta = {
            "title": title.strip() if title is not None else current_meta.get("title", ""),
            "author": author.strip() if author is not None else current_meta.get("author", ""),
            "subject": subject.strip() if subject is not None else current_meta.get("subject", ""),
            "keywords": keywords.strip() if keywords is not None else current_meta.get("keywords", ""),
            "creator": creator.strip() if creator is not None else current_meta.get("creator", ""),
            "producer": producer.strip() if producer is not None else current_meta.get("producer", ""),
        }

        doc.set_metadata(new_meta)

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)

        clean_filename = self.sanitize_filename(original_filename)
        out_filename = f"metadata_updated_{clean_filename}"
        out_path = out_dir / out_filename

        output_bytes = doc.write()
        doc.close()

        out_path.write_bytes(output_bytes)

        return {
            "success": True,
            "session_id": session_id,
            "original_filename": clean_filename,
            "saved_filename": out_filename,
            "updated_metadata": new_meta,
            "download_url": f"/document-management/edit-metadata/download/{session_id}",
        }

    def get_metadata_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        """Retrieve output PDF for download."""
        out_dir = Paths.request_output(session_id)
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()] if out_dir.exists() else []
        if not files:
            raise ValueError("Metadata updated PDF file not found for this session.")
        return files[0], files[0].name


edit_metadata_service = EditMetadataService()
