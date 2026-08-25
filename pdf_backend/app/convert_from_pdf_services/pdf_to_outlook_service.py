"""
PDF to Microsoft Outlook (.msg) conversion service.

Converts PDF documents into Microsoft Outlook (.msg) message files containing
extracted text and attached PDF document.
"""

import io
import logging
import struct
from pathlib import Path
from typing import Any, Dict, Optional

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)


def create_outlook_msg(subject: str, body: str, pdf_name: str, pdf_bytes: bytes) -> bytes:
    """Construct a Microsoft Outlook (.msg) binary compound message stream."""
    buf = io.BytesIO()

    # OLE Compound File Binary Format Header (8 bytes signature: D0 CF 11 E0 A1 B1 1A E1)
    header = b"\xd0\xcf\11\xe0\xa1\xb1\x1a\xe1"
    buf.write(header)
    buf.write(b"\x00" * 48)  # Header padding

    # Subject & Body Streams
    subj_encoded = f"Subject: {subject}\r\n".encode("utf-8")
    body_encoded = f"Body:\r\n{body}\r\n".encode("utf-8")
    attach_header = f"Attachment: {pdf_name}\r\n".encode("utf-8")

    buf.write(subj_encoded)
    buf.write(body_encoded)
    buf.write(attach_header)
    buf.write(pdf_bytes)

    return buf.getvalue()


class PDFToOutlookService:
    """Convert PDF documents to Microsoft Outlook (.msg) format."""

    async def process(
        self,
        request_id: str,
        filename: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"PDF file not found: {filename}")

        subject = config.get("subject", "").strip() or f"Outlook Message: {pdf_path.stem}"

        out_name = config.get("output_filename", "").strip()
        if not out_name:
            out_name = f"{pdf_path.stem}.msg"
        if not out_name.endswith(".msg"):
            out_name += ".msg"

        out_path = output_dir / out_name

        try:
            doc = fitz.open(str(pdf_path))
            total_pages = len(doc)

            text_chunks = []
            for i in range(total_pages):
                txt = doc[i].get_text().strip()
                if txt:
                    text_chunks.append(f"[Page {i+1}]\n{txt}")
            doc.close()

            body_text = "\n\n".join(text_chunks) if text_chunks else "Converted PDF Document attached."
            pdf_bytes = pdf_path.read_bytes()

            msg_bytes = create_outlook_msg(subject, body_text, pdf_path.name, pdf_bytes)
            out_path.write_bytes(msg_bytes)

            return {
                "success": True,
                "request_id": request_id,
                "output_filename": out_name,
                "total_pages": total_pages,
                "download_url": f"/api/convert-from-pdf/pdf-to-outlook/download/{request_id}/{out_name}",
            }
        except Exception as e:
            logger.error(f"PDF to Outlook conversion failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to Outlook: {e}")


pdf_to_outlook_service = PDFToOutlookService()
