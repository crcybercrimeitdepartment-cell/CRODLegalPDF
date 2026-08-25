import logging
from pathlib import Path
from typing import Any, Dict
import fitz

from odf.opendocument import OpenDocumentText
from odf.text import P
from odf.style import Style, TextProperties

from app.core.paths import Paths

logger = logging.getLogger(__name__)

class PDFToOdtService:
    async def process(self, request_id: str, filename: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"File not found: {filename}")

        logger.info(f"Converting PDF to ODT: {pdf_path}")

        try:
            doc = fitz.open(str(pdf_path))
            odt_doc = OpenDocumentText()
            
            # Basic style
            s = odt_doc.styles
            text_style = Style(name="MyText", family="paragraph")
            text_style.addElement(TextProperties(fontfamily="Arial", fontsize="12pt"))
            s.addElement(text_style)

            for page_num in range(len(doc)):
                page = doc[page_num]
                blocks = page.get_text("blocks")
                
                # Sort blocks top-to-bottom, left-to-right
                blocks.sort(key=lambda b: (b[1], b[0]))
                
                # Page divider
                if page_num > 0:
                    divider = P(text="--- Page Break ---", stylename=text_style)
                    odt_doc.text.addElement(divider)
                
                for block in blocks:
                    # Text blocks are type 0
                    if block[-1] == 0:
                        text = block[4].strip()
                        if text:
                            for line in text.split('\n'):
                                p = P(text=line, stylename=text_style)
                                odt_doc.text.addElement(p)

            doc.close()

            out_name = f"{pdf_path.stem}.odt"
            out_path = output_dir / out_name
            odt_doc.save(str(out_path))

            return {
                "success": True,
                "request_id": request_id,
                "original_filename": filename,
                "output_filename": out_name,
                "message": "Successfully converted PDF to ODT.",
                "download_url": f"/api/convert-from-pdf/pdf-to-odt/download/{request_id}/{out_name}",
                "view_url": f"/api/convert-from-pdf/pdf-to-odt/view/{request_id}/{out_name}",
            }
        except Exception as e:
            logger.error(f"Failed to convert PDF to ODT: {str(e)}")
            raise

pdf_to_odt_service = PDFToOdtService()
