"""
PDF to XML conversion service.
Extracts structured content from PDF using PyMuPDF's XML text mode.
Each page is wrapped in an XML element with its page number.
"""
import logging
from pathlib import Path
from typing import Any, Dict

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)


class PDFToXmlService:
    async def process(self, request_id: str, filename: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"File not found: {filename}")

        logger.info(f"Converting PDF to XML: {pdf_path}")

        try:
            doc = fitz.open(str(pdf_path))
            page_xmls = []

            for page_num in range(len(doc)):
                page = doc[page_num]
                xml_fragment = page.get_text("xml")
                page_xmls.append(
                    f'  <page number="{page_num + 1}">\n'
                    f'{xml_fragment}\n'
                    f'  </page>'
                )

            doc.close()

            full_xml = (
                '<?xml version="1.0" encoding="UTF-8"?>\n'
                f'<document filename="{pdf_path.name}" total_pages="{len(page_xmls)}">\n'
                + "\n".join(page_xmls)
                + "\n</document>"
            )

            out_name = f"{pdf_path.stem}.xml"
            out_path = output_dir / out_name
            out_path.write_text(full_xml, encoding="utf-8")

        except Exception as e:
            logger.error(f"PDF to XML failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to XML: {e}")

        return {
            "success": True,
            "request_id": request_id,
            "output_filename": out_name,
            "total_pages": len(page_xmls),
            "original_filename": filename,
        }


pdf_to_xml_service = PDFToXmlService()
