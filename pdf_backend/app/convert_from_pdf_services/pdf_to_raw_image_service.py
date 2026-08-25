import logging
import zipfile
from pathlib import Path
from typing import Any, Dict
import fitz
from PIL import Image

from app.core.paths import Paths

logger = logging.getLogger(__name__)

class PDFToRawImageService:
    async def process(self, request_id: str, filename: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"File not found: {filename}")

        logger.info(f"Converting PDF to RAW image: {pdf_path}")

        try:
            dpi = int(config.get("dpi", 300))
            zoom = dpi / 72.0
            mat = fitz.Matrix(zoom, zoom)
            
            doc = fitz.open(str(pdf_path))
            total_pages = len(doc)
            
            if total_pages == 0:
                raise ValueError("No pages found in the PDF")

            saved_images = []

            for page_num in range(total_pages):
                page = doc[page_num]
                pix = page.get_pixmap(matrix=mat, alpha=False)
                
                # Convert fitz pixmap to PIL Image
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                img_name = f"{pdf_path.stem}_page_{page_num + 1:03d}.raw"
                img_path = output_dir / img_name
                
                img_path.write_bytes(img.tobytes())
                saved_images.append(img_name)

            doc.close()

            out_name = ""
            if len(saved_images) == 1:
                out_name = saved_images[0]
            else:
                out_name = f"{pdf_path.stem}_raw.zip"
                out_path = output_dir / out_name
                with zipfile.ZipFile(str(out_path), "w", zipfile.ZIP_DEFLATED) as zf:
                    for img_name in saved_images:
                        zf.write(str(output_dir / img_name), img_name)

            return {
                "success": True,
                "request_id": request_id,
                "original_filename": filename,
                "output_filename": out_name,
                "message": "Successfully converted PDF to RAW Image.",
                "download_url": f"/api/convert-from-pdf/pdf-to-raw-image/download/{request_id}/{out_name}",
                "view_url": f"/api/convert-from-pdf/pdf-to-raw-image/view/{request_id}/{out_name}",
            }
        except Exception as e:
            logger.error(f"Failed to convert PDF to RAW image: {str(e)}")
            raise

pdf_to_raw_image_service = PDFToRawImageService()
