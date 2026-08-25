"""
PDF to PNG conversion service.
Renders each PDF page as a high-quality PNG image using PyMuPDF.
Returns individual PNGs + a ZIP archive if multiple pages.
"""
import logging
import zipfile
from pathlib import Path
from typing import Any, Dict

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)
DPI = 150


class PDFToPngService:
    async def process(self, request_id: str, filename: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"File not found: {filename}")

        logger.info(f"Converting PDF to PNG: {pdf_path}")

        try:
            doc = fitz.open(str(pdf_path))
            zoom = DPI / 72.0
            mat = fitz.Matrix(zoom, zoom)
            saved_images = []

            for page_num in range(len(doc)):
                page = doc[page_num]
                pix = page.get_pixmap(matrix=mat, alpha=False)
                img_name = f"{pdf_path.stem}_page_{page_num + 1:03d}.png"
                img_path = output_dir / img_name
                pix.save(str(img_path))
                saved_images.append(img_name)

            doc.close()
        except Exception as e:
            logger.error(f"PDF to PNG failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to PNG: {e}")

        if not saved_images:
            raise ValueError("No images were produced.")

        zip_name = None
        if len(saved_images) > 1:
            zip_name = f"{pdf_path.stem}_pages.zip"
            zip_path = output_dir / zip_name
            with zipfile.ZipFile(str(zip_path), "w", zipfile.ZIP_DEFLATED) as zf:
                for img_name in saved_images:
                    zf.write(str(output_dir / img_name), img_name)

        return {
            "success": True,
            "request_id": request_id,
            "images": saved_images,
            "total_pages": len(saved_images),
            "zip_filename": zip_name,
            "original_filename": filename,
        }


pdf_to_png_service = PDFToPngService()
