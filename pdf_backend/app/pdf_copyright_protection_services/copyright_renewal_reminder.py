"""
Copyright Renewal Reminder Service — PDF Copyright Protection Section.

Configures and manages renewal reminders for copyright records with known expiration dates.
"""

from __future__ import annotations

import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024

REMINDER_DIR = Path("copyright_reminders")

PRESETS = [
    {"label": "90 days before", "days": 90},
    {"label": "60 days before", "days": 60},
    {"label": "30 days before", "days": 30},
    {"label": "7 days before", "days": 7},
]


class CopyrightRenewalReminderService:
    """Configure and manage copyright renewal reminders."""

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
            for key in ["author", "creator", "title"]:
                result[key] = str(meta.get(key, "")).strip()
            result["creation_date"] = str(meta.get("creationDate", "")).strip()
            custom_keys = ["copyright_holders", "ownership_information"]
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
            doc.close()
        except Exception as e:
            logger.warning(f"Metadata extraction error: {e}")
        return result

    def _get_reminder_file(self, doc_hash: str) -> Path:
        REMINDER_DIR.mkdir(parents=True, exist_ok=True)
        return REMINDER_DIR / f"reminders_{doc_hash[:16]}.json"

    def _load_reminders(self, doc_hash: str) -> List[Dict[str, Any]]:
        reminder_file = self._get_reminder_file(doc_hash)
        if reminder_file.exists():
            try:
                with open(reminder_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return []
        return []

    def _save_reminders(self, doc_hash: str, reminders: List[Dict[str, Any]]) -> None:
        reminder_file = self._get_reminder_file(doc_hash)
        with open(reminder_file, "w", encoding="utf-8") as f:
            json.dump(reminders, f, indent=2, default=str)

    def get_presets(self) -> Dict[str, Any]:
        return {"success": True, "presets": PRESETS}

    def configure_reminder(
        self,
        pdf_bytes: bytes,
        enabled: bool = True,
        reminder_days: int = 30,
        expiration_date: str = "",
        custom_description: str = "",
    ) -> Dict[str, Any]:
        """Configure a renewal reminder for a PDF."""
        self._validate_pdf(pdf_bytes)
        if reminder_days < 1:
            raise ValueError("Reminder interval must be at least 1 day.")
        doc_hash = self._compute_hash(pdf_bytes)
        metadata = self._extract_metadata(pdf_bytes)
        reminders = self._load_reminders(doc_hash)
        next_reminder_date = None
        if expiration_date:
            try:
                exp_dt = datetime.fromisoformat(expiration_date.replace("Z", "+00:00"))
                next_reminder_date = (exp_dt - timedelta(days=reminder_days)).isoformat()
            except ValueError:
                pass
        now = datetime.now(timezone.utc)
        existing = next((r for r in reminders if r.get("enabled")), None)
        if existing:
            existing["enabled"] = enabled
            existing["reminder_days"] = reminder_days
            existing["expiration_date"] = expiration_date
            existing["next_reminder_date"] = next_reminder_date
            existing["description"] = custom_description
            existing["last_updated"] = now.isoformat()
            reminder = existing
        else:
            reminder = {
                "reminder_id": str(uuid.uuid4()),
                "enabled": enabled,
                "reminder_days": reminder_days,
                "expiration_date": expiration_date,
                "next_reminder_date": next_reminder_date,
                "description": custom_description,
                "created_at": now.isoformat(),
                "last_updated": now.isoformat(),
                "renewal_status": "Pending" if enabled else "Disabled",
                "document_hash": doc_hash,
                "document_name": metadata.get("title", "") or "Untitled",
                "copyright_holder": metadata.get("author", "") or "Not Available",
            }
            reminders.append(reminder)
        self._save_reminders(doc_hash, reminders)
        return {
            "success": True,
            "reminder": reminder,
            "message": "Renewal reminder configured successfully." if enabled else "Renewal reminder disabled.",
        }

    def get_reminder_status(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Get current reminder status for a PDF."""
        self._validate_pdf(pdf_bytes)
        doc_hash = self._compute_hash(pdf_bytes)
        reminders = self._load_reminders(doc_hash)
        now = datetime.now(timezone.utc)
        active = [r for r in reminders if r.get("enabled")]
        if active:
            reminder = active[-1]
            days_until_reminder = None
            if reminder.get("next_reminder_date"):
                try:
                    next_dt = datetime.fromisoformat(reminder["next_reminder_date"])
                    days_until_reminder = (next_dt - now).days
                except ValueError:
                    pass
            is_due = days_until_reminder is not None and days_until_reminder <= 0
            return {
                "success": True,
                "status": {
                    "has_reminder": True,
                    "enabled": True,
                    "reminder_days": reminder.get("reminder_days", 0),
                    "expiration_date": reminder.get("expiration_date", "Not Available"),
                    "next_reminder_date": reminder.get("next_reminder_date", "Not Available"),
                    "days_until_reminder": days_until_reminder,
                    "is_due": is_due,
                    "renewal_status": "Due" if is_due else "Pending",
                    "description": reminder.get("description", ""),
                    "document_name": reminder.get("document_name", ""),
                    "copyright_holder": reminder.get("copyright_holder", ""),
                },
                "timestamp": now.isoformat(),
            }
        return {
            "success": True,
            "status": {
                "has_reminder": False,
                "enabled": False,
                "message": "No renewal reminder configured for this document.",
            },
            "timestamp": now.isoformat(),
        }

    def generate_report(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Generate a renewal reminder report."""
        self._validate_pdf(pdf_bytes)
        doc_hash = self._compute_hash(pdf_bytes)
        metadata = self._extract_metadata(pdf_bytes)
        reminders = self._load_reminders(doc_hash)
        now = datetime.now(timezone.utc)
        active_reminders = [r for r in reminders if r.get("enabled")]
        return {
            "success": True,
            "report": {
                "document_info": {
                    "title": metadata.get("title", "") or "Untitled",
                    "author": metadata.get("author", "") or "Not Available",
                    "document_hash": doc_hash,
                },
                "reminders": reminders,
                "active_count": len(active_reminders),
                "total_count": len(reminders),
            },
            "timestamp": now.isoformat(),
            "message": "Renewal reminder report generated successfully.",
            "disclaimer": (
                "This report presents renewal reminder configurations maintained by the application. "
                "The application does not send external email or SMS notifications. "
                "Reminder status is available within the application only."
            ),
        }


copyright_renewal_reminder_service = CopyrightRenewalReminderService()
