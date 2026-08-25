import os
import math
from pathlib import Path
from typing import List, Dict, Any, Tuple
import fitz  # PyMuPDF

def hex_to_rgb(hex_str: str) -> Tuple[float, float, float]:
    """Convert hex color string like #FF0000 or #F00 to PyMuPDF RGB float tuple (0.0 - 1.0)."""
    if not hex_str:
        return (0.0, 0.0, 0.0)
    hex_str = str(hex_str).lstrip("#")
    if len(hex_str) == 3:
        hex_str = "".join([c * 2 for c in hex_str])
    if len(hex_str) != 6:
        return (0.0, 0.0, 0.0)
    try:
        r = int(hex_str[0:2], 16) / 255.0
        g = int(hex_str[2:4], 16) / 255.0
        b = int(hex_str[4:6], 16) / 255.0
        return (r, g, b)
    except ValueError:
        return (0.0, 0.0, 0.0)

def apply_pencil_annotations_to_pdf(input_pdf_path: Path, output_pdf_path: Path, annotations: List[Dict[str, Any]]) -> bool:
    """
    Burn freehand pencil/pen/highlighter annotations directly into the PDF using PyMuPDF (fitz).
    Translates PDF page coordinates to native vector drawings, preserving original PDF text,
    image quality, searchability, and page size.
    """
    if not input_pdf_path.exists():
        raise FileNotFoundError(f"Input PDF file not found: {input_pdf_path}")

    doc = fitz.open(str(input_pdf_path))

    # Group annotations by 1-indexed page number
    page_annots: Dict[int, List[Dict[str, Any]]] = {}
    for ann in annotations:
        pg = int(ann.get("page", 1))
        page_annots.setdefault(pg, []).append(ann)

    for page_num in range(1, len(doc) + 1):
        if page_num not in page_annots:
            continue

        page = doc[page_num - 1]
        annots = page_annots[page_num]

        shape = page.new_shape()

        for ann in annots:
            ann_type = str(ann.get("type", "pencil")).lower()
            color_hex = ann.get("color", "#000000")
            color_rgb = hex_to_rgb(color_hex)
            width = float(ann.get("width", 3.0))
            opacity = float(ann.get("opacity", 1.0))
            points_data = ann.get("points", [])

            if ann_type == "eraser":
                continue

            if not points_data or len(points_data) < 1:
                continue

            fitz_points = [fitz.Point(float(p["x"]), float(p["y"])) for p in points_data]

            if ann_type in ["pencil", "pen", "highlighter", "freehand"]:
                if ann_type == "highlighter":
                    opacity = min(opacity, 0.4) if opacity == 1.0 else opacity
                    width = max(width, 10.0)

                if len(fitz_points) == 1:
                    pt = fitz_points[0]
                    shape.draw_circle(pt, width / 2.0)
                    shape.finish(
                        color=color_rgb,
                        fill=color_rgb,
                        stroke_opacity=opacity,
                        fill_opacity=opacity
                    )
                else:
                    shape.draw_polyline(fitz_points)
                    shape.finish(
                        color=color_rgb,
                        fill=None,
                        width=width,
                        stroke_opacity=opacity,
                        lineCap=1,   # Round line cap
                        lineJoin=1   # Round line join
                    )

            elif ann_type == "stamp":
                from app.Review_Annotation_services.Stamp_tool_service import draw_stamp_on_page
                draw_stamp_on_page(page, ann)

            elif ann_type == "callout":
                from app.Review_Annotation_services.Callout_tool_service import draw_callout_on_page
                draw_callout_on_page(page, ann)

            elif ann_type in ["ink", "handwriting", "signature"]:
                from app.Review_Annotation_services.Ink_tool_service import draw_ink_on_page
                draw_ink_on_page(page, ann)

            elif ann_type in ["highlight", "highlighter"]:
                from app.Review_Annotation_services.Highlight_tool_service import draw_highlight_on_page
                draw_highlight_on_page(page, ann)

            elif ann_type in ["underline", "text_underline"]:
                from app.Review_Annotation_services.Underline_tool_service import draw_underline_on_page
                draw_underline_on_page(page, ann)

            elif ann_type in ["strikeout", "strikethrough", "text_strikeout"]:
                from app.Review_Annotation_services.Strikeout_tool_service import draw_strikeout_on_page
                draw_strikeout_on_page(page, ann)

            elif ann_type in ["squiggly", "wavy_underline", "text_squiggly"]:
                from app.Review_Annotation_services.Squiggly_tool_service import draw_squiggly_on_page
                draw_squiggly_on_page(page, ann)

            elif ann_type in ["sticky_note", "sticky", "note"]:
                from app.Review_Annotation_services.Sticky_note_service import draw_sticky_note_on_page
                draw_sticky_note_on_page(page, ann)

            elif ann_type in ["text_box", "textbox"]:
                from app.Review_Annotation_services.Text_box_tool_service import draw_text_box_on_page
                draw_text_box_on_page(page, ann)

            elif ann_type in ["free_text", "freetext", "text_annotation"]:
                from app.Review_Annotation_services.Free_text_tool_service import draw_free_text_on_page
                draw_free_text_on_page(page, ann)

            elif ann_type in ["rectangle", "rect", "shape_rectangle", "box"]:
                from app.Review_Annotation_services.Rectangle_tool_service import draw_rectangle_on_page
                draw_rectangle_on_page(page, ann)

            elif ann_type in ["circle", "ellipse", "shape_ellipse", "oval"]:
                from app.Review_Annotation_services.Circle_tool_service import draw_circle_on_page
                draw_circle_on_page(page, ann)

            elif ann_type == "arrow" and len(fitz_points) >= 2:
                p1, p2 = fitz_points[0], fitz_points[-1]
                arrow_style = ann.get("arrowStyle", "solid")
                head_size = ann.get("headSize", "medium")
                from app.Review_Annotation_services.Arrow_tool_service import draw_arrow_on_shape
                draw_arrow_on_shape(shape, p1, p2, width, color_rgb, opacity, arrow_style, head_size)

            elif ann_type in ["line", "straight_line", "separator"]:
                from app.Review_Annotation_services.Line_tool_service import draw_line_on_page
                draw_line_on_page(page, ann)

            elif ann_type in ["polyline", "multi_line", "polygon_open"]:
                from app.Review_Annotation_services.Polyline_tool_service import draw_polyline_on_page
                draw_polyline_on_page(page, ann)

            elif ann_type in ["polygon", "closed_polygon", "shape_polygon"]:
                from app.Review_Annotation_services.Polygon_tool_service import draw_polygon_on_page
                draw_polygon_on_page(page, ann)

            elif ann_type in ["cloud", "cloud_annotation", "shape_cloud"]:
                from app.Review_Annotation_services.Cloud_tool_service import draw_cloud_on_page
                draw_cloud_on_page(page, ann)

            elif ann_type in ["measurement", "measure_distance", "measure_perimeter", "measure_area"]:
                from app.Review_Annotation_services.Measurement_tool_service import draw_measurement_on_page
                draw_measurement_on_page(page, ann)

            elif ann_type == "rectangle" and len(fitz_points) >= 2:
                p1, p2 = fitz_points[0], fitz_points[-1]
                rect = fitz.Rect(min(p1.x, p2.x), min(p1.y, p2.y), max(p1.x, p2.x), max(p1.y, p2.y))
                shape.draw_rect(rect)
                shape.finish(
                    color=color_rgb,
                    fill=None,
                    width=width,
                    stroke_opacity=opacity
                )

            elif ann_type == "circle" and len(fitz_points) >= 2:
                p1, p2 = fitz_points[0], fitz_points[-1]
                rect = fitz.Rect(min(p1.x, p2.x), min(p1.y, p2.y), max(p1.x, p2.x), max(p1.y, p2.y))
                shape.draw_oval(rect)
                shape.finish(
                    color=color_rgb,
                    fill=None,
                    width=width,
                    stroke_opacity=opacity
                )

        shape.commit()

    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_pdf_path), garbage=4, deflate=True)
    doc.close()

    if not output_pdf_path.exists() or output_pdf_path.stat().st_size == 0:
        return False
    
    test_doc = fitz.open(str(output_pdf_path))
    valid = len(test_doc) > 0
    test_doc.close()
    return valid
