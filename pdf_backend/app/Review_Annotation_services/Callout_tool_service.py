import os
import math
from pathlib import Path
from typing import List, Dict, Any, Tuple
import fitz  # PyMuPDF

def hex_to_rgb(hex_str: str) -> Tuple[float, float, float]:
    """Convert hex color string to PyMuPDF RGB float tuple (0.0 - 1.0)."""
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

def draw_callout_on_page(page: fitz.Page, ann: Dict[str, Any]):
    """
    Burn a vector callout annotation (leader line + arrowhead + comment box + text) into a PyMuPDF page.
    """
    pts = ann.get("points", [])
    if not pts or len(pts) < 2:
        return

    p1 = fitz.Point(float(pts[0].get("x", 100)), float(pts[0].get("y", 100)))  # Target Point
    p2 = fitz.Point(float(pts[1].get("x", 200)), float(pts[1].get("y", 200)))  # Box Position / Knee

    comment_text = str(ann.get("text", "Callout Note")).strip()
    if not comment_text:
        comment_text = "Callout Note"

    color_hex = ann.get("color", "#2563eb")
    color_rgb = hex_to_rgb(color_hex)
    stroke_w = float(ann.get("width", 2.0))
    opacity = float(ann.get("opacity", 1.0))
    scale = float(ann.get("scale", 1.0))

    # Box dimensions
    box_w = max(130.0, float(ann.get("boxWidth", 150.0))) * scale
    box_h = max(50.0, float(ann.get("boxHeight", 60.0))) * scale

    box_rect = fitz.Rect(p2.x, p2.y, p2.x + box_w, p2.y + box_h)

    # Calculate connection point on closest edge of box_rect to target point p1
    conn_x = max(box_rect.x0, min(p1.x, box_rect.x1))
    conn_y = max(box_rect.y0, min(p1.y, box_rect.y1))
    p_conn = fitz.Point(conn_x, conn_y)

    shape = page.new_shape()

    # 1. Leader Line from box connection point to target point p1
    shape.draw_line(p_conn, p1)
    shape.finish(
        color=color_rgb,
        width=stroke_w,
        stroke_opacity=opacity,
        lineCap=1
    )

    # 2. Arrowhead Tip at target point p1 pointing toward p1
    dx = p1.x - p_conn.x
    dy = p1.y - p_conn.y
    length = math.hypot(dx, dy)
    if length > 0.001:
        angle = math.atan2(dy, dx)
        head_len = 10.0 * scale
        wing_angle = math.pi / 6.0  # 30 deg

        pt_left = fitz.Point(
            p1.x - head_len * math.cos(angle - wing_angle),
            p1.y - head_len * math.sin(angle - wing_angle)
        )
        pt_right = fitz.Point(
            p1.x - head_len * math.cos(angle + wing_angle),
            p1.y - head_len * math.sin(angle + wing_angle)
        )

        shape.draw_polyline([pt_left, p1, pt_right])
        shape.finish(
            color=color_rgb,
            fill=color_rgb,
            width=stroke_w,
            stroke_opacity=opacity,
            fill_opacity=opacity
        )

    # 3. Comment Box (White background fill with stroke border)
    shape.draw_rect(box_rect)
    shape.finish(
        color=color_rgb,
        fill=(1.0, 1.0, 1.0),  # Crisp white box background
        width=stroke_w,
        stroke_opacity=opacity,
        fill_opacity=min(0.95, opacity)
    )

    # Top accent bar on box
    accent_bar = fitz.Rect(box_rect.x0, box_rect.y0, box_rect.x1, box_rect.y0 + 4.0)
    shape.draw_rect(accent_bar)
    shape.finish(
        color=color_rgb,
        fill=color_rgb,
        width=0,
        stroke_opacity=opacity,
        fill_opacity=opacity
    )

    shape.commit()

    # 4. Insert Text Box inside box_rect
    text_inset = fitz.Rect(box_rect.x0 + 6, box_rect.y0 + 6, box_rect.x1 - 6, box_rect.y1 - 4)
    font_sz = max(9.0, 11.0 * scale)

    page.insert_textbox(
        text_inset,
        comment_text,
        fontsize=font_sz,
        fontname="helv",
        color=(0.1, 0.1, 0.1),
        align=fitz.TEXT_ALIGN_LEFT
    )

def apply_callout_annotations_to_pdf(input_pdf_path: Path, output_pdf_path: Path, annotations: List[Dict[str, Any]]) -> bool:
    """
    Burn all callout annotations into the PDF using PyMuPDF (fitz).
    """
    if not input_pdf_path.exists():
        raise FileNotFoundError(f"Input PDF not found: {input_pdf_path}")

    doc = fitz.open(str(input_pdf_path))

    page_annots: Dict[int, List[Dict[str, Any]]] = {}
    for ann in annotations:
        pg = int(ann.get("page", 1))
        page_annots.setdefault(pg, []).append(ann)

    for page_num in range(1, len(doc) + 1):
        if page_num not in page_annots:
            continue

        page = doc[page_num - 1]
        annots = page_annots[page_num]

        for ann in annots:
            ann_type = str(ann.get("type", "")).lower()
            if ann_type == "callout":
                draw_callout_on_page(page, ann)

    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_pdf_path), garbage=4, deflate=True)
    doc.close()

    if not output_pdf_path.exists() or output_pdf_path.stat().st_size == 0:
        return False

    test_doc = fitz.open(str(output_pdf_path))
    valid = len(test_doc) > 0
    test_doc.close()
    return valid
