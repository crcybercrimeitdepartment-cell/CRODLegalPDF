import logging
from pathlib import Path
from typing import Any, Dict
import fitz

from odf.opendocument import OpenDocumentPresentation
from odf.text import P
from odf.draw import Page, Frame, TextBox

from app.core.paths import Paths

logger = logging.getLogger(__name__)

class PDFToOdpService:
    async def process(self, request_id: str, filename: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"File not found: {filename}")

        logger.info(f"Converting PDF to ODP: {pdf_path}")

        try:
            doc = fitz.open(str(pdf_path))
            odp_doc = OpenDocumentPresentation()
            
            for page_num in range(len(doc)):
                pdf_page = doc[page_num]
                
                # Create a new slide/page
                slide = Page(masterpagename="Standard", name=f"Slide {page_num+1}")
                
                # Add text content
                text = pdf_page.get_text("text").strip()
                if not text:
                    text = "[No Text Found]"
                
                frame = Frame(width="24cm", height="16cm", x="2cm", y="2cm")
                textbox = TextBox()
                
                for line in text.split('\n')[:50]:  # Limit lines per slide just in case
                    p = P(text=line)
                    textbox.addElement(p)
                    
                frame.addElement(textbox)
                slide.addElement(frame)
                odp_doc.presentation.addElement(slide)

            doc.close()

            out_name = f"{pdf_path.stem}.odp"
            out_path = output_dir / out_name
            odp_doc.save(str(out_path))

            return {
                "success": True,
                "request_id": request_id,
                "original_filename": filename,
                "output_filename": out_name,
                "message": "Successfully converted PDF to ODP.",
                "download_url": f"/api/convert-from-pdf/pdf-to-odp/download/{request_id}/{out_name}",
                "view_url": f"/api/convert-from-pdf/pdf-to-odp/view/{request_id}/{out_name}",
            }
        except Exception as e:
            logger.error(f"Failed to convert PDF to ODP: {str(e)}")
            raise

pdf_to_odp_service = PDFToOdpService()
