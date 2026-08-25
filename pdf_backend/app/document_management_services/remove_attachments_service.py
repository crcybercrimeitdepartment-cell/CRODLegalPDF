"""
Remove Attachments Service — Document Management Section.

Removes embedded file attachments from PDF documents:
  - Lists all embedded attachments with metadata
  - Removes one or multiple selected attachments
  - Removes all attachments
  - Preserves PDF pages, content, and unrelated data
  - Generates a new cleaned PDF (original untouched)
  - Uses PyMuPDF (fitz) for embedded file operations
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024


class RemoveAttachmentsService:
    """Service for removing embedded file attachments from PDF documents."""

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and unsafe characters."""
        if not filename:
            return "document.pdf"
        clean = Path(filename).name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document.pdf"

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
            raise ValueError("PDF is encrypted or password-protected. Please decrypt it first.")
        return doc

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

    def _guess_mime_type(self, filename: str) -> str:
        """Guess MIME type from file extension."""
        ext = self._get_file_extension(filename).lower()
        mime_map = {
            "pdf": "application/pdf", "txt": "text/plain", "json": "application/json",
            "xml": "application/xml", "csv": "text/csv",
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "xls": "application/vnd.ms-excel",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "doc": "application/msword",
            "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "gif": "image/gif",
            "zip": "application/zip", "rar": "application/x-rar-compressed",
        }
        return mime_map.get(ext, "application/octet-stream")

    def list_attachments(self, pdf_bytes: bytes) -> List[Dict[str, Any]]:
        """List all embedded file attachments with metadata."""
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
                        "mime_type": self._guess_mime_type(filename),
                        "description": description,
                        "size": size,
                        "size_human": self._format_file_size(size),
                        "creation_date": creation_date,
                        "modification_date": modification_date,
                    })
                except Exception as e:
                    logger.warning(f"Error reading attachment at index {i}: {e}")
                    continue
            return attachments
        finally:
            doc.close()

    def analyze_pdf(self, pdf_bytes: bytes, original_filename: str) -> Dict[str, Any]:
        """Analyze PDF and return file info plus attachment list."""
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
                        "mime_type": self._guess_mime_type(filename),
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

    def _rebuild_pdf_without_attachments(
        self,
        pdf_bytes: bytes,
        names_to_remove: set,
    ) -> bytes:
        """Rebuild PDF keeping only attachments NOT in names_to_remove.

        Works around PyMuPDF embfile_del index bug by rebuilding.
        """
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        # Collect attachments to keep
        kept = []
        count = doc.embfile_count()
        for i in range(count):
            info = doc.embfile_info(i)
            name = info.get("name", "")
            if name not in names_to_remove:
                data = doc.embfile_get(i)
                filename = info.get("filename") or info.get("ufilename") or name
                description = info.get("description", "")
                kept.append((name, filename, description, data))

        doc.close()

        # Create new PDF with kept attachments
        new_doc = fitz.open()
        new_doc.insert_pdf(fitz.open(stream=pdf_bytes, filetype="pdf"))

        for name, filename, description, data in kept:
            new_doc.embfile_add(name, data, filename=filename, desc=description)

        output = new_doc.write()
        new_doc.close()
        return output

    def remove_attachments(
        self,
        session_id: str,
        pdf_bytes: bytes,
        original_filename: str,
        names_to_remove: List[str],
        remove_all: bool = False,
    ) -> Dict[str, Any]:
        """Remove selected attachments from the PDF.

        Returns dict with success, removed count, remaining count, download URL.
        """
        doc = self.validate_pdf(pdf_bytes)
        try:
            count = doc.embfile_count()
            if count == 0:
                raise ValueError("PDF has no embedded file attachments.")

            # Determine which names to remove
            if remove_all:
                all_names = set()
                for i in range(count):
                    info = doc.embfile_info(i)
                    all_names.add(info.get("name", ""))
                names_set = all_names
            else:
                if not names_to_remove:
                    raise ValueError("No attachment names provided for removal.")

                # Validate all names exist
                existing = set()
                for i in range(count):
                    info = doc.embfile_info(i)
                    existing.add(info.get("name", ""))

                invalid = [n for n in names_to_remove if n not in existing]
                if invalid:
                    raise ValueError(f"Attachments not found: {', '.join(invalid)}")

                names_set = set(names_to_remove)

            doc.close()

            # Rebuild PDF without the selected attachments
            output_bytes = self._rebuild_pdf_without_attachments(pdf_bytes, names_set)

            # Save output
            out_dir = Paths.request_output(session_id)
            out_dir.mkdir(parents=True, exist_ok=True)

            clean_filename = self.sanitize_filename(original_filename)
            out_filename = f"cleaned_{clean_filename}"
            out_path = out_dir / out_filename
            out_path.write_bytes(output_bytes)

            # Count remaining
            out_doc = fitz.open(stream=output_bytes, filetype="pdf")
            remaining = out_doc.embfile_count()
            out_doc.close()

            return {
                "success": True,
                "session_id": session_id,
                "removed_count": len(names_set),
                "removed_names": list(names_set),
                "remaining_count": remaining,
                "download_url": f"/document-management/remove-attachments/download/{session_id}",
            }

        except Exception:
            doc.close()
            raise

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        """Retrieve cleaned PDF for download."""
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Output PDF file not found for this session.")
        return files[0], files[0].name


remove_attachments_service = RemoveAttachmentsService()
