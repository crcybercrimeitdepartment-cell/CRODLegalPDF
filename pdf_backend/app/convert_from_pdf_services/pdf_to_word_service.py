import logging
import shutil
from typing import Any, Dict
from pathlib import Path
from pdf2docx import Converter

from app.core.paths import Paths

logger = logging.getLogger(__name__)

class PDFToWordService:
    async def process(
        self,
        request_id: str,
        filename: str,
        config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Convert a PDF to a Word (.docx) file.
        """
        if config is None:
            config = {}
            
        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"File not found: {filename}")
            
        # Determine output filename
        safe_name = f"{pdf_path.stem}.docx"
        output_path = output_dir / safe_name
        
        logger.info(f"Converting PDF to Word: {pdf_path} -> {output_path}")
        
        try:
            # Perform conversion using pdf2docx
            cv = Converter(str(pdf_path))
            cv.convert(str(output_path), start=0, end=None)
            cv.close()
            
            if not output_path.exists():
                raise ValueError("Conversion succeeded but output file is missing.")
                
        except Exception as e:
            logger.error(f"Failed to convert PDF to Word: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to Word: {e}")
            
        return {
            "success": True,
            "request_id": request_id,
            "pdf_filename": safe_name,
            "original_filename": filename,
        }

pdf_to_word_service = PDFToWordService()
