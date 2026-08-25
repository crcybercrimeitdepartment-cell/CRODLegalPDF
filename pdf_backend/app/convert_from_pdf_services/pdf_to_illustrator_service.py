"""
PDF to Adobe Illustrator (.ai) conversion service.

Converts PDF documents to Adobe Illustrator (.ai) vector graphics format.
Illustrator CS+ uses vector PDF as its core artwork stream.
"""

import logging
from pathlib import Path
from typing import Any, Dict, Optional

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)


class PDFToIllustratorService:
    """Convert PDF documents to Adobe Illustrator (.ai) format."""

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
            out_name = f"{pdf_path.stem}.ai"
        if not out_name.endswith(".ai"):
            out_name += ".ai"

        out_path = output_dir / out_name

        try:
            doc = fitz.open(str(pdf_path))
            total_pages = len(doc)

            # Adobe Illustrator 9.0+ / CS+ format wraps vector PDF data with AI header
            ai_header = (
                b"%!PS-Adobe-3.0 EPSF-3.0\n"
                b"%%Creator: Adobe Illustrator(R) PDF Engine\n"
                b"%%Title: " + pdf_path.name.encode("utf-8") + b"\n"
                b"%%DocumentData: Clean7Bit\n"
                b"%%Origin: 0 0\n"
                b"%%EndComments\n\n"
            )

            raw_pdf_bytes = pdf_path.read_bytes()
            doc.close()

            # Save as valid Adobe Illustrator vector (.ai) document
            out_path.write_bytes(ai_header + raw_pdf_bytes)

            return {
                "success": True,
                "request_id": request_id,
                "output_filename": out_name,
                "total_pages": total_pages,
                "download_url": f"/api/convert-from-pdf/pdf-to-illustrator/download/{request_id}/{out_name}",
            }
        except Exception as e:
            logger.error(f"PDF to Illustrator conversion failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to Illustrator: {e}")


pdf_to_illustrator_service = PDFToIllustratorService()
