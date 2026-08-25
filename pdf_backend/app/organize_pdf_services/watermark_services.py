import logging
from pathlib import Path
from typing import Optional, Set, Tuple
from io import BytesIO
import fitz
import json
from PIL import Image as PILImage, ImageEnhance
from pydantic import BaseModel

from app.core.paths import Paths
from app.utils.filename import output_filename

logger = logging.getLogger(__name__)

class WatermarkServiceResponse(BaseModel):
    success: bool
    message: str
    request_id: Optional[str] = None
    filename: Optional[str] = None
    download_url: Optional[str] = None
    file_size: Optional[int] = None

class AddWatermarkService:
    def __init__(self):
        self.preset_positions = {
            "Top Left", "Top Center", "Top Right",
            "Center Left", "Center", "Center Right",
            "Bottom Left", "Bottom Center", "Bottom Right"
        }

    async def add_watermark(
        self,
        input_pdf: Path,
        request_id: str,
        watermark_type: str,
        text: Optional[str] = None,
        font_family: str = "Helvetica",
        font_size: float = 36.0,
        font_color: str = "#000000",
        bold: bool = False,
        italic: bool = False,
        underline: bool = False,
        image_path: Optional[Path] = None,
        opacity: float = 100.0,
        rotation: float = 0.0,
        scale: float = 1.0,
        margin: float = 0.0,
        foreground: bool = True,
        x_pos: Optional[float] = None,
        y_pos: Optional[float] = None,
        preset_position: Optional[str] = "Center",
        pages_selection: str = "all",
        rules_json: Optional[str] = None,
        repeat_mode: str = "single",
        h_spacing: float = 50.0,
        v_spacing: float = 50.0
    ) -> WatermarkServiceResponse:
        """
        Add a text or image watermark to a PDF document with various customization options.
        """
        if isinstance(input_pdf, str):
            input_pdf = Path(input_pdf)
        if image_path and isinstance(image_path, str):
            image_path = Path(image_path)
            
        if not input_pdf.exists():
            raise FileNotFoundError("Uploaded PDF does not exist.")
            
        output_dir = Paths.request_output(request_id)
        out_name = output_filename(prefix="watermarked")
        out_path = output_dir / out_name
        
        opacity_ratio = max(0.0, min(100.0, opacity)) / 100.0
        
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
            if watermark_type == "text" and rules_json:
                try:
                    rules = json.loads(rules_json)
                except Exception as e:
                    raise ValueError(f"Invalid rules_json format: {e}")
            else:
                rules = [{"text": text, "pages": pages_selection}]
                
            image_bytes = None
            img_width, img_height = 0.0, 0.0
            
            if watermark_type == "image":
                if not image_path or not image_path.exists():
                    raise ValueError("Invalid watermark image or missing data.")
                try:
                    with PILImage.open(image_path) as pil_img:
                        if pil_img.format not in ["PNG", "JPEG", "JPG"]:
                            raise ValueError(f"Unsupported image format: {pil_img.format}")
                            
                        if opacity_ratio < 1.0:
                            if pil_img.mode != 'RGBA':
                                pil_img = pil_img.convert('RGBA')
                            alpha = pil_img.split()[3]
                            alpha = ImageEnhance.Brightness(alpha).enhance(opacity_ratio)
                            pil_img.putalpha(alpha)
                            
                        if scale != 1.0:
                            new_size = (int(pil_img.width * scale), int(pil_img.height * scale))
                            pil_img = pil_img.resize(new_size, PILImage.Resampling.LANCZOS)
                            
                        if rotation != 0.0:
                            pil_img = pil_img.rotate(-rotation, expand=True, resample=PILImage.Resampling.BICUBIC)
                            
                        img_width, img_height = float(pil_img.width), float(pil_img.height)
                        
                        buf = BytesIO()
                        pil_img.save(buf, format="PNG")
                        image_bytes = buf.getvalue()
                except Exception as e:
                    raise ValueError(f"Error processing watermark image: {str(e)}")
            elif watermark_type == "text":
                pass
            else:
                raise ValueError("Watermark type must be 'text' or 'image'.")


            for rule in rules:
                rule_text = rule.get("text", text) if watermark_type == "text" else None
                rule_pages_sel = rule.get("pages", pages_selection)
                pages_to_watermark = self._parse_pages(rule_pages_sel, doc.page_count)
                
                if watermark_type == "text" and not rule_text:
                    continue
                    
                # Extract rule-specific styles or fallback to globals
                rule_font_color = rule.get("color", font_color)
                rule_rgb_color = self._hex_to_rgb(rule_font_color)
                rule_font_family = rule.get("fontFamily", font_family)
                rule_bold = rule.get("bold", bold)
                rule_italic = rule.get("italic", italic)
                rule_font_name = self._get_fitz_font(rule_font_family, rule_bold, rule_italic)
                rule_font_size = rule.get("fontSize", font_size)
                
                rule_opacity = rule.get("opacity", opacity)
                rule_opacity_ratio = max(0.0, min(100.0, rule_opacity)) / 100.0
                
                rule_rotation = rule.get("rotation", rotation)
                
                rule_is_custom = rule.get("isCustomLoc", False)
                rule_x = rule.get("x", 0.5)
                rule_y = rule.get("y", 0.5)
                
                for page_num in range(doc.page_count):
                    if page_num not in pages_to_watermark:
                        continue
                        
                    page = doc[page_num]
                    page_rect = page.rect
                    
                    if watermark_type == "text":
                        tw = fitz.get_text_length(rule_text, fontname=rule_font_name, fontsize=rule_font_size * scale)
                        th = rule_font_size * scale
                        w_width, w_height = tw, th
                    else:
                        w_width, w_height = img_width, img_height

                    positions = []
                    if repeat_mode == "tiled":
                        curr_y = margin
                        while curr_y + w_height <= page_rect.height - margin:
                            curr_x = margin
                            while curr_x + w_width <= page_rect.width - margin:
                                positions.append((curr_x, curr_y))
                                curr_x += w_width + h_spacing
                            curr_y += w_height + v_spacing
                    else:
                        if rule_is_custom:
                            # rule_x and rule_y are percentages from the frontend, but the frontend calculates them from center.
                            # The frontend drag logic is: rule_x is center x relative to width.
                            # x_pos expects top-left x in points.
                            # leftPts = (rule_x * width) - (w_width / 2)
                            calc_x = (rule_x * page_rect.width) - (w_width / 2)
                            calc_y = (rule_y * page_rect.height) - (w_height / 2)
                            positions.append((calc_x, calc_y))
                        elif x_pos is not None and y_pos is not None:
                            positions.append((x_pos, y_pos))
                        else:
                            positions.append(self._get_preset_position(
                                preset_position, page_rect.width, page_rect.height, 
                                w_width, w_height, margin
                            ))

                    for x, y in positions:
                        if watermark_type == "text":
                            point = fitz.Point(x, y + w_height * 0.8)
                            center = fitz.Point(x + w_width / 2, y + w_height / 2)
                            page.insert_text(
                                point,
                                rule_text,
                                fontname=rule_font_name,
                                fontsize=rule_font_size * scale,
                                color=rule_rgb_color,
                                fill_opacity=rule_opacity_ratio,
                                morph=(center, fitz.Matrix(-rule_rotation)),
                                overlay=foreground
                            )
                        else:
                            rect = fitz.Rect(x, y, x + w_width, y + w_height)
                            page.insert_image(
                                rect,
                                stream=image_bytes,
                                overlay=foreground
                            )
            doc.save(str(out_path), garbage=4, deflate=True)
            doc.close()
            
            final_size = out_path.stat().st_size
            
            return WatermarkServiceResponse(
                success=True,
                message="Watermark added successfully.",
                request_id=request_id,
                filename=out_name,
                download_url=f"/api/pdf/download/{request_id}/{out_name}",
                file_size=final_size
            )
            
        except ValueError as ve:
            if 'doc' in locals() and not doc.is_closed:
                doc.close()
            raise ve
        except Exception as e:
            if 'doc' in locals() and not doc.is_closed:
                doc.close()
            logger.exception("Error adding watermark")
            raise RuntimeError(f"Internal processing error: {str(e)}")

    def _get_preset_position(self, preset: Optional[str], pw: float, ph: float, ww: float, wh: float, m: float) -> Tuple[float, float]:
        preset = preset or "Center"
        
        x_center = (pw - ww) / 2.0
        y_center = (ph - wh) / 2.0
        
        x_right = pw - ww - m
        y_bottom = ph - wh - m
        x_left = m
        y_top = m
        
        if preset == "Top Left": return (x_left, y_top)
        if preset == "Top Center": return (x_center, y_top)
        if preset == "Top Right": return (x_right, y_top)
        if preset == "Center Left": return (x_left, y_center)
        if preset == "Center": return (x_center, y_center)
        if preset == "Center Right": return (x_right, y_center)
        if preset == "Bottom Left": return (x_left, y_bottom)
        if preset == "Bottom Center": return (x_center, y_bottom)
        if preset == "Bottom Right": return (x_right, y_bottom)
        
        return (x_center, y_center)
        
    def _parse_pages(self, selection: str, total: int) -> Set[int]:
        if not selection or selection.lower() == "all":
            return set(range(total))
            
        selection = selection.lower()
        if selection == "first page":
            return {0}
        if selection == "last page":
            return {total - 1}
        if selection == "odd pages":
            return set(i for i in range(total) if i % 2 == 0)
        if selection == "even pages":
            return set(i for i in range(total) if i % 2 == 1)
            
        result = set()
        for part in selection.split(","):
            part = part.strip()
            if not part: continue
            if "-" in part:
                try:
                    start_str, end_str = part.split("-", 1)
                    start = int(start_str.strip())
                    end = int(end_str.strip())
                    for i in range(start - 1, end):
                        if 0 <= i < total:
                            result.add(i)
                except ValueError:
                    raise ValueError(f"Invalid page range: {part}")
            else:
                try:
                    val = int(part) - 1
                    if 0 <= val < total:
                        result.add(val)
                except ValueError:
                    raise ValueError(f"Invalid page number: {part}")
        
        if not result:
            raise ValueError("No valid pages selected for watermarking.")
            
        return result

    def _hex_to_rgb(self, hex_color: str) -> Tuple[float, float, float]:
        hex_color = hex_color.lstrip('#')
        if len(hex_color) == 6:
            return (
                int(hex_color[0:2], 16) / 255.0,
                int(hex_color[2:4], 16) / 255.0,
                int(hex_color[4:6], 16) / 255.0
            )
        return (0.0, 0.0, 0.0)
        
    def _get_fitz_font(self, font_family: str, bold: bool, italic: bool) -> str:
        base = "helv"
        fam = font_family.lower()
        if "times" in fam: base = "tiro"
        elif "courier" in fam: base = "cour"
        elif "symbol" in fam: return "symb"
        elif "zapf" in fam: return "zadb"
        
        if base == "tiro":
            if bold and italic: return "tibi"
            if bold: return "tibo"
            if italic: return "tiit"
            return "tiro"
        elif base == "cour":
            if bold and italic: return "cobi"
            if bold: return "cobo"
            if italic: return "coit"
            return "cour"
        else:
            if bold and italic: return "hebi"
            if bold: return "hebo"
            if italic: return "heit"
            return "helv"
