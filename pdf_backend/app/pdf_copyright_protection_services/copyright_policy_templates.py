"""
Copyright Policy Templates Service — PDF Copyright Protection Section.

Provides built-in policy templates and applies them to PDFs.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, Tuple

# pyrefly: ignore [missing-import]
import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024
METADATA_KEY = "copyright_policy"

POLICY_TEMPLATES = {
    "all_rights_reserved": {
        "template_name": "All Rights Reserved",
        "copyright_holder": "",
        "copyright_year": "",
        "usage_restrictions": "No use, reproduction, or distribution permitted without explicit written permission from the copyright holder.",
        "attribution_text": "",
        "distribution_rules": "No redistribution permitted.",
        "modification_rules": "No modifications permitted.",
        "commercial_use_rules": "No commercial use permitted.",
        "additional_policy": "All rights reserved. This document and its contents are protected by copyright law.",
    },
    "personal_use_only": {
        "template_name": "Personal Use Only",
        "copyright_holder": "",
        "copyright_year": "",
        "usage_restrictions": "For personal, non-commercial use only. Not for public distribution.",
        "attribution_text": "",
        "distribution_rules": "No public distribution or sharing.",
        "modification_rules": "No modifications permitted.",
        "commercial_use_rules": "No commercial use permitted.",
        "additional_policy": "This document is intended solely for personal use. Any commercial or public use is strictly prohibited.",
    },
    "educational_use": {
        "template_name": "Educational Use",
        "copyright_holder": "",
        "copyright_year": "",
        "usage_restrictions": "For educational and academic purposes only.",
        "attribution_text": "Please credit the original author when using this material.",
        "distribution_rules": "Can be shared within educational institutions.",
        "modification_rules": "Minor modifications for educational purposes permitted.",
        "commercial_use_rules": "No commercial use permitted.",
        "additional_policy": "This material is licensed for educational use. Attribution to the original author is required.",
    },
    "non_commercial_use": {
        "template_name": "Non-Commercial Use",
        "copyright_holder": "",
        "copyright_year": "",
        "usage_restrictions": "For non-commercial use only. Attribution required.",
        "attribution_text": "Please credit the original author and provide a link to the source.",
        "distribution_rules": "Can be shared for non-commercial purposes.",
        "modification_rules": "Derivative works permitted for non-commercial purposes.",
        "commercial_use_rules": "No commercial use permitted without prior written permission.",
        "additional_policy": "This work is licensed for non-commercial use only. Commercial use requires separate licensing.",
    },
    "attribution_required": {
        "template_name": "Attribution Required",
        "copyright_holder": "",
        "copyright_year": "",
        "usage_restrictions": "Free to use with proper attribution.",
        "attribution_text": "Please credit the original author/source when using this work.",
        "distribution_rules": "Can be freely distributed with attribution.",
        "modification_rules": "Modifications permitted with attribution.",
        "commercial_use_rules": "Commercial use permitted with attribution.",
        "additional_policy": "This work may be freely used, distributed, and modified, provided proper attribution is given to the original author.",
    },
    "custom": {
        "template_name": "Custom Copyright Policy",
        "copyright_holder": "",
        "copyright_year": "",
        "usage_restrictions": "",
        "attribution_text": "",
        "distribution_rules": "",
        "modification_rules": "",
        "commercial_use_rules": "",
        "additional_policy": "",
    },
}


class CopyrightPolicyTemplatesService:
    """Manage and apply copyright policy templates to PDFs."""

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

    def _extract_existing_policy(self, pdf_bytes: bytes) -> Dict[str, str]:
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            meta = doc.metadata or {}
            kw = meta.get("keywords") or ""
            import re
            match = re.search(r"\[" + METADATA_KEY + r":\s*(.*?)\s*\]", kw)
            raw = match.group(1) if match else ""
            doc.close()
            if raw:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    return {str(k): str(v) if v is not None else "" for k, v in parsed.items()}
        except Exception as e:
            logger.warning(f"Could not extract policy: {e}")
        return {}

    def get_templates(self) -> Dict[str, Any]:
        """Return available policy templates."""
        return {"success": True, "templates": POLICY_TEMPLATES, "count": len(POLICY_TEMPLATES), "message": "Templates loaded."}

    def read_policy(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Read existing policy from a PDF."""
        self._validate_pdf(pdf_bytes)
        policy = self._extract_existing_policy(pdf_bytes)
        return {
            "success": True,
            "has_policy": bool(policy),
            "policy": policy,
            "message": "Policy found." if policy else "No policy found. Select a template below.",
        }

    def apply_policy(
        self,
        pdf_bytes: bytes,
        original_filename: str,
        session_id: str,
        policy_json: str,
    ) -> Dict[str, Any]:
        """Apply a copyright policy to the PDF."""
        self._validate_pdf(pdf_bytes)
        if not policy_json or not policy_json.strip():
            raise ValueError("No policy data provided.")
        try:
            policy_data = json.loads(policy_json)
        except json.JSONDecodeError:
            raise ValueError("Invalid policy data format.")
        if not isinstance(policy_data, dict):
            raise ValueError("Policy data must be an object.")
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")
        allowed_fields = [
            "template_name", "copyright_holder", "copyright_year",
            "usage_restrictions", "attribution_text", "distribution_rules",
            "modification_rules", "commercial_use_rules", "additional_policy",
        ]
        cleaned = {}
        for field in allowed_fields:
            cleaned[field] = str(policy_data.get(field, "")).strip()
            
        current_meta = doc.metadata or {}
        new_meta = dict(current_meta)
        kw = new_meta.get("keywords") or ""
        import re
        kw = re.sub(r"\[" + METADATA_KEY + r":.*?\]", "", kw).strip()
        new_val = json.dumps(cleaned, ensure_ascii=False)
        kw += f" [{METADATA_KEY}: {new_val}]"
        new_meta["keywords"] = kw.strip()
        doc.set_metadata(new_meta)
        page = doc.new_page(width=612, height=792)
        y = 50
        page.insert_text(fitz.Point(50, y), "Copyright Policy", fontname="helv", fontsize=16, color=(0, 0, 0))
        y += 30
        for field in allowed_fields:
            val = cleaned.get(field, "")
            if val:
                label = field.replace("_", " ").title() + ":"
                if y > 720:
                    page = doc.new_page(width=612, height=792)
                    y = 50
                page.insert_text(fitz.Point(50, y), label, fontname="helv", fontsize=10, color=(0, 0, 0))
                y += 14
                for line in val.split("\n"):
                    if y > 750:
                        page = doc.new_page(width=612, height=792)
                        y = 50
                    page.insert_text(fitz.Point(60, y), line[:100], fontname="helv", fontsize=9, color=(0.2, 0.2, 0.2))
                    y += 12
                y += 6
        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        clean_name = self._sanitize_filename(original_filename)
        out_filename = f"policy_{clean_name}"
        out_path = out_dir / out_filename
        output_bytes = doc.write(garbage=4, deflate=True)
        doc.close()
        out_path.write_bytes(output_bytes)
        return {
            "success": True,
            "session_id": session_id,
            "original_filename": clean_name,
            "output_filename": out_filename,
            "policy": cleaned,
            "template_name": cleaned.get("template_name", "Custom"),
            "message": f"Policy '{cleaned.get('template_name', 'Custom')}' applied to PDF.",
        }

    def verify_saved(self, session_id: str) -> Dict[str, Any]:
        """Verify policy persistence in saved PDF."""
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Processed PDF not found for this session.")
        pdf_bytes = files[0].read_bytes()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        meta = doc.metadata or {}
        kw = meta.get("keywords") or ""
        import re
        match = re.search(r"\[" + METADATA_KEY + r":\s*(.*?)\s*\]", kw)
        raw = match.group(1) if match else ""
        doc.close()
        if not raw:
            return {"success": False, "verified": False, "message": "No policy data found in saved PDF."}
        try:
            data = json.loads(raw)
            return {"success": True, "verified": True, "policy": data, "message": "Policy verified in saved PDF."}
        except (json.JSONDecodeError, TypeError):
            return {"success": False, "verified": False, "message": "Could not parse policy data."}

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Processed PDF not found for this session.")
        return files[0], files[0].name


copyright_policy_templates_service = CopyrightPolicyTemplatesService()
