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

def draw_free_text_on_page(page: fitz.Page, ann: Dict[str, Any]):
    """
    Burn a vector free text annotation directly onto a PyMuPDF page.
    """
    pts = ann.get("points", [])
    if not pts:
        return

    pt = pts[0]
    x, y = float(pt.get("x", 0)), float(pt.get("y", 0))

    text_content = str(ann.get("text", "Free Text Annotation")).strip()
    if not text_content:
        text_content = "Free Text Annotation"

    font_sz = float(ann.get("fontSize", 14.0))
    font_color_hex = ann.get("fontColor", ann.get("color", "#0F172A"))
    font_rgb = hex_to_rgb(font_color_hex)

    bg_hex = ann.get("backgroundColor", "transparent")
    has_bg = bg_hex and bg_hex.lower() not in ["transparent", "none"]

    raw_lines = text_content.split("\n")
    line_h = font_sz * 1.3
    opacity = float(ann.get("opacity", 1.0))

    # Optional background highlight box fill
    if has_bg:
        bg_rgb = hex_to_rgb(bg_hex)
        max_len = max([len(l) for l in raw_lines] or [10])
        box_w = max_len * (font_sz * 0.58) + 12.0
        box_h = len(raw_lines) * line_h + 8.0

        shape = page.new_shape()
        shape.draw_rect(fitz.Rect(x - 4, y - 2, x + box_w, y + box_h))
        shape.finish(fill=bg_rgb, stroke_opacity=0.0, fill_opacity=0.35)
        shape.commit()

    # Direct Crisp Vector Text Rendering
    curr_y = y + font_sz
    for line in raw_lines:
        if line.strip():
            page.insert_text(
                fitz.Point(x, curr_y),
                line,
                fontsize=font_sz,
                color=font_rgb,
                fontname="helv"
            )
        curr_y += line_h

def apply_free_text_annotations_to_pdf(input_pdf_path: Path, output_pdf_path: Path, annotations: List[Dict[str, Any]]) -> bool:
    """
    Burn all free text annotations into the PDF using PyMuPDF (fitz).
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
            if ann_type in ["free_text", "freetext", "text_annotation", "text"]:
                draw_free_text_on_page(page, ann)

    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_pdf_path), garbage=4, deflate=True)
    doc.close()

    if not output_pdf_path.exists() or output_pdf_path.stat().st_size == 0:
        return False

    test_doc = fitz.open(str(output_pdf_path))
    valid = len(test_doc) > 0
    test_doc.close()
    return valid
