"""
License Management Service — PDF Copyright Protection Section.

Manages licensing information for a PDF with presets and full editing.
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

LICENSE_PRESETS = {
    "mit": {
        "license_name": "MIT License",
        "license_type": "MIT",
        "licensor": "",
        "licensee": "Anyone",
        "license_status": "Active",
        "usage_permissions": "Use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies",
        "distribution_permission": "Yes",
        "commercial_use_permission": "Yes",
        "modification_permission": "Yes",
        "attribution_requirement": "Include copyright notice and license text",
        "license_conditions": "The above copyright notice and this permission notice shall be included in all copies or substantial portions of the software.",
        "notes": "Permission is hereby granted, free of charge, to any person obtaining a copy of this software.",
    },
    "apache2": {
        "license_name": "Apache License 2.0",
        "license_type": "Apache-2.0",
        "licensor": "",
        "licensee": "Anyone",
        "license_status": "Active",
        "usage_permissions": "Use, reproduce, prepare derivative works, distribute, and publicly perform",
        "distribution_permission": "Yes",
        "commercial_use_permission": "Yes",
        "modification_permission": "Yes",
        "attribution_requirement": "Include license file, state changes, and retain copyright notices",
        "license_conditions": "Must include NOTICE file, state changes, and retain all copyright/patent/trademark notices.",
        "notes": "Licensed under the Apache License, Version 2.0.",
    },
    "gpl3": {
        "license_name": "GNU General Public License v3.0",
        "license_type": "GPL-3.0",
        "licensor": "",
        "licensee": "Anyone",
        "license_status": "Active",
        "usage_permissions": "Use, copy, modify, distribute, and publicly perform",
        "distribution_permission": "Yes (under same license)",
        "commercial_use_permission": "Yes",
        "modification_permission": "Yes (derivative works must use same license)",
        "attribution_requirement": "Retain all copyright notices, state changes, and distribute under GPL-3.0",
        "license_conditions": "All derivative works must be distributed under GPL-3.0. Source code must be made available.",
        "notes": "Free Software Foundation under the GNU General Public License.",
    },
    "cc_by_4": {
        "license_name": "Creative Commons Attribution 4.0",
        "license_type": "CC-BY-4.0",
        "licensor": "",
        "licensee": "Anyone",
        "license_status": "Active",
        "usage_permissions": "Share (copy and redistribute), Adapt (remix, transform, build upon)",
        "distribution_permission": "Yes",
        "commercial_use_permission": "Yes",
        "modification_permission": "Yes",
        "attribution_requirement": "Give appropriate credit, provide link to license, indicate if changes were made",
        "license_conditions": "No additional restrictions beyond the license terms.",
        "notes": "Attribution required. License: https://creativecommons.org/licenses/by/4.0/",
    },
    "cc_by_nc_4": {
        "license_name": "Creative Commons Attribution-NonCommercial 4.0",
        "license_type": "CC-BY-NC-4.0",
        "licensor": "",
        "licensee": "Anyone (non-commercial)",
        "license_status": "Active",
        "usage_permissions": "Share and adapt for non-commercial purposes",
        "distribution_permission": "Yes (non-commercial only)",
        "commercial_use_permission": "No",
        "modification_permission": "Yes (non-commercial only)",
        "attribution_requirement": "Give appropriate credit, provide link to license, indicate if changes were made",
        "license_conditions": "Not for commercial use. No additional restrictions beyond the license terms.",
        "notes": "Non-commercial use only. License: https://creativecommons.org/licenses/by-nc/4.0/",
    },
    "all_rights_reserved": {
        "license_name": "All Rights Reserved",
        "license_type": "Proprietary",
        "licensor": "",
        "licensee": "Copyright holder only",
        "license_status": "Active",
        "usage_permissions": "No use permitted without explicit written permission from the copyright holder",
        "distribution_permission": "No",
        "commercial_use_permission": "No",
        "modification_permission": "No",
        "attribution_requirement": "N/A",
        "license_conditions": "All rights reserved. No part of this work may be reproduced or transmitted without prior written permission.",
        "notes": "Standard copyright protection. Contact the copyright holder for permissions.",
    },
    "personal_use": {
        "license_name": "Personal Use Only",
        "license_type": "Custom",
        "licensor": "",
        "licensee": "Individual personal use only",
        "license_status": "Active",
        "usage_permissions": "Personal, non-commercial viewing and reading only",
        "distribution_permission": "No",
        "commercial_use_permission": "No",
        "modification_permission": "No",
        "attribution_requirement": "N/A",
        "license_conditions": "For personal, non-commercial use only. No redistribution, modification, or commercial use.",
        "notes": "Personal use license. Not for commercial or public distribution.",
    },
}


class LicenseManagementService:
    """Manage licensing information for a PDF document."""

    def _sanitize_filename(self, filename: str) -> str:
        if not filename:
            return "document.pdf"
        clean = Path(filename).name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document.pdf"

    def _validate_pdf(self, pdf_bytes: bytes) -> None:
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError("File size exceeds the 200 MB limit.")
        if not pdf_bytes[:5].startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")

    def _extract_license_from_pdf(self, pdf_bytes: bytes) -> Dict[str, str]:
        license_data = {}
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            meta = doc.metadata or {}
            raw = meta.get(METADATA_KEY) or ""
            if not raw:
                raw = doc.xref_metadata(0).get(METADATA_KEY, "") if doc.xref_length() > 0 else ""
            if raw:
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, dict):
                        for key, val in parsed.items():
                            license_data[str(key)] = str(val) if val is not None else ""
                except (json.JSONDecodeError, TypeError):
                    pass
            doc.close()
        except Exception as e:
            logger.warning(f"Could not extract license from PDF: {e}")
        return license_data

    def get_presets(self) -> Dict[str, Any]:
        """Return available license presets."""
        return {
            "success": True,
            "presets": LICENSE_PRESETS,
            "count": len(LICENSE_PRESETS),
            "message": "License presets loaded successfully.",
        }

    def read_license(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Read existing license information from a PDF."""
        self._validate_pdf(pdf_bytes)
        license_data = self._extract_license_from_pdf(pdf_bytes)
        has_license = bool(license_data)
        return {
            "success": True,
            "has_license": has_license,
            "license_info": license_data,
            "message": "License information found." if has_license else "No license information found. You can create or select a preset below.",
        }

    def save_license(
        self,
        pdf_bytes: bytes,
        original_filename: str,
        session_id: str,
        license_json: str,
    ) -> Dict[str, Any]:
        """Save license information to the PDF."""
        self._validate_pdf(pdf_bytes)
        if not license_json or not license_json.strip():
            raise ValueError("No license data provided.")
        try:
            license_data = json.loads(license_json)
        except json.JSONDecodeError:
            raise ValueError("Invalid license data format.")
        if not isinstance(license_data, dict):
            raise ValueError("License data must be an object.")
        cleaned = {}
        allowed_fields = [
            "license_name", "license_type", "licensor", "licensee",
            "license_status", "effective_date", "expiry_date",
            "usage_permissions", "distribution_permission",
            "commercial_use_permission", "modification_permission",
            "attribution_requirement", "license_conditions", "notes",
        ]
        for field in allowed_fields:
            cleaned[field] = str(license_data.get(field, "")).strip()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")
        license_json_str = json.dumps(cleaned, ensure_ascii=False)
        doc.set_metadata({METADATA_KEY: license_json_str})
        page = doc.new_page(width=612, height=792)
        font = fitz.Font("helv")
        y = 50
        page.insert_text(fitz.Point(50, y), "License Information", font=font, fontsize=16, color=(0, 0, 0))
        y += 30
        for field in allowed_fields:
            val = cleaned.get(field, "")
            if val:
                label = field.replace("_", " ").title() + ":"
                text = f"{label} {val}"
                if y > 750:
                    page = doc.new_page(width=612, height=792)
                    y = 50
                page.insert_text(fitz.Point(50, y), text, font=font, fontsize=10, color=(0.2, 0.2, 0.2))
                y += 16
        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        clean_name = self._sanitize_filename(original_filename)
        out_filename = f"license_{clean_name}"
        out_path = out_dir / out_filename
        output_bytes = doc.write(garbage=4, deflate=True)
        doc.close()
        out_path.write_bytes(output_bytes)
        return {
            "success": True,
            "session_id": session_id,
            "original_filename": clean_name,
            "output_filename": out_filename,
            "license_info": cleaned,
            "message": f"License information saved to PDF successfully.",
        }

    def verify_saved(self, session_id: str) -> Dict[str, Any]:
        """Re-open the saved PDF and verify license data is persisted."""
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Processed PDF not found for this session.")
        pdf_bytes = files[0].read_bytes()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        meta = doc.metadata or {}
        raw = meta.get(METADATA_KEY) or ""
        doc.close()
        if not raw:
            return {"success": False, "verified": False, "message": "No license data found in saved PDF."}
        try:
            data = json.loads(raw)
            return {
                "success": True,
                "verified": True,
                "license_info": data,
                "message": f"Verification passed: license data found in saved PDF.",
            }
        except (json.JSONDecodeError, TypeError):
            return {"success": False, "verified": False, "message": "Could not parse license data from saved PDF."}

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Processed PDF not found for this session.")
        return files[0], files[0].name


license_management_service = LicenseManagementService()
