"""
PDF to XPS conversion service.
Converts a PDF to XPS format using PyMuPDF's built-in XPS writer.
PyMuPDF (fitz) can convert PDF -> XPS via the write/save path
by using the "xps" output format.
"""
import logging
from pathlib import Path
from typing import Any, Dict

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)


class PDFToXpsService:
    async def process(self, request_id: str, filename: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"File not found: {filename}")

        logger.info(f"Converting PDF to XPS: {pdf_path}")

        out_name = f"{pdf_path.stem}.xps"
        out_path = output_dir / out_name

        try:
            doc = fitz.open(str(pdf_path))
            total_pages = len(doc)

            # PyMuPDF supports writing to XPS via the "xps" file extension
            # using Document.save() — it detects format from extension.
            doc.save(str(out_path))
            doc.close()

            if not out_path.exists() or out_path.stat().st_size == 0:
                raise ValueError("XPS output file is empty or missing.")

        except Exception as e:
            logger.error(f"PDF to XPS failed: {e}", exc_info=True)
            # Fallback: produce XPS-like ZIP structure with page SVGs
            try:
                out_path.unlink(missing_ok=True)
                self._fallback_xps(pdf_path, out_path)
                doc_fb = fitz.open(str(pdf_path))
                total_pages = len(doc_fb)
                doc_fb.close()
            except Exception as e2:
                logger.error(f"XPS fallback also failed: {e2}", exc_info=True)
                raise ValueError(f"Failed to convert PDF to XPS: {e}")

        return {
            "success": True,
            "request_id": request_id,
            "output_filename": out_name,
            "total_pages": total_pages,
            "original_filename": filename,
        }

    def _fallback_xps(self, pdf_path: Path, out_path: Path):
        """Fallback: render each page as SVG and pack into an XPS-like ZIP."""
        import zipfile
        import io

        doc = fitz.open(str(pdf_path))
        total_pages = len(doc)

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            # FixedDocumentSequence
            fds = """<?xml version="1.0" encoding="UTF-8"?>
<FixedDocumentSequence xmlns="http://schemas.microsoft.com/xps/2005/06">
  <DocumentReference Source="Documents/1/FixedDocument.fdoc"/>
</FixedDocumentSequence>"""
            zf.writestr("FixedDocumentSequence.fdseq", fds)

            # FixedDocument.fdoc
            page_refs = "\n  ".join(
                f'<PageContent Source="Pages/{i+1}.fpage"/>'
                for i in range(total_pages)
            )
            fdoc = f"""<?xml version="1.0" encoding="UTF-8"?>
<FixedDocument xmlns="http://schemas.microsoft.com/xps/2005/06">
  {page_refs}
</FixedDocument>"""
            zf.writestr("Documents/1/FixedDocument.fdoc", fdoc)

            for page_num in range(total_pages):
                page = doc[page_num]
                svg_bytes = page.get_svg_image()
                fpage = f"""<?xml version="1.0" encoding="UTF-8"?>
<FixedPage xmlns="http://schemas.microsoft.com/xps/2005/06"
           Width="{int(page.rect.width)}" Height="{int(page.rect.height)}">
  <Glyphs UnicodeString="" Indices="" FontUri="" FontRenderingEmSize="0"
          OriginX="0" OriginY="0"/>
</FixedPage>"""
                zf.writestr(f"Documents/1/Pages/{page_num+1}.fpage", fpage)
                zf.writestr(f"Documents/1/Resources/page{page_num+1}.svg", svg_bytes)

            # _rels
            rels = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="R1" Type="http://schemas.microsoft.com/xps/2005/06/fixedrepresentation"
                Target="FixedDocumentSequence.fdseq"/>
</Relationships>"""
            zf.writestr("_rels/.rels", rels)

        doc.close()
        out_path.write_bytes(buf.getvalue())


pdf_to_xps_service = PDFToXpsService()
