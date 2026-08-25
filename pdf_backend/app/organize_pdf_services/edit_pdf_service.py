"""
Service for applying visual edits (text, images, shapes) to a PDF using PyMuPDF.
"""

from __future__ import annotations

import base64
import json
import logging
from pathlib import Path
from typing import Dict, Any

import fitz  # PyMuPDF

from app.core.paths import Paths
from app.utils.filename import output_filename

logger = logging.getLogger(__name__)


def parse_color(color_str: str) -> tuple[float, float, float]:
    """Parse rgb(r, g, b) or #hex into PyMuPDF color tuple (0-1)."""
    if not color_str or color_str == 'transparent':
        return None
    
    if color_str.startswith('rgb'):
        try:
            parts = color_str.replace('rgba', '').replace('rgb', '').replace('(', '').replace(')', '').split(',')
            return (float(parts[0])/255, float(parts[1])/255, float(parts[2])/255)
        except:
            return (0, 0, 0)
    elif color_str.startswith('#'):
        try:
            color_str = color_str.lstrip('#')
            if len(color_str) == 3:
                color_str = ''.join(c + c for c in color_str)
            return (int(color_str[0:2], 16)/255, int(color_str[2:4], 16)/255, int(color_str[4:6], 16)/255)
        except:
            return (0, 0, 0)
    return (0, 0, 0)


class EditPDFService:
    """Service to apply text, image, and drawing edits to a PDF."""

    async def apply_edits(
        self,
        input_pdf: Path,
        edits_json_str: str,
        request_id: str
    ) -> dict:
        """
        Apply visual edits from JSON to the PDF document.
        """
        output_dir = Paths.request_output(request_id)
        out_name = output_filename(prefix="edited")
        out_path = output_dir / out_name

        try:
            doc = fitz.open(str(input_pdf))
            if doc.is_encrypted:
                raise ValueError("Cannot edit password-protected PDF. Please unlock it first.")
        except Exception as e:
            raise ValueError(f"Invalid or corrupted PDF file: {str(e)}")

        try:
            edits_data = json.loads(edits_json_str)
        except Exception as e:
            doc.close()
            raise ValueError(f"Invalid edits payload: {str(e)}")

        # Process each page
        for page_num_str, objects in edits_data.items():
            try:
                page_idx = int(page_num_str) - 1
                if page_idx < 0 or page_idx >= len(doc):
                    continue
                
                page = doc[page_idx]

                def process_objects(objects_list, parent_left=0, parent_top=0, parent_scaleX=1, parent_scaleY=1, parent_opacity=1):
                    for obj in objects_list:
                        obj_type = obj.get("type", "")
                        
                        # Handle recursive groups
                        if obj_type == 'group':
                            # Fabric groups have their own left/top which act as center for children in some versions, 
                            # but usually children are relative to group center
                            g_left = float(obj.get("left", 0)) + parent_left
                            g_top = float(obj.get("top", 0)) + parent_top
                            g_scaleX = float(obj.get("scaleX", 1)) * parent_scaleX
                            g_scaleY = float(obj.get("scaleY", 1)) * parent_scaleY
                            g_opacity = float(obj.get("opacity", 1)) * parent_opacity
                            
                            # Fabric children coordinates are relative to group center
                            # We will approximate this by adjusting parent coordinates
                            # A proper fabric group parse is complex, but this handles basic cases
                            g_width = float(obj.get("width", 0)) * g_scaleX
                            g_height = float(obj.get("height", 0)) * g_scaleY
                            
                            center_x = g_left + g_width/2
                            center_y = g_top + g_height/2
                            
                            process_objects(
                                obj.get("objects", []), 
                                parent_left=center_x, 
                                parent_top=center_y, 
                                parent_scaleX=g_scaleX, 
                                parent_scaleY=g_scaleY,
                                parent_opacity=g_opacity
                            )
                            continue

                        # Compute coordinates
                        left = (float(obj.get("left", 0)) * parent_scaleX) + parent_left
                        top = (float(obj.get("top", 0)) * parent_scaleY) + parent_top
                        width = float(obj.get("width", 0)) * float(obj.get("scaleX", 1)) * parent_scaleX
                        height = float(obj.get("height", 0)) * float(obj.get("scaleY", 1)) * parent_scaleY
                        opacity = float(obj.get("opacity", 1)) * parent_opacity
                        
                        rect = fitz.Rect(left, top, left + width, top + height)
                        
                        fill_color = parse_color(obj.get("fill"))
                        stroke_color = parse_color(obj.get("stroke"))
                        stroke_width = float(obj.get("strokeWidth", 1)) * parent_scaleX

                        if obj_type in ('i-text', 'text', 'textbox'):
                            text = obj.get("text", "")
                            font_size = float(obj.get("fontSize", 16)) * float(obj.get("scaleY", 1)) * parent_scaleY
                            color = parse_color(obj.get("fill"))
                            
                            fontname = "helv"
                            if obj.get("fontWeight") == "bold" and obj.get("fontStyle") == "italic":
                                fontname = "hebo"
                            elif obj.get("fontWeight") == "bold":
                                fontname = "helb"
                            elif obj.get("fontStyle") == "italic":
                                fontname = "heli"

                            # PyMuPDF insert_textbox is extremely strict. If the text height exceeds the rect by even 0.1px, it draws NOTHING.
                            # Since we only care about positioning it at (left, top), we give it a massive bounding box to prevent clipping.
                            text_rect = fitz.Rect(left, top, left + width + 2000, top + height + 2000)

                            page.insert_textbox(
                                text_rect, 
                                text, 
                                fontsize=font_size, 
                                fontname=fontname, 
                                color=color,
                                fill_opacity=opacity,
                                align=0
                            )

                        elif obj_type == 'rect':
                            page.draw_rect(
                                rect, 
                                color=stroke_color, 
                                fill=fill_color, 
                                width=stroke_width, 
                                fill_opacity=opacity,
                                stroke_opacity=opacity,
                                overlay=True
                            )

                        elif obj_type == 'circle':
                            page.draw_oval(
                                rect,
                                color=stroke_color,
                                fill=fill_color,
                                width=stroke_width,
                                fill_opacity=opacity,
                                stroke_opacity=opacity,
                                overlay=True
                            )
                            
                        elif obj_type == 'triangle':
                            # Draw a triangle (polygon)
                            p1 = fitz.Point(left + width/2, top)
                            p2 = fitz.Point(left, top + height)
                            p3 = fitz.Point(left + width, top + height)
                            page.draw_polygon(
                                [p1, p2, p3],
                                color=stroke_color,
                                fill=fill_color,
                                width=stroke_width,
                                fill_opacity=opacity,
                                stroke_opacity=opacity,
                                overlay=True
                            )

                        elif obj_type == 'line':
                            x1 = (obj.get("x1", 0) * parent_scaleX) + left
                            y1 = (obj.get("y1", 0) * parent_scaleY) + top
                            x2 = (obj.get("x2", 0) * parent_scaleX) + left
                            y2 = (obj.get("y2", 0) * parent_scaleY) + top
                            page.draw_line(
                                fitz.Point(x1, y1), 
                                fitz.Point(x2, y2), 
                                color=stroke_color, 
                                width=stroke_width,
                                stroke_opacity=opacity,
                                overlay=True
                            )

                        elif obj_type == 'image':
                            src = obj.get("src", "")
                            if src.startswith("data:image"):
                                header, encoded = src.split(",", 1)
                                img_data = base64.b64decode(encoded)
                                page.insert_image(rect, stream=img_data)
                                
                        elif obj_type == 'path':
                            path_data = obj.get("path", [])
                            shape = page.new_shape()
                            current_point = fitz.Point(left, top)
                            
                            for cmd in path_data:
                                letter = cmd[0]
                                if letter == 'M':
                                    current_point = fitz.Point(cmd[1] * parent_scaleX + left, cmd[2] * parent_scaleY + top)
                                    shape.draw_line(current_point, current_point)
                                elif letter == 'L':
                                    next_point = fitz.Point(cmd[1] * parent_scaleX + left, cmd[2] * parent_scaleY + top)
                                    shape.draw_line(current_point, next_point)
                                    current_point = next_point
                                elif letter == 'Q':
                                    p_control = fitz.Point(cmd[1] * parent_scaleX + left, cmd[2] * parent_scaleY + top)
                                    p_end = fitz.Point(cmd[3] * parent_scaleX + left, cmd[4] * parent_scaleY + top)
                                    shape.draw_bezier(current_point, p_control, p_control, p_end)
                                    current_point = p_end

                            shape.finish(color=stroke_color, width=stroke_width, fill=fill_color, fill_opacity=opacity, stroke_opacity=opacity)
                            shape.commit()

                # Process root objects
                process_objects(objects)

            except Exception as page_e:
                logger.warning(f"Failed to apply edits to page {page_num_str}: {page_e}")

        doc.save(str(out_path), garbage=4, deflate=True)
        doc.close()

        final_size = out_path.stat().st_size
        
        return {
            "success": True,
            "filename": out_name,
            "download_url": f"/api/pdf/download/{request_id}/{out_name}",
            "request_id": request_id,
            "message": "PDF edited successfully."
        }
