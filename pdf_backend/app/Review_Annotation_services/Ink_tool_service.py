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

def draw_ink_on_page(page: fitz.Page, ann: Dict[str, Any]):
    """
    Burn a vector ink handwriting/signature annotation into a PyMuPDF page.
    """
    pts = ann.get("points", [])
    if not pts:
        return

    fitz_points = [fitz.Point(float(p.get("x", 0)), float(p.get("y", 0))) for p in pts]
    if not fitz_points:
        return

    color_hex = ann.get("color", "#000000")
    color_rgb = hex_to_rgb(color_hex)
    stroke_w = float(ann.get("width", 2.5))
    opacity = float(ann.get("opacity", 1.0))
    ink_style = str(ann.get("inkStyle", "fountain")).lower()

    if ink_style == "highlighter":
        opacity = min(0.4, opacity)
        stroke_w = max(10.0, stroke_w)

    shape = page.new_shape()

    if len(fitz_points) == 1:
        # Single dot
        p = fitz_points[0]
        shape.draw_circle(p, stroke_w / 2.0)
        shape.finish(
            color=color_rgb,
            fill=color_rgb,
            width=0,
            stroke_opacity=opacity,
            fill_opacity=opacity
        )
    elif len(fitz_points) == 2:
        shape.draw_line(fitz_points[0], fitz_points[1])
        shape.finish(
            color=color_rgb,
            width=stroke_w,
            stroke_opacity=opacity,
            lineCap=1,
            lineJoin=1
        )
    else:
        # Smooth polyline stroke
        shape.draw_polyline(fitz_points)
        shape.finish(
            color=color_rgb,
            width=stroke_w,
            stroke_opacity=opacity,
            lineCap=1,   # Round line cap
            lineJoin=1   # Round line join
        )

    shape.commit()

def apply_ink_annotations_to_pdf(input_pdf_path: Path, output_pdf_path: Path, annotations: List[Dict[str, Any]]) -> bool:
    """
    Burn all ink annotations into the PDF using PyMuPDF (fitz).
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
            if ann_type in ["ink", "handwriting", "signature"]:
                draw_ink_on_page(page, ann)

    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_pdf_path), garbage=4, deflate=True)
    doc.close()

    if not output_pdf_path.exists() or output_pdf_path.stat().st_size == 0:
        return False

    test_doc = fitz.open(str(output_pdf_path))
    valid = len(test_doc) > 0
    test_doc.close()
    return valid
