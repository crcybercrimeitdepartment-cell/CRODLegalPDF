"""
Publisher Information Service — PDF Copyright Protection Section.

Reads and updates publisher-related PDF metadata fields including
Publisher Name, Organization, Publication Date, Contact Information,
Publisher Website, and Publication/Reference ID.  Preserves all
unrelated existing PDF metadata.
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


class PublisherInformationService:
    """Read and update publisher-related PDF metadata."""

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

    def read_publisher_info(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Extract publisher-related metadata from a PDF."""
        self._validate_pdf(pdf_bytes)

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")

        meta = doc.metadata or {}
        total_pages = len(doc)

        publisher_name = meta.get("creator", "") or ""
        pub_organization = ""
        pub_date = ""
        contact_info = ""
        pub_website = ""
        pub_ref_id = ""
        keywords = meta.get("keywords", "") or ""

        for part in keywords.split(";"):
            part = part.strip()
            if part.startswith("Publisher:"):
                publisher_name = part.split(":", 1)[1].strip()
            elif part.startswith("PublisherOrg:"):
                pub_organization = part.split(":", 1)[1].strip()
            elif part.startswith("PublicationDate:"):
                pub_date = part.split(":", 1)[1].strip()
            elif part.startswith("Contact:"):
                contact_info = part.split(":", 1)[1].strip()
            elif part.startswith("Website:"):
                pub_website = part.split(":", 1)[1].strip()
            elif part.startswith("RefID:"):
                pub_ref_id = part.split(":", 1)[1].strip()

        doc.close()

        return {
            "success": True,
            "total_pages": total_pages,
            "publisher_info": {
                "publisher_name": publisher_name,
                "organization": pub_organization,
                "publication_date": pub_date,
                "contact_information": contact_info,
                "publisher_website": pub_website,
                "publication_ref_id": pub_ref_id,
                "existing_author": meta.get("author", "") or "",
                "existing_creator": meta.get("creator", "") or "",
            },
        }

    def update_publisher_info(
        self,
        pdf_bytes: bytes,
        original_filename: str,
        session_id: str,
        publisher_name: str = "",
        organization: str = "",
        publication_date: str = "",
        contact_information: str = "",
        publisher_website: str = "",
        publication_ref_id: str = "",
    ) -> Dict[str, Any]:
        """Update publisher-related metadata and save a new PDF."""
        self._validate_pdf(pdf_bytes)

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")

        current_meta = doc.metadata or {}
        new_meta = dict(current_meta)
        if publisher_name.strip():
            new_meta["creator"] = publisher_name.strip()
        keywords_list = []
        if publisher_name.strip():
            keywords_list.append(f"Publisher: {publisher_name.strip()}")
        if organization.strip():
            keywords_list.append(f"PublisherOrg: {organization.strip()}")
        if publication_date.strip():
            keywords_list.append(f"PublicationDate: {publication_date.strip()}")
        if contact_information.strip():
            keywords_list.append(f"Contact: {contact_information.strip()}")
        if publisher_website.strip():
            keywords_list.append(f"Website: {publisher_website.strip()}")
        if publication_ref_id.strip():
            keywords_list.append(f"RefID: {publication_ref_id.strip()}")
        existing_keywords = current_meta.get("keywords", "") or ""
        if existing_keywords:
            keywords_list.insert(0, existing_keywords)
        if keywords_list:
            new_meta["keywords"] = "; ".join(keywords_list)
        doc.set_metadata(new_meta)

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        clean_name = self._sanitize_filename(original_filename)
        out_filename = f"publisher_{clean_name}"
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
            "updated_publisher_info": {
                "publisher_name": publisher_name.strip(),
                "organization": organization.strip(),
                "publication_date": publication_date.strip(),
                "contact_information": contact_information.strip(),
                "publisher_website": publisher_website.strip(),
                "publication_ref_id": publication_ref_id.strip(),
            },
            "download_url": f"/pdf-copyright-protection/publisher/download/{session_id}",
            "message": "Publisher information updated successfully.",
        }

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Processed PDF not found for this session.")
        return files[0], files[0].name


publisher_information_service = PublisherInformationService()
