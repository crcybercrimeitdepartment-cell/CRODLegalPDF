import logging
import io
import zipfile
from pathlib import Path
from typing import Optional, List
import fitz
from pydantic import BaseModel
from PIL import Image

from app.core.paths import Paths
from app.utils.filename import output_filename

logger = logging.getLogger(__name__)

class PDFToImageResponse(BaseModel):
    success: bool
    message: str
    request_id: Optional[str] = None
    filename: Optional[str] = None
    download_url: Optional[str] = None
    file_size: Optional[int] = None
    total_pages_converted: Optional[int] = None

class PDFToImageCollectionService:
    def __init__(self):
        pass

    async def convert_to_images(
        self,
        input_pdf: Path,
        request_id: str,
        output_format: str = "jpg",
        dpi: int = 150,
        quality: str = "High",
        pages_selection: str = "all",
    ) -> PDFToImageResponse:
        """
        Convert PDF pages to an image collection (ZIP).
        """
        if isinstance(input_pdf, str):
            input_pdf = Path(input_pdf)
            
        if not input_pdf.exists():
            raise FileNotFoundError("Uploaded PDF does not exist.")
            
        output_dir = Paths.request_output(request_id)
        out_name = output_filename(prefix="images", extension=".zip")
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
            pages_to_convert = self._parse_pages(pages_selection, doc.page_count)
            if not pages_to_convert:
                raise ValueError("No valid pages selected for conversion.")
                
            fmt = output_format.lower().strip()
            if fmt == 'jpeg': fmt = 'jpg'
            if fmt not in ('jpg', 'png', 'webp', 'tiff'):
                raise ValueError(f"Unsupported output format: {fmt}")
                
            pil_format = "JPEG" if fmt == "jpg" else fmt.upper()
            
            quality_val = 95
            q_str = quality.lower()
            if q_str == "low": quality_val = 50
            elif q_str == "medium": quality_val = 75
            elif q_str == "high": quality_val = 95
            elif q_str == "original": quality_val = 100
            
            converted_count = 0
            
            with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for idx, pno in enumerate(pages_to_convert):
                    page = doc[pno]
                    
                    # Get pixmap
                    pix = page.get_pixmap(dpi=dpi, alpha=(fmt in ('png', 'webp', 'tiff')))
                    
                    # Convert to PIL for format flexibility and quality control
                    mode = "RGBA" if pix.alpha else "RGB"
                    img = Image.frombytes(mode, [pix.width, pix.height], pix.samples)
                    
                    if pil_format == "JPEG" and img.mode in ("RGBA", "P"):
                        # JPEG doesn't support alpha
                        # Create white background
                        bg = Image.new("RGB", img.size, (255, 255, 255))
                        if img.mode == "RGBA":
                            bg.paste(img, mask=img.split()[3])
                        else:
                            bg.paste(img)
                        img = bg
                        
                    buf = io.BytesIO()
                    
                    # Save to memory buffer
                    save_kwargs = {}
                    if pil_format in ("JPEG", "WEBP"):
                        save_kwargs["quality"] = quality_val
                    
                    img.save(buf, format=pil_format, **save_kwargs)
                    
                    # Add to zip
                    filename = f"page_{pno + 1:03d}.{fmt}"
                    zf.writestr(filename, buf.getvalue())
                    converted_count += 1
            
            doc.close()
            final_size = out_path.stat().st_size
            
            return PDFToImageResponse(
                success=True,
                message=f"Successfully converted {converted_count} pages to {fmt.upper()}.",
                request_id=request_id,
                filename=out_name,
                download_url=f"/api/pdf/download/{request_id}/{out_name}",
                file_size=final_size,
                total_pages_converted=converted_count
            )
            
        except Exception as e:
            doc.close()
            raise ValueError(f"Failed to convert PDF to images: {str(e)}")

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
        
        return sorted(list(pages))