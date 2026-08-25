"""
PDF to Email (.eml) conversion service.

Converts PDF documents into standard MIME RFC-822 Email (.eml) messages with
extracted text body and PDF file attachments.
"""

import logging
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any, Dict, Optional

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)


class PDFToEmailService:
    """Convert PDF documents to Email (.eml) message format."""

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

        subject = config.get("subject", "").strip() or f"Document: {pdf_path.stem}"
        to_email = config.get("to_email", "").strip() or "recipient@example.com"
        from_email = config.get("from_email", "").strip() or "sender@example.com"

        out_name = config.get("output_filename", "").strip()
        if not out_name:
            out_name = f"{pdf_path.stem}.eml"
        if not out_name.endswith(".eml"):
            out_name += ".eml"

        out_path = output_dir / out_name

        try:
            doc = fitz.open(str(pdf_path))
            total_pages = len(doc)

            # Extract PDF text content for email body
            extracted_text = []
            for i in range(total_pages):
                txt = doc[i].get_text().strip()
                if txt:
                    extracted_text.append(f"--- Page {i+1} ---\n{txt}")
            doc.close()

            body_content = "\n\n".join(extracted_text) if extracted_text else "Attached is your converted PDF document."

            msg = MIMEMultipart("mixed")
            msg["Subject"] = subject
            msg["From"] = from_email
            msg["To"] = to_email
            msg["X-Mailer"] = "PDF Tools Email Converter"

            # Attach Text / HTML Body
            html_body = f"<html><body><h2>{subject}</h2><pre style='font-family: sans-serif;'>{body_content}</pre></body></html>"
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            # Attach original PDF file
            pdf_bytes = pdf_path.read_bytes()
            pdf_attach = MIMEApplication(pdf_bytes, _subtype="pdf")
            pdf_attach.add_header("Content-Disposition", "attachment", filename=pdf_path.name)
            msg.attach(pdf_attach)

            out_path.write_bytes(msg.as_bytes())

            return {
                "success": True,
                "request_id": request_id,
                "output_filename": out_name,
                "total_pages": total_pages,
                "download_url": f"/api/convert-from-pdf/pdf-to-email/download/{request_id}/{out_name}",
            }
        except Exception as e:
            logger.error(f"PDF to Email conversion failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to Email: {e}")


pdf_to_email_service = PDFToEmailService()
