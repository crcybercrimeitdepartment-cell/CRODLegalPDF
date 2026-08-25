"""
Copyright Holder Management Service — PDF Copyright Protection Section.

Manages multiple copyright holders for a PDF document with add/edit/delete/save workflow.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024
HOLDERS_KEYWORD_PREFIX = "CopyrightHolders:"


class CopyrightHolderManagementService:
    """Manage copyright holders for a PDF document."""

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

    def _validate_holder(self, holder: Dict[str, str]) -> List[str]:
        errors = []
        name = (holder.get("name") or "").strip()
        if not name:
            errors.append("Holder name is required.")
        elif len(name) > 200:
            errors.append("Holder name must be 200 characters or fewer.")
        holder_type = (holder.get("holder_type") or "").strip()
        if holder_type and holder_type not in ("Individual", "Organization"):
            errors.append("Holder type must be 'Individual' or 'Organization'.")
        email = (holder.get("email") or "").strip()
        if email and not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
            errors.append("Invalid email address format.")
        pct = (holder.get("ownership_percentage") or "").strip()
        if pct:
            try:
                val = float(pct)
                if val < 0 or val > 100:
                    errors.append("Ownership percentage must be between 0 and 100.")
            except ValueError:
                errors.append("Ownership percentage must be a valid number.")
        return errors

    def _extract_holders_from_pdf(self, pdf_bytes: bytes) -> List[Dict[str, str]]:
        holders = []
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            meta = doc.metadata or {}
            keywords = meta.get("keywords", "") or ""
            raw = ""
            for part in keywords.split(";"):
                part = part.strip()
                if part.startswith(HOLDERS_KEYWORD_PREFIX):
                    raw = part[len(HOLDERS_KEYWORD_PREFIX):].strip()
                    break
            if raw:
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, list):
                        for h in parsed:
                            if isinstance(h, dict):
                                holders.append({
                                    "name": str(h.get("name", "")),
                                    "holder_type": str(h.get("holder_type", "Individual")),
                                    "email": str(h.get("email", "")),
                                    "organization": str(h.get("organization", "")),
                                    "address": str(h.get("address", "")),
                                    "ownership_percentage": str(h.get("ownership_percentage", "")),
                                    "notes": str(h.get("notes", "")),
                                })
                except (json.JSONDecodeError, TypeError):
                    pass
            doc.close()
        except Exception as e:
            logger.warning(f"Could not extract holders from PDF: {e}")
        return holders

    def read_holders(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Read existing copyright holders from a PDF."""
        self._validate_pdf(pdf_bytes)
        holders = self._extract_holders_from_pdf(pdf_bytes)
        return {
            "success": True,
            "holders": holders,
            "count": len(holders),
            "message": f"Found {len(holders)} existing holder(s)." if holders else "No existing holders found. You can add holders below.",
        }

    def save_holders(
        self,
        pdf_bytes: bytes,
        original_filename: str,
        session_id: str,
        holders_json: str,
    ) -> Dict[str, Any]:
        """Save copyright holders list to the PDF."""
        self._validate_pdf(pdf_bytes)
        if not holders_json or not holders_json.strip():
            raise ValueError("No holders data provided.")
        try:
            holders = json.loads(holders_json)
        except json.JSONDecodeError:
            raise ValueError("Invalid holders data format.")
        if not isinstance(holders, list):
            raise ValueError("Holders data must be a list.")
        all_errors = []
        for i, h in enumerate(holders):
            errs = self._validate_holder(h)
            for e in errs:
                all_errors.append(f"Holder {i+1}: {e}")
        if all_errors:
            raise ValueError("Validation errors: " + "; ".join(all_errors))
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")
        cleaned_holders = []
        for h in holders:
            cleaned_holders.append({
                "name": str(h.get("name", "")).strip(),
                "holder_type": str(h.get("holder_type", "Individual")).strip(),
                "email": str(h.get("email", "")).strip(),
                "organization": str(h.get("organization", "")).strip(),
                "address": str(h.get("address", "")).strip(),
                "ownership_percentage": str(h.get("ownership_percentage", "")).strip(),
                "notes": str(h.get("notes", "")).strip(),
            })
        holders_json_str = json.dumps(cleaned_holders, ensure_ascii=False)

        current_meta = doc.metadata or {}
        merged_meta = dict(current_meta)

        existing_keywords = merged_meta.get("keywords", "") or ""
        keywords_parts = [p.strip() for p in existing_keywords.split(";") if p.strip()]
        keywords_parts = [p for p in keywords_parts if not p.startswith(HOLDERS_KEYWORD_PREFIX)]
        keywords_parts.append(f"{HOLDERS_KEYWORD_PREFIX}{holders_json_str}")
        merged_meta["keywords"] = "; ".join(keywords_parts)

        doc.set_metadata(merged_meta)

        total_pct = 0.0
        for h in cleaned_holders:
            pct = (h.get("ownership_percentage") or "").strip()
            if pct:
                try:
                    total_pct += float(pct)
                except ValueError:
                    pass
        page = doc.new_page(width=612, height=792)
        text_point = fitz.Point(50, 50)
        page.insert_text(
            text_point,
            "Copyright Holder Information",
            fontsize=16,
            fontname="helv",
            color=(0, 0, 0),
        )
        y = 80
        for i, h in enumerate(cleaned_holders):
            lines = [
                f"Holder {i+1}: {h['name']} ({h['holder_type']})",
            ]
            if h.get("email"):
                lines.append(f"  Email: {h['email']}")
            if h.get("organization"):
                lines.append(f"  Organization: {h['organization']}")
            if h.get("address"):
                lines.append(f"  Address: {h['address']}")
            if h.get("ownership_percentage"):
                lines.append(f"  Ownership: {h['ownership_percentage']}%")
            if h.get("notes"):
                lines.append(f"  Notes: {h['notes']}")
            for line in lines:
                if y > 750:
                    page = doc.new_page(width=612, height=792)
                    y = 50
                page.insert_text(fitz.Point(50, y), line, fontsize=10, fontname="helv", color=(0.2, 0.2, 0.2))
                y += 16
            y += 8
        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        clean_name = self._sanitize_filename(original_filename)
        out_filename = f"holders_{clean_name}"
        out_path = out_dir / out_filename
        output_bytes = doc.write(garbage=4, deflate=True)
        doc.close()
        out_path.write_bytes(output_bytes)
        return {
            "success": True,
            "session_id": session_id,
            "original_filename": clean_name,
            "output_filename": out_filename,
            "holders_count": len(cleaned_holders),
            "holders": cleaned_holders,
            "total_ownership": round(total_pct, 1),
            "message": f"Successfully saved {len(cleaned_holders)} copyright holder(s) to PDF.",
        }

    def verify_saved(self, session_id: str) -> Dict[str, Any]:
        """Re-open the saved PDF and verify holders are persisted."""
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Processed PDF not found for this session.")
        pdf_bytes = files[0].read_bytes()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        meta = doc.metadata or {}
        keywords = meta.get("keywords", "") or ""
        doc.close()
        raw = ""
        for part in keywords.split(";"):
            part = part.strip()
            if part.startswith(HOLDERS_KEYWORD_PREFIX):
                raw = part[len(HOLDERS_KEYWORD_PREFIX):].strip()
                break
        if not raw:
            return {"success": False, "verified": False, "message": "No holder data found in saved PDF."}
        try:
            holders = json.loads(raw)
            return {
                "success": True,
                "verified": True,
                "holders_count": len(holders),
                "holders": holders,
                "message": f"Verification passed: {len(holders)} holder(s) found in saved PDF.",
            }
        except (json.JSONDecodeError, TypeError):
            return {"success": False, "verified": False, "message": "Could not parse holder data from saved PDF."}

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Processed PDF not found for this session.")
        return files[0], files[0].name


copyright_holder_management_service = CopyrightHolderManagementService()
