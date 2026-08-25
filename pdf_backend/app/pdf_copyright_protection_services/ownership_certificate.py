"""
Ownership Certificate Service — PDF Copyright Protection Section.

Generates a professional ownership certificate PDF containing owner
information, document fingerprint (SHA-256), and a unique certificate
ID.  The original PDF is preserved unchanged.
"""

from __future__ import annotations

import hashlib
import logging
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024


class OwnershipCertificateService:
    """Generate ownership certificate PDFs from user-supplied information."""

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

    def _draw_certificate(
        self,
        owner: str,
        organization: str,
        doc_title: str,
        pub_date: str,
        copyright_info: str,
        description: str,
        ref_id: str,
        doc_hash: str,
        cert_id: str,
        created_at: str,
    ) -> bytes:
        """Create a certificate PDF using PyMuPDF."""
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)  # A4

        # Background
        shape = page.new_shape()
        shape.draw_rect(fitz.Rect(30, 30, 565, 812))
        shape.finish(color=(0.2, 0.2, 0.5), width=2, fill=(1, 1, 1))
        shape.commit()

        # Inner border
        shape = page.new_shape()
        shape.draw_rect(fitz.Rect(40, 40, 555, 802))
        shape.finish(color=(0.6, 0.6, 0.8), width=0.5)
        shape.commit()

        y = 70

        # Title
        page.insert_text(fitz.Point(297 - 80, y), "OWNERSHIP CERTIFICATE",
                         fontname="helv", fontsize=22, color=(0.2, 0.2, 0.5))
        y += 15
        page.draw_line(fitz.Point(80, y), fitz.Point(515, y),
                       color=(0.2, 0.2, 0.5), width=1.5)
        y += 35

        def add_field(label, value, fs=11):
            nonlocal y
            if not value:
                return
            page.insert_text(fitz.Point(70, y), f"{label}:",
                             fontname="helv", fontsize=fs, color=(0.3, 0.3, 0.3))
            y += 18
            # Wrap long values
            max_chars = 65
            while value:
                chunk = value[:max_chars]
                value = value[max_chars:]
                page.insert_text(fitz.Point(90, y), chunk,
                                 fontname="helv", fontsize=fs, color=(0.1, 0.1, 0.1))
                y += 16
            y += 6

        add_field("Certificate ID", cert_id)
        add_field("Date Generated", created_at)
        y += 5
        add_field("Copyright Owner", owner)
        if organization:
            add_field("Organization", organization)
        if doc_title:
            add_field("Document Title", doc_title)
        if pub_date:
            add_field("Publication Date", pub_date)
        if copyright_info:
            add_field("Copyright Information", copyright_info)
        if description:
            add_field("Description", description)
        if ref_id:
            add_field("Reference ID", ref_id)

        y += 5
        page.draw_line(fitz.Point(70, y), fitz.Point(525, y),
                       color=(0.7, 0.7, 0.7), width=0.5)
        y += 20

        page.insert_text(fitz.Point(70, y), "Document Fingerprint (SHA-256):",
                         fontname="helv", fontsize=9, color=(0.3, 0.3, 0.3))
        y += 14
        # Split hash into two lines
        page.insert_text(fitz.Point(90, y), doc_hash[:48],
                         fontname="cour", fontsize=8, color=(0.2, 0.2, 0.2))
        y += 12
        page.insert_text(fitz.Point(90, y), doc_hash[48:],
                         fontname="cour", fontsize=8, color=(0.2, 0.2, 0.2))
        y += 25

        page.insert_text(fitz.Point(70, y),
                         "This certificate is a generated ownership record.",
                         fontname="helv", fontsize=8, color=(0.5, 0.5, 0.5))
        y += 12
        page.insert_text(fitz.Point(70, y),
                         "It does not constitute legal registration or certified ownership.",
                         fontname="helv", fontsize=8, color=(0.5, 0.5, 0.5))

        cert_bytes = doc.write(garbage=4, deflate=True)
        doc.close()
        return cert_bytes

    def generate_certificate(
        self,
        pdf_bytes: bytes,
        original_filename: str,
        session_id: str,
        owner: str = "",
        organization: str = "",
        doc_title: str = "",
        pub_date: str = "",
        copyright_info: str = "",
        description: str = "",
        ref_id: str = "",
    ) -> Dict[str, Any]:
        """Generate an ownership certificate PDF."""
        self._validate_pdf(pdf_bytes)
        if not owner.strip():
            raise ValueError("Owner name is required.")

        doc_hash = hashlib.sha256(pdf_bytes).hexdigest()
        cert_id = f"CERT-{uuid.uuid4().hex[:12].upper()}"
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        cert_bytes = self._draw_certificate(
            owner=owner.strip(),
            organization=organization.strip(),
            doc_title=doc_title.strip(),
            pub_date=pub_date.strip(),
            copyright_info=copyright_info.strip(),
            description=description.strip(),
            ref_id=ref_id.strip(),
            doc_hash=doc_hash,
            cert_id=cert_id,
            created_at=now,
        )

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        clean_name = self._sanitize_filename(original_filename)

        cert_filename = f"ownership_certificate_{clean_name}"
        cert_path = out_dir / cert_filename
        cert_path.write_bytes(cert_bytes)

        return {
            "success": True,
            "session_id": session_id,
            "original_filename": clean_name,
            "certificate_filename": cert_filename,
            "certificate_id": cert_id,
            "document_hash": doc_hash,
            "owner": owner.strip(),
            "organization": organization.strip(),
            "created_at": now,
            "certificate_download_url": f"/pdf-copyright-protection/ownership-certificate/download/{session_id}",
            "message": "Ownership certificate generated successfully.",
        }

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Certificate PDF not found for this session.")
        return files[0], files[0].name


ownership_certificate_service = OwnershipCertificateService()
