import logging
from pathlib import Path
from typing import Optional, Set, Tuple
import fitz
from pydantic import BaseModel

from app.core.paths import Paths
from app.utils.filename import output_filename

logger = logging.getLogger(__name__)

class PageNumberServiceResponse(BaseModel):
    success: bool
    message: str
    request_id: Optional[str] = None
    filename: Optional[str] = None
    download_url: Optional[str] = None
    file_size: Optional[int] = None

class AddPageNumberService:
    def __init__(self):
        pass

    async def add_page_numbers(
        self,
        input_pdf: Path,
        request_id: str,
        page_mode: str = "single",  # "single" or "facing"
        format_text: str = "{n}",
        start_number: int = 1,
        font_family: str = "Helvetica",
        font_size: float = 14.0,
        font_color: str = "#000000",
        bold: bool = False,
        italic: bool = False,
        underline: bool = False,
        preset_position: str = "Bottom Right",
        margin_type: str = "Recommended",
        pages_selection: str = "all",
    ) -> PageNumberServiceResponse:
        """
        Add page numbers to a PDF document.
        """
        if isinstance(input_pdf, str):
            input_pdf = Path(input_pdf)
            
        if not input_pdf.exists():
            raise FileNotFoundError("Uploaded PDF does not exist.")
            
        output_dir = Paths.request_output(request_id)
        out_name = output_filename(prefix="numbered")
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
            pages_to_number = self._parse_pages(pages_selection, doc.page_count)
            rgb_color = self._hex_to_rgb(font_color)
            font_name = self._get_fitz_font(font_family, bold, italic)
            
            total_pages = doc.page_count
            current_num = start_number
            
            for page_num in range(total_pages):
                if page_num not in pages_to_number:
                    continue
                    
                page = doc[page_num]
                page_rect = page.rect
                
                # Format the text
                text_to_draw = format_text.replace("{n}", str(current_num)).replace("{m}", str(total_pages))
                
                # Calculate size
                tw = fitz.get_text_length(text_to_draw, fontname=font_name, fontsize=font_size)
                th = font_size
                
                # Margin logic
                mt = margin_type.lower()
                margin_val = 30.0
                if mt == "small": margin_val = 15.0
                elif mt == "big": margin_val = 50.0

                # Facing pages logic (flip left/right on even pages - 0-indexed odd index)
                actual_preset = preset_position
                if page_mode.lower() == "facing" and page_num % 2 != 0:
                    if "left" in actual_preset.lower():
                        actual_preset = actual_preset.lower().replace("left", "right")
                    elif "right" in actual_preset.lower():
                        actual_preset = actual_preset.lower().replace("right", "left")

                # Calculate position
                x, y = self._get_preset_coordinates(actual_preset, page_rect.width, page_rect.height, tw, th, margin_val)
                
                p = fitz.Point(x, y)
                page.insert_text(
                    p,
                    text_to_draw,
                    fontname=font_name,
                    fontsize=font_size,
                    color=rgb_color,
                )
                
                # Add underline if needed
                if underline:
                    p1 = fitz.Point(x, y + 2)
                    p2 = fitz.Point(x + tw, y + 2)
                    page.draw_line(p1, p2, color=rgb_color, width=1.0)
                
                current_num += 1
                        
            doc.save(str(out_path), garbage=4, deflate=True)
            doc.close()
            
            final_size = out_path.stat().st_size
            
            return PageNumberServiceResponse(
                success=True,
                message="Page numbers added successfully.",
                request_id=request_id,
                filename=out_name,
                download_url=f"/api/pdf/download/{request_id}/{out_name}",
                file_size=final_size
            )
            
        except Exception as e:
            doc.close()
            raise ValueError(f"Failed to add page numbers: {str(e)}")

    def _parse_pages(self, selection: str, total_pages: int) -> Set[int]:
        selection = selection.lower().strip()
        if not selection or selection == 'all':
            return set(range(total_pages))
            
        pages = set()
        parts = [p.strip() for p in selection.split(',') if p.strip()]
        for part in parts:
            if '-' in part:
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
            return set(range(total_pages))
        return pages

    def _get_preset_coordinates(self, preset: str, p_w: float, p_h: float, w_w: float, w_h: float, margin: float) -> Tuple[float, float]:
        preset = preset.lower()
        if preset == "top left":
            return margin, margin + w_h
        elif preset == "top center":
            return (p_w - w_w) / 2, margin + w_h
        elif preset == "top right":
            return p_w - w_w - margin, margin + w_h
        elif preset == "bottom left":
            return margin, p_h - margin
        elif preset == "bottom center":
            return (p_w - w_w) / 2, p_h - margin
        elif preset == "bottom right":
            return p_w - w_w - margin, p_h - margin
        # Default fallback
        return p_w - w_w - margin, p_h - margin

    def _hex_to_rgb(self, hex_color: str) -> Tuple[float, float, float]:
        hex_color = hex_color.lstrip('#')
        if len(hex_color) == 3:
            hex_color = ''.join(c + c for c in hex_color)
        if len(hex_color) != 6:
            return (0.0, 0.0, 0.0)
        try:
            return (
                int(hex_color[0:2], 16) / 255.0,
                int(hex_color[2:4], 16) / 255.0,
                int(hex_color[4:6], 16) / 255.0
            )
        except ValueError:
            return (0.0, 0.0, 0.0)

    def _get_fitz_font(self, font_family: str, bold: bool, italic: bool) -> str:
        ff = font_family.lower()
        if "helvetica" in ff or "sans" in ff or "arial" in ff or "trebuchet" in ff or "verdana" in ff:
            if bold and italic: return "helvbo"
            if bold: return "helv" 
            if italic: return "helvo"
            return "helv"
        elif "times" in ff or "serif" in ff or "georgia" in ff:
            if bold and italic: return "timbi"
            if bold: return "timb"
            if italic: return "timi"
            return "tiro"
        elif "courier" in ff or "mono" in ff:
            if bold and italic: return "cob"
            if bold: return "cob"
            if italic: return "coo"
            return "cour"
        elif "comic" in ff:
            return "helv" # Fallback as fitz doesn't bundle comic sans natively
        return "helv"