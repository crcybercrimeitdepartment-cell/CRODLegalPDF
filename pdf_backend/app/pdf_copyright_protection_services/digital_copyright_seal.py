"""
Digital Copyright Seal Service — PDF Copyright Protection Section.

Calculates a SHA-256 document fingerprint, generates a digital seal
record with owner/date/hash/reference, embeds the seal into PDF
metadata, and provides verification by recalculating the hash.
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

SEAL_KEY = "DigitalCopyrightSeal"


class DigitalCopyrightSealService:
    """Generate and verify digital copyright seals for PDFs."""

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

    def _compute_hash(self, pdf_bytes: bytes) -> str:
        return hashlib.sha256(pdf_bytes).hexdigest()

    def generate_seal(
        self,
        pdf_bytes: bytes,
        original_filename: str,
        session_id: str,
        owner: str = "",
        organization: str = "",
        year: str = "",
        seal_info: str = "",
    ) -> Dict[str, Any]:
        """Calculate document hash and embed a digital copyright seal."""
        self._validate_pdf(pdf_bytes)
        if not owner.strip():
            raise ValueError("Copyright owner is required.")

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")

        doc_hash = self._compute_hash(pdf_bytes)
        seal_id = hashlib.sha256(
            f"{owner}|{organization}|{year}|{seal_info}|{doc_hash}".encode()
        ).hexdigest()[:16]

        now = datetime.now(timezone.utc)
        seal_record = {
            "type": "digital_copyright_seal",
            "owner": owner.strip(),
            "organization": organization.strip(),
            "year": year.strip(),
            "seal_info": seal_info.strip(),
            "document_hash": doc_hash,
            "seal_id": seal_id,
            "created_at": now.isoformat(),
        }

        current_meta = doc.metadata or {}
        new_meta = dict(current_meta)
        if owner.strip():
            new_meta["author"] = owner.strip()
        existing_keywords = current_meta.get("keywords", "") or ""
        seal_keywords = f"SealID: {seal_id}; Owner: {owner.strip()}; Year: {year.strip()}; Hash: {doc_hash}"
        if existing_keywords:
            new_meta["keywords"] = existing_keywords + "; " + seal_keywords
        else:
            new_meta["keywords"] = seal_keywords
        new_meta["subject"] = f"Digital Copyright Seal - {seal_id}"
        doc.set_metadata(new_meta)

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        clean_name = self._sanitize_filename(original_filename)
        out_filename = f"sealed_{clean_name}"
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
            "organization": organization.strip(),
            "document_hash": doc_hash,
            "seal_id": seal_id,
            "created_at": now.isoformat(),
            "download_url": f"/pdf-copyright-protection/digital-seal/download/{session_id}",
            "message": "Digital copyright seal generated and applied.",
        }

    def verify_seal(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Extract seal info and verify document hash matches."""
        self._validate_pdf(pdf_bytes)

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")

        meta = doc.metadata or {}
        keywords = meta.get("keywords", "") or ""
        total_pages = len(doc)
        doc.close()

        seal_id = ""
        owner = ""
        year = ""
        doc_hash = ""
        for part in keywords.split(";"):
            part = part.strip()
            if part.startswith("SealID:"):
                seal_id = part.split(":", 1)[1].strip()
            elif part.startswith("Owner:"):
                owner = part.split(":", 1)[1].strip()
            elif part.startswith("Year:"):
                year = part.split(":", 1)[1].strip()
            elif part.startswith("Hash:"):
                doc_hash = part.split(":", 1)[1].strip()

        if not seal_id:
            return {
                "success": True,
                "found": False,
                "total_pages": total_pages,
                "message": "No digital copyright seal found in this document.",
            }

        current_hash = self._compute_hash(pdf_bytes)
        hash_valid = (current_hash == doc_hash)

        return {
            "success": True,
            "found": True,
            "total_pages": total_pages,
            "owner": owner,
            "year": year,
            "seal_id": seal_id,
            "document_hash": doc_hash,
            "hash_valid": hash_valid,
            "verification_status": "Valid — document matches sealed hash" if hash_valid
            else "Tampered — document has been modified since sealing",
            "message": "Seal verified successfully." if hash_valid
            else "Seal found but document has been modified.",
        }

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Processed PDF not found for this session.")
        return files[0], files[0].name


digital_copyright_seal_service = DigitalCopyrightSealService()
