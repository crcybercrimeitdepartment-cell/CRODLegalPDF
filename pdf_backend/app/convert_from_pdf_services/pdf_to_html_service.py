"""
PDF to HTML conversion service.
Converts each PDF page to an HTML document using PyMuPDF's built-in HTML export.
All pages are merged into a single HTML file with a page structure.
"""
import logging
from pathlib import Path
from typing import Any, Dict

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)


class PDFToHtmlService:
    async def process(self, request_id: str, filename: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"File not found: {filename}")

        logger.info(f"Converting PDF to HTML: {pdf_path}")

        try:
            doc = fitz.open(str(pdf_path))
            page_bodies = []

            for page_num in range(len(doc)):
                page = doc[page_num]
                html_fragment = page.get_text("html")
                page_bodies.append(
                    f'<section class="pdf-page" id="page-{page_num + 1}">'
                    f'<h2 class="page-label">Page {page_num + 1}</h2>'
                    f'{html_fragment}'
                    f'</section>'
                )

            doc.close()

            full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{pdf_path.stem}</title>
  <style>
    body {{ font-family: Arial, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #222; }}
    .pdf-page {{ border: 1px solid #ddd; border-radius: 8px; padding: 24px; margin-bottom: 32px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.06); }}
    .page-label {{ color: #6b7280; font-size: .85rem; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }}
  </style>
</head>
<body>
{"".join(page_bodies)}
</body>
</html>"""

            out_name = f"{pdf_path.stem}.html"
            out_path = output_dir / out_name
            out_path.write_text(full_html, encoding="utf-8")

        except Exception as e:
            logger.error(f"PDF to HTML failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to HTML: {e}")

        return {
            "success": True,
            "request_id": request_id,
            "output_filename": out_name,
            "total_pages": len(page_bodies),
            "original_filename": filename,
        }


pdf_to_html_service = PDFToHtmlService()
