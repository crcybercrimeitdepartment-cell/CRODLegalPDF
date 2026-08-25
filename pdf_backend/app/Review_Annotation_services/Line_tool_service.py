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

def draw_line_on_page(page: fitz.Page, ann: Dict[str, Any]):
    """
    Burn a vector straight line annotation into a PyMuPDF page.
    """
    pts = ann.get("points", [])
    if len(pts) < 2:
        return

    p1, p2 = pts[0], pts[-1]
    x1, y1 = float(p1.get("x", 0)), float(p1.get("y", 0))
    x2, y2 = float(p2.get("x", 0)), float(p2.get("y", 0))

    stroke_color_hex = ann.get("color", "#0F172A")
    stroke_rgb = hex_to_rgb(stroke_color_hex)
    stroke_w = float(ann.get("width", 2.0))
    opacity = float(ann.get("opacity", 1.0))
    line_style = str(ann.get("lineStyle", ann.get("rectStyle", "solid"))).lower()

    shape = page.new_shape()
    shape.draw_line(fitz.Point(x1, y1), fitz.Point(x2, y2))

    dashes = "(3, 3)" if line_style == "dashed" else None

    shape.finish(
        color=stroke_rgb,
        width=stroke_w,
        dashes=dashes,
        stroke_opacity=opacity,
        lineCap=1
    )
    shape.commit()

def apply_line_annotations_to_pdf(input_pdf_path: Path, output_pdf_path: Path, annotations: List[Dict[str, Any]]) -> bool:
    """
    Burn all straight line annotations into the PDF using PyMuPDF (fitz).
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
            if ann_type in ["line", "straight_line", "separator"]:
                draw_line_on_page(page, ann)

    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_pdf_path), garbage=4, deflate=True)
    doc.close()

    if not output_pdf_path.exists() or output_pdf_path.stat().st_size == 0:
        return False

    test_doc = fitz.open(str(output_pdf_path))
    valid = len(test_doc) > 0
    test_doc.close()
    return valid
