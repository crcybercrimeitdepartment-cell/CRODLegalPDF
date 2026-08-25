"""
PDF to ZIP conversion service.

Renders pages of a PDF document into high-quality images (PNG, JPG, WebP)
and packages all page images into a single ZIP archive.
"""

import io
import logging
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)


def parse_page_range(range_str: str, total_pages: int) -> List[int]:
    """Parse page range string (e.g., '1-5, 8, 10-12') into 0-indexed page indices."""
    if not range_str or range_str.strip().lower() == "all":
        return list(range(total_pages))

    pages = set()
    parts = range_str.split(",")
    for part in parts:
        part = part.strip()
        if "-" in part:
            try:
                start_s, end_s = part.split("-")
                start = int(start_s) - 1
                end = int(end_s) - 1
                for p in range(max(0, start), min(total_pages, end + 1)):
                    pages.add(p)
            except ValueError:
                continue
        else:
            try:
                p = int(part) - 1
                if 0 <= p < total_pages:
                    pages.add(p)
            except ValueError:
                continue

    res = sorted(list(pages))
    return res if res else list(range(total_pages))


class PDFToZipService:
    """Renders PDF pages as images and packages them into a ZIP archive."""

    async def process(
        self,
        request_id: str,
        filename: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Process PDF and generate ZIP archive containing page images.

        Args:
            request_id: Request identifier.
            filename: Input PDF filename.
            config: Dict containing format, dpi, page_range, etc.

        Returns:
            Dict containing output_filename, total_pages, image_count, etc.
        """
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"PDF file not found: {filename}")

        img_format = str(config.get("format", "png")).lower()
        if img_format not in ("png", "jpg", "jpeg", "webp"):
            img_format = "png"

        try:
            dpi = int(config.get("dpi", 150))
        except (ValueError, TypeError):
            dpi = 150

        page_range_str = str(config.get("pages", "all"))

        logger.info(f"Converting PDF to ZIP (images format={img_format}, dpi={dpi}): {pdf_path}")

        try:
            doc = fitz.open(str(pdf_path))
            total_doc_pages = len(doc)

            target_indices = parse_page_range(page_range_str, total_doc_pages)
            zoom = dpi / 72.0
            mat = fitz.Matrix(zoom, zoom)

            zip_buf = io.BytesIO()

            pdf_stem = pdf_path.stem
            ext_map = {"png": "png", "jpg": "jpg", "jpeg": "jpg", "webp": "webp"}
            file_ext = ext_map.get(img_format, "png")

            image_names = []

            with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
                for idx in target_indices:
                    page = doc[idx]
                    pix = page.get_pixmap(matrix=mat, alpha=False)

                    img_name = f"{pdf_stem}_page_{idx + 1:03d}.{file_ext}"
                    image_names.append(img_name)

                    # Get image bytes
                    if file_ext == "png":
                        img_bytes = pix.tobytes("png")
                    elif file_ext in ("jpg", "jpeg"):
                        img_bytes = pix.tobytes("jpg")
                    elif file_ext == "webp":
                        img_bytes = pix.tobytes("webp")
                    else:
                        img_bytes = pix.tobytes("png")

                    zf.writestr(img_name, img_bytes)

            doc.close()

            custom_zip = config.get("output_filename", "").strip()
            if custom_zip:
                if not custom_zip.endswith(".zip"):
                    custom_zip += ".zip"
                out_name = custom_zip
            else:
                out_name = f"{pdf_stem}_images.zip"

            out_path = output_dir / out_name
            out_path.write_bytes(zip_buf.getvalue())

            return {
                "success": True,
                "request_id": request_id,
                "output_filename": out_name,
                "total_pages": total_doc_pages,
                "image_count": len(image_names),
                "image_names": image_names,
                "download_url": f"/api/convert-from-pdf/pdf-to-zip/download/{request_id}/{out_name}",
            }
        except Exception as e:
            logger.error(f"PDF to ZIP conversion failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to ZIP: {e}")


pdf_to_zip_service = PDFToZipService()
