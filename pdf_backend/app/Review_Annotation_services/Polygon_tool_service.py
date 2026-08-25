import os
import math
from pathlib import Path
from typing import List, Dict, Any, Tuple
import fitz  # PyMuPDF

def hex_to_rgb(hex_str: str) -> Tuple[float, float, float]:
    """Convert hex color string to PyMuPDF RGB float tuple (0.0 - 1.0)."""
    if not hex_str or hex_str.lower() in ["transparent", "none"]:
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

def draw_polygon_on_page(page: fitz.Page, ann: Dict[str, Any]):
    """
    Burn a vector closed polygon shape annotation into a PyMuPDF page.
    """
    pts = ann.get("points", [])
    if len(pts) < 3:
        return

    closed_pts = list(pts)
    p_start = closed_pts[0]
    p_end = closed_pts[-1]

    if float(p_start.get("x", 0)) != float(p_end.get("x", 0)) or float(p_start.get("y", 0)) != float(p_end.get("y", 0)):
        closed_pts.append(p_start)

    fitz_points = [fitz.Point(float(p.get("x", 0)), float(p.get("y", 0))) for p in closed_pts]

    stroke_color_hex = ann.get("color", ann.get("borderColor", "#DC2626"))
    stroke_rgb = hex_to_rgb(stroke_color_hex)

    fill_color_hex = ann.get("fillColor", ann.get("backgroundColor", "transparent"))
    has_fill = fill_color_hex and fill_color_hex.lower() not in ["transparent", "none"]
    fill_rgb = hex_to_rgb(fill_color_hex) if has_fill else None

    stroke_w = float(ann.get("width", 2.0))
    opacity = float(ann.get("opacity", 1.0))
    fill_opacity = float(ann.get("fillOpacity", 0.25)) if has_fill else 0.0
    line_style = str(ann.get("lineStyle", ann.get("rectStyle", "solid"))).lower()

    shape = page.new_shape()
    shape.draw_polyline(fitz_points)

    dashes = "(3, 3)" if line_style == "dashed" else None

    shape.finish(
        color=stroke_rgb,
        fill=fill_rgb if has_fill else None,
        width=stroke_w,
        dashes=dashes,
        stroke_opacity=opacity,
        fill_opacity=fill_opacity if has_fill else 0.0,
        lineCap=1,
        lineJoin=1
    )
    shape.commit()

def apply_polygon_annotations_to_pdf(input_pdf_path: Path, output_pdf_path: Path, annotations: List[Dict[str, Any]]) -> bool:
    """
    Burn all closed polygon shape annotations into the PDF using PyMuPDF (fitz).
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
            if ann_type in ["polygon", "closed_polygon", "shape_polygon"]:
                draw_polygon_on_page(page, ann)

    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_pdf_path), garbage=4, deflate=True)
    doc.close()

    if not output_pdf_path.exists() or output_pdf_path.stat().st_size == 0:
        return False

    test_doc = fitz.open(str(output_pdf_path))
    valid = len(test_doc) > 0
    test_doc.close()
    return valid
