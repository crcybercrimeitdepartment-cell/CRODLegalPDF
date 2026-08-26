"""
Copyright Revocation Record Service — PDF Copyright Protection Section.

Records and manages copyright revocation/cancellation information.
"""

from __future__ import annotations

import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024

REVOCATION_DIR = Path("copyright_revocations")


class CopyrightRevocationRecordService:
    """Record and manage copyright revocation information."""

    def _validate_pdf(self, pdf_bytes: bytes) -> None:
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError("File size exceeds the 200 MB limit.")
        if not pdf_bytes[:5].startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")

    def _compute_hash(self, pdf_bytes: bytes) -> str:
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            content_hash = hashlib.sha256()
            has_content = False
            for page in doc:
                text = page.get_text()
                if text:
                    content_hash.update(text.encode('utf-8'))
                    has_content = True
                for img in page.get_images(full=True):
                    xref = img[0]
                    base_image = doc.extract_image(xref)
                    if base_image and "image" in base_image:
                        content_hash.update(base_image["image"])
                        has_content = True
            doc.close()
            if has_content:
                return content_hash.hexdigest()
            return hashlib.sha256(pdf_bytes).hexdigest()
        except Exception:
            return hashlib.sha256(pdf_bytes).hexdigest()

    def _extract_metadata(self, pdf_bytes: bytes) -> Dict[str, Any]:
        result: Dict[str, Any] = {}
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            meta = doc.metadata or {}
            for key in ["author", "creator", "producer", "title"]:
                result[key] = str(meta.get(key, "")).strip()
            custom_keys = ["copyright_holders", "ownership_information", "copyright_registration"]
            for key in custom_keys:
                raw = meta.get(key, "") or ""
                if raw:
                    try:
                        result[key] = json.loads(raw)
                    except (json.JSONDecodeError, TypeError):
                        result[key] = raw
                else:
                    result[key] = None
            result["total_pages"] = doc.page_count
            result["file_size"] = len(pdf_bytes)
            doc.close()
        except Exception as e:
            logger.warning(f"Metadata extraction error: {e}")
        return result

    def _get_revocation_file(self, doc_hash: str) -> Path:
        REVOCATION_DIR.mkdir(parents=True, exist_ok=True)
        return REVOCATION_DIR / f"revocations_{doc_hash[:16]}.json"

    def _load_revocations(self, doc_hash: str) -> List[Dict[str, Any]]:
        revocation_file = self._get_revocation_file(doc_hash)
        if revocation_file.exists():
            try:
                with open(revocation_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return []
        return []

    def _save_revocations(self, doc_hash: str, records: List[Dict[str, Any]]) -> None:
        revocation_file = self._get_revocation_file(doc_hash)
        with open(revocation_file, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, default=str)

    def get_copyright_record(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Retrieve current copyright record for review before revocation."""
        self._validate_pdf(pdf_bytes)
        doc_hash = self._compute_hash(pdf_bytes)
        metadata = self._extract_metadata(pdf_bytes)
        revocations = self._load_revocations(doc_hash)
        copyright_holders = metadata.get("copyright_holders")
        holder_info = None
        if copyright_holders and isinstance(copyright_holders, list) and copyright_holders:
            holder_info = copyright_holders[0]
        elif metadata.get("author"):
            holder_info = {"name": metadata["author"], "organization": ""}
        return {
            "success": True,
            "record": {
                "document_name": metadata.get("title", "") or "Untitled",
                "document_hash": doc_hash,
                "author": metadata.get("author", "") or "Not Available",
                "creator": metadata.get("creator", "") or "Not Available",
                "copyright_holder": holder_info,
                "registration_info": metadata.get("copyright_registration"),
                "previous_revocations": len(revocations),
                "is_revoked": any(r.get("status") == "Active" for r in revocations),
            },
        }

    def record_revocation(
        self,
        pdf_bytes: bytes,
        revocation_date: str = "",
        revocation_reason: str = "",
        reference_number: str = "",
        description: str = "",
        notes: str = "",
    ) -> Dict[str, Any]:
        """Record a copyright revocation."""
        self._validate_pdf(pdf_bytes)
        if not revocation_date.strip():
            raise ValueError("Revocation date is required.")
        if not revocation_reason.strip():
            raise ValueError("Revocation reason is required.")
        doc_hash = self._compute_hash(pdf_bytes)
        metadata = self._extract_metadata(pdf_bytes)
        revocations = self._load_revocations(doc_hash)
        copyright_holders = metadata.get("copyright_holders")
        holder_info = None
        if copyright_holders and isinstance(copyright_holders, list) and copyright_holders:
            holder_info = copyright_holders[0]
        elif metadata.get("author"):
            holder_info = {"name": metadata["author"], "organization": ""}
        revocation_record = {
            "revocation_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "document_name": metadata.get("title", "") or "Untitled",
            "document_hash": doc_hash,
            "copyright_holder": holder_info,
            "revocation_date": revocation_date.strip(),
            "revocation_reason": revocation_reason.strip(),
            "reference_number": reference_number.strip(),
            "description": description.strip(),
            "notes": notes.strip(),
            "status": "Active",
            "previous_record_preserved": True,
        }
        revocations.append(revocation_record)
        self._save_revocations(doc_hash, revocations)
        return {
            "success": True,
            "revocation": revocation_record,
            "message": "Copyright revocation recorded successfully.",
            "disclaimer": (
                "This revocation record is maintained by the application for tracking purposes. "
                "It does not constitute legal revocation of copyright. "
                "Consult a legal professional for legally binding copyright revocation."
            ),
        }

    def get_revocation_history(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Retrieve revocation history for a PDF."""
        self._validate_pdf(pdf_bytes)
        doc_hash = self._compute_hash(pdf_bytes)
        revocations = self._load_revocations(doc_hash)
        revocations.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return {
            "success": True,
            "revocations": revocations,
            "total_count": len(revocations),
            "document_hash": doc_hash,
        }

    def generate_report(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Generate a revocation report."""
        self._validate_pdf(pdf_bytes)
        doc_hash = self._compute_hash(pdf_bytes)
        metadata = self._extract_metadata(pdf_bytes)
        revocations = self._load_revocations(doc_hash)
        return {
            "success": True,
            "report": {
                "document_info": {
                    "title": metadata.get("title", "") or "Untitled",
                    "author": metadata.get("author", "") or "Not Available",
                    "document_hash": doc_hash,
                },
                "revocation_records": revocations,
                "total_revocations": len(revocations),
                "active_revocations": sum(1 for r in revocations if r.get("status") == "Active"),
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": "Revocation report generated successfully.",
            "disclaimer": (
                "This report presents revocation records maintained by the application. "
                "Revocation records do not constitute legal proof of copyright revocation. "
                "Consult a legal professional for legally binding copyright revocation."
            ),
        }


copyright_revocation_record_service = CopyrightRevocationRecordService()
