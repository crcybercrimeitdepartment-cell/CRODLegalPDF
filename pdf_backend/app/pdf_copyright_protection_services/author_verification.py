"""
Author Verification Service — PDF Copyright Protection Section.

Extracts author/creator metadata from a PDF, compares it against
a user-claimed author, and generates a clear verification result.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any, Dict, Tuple

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024


class AuthorVerificationService:
    """Verify claimed author against PDF metadata."""

    def _validate_pdf(self, pdf_bytes: bytes) -> None:
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError("File size exceeds the 200 MB limit.")
        if not pdf_bytes[:5].startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")

    def extract_author_info(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Extract author-related metadata from a PDF."""
        self._validate_pdf(pdf_bytes)

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")

        meta = doc.metadata or {}
        total_pages = len(doc)

        info = {
            "author": meta.get("author", "") or "",
            "creator": meta.get("creator", "") or "",
            "producer": meta.get("producer", "") or "",
            "creation_date": meta.get("creationDate", "") or "",
            "mod_date": meta.get("modDate", "") or "",
            "title": meta.get("title", "") or "",
            "subject": meta.get("subject", "") or "",
            "keywords": meta.get("keywords", "") or "",
        }

        doc.close()

        has_authority = bool(info["author"] or info["creator"])

        return {
            "success": True,
            "total_pages": total_pages,
            "metadata": info,
            "has_authority": has_authority,
        }

    def verify_author(
        self,
        pdf_bytes: bytes,
        claimed_author: str,
    ) -> Dict[str, Any]:
        """Compare claimed author against PDF metadata."""
        self._validate_pdf(pdf_bytes)
        if not claimed_author.strip():
            raise ValueError("Claimed author name is required.")

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")

        meta = doc.metadata or {}
        total_pages = len(doc)
        doc.close()

        author = (meta.get("author", "") or "").strip()
        creator = (meta.get("creator", "") or "").strip()
        producer = (meta.get("producer", "") or "").strip()
        creation_date = (meta.get("creationDate", "") or "").strip()
        mod_date = (meta.get("modDate", "") or "").strip()
        title = (meta.get("title", "") or "").strip()
        claimed = claimed_author.strip()

        claimed_lower = claimed.lower()
        author_lower = author.lower()
        creator_lower = creator.lower()

        match = "not_found"
        details = ""

        if author and claimed_lower == author_lower:
            match = "exact_match"
            details = f"Claimed author exactly matches the PDF Author field: \"{author}\"."
        elif creator and claimed_lower == creator_lower:
            match = "creator_match"
            details = f"Claimed author matches the PDF Creator field: \"{creator}\"."
        elif author and claimed_lower in author_lower:
            match = "partial_match"
            details = f"Claimed author is part of the PDF Author field: \"{author}\"."
        elif creator and claimed_lower in creator_lower:
            match = "partial_match"
            details = f"Claimed author is part of the PDF Creator field: \"{creator}\"."
        elif not author and not creator:
            match = "insufficient"
            details = "No author or creator metadata found in the PDF. Verification cannot be performed."
        else:
            match = "mismatch"
            if author:
                details = f"Claimed author \"{claimed}\" does not match PDF Author: \"{author}\"."
            elif creator:
                details = f"Claimed author \"{claimed}\" does not match PDF Creator: \"{creator}\"."
            else:
                details = f"Claimed author \"{claimed}\" could not be verified against available metadata."

        return {
            "success": True,
            "total_pages": total_pages,
            "claimed_author": claimed,
            "metadata": {
                "author": author,
                "creator": creator,
                "producer": producer,
                "creation_date": creation_date,
                "mod_date": mod_date,
                "title": title,
            },
            "verification_result": match,
            "details": details,
            "disclaimer": "This verification compares the claimed name against PDF metadata fields. "
                           "Metadata alone does not prove real-world identity.",
            "message": f"Verification result: {match.replace('_', ' ').title()}.",
        }


author_verification_service = AuthorVerificationService()
