"""
Copyright Evidence Report Service — PDF Copyright Protection Section.

Collects all available copyright-related evidence from the PDF and application records.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024


class CopyrightEvidenceReportService:
    """Collect and report all copyright-related evidence from a PDF."""

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
            result["author"] = str(meta.get("author", "")).strip()
            result["creator"] = str(meta.get("creator", "")).strip()
            result["producer"] = str(meta.get("producer", "")).strip()
            result["title"] = str(meta.get("title", "")).strip()
            result["subject"] = str(meta.get("subject", "")).strip()
            result["keywords"] = str(meta.get("keywords", "")).strip()
            result["creation_date"] = str(meta.get("creationDate", "")).strip()
            result["modification_date"] = str(meta.get("modDate", "")).strip()
            custom_keys = [
                "copyright_holders", "license_information", "copyright_metadata",
                "copyright_registration", "ownership_information", "digital_seal",
                "invisible_watermark", "usage_rights", "copyright_policy",
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
            result["full_text"] = text[:50000]
            result["total_pages"] = doc.page_count
            result["file_size"] = len(pdf_bytes)
            doc.close()
        except Exception as e:
            logger.warning(f"Metadata extraction error: {e}")
        return result

    def _collect_evidence(self, metadata: Dict[str, Any], doc_hash: str) -> Dict[str, Any]:
        evidence: Dict[str, Any] = {
            "document_info": {
                "status": "Available",
                "filename": "Uploaded PDF",
                "document_hash": doc_hash,
                "total_pages": metadata.get("total_pages", 0),
                "file_size": metadata.get("file_size", 0),
                "title": metadata.get("title", "") or "Not Available",
            },
            "ownership_evidence": {
                "status": "Available",
                "author": metadata.get("author", "") or "Not Available",
                "creator": metadata.get("creator", "") or "Not Available",
                "copyright_holders": None,
                "ownership_info": None,
            },
            "copyright_info": {
                "status": "Available",
                "copyright_notice": None,
                "copyright_metadata": None,
                "license_info": None,
            },
            "registration_evidence": {
                "status": "Available",
                "registration_info": None,
            },
            "metadata_evidence": {
                "status": "Available",
                "producer": metadata.get("producer", "") or "Not Available",
                "subject": metadata.get("subject", "") or "Not Available",
                "keywords": metadata.get("keywords", "") or "Not Available",
                "creation_date": metadata.get("creation_date", "") or "Not Available",
                "modification_date": metadata.get("modification_date", "") or "Not Available",
            },
            "integrity_info": {
                "status": "Available",
                "document_hash": doc_hash,
                "hash_algorithm": "SHA-256",
                "hash_note": "This hash identifies a particular file state and does not by itself prove legal ownership.",
            },
            "verification_info": {
                "status": "Available",
                "digital_seal": None,
                "invisible_watermark": None,
            },
            "timeline": [],
        }
        copyright_holders = metadata.get("copyright_holders")
        if copyright_holders:
            evidence["ownership_evidence"]["copyright_holders"] = copyright_holders
            evidence["ownership_evidence"]["status"] = "Available"
        ownership_info = metadata.get("ownership_information")
        if ownership_info:
            evidence["ownership_evidence"]["ownership_info"] = ownership_info
        text_preview = metadata.get("full_text", "")
        copyright_match = re.search(
            r"(?:©|\(c\)|copyright)\s*[\d\w\s,.-]+", text_preview, re.IGNORECASE
        )
        if copyright_match:
            evidence["copyright_info"]["copyright_notice"] = copyright_match.group(0).strip()
        copyright_metadata = metadata.get("copyright_metadata")
        if copyright_metadata:
            evidence["copyright_info"]["copyright_metadata"] = copyright_metadata
        license_info = metadata.get("license_information")
        if license_info:
            evidence["copyright_info"]["license_info"] = license_info
            evidence["copyright_info"]["status"] = "Available"
        registration_info = metadata.get("copyright_registration")
        if registration_info:
            evidence["registration_evidence"]["registration_info"] = registration_info
        else:
            evidence["registration_evidence"]["status"] = "Not Available"
        digital_seal = metadata.get("digital_seal")
        if digital_seal:
            evidence["verification_info"]["digital_seal"] = digital_seal
        invisible_watermark = metadata.get("invisible_watermark")
        if invisible_watermark:
            evidence["verification_info"]["invisible_watermark"] = invisible_watermark
        creation_date = metadata.get("creation_date", "")
        if creation_date:
            evidence["timeline"].append({
                "event": "Document Created",
                "timestamp": creation_date,
                "source": "PDF Metadata",
            })
        modification_date = metadata.get("modification_date", "")
        if modification_date:
            evidence["timeline"].append({
                "event": "Document Modified",
                "timestamp": modification_date,
                "source": "PDF Metadata",
            })
        evidence["timeline"].append({
            "event": "Evidence Collected",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "Copyright Evidence Report System",
        })
        evidence["timeline"].sort(key=lambda x: x.get("timestamp", ""))
        return evidence

    def _build_summary(self, evidence: Dict[str, Any]) -> Dict[str, Any]:
        available_count = 0
        missing_count = 0
        details: list = []
        for section_key, section in evidence.items():
            if section_key == "timeline":
                continue
            if isinstance(section, dict) and "status" in section:
                if section["status"] == "Available":
                    available_count += 1
                else:
                    missing_count += 1
                details.append({
                    "section": section_key.replace("_", " ").title(),
                    "status": section["status"],
                })
        return {
            "available_sections": available_count,
            "missing_sections": missing_count,
            "details": details,
        }

    def generate_report(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Generate a comprehensive copyright evidence report."""
        self._validate_pdf(pdf_bytes)
        doc_hash = self._compute_hash(pdf_bytes)
        metadata = self._extract_metadata(pdf_bytes)
        evidence = self._collect_evidence(metadata, doc_hash)
        summary = self._build_summary(evidence)
        return {
            "success": True,
            "report": {
                "evidence": evidence,
                "summary": summary,
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": "Copyright evidence report generated successfully.",
            "disclaimer": (
                "This report collects available evidence from the PDF document and application records. "
                "Evidence from metadata alone does not constitute legally conclusive copyright ownership proof. "
                "Consult a legal professional for authoritative copyright determination."
            ),
        }


copyright_evidence_report_service = CopyrightEvidenceReportService()
