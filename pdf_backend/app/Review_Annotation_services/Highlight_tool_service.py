import os
import math
from pathlib import Path
from typing import List, Dict, Any, Tuple
import fitz  # PyMuPDF

def hex_to_rgb(hex_str: str) -> Tuple[float, float, float]:
    """Convert hex color string to PyMuPDF RGB float tuple (0.0 - 1.0)."""
    if not hex_str:
        return (1.0, 0.9, 0.0)  # Default yellow
    hex_str = str(hex_str).lstrip("#")
    if len(hex_str) == 3:
        hex_str = "".join([c * 2 for c in hex_str])
    if len(hex_str) != 6:
        return (1.0, 0.9, 0.0)
    try:
        r = int(hex_str[0:2], 16) / 255.0
        g = int(hex_str[2:4], 16) / 255.0
        b = int(hex_str[4:6], 16) / 255.0
        return (r, g, b)
    except ValueError:
        return (1.0, 0.9, 0.0)

def draw_highlight_on_page(page: fitz.Page, ann: Dict[str, Any]):
    """
    Burn a vector semi-transparent text highlight annotation into a PyMuPDF page.
    """
    pts = ann.get("points", [])
    if not pts:
        return

    color_hex = ann.get("color", ann.get("highlightColor", "#FACC15"))
    color_rgb = hex_to_rgb(color_hex)
    opacity = float(ann.get("opacity", 0.4))
    fill_opacity = min(0.45, opacity)

    shape = page.new_shape()

    if len(pts) == 2:
        # Bounding rectangle text highlight
        p1 = pts[0]
        p2 = pts[1]
        x1, y1 = float(p1.get("x", 0)), float(p1.get("y", 0))
        x2, y2 = float(p2.get("x", 0)), float(p2.get("y", 0))

        rect = fitz.Rect(min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2))
        shape.draw_rect(rect)
        shape.finish(
            color=color_rgb,
            fill=color_rgb,
            width=0,
            stroke_opacity=fill_opacity,
            fill_opacity=fill_opacity
        )
    else:
        # Freehand line text highlight
        fitz_points = [fitz.Point(float(p.get("x", 0)), float(p.get("y", 0))) for p in pts]
        stroke_w = float(ann.get("width", 16.0))

        shape.draw_polyline(fitz_points)
        shape.finish(
            color=color_rgb,
            width=stroke_w,
            stroke_opacity=fill_opacity,
            lineCap=1,   # Round line cap
            lineJoin=1   # Round line join
        )

    shape.commit()

def apply_highlight_annotations_to_pdf(input_pdf_path: Path, output_pdf_path: Path, annotations: List[Dict[str, Any]]) -> bool:
    """
    Burn all highlight annotations into the PDF using PyMuPDF (fitz).
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
            if ann_type in ["highlight", "highlighter"]:
                draw_highlight_on_page(page, ann)

    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_pdf_path), garbage=4, deflate=True)
    doc.close()

    if not output_pdf_path.exists() or output_pdf_path.stat().st_size == 0:
        return False

    test_doc = fitz.open(str(output_pdf_path))
    valid = len(test_doc) > 0
    test_doc.close()
    return valid
