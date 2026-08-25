"""
Copyright Claim Report Service — PDF Copyright Protection Section.

Generates professional copyright claim reports from PDF analysis.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any, Dict

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024


class CopyrightClaimReportService:
    """Generate copyright claim reports from PDF analysis."""

    def _validate_pdf(self, pdf_bytes: bytes) -> None:
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError("File size exceeds the 200 MB limit.")
        if not pdf_bytes[:5].startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")

    def _extract_all_metadata(self, pdf_bytes: bytes) -> Dict[str, Any]:
        result = {}
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            meta = doc.metadata or {}
            for key in ["author", "creator", "producer", "title", "subject", "keywords"]:
                result[key] = str(meta.get(key, "")).strip()
            custom_keys = [
                "copyright_holders", "license_information", "copyright_metadata",
                "copyright_registration", "digital_seal", "invisible_watermark",
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
            result["full_text"] = text[:50000]
            result["total_pages"] = doc.page_count
            result["file_size"] = len(pdf_bytes)
            doc.close()
        except Exception as e:
            logger.warning(f"Metadata extraction error: {e}")
        return result

    def generate_report(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Generate a structured copyright claim report."""
        self._validate_pdf(pdf_bytes)
        data = self._extract_all_metadata(pdf_bytes)
        warnings = []
        missing = []
        sections = {}
        sections["document_info"] = {
            "title": data.get("title", "") or "Not Available",
            "author": data.get("author", "") or "Not Available",
            "creator": data.get("creator", "") or "Not Available",
            "producer": data.get("producer", "") or "Not Available",
            "total_pages": data.get("total_pages", 0),
            "file_size": data.get("file_size", 0),
        }
        copyright_holders = data.get("copyright_holders")
        if copyright_holders and isinstance(copyright_holders, list):
            sections["holder_info"] = {"holders": copyright_holders, "count": len(copyright_holders)}
        else:
            sections["holder_info"] = {"holders": [], "count": 0}
            missing.append("Copyright holders")
        license_info = data.get("license_information")
        if license_info and isinstance(license_info, dict):
            sections["license_info"] = license_info
        else:
            sections["license_info"] = None
            missing.append("License information")
        reg_info = data.get("copyright_registration")
        if reg_info:
            sections["registration_info"] = reg_info if isinstance(reg_info, dict) else {"raw": str(reg_info)}
        else:
            sections["registration_info"] = None
            missing.append("Registration information")
        usage_rights = data.get("usage_rights")
        if usage_rights and isinstance(usage_rights, dict):
            sections["usage_rights"] = usage_rights
        else:
            sections["usage_rights"] = None
            missing.append("Usage rights")
        policy_info = data.get("copyright_policy")
        if policy_info and isinstance(policy_info, dict):
            sections["policy_info"] = policy_info
        else:
            sections["policy_info"] = None
        if not data.get("author", ""):
            warnings.append("Author field is empty in PDF metadata.")
        if data.get("author") and data.get("creator") and data["author"].lower() != data["creator"].lower():
            warnings.append("Author and Creator fields contain different values.")
        if not data.get("title", ""):
            warnings.append("Document title is not set.")
        verification_items = []
        has_copyright = bool(data.get("author", "") or copyright_holders)
        has_license = bool(license_info)
        has_registration = bool(reg_info)
        has_rights = bool(usage_rights)
        if has_copyright:
            verification_items.append({"item": "Copyright holder/author", "status": "found"})
        else:
            verification_items.append({"item": "Copyright holder/author", "status": "missing"})
        if has_license:
            verification_items.append({"item": "License information", "status": "found"})
        else:
            verification_items.append({"item": "License information", "status": "missing"})
        if has_registration:
            verification_items.append({"item": "Registration information", "status": "found"})
        else:
            verification_items.append({"item": "Registration information", "status": "missing"})
        if has_rights:
            verification_items.append({"item": "Usage rights", "status": "found"})
        else:
            verification_items.append({"item": "Usage rights", "status": "missing"})
        found_count = sum(1 for v in verification_items if v["status"] == "found")
        claim_summary = f"Found {found_count} of {len(verification_items)} key items. "
        if found_count == len(verification_items):
            claim_summary += "Comprehensive copyright information available."
        elif found_count > 0:
            claim_summary += "Partial copyright information available."
        else:
            claim_summary += "No copyright information found in document."
        return {
            "success": True,
            "report": {
                "sections": sections,
                "missing_fields": missing,
                "warnings": warnings,
                "verification": verification_items,
                "claim_summary": claim_summary,
            },
            "message": "Copyright claim report generated successfully.",
            "disclaimer": "This report is generated from document metadata analysis only. It does not constitute legal advice or proof of copyright ownership.",
        }


copyright_claim_report_service = CopyrightClaimReportService()
