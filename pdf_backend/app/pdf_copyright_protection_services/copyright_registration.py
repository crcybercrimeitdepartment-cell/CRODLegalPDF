"""
Copyright Registration Service — PDF Copyright Protection Section.

Accepts a PDF upload, collects copyright registration details,
validates input, embeds registration information as PDF metadata,
preserves all existing content, and returns a downloadable PDF.

The first successful registration establishes the Original Copyright Owner
which is locked and cannot be changed through normal editing.
"""

from __future__ import annotations

import hashlib
import logging
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024  # 200 MB
KEYWORD_ORIGINAL_OWNER = "OriginalOwner"
KEYWORD_REGISTRATION_ID = "RegistrationID"
KEYWORD_REGISTRATION_TS = "RegistrationTimestamp"
KEYWORD_FINGERPRINT = "DocumentFingerprint"
KEYWORD_OWNER_LOCKED = "OwnerLocked"


class CopyrightRegistrationService:
    """Embed copyright registration metadata into a PDF document."""

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

    def _validate_registration(self, data: Dict[str, str]) -> None:
        owner = (data.get("copyright_owner") or "").strip()
        author = (data.get("author") or "").strip()
        year = (data.get("copyright_year") or "").strip()
        if not owner:
            raise ValueError("Copyright Owner is required.")
        if not author:
            raise ValueError("Author/Creator is required.")
        if year:
            if not re.match(r"^\d{4}$", year):
                raise ValueError("Copyright Year must be a 4-digit year (e.g. 2025).")
            y = int(year)
            if y < 1900 or y > 2100:
                raise ValueError("Copyright Year must be between 1900 and 2100.")

    def _compute_fingerprint(self, pdf_bytes: bytes) -> str:
        """Compute SHA-256 fingerprint of the PDF content."""
        return hashlib.sha256(pdf_bytes).hexdigest()

    def _generate_registration_id(self) -> str:
        """Generate a registration ID in CR-YYYY-NNNNN format."""
        year = datetime.now(timezone.utc).year
        seq = int(time.time() * 1000) % 100000
        return f"CR-{year}-{seq:05d}"

    def _parse_keywords(self, keywords_str: str) -> Dict[str, str]:
        """Parse semicolon-separated key:value pairs from keywords string."""
        result = {}
        if not keywords_str:
            return result
        for part in keywords_str.split(";"):
            part = part.strip()
            if ":" in part:
                key, val = part.split(":", 1)
                result[key.strip()] = val.strip()
        return result

    def _build_keywords_string(self, existing: str, new_pairs: Dict[str, str]) -> str:
        """Build a keywords string preserving existing entries and adding new ones."""
        parsed = self._parse_keywords(existing)
        parsed.update(new_pairs)
        parts = [f"{k}: {v}" for k, v in parsed.items()]
        return "; ".join(parts)

    def _check_existing_registration(self, doc: fitz.Document) -> Optional[Dict[str, str]]:
        """Check if the PDF already has a locked copyright registration.

        Returns the existing registration info dict if found, None otherwise.
        """
        meta = doc.metadata or {}
        keywords = meta.get("keywords", "") or ""
        parsed = self._parse_keywords(keywords)

        original_owner = parsed.get(KEYWORD_ORIGINAL_OWNER, "")
        owner_locked = parsed.get(KEYWORD_OWNER_LOCKED, "")
        reg_id = parsed.get(KEYWORD_REGISTRATION_ID, "")

        if original_owner and owner_locked == "true":
            return {
                "original_owner": original_owner,
                "registration_id": reg_id,
                "registration_timestamp": parsed.get(KEYWORD_REGISTRATION_TS, ""),
                "fingerprint": parsed.get(KEYWORD_FINGERPRINT, ""),
            }
        return None

    def check_registration(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Check if a PDF already has a copyright registration record.

        Used by the frontend to determine if the owner should be locked.
        """
        self._validate_pdf(pdf_bytes)
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")

        existing = self._check_existing_registration(doc)
        meta = doc.metadata or {}
        total_pages = len(doc)
        doc.close()

        if existing:
            return {
                "success": True,
                "registered": True,
                "original_owner": existing["original_owner"],
                "registration_id": existing["registration_id"],
                "registration_timestamp": existing["registration_timestamp"],
                "fingerprint": existing["fingerprint"],
                "total_pages": total_pages,
                "message": "This document already has a copyright registration record.",
            }

        return {
            "success": True,
            "registered": False,
            "total_pages": total_pages,
            "message": "No existing copyright registration found.",
        }

    def register(
        self,
        pdf_bytes: bytes,
        original_filename: str,
        session_id: str,
        copyright_owner: str = "",
        author: str = "",
        organization: str = "",
        copyright_year: str = "",
        registration_number: str = "",
        registration_date: str = "",
        copyright_notice: str = "",
        notes: str = "",
    ) -> Dict[str, Any]:
        """Validate input, embed copyright registration metadata, and save output PDF."""
        self._validate_pdf(pdf_bytes)
        registration_data = {
            "copyright_owner": copyright_owner,
            "author": author,
            "organization": organization,
            "copyright_year": copyright_year,
            "registration_number": registration_number,
            "registration_date": registration_date,
            "copyright_notice": copyright_notice,
            "notes": notes,
        }
        self._validate_registration(registration_data)

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected.")

        existing_reg = self._check_existing_registration(doc)

        if existing_reg:
            submitted_owner = copyright_owner.strip()
            locked_owner = existing_reg["original_owner"]
            if submitted_owner.lower() != locked_owner.lower():
                doc.close()
                raise ValueError(
                    f"This document is already registered to '{locked_owner}'. "
                    "The original copyright owner cannot be changed. "
                    "To manage additional holders, use Copyright Holder Management."
                )

        is_new_registration = existing_reg is None

        if is_new_registration:
            reg_id = self._generate_registration_id()
            reg_timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            reg_timestamp_display = datetime.now(timezone.utc).strftime("%d %b %Y")
            doc_fingerprint = self._compute_fingerprint(pdf_bytes)
        else:
            reg_id = existing_reg["registration_id"]
            reg_timestamp = existing_reg["registration_timestamp"]
            reg_timestamp_display = reg_timestamp
            doc_fingerprint = existing_reg["fingerprint"]

        current_meta = doc.metadata or {}
        new_meta = dict(current_meta)
        if author.strip():
            new_meta["author"] = author.strip()
        if organization.strip():
            new_meta["creator"] = organization.strip()

        title_parts = []
        if copyright_owner.strip():
            title_parts.append(copyright_owner.strip())
        if copyright_year.strip():
            title_parts.append(copyright_year.strip())
        if title_parts:
            existing_title = current_meta.get("title", "") or ""
            suffix = " — Copyright Registration"
            if existing_title and suffix not in existing_title:
                new_meta["title"] = existing_title + suffix
            elif not existing_title:
                new_meta["title"] = " | ".join(title_parts) + suffix

        notice_text = copyright_notice.strip()
        if not notice_text:
            notice_text = f"Copyright {copyright_year.strip()} {copyright_owner.strip()}. All rights reserved."
        new_meta["subject"] = notice_text

        existing_keywords = current_meta.get("keywords", "") or ""
        protected_keywords = {
            KEYWORD_ORIGINAL_OWNER: copyright_owner.strip(),
            KEYWORD_OWNER_LOCKED: "true",
            KEYWORD_REGISTRATION_ID: reg_id,
            KEYWORD_REGISTRATION_TS: reg_timestamp,
            KEYWORD_FINGERPRINT: doc_fingerprint,
        }
        if organization.strip():
            protected_keywords["Organization"] = organization.strip()
        if registration_number.strip():
            protected_keywords["Registration"] = registration_number.strip()
        if registration_date.strip():
            protected_keywords["RegistrationDate"] = registration_date.strip()
        if notes.strip():
            protected_keywords["Notes"] = notes.strip()

        new_meta["keywords"] = self._build_keywords_string(existing_keywords, protected_keywords)

        doc.set_metadata(new_meta)

        last_page = doc[-1]
        rect = last_page.rect
        margin = 40
        y_start = rect.height - margin

        if is_new_registration:
            status_line = "COPYRIGHT REGISTRATION — RECORD CREATED"
        else:
            status_line = "COPYRIGHT REGISTRATION — RECORD UPDATED"

        last_page.insert_text(
            fitz.Point(margin, y_start),
            status_line,
            fontsize=10,
            fontname="helv",
            color=(0.1, 0.1, 0.1),
        )
        y_start -= 18

        last_page.insert_text(
            fitz.Point(margin, y_start),
            notice_text,
            fontsize=9,
            fontname="helv",
            color=(0.2, 0.2, 0.2),
        )
        y_start -= 16

        detail_lines = [
            f"Original Owner: {copyright_owner.strip()}",
            f"Registration ID: {reg_id}",
            f"Registered: {reg_timestamp_display}",
        ]
        if is_new_registration:
            detail_lines.append(f"Document Fingerprint: SHA-256: {doc_fingerprint[:32]}...")
            detail_lines.append("Status: Registration Record Created")
        else:
            detail_lines.append("Status: Registration Record Updated")

        if author.strip():
            detail_lines.append(f"Author: {author.strip()}")
        if organization.strip():
            detail_lines.append(f"Organization: {organization.strip()}")
        if copyright_year.strip():
            detail_lines.append(f"Year: {copyright_year.strip()}")
        if registration_number.strip():
            detail_lines.append(f"Registration No: {registration_number.strip()}")
        if registration_date.strip():
            detail_lines.append(f"Registration Date: {registration_date.strip()}")
        if notes.strip():
            detail_lines.append(f"Notes: {notes.strip()}")

        for line in detail_lines:
            if y_start < margin + 20:
                new_page = doc.new_page(width=rect.width, height=rect.height)
                last_page = new_page
                y_start = rect.height - margin - 40
            last_page.insert_text(
                fitz.Point(margin, y_start),
                line,
                fontsize=8,
                fontname="helv",
                color=(0.3, 0.3, 0.3),
            )
            y_start -= 13

        warning_y = y_start - 10
        warnings = [
            "Protected Registration Information: The original copyright owner recorded",
            "during registration cannot be changed through this interface. Adding or",
            "managing additional copyright holders should be handled through",
            "Copyright Holder Management.",
            "",
            "Changing PDF metadata or copyright notices does not by itself transfer",
            "or remove legal copyright ownership.",
        ]
        for wline in warnings:
            if warning_y < margin + 20:
                new_page = doc.new_page(width=rect.width, height=rect.height)
                last_page = new_page
                warning_y = rect.height - margin - 40
            last_page.insert_text(
                fitz.Point(margin, warning_y),
                wline,
                fontsize=7,
                fontname="helv",
                color=(0.5, 0.5, 0.5),
            )
            warning_y -= 11

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        clean_name = self._sanitize_filename(original_filename)
        out_filename = f"copyright_registered_{clean_name}"
        out_path = out_dir / out_filename

        output_bytes = doc.write(garbage=4, deflate=True)
        doc.close()
        out_path.write_bytes(output_bytes)

        return {
            "success": True,
            "session_id": session_id,
            "original_filename": clean_name,
            "saved_filename": out_filename,
            "total_pages": fitz.open(stream=pdf_bytes, filetype="pdf").page_count,
            "is_new_registration": is_new_registration,
            "original_owner_locked": is_new_registration,
            "registration_id": reg_id,
            "registration_timestamp": reg_timestamp_display,
            "document_fingerprint": f"SHA-256: {doc_fingerprint[:32]}...",
            "registered_metadata": {
                "original_owner": copyright_owner.strip(),
                "author": author.strip(),
                "organization": organization.strip(),
                "copyright_year": copyright_year.strip(),
                "registration_number": registration_number.strip(),
                "registration_date": registration_date.strip(),
                "copyright_notice": notice_text,
                "notes": notes.strip(),
            },
            "download_url": f"/pdf-copyright-protection/registration/download/{session_id}",
            "message": (
                "Copyright registration record created successfully. "
                "The original copyright owner is now locked."
                if is_new_registration
                else "Copyright registration record updated. Original owner remains unchanged."
            ),
        }

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Processed PDF not found for this session.")
        return files[0], files[0].name


copyright_registration_service = CopyrightRegistrationService()
