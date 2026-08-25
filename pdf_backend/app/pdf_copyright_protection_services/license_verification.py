"""
License Verification Service — PDF Copyright Protection Section.

Verifies license information in a PDF with date validation and status checks.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024
METADATA_KEY = "license_information"
LICENSE_REPORT_KEY = "license_verification_report"


class LicenseVerificationService:
    """Verify license information in a PDF document."""

    def _validate_pdf(self, pdf_bytes: bytes) -> None:
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError("File size exceeds the 200 MB limit.")
        if not pdf_bytes[:5].startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")

    def _extract_license(self, pdf_bytes: bytes) -> Dict[str, str]:
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            meta = doc.metadata or {}
            raw = meta.get(METADATA_KEY) or ""
            if not raw and doc.xref_length() > 0:
                raw = doc.xref_metadata(0).get(METADATA_KEY, "")
            doc.close()
            if raw:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    return {str(k): str(v) if v is not None else "" for k, v in parsed.items()}
        except Exception as e:
            logger.warning(f"Could not extract license: {e}")
        return {}

    def _check_date_status(self, effective: str, expiry: str) -> Dict[str, Any]:
        today = datetime.now().date()
        result = {"date_valid": True, "date_issues": []}
        if effective:
            try:
                eff_date = datetime.strptime(effective, "%Y-%m-%d").date()
                if eff_date > today:
                    result["date_valid"] = False
                    result["date_issues"].append(f"License not yet active (starts {effective})")
            except ValueError:
                result["date_issues"].append(f"Invalid effective date format: {effective}")
        if expiry:
            try:
                exp_date = datetime.strptime(expiry, "%Y-%m-%d").date()
                if exp_date < today:
                    result["date_valid"] = False
                    result["date_issues"].append(f"License expired on {expiry}")
            except ValueError:
                result["date_issues"].append(f"Invalid expiry date format: {expiry}")
        return result

    def verify_license(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Perform full license verification on a PDF."""
        self._validate_pdf(pdf_bytes)
        license_data = self._extract_license(pdf_bytes)
        findings = []
        fields_checked = []
        missing_fields = []
        required_fields = ["license_name", "license_type", "licensor", "licensee"]
        optional_fields = ["effective_date", "expiry_date", "usage_permissions", "distribution_permission", "commercial_use_permission", "modification_permission", "attribution_requirement", "license_conditions", "notes"]
        all_fields = required_fields + optional_fields
        for field in required_fields:
            fields_checked.append(field)
            val = license_data.get(field, "").strip()
            if not val:
                missing_fields.append(field)
                findings.append({"field": field, "status": "missing", "message": f"Required field '{field}' is not set."})
            else:
                findings.append({"field": field, "status": "present", "value": val, "message": f"'{field}' is set."})
        for field in optional_fields:
            fields_checked.append(field)
            val = license_data.get(field, "").strip()
            if not val:
                missing_fields.append(field)
                findings.append({"field": field, "status": "missing", "message": f"Optional field '{field}' is not set."})
            else:
                findings.append({"field": field, "status": "present", "value": val, "message": f"'{field}' is set."})
        has_license = bool(license_data.get("license_name", "").strip())
        date_result = self._check_date_status(
            license_data.get("effective_date", ""),
            license_data.get("expiry_date", ""),
        )
        findings.append({"field": "date_validation", "status": "checked", "issues": date_result["date_issues"], "message": "Date validation completed."})
        if not has_license:
            overall_status = "Missing License Information"
            risk_level = "high"
        elif len(missing_fields) > len(required_fields) // 2:
            overall_status = "Incomplete License Information"
            risk_level = "medium"
        elif not date_result["date_valid"]:
            if any("expired" in issue.lower() for issue in date_result["date_issues"]):
                overall_status = "Expired"
                risk_level = "high"
            elif any("not yet active" in issue.lower() for issue in date_result["date_issues"]):
                overall_status = "Not Yet Active"
                risk_level = "medium"
            else:
                overall_status = "Invalid Dates"
                risk_level = "medium"
        else:
            overall_status = "Valid"
            risk_level = "low"
        report = {
            "success": True,
            "overall_status": overall_status,
            "risk_level": risk_level,
            "has_license": has_license,
            "license_info": license_data,
            "findings": findings,
            "fields_checked": len(fields_checked),
            "missing_fields": missing_fields,
            "date_validation": date_result,
            "message": f"Verification complete: {overall_status}",
            "disclaimer": "This is a metadata-based verification only. It does not constitute legal validation of the license.",
        }
        return report


license_verification_service = LicenseVerificationService()
