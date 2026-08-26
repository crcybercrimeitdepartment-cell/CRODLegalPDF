"""
Usage Rights Management Service — PDF Copyright Protection Section.

Manages PDF permission settings (printing, copying, editing, etc.).
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
METADATA_KEY = "usage_rights"

PERMISSION_FIELDS = [
    ("print", "Allow Printing", "Print the document"),
    ("high_quality_print", "Allow High-Quality Printing", "Print in high resolution"),
    ("copy", "Allow Copying", "Copy text and images from the document"),
    ("modify", "Allow Modifying", "Edit or modify the document content"),
    ("annotate", "Allow Commenting", "Add comments and annotations"),
    ("form_fill", "Allow Form Filling", "Fill in form fields"),
    ("extract", "Allow Content Extraction", "Extract text and content"),
    ("assemble", "Allow Document Assembly", "Insert, rotate, or delete pages"),
]


class UsageRightsManagementService:
    """Manage PDF permission/usage rights settings."""

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

    def _read_current_permissions(self, pdf_bytes: bytes) -> Dict[str, bool]:
        permissions = {}
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            meta = doc.metadata or {}
            kw = meta.get("keywords") or ""
            import re
            match = re.search(r"\[" + METADATA_KEY + r":\s*(.*?)\s*\]", kw)
            raw = match.group(1) if match else ""
            if raw:
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, dict):
                        for key, _label, _desc in PERMISSION_FIELDS:
                            permissions[key] = bool(parsed.get(key, True))
                except (json.JSONDecodeError, TypeError):
                    pass
            if not permissions:
                for key, _label, _desc in PERMISSION_FIELDS:
                    permissions[key] = True
            doc.close()
        except Exception as e:
            logger.warning(f"Could not read permissions: {e}")
            for key, _label, _desc in PERMISSION_FIELDS:
                permissions[key] = True
        return permissions

    def read_permissions(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Read current permission settings from a PDF."""
        self._validate_pdf(pdf_bytes)
        permissions = self._read_current_permissions(pdf_bytes)
        return {
            "success": True,
            "permissions": permissions,
            "permission_fields": [{"key": k, "label": l, "description": d} for k, l, d in PERMISSION_FIELDS],
            "message": "Current permission settings read successfully.",
        }

    def save_permissions(
        self,
        pdf_bytes: bytes,
        original_filename: str,
        session_id: str,
        permissions_json: str,
        password: str = "",
    ) -> Dict[str, Any]:
        """Save permission settings to the PDF."""
        self._validate_pdf(pdf_bytes)
        if not permissions_json or not permissions_json.strip():
            raise ValueError("No permissions data provided.")
        try:
            perms = json.loads(permissions_json)
        except json.JSONDecodeError:
            raise ValueError("Invalid permissions data format.")
        if not isinstance(perms, dict):
            raise ValueError("Permissions data must be an object.")
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is already encrypted or password-protected.")
        cleaned = {}
        for key, _, _ in PERMISSION_FIELDS:
            cleaned[key] = bool(perms.get(key, True))
        
        current_meta = doc.metadata or {}
        new_meta = dict(current_meta)
        kw = new_meta.get("keywords") or ""
        import re
        kw = re.sub(r"\[" + METADATA_KEY + r":.*?\]", "", kw).strip()
        new_val = json.dumps(cleaned, ensure_ascii=False)
        kw += f" [{METADATA_KEY}: {new_val}]"
        new_meta["keywords"] = kw.strip()
        doc.set_metadata(new_meta)
        
        perm_flags = 0
        if cleaned.get("print", True):
            perm_flags |= fitz.PDF_PERM_PRINT
        if cleaned.get("high_quality_print", True):
            perm_flags |= fitz.PDF_PERM_PRINT_HQ
        if cleaned.get("copy", True):
            perm_flags |= fitz.PDF_PERM_COPY
        if cleaned.get("modify", True):
            perm_flags |= fitz.PDF_PERM_MODIFY
        if cleaned.get("annotate", True):
            perm_flags |= fitz.PDF_PERM_ANNOTATE
        if cleaned.get("form_fill", True):
            perm_flags |= fitz.PDF_PERM_FORM
        if cleaned.get("extract", True):
            perm_flags |= fitz.PDF_PERM_ACCESSIBILITY
        if cleaned.get("assemble", True):
            perm_flags |= fitz.PDF_PERM_ASSEMBLE
        has_restrictions = not all(cleaned.values())
        if has_restrictions and password:
            owner_pass = password
            user_pass = ""
            doc.save(
                out:= Paths.request_output(session_id) / self._sanitize_filename(original_filename),
                garbage=4, deflate=True, encryption=fitz.PDF_ENCRYPT_AES_256,
                owner_pw=owner_pass, user_pw=user_pass, permissions=perm_flags,
            )
            doc.close()
        else:
            out_dir = Paths.request_output(session_id)
            out_dir.mkdir(parents=True, exist_ok=True)
            clean_name = self._sanitize_filename(original_filename)
            out_filename = f"rights_{clean_name}"
            out_path = out_dir / out_filename
            output_bytes = doc.write(garbage=4, deflate=True)
            doc.close()
            out_path.write_bytes(output_bytes)
            out_filename_actual = out_filename
        granted = [k for k, v in cleaned.items() if v]
        denied = [k for k, v in cleaned.items() if not v]
        return {
            "success": True,
            "session_id": session_id,
            "original_filename": self._sanitize_filename(original_filename),
            "output_filename": out_filename if has_restrictions and password else out_filename,
            "permissions": cleaned,
            "granted_permissions": granted,
            "denied_permissions": denied,
            "has_restrictions": has_restrictions,
            "password_protected": bool(password),
            "message": f"Permissions saved. {len(granted)} granted, {len(denied)} denied.",
        }

    def verify_permissions(self, session_id: str) -> Dict[str, Any]:
        """Re-open saved PDF and verify permissions."""
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Processed PDF not found for this session.")
        pdf_bytes = files[0].read_bytes()
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            meta = doc.metadata or {}
            raw = meta.get(METADATA_KEY) or ""
            doc.close()
            if raw:
                data = json.loads(raw)
                return {"success": True, "verified": True, "permissions": data, "message": "Permissions verified in saved PDF."}
            return {"success": True, "verified": False, "permissions": {}, "message": "No permissions metadata found."}
        except Exception as e:
            return {"success": False, "verified": False, "message": f"Verification failed: {str(e)}"}

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Processed PDF not found for this session.")
        return files[0], files[0].name


usage_rights_management_service = UsageRightsManagementService()
