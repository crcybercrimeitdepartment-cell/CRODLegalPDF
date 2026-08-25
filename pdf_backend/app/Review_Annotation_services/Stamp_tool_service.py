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

def draw_stamp_on_page(page: fitz.Page, ann: Dict[str, Any]):
    """
    Burn a vector stamp annotation (text + border badge) into a PyMuPDF page.
    """
    pts = ann.get("points", [])
    if not pts:
        return

    x = float(pts[0].get("x", 100))
    y = float(pts[0].get("y", 100))

    scale = float(ann.get("scale", 1.0))
    stamp_text = str(ann.get("stampText", "APPROVED")).upper()
    stamp_style = str(ann.get("stampStyle", "boxed")).lower()
    color_hex = ann.get("color", "#00CC44")
    color_rgb = hex_to_rgb(color_hex)
    opacity = float(ann.get("opacity", 1.0))

    box_w = max(140.0, len(stamp_text) * 14.0) * scale
    box_h = 44.0 * scale
    font_size = max(14.0, 18.0 * scale)

    rect = fitz.Rect(x, y, x + box_w, y + box_h)
    shape = page.new_shape()

    if stamp_style == "badge":
        # Solid filled badge background
        shape.draw_rect(rect)
        shape.finish(
            color=color_rgb,
            fill=color_rgb,
            width=2.0 * scale,
            stroke_opacity=opacity,
            fill_opacity=min(0.2, opacity)
        )
    elif stamp_style == "double_boxed":
        # Outer border
        shape.draw_rect(rect)
        # Inner inset border
        inner_rect = fitz.Rect(x + 3 * scale, y + 3 * scale, x + box_w - 3 * scale, y + box_h - 3 * scale)
        shape.draw_rect(inner_rect)
        shape.finish(
            color=color_rgb,
            fill=None,
            width=2.0 * scale,
            stroke_opacity=opacity
        )
    else:  # boxed (default)
        shape.draw_rect(rect)
        shape.finish(
            color=color_rgb,
            fill=None,
            width=2.5 * scale,
            stroke_opacity=opacity
        )

    shape.commit()

    # Insert centered bold stamp text
    text_rect = fitz.Rect(x + 4, y + (box_h - font_size) / 2.0 - 2, x + box_w - 4, y + box_h)
    page.insert_textbox(
        text_rect,
        stamp_text,
        fontsize=font_size,
        fontname="helv",
        fontfile=None,
        color=color_rgb,
        align=fitz.TEXT_ALIGN_CENTER
    )

def apply_stamp_annotations_to_pdf(input_pdf_path: Path, output_pdf_path: Path, annotations: List[Dict[str, Any]]) -> bool:
    """
    Burn all stamp annotations into the PDF using PyMuPDF (fitz).
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
            if ann_type == "stamp":
                draw_stamp_on_page(page, ann)

    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_pdf_path), garbage=4, deflate=True)
    doc.close()

    if not output_pdf_path.exists() or output_pdf_path.stat().st_size == 0:
        return False

    test_doc = fitz.open(str(output_pdf_path))
    valid = len(test_doc) > 0
    test_doc.close()
    return valid
