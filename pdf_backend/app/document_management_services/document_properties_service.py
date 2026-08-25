"""
Document Properties Service — Document Management Section.

Comprehensive PDF document property inspection and metadata editing:
  - Extract file information (name, size, page count, PDF version)
  - Extract document metadata (title, author, subject, keywords, creator, producer, dates)
  - Extract security information (encrypted status, password protection)
  - Extract document permissions (print, copy, modify, annotate, form filling, accessibility)
  - Extract font information (names, types, pages)
  - Calculate document statistics (pages, images, text content)
  - Update supported metadata fields
  - Save modified PDF with updated metadata
"""

from __future__ import annotations

import io
import logging
import re
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF
import pikepdf

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024


class DocumentPropertiesService:
    """Enterprise service for inspecting and editing PDF document properties."""

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and unsafe characters."""
        if not filename:
            return "document.pdf"
        clean = Path(filename).name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document.pdf"

    def _validate_pdf(self, pdf_bytes: bytes) -> fitz.Document:
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

        if doc.page_count == 0:
            doc.close()
            raise ValueError("PDF document contains 0 pages.")

        return doc

    def _format_pdf_date(self, date_str: str) -> str:
        """Format PDF date string (D:YYYYMMDDHHmmSS) to human-readable."""
        if not date_str:
            return ""
        try:
            clean = date_str.replace("D:", "").strip()
            if len(clean) >= 14:
                year = clean[0:4]
                month = clean[4:6]
                day = clean[6:8]
                hour = clean[8:10]
                minute = clean[10:12]
                second = clean[12:14]
                return f"{year}-{month}-{day} {hour}:{minute}:{second}"
            return date_str
        except Exception:
            return date_str

    def analyze_properties(self, pdf_bytes: bytes, original_filename: str = "") -> Dict[str, Any]:
        """
        Analyze PDF and return comprehensive properties.
        Read-only operation — does not modify or save anything.
        """
        doc = self._validate_pdf(pdf_bytes)

        try:
            result = {}

            # ── File Information ──────────────────────────────────────────
            result["file_info"] = {
                "filename": original_filename or "document.pdf",
                "file_size": len(pdf_bytes),
                "file_size_human": self._format_file_size(len(pdf_bytes)),
                "mime_type": "application/pdf",
                "page_count": doc.page_count,
                "pdf_version": doc.pdf_version() if hasattr(doc, 'pdf_version') else "N/A",
            }

            # ── Document Metadata ─────────────────────────────────────────
            meta = doc.metadata or {}
            result["metadata"] = {
                "title": meta.get("title", "") or "",
                "author": meta.get("author", "") or "",
                "subject": meta.get("subject", "") or "",
                "keywords": meta.get("keywords", "") or "",
                "creator": meta.get("creator", "") or "",
                "producer": meta.get("producer", "") or "",
                "creation_date": self._format_pdf_date(meta.get("creationDate", "") or ""),
                "mod_date": self._format_pdf_date(meta.get("modDate", "") or ""),
                "format": meta.get("format", "") or "",
            }

            # ── Security Information ──────────────────────────────────────
            result["security"] = self._extract_security_info(pdf_bytes)

            # ── Document Permissions ──────────────────────────────────────
            result["permissions"] = self._extract_permissions(pdf_bytes)

            # ── Font Information ──────────────────────────────────────────
            result["fonts"] = self._extract_font_info(doc)

            # ── Document Statistics ───────────────────────────────────────
            result["statistics"] = self._extract_statistics(doc)

            return result

        finally:
            doc.close()

    def _format_file_size(self, size_bytes: int) -> str:
        """Format file size to human-readable string."""
        if size_bytes == 0:
            return "0 B"
        k = 1024
        sizes = ["B", "KB", "MB", "GB"]
        i = min(int(__import__('math').log(size_bytes) / __import__('math').log(k)), len(sizes) - 1)
        return f"{size_bytes / k**i:.1f} {sizes[i]}"

    def _extract_security_info(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Extract PDF security/encryption information using pikepdf."""
        try:
            with pikepdf.open(io.BytesIO(pdf_bytes)) as pdf:
                is_encrypted = pdf.is_encrypted
                encryption_info = {
                    "is_encrypted": is_encrypted,
                    "password_protected": is_encrypted,
                    "encryption_method": "N/A",
                    "key_length": "N/A",
                    "details": "Document is not encrypted." if not is_encrypted else "Document is password-protected.",
                }

                if is_encrypted:
                    try:
                        if hasattr(pdf, 'encryption') and pdf.encryption:
                            enc = pdf.encryption
                            encryption_info["encryption_method"] = getattr(enc, 'algorithm', 'AES') or "AES"
                            encryption_info["key_length"] = str(getattr(enc, 'key_length', 256)) or "256"
                            encryption_info["details"] = f"Encrypted with {encryption_info['encryption_method']}-{encryption_info['key_length']} bit encryption."
                    except Exception:
                        encryption_info["encryption_method"] = "Unknown"
                        encryption_info["details"] = "Document is encrypted but encryption details could not be determined."

                return encryption_info

        except pikepdf.PasswordError:
            return {
                "is_encrypted": True,
                "password_protected": True,
                "encryption_method": "Unknown",
                "key_length": "N/A",
                "details": "Document is password-protected and requires a password to open.",
            }
        except Exception as e:
            logger.warning(f"Could not read encryption info: {e}")
            return {
                "is_encrypted": False,
                "password_protected": False,
                "encryption_method": "N/A",
                "key_length": "N/A",
                "details": "Could not determine encryption status.",
            }

    def _extract_permissions(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Extract PDF document permissions using pikepdf."""
        try:
            with pikepdf.open(io.BytesIO(pdf_bytes)) as pdf:
                if not pdf.is_encrypted:
                    return {
                        "printing": True,
                        "copying": True,
                        "modifying": True,
                        "annotating": True,
                        "form_filling": True,
                        "accessibility": True,
                        "details": "No restrictions — document is not encrypted.",
                    }

                try:
                    if hasattr(pdf, 'root') and '/Perms' in pdf.root:
                        pass

                    perm = pdf.permissions
                    permissions = {
                        "printing": bool(perm & pikepdf.Permissions.print_highres),
                        "copying": bool(perm & pikepdf.Permissions.extract),
                        "modifying": bool(perm & (pikepdf.Permissions.modify_assembly | pikepdf.Permissions.modify_other)),
                        "annotating": bool(perm & pikepdf.Permissions.modify_annotation),
                        "form_filling": bool(perm & pikepdf.Permissions.modify_form),
                        "accessibility": bool(perm & pikepdf.Permissions.accessibility),
                        "details": "Permissions extracted from encrypted document.",
                    }
                    return permissions

                except Exception as e:
                    logger.warning(f"Could not read permissions: {e}")
                    return {
                        "printing": "Unknown",
                        "copying": "Unknown",
                        "modifying": "Unknown",
                        "annotating": "Unknown",
                        "form_filling": "Unknown",
                        "accessibility": "Unknown",
                        "details": "Could not determine permissions.",
                    }

        except pikepdf.PasswordError:
            return {
                "printing": "Requires password",
                "copying": "Requires password",
                "modifying": "Requires password",
                "annotating": "Requires password",
                "form_filling": "Requires password",
                "accessibility": "Requires password",
                "details": "Document is password-protected. Provide password to view permissions.",
            }
        except Exception as e:
            logger.warning(f"Could not read permissions: {e}")
            return {
                "printing": "Unknown",
                "copying": "Unknown",
                "modifying": "Unknown",
                "annotating": "Unknown",
                "form_filling": "Unknown",
                "accessibility": "Unknown",
                "details": "Could not determine permissions.",
            }

    def _extract_font_info(self, doc: fitz.Document) -> Dict[str, Any]:
        """Extract font information from all pages."""
        fonts_map = {}

        for page_num in range(doc.page_count):
            try:
                page = doc[page_num]
                font_list = page.get_fonts(full=True)
                for font in font_list:
                    xref = font[0]
                    name = font[3] if len(font) > 3 else "Unknown"
                    font_type = font[4] if len(font) > 4 else "Unknown"
                    encoding = font[5] if len(font) > 5 else "Unknown"

                    key = f"{name}|{font_type}"
                    if key not in fonts_map:
                        fonts_map[key] = {
                            "name": name,
                            "type": font_type,
                            "encoding": encoding,
                            "pages": [],
                        }
                    if page_num + 1 not in fonts_map[key]["pages"]:
                        fonts_map[key]["pages"].append(page_num + 1)

            except Exception as e:
                logger.warning(f"Could not extract fonts from page {page_num + 1}: {e}")
                continue

        font_list = list(fonts_map.values())
        return {
            "total_fonts": len(font_list),
            "fonts": font_list,
        }

    def _extract_statistics(self, doc: fitz.Document) -> Dict[str, Any]:
        """Extract document statistics (pages, images, text)."""
        total_pages = doc.page_count
        text_pages = 0
        image_pages = 0
        total_images = 0

        for page_num in range(total_pages):
            try:
                page = doc[page_num]

                text = page.get_text("text").strip()
                if text:
                    text_pages += 1

                images = page.get_images(full=True)
                if images:
                    image_pages += 1
                    total_images += len(images)

            except Exception as e:
                logger.warning(f"Could not analyze page {page_num + 1}: {e}")
                continue

        try:
            toc = doc.get_toc()
            has_toc = len(toc) > 0
        except Exception:
            has_toc = False

        return {
            "total_pages": total_pages,
            "text_pages": text_pages,
            "image_pages": image_pages,
            "total_images": total_images,
            "has_table_of_contents": has_toc,
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
    ) -> Dict[str, Any]:
        """
        Update metadata fields of PDF document and save output.
        """
        doc = self._validate_pdf(pdf_bytes)

        try:
            current_meta = doc.metadata or {}

            new_meta = {
                "title": title.strip() if title is not None else current_meta.get("title", ""),
                "author": author.strip() if author is not None else current_meta.get("author", ""),
                "subject": subject.strip() if subject is not None else current_meta.get("subject", ""),
                "keywords": keywords.strip() if keywords is not None else current_meta.get("keywords", ""),
                "creator": current_meta.get("creator", ""),
                "producer": current_meta.get("producer", ""),
            }

            doc.set_metadata(new_meta)

            out_dir = Paths.request_output(session_id)
            out_dir.mkdir(parents=True, exist_ok=True)

            clean_filename = self.sanitize_filename(original_filename)
            out_filename = f"properties_updated_{clean_filename}"
            out_path = out_dir / out_filename

            output_bytes = doc.write()
            doc.close()

            out_path.write_bytes(output_bytes)

            return {
                "success": True,
                "session_id": session_id,
                "original_filename": clean_filename,
                "saved_filename": out_filename,
                "updated_metadata": {
                    "title": new_meta["title"],
                    "author": new_meta["author"],
                    "subject": new_meta["subject"],
                    "keywords": new_meta["keywords"],
                },
                "download_url": f"/document-management/document-properties/download/{session_id}",
            }

        except Exception as e:
            if doc:
                doc.close()
            raise

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        """Retrieve output PDF for download."""
        out_dir = Paths.request_output(session_id)
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()] if out_dir.exists() else []
        if not files:
            raise ValueError("Output PDF file not found for this session.")
        return files[0], files[0].name


document_properties_service = DocumentPropertiesService()
