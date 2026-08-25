"""
Document Ownership Verification Service — PDF Copyright Protection Section.

Analyzes PDF for ownership evidence and generates structured verification results.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any, Dict

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024

METADATA_KEYS_TO_CHECK = [
    "author", "creator", "producer", "title", "subject", "keywords",
    "copyright_holders", "license_information", "copyright_registration",
    "copyright_metadata", "digital_seal", "invisible_watermark",
]


class DocumentOwnershipVerificationService:
    """Verify document ownership from PDF metadata and content."""

    def _validate_pdf(self, pdf_bytes: bytes) -> None:
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError("File size exceeds the 200 MB limit.")
        if not pdf_bytes[:5].startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")

    def verify_ownership(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Analyze PDF for ownership evidence."""
        self._validate_pdf(pdf_bytes)
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        meta = doc.metadata or {}
        findings = []
        ownership_found = []
        ownership_incomplete = []
        ownership_not_found = []
        conflicts = []
        all_metadata = {}
        for key in meta:
            val = str(meta[key]).strip() if meta[key] else ""
            all_metadata[key] = val
        if meta.get("author", "").strip():
            findings.append({"category": "Author", "field": "author", "value": meta["author"], "status": "found"})
            ownership_found.append("author")
        else:
            findings.append({"category": "Author", "field": "author", "value": "", "status": "not_found"})
            ownership_not_found.append("author")
        if meta.get("creator", "").strip():
            findings.append({"category": "Creator", "field": "creator", "value": meta["creator"], "status": "found"})
            ownership_found.append("creator")
        if meta.get("producer", "").strip():
            findings.append({"category": "Producer", "field": "producer", "value": meta["producer"], "status": "found"})
            ownership_found.append("producer")
        for key in ["copyright_holders", "license_information", "copyright_registration", "copyright_metadata", "digital_seal", "invisible_watermark"]:
            raw = meta.get(key, "") or ""
            if raw:
                try:
                    data = json.loads(raw)
                    findings.append({"category": key.replace("_", " ").title(), "field": key, "value": str(data)[:200], "status": "found"})
                    ownership_found.append(key)
                except (json.JSONDecodeError, TypeError):
                    if raw.strip():
                        findings.append({"category": key.replace("_", " ").title(), "field": key, "value": raw[:200], "status": "found"})
                        ownership_found.append(key)
            else:
                findings.append({"category": key.replace("_", " ").title(), "field": key, "value": "", "status": "not_found"})
                ownership_not_found.append(key)
        if meta.get("author", "").strip() and meta.get("creator", "").strip():
            if meta["author"].strip().lower() != meta["creator"].strip().lower():
                conflicts.append({
                    "field1": "author",
                    "value1": meta["author"],
                    "field2": "creator",
                    "value2": meta["creator"],
                    "message": "Author and Creator fields differ.",
                })
        total_pages = doc.page_count
        file_size = len(pdf_bytes)
        doc.close()
        if conflicts:
            overall = "Information Conflict Detected"
        elif len(ownership_found) >= 3:
            overall = "Ownership Information Found"
        elif len(ownership_found) >= 1:
            overall = "Ownership Information Incomplete"
        else:
            overall = "Ownership Information Not Found"
        return {
            "success": True,
            "overall_result": overall,
            "findings": findings,
            "ownership_found": ownership_found,
            "ownership_incomplete": ownership_incomplete,
            "ownership_not_found": ownership_not_found,
            "conflicts": conflicts,
            "total_pages": total_pages,
            "file_size": file_size,
            "metadata_keys_checked": len(METADATA_KEYS_TO_CHECK),
            "message": f"Ownership verification complete: {overall}",
            "disclaimer": "This verification analyzes available document metadata only. It does not constitute legal proof of ownership.",
        }


document_ownership_verification_service = DocumentOwnershipVerificationService()
