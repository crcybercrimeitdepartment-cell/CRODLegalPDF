import os
import math
from pathlib import Path
from typing import List, Dict, Any, Tuple
import fitz  # PyMuPDF

def hex_to_rgb(hex_str: str) -> Tuple[float, float, float]:
    """Convert hex color string to PyMuPDF RGB float tuple (0.0 - 1.0)."""
    if not hex_str:
        return (0.93, 0.27, 0.27)  # Default red
    hex_str = str(hex_str).lstrip("#")
    if len(hex_str) == 3:
        hex_str = "".join([c * 2 for c in hex_str])
    if len(hex_str) != 6:
        return (0.93, 0.27, 0.27)
    try:
        r = int(hex_str[0:2], 16) / 255.0
        g = int(hex_str[2:4], 16) / 255.0
        b = int(hex_str[4:6], 16) / 255.0
        return (r, g, b)
    except ValueError:
        return (0.93, 0.27, 0.27)

def draw_strikeout_on_page(page: fitz.Page, ann: Dict[str, Any]):
    """
    Burn a vector text strikeout annotation into a PyMuPDF page.
    """
    pts = ann.get("points", [])
    if not pts or len(pts) < 2:
        return

    color_hex = ann.get("color", "#EF4444")
    color_rgb = hex_to_rgb(color_hex)
    stroke_w = float(ann.get("width", 2.0))
    opacity = float(ann.get("opacity", 1.0))
    style = str(ann.get("strikeStyle", "solid")).lower()

    p1 = fitz.Point(float(pts[0].get("x", 0)), float(pts[0].get("y", 0)))
    p2 = fitz.Point(float(pts[1].get("x", 0)), float(pts[1].get("y", 0)))

    shape = page.new_shape()

    if style == "redline":
        # Light red background box + bold red strikethrough line
        x1, y1 = min(p1.x, p2.x), min(p1.y, p2.y) - 6.0
        x2, y2 = max(p1.x, p2.x), max(p1.y, p2.y) + 6.0
        bg_rect = fitz.Rect(x1, y1, x2, y2)
        shape.draw_rect(bg_rect)
        shape.finish(color=color_rgb, fill=(1.0, 0.88, 0.88), width=0, fill_opacity=0.4)

        shape.draw_line(p1, p2)
        shape.finish(color=color_rgb, width=stroke_w + 0.5, stroke_opacity=opacity, lineCap=1)
    elif style == "double":
        # Two parallel strikethrough lines
        p1_a = fitz.Point(p1.x, p1.y - 1.5)
        p2_a = fitz.Point(p2.x, p2.y - 1.5)
        p1_b = fitz.Point(p1.x, p1.y + 1.5)
        p2_b = fitz.Point(p2.x, p2.y + 1.5)
        shape.draw_line(p1_a, p2_a)
        shape.draw_line(p1_b, p2_b)
        shape.finish(color=color_rgb, width=stroke_w, stroke_opacity=opacity, lineCap=1)
    elif style == "dashed":
        shape.draw_line(p1, p2)
        shape.finish(color=color_rgb, width=stroke_w, stroke_opacity=opacity, dashes="[4 2] 0", lineCap=1)
    else:  # solid (default)
        shape.draw_line(p1, p2)
        shape.finish(color=color_rgb, width=stroke_w, stroke_opacity=opacity, lineCap=1)

    shape.commit()

def apply_strikeout_annotations_to_pdf(input_pdf_path: Path, output_pdf_path: Path, annotations: List[Dict[str, Any]]) -> bool:
    """
    Burn all strikeout annotations into the PDF using PyMuPDF (fitz).
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
            if ann_type in ["strikeout", "strikethrough", "text_strikeout"]:
                draw_strikeout_on_page(page, ann)

    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_pdf_path), garbage=4, deflate=True)
    doc.close()

    if not output_pdf_path.exists() or output_pdf_path.stat().st_size == 0:
        return False

    test_doc = fitz.open(str(output_pdf_path))
    valid = len(test_doc) > 0
    test_doc.close()
    return valid
