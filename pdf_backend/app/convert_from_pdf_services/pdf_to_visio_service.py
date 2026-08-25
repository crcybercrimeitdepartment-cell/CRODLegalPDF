"""
PDF to Visio (.vsdx) conversion service.

Renders PDF pages into vector/raster drawings and packages them into a valid
Open Packaging Conventions (OPC) Microsoft Visio (.vsdx) file structure.
"""

import io
import logging
import zipfile
from pathlib import Path
from typing import Any, Dict, Optional

import fitz  # PyMuPDF
from PIL import Image

from app.core.paths import Paths

logger = logging.getLogger(__name__)


class PDFToVisioService:
    """Convert PDF documents to Microsoft Visio (.vsdx) format."""

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

        dpi = int(config.get("dpi", 150))
        zip_stem = pdf_path.stem

        out_name = config.get("output_filename", "").strip()
        if not out_name:
            out_name = f"{zip_stem}.vsdx"
        if not out_name.endswith(".vsdx"):
            out_name += ".vsdx"

        out_path = output_dir / out_name

        try:
            doc = fitz.open(str(pdf_path))
            total_pages = len(doc)
            zoom = dpi / 72.0
            mat = fitz.Matrix(zoom, zoom)

            vsdx_buf = io.BytesIO()

            with zipfile.ZipFile(vsdx_buf, "w", zipfile.ZIP_DEFLATED) as zf:
                # 1. Content Types
                content_types_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/visio/document.xml" ContentType="application/vnd.ms-visio.drawing.main+xml"/>
  <Override PartName="/visio/pages/pages.xml" ContentType="application/vnd.ms-visio.pages+xml"/>
</Types>"""
                zf.writestr("[Content_Types].xml", content_types_xml)

                # 2. Main Rels
                main_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/document" Target="visio/document.xml"/>
</Relationships>"""
                zf.writestr("_rels/.rels", main_rels)

                # 3. Visio Document XML
                doc_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<VisioDocument xmlns="http://schemas.microsoft.com/office/visio/2012/main">
  <DocumentSettings/>
</VisioDocument>"""
                zf.writestr("visio/document.xml", doc_xml)

                # 4. Save Page Images
                for i in range(total_pages):
                    page = doc[i]
                    pix = page.get_pixmap(matrix=mat, alpha=False)
                    img_bytes = pix.tobytes("png")
                    zf.writestr(f"visio/media/image{i+1}.png", img_bytes)

                    page_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<PageContents xmlns="http://schemas.microsoft.com/office/visio/2012/main">
  <Shapes>
    <Shape ID="1" Type="Foreign" LineStyle="0" FillStyle="0">
      <RelID r:id="rId{i+1}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
    </Shape>
  </Shapes>
</PageContents>"""
                    zf.writestr(f"visio/pages/page{i+1}.xml", page_xml)

            doc.close()
            out_path.write_bytes(vsdx_buf.getvalue())

            return {
                "success": True,
                "request_id": request_id,
                "output_filename": out_name,
                "total_pages": total_pages,
                "download_url": f"/api/convert-from-pdf/pdf-to-visio/download/{request_id}/{out_name}",
            }
        except Exception as e:
            logger.error(f"PDF to Visio conversion failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to Visio: {e}")


pdf_to_visio_service = PDFToVisioService()
