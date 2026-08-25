"""
Copyright Audit Trail Service — PDF Copyright Protection Section.

Tracks and records copyright-related activities performed by the application.
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

AUDIT_DIR = Path("audit_records")


class CopyrightAuditTrailService:
    """Track copyright-related audit events."""

    def _validate_pdf(self, pdf_bytes: bytes) -> None:
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError("File size exceeds the 200 MB limit.")
        if not pdf_bytes[:5].startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")

    def _compute_hash(self, pdf_bytes: bytes) -> str:
        return hashlib.sha256(pdf_bytes).hexdigest()

    def _extract_metadata(self, pdf_bytes: bytes) -> Dict[str, Any]:
        result: Dict[str, Any] = {}
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            meta = doc.metadata or {}
            for key in ["author", "creator", "producer", "title", "subject", "keywords"]:
                result[key] = str(meta.get(key, "")).strip()
            result["creation_date"] = str(meta.get("creationDate", "")).strip()
            result["modification_date"] = str(meta.get("modDate", "")).strip()
            custom_keys = [
                "copyright_holders", "license_information", "copyright_registration",
                "ownership_information", "digital_seal", "invisible_watermark",
                "usage_rights", "copyright_policy",
            ]
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

    def _get_audit_file(self, doc_hash: str) -> Path:
        AUDIT_DIR.mkdir(parents=True, exist_ok=True)
        return AUDIT_DIR / f"audit_{doc_hash[:16]}.json"

    def _load_audit(self, doc_hash: str) -> List[Dict[str, Any]]:
        audit_file = self._get_audit_file(doc_hash)
        if audit_file.exists():
            try:
                with open(audit_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return []
        return []

    def _save_audit(self, doc_hash: str, events: List[Dict[str, Any]]) -> None:
        audit_file = self._get_audit_file(doc_hash)
        with open(audit_file, "w", encoding="utf-8") as f:
            json.dump(events, f, indent=2, default=str)

    def add_event(
        self,
        pdf_bytes: bytes,
        event_type: str,
        description: str = "",
        previous_value: Any = None,
        new_value: Any = None,
        action_result: str = "",
        source: str = "Copyright Audit System",
    ) -> Dict[str, Any]:
        """Append a new audit event for the given PDF."""
        self._validate_pdf(pdf_bytes)
        doc_hash = self._compute_hash(pdf_bytes)
        metadata = self._extract_metadata(pdf_bytes)
        events = self._load_audit(doc_hash)
        event = {
            "event_id": str(uuid.uuid4()),
            "event_type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "document_name": metadata.get("title", "") or "Untitled",
            "document_hash": doc_hash,
            "author": metadata.get("author", ""),
            "creator": metadata.get("creator", ""),
            "description": description,
            "previous_value": previous_value,
            "new_value": new_value,
            "action_result": action_result,
            "source": source,
            "user_info": "Application user",
        }
        events.append(event)
        self._save_audit(doc_hash, events)
        return {
            "success": True,
            "event": event,
            "message": f"Audit event '{event_type}' recorded successfully.",
        }

    def get_events(
        self,
        pdf_bytes: bytes,
        event_type: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Retrieve audit events for a PDF with optional filters."""
        self._validate_pdf(pdf_bytes)
        doc_hash = self._compute_hash(pdf_bytes)
        events = self._load_audit(doc_hash)
        filtered = events
        if event_type:
            filtered = [e for e in filtered if e.get("event_type", "").lower() == event_type.lower()]
        if start_date:
            filtered = [e for e in filtered if e.get("timestamp", "") >= start_date]
        if end_date:
            filtered = [e for e in filtered if e.get("timestamp", "") <= end_date]
        filtered.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return {
            "success": True,
            "events": filtered,
            "total_count": len(filtered),
            "document_hash": doc_hash,
            "message": f"Found {len(filtered)} audit event(s).",
        }

    def generate_report(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Generate an audit trail report."""
        self._validate_pdf(pdf_bytes)
        doc_hash = self._compute_hash(pdf_bytes)
        metadata = self._extract_metadata(pdf_bytes)
        events = self._load_audit(doc_hash)
        events.sort(key=lambda x: x.get("timestamp", ""))
        event_types = {}
        for e in events:
            et = e.get("event_type", "Unknown")
            event_types[et] = event_types.get(et, 0) + 1
        return {
            "success": True,
            "report": {
                "document_info": {
                    "title": metadata.get("title", "") or "Untitled",
                    "author": metadata.get("author", "") or "Not Available",
                    "document_hash": doc_hash,
                },
                "events": events,
                "event_type_summary": event_types,
                "total_events": len(events),
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": "Audit trail report generated successfully.",
            "disclaimer": (
                "This audit trail records application-level copyright operations only. "
                "Audit records do not constitute legal proof of copyright ownership."
            ),
        }


copyright_audit_trail_service = CopyrightAuditTrailService()
