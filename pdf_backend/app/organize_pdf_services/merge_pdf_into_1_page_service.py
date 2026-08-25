import logging
from pathlib import Path
from typing import Optional, Set, List
import fitz
from pydantic import BaseModel

from app.core.paths import Paths
from app.utils.filename import output_filename

logger = logging.getLogger(__name__)

class MergeContinuousResponse(BaseModel):
    success: bool
    message: str
    request_id: Optional[str] = None
    filename: Optional[str] = None
    download_url: Optional[str] = None
    file_size: Optional[int] = None

class MergeContinuousService:
    def __init__(self):
        pass

    async def merge_continuous(
        self,
        input_pdf: Path,
        request_id: str,
        direction: str = "vertical",
        remove_gaps: bool = False,
        pages_selection: str = "all",
    ) -> MergeContinuousResponse:
        """
        Merge multiple pages into a single continuous PDF page.
        """
        if isinstance(input_pdf, str):
            input_pdf = Path(input_pdf)
            
        if not input_pdf.exists():
            raise FileNotFoundError("Uploaded PDF does not exist.")
            
        output_dir = Paths.request_output(request_id)
        out_name = output_filename(prefix="continuous")
        out_path = output_dir / out_name
        
        try:
            doc = fitz.open(str(input_pdf))
        except Exception as e:
            raise ValueError(f"Corrupted or invalid PDF: {str(e)}")
            
        if doc.needs_pass:
            doc.close()
            raise ValueError("Password-protected PDFs are not supported without password.")
            
        if doc.page_count == 0:
            doc.close()
            raise ValueError("Empty PDF provided.")
            
        try:
            pages_to_merge = self._parse_pages(pages_selection, doc.page_count)
            if not pages_to_merge:
                raise ValueError("No valid pages selected for merging.")

            out_doc = fitz.open()
            
            # First pass: calculate total dimensions and individual clip rects
            page_infos = []
            total_w = 0.0
            total_h = 0.0
            max_w = 0.0
            max_h = 0.0
            
            for pno in pages_to_merge:
                page = doc[pno]
                clip_rect = page.rect
                
                if remove_gaps:
                    # Attempt to find content bounding box to trim margins
                    blocks = page.get_text("blocks")
                    r = fitz.Rect()
                    for b in blocks:
                        r |= fitz.Rect(b[:4])
                    for img in page.get_image_info():
                        r |= fitz.Rect(img["bbox"])
                    # Add a small 5px padding if valid, else fallback to full page
                    if r.is_valid and r.width > 0 and r.height > 0:
                        clip_rect = r + fitz.Rect(-5, -5, 5, 5)
                        clip_rect &= page.rect # ensure we don't go out of bounds
                
                page_infos.append({
                    "pno": pno,
                    "clip": clip_rect,
                    "w": clip_rect.width,
                    "h": clip_rect.height
                })
                
                if direction == "vertical":
                    total_h += clip_rect.height
                    max_w = max(max_w, clip_rect.width)
                else:
                    total_w += clip_rect.width
                    max_h = max(max_h, clip_rect.height)
            
            final_width = max_w if direction == "vertical" else total_w
            final_height = total_h if direction == "vertical" else max_h
            
            # Avoid exceeding fitz limits (approx 14,400 points, but some viewers support more)
            # We'll just create the page
            out_page = out_doc.new_page(width=final_width, height=final_height)
            
            # Second pass: draw pages onto the single canvas
            curr_x = 0.0
            curr_y = 0.0
            
            for info in page_infos:
                clip = info["clip"]
                w = info["w"]
                h = info["h"]
                
                if direction == "vertical":
                    # Center horizontally
                    x_offset = (final_width - w) / 2
                    target_rect = fitz.Rect(x_offset, curr_y, x_offset + w, curr_y + h)
                    out_page.show_pdf_page(target_rect, doc, info["pno"], clip=clip, keep_proportion=True)
                    curr_y += h
                else:
                    # Center vertically
                    y_offset = (final_height - h) / 2
                    target_rect = fitz.Rect(curr_x, y_offset, curr_x + w, y_offset + h)
                    out_page.show_pdf_page(target_rect, doc, info["pno"], clip=clip, keep_proportion=True)
                    curr_x += w
                        
            out_doc.save(str(out_path), garbage=4, deflate=True)
            out_doc.close()
            doc.close()
            
            final_size = out_path.stat().st_size
            
            return MergeContinuousResponse(
                success=True,
                message="PDFs merged into a single continuous page successfully.",
                request_id=request_id,
                filename=out_name,
                download_url=f"/api/pdf/download/{request_id}/{out_name}",
                file_size=final_size
            )
            
        except Exception as e:
            doc.close()
            raise ValueError(f"Failed to merge into continuous page: {str(e)}")

    def _parse_pages(self, selection: str, total_pages: int) -> List[int]:
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
        
        # Sort to maintain logical order, but actually some might want custom order
        # For this simplicity, we'll sort them.
        return sorted(list(pages))