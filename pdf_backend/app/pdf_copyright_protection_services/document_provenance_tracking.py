"""
Document Provenance Tracking Service — PDF Copyright Protection Section.

Creates provenance timelines representing the available lifecycle of a PDF.
"""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024

PROVENANCE_DIR = Path("document_provenance")


class DocumentProvenanceTrackingService:
    """Track and report document provenance lifecycle events."""

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
            text = ""
            for page in doc:
                text += page.get_text()
            result["text_preview"] = text[:10000]
            result["total_pages"] = doc.page_count
            result["file_size"] = len(pdf_bytes)
            doc.close()
        except Exception as e:
            logger.warning(f"Metadata extraction error: {e}")
        return result

    def _parse_pdf_date(self, date_str: str) -> Optional[str]:
        if not date_str:
            return None
        clean = date_str.replace("D:", "").replace("Z", "").strip()
        try:
            if len(clean) >= 14:
                dt = datetime(
                    int(clean[0:4]), int(clean[4:6]), int(clean[6:8]),
                    int(clean[8:10]), int(clean[10:12]), int(clean[12:14]),
                    tzinfo=timezone.utc,
                )
                return dt.isoformat()
            elif len(clean) >= 8:
                dt = datetime(int(clean[0:4]), int(clean[4:6]), int(clean[6:8]), tzinfo=timezone.utc)
                return dt.isoformat()
        except (ValueError, IndexError):
            pass
        return None

    def _load_extra_events(self, doc_hash: str) -> List[Dict[str, Any]]:
        provenance_file = PROVENANCE_DIR / f"provenance_{doc_hash[:16]}.json"
        if provenance_file.exists():
            try:
                with open(provenance_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return []
        return []

    def _build_timeline(self, metadata: Dict[str, Any], doc_hash: str) -> List[Dict[str, Any]]:
        events: List[Dict[str, Any]] = []
        creation_date = self._parse_pdf_date(metadata.get("creation_date", ""))
        if creation_date:
            events.append({
                "event_type": "Document Creation",
                "timestamp": creation_date,
                "description": "PDF document was created.",
                "source": "PDF Metadata",
                "state": {"total_pages": metadata.get("total_pages", 0)},
            })
        author = metadata.get("author", "")
        if author:
            events.append({
                "event_type": "Initial Metadata",
                "timestamp": creation_date or datetime.now(timezone.utc).isoformat(),
                "description": f"Author/creator identified: {author}.",
                "source": "PDF Metadata",
                "state": {"author": author},
            })
        copyright_holders = metadata.get("copyright_holders")
        if copyright_holders:
            events.append({
                "event_type": "Ownership Registration",
                "timestamp": creation_date or datetime.now(timezone.utc).isoformat(),
                "description": "Copyright holder information found in document.",
                "source": "Application Records",
                "state": {"copyright_holders": copyright_holders},
            })
        license_info = metadata.get("license_information")
        if license_info:
            events.append({
                "event_type": "Copyright Update",
                "timestamp": creation_date or datetime.now(timezone.utc).isoformat(),
                "description": "License information found in document.",
                "source": "Application Records",
                "state": {"license": license_info},
            })
        registration_info = metadata.get("copyright_registration")
        if registration_info:
            events.append({
                "event_type": "Registration",
                "timestamp": creation_date or datetime.now(timezone.utc).isoformat(),
                "description": "Copyright registration information found.",
                "source": "Application Records",
                "state": {"registration": registration_info},
            })
        digital_seal = metadata.get("digital_seal")
        if digital_seal:
            events.append({
                "event_type": "Verification",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "description": "Digital copyright seal present.",
                "source": "Application Records",
                "state": {"digital_seal": digital_seal},
            })
        modification_date = self._parse_pdf_date(metadata.get("modification_date", ""))
        if modification_date and modification_date != creation_date:
            events.append({
                "event_type": "Document Modified",
                "timestamp": modification_date,
                "description": "Document modification detected.",
                "source": "PDF Metadata",
                "state": {"modification_date": modification_date},
            })
        extra_events = self._load_extra_events(doc_hash)
        events.extend(extra_events)
        events.append({
            "event_type": "Provenance Tracked",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "description": "Provenance timeline generated.",
            "source": "Document Provenance Tracking System",
            "state": {},
        })
        events.sort(key=lambda x: x.get("timestamp", ""))
        return events

    def track(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Track and return the provenance timeline for a PDF."""
        self._validate_pdf(pdf_bytes)
        doc_hash = self._compute_hash(pdf_bytes)
        metadata = self._extract_metadata(pdf_bytes)
        timeline = self._build_timeline(metadata, doc_hash)
        ownership_events = [e for e in timeline if e["event_type"] in ("Ownership Registration", "Document Modified")]
        copyright_events = [e for e in timeline if e["event_type"] in ("Copyright Update", "Registration")]
        verification_events = [e for e in timeline if e["event_type"] == "Verification"]
        return {
            "success": True,
            "provenance": {
                "document_info": {
                    "title": metadata.get("title", "") or "Untitled",
                    "author": metadata.get("author", "") or "Not Available",
                    "creator": metadata.get("creator", "") or "Not Available",
                    "document_hash": doc_hash,
                    "total_pages": metadata.get("total_pages", 0),
                    "file_size": metadata.get("file_size", 0),
                },
                "timeline": timeline,
                "ownership_events": ownership_events,
                "copyright_events": copyright_events,
                "verification_events": verification_events,
                "total_events": len(timeline),
                "current_status": "Tracked",
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": f"Provenance timeline generated with {len(timeline)} event(s).",
            "disclaimer": (
                "This provenance timeline is based on available PDF metadata and application records. "
                "The hash identifies a particular file state and does not by itself prove legal ownership. "
                "Provenance information does not constitute legal proof of copyright ownership."
            ),
        }

    def generate_report(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Generate a provenance report."""
        self._validate_pdf(pdf_bytes)
        result = self.track(pdf_bytes)
        return {
            "success": True,
            "report": result["provenance"],
            "timestamp": result["timestamp"],
            "message": "Provenance report generated successfully.",
            "disclaimer": result["disclaimer"],
        }


document_provenance_tracking_service = DocumentProvenanceTrackingService()
