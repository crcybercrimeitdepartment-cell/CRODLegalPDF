"""
PDF to Adobe Photoshop (.psd) conversion service.

Renders PDF document pages into Adobe Photoshop (.psd) image binary structure.
Supports Photoshop PSD format (8BPS signature, RGB color mode).
"""

import io
import logging
import struct
from pathlib import Path
from typing import Any, Dict, Optional

import fitz  # PyMuPDF
from PIL import Image

from app.core.paths import Paths

logger = logging.getLogger(__name__)


def create_psd_file(img: Image.Image) -> bytes:
    """Encode a PIL RGB image into a valid Adobe Photoshop (.psd) binary stream."""
    img = img.convert("RGB")
    width, height = img.size

    # PSD Header (26 bytes)
    # Signature: 8BPS, Version: 1, Reserved: 6 zero bytes, Channels: 3 (RGB), Height, Width, Depth: 8, Mode: 3 (RGB)
    header = struct.pack(">4sH6sHIIHH", b"8BPS", 1, b"\x00" * 6, 3, height, width, 8, 3)

    color_mode_len = struct.pack(">I", 0)
    image_resources_len = struct.pack(">I", 0)
    layer_mask_len = struct.pack(">I", 0)
    compression = struct.pack(">H", 0)  # 0 = Raw uncompressed planar

    # Extract R, G, B planar bytes
    r, g, b = img.split()
    r_bytes = r.tobytes()
    g_bytes = g.tobytes()
    b_bytes = b.tobytes()

    image_data = r_bytes + g_bytes + b_bytes

    return header + color_mode_len + image_resources_len + layer_mask_len + compression + image_data


class PDFToPhotoshopService:
    """Convert PDF documents to Adobe Photoshop (.psd) format."""

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
            out_name = f"{pdf_path.stem}.psd"
        if not out_name.endswith(".psd"):
            out_name += ".psd"

        out_path = output_dir / out_name
        dpi = int(config.get("dpi", 150))

        try:
            doc = fitz.open(str(pdf_path))
            total_pages = len(doc)
            zoom = dpi / 72.0
            mat = fitz.Matrix(zoom, zoom)

            first_page = doc[0]
            pix = first_page.get_pixmap(matrix=mat, alpha=False)
            pil_img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

            psd_bytes = create_psd_file(pil_img)

            doc.close()
            out_path.write_bytes(psd_bytes)

            return {
                "success": True,
                "request_id": request_id,
                "output_filename": out_name,
                "total_pages": total_pages,
                "download_url": f"/api/convert-from-pdf/pdf-to-photoshop/download/{request_id}/{out_name}",
            }
        except Exception as e:
            logger.error(f"PDF to Photoshop conversion failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to Photoshop: {e}")


pdf_to_photoshop_service = PDFToPhotoshopService()
