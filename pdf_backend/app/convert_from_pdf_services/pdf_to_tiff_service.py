"""
PDF to TIFF conversion service.
Renders each PDF page as a TIFF image using PyMuPDF + Pillow.
Supports multi-page TIFF (single file with all pages) and individual TIFFs.
"""
import logging
import zipfile
from pathlib import Path
from typing import Any, Dict
from io import BytesIO

import fitz  # PyMuPDF
from PIL import Image

from app.core.paths import Paths

logger = logging.getLogger(__name__)
DPI = 150


class PDFToTiffService:
    async def process(self, request_id: str, filename: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"File not found: {filename}")

        logger.info(f"Converting PDF to TIFF: {pdf_path}")

        try:
            doc = fitz.open(str(pdf_path))
            zoom = DPI / 72.0
            mat = fitz.Matrix(zoom, zoom)
            pil_images = []
            saved_images = []

            for page_num in range(len(doc)):
                page = doc[page_num]
                pix = page.get_pixmap(matrix=mat, alpha=False)
                img_bytes = pix.tobytes("png")
                pil_img = Image.open(BytesIO(img_bytes)).convert("RGB")
                pil_images.append(pil_img)

            doc.close()

            total_pages = len(pil_images)

            if total_pages == 1:
                # Single page TIFF
                tiff_name = f"{pdf_path.stem}_page_001.tiff"
                tiff_path = output_dir / tiff_name
                pil_images[0].save(str(tiff_path), format="TIFF", compression="lzw")
                saved_images.append(tiff_name)
            else:
                # Multi-page TIFF (all pages in one file)
                multi_name = f"{pdf_path.stem}_multipage.tiff"
                multi_path = output_dir / multi_name
                pil_images[0].save(
                    str(multi_path),
                    format="TIFF",
                    compression="lzw",
                    save_all=True,
                    append_images=pil_images[1:],
                )
                saved_images.append(multi_name)

                # Also save individual page TIFFs
                for i, img in enumerate(pil_images):
                    tiff_name = f"{pdf_path.stem}_page_{i + 1:03d}.tiff"
                    img.save(str(output_dir / tiff_name), format="TIFF", compression="lzw")
                    saved_images.append(tiff_name)

        except Exception as e:
            logger.error(f"PDF to TIFF failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to TIFF: {e}")

        if not saved_images:
            raise ValueError("No TIFF images were produced.")

        # ZIP for easy download
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
            "total_pages": total_pages,
            "zip_filename": zip_name,
            "multipage_tiff": saved_images[0] if total_pages > 1 else None,
            "original_filename": filename,
        }


pdf_to_tiff_service = PDFToTiffService()
