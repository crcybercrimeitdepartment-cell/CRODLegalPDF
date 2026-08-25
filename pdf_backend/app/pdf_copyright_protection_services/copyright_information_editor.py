"""
Copyright Information Editor Service — PDF Copyright Protection Section.

Reads existing copyright-related metadata from a PDF, allows the user
to edit those fields, saves the updated metadata while preserving
unrelated metadata and all PDF content, and returns a downloadable PDF.
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


class CopyrightInformationEditorService:
    """Read and update copyright-related information in a PDF."""

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

    def read_copyright_info(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Extract copyright-related metadata from a PDF."""
        self._validate_pdf(pdf_bytes)

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")

        meta = doc.metadata or {}
        total_pages = len(doc)

        author = meta.get("author", "") or ""
        organization = meta.get("creator", "") or ""
        copyright_notice = meta.get("subject", "") or ""
        keywords = meta.get("keywords", "") or ""

        copyright_owner = ""
        copyright_year = ""
        registration_number = ""
        notes = ""

        for part in keywords.split(";"):
            part = part.strip()
            if part.startswith("CopyrightOwner:"):
                copyright_owner = part.split(":", 1)[1].strip()
            elif part.startswith("CopyrightYear:"):
                copyright_year = part.split(":", 1)[1].strip()
            elif part.startswith("Registration:"):
                registration_number = part.split(":", 1)[1].strip()
            elif part.startswith("Notes:"):
                notes = part.split(":", 1)[1].strip()

        if not copyright_owner:
            copyright_owner = author

        doc.close()

        return {
            "success": True,
            "total_pages": total_pages,
            "copyright_info": {
                "copyright_owner": copyright_owner,
                "author": author,
                "organization": organization,
                "copyright_year": copyright_year,
                "copyright_notice": copyright_notice,
                "registration_number": registration_number,
                "notes": notes,
            },
        }

    def update_copyright_info(
        self,
        pdf_bytes: bytes,
        original_filename: str,
        session_id: str,
        copyright_owner: str = "",
        author: str = "",
        organization: str = "",
        copyright_year: str = "",
        copyright_notice: str = "",
        registration_number: str = "",
        notes: str = "",
    ) -> Dict[str, Any]:
        """Update copyright-related metadata and save a new PDF."""
        self._validate_pdf(pdf_bytes)

        if copyright_year.strip() and not re.match(r"^\d{4}$", copyright_year.strip()):
            raise ValueError("Copyright Year must be a 4-digit year (e.g. 2025).")

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")

        current_meta = doc.metadata or {}
        new_meta = dict(current_meta)

        if author.strip():
            new_meta["author"] = author.strip()
        elif "author" in new_meta:
            pass  # preserve existing

        if organization.strip():
            new_meta["creator"] = organization.strip()

        if copyright_notice.strip():
            new_meta["subject"] = copyright_notice.strip()

        existing_keywords = current_meta.get("keywords", "") or ""
        if registration_number.strip():
            reg_keyword = f"Registration: {registration_number.strip()}"
            if reg_keyword not in existing_keywords:
                new_meta["keywords"] = f"{existing_keywords}; {reg_keyword}".strip("; ") if existing_keywords else reg_keyword

        doc.set_metadata(new_meta)

        current_meta = doc.metadata or {}
        new_meta = dict(current_meta)
        if author.strip():
            new_meta["author"] = author.strip()
        if organization.strip():
            new_meta["creator"] = organization.strip()
        if copyright_owner.strip():
            existing_title = current_meta.get("title", "") or ""
            suffix = " — Copyright Registration"
            if existing_title and suffix not in existing_title:
                new_meta["title"] = existing_title + suffix
            elif not existing_title:
                new_meta["title"] = f"{copyright_owner.strip()}{suffix}"

        notice_text = copyright_notice.strip()
        if not notice_text and copyright_owner.strip():
            notice_text = f"All rights reserved by {copyright_owner.strip()}."
        if notice_text:
            new_meta["subject"] = notice_text

        keywords_list = []
        if copyright_owner.strip():
            keywords_list.append(f"CopyrightOwner: {copyright_owner.strip()}")
        if organization.strip():
            keywords_list.append(f"Organization: {organization.strip()}")
        if copyright_year.strip():
            keywords_list.append(f"CopyrightYear: {copyright_year.strip()}")
        if registration_number.strip():
            keywords_list.append(f"Registration: {registration_number.strip()}")
        if notes.strip():
            keywords_list.append(f"Notes: {notes.strip()}")
        existing_keywords = current_meta.get("keywords", "") or ""
        if existing_keywords:
            keywords_list.insert(0, existing_keywords)
        if keywords_list:
            new_meta["keywords"] = "; ".join(keywords_list)

        doc.set_metadata(new_meta)

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        clean_name = self._sanitize_filename(original_filename)
        out_filename = f"copyright_updated_{clean_name}"
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
            "updated_copyright_info": {
                "copyright_owner": copyright_owner.strip(),
                "author": author.strip(),
                "organization": organization.strip(),
                "copyright_year": copyright_year.strip(),
                "copyright_notice": copyright_notice.strip(),
                "registration_number": registration_number.strip(),
                "notes": notes.strip(),
            },
            "download_url": f"/pdf-copyright-protection/information-editor/download/{session_id}",
            "message": "Copyright information updated successfully.",
        }

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Processed PDF not found for this session.")
        return files[0], files[0].name


copyright_information_editor_service = CopyrightInformationEditorService()
