"""
Extract Attachments Service — Document Management Section.

Extracts embedded file attachments from PDF documents:
  - Lists all embedded attachments with metadata
  - Extracts single or multiple attachments
  - Extracts all attachments into a ZIP
  - Preserves original attachment contents exactly
  - Does not modify the original PDF
  - Uses PyMuPDF (fitz) for embedded file operations
"""

from __future__ import annotations

import logging
import re
import tempfile
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024


class ExtractAttachmentsService:
    """Service for extracting embedded file attachments from PDF documents."""

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
            "pdf": "application/pdf",
            "txt": "text/plain",
            "json": "application/json",
            "xml": "application/xml",
            "csv": "text/csv",
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "xls": "application/vnd.ms-excel",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "doc": "application/msword",
            "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "ppt": "application/vnd.ms-powerpoint",
            "png": "image/png",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "gif": "image/gif",
            "webp": "image/webp",
            "bmp": "image/bmp",
            "zip": "application/zip",
            "rar": "application/x-rar-compressed",
            "7z": "application/x-7z-compressed",
            "tar": "application/x-tar",
            "gz": "application/gzip",
        }
        return mime_map.get(ext, "application/octet-stream")

    def list_attachments(self, pdf_bytes: bytes) -> List[Dict[str, Any]]:
        """List all embedded file attachments with metadata.

        Returns a list of dicts with:
        - index, name, filename, extension, mime_type, description,
        - size, size_human, creation_date, modification_date
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

    def extract_single(
        self,
        pdf_bytes: bytes,
        attachment_name: str,
        session_id: str,
    ) -> Dict[str, Any]:
        """Extract a single attachment from the PDF.

        Returns dict with success, filename, download URL.
        """
        doc = self.validate_pdf(pdf_bytes)
        try:
            count = doc.embfile_count()
            if count == 0:
                raise ValueError("PDF has no embedded file attachments.")

            # Find by name
            found = False
            for i in range(count):
                info = doc.embfile_info(i)
                if info.get("name", "") == attachment_name:
                    found = True
                    break

            if not found:
                raise ValueError(f"Attachment '{attachment_name}' not found in PDF.")

            # Extract data
            file_data = doc.embfile_get(attachment_name)
            info = doc.embfile_info(attachment_name)
            filename = info.get("filename") or info.get("ufilename") or attachment_name

            # Save to session output
            out_dir = Paths.request_output(session_id)
            out_dir.mkdir(parents=True, exist_ok=True)

            safe_name = self.sanitize_filename(filename)
            out_path = out_dir / safe_name
            out_path.write_bytes(file_data)

            return {
                "success": True,
                "filename": safe_name,
                "original_filename": filename,
                "size": len(file_data),
                "size_human": self._format_file_size(len(file_data)),
                "download_url": f"/document-management/extract-attachments/file/{session_id}/{safe_name}",
            }
        finally:
            doc.close()

    def extract_multiple(
        self,
        pdf_bytes: bytes,
        attachment_names: List[str],
        session_id: str,
        extract_all: bool = False,
    ) -> Dict[str, Any]:
        """Extract multiple attachments. Creates a ZIP if more than one.

        Returns dict with success, count, download URL, is_zip.
        """
        doc = self.validate_pdf(pdf_bytes)
        try:
            count = doc.embfile_count()
            if count == 0:
                raise ValueError("PDF has no embedded file attachments.")

            if extract_all:
                target_names = []
                for i in range(count):
                    info = doc.embfile_info(i)
                    target_names.append(info.get("name", ""))
            else:
                if not attachment_names:
                    raise ValueError("No attachment names provided.")
                target_names = attachment_names

            # Validate all names exist
            existing_names = set()
            for i in range(count):
                info = doc.embfile_info(i)
                existing_names.add(info.get("name", ""))

            invalid = [n for n in target_names if n not in existing_names]
            if invalid:
                raise ValueError(f"Attachments not found: {', '.join(invalid)}")

            # Extract files
            out_dir = Paths.request_output(session_id)
            out_dir.mkdir(parents=True, exist_ok=True)

            extracted_files = []
            for name in target_names:
                try:
                    file_data = doc.embfile_get(name)
                    info = doc.embfile_info(name)
                    filename = info.get("filename") or info.get("ufilename") or name
                    safe_name = self.sanitize_filename(filename)

                    # Handle duplicate names
                    out_path = out_dir / safe_name
                    counter = 1
                    while out_path.exists():
                        p = Path(safe_name)
                        out_path = out_dir / f"{p.stem}_{counter}{p.suffix}"
                        counter += 1

                    out_path.write_bytes(file_data)
                    extracted_files.append({
                        "name": name,
                        "filename": out_path.name,
                        "size": len(file_data),
                    })
                except Exception as e:
                    logger.warning(f"Error extracting attachment '{name}': {e}")
                    continue

            if not extracted_files:
                raise ValueError("No attachments could be extracted.")

            # Single file: direct download
            if len(extracted_files) == 1:
                f = extracted_files[0]
                return {
                    "success": True,
                    "count": 1,
                    "is_zip": False,
                    "files": extracted_files,
                    "download_url": f"/document-management/extract-attachments/file/{session_id}/{f['filename']}",
                }

            # Multiple files: create ZIP
            zip_name = f"extracted_attachments_{session_id[:8]}.zip"
            zip_path = out_dir / zip_name
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for f in extracted_files:
                    fpath = out_dir / f["filename"]
                    zf.write(fpath, arcname=f["filename"])

            # Clean individual files
            for f in extracted_files:
                fpath = out_dir / f["filename"]
                if fpath.exists():
                    fpath.unlink(missing_ok=True)

            return {
                "success": True,
                "count": len(extracted_files),
                "is_zip": True,
                "files": extracted_files,
                "download_url": f"/document-management/extract-attachments/zip/{session_id}",
            }
        finally:
            doc.close()

    def get_file_for_download(self, session_id: str, filename: str) -> Tuple[Path, str]:
        """Retrieve a single extracted file for download."""
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        target = out_dir / filename
        if not target.exists():
            raise ValueError(f"File '{filename}' not found.")
        return target, filename

    def get_zip_for_download(self, session_id: str) -> Tuple[Path, str]:
        """Retrieve ZIP file for download."""
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        zips = list(out_dir.glob("*.zip"))
        if not zips:
            raise ValueError("ZIP file not found for this session.")
        return zips[0], zips[0].name


extract_attachments_service = ExtractAttachmentsService()
