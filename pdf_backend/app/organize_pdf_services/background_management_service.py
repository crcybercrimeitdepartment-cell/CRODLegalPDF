import logging
from pathlib import Path
from typing import Optional, Set, List
from io import BytesIO
import fitz
import uuid
import json
from pydantic import BaseModel
from PIL import Image as PILImage, ImageEnhance

from app.core.paths import Paths
from app.utils.filename import output_filename

logger = logging.getLogger(__name__)

class BackgroundServiceResponse(BaseModel):
    success: bool
    message: str
    request_id: Optional[str] = None
    filename: Optional[str] = None
    download_url: Optional[str] = None
    file_size: Optional[int] = None

class BackgroundManagementService:
    def __init__(self):
        pass

    def _hex_to_rgb(self, hex_color: str) -> tuple:
        hex_color = hex_color.lstrip('#')
        if not hex_color or len(hex_color) not in (3, 6):
            return (1, 1, 1) # Default white
        if len(hex_color) == 3:
            hex_color = ''.join(c + c for c in hex_color)
        return tuple(int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2, 4))

    def _parse_pages(self, pages_selection: str, total_pages: int) -> Set[int]:
        if not pages_selection or pages_selection.lower() == "all":
            return set(range(total_pages))
            
        if pages_selection.lower() == "odd":
            return set(i for i in range(total_pages) if i % 2 == 0)
            
        if pages_selection.lower() == "even":
            return set(i for i in range(total_pages) if i % 2 != 0)
            
        pages = set()
        parts = pages_selection.replace(' ', '').split(',')
        for part in parts:
            if not part:
                continue
            if '-' in part:
                try:
                    start_str, end_str = part.split('-')
                    start = max(0, int(start_str) - 1)
                    end = min(total_pages, int(end_str)) if end_str else total_pages
                    pages.update(range(start, end))
                except ValueError:
                    pass
            else:
                try:
                    page_idx = int(part) - 1
                    if 0 <= page_idx < total_pages:
                        pages.add(page_idx)
                except ValueError:
                    pass
        return pages

    def _remove_background(self, page: fitz.Page):
        """
        Heuristic to remove the background of a page by looking at drawings/images.
        Currently a simple clear of the lowest-level drawing if it matches page size.
        """
        # Since PyMuPDF doesn't allow easily deleting items from the content stream without
        # redact or rewriting the stream, a full background removal is complex.
        # But we can try to find and redact images that are full size.
        # For simplicity and given the scope, we will use a workaround or leave it as best-effort.
        # We can create a white rect to cover any existing background if replace is needed, 
        # but that would cover the text if the text is also part of it.
        # Note: True background removal requires parsing the PDF stream.
        # We will attempt to remove images that cover >90% of the page.
        rect = page.rect
        page_area = rect.width * rect.height
        
        image_list = page.get_images()
        for img in image_list:
            xref = img[0]
            # Get rects of the image on the page
            try:
                rects = page.get_image_rects(xref)
                for r in rects:
                    if (r.width * r.height) / page_area > 0.9:
                        page.delete_image(xref)
            except Exception:
                pass
                
        # For vector backgrounds (solid color rectangles), we can't easily delete them without clean_contents()
        # We will rely on inserting the new background which will go underneath if overlay=False,
        # but if there's already a white/colored background, the new one won't show.
        # So we use a trick: some PDFs have opaque backgrounds. We might just add the new one.
        pass

    async def process_background(
        self,
        input_pdf: Path,
        request_id: str,
        action: str, # "add", "remove"
        bg_type: str = "color", # "color", "image", "pdf"
        pages_selection: str = "all",
        color: str = "#FFFFFF",
        image_path: Optional[Path] = None,
        bg_pdf_path: Optional[Path] = None,
        opacity: float = 100.0,
        rotation: float = 0.0,
        scale: float = 1.0,
        fit_mode: str = "fill", # "fill", "fit", "stretch", "center"
        pos_x: float = 0.5,
        pos_y: float = 0.5,
        erase_areas_json: str = "[]"
    ) -> BackgroundServiceResponse:
        
        if not input_pdf.exists():
            raise ValueError(f"Input file not found: {input_pdf}")

        doc = fitz.open(str(input_pdf))
        if doc.needs_pass:
            doc.close()
            raise ValueError("Password-protected PDFs are not supported without password.")
            
        if doc.page_count == 0:
            doc.close()
            raise ValueError("Empty PDF provided.")
            
        pages_to_process = self._parse_pages(pages_selection, doc.page_count)

        erase_areas = []
        if erase_areas_json:
            try:
                erase_areas = json.loads(erase_areas_json)
            except Exception:
                pass

        
        # Load image bytes if needed
        image_bytes = None
        if action == "add" and bg_type == "image":
            if not image_path or not image_path.exists():
                raise ValueError("Background image not found.")
            try:
                with PILImage.open(image_path) as pil_img:
                    if pil_img.format not in ["PNG", "JPEG", "JPG"]:
                        pil_img = pil_img.convert("RGBA")
                    if opacity < 100.0:
                        if pil_img.mode != 'RGBA':
                            pil_img = pil_img.convert('RGBA')
                        alpha = pil_img.split()[3]
                        alpha = ImageEnhance.Brightness(alpha).enhance(opacity / 100.0)
                        pil_img.putalpha(alpha)
                    
                    if rotation != 0.0:
                        pil_img = pil_img.rotate(-rotation, expand=True, resample=PILImage.Resampling.BICUBIC)
                        
                    buf = BytesIO()
                    pil_img.save(buf, format="PNG")
                    image_bytes = buf.getvalue()
            except Exception as e:
                raise ValueError(f"Error processing image: {e}")

        bg_doc = None
        if action == "add" and bg_type == "pdf":
            if not bg_pdf_path or not bg_pdf_path.exists():
                raise ValueError("Background PDF not found.")
            bg_doc = fitz.open(str(bg_pdf_path))

        try:
            for page_num in range(doc.page_count):
                if page_num not in pages_to_process:
                    continue
                    
                page = doc[page_num]
                
                if action == "remove":
                    self._remove_background(page)
                    continue
                elif action == "erase":
                    if erase_areas:
                        rect = page.rect
                        for area in erase_areas:
                            try:
                                x0 = rect.x0 + area['x'] * rect.width
                                y0 = rect.y0 + area['y'] * rect.height
                                x1 = rect.x0 + (area['x'] + area['w']) * rect.width
                                y1 = rect.y0 + (area['y'] + area['h']) * rect.height
                                erase_rect = fitz.Rect(x0, y0, x1, y1)
                                page.add_redact_annot(erase_rect)
                            except KeyError:
                                pass
                        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_PIXELS)
                    continue


                # Add background
                rect = page.rect
                
                if bg_type == "color":
                    rgb = self._hex_to_rgb(color)
                    page.draw_rect(
                        rect, 
                        color=rgb, 
                        fill=rgb, 
                        overlay=False, 
                        fill_opacity=opacity/100.0
                    )
                elif bg_type == "image" and image_bytes:
                    page.insert_image(
                        rect, 
                        stream=image_bytes, 
                        overlay=False
                    )
                elif bg_type == "pdf" and bg_doc and bg_doc.page_count > 0:
                    page.show_pdf_page(
                        rect,
                        bg_doc,
                        0, # Just use the first page of the background PDF
                        overlay=False
                    )

            out_dir = Paths.request_output(request_id)
            out_filename = output_filename(input_pdf.name, "_background")
            out_path = out_dir / out_filename
            
            doc.save(str(out_path), garbage=4, deflate=True)
            doc.close()
            if bg_doc:
                bg_doc.close()
                
            return BackgroundServiceResponse(
                success=True,
                message="Background processed successfully",
                request_id=request_id,
                filename=out_filename,
                download_url=f"/api/pdf/download/{request_id}/{out_filename}",
                file_size=out_path.stat().st_size
            )
            
        except Exception as e:
            if doc:
                doc.close()
            if bg_doc:
                bg_doc.close()
            raise ValueError(f"Error processing background: {e}")

_background_management_service = BackgroundManagementService()
