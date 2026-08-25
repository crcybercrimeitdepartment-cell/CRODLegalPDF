"""
Invisible Copyright Watermark Service — PDF Copyright Protection Section.

Embeds hidden copyright identification into a PDF using PDF metadata,
custom metadata fields, and a deterministic fingerprint derived from
the supplied information and PDF content.  Does not alter visible page
appearance.  Provides a verify operation to extract and validate the
embedded watermark.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024

WATERMARK_KEY = "InvisibleCopyrightWatermark"
FINGERPRINT_KEY = "CopyrightFingerprint"


class InvisibleCopyrightWatermarkService:
    """Embed and verify invisible copyright watermarks in PDFs."""

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

    def _compute_fingerprint(
        self,
        owner: str,
        reference: str,
        year: str,
        license_text: str,
        pdf_bytes: bytes,
    ) -> str:
        """Generate a deterministic fingerprint from info + PDF content."""
        content_hash = hashlib.sha256(pdf_bytes).hexdigest()[:16]
        info_str = f"{owner}|{reference}|{year}|{license_text}|{content_hash}"
        return hashlib.sha256(info_str.encode("utf-8")).hexdigest()

    def embed_watermark(
        self,
        pdf_bytes: bytes,
        original_filename: str,
        session_id: str,
        owner: str = "",
        reference: str = "",
        year: str = "",
        license_text: str = "",
    ) -> Dict[str, Any]:
        """Embed invisible copyright watermark into PDF metadata."""
        self._validate_pdf(pdf_bytes)
        if not owner.strip():
            raise ValueError("Copyright owner/name is required.")

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")

        fingerprint = self._compute_fingerprint(
            owner.strip(), reference.strip(), year.strip(),
            license_text.strip(), pdf_bytes,
        )

        watermark_record = {
            "owner": owner.strip(),
            "reference": reference.strip(),
            "year": year.strip(),
            "license": license_text.strip(),
            "fingerprint": fingerprint,
            "embedded_at": datetime.now(timezone.utc).isoformat(),
            "type": "invisible_copyright_watermark",
        }

        current_meta = doc.metadata or {}
        new_meta = dict(current_meta)
        if owner.strip():
            new_meta["author"] = owner.strip()
        existing_keywords = current_meta.get("keywords", "") or ""
        wm_keywords = f"Fingerprint: {fingerprint}; Owner: {owner.strip()}; Year: {year.strip()}"
        if existing_keywords:
            new_meta["keywords"] = existing_keywords + "; " + wm_keywords
        else:
            new_meta["keywords"] = wm_keywords
        new_meta["subject"] = f"Invisible Copyright Watermark - {fingerprint}"
        doc.set_metadata(new_meta)

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        clean_name = self._sanitize_filename(original_filename)
        out_filename = f"invisible_wm_{clean_name}"
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
            "owner": owner.strip(),
            "reference": reference.strip(),
            "fingerprint": fingerprint,
            "download_url": f"/pdf-copyright-protection/invisible-watermark/download/{session_id}",
            "message": "Invisible copyright watermark embedded successfully.",
        }

    def verify_watermark(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Extract and verify invisible copyright watermark from a PDF."""
        self._validate_pdf(pdf_bytes)

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")

        meta = doc.metadata or {}
        keywords = meta.get("keywords", "") or ""
        total_pages = len(doc)
        doc.close()

        fingerprint = None
        owner = ""
        year = ""
        for part in keywords.split(";"):
            part = part.strip()
            if part.startswith("Fingerprint:"):
                fingerprint = part.split(":", 1)[1].strip()
            elif part.startswith("Owner:"):
                owner = part.split(":", 1)[1].strip()
            elif part.startswith("Year:"):
                year = part.split(":", 1)[1].strip()

        if not fingerprint:
            return {
                "success": True,
                "found": False,
                "total_pages": total_pages,
                "message": "No invisible copyright watermark found in this document.",
            }

        new_fingerprint = self._compute_fingerprint(
            owner, "", year, "", pdf_bytes,
        )
        fingerprint_match = (fingerprint == new_fingerprint)

        return {
            "success": True,
            "found": True,
            "total_pages": total_pages,
            "owner": owner,
            "year": year,
            "fingerprint": fingerprint,
            "fingerprint_valid": fingerprint_match,
            "verification_status": "Valid — document matches recorded fingerprint" if fingerprint_match
            else "Invalid — document may have been modified since embedding",
            "message": "Watermark found and verified." if fingerprint_match
            else "Watermark found but document appears modified.",
        }

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Processed PDF not found for this session.")
        return files[0], files[0].name


invisible_copyright_watermark_service = InvisibleCopyrightWatermarkService()
