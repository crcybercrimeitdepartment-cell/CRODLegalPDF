"""
PDF Validation Service — Document Management Section.

Accepts a PDF, parses it, checks integrity and structure, detects
issues identifiable by installed PDF libraries, and returns a clear
validation report.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import fitz  # PyMuPDF
from pypdf import PdfReader

logger = logging.getLogger(__name__)

MAX_UPLOAD_SIZE = 200 * 1024 * 1024  # 200 MB


class PdfValidationService:
    """Validates PDF files for integrity, structure, and metadata."""

    def _fmt_size(self, size_bytes: int) -> str:
        if size_bytes <= 0:
            return "0 B"
        units = ["B", "KB", "MB", "GB"]
        i = 0
        s = float(size_bytes)
        while s >= 1024 and i < len(units) - 1:
            s /= 1024
            i += 1
        return f"{s:.1f} {units[i]}"

    def _issue(self, severity: str, title: str, description: str,
               page: Optional[int] = None, action: str = "") -> Dict[str, Any]:
        issue: Dict[str, Any] = {
            "severity": severity,
            "title": title,
            "description": description,
        }
        if page is not None:
            issue["page"] = page
        if action:
            issue["action"] = action
        return issue

    def validate(self, pdf_bytes: bytes, original_filename: str = "") -> Dict[str, Any]:
        """Run full validation and return structured report."""
        issues: List[Dict[str, Any]] = []
        file_size = len(pdf_bytes)
        filename = original_filename or "uploaded.pdf"

        # ── File-level checks ──────────────────────────────────────────────
        if file_size == 0:
            return self._build_report(
                filename=filename, file_size=file_size,
                status="Invalid", issues=[self._issue(
                    "error", "Empty file", "The uploaded file has no data.",
                    action="Upload a valid PDF file."
                )]
            )

        if file_size > MAX_UPLOAD_SIZE:
            return self._build_report(
                filename=filename, file_size=file_size,
                status="Invalid", issues=[self._issue(
                    "error", "File too large",
                    f"File size ({self._fmt_size(file_size)}) exceeds the {self._fmt_size(MAX_UPLOAD_SIZE)} limit.",
                    action="Upload a smaller file."
                )]
            )

        if not pdf_bytes[:5].startswith(b"%PDF"):
            return self._build_report(
                filename=filename, file_size=file_size,
                status="Invalid", issues=[self._issue(
                    "error", "Not a PDF file",
                    "The file does not start with the %PDF signature header.",
                    action="Ensure the file is a valid PDF."
                )]
            )

        # ── Extract PDF version ─────────────────────────────────────────────
        pdf_version = ""
        try:
            header_line = pdf_bytes[:20].decode("latin-1", errors="ignore").split("\n")[0]
            if "%PDF-" in header_line:
                pdf_version = header_line.split("%PDF-")[1].strip()
        except Exception:
            pass

        # ── PyMuPDF (fitz) checks ──────────────────────────────────────────
        encryption_detected = False
        encrypted_details = ""
        page_count = 0
        metadata: Dict[str, Any] = {}
        page_info: List[Dict[str, Any]] = []
        resources_info: Dict[str, Any] = {}

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            page_count = doc.page_count
            is_encrypted = doc.is_encrypted
            requires_password = doc.needs_pass

            if is_encrypted:
                encryption_detected = True
                encrypted_details = "Password-protected" if requires_password else "Encrypted (no password required)"

            # Metadata
            meta_raw = doc.metadata or {}
            metadata = {
                "title": meta_raw.get("title", ""),
                "author": meta_raw.get("author", ""),
                "creator": meta_raw.get("creator", ""),
                "producer": meta_raw.get("producer", ""),
                "creation_date": meta_raw.get("creationDate", ""),
                "modification_date": meta_raw.get("modDate", ""),
                "pdf_version": pdf_version or meta_raw.get("format", ""),
            }

            # Page checks
            for i in range(page_count):
                try:
                    page = doc.load_page(i)
                    rect = page.rect
                    info = {
                        "page_num": i + 1,
                        "width": round(rect.width, 2),
                        "height": round(rect.height, 2),
                        "rotation": page.rotation,
                    }

                    # MediaBox / CropBox
                    try:
                        mediabox = page.mediabox
                        cropbox = page.cropbox
                        info["mediabox"] = [round(v, 2) for v in mediabox] if mediabox else None
                        info["cropbox"] = [round(v, 2) for v in cropbox] if cropbox else None

                        if mediabox and cropbox:
                            if cropbox[2] > mediabox[2] or cropbox[3] > mediabox[3]:
                                issues.append(self._issue(
                                    "warning", "CropBox exceeds MediaBox",
                                    f"Page {i+1}: CropBox dimensions exceed MediaBox.",
                                    page=i+1,
                                    action="Check page layout settings."
                                ))
                    except Exception:
                        pass

                    # Page readability
                    try:
                        text = page.get_text("text")
                        info["has_text"] = bool(text.strip())
                        info["text_length"] = len(text.strip())
                    except Exception:
                        info["has_text"] = False
                        info["text_length"] = 0
                        issues.append(self._issue(
                            "warning", "Page text extraction failed",
                            f"Page {i+1}: Could not extract text content.",
                            page=i+1
                        ))

                    # Resources
                    try:
                        xobjects = page.get_images(full=True)
                        info["image_count"] = len(xobjects)
                        if xobjects:
                            resources_info.setdefault("pages_with_images", []).append(i + 1)
                    except Exception:
                        info["image_count"] = 0

                    page_info.append(info)

                except Exception as e:
                    issues.append(self._issue(
                        "warning", "Page load issue",
                        f"Page {i+1}: Could not load page - {str(e)[:100]}",
                        page=i+1
                    ))
                    page_info.append({"page_num": i + 1, "error": str(e)[:100]})

            # Catalog / structure
            try:
                catalog = doc.pdf_catalog()
                if not catalog:
                    issues.append(self._issue(
                        "warning", "Missing document catalog",
                        "PDF document catalog object could not be located."
                    ))
            except Exception:
                pass

            doc.close()

        except Exception as e:
            issues.append(self._issue(
                "error", "PDF parsing failed",
                f"PyMuPDF could not open the document: {str(e)[:200]}",
                action="The file may be corrupted or use an unsupported PDF feature."
            ))

        # ── pypdf checks ───────────────────────────────────────────────────
        try:
            reader = PdfReader(stream=pdf_bytes)

            # Cross-reference
            try:
                if reader.trailer:
                    root = reader.trailer.get("/Root")
                    if not root:
                        issues.append(self._issue(
                            "warning", "Missing /Root in trailer",
                            "The cross-reference trailer does not contain a /Root entry."
                        ))
            except Exception:
                pass

            # Object references
            try:
                if hasattr(reader, 'resolve_object'):
                    pass  # pypdf resolves lazily
            except Exception:
                pass

        except Exception as e:
            err_msg = str(e).lower()
            if "password" in err_msg or "encrypted" in err_msg:
                encryption_detected = True
                encrypted_details = "Encrypted PDF requiring a password"
            else:
                issues.append(self._issue(
                    "warning", "pypdf parsing note",
                    f"pypdf encountered: {str(e)[:150]}",
                    action="This may indicate a structural issue but does not necessarily invalidate the PDF."
                ))

        # ── Resource summary ────────────────────────────────────────────────
        total_images = sum(p.get("image_count", 0) for p in page_info)
        pages_with_images = resources_info.get("pages_with_images", [])
        resources_info["total_images"] = total_images
        resources_info["pages_with_images"] = pages_with_images

        if total_images > 0:
            issues.append(self._issue(
                "info", "Embedded images found",
                f"{total_images} image(s) found across {len(pages_with_images)} page(s)."
            ))

        # ── Overall status ──────────────────────────────────────────────────
        error_count = sum(1 for i in issues if i["severity"] == "error")
        warning_count = sum(1 for i in issues if i["severity"] == "warning")
        info_count = sum(1 for i in issues if i["severity"] == "info")

        if error_count > 0:
            status = "Invalid"
        elif warning_count > 0:
            status = "Warning"
        else:
            status = "Valid"

        return self._build_report(
            filename=filename,
            file_size=file_size,
            status=status,
            issues=issues,
            error_count=error_count,
            warning_count=warning_count,
            info_count=info_count,
            page_count=page_count,
            pdf_version=pdf_version,
            encryption_detected=encryption_detected,
            encrypted_details=encrypted_details,
            metadata=metadata,
            page_info=page_info,
            resources=resources_info,
        )

    def _build_report(
        self,
        filename: str = "",
        file_size: int = 0,
        status: str = "Valid",
        issues: Optional[List[Dict[str, Any]]] = None,
        error_count: Optional[int] = None,
        warning_count: Optional[int] = None,
        info_count: Optional[int] = None,
        page_count: int = 0,
        pdf_version: str = "",
        encryption_detected: bool = False,
        encrypted_details: str = "",
        metadata: Optional[Dict[str, Any]] = None,
        page_info: Optional[List[Dict[str, Any]]] = None,
        resources: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        issues = issues or []
        return {
            "filename": filename,
            "file_size": file_size,
            "file_size_human": self._fmt_size(file_size),
            "status": status,
            "error_count": error_count if error_count is not None else sum(1 for i in issues if i["severity"] == "error"),
            "warning_count": warning_count if warning_count is not None else sum(1 for i in issues if i["severity"] == "warning"),
            "info_count": info_count if info_count is not None else sum(1 for i in issues if i["severity"] == "info"),
            "page_count": page_count,
            "pdf_version": pdf_version,
            "encryption": {
                "detected": encryption_detected,
                "details": encrypted_details or ("PDF is encrypted" if encryption_detected else "Not encrypted"),
            },
            "metadata": metadata or {},
            "page_info": page_info or [],
            "resources": resources or {},
            "issues": issues,
            "validated_at": datetime.now().isoformat(),
        }


pdf_validation_service = PdfValidationService()
