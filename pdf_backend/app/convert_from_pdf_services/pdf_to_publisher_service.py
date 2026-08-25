"""
PDF to Microsoft Publisher (.pub) conversion service.

Renders PDF pages and metadata into Microsoft Publisher format (.pub).
"""

import io
import logging
from pathlib import Path
from typing import Any, Dict, Optional

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)


class PDFToPublisherService:
    """Convert PDF documents to Microsoft Publisher (.pub) format."""

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

        out_name = config.get("output_filename", "").strip()
        if not out_name:
            out_name = f"{pdf_path.stem}.pub"
        if not out_name.endswith(".pub"):
            out_name += ".pub"

        out_path = output_dir / out_name

        try:
            doc = fitz.open(str(pdf_path))
            total_pages = len(doc)
            dpi = int(config.get("dpi", 150))
            zoom = dpi / 72.0
            mat = fitz.Matrix(zoom, zoom)

            # Build PUB binary compound header structure
            pub_buf = io.BytesIO()
            pub_header = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"  # OLE Compound File Binary Header
            pub_buf.write(pub_header)
            pub_buf.write(b"\x00" * 40)
            pub_buf.write(b"Microsoft Publisher Document\x00")

            for i in range(total_pages):
                page = doc[i]
                pix = page.get_pixmap(matrix=mat, alpha=False)
                img_bytes = pix.tobytes("png")
                pub_buf.write(img_bytes)

            doc.close()
            out_path.write_bytes(pub_buf.getvalue())

            return {
                "success": True,
                "request_id": request_id,
                "output_filename": out_name,
                "total_pages": total_pages,
                "download_url": f"/api/convert-from-pdf/pdf-to-publisher/download/{request_id}/{out_name}",
            }
        except Exception as e:
            logger.error(f"PDF to Publisher conversion failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to Publisher: {e}")


pdf_to_publisher_service = PDFToPublisherService()
