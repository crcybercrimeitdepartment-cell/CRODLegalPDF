"""
PDF to SVG conversion service.
Exports each PDF page as a scalable SVG vector file using PyMuPDF.
SVGs are text-based and resolution-independent.
Multi-page PDFs produce individual SVG files bundled in a ZIP.
"""
import logging
import zipfile
from pathlib import Path
from typing import Any, Dict

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)


class PDFToSvgService:
    async def process(self, request_id: str, filename: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"File not found: {filename}")

        logger.info(f"Converting PDF to SVG: {pdf_path}")

        try:
            doc = fitz.open(str(pdf_path))
            saved_files = []

            for page_num in range(len(doc)):
                page = doc[page_num]
                svg_content = page.get_svg_image(matrix=fitz.Identity)
                svg_name = f"{pdf_path.stem}_page_{page_num + 1:03d}.svg"
                svg_path = output_dir / svg_name
                svg_path.write_text(svg_content, encoding="utf-8")
                saved_files.append(svg_name)

            doc.close()
        except Exception as e:
            logger.error(f"PDF to SVG failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to SVG: {e}")

        if not saved_files:
            raise ValueError("No SVG files were produced.")

        zip_name = None
        if len(saved_files) > 1:
            zip_name = f"{pdf_path.stem}_pages.zip"
            zip_path = output_dir / zip_name
            with zipfile.ZipFile(str(zip_path), "w", zipfile.ZIP_DEFLATED) as zf:
                for svg_name in saved_files:
                    zf.write(str(output_dir / svg_name), svg_name)

        return {
            "success": True,
            "request_id": request_id,
            "files": saved_files,
            "total_pages": len(saved_files),
            "zip_filename": zip_name,
            "original_filename": filename,
        }


pdf_to_svg_service = PDFToSvgService()
