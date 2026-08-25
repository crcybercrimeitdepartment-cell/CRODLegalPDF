import logging
import time
from pathlib import Path
from typing import Optional, List
import fitz
from pydantic import BaseModel

from app.core.paths import Paths
from app.utils.filename import output_filename

logger = logging.getLogger(__name__)

class CropPDFResponse(BaseModel):
    success: bool
    message: str
    request_id: Optional[str] = None
    filename: Optional[str] = None
    download_url: Optional[str] = None
    file_size: Optional[int] = None
    processing_time: Optional[float] = None
    total_pages: Optional[int] = None
    processed_pages: Optional[int] = None

class CropPDFService:
    def __init__(self):
        pass

    async def crop_pdf(
        self,
        input_pdf: Path,
        request_id: str,
        mode: str = "manual",  # "manual", "auto_margin", "reset"
        left: float = 0.0,
        top: float = 0.0,
        right: float = 0.0,
        bottom: float = 0.0,
        pages_selection: str = "all",
    ) -> CropPDFResponse:
        """
        Crop PDF pages by updating the CropBox.
        Supports manual cropping, automatic margin removal, and resetting the crop.
        """
        start_time = time.time()
        logger.info(f"Crop Started for request_id: {request_id}")
        
        if isinstance(input_pdf, str):
            input_pdf = Path(input_pdf)
            
        logger.info("Validation Started")
        if not input_pdf.exists():
            raise FileNotFoundError("Uploaded PDF does not exist.")
            
        output_dir = Paths.request_output(request_id)
        out_name = output_filename(prefix="cropped")
        out_path = output_dir / out_name
        
        try:
            doc = fitz.open(str(input_pdf))
        except Exception as e:
            logger.error(f"Validation Completed: Corrupted or invalid PDF: {str(e)}")
            raise ValueError(f"Corrupted or invalid PDF: {str(e)}")
            
        if doc.needs_pass:
            doc.close()
            logger.error("Validation Completed: Password-protected PDF")
            raise ValueError("Password-protected PDFs are not supported without password.")
            
        if doc.page_count == 0:
            doc.close()
            logger.error("Validation Completed: Empty PDF")
            raise ValueError("Empty PDF provided.")
            
        logger.info("Validation Completed")
        
        try:
            pages_to_process = self._parse_pages(pages_selection, doc.page_count)
            if not pages_to_process:
                raise ValueError("No valid pages selected for cropping.")
                
            mode = mode.lower().strip()
            if mode not in ("manual", "auto_margin", "reset"):
                raise ValueError("Invalid crop mode. Must be 'manual', 'auto_margin', or 'reset'.")
                
            processed_count = 0
            
            for pno in pages_to_process:
                logger.info(f"Current Page Processing: {pno + 1}")
                page = doc[pno]
                
                if mode == "reset":
                    page.set_cropbox(page.mediabox)
                    processed_count += 1
                    
                elif mode == "manual":
                    # Ensure coordinates form a valid rectangle
                    # Standard fitz coordinates: top-left is (0,0)
                    r = fitz.Rect(left, top, right, bottom)
                    if r.is_valid and r.width > 0 and r.height > 0:
                        # Ensure crop box doesn't exceed media box
                        r &= page.mediabox
                        page.set_cropbox(r)
                        processed_count += 1
                    else:
                        logger.warning(f"Invalid crop coordinates for page {pno + 1}: {r}")
                        
                elif mode == "auto_margin":
                    # Determine content bounding box
                    blocks = page.get_text("blocks")
                    content_rect = fitz.Rect()
                    for b in blocks:
                        content_rect |= fitz.Rect(b[:4])
                    
                    for img in page.get_image_info():
                        content_rect |= fitz.Rect(img["bbox"])
                        
                    if content_rect.is_valid and content_rect.width > 0 and content_rect.height > 0:
                        # Add a small 2-point padding, bounded by mediabox
                        content_rect = content_rect + fitz.Rect(-2, -2, 2, 2)
                        content_rect &= page.mediabox
                        page.set_cropbox(content_rect)
                        processed_count += 1
                    else:
                        logger.warning(f"No content found for auto margin on page {pno + 1}")
            
            logger.info("Crop Completed")
            # Save the modified document. Use garbage=4 and deflate=True to optimize size
            doc.save(str(out_path), garbage=4, deflate=True)
            total_pages = doc.page_count
            doc.close()
            logger.info("Output Generated")
            
            final_size = out_path.stat().st_size
            processing_time = round(time.time() - start_time, 2)
            
            logger.info(f"Cleanup Completed. Total time: {processing_time}s")
            
            return CropPDFResponse(
                success=True,
                message=f"Successfully processed {processed_count} pages using '{mode}' mode.",
                request_id=request_id,
                filename=out_name,
                download_url=f"/api/pdf/download/{request_id}/{out_name}",
                file_size=final_size,
                processing_time=processing_time,
                total_pages=total_pages,
                processed_pages=processed_count
            )
            
        except Exception as e:
            doc.close()
            logger.error(f"Errors during crop processing: {str(e)}")
            raise ValueError(f"Failed to crop PDF: {str(e)}")

    def _parse_pages(self, selection: str, total_pages: int) -> List[int]:
        """
        Helper method to parse page selections like 'all', '1-5', 'odd', 'even', '1,3,5'
        Returns a sorted list of 0-indexed page numbers.
        """
        selection = selection.lower().strip()
        if not selection or selection == 'all':
            return list(range(total_pages))
            
        pages = set()
        parts = [p.strip() for p in selection.split(',') if p.strip()]
        for part in parts:
            if part == 'odd':
                pages.update(range(0, total_pages, 2))
            elif part == 'even':
                pages.update(range(1, total_pages, 2))
            elif '-' in part:
                try:
                    start_str, end_str = part.split('-')
                    start = int(start_str) if start_str else 1
                    end = int(end_str) if end_str else total_pages
                    start = max(1, min(start, total_pages))
                    end = max(1, min(end, total_pages))
                    if start <= end:
                        pages.update(range(start - 1, end))
                    else:
                        pages.update(range(end - 1, start))
                except ValueError:
                    pass
            else:
                try:
                    num = int(part)
                    if 1 <= num <= total_pages:
                        pages.add(num - 1)
                except ValueError:
                    pass
        if not pages:
            return list(range(total_pages))
        
        return sorted(list(pages))
