"""
PDF to TXT (Plain Text) conversion service.
Extracts all text from PDF pages using PyMuPDF.
"""
import logging
from pathlib import Path
from typing import Any, Dict

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)


class PDFToTxtService:
    async def process(self, request_id: str, filename: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"File not found: {filename}")

        logger.info(f"Converting PDF to TXT: {pdf_path}")

        try:
            doc = fitz.open(str(pdf_path))
            all_text_parts = []

            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text("text")
                all_text_parts.append(f"--- Page {page_num + 1} ---\n{text.strip()}\n")

            doc.close()

            combined_text = "\n".join(all_text_parts)
            out_name = f"{pdf_path.stem}.txt"
            out_path = output_dir / out_name
            out_path.write_text(combined_text, encoding="utf-8")

        except Exception as e:
            logger.error(f"PDF to TXT failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to TXT: {e}")

        return {
            "success": True,
            "request_id": request_id,
            "output_filename": out_name,
            "total_pages": len(all_text_parts),
            "original_filename": filename,
        }


pdf_to_txt_service = PDFToTxtService()
