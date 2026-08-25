"""
Copyright Metadata Management Service — PDF Copyright Protection Section.

Reads and updates copyright-related PDF metadata fields including
Author, Copyright Holder, Publication Year, Copyright Notice, License,
License URL, Creator, Producer, Subject, and Keywords.  Preserves
all existing PDF content and unrelated metadata.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any, Dict, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024

MANAGED_FIELDS = [
    "author",
    "copyright_holder",
    "publication_year",
    "copyright_notice",
    "license",
    "license_url",
    "creator",
    "producer",
    "subject",
    "keywords",
]


class CopyrightMetadataManagementService:
    """Read and update copyright-related PDF metadata fields."""

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

    def read_metadata(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Extract copyright-related metadata from a PDF."""
        self._validate_pdf(pdf_bytes)

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")

        meta = doc.metadata or {}
        total_pages = len(doc)

        copyright_holder = ""
        publication_year = ""
        license_val = ""
        license_url = ""
        keywords = meta.get("keywords", "") or ""

        for part in keywords.split(";"):
            part = part.strip()
            if part.startswith("CopyrightOwner:"):
                copyright_holder = part.split(":", 1)[1].strip()
            elif part.startswith("CopyrightYear:"):
                publication_year = part.split(":", 1)[1].strip()
            elif part.startswith("License:"):
                license_val = part.split(":", 1)[1].strip()
            elif part.startswith("LicenseURL:"):
                license_url = part.split(":", 1)[1].strip()

        doc.close()

        return {
            "success": True,
            "total_pages": total_pages,
            "metadata": {
                "author": meta.get("author", "") or "",
                "copyright_holder": copyright_holder,
                "publication_year": publication_year,
                "copyright_notice": meta.get("subject", "") or "",
                "license": license_val,
                "license_url": license_url,
                "creator": meta.get("creator", "") or "",
                "producer": meta.get("producer", "") or "",
                "subject": meta.get("subject", "") or "",
                "keywords": meta.get("keywords", "") or "",
            },
        }

    def update_metadata(
        self,
        pdf_bytes: bytes,
        original_filename: str,
        session_id: str,
        author: str = "",
        copyright_holder: str = "",
        publication_year: str = "",
        copyright_notice: str = "",
        license: str = "",
        license_url: str = "",
        creator: str = "",
        producer: str = "",
        subject: str = "",
        keywords: str = "",
    ) -> Dict[str, Any]:
        """Update copyright-related metadata fields and save a new PDF."""
        self._validate_pdf(pdf_bytes)

        if publication_year.strip() and not re.match(r"^\d{4}$", publication_year.strip()):
            raise ValueError("Publication Year must be a 4-digit year (e.g. 2025).")

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")

        current_meta = doc.metadata or {}
        new_meta = dict(current_meta)

        if author.strip():
            new_meta["author"] = author.strip()
        if creator.strip():
            new_meta["creator"] = creator.strip()
        if producer.strip():
            new_meta["producer"] = producer.strip()
        if subject.strip():
            new_meta["subject"] = subject.strip()
        if copyright_notice.strip():
            new_meta["subject"] = copyright_notice.strip()
        if keywords.strip():
            new_meta["keywords"] = keywords.strip()

        doc.set_metadata(new_meta)

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        clean_name = self._sanitize_filename(original_filename)
        out_filename = f"copyright_metadata_{clean_name}"
        out_path = out_dir / out_filename

        output_bytes = doc.write()
        total_pages = len(doc)
        doc.close()
        out_path.write_bytes(output_bytes)

        return {
            "success": True,
            "session_id": session_id,
            "original_filename": clean_name,
            "saved_filename": out_filename,
            "total_pages": total_pages,
            "updated_metadata": {
                "author": author.strip(),
                "copyright_holder": copyright_holder.strip(),
                "publication_year": publication_year.strip(),
                "copyright_notice": copyright_notice.strip(),
                "license": license.strip(),
                "license_url": license_url.strip(),
                "creator": creator.strip(),
                "producer": producer.strip(),
                "subject": subject.strip(),
                "keywords": keywords.strip(),
            },
            "download_url": f"/pdf-copyright-protection/metadata/download/{session_id}",
            "message": "Copyright metadata updated successfully.",
        }

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Processed PDF not found for this session.")
        return files[0], files[0].name


copyright_metadata_management_service = CopyrightMetadataManagementService()
