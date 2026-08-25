import os
import math
from pathlib import Path
from typing import List, Dict, Any, Tuple
import fitz  # PyMuPDF

def hex_to_rgb(hex_str: str) -> Tuple[float, float, float]:
    """Convert hex color string to PyMuPDF RGB float tuple (0.0 - 1.0)."""
    if not hex_str:
        return (0.99, 0.94, 0.54)  # Default yellow
    hex_str = str(hex_str).lstrip("#")
    if len(hex_str) == 3:
        hex_str = "".join([c * 2 for c in hex_str])
    if len(hex_str) != 6:
        return (0.99, 0.94, 0.54)
    try:
        r = int(hex_str[0:2], 16) / 255.0
        g = int(hex_str[2:4], 16) / 255.0
        b = int(hex_str[4:6], 16) / 255.0
        return (r, g, b)
    except ValueError:
        return (0.99, 0.94, 0.54)

def draw_sticky_note_on_page(page: fitz.Page, ann: Dict[str, Any]):
    """
    Burn a vector sticky note card annotation into a PyMuPDF page.
    """
    pts = ann.get("points", [])
    if not pts:
        return

    pt = pts[0]
    x, y = float(pt.get("x", 0)), float(pt.get("y", 0))

    bg_color_hex = ann.get("stickyColor", ann.get("color", "#FEF08A"))
    bg_rgb = hex_to_rgb(bg_color_hex)
    border_rgb = (0.75, 0.5, 0.0)  # Dark yellow / gold border

    text_content = str(ann.get("text", "Sticky note comment...")).strip()
    if not text_content:
        text_content = "Sticky note comment..."

    author = str(ann.get("author", "User"))

    card_w = max(140.0, min(240.0, len(text_content) * 7.0))
    card_h = 65.0

    shape = page.new_shape()

    # Draw Sticky Note Card Background
    card_rect = fitz.Rect(x, y, x + card_w, y + card_h)
    shape.draw_rect(card_rect)
    shape.finish(color=border_rgb, fill=bg_rgb, width=1.5, stroke_opacity=1.0, fill_opacity=0.95)

    # Top Header Bar
    header_rect = fitz.Rect(x, y, x + card_w, y + 16.0)
    shape.draw_rect(header_rect)
    shape.finish(color=border_rgb, fill=(0.95, 0.85, 0.4), width=1.0, fill_opacity=0.9)

    shape.commit()

    # Insert Header Text
    header_text = f"Note ({author})"
    page.insert_text(
        fitz.Point(x + 6.0, y + 11.0),
        header_text,
        fontsize=9,
        color=(0.2, 0.2, 0.2),
        fontname="helv"
    )

    # Insert Note Body Text
    words = text_content.split()
    lines = []
    curr_line = ""
    for w in words:
        if len(curr_line + " " + w) > 28:
            lines.append(curr_line)
            curr_line = w
        else:
            curr_line = (curr_line + " " + w).strip()
    if curr_line:
        lines.append(curr_line)

    line_y = y + 28.0
    for l in lines[:3]:
        page.insert_text(
            fitz.Point(x + 8.0, line_y),
            l,
            fontsize=9,
            color=(0.1, 0.1, 0.1),
            fontname="helv"
        )
        line_y += 11.0

def apply_sticky_note_annotations_to_pdf(input_pdf_path: Path, output_pdf_path: Path, annotations: List[Dict[str, Any]]) -> bool:
    """
    Burn all sticky note annotations into the PDF using PyMuPDF (fitz).
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
            if ann_type in ["sticky_note", "sticky", "note"]:
                draw_sticky_note_on_page(page, ann)

    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_pdf_path), garbage=4, deflate=True)
    doc.close()

    if not output_pdf_path.exists() or output_pdf_path.stat().st_size == 0:
        return False

    test_doc = fitz.open(str(output_pdf_path))
    valid = len(test_doc) > 0
    test_doc.close()
    return valid
