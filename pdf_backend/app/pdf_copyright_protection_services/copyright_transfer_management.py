"""
Copyright Transfer Management Service — PDF Copyright Protection Section.

Manages copyright ownership transfer workflows.
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

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024

TRANSFER_DIR = Path("copyright_transfers")


class CopyrightTransferManagementService:
    """Manage copyright ownership transfers for PDF documents."""

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
            for key in ["author", "creator", "producer", "title", "subject"]:
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

    def _get_transfer_file(self, doc_hash: str) -> Path:
        TRANSFER_DIR.mkdir(parents=True, exist_ok=True)
        return TRANSFER_DIR / f"transfers_{doc_hash[:16]}.json"

    def _load_transfers(self, doc_hash: str) -> List[Dict[str, Any]]:
        transfer_file = self._get_transfer_file(doc_hash)
        if transfer_file.exists():
            try:
                with open(transfer_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return []
        return []

    def _save_transfers(self, doc_hash: str, transfers: List[Dict[str, Any]]) -> None:
        transfer_file = self._get_transfer_file(doc_hash)
        with open(transfer_file, "w", encoding="utf-8") as f:
            json.dump(transfers, f, indent=2, default=str)

    def get_current_owner(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Retrieve current ownership information."""
        self._validate_pdf(pdf_bytes)
        doc_hash = self._compute_hash(pdf_bytes)
        metadata = self._extract_metadata(pdf_bytes)
        transfers = self._load_transfers(doc_hash)
        current_owner = None
        if transfers:
            last_transfer = transfers[-1]
            current_owner = last_transfer.get("new_owner")
        if not current_owner:
            author = metadata.get("author", "")
            copyright_holders = metadata.get("copyright_holders")
            if copyright_holders and isinstance(copyright_holders, list) and len(copyright_holders) > 0:
                current_owner = copyright_holders[0]
            elif author:
                current_owner = {"name": author, "organization": ""}
            else:
                current_owner = {"name": "Unknown", "organization": ""}
        return {
            "success": True,
            "current_owner": current_owner,
            "document_hash": doc_hash,
            "metadata_author": metadata.get("author", ""),
            "total_transfers": len(transfers),
        }

    def execute_transfer(
        self,
        pdf_bytes: bytes,
        current_owner_name: str = "",
        current_owner_org: str = "",
        new_owner_name: str = "",
        new_owner_org: str = "",
        new_owner_contact: str = "",
        effective_date: str = "",
        transfer_reason: str = "",
        supporting_reference: str = "",
        notes: str = "",
    ) -> Dict[str, Any]:
        """Execute a copyright ownership transfer."""
        self._validate_pdf(pdf_bytes)
        if not new_owner_name.strip():
            raise ValueError("New owner name is required.")
        if not effective_date.strip():
            raise ValueError("Transfer effective date is required.")
        doc_hash = self._compute_hash(pdf_bytes)
        metadata = self._extract_metadata(pdf_bytes)
        transfers = self._load_transfers(doc_hash)
        previous_owner = None
        if transfers:
            last = transfers[-1]
            previous_owner = last.get("new_owner")
        if not previous_owner:
            author = metadata.get("author", "")
            previous_owner = {"name": current_owner_name or author or "Unknown", "organization": current_owner_org}
        new_owner = {
            "name": new_owner_name.strip(),
            "organization": new_owner_org.strip(),
            "contact": new_owner_contact.strip(),
        }
        transfer_record = {
            "transfer_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "document_name": metadata.get("title", "") or "Untitled",
            "document_hash": doc_hash,
            "previous_owner": previous_owner,
            "new_owner": new_owner,
            "effective_date": effective_date.strip(),
            "transfer_reason": transfer_reason.strip(),
            "supporting_reference": supporting_reference.strip(),
            "notes": notes.strip(),
            "validation_status": "Completed",
        }
        transfers.append(transfer_record)
        self._save_transfers(doc_hash, transfers)
        return {
            "success": True,
            "transfer": transfer_record,
            "message": "Copyright transfer completed successfully.",
            "disclaimer": (
                "This transfer record is maintained by the application for tracking purposes. "
                "It does not constitute legal authorization for copyright transfer. "
                "Consult a legal professional for legally binding copyright transfers."
            ),
        }

    def get_transfer_history(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Retrieve transfer history for a PDF."""
        self._validate_pdf(pdf_bytes)
        doc_hash = self._compute_hash(pdf_bytes)
        transfers = self._load_transfers(doc_hash)
        transfers.sort(key=lambda x: x.get("timestamp", ""))
        return {
            "success": True,
            "transfers": transfers,
            "total_count": len(transfers),
            "document_hash": doc_hash,
        }

    def generate_report(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Generate a transfer report."""
        self._validate_pdf(pdf_bytes)
        doc_hash = self._compute_hash(pdf_bytes)
        metadata = self._extract_metadata(pdf_bytes)
        transfers = self._load_transfers(doc_hash)
        transfers.sort(key=lambda x: x.get("effective_date", ""))
        current_owner = None
        if transfers:
            current_owner = transfers[-1].get("new_owner")
        return {
            "success": True,
            "report": {
                "document_info": {
                    "title": metadata.get("title", "") or "Untitled",
                    "author": metadata.get("author", "") or "Not Available",
                    "document_hash": doc_hash,
                },
                "current_owner": current_owner,
                "transfer_history": transfers,
                "total_transfers": len(transfers),
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": "Transfer report generated successfully.",
            "disclaimer": (
                "This report presents transfer records maintained by the application. "
                "Transfer records do not constitute legal proof of copyright transfer. "
                "Consult a legal professional for legally binding copyright transfers."
            ),
        }


copyright_transfer_management_service = CopyrightTransferManagementService()
