"""
File Attachments Service — Document Management Section.

Manages embedded file attachments within PDF documents:
  - Read/list all embedded file attachments from a PDF
  - Add single or multiple file attachments
  - Download/extract an embedded attachment
  - Remove/delete an embedded attachment
  - Get attachment details/metadata
  - Save modified PDF with attachment changes
  - Uses PyMuPDF (fitz) for all embedded file operations
"""

from __future__ import annotations

import logging
import re
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024
MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024
MAX_ATTACHMENT_NAME_LENGTH = 200


class FileAttachmentsService:
    """Enterprise service for managing embedded file attachments in PDF documents."""

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

    def validate_pdf(self, pdf_bytes: bytes) -> fitz.Document:
        """Validate PDF bytes and return opened fitz.Document."""
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            size_mb = len(pdf_bytes) / (1024 * 1024)
            raise ValueError(f"File size ({size_mb:.1f} MB) exceeds maximum limit of 100 MB.")
        if not pdf_bytes.startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as e:
            logger.warning(f"Failed to open PDF: {e}")
            raise ValueError("Corrupted or unreadable PDF document.")

        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected. Please decrypt it first.")

        return doc

    def validate_attachment_name(self, name: str) -> Tuple[bool, str]:
        """Validate an attachment name."""
        if not name or not name.strip():
            return False, "Attachment name cannot be empty."
        name = name.strip()
        if len(name) > MAX_ATTACHMENT_NAME_LENGTH:
            return False, f"Attachment name exceeds maximum length of {MAX_ATTACHMENT_NAME_LENGTH} characters."
        if re.search(r'[\\/:*?"<>|]', name):
            return False, "Attachment name contains invalid characters."
        return True, ""

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

    def read_attachments(self, pdf_bytes: bytes) -> List[Dict[str, Any]]:
        """Read all embedded file attachments from a PDF.

        Returns a list of attachment metadata dictionaries with:
        - index: position index in the embedded files array
        - name: attachment name/identifier
        - filename: original filename
        - extension: file extension
        - description: attachment description
        - size: file size in bytes
        - size_human: human-readable file size
        - creation_date: creation date string
        - modification_date: modification date string
        """
        doc = self.validate_pdf(pdf_bytes)

        try:
            attachments = []
            count = doc.embfile_count()

            for i in range(count):
                try:
                    info = doc.embfile_info(i)
                    name = info.get("name", "")
                    filename = info.get("filename") or info.get("ufilename") or name
                    description = info.get("description", "")
                    size = info.get("size", 0) or info.get("length", 0)
                    creation_date = info.get("creationDate", "")
                    modification_date = info.get("modDate", "")

                    attachments.append({
                        "index": i,
                        "name": name,
                        "filename": filename,
                        "extension": self._get_file_extension(filename),
                        "description": description,
                        "size": size,
                        "size_human": self._format_file_size(size),
                        "creation_date": creation_date,
                        "modification_date": modification_date,
                    })
                except Exception as e:
                    logger.warning(f"Error reading attachment info at index {i}: {e}")
                    continue

            return attachments

        finally:
            doc.close()

    def analyze_pdf(self, pdf_bytes: bytes, original_filename: str) -> Dict[str, Any]:
        """Analyze PDF and return file info plus existing attachments."""
        doc = self.validate_pdf(pdf_bytes)

        try:
            file_info = {
                "filename": original_filename or "document.pdf",
                "file_size": len(pdf_bytes),
                "file_size_human": self._format_file_size(len(pdf_bytes)),
                "mime_type": "application/pdf",
                "page_count": doc.page_count,
            }

            attachments = []
            count = doc.embfile_count()
            for i in range(count):
                try:
                    info = doc.embfile_info(i)
                    name = info.get("name", "")
                    filename = info.get("filename") or info.get("ufilename") or name
                    description = info.get("description", "")
                    size = info.get("size", 0) or info.get("length", 0)
                    creation_date = info.get("creationDate", "")
                    modification_date = info.get("modDate", "")

                    attachments.append({
                        "index": i,
                        "name": name,
                        "filename": filename,
                        "extension": self._get_file_extension(filename),
                        "description": description,
                        "size": size,
                        "size_human": self._format_file_size(size),
                        "creation_date": creation_date,
                        "modification_date": modification_date,
                    })
                except Exception as e:
                    logger.warning(f"Error reading attachment at index {i}: {e}")
                    continue

            return {
                "success": True,
                "file_info": file_info,
                "attachments": attachments,
                "attachment_count": len(attachments),
            }

        finally:
            doc.close()

    def add_attachments(
        self,
        session_id: str,
        pdf_bytes: bytes,
        original_filename: str,
        new_attachments: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Add one or more file attachments to a PDF.

        Args:
            session_id: session identifier for output storage
            pdf_bytes: original PDF bytes
            original_filename: original PDF filename
            new_attachments: list of dicts with 'name', 'filename', 'bytes' keys

        Returns:
            dict with success status, attachment count, download URL
        """
        doc = self.validate_pdf(pdf_bytes)

        try:
            # Check for duplicate names among new attachments
            existing_names = set()
            for i in range(doc.embfile_count()):
                try:
                    info = doc.embfile_info(i)
                    existing_names.add(info.get("name", "").lower())
                except Exception:
                    continue

            added_count = 0
            skipped_duplicates = []

            for att in new_attachments:
                att_name = self.sanitize_attachment_name(att.get("name", ""))
                att_filename = att.get("filename", att_name)
                att_desc = att.get("description", "")

                # Handle both raw bytes and base64-encoded data
                att_bytes = att.get("bytes", b"")
                if not att_bytes and att.get("bytes_b64"):
                    try:
                        import base64
                        att_bytes = base64.b64decode(att["bytes_b64"])
                    except Exception:
                        logger.warning(f"Skipping attachment '{att_name}': invalid base64 data")
                        continue

                # Validate
                is_valid, err_msg = self.validate_attachment_name(att_name)
                if not is_valid:
                    logger.warning(f"Skipping attachment '{att_name}': {err_msg}")
                    continue

                is_valid, err_msg = self.validate_attachment_file(att_filename, att_bytes)
                if not is_valid:
                    logger.warning(f"Skipping attachment '{att_name}': {err_msg}")
                    continue

                # Check duplicate
                name_lower = att_name.lower()
                if name_lower in existing_names:
                    skipped_duplicates.append(att_name)
                    continue

                # Add attachment
                try:
                    doc.embfile_add(
                        name=att_name,
                        buffer_=att_bytes,
                        filename=att_filename,
                        ufilename=att_filename,
                        desc=att_desc,
                    )
                    existing_names.add(name_lower)
                    added_count += 1
                except Exception as e:
                    logger.error(f"Error adding attachment '{att_name}': {e}")
                    continue

            # Save output
            out_dir = Paths.request_output(session_id)
            out_dir.mkdir(parents=True, exist_ok=True)

            clean_filename = self.sanitize_filename(original_filename)
            out_filename = f"attachments_{clean_filename}"
            out_path = out_dir / out_filename

            output_bytes = doc.write()
            doc.close()

            out_path.write_bytes(output_bytes)

            # Re-count attachments in output
            out_doc = fitz.open(stream=output_bytes, filetype="pdf")
            final_count = out_doc.embfile_count()
            out_doc.close()

            return {
                "success": True,
                "session_id": session_id,
                "original_filename": clean_filename,
                "saved_filename": out_filename,
                "added_count": added_count,
                "skipped_duplicates": skipped_duplicates,
                "total_attachments": final_count,
                "download_url": f"/document-management/file-attachments/download/{session_id}",
            }

        except Exception:
            doc.close()
            raise

    def download_attachment(
        self,
        pdf_bytes: bytes,
        attachment_name: str,
    ) -> Tuple[bytes, str, str]:
        """Extract and download a single embedded attachment.

        Returns:
            tuple of (attachment_bytes, filename, content_type)
        """
        doc = self.validate_pdf(pdf_bytes)

        try:
            count = doc.embfile_count()
            if count == 0:
                raise ValueError("PDF has no embedded file attachments.")

            # Find by name
            target_index = -1
            for i in range(count):
                try:
                    info = doc.embfile_info(i)
                    if info.get("name", "") == attachment_name:
                        target_index = i
                        break
                except Exception:
                    continue

            if target_index < 0:
                raise ValueError(f"Attachment '{attachment_name}' not found in PDF.")

            # Get file data
            file_data = doc.embfile_get(target_index)
            info = doc.embfile_info(target_index)
            filename = info.get("filename") or info.get("ufilename") or attachment_name

            # Guess content type from extension
            ext = self._get_file_extension(filename).lower()
            content_type_map = {
                "pdf": "application/pdf",
                "txt": "text/plain",
                "json": "application/json",
                "xml": "application/xml",
                "csv": "text/csv",
                "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "png": "image/png",
                "jpg": "image/jpeg",
                "jpeg": "image/jpeg",
                "gif": "image/gif",
                "zip": "application/zip",
            }
            content_type = content_type_map.get(ext, "application/octet-stream")

            return file_data, filename, content_type

        finally:
            doc.close()

    def remove_attachment(
        self,
        session_id: str,
        pdf_bytes: bytes,
        original_filename: str,
        attachment_name: str,
    ) -> Dict[str, Any]:
        """Remove a single embedded attachment from a PDF.

        Uses rebuild approach to work around PyMuPDF embfile_del index bug.
        Returns:
            dict with success status, remaining attachment count, download URL
        """
        doc = self.validate_pdf(pdf_bytes)

        try:
            count = doc.embfile_count()
            if count == 0:
                raise ValueError("PDF has no embedded file attachments.")

            # Find target attachment
            found = False
            for i in range(count):
                try:
                    info = doc.embfile_info(i)
                    if info.get("name", "") == attachment_name:
                        found = True
                        break
                except Exception:
                    continue

            if not found:
                raise ValueError(f"Attachment '{attachment_name}' not found in PDF.")

            # Collect all attachments except the one to remove
            kept_attachments = []
            for i in range(count):
                try:
                    info = doc.embfile_info(i)
                    name = info.get("name", "")
                    if name != attachment_name:
                        data = doc.embfile_get(i)
                        filename = info.get("filename") or info.get("ufilename") or name
                        description = info.get("description", "")
                        kept_attachments.append((name, filename, description, data))
                except Exception as e:
                    logger.warning(f"Error reading attachment at index {i}: {e}")
                    continue

            doc.close()

            # Create new PDF with only kept attachments
            new_doc = fitz.open()
            new_doc.insert_pdf(fitz.open(stream=pdf_bytes, filetype="pdf"))

            # Add kept attachments
            for name, filename, description, data in kept_attachments:
                new_doc.embfile_add(name, data, filename=filename, desc=description)

            # Save output
            out_dir = Paths.request_output(session_id)
            out_dir.mkdir(parents=True, exist_ok=True)

            clean_filename = self.sanitize_filename(original_filename)
            out_filename = f"attachments_{clean_filename}"
            out_path = out_dir / out_filename

            output_bytes = new_doc.write()
            new_doc.close()

            out_path.write_bytes(output_bytes)

            # Re-count
            out_doc = fitz.open(stream=output_bytes, filetype="pdf")
            final_count = out_doc.embfile_count()
            out_doc.close()

            return {
                "success": True,
                "session_id": session_id,
                "removed_attachment": attachment_name,
                "remaining_count": final_count,
                "download_url": f"/document-management/file-attachments/download/{session_id}",
            }

        except Exception:
            doc.close()
            raise

    def get_attachment_details(
        self,
        pdf_bytes: bytes,
        attachment_name: str,
    ) -> Dict[str, Any]:
        """Get detailed information about a specific attachment."""
        doc = self.validate_pdf(pdf_bytes)

        try:
            count = doc.embfile_count()
            if count == 0:
                raise ValueError("PDF has no embedded file attachments.")

            for i in range(count):
                try:
                    info = doc.embfile_info(i)
                    if info.get("name", "") == attachment_name:
                        # Get actual file data to verify it's readable
                        file_data = doc.embfile_get(i)
                        return {
                            "success": True,
                            "index": i,
                            "name": info.get("name", ""),
                            "filename": info.get("filename") or info.get("ufilename") or "",
                            "extension": self._get_file_extension(info.get("filename", "")),
                            "description": info.get("description", ""),
                            "size": info.get("size", 0) or info.get("length", 0),
                            "size_human": self._format_file_size(info.get("size", 0) or info.get("length", 0)),
                            "creation_date": info.get("creationDate", ""),
                            "modification_date": info.get("modDate", ""),
                            "readable": True,
                        }
                except Exception as e:
                    logger.warning(f"Error reading attachment at index {i}: {e}")
                    continue

            raise ValueError(f"Attachment '{attachment_name}' not found in PDF.")

        finally:
            doc.close()

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        """Retrieve output PDF for download."""
        out_dir = Paths.request_output(session_id)
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()] if out_dir.exists() else []
        if not files:
            raise ValueError("Output PDF file not found for this session.")
        return files[0], files[0].name


file_attachments_service = FileAttachmentsService()
