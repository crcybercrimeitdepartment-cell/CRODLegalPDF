"""
Copyright Expiration Tracking Service — PDF Copyright Protection Section.

Tracks and calculates copyright validity status based on available data.
"""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024


class CopyrightExpirationTrackingService:
    """Track copyright expiration status for PDF documents."""

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
            result["creation_date"] = str(meta.get("creationDate", "")).strip()
            result["modification_date"] = str(meta.get("modDate", "")).strip()
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
            result["file_size"] = len(pdf_bytes)
            doc.close()
        except Exception as e:
            logger.warning(f"Metadata extraction error: {e}")
        return result

    def _parse_pdf_date(self, date_str: str) -> Optional[datetime]:
        """Parse PDF metadata date string (D:YYYYMMDDHHmmSS...)."""
        if not date_str:
            return None
        clean = date_str.replace("D:", "").replace("Z", "").strip()
        try:
            if len(clean) >= 14:
                return datetime(
                    int(clean[0:4]), int(clean[4:6]), int(clean[6:8]),
                    int(clean[8:10]), int(clean[10:12]), int(clean[12:14]),
                    tzinfo=timezone.utc,
                )
            elif len(clean) >= 8:
                return datetime(
                    int(clean[0:4]), int(clean[4:6]), int(clean[6:8]),
                    tzinfo=timezone.utc,
                )
        except (ValueError, IndexError):
            pass
        return None

    def _determine_status(
        self,
        effective_date: Optional[datetime],
        expiration_date: Optional[datetime],
        now: datetime,
    ) -> Dict[str, Any]:
        if not expiration_date:
            return {
                "status": "Expiration Date Not Available",
                "days_remaining": None,
                "expired_duration": None,
                "explanation": "Expiration date cannot be determined from the available information.",
            }
        days_remaining = (expiration_date - now).days
        if days_remaining < 0:
            expired_days = abs(days_remaining)
            return {
                "status": "Expired",
                "days_remaining": 0,
                "expired_duration": f"{expired_days} day(s)",
                "explanation": f"Copyright expired {expired_days} day(s) ago.",
            }
        elif days_remaining <= 90:
            return {
                "status": "Expiring Soon",
                "days_remaining": days_remaining,
                "expired_duration": None,
                "explanation": f"Copyright expires in {days_remaining} day(s).",
            }
        else:
            return {
                "status": "Active",
                "days_remaining": days_remaining,
                "expired_duration": None,
                "explanation": f"Copyright is active for {days_remaining} more day(s).",
            }

    def track(
        self,
        pdf_bytes: bytes,
        effective_date: str = "",
        expiration_date: str = "",
        copyright_holder: str = "",
        expiration_threshold_days: int = 90,
    ) -> Dict[str, Any]:
        """Track copyright expiration for a PDF."""
        self._validate_pdf(pdf_bytes)
        doc_hash = self._compute_hash(pdf_bytes)
        metadata = self._extract_metadata(pdf_bytes)
        now = datetime.now(timezone.utc)
        effective_dt = None
        expiration_dt = None
        effective_source = "Not provided"
        expiration_source = "Not provided"
        if effective_date:
            try:
                effective_dt = datetime.fromisoformat(effective_date.replace("Z", "+00:00"))
                effective_source = "User provided"
            except ValueError:
                pass
        if not effective_dt:
            creation_str = metadata.get("creation_date", "")
            effective_dt = self._parse_pdf_date(creation_str)
            if effective_dt:
                effective_source = "PDF Metadata"
        if expiration_date:
            try:
                expiration_dt = datetime.fromisoformat(expiration_date.replace("Z", "+00:00"))
                expiration_source = "User provided"
            except ValueError:
                pass
        status_info = self._determine_status(effective_dt, expiration_dt, now)
        holder = copyright_holder or ""
        if not holder:
            author = metadata.get("author", "")
            copyright_holders = metadata.get("copyright_holders")
            if copyright_holders and isinstance(copyright_holders, list) and copyright_holders:
                holder = copyright_holders[0].get("name", "") if isinstance(copyright_holders[0], dict) else str(copyright_holders[0])
            elif author:
                holder = author
            else:
                holder = "Not Available"
        if status_info["days_remaining"] is not None and status_info["days_remaining"] <= expiration_threshold_days:
            status_info["threshold_warning"] = True
        return {
            "success": True,
            "tracking": {
                "document_hash": doc_hash,
                "document_name": metadata.get("title", "") or "Untitled",
                "copyright_holder": holder,
                "effective_date": effective_dt.isoformat() if effective_dt else "Not Available",
                "effective_date_source": effective_source,
                "expiration_date": expiration_dt.isoformat() if expiration_dt else "Not Available",
                "expiration_date_source": expiration_source,
                "status": status_info["status"],
                "days_remaining": status_info["days_remaining"],
                "expired_duration": status_info["expired_duration"],
                "explanation": status_info["explanation"],
                "threshold_warning": status_info.get("threshold_warning", False),
                "last_checked": now.isoformat(),
            },
            "timestamp": now.isoformat(),
            "message": f"Expiration status: {status_info['status']}.",
            "disclaimer": (
                "Copyright duration varies by jurisdiction. "
                "The system cannot reliably determine the legal expiration date from available information alone. "
                "Consult a legal professional for authoritative copyright duration."
            ),
        }


copyright_expiration_tracking_service = CopyrightExpirationTrackingService()
