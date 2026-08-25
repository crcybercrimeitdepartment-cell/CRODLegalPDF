"""
Copyright History Service — PDF Copyright Protection Section.

Maintains and retrieves historical changes to copyright-related information for a PDF.
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

HISTORY_DIR = Path("copyright_history")


class CopyrightHistoryService:
    """Maintain copyright change history for PDF documents."""

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
            for key in ["author", "creator", "producer", "title", "subject"]:
                result[key] = str(meta.get(key, "")).strip()
            result["creation_date"] = str(meta.get("creationDate", "")).strip()
            result["modification_date"] = str(meta.get("modDate", "")).strip()
            custom_keys = [
                "copyright_holders", "license_information", "copyright_registration",
                "ownership_information", "usage_rights", "copyright_policy",
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

    def _get_history_file(self, doc_hash: str) -> Path:
        HISTORY_DIR.mkdir(parents=True, exist_ok=True)
        return HISTORY_DIR / f"history_{doc_hash[:16]}.json"

    def _load_history(self, doc_hash: str) -> List[Dict[str, Any]]:
        history_file = self._get_history_file(doc_hash)
        if history_file.exists():
            try:
                with open(history_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return []
        return []

    def _save_history(self, doc_hash: str, entries: List[Dict[str, Any]]) -> None:
        history_file = self._get_history_file(doc_hash)
        with open(history_file, "w", encoding="utf-8") as f:
            json.dump(entries, f, indent=2, default=str)

    def add_entry(
        self,
        pdf_bytes: bytes,
        change_type: str,
        previous_info: Any = None,
        updated_info: Any = None,
        source: str = "Copyright History System",
        description: str = "",
    ) -> Dict[str, Any]:
        """Add a history entry for a copyright-related change."""
        self._validate_pdf(pdf_bytes)
        doc_hash = self._compute_hash(pdf_bytes)
        metadata = self._extract_metadata(pdf_bytes)
        entries = self._load_history(doc_hash)
        entry = {
            "entry_id": str(uuid.uuid4()),
            "change_type": change_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "document_name": metadata.get("title", "") or "Untitled",
            "document_hash": doc_hash,
            "previous_info": previous_info,
            "updated_info": updated_info,
            "source": source,
            "description": description,
            "change_status": "Recorded",
        }
        entries.append(entry)
        self._save_history(doc_hash, entries)
        return {
            "success": True,
            "entry": entry,
            "message": f"History entry '{change_type}' recorded successfully.",
        }

    def get_history(
        self,
        pdf_bytes: bytes,
        change_type: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Retrieve copyright history entries for a PDF."""
        self._validate_pdf(pdf_bytes)
        doc_hash = self._compute_hash(pdf_bytes)
        entries = self._load_history(doc_hash)
        filtered = entries
        if change_type:
            filtered = [e for e in filtered if e.get("change_type", "").lower() == change_type.lower()]
        if start_date:
            filtered = [e for e in filtered if e.get("timestamp", "") >= start_date]
        if end_date:
            filtered = [e for e in filtered if e.get("timestamp", "") <= end_date]
        filtered.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return {
            "success": True,
            "history": filtered,
            "total_count": len(filtered),
            "document_hash": doc_hash,
            "message": f"Found {len(filtered)} history entry(ies)." if filtered else "No copyright history available.",
        }

    def generate_report(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Generate a copyright history report."""
        self._validate_pdf(pdf_bytes)
        doc_hash = self._compute_hash(pdf_bytes)
        metadata = self._extract_metadata(pdf_bytes)
        entries = self._load_history(doc_hash)
        entries.sort(key=lambda x: x.get("timestamp", ""))
        change_types: Dict[str, int] = {}
        for e in entries:
            ct = e.get("change_type", "Unknown")
            change_types[ct] = change_types.get(ct, 0) + 1
        original_info = {
            "author": metadata.get("author", "") or "Not Available",
            "title": metadata.get("title", "") or "Not Available",
            "creation_date": metadata.get("creation_date", "") or "Not Available",
        }
        current_info = dict(original_info)
        for entry in entries:
            if entry.get("updated_info") and isinstance(entry["updated_info"], dict):
                current_info.update(entry["updated_info"])
        return {
            "success": True,
            "report": {
                "document_info": {
                    "title": metadata.get("title", "") or "Untitled",
                    "author": metadata.get("author", "") or "Not Available",
                    "document_hash": doc_hash,
                },
                "original_info": original_info,
                "current_info": current_info,
                "history": entries,
                "change_type_summary": change_types,
                "total_entries": len(entries),
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": "Copyright history report generated successfully.",
            "disclaimer": (
                "This report presents historical changes recorded by the application. "
                "History records do not constitute legal proof of copyright ownership."
            ),
        }


copyright_history_service = CopyrightHistoryService()
