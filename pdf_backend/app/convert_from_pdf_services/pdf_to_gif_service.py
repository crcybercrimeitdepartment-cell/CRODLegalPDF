"""
PDF to GIF conversion service.
Renders each PDF page as a frame and produces an animated GIF (multi-page)
or a single static GIF (single page) using Pillow.
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
DPI = 120  # Slightly lower for GIF to keep file size reasonable


class PDFToGifService:
    async def process(self, request_id: str, filename: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"File not found: {filename}")

        logger.info(f"Converting PDF to GIF: {pdf_path}")

        try:
            doc = fitz.open(str(pdf_path))
            zoom = DPI / 72.0
            mat = fitz.Matrix(zoom, zoom)
            pil_frames = []

            for page_num in range(len(doc)):
                page = doc[page_num]
                pix = page.get_pixmap(matrix=mat, alpha=False)
                img_bytes = pix.tobytes("png")
                pil_img = Image.open(BytesIO(img_bytes)).convert("RGB")
                # Convert to palette mode for GIF (256 colours)
                pil_frames.append(pil_img.convert("P", palette=Image.ADAPTIVE, colors=256))

            doc.close()

            total_pages = len(pil_frames)
            saved_images = []

            if total_pages == 1:
                # Single page → single GIF
                gif_name = f"{pdf_path.stem}_page_001.gif"
                gif_path = output_dir / gif_name
                pil_frames[0].save(str(gif_path), format="GIF")
                saved_images.append(gif_name)
            else:
                # Multi-page → animated GIF + individual GIFs
                anim_name = f"{pdf_path.stem}_animated.gif"
                anim_path = output_dir / anim_name
                pil_frames[0].save(
                    str(anim_path),
                    format="GIF",
                    save_all=True,
                    append_images=pil_frames[1:],
                    loop=0,
                    duration=500,  # 0.5s per frame
                )
                saved_images.append(anim_name)

                # Also save each page as individual GIF
                for i, frame in enumerate(pil_frames):
                    gif_name = f"{pdf_path.stem}_page_{i + 1:03d}.gif"
                    frame.save(str(output_dir / gif_name), format="GIF")
                    saved_images.append(gif_name)

        except Exception as e:
            logger.error(f"PDF to GIF failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to GIF: {e}")

        if not saved_images:
            raise ValueError("No GIF images were produced.")

        # ZIP if multiple files
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
            "animated": total_pages > 1,
            "animated_url": saved_images[0] if total_pages > 1 else None,
            "original_filename": filename,
        }


pdf_to_gif_service = PDFToGifService()
