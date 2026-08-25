"""
Add Attachments Service — Document Management Section.

Embeds one or more supporting files into an existing PDF document:
  - Validates the host PDF
  - Validates each attachment file
  - Preserves existing PDF pages, content, and embedded attachments
  - Handles duplicate filenames safely (rejects, does not overwrite)
  - Sanitizes filenames to prevent path traversal
  - Returns the updated PDF for download
  - Uses PyMuPDF (fitz) via file_attachments_service for embedded file operations
"""

from __future__ import annotations

import logging
import re
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths
from app.document_management_services.file_attachments_service import file_attachments_service

logger = logging.getLogger(__name__)

MAX_PDF_SIZE_BYTES = 100 * 1024 * 1024
MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024
MAX_ATTACHMENT_NAME_LENGTH = 200


class AddAttachmentsService:
    """Focused service for embedding files into a PDF document."""

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and unsafe characters."""
        if not filename:
            return "document.pdf"
        clean = Path(filename).name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document.pdf"

    def sanitize_attachment_name(self, name: str) -> str:
        """Sanitize embedded attachment name."""
        if not name:
            return "attachment"
        clean = re.sub(r'[\\/:*?"<>|]', "_", name)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        if len(clean) > MAX_ATTACHMENT_NAME_LENGTH:
            clean = clean[:MAX_ATTACHMENT_NAME_LENGTH]
        return clean or "attachment"

    def validate_pdf(self, pdf_bytes: bytes) -> Tuple[bool, str, fitz.Document]:
        """Validate PDF bytes. Returns (is_valid, error_message, opened_doc).

        The caller MUST close the returned document when done.
        """
        if not pdf_bytes or len(pdf_bytes) == 0:
            return False, "Uploaded file is empty (0 bytes).", None

        if len(pdf_bytes) > MAX_PDF_SIZE_BYTES:
            size_mb = len(pdf_bytes) / (1024 * 1024)
            return False, f"File size ({size_mb:.1f} MB) exceeds maximum limit of 100 MB.", None

        if not pdf_bytes.startswith(b"%PDF"):
            return False, "Not a valid PDF document (missing %PDF header).", None

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as e:
            logger.warning(f"Failed to open PDF: {e}")
            return False, "Corrupted or unreadable PDF document.", None

        if doc.is_encrypted:
            doc.close()
            return False, "PDF is encrypted or password-protected. Please decrypt it first.", None

        return True, "", doc

    def validate_attachment(self, filename: str, file_bytes: bytes) -> Tuple[bool, str]:
        """Validate a single attachment file before embedding."""
        if not file_bytes or len(file_bytes) == 0:
            return False, "Attachment file is empty (0 bytes)."

        if len(file_bytes) > MAX_ATTACHMENT_SIZE_BYTES:
            size_mb = len(file_bytes) / (1024 * 1024)
            return False, f"Attachment size ({size_mb:.1f} MB) exceeds maximum limit of 50 MB."

        if not filename or not filename.strip():
            return False, "Attachment filename is required."

        return True, ""

    def validate_attachment_name(self, name: str) -> Tuple[bool, str]:
        """Validate an attachment name for embedding."""
        if not name or not name.strip():
            return False, "Attachment name cannot be empty."
        name = name.strip()
        if len(name) > MAX_ATTACHMENT_NAME_LENGTH:
            return False, f"Attachment name exceeds maximum length of {MAX_ATTACHMENT_NAME_LENGTH} characters."
        if re.search(r'[\\/:*?"<>|]', name):
            return False, "Attachment name contains invalid characters."
        return True, ""

    def _format_file_size(self, size_bytes: int) -> str:
        """Format file size to human-readable string."""
        if size_bytes == 0:
            return "0 B"
        k = 1024
        sizes = ["B", "KB", "MB", "GB"]
        i = min(int(__import__("math").log(size_bytes) / __import__("math").log(k)), len(sizes) - 1)
        return f"{size_bytes / k**i:.1f} {sizes[i]}"

    def _get_file_extension(self, filename: str) -> str:
        """Extract file extension from filename."""
        if not filename:
            return ""
        p = Path(filename)
        return p.suffix.lstrip(".").upper() if p.suffix else "UNKNOWN"

    def prepare_attachment(self, filename: str, file_bytes: bytes, description: str = "") -> Dict[str, Any]:
        """Prepare a single attachment dict for embedding.

        Returns a dict with sanitized name, filename, bytes, and metadata.
        Raises ValueError if validation fails.
        """
        clean_name = self.sanitize_attachment_name(filename)
        clean_filename = Path(filename).name if filename else clean_name

        is_valid, err = self.validate_attachment_name(clean_name)
        if not is_valid:
            raise ValueError(err)

        is_valid, err = self.validate_attachment_file(clean_filename, file_bytes)
        if not is_valid:
            raise ValueError(err)

        return {
            "name": clean_name,
            "filename": clean_filename,
            "bytes": file_bytes,
            "description": description,
            "extension": self._get_file_extension(clean_filename),
            "size": len(file_bytes),
            "size_human": self._format_file_size(len(file_bytes)),
        }

    def validate_attachment_file(self, filename: str, file_bytes: bytes) -> Tuple[bool, str]:
        """Validate an attachment file before adding."""
        if not file_bytes or len(file_bytes) == 0:
            return False, "Attachment file is empty (0 bytes)."
        if len(file_bytes) > MAX_ATTACHMENT_SIZE_BYTES:
            size_mb = len(file_bytes) / (1024 * 1024)
            return False, f"Attachment size ({size_mb:.1f} MB) exceeds maximum limit of 50 MB."
        if not filename or not filename.strip():
            return False, "Attachment filename is required."
        return True, ""

    def preserve_existing_attachments(self, pdf_bytes: bytes) -> List[Dict[str, Any]]:
        """Read existing attachments from a PDF for preservation.

        Returns a list of dicts with name, filename, description, bytes.
        """
        existing = []
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            count = doc.embfile_count()
            for i in range(count):
                try:
                    info = doc.embfile_info(i)
                    name = info.get("name", "")
                    data = doc.embfile_get(i)
                    filename = info.get("filename") or info.get("ufilename") or name
                    description = info.get("description", "")
                    existing.append({
                        "name": name,
                        "filename": filename,
                        "bytes": data,
                        "description": description,
                    })
                except Exception as e:
                    logger.warning(f"Error reading existing attachment at index {i}: {e}")
                    continue
            doc.close()
        except Exception as e:
            logger.warning(f"Error reading existing attachments: {e}")
        return existing

    def add_single_attachment(
        self,
        session_id: str,
        pdf_bytes: bytes,
        original_filename: str,
        attachment_name: str,
        attachment_bytes: bytes,
        attachment_filename: str = "",
        description: str = "",
    ) -> Dict[str, Any]:
        """Add a single file attachment to a PDF.

        Preserves existing attachments.
        Returns dict with success, output filename, download URL.
        """
        new_att = self.prepare_attachment(
            filename=attachment_filename or attachment_name,
            file_bytes=attachment_bytes,
            description=description,
        )
        new_att["name"] = self.sanitize_attachment_name(attachment_name)

        return file_attachments_service.add_attachments(
            session_id=session_id,
            pdf_bytes=pdf_bytes,
            original_filename=original_filename,
            new_attachments=[new_att],
        )

    def add_multiple_attachments(
        self,
        session_id: str,
        pdf_bytes: bytes,
        original_filename: str,
        attachments: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Add multiple file attachments to a PDF.

        Each attachment dict should have: name, filename, bytes, description (optional).
        Preserves existing attachments.
        Returns dict with success, added count, skipped duplicates, download URL.
        """
        prepared = []
        for att in attachments:
            try:
                att_bytes = att.get("bytes", b"")
                att_filename = att.get("filename", att.get("name", "attachment"))

                prepared_att = self.prepare_attachment(
                    filename=att_filename,
                    file_bytes=att_bytes,
                    description=att.get("description", ""),
                )
                prepared_att["name"] = self.sanitize_attachment_name(att.get("name", att_filename))
                prepared.append(prepared_att)
            except ValueError as e:
                logger.warning(f"Skipping attachment '{att.get('name', '?')}': {e}")
                continue

        if not prepared:
            raise ValueError("No valid attachments to add.")

        return file_attachments_service.add_attachments(
            session_id=session_id,
            pdf_bytes=pdf_bytes,
            original_filename=original_filename,
            new_attachments=prepared,
        )

    def create_updated_pdf(
        self,
        session_id: str,
        pdf_bytes: bytes,
        original_filename: str,
        attachments: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Create an updated PDF with embedded attachments.

        This is the main entry point for adding attachments.
        Validates inputs, embeds files, and returns the result.
        """
        is_valid, err_msg, doc = self.validate_pdf(pdf_bytes)
        if not is_valid:
            raise ValueError(err_msg)

        if doc:
            doc.close()

        if not attachments or len(attachments) == 0:
            raise ValueError("No attachments provided.")

        return self.add_multiple_attachments(
            session_id=session_id,
            pdf_bytes=pdf_bytes,
            original_filename=original_filename,
            attachments=attachments,
        )

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        """Retrieve output PDF for download."""
        return file_attachments_service.get_file_for_download(session_id)


add_attachments_service = AddAttachmentsService()
