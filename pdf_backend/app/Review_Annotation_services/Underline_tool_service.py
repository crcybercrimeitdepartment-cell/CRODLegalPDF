import os
import math
from pathlib import Path
from typing import List, Dict, Any, Tuple
import fitz  # PyMuPDF

def hex_to_rgb(hex_str: str) -> Tuple[float, float, float]:
    """Convert hex color string to PyMuPDF RGB float tuple (0.0 - 1.0)."""
    if not hex_str:
        return (0.86, 0.15, 0.15)  # Default red
    hex_str = str(hex_str).lstrip("#")
    if len(hex_str) == 3:
        hex_str = "".join([c * 2 for c in hex_str])
    if len(hex_str) != 6:
        return (0.86, 0.15, 0.15)
    try:
        r = int(hex_str[0:2], 16) / 255.0
        g = int(hex_str[2:4], 16) / 255.0
        b = int(hex_str[4:6], 16) / 255.0
        return (r, g, b)
    except ValueError:
        return (0.86, 0.15, 0.15)

def generate_wavy_points(p1: fitz.Point, p2: fitz.Point, amplitude: float = 2.5, wavelength: float = 6.0) -> List[fitz.Point]:
    """Generate sine wave polyline points along the line segment p1 -> p2."""
    dx = p2.x - p1.x
    dy = p2.y - p1.y
    distance = math.hypot(dx, dy)
    if distance < 1.0:
        return [p1, p2]

    angle = math.atan2(dy, dx)
    perp_angle = angle + math.pi / 2.0
    steps = max(10, int(distance / 2.0))
    wavy_pts = []

    for i in range(steps + 1):
        t = i / float(steps)
        curr_dist = t * distance
        base_x = p1.x + t * dx
        base_y = p1.y + t * dy
        offset = math.sin((curr_dist / wavelength) * 2.0 * math.pi) * amplitude

        wave_x = base_x + offset * math.cos(perp_angle)
        wave_y = base_y + offset * math.sin(perp_angle)
        wavy_pts.append(fitz.Point(wave_x, wave_y))

    return wavy_pts

def draw_underline_on_page(page: fitz.Page, ann: Dict[str, Any]):
    """
    Burn a vector text underline annotation into a PyMuPDF page.
    """
    pts = ann.get("points", [])
    if not pts or len(pts) < 2:
        return

    color_hex = ann.get("color", "#DC2626")
    color_rgb = hex_to_rgb(color_hex)
    stroke_w = float(ann.get("width", 2.0))
    opacity = float(ann.get("opacity", 1.0))
    style = str(ann.get("underlineStyle", "solid")).lower()

    p1 = fitz.Point(float(pts[0].get("x", 0)), float(pts[0].get("y", 0)))
    p2 = fitz.Point(float(pts[1].get("x", 0)), float(pts[1].get("y", 0)))

    shape = page.new_shape()

    if style == "double":
        # Double parallel lines
        shape.draw_line(p1, p2)
        p1_off = fitz.Point(p1.x, p1.y + stroke_w + 1.5)
        p2_off = fitz.Point(p2.x, p2.y + stroke_w + 1.5)
        shape.draw_line(p1_off, p2_off)
        shape.finish(
            color=color_rgb,
            width=stroke_w,
            stroke_opacity=opacity,
            lineCap=1
        )
    elif style == "dashed":
        shape.draw_line(p1, p2)
        shape.finish(
            color=color_rgb,
            width=stroke_w,
            stroke_opacity=opacity,
            dashes="[4 2] 0",
            lineCap=1
        )
    elif style == "wavy":
        wavy_points = generate_wavy_points(p1, p2, amplitude=2.5, wavelength=6.0)
        shape.draw_polyline(wavy_points)
        shape.finish(
            color=color_rgb,
            width=stroke_w,
            stroke_opacity=opacity,
            lineCap=1,
            lineJoin=1
        )
    else:  # solid (default)
        shape.draw_line(p1, p2)
        shape.finish(
            color=color_rgb,
            width=stroke_w,
            stroke_opacity=opacity,
            lineCap=1
        )

    shape.commit()

def apply_underline_annotations_to_pdf(input_pdf_path: Path, output_pdf_path: Path, annotations: List[Dict[str, Any]]) -> bool:
    """
    Burn all underline annotations into the PDF using PyMuPDF (fitz).
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
            if ann_type in ["underline", "text_underline"]:
                draw_underline_on_page(page, ann)

    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_pdf_path), garbage=4, deflate=True)
    doc.close()

    if not output_pdf_path.exists() or output_pdf_path.stat().st_size == 0:
        return False

    test_doc = fitz.open(str(output_pdf_path))
    valid = len(test_doc) > 0
    test_doc.close()
    return valid
