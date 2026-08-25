import os
import math
from pathlib import Path
from typing import List, Dict, Any, Tuple
import fitz  # PyMuPDF

def hex_to_rgb(hex_str: str) -> Tuple[float, float, float]:
    """Convert hex color string to PyMuPDF RGB float tuple (0.0 - 1.0)."""
    if not hex_str or hex_str.lower() in ["transparent", "none"]:
        return (1.0, 1.0, 1.0)
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

def compute_text_box_dimensions(text_content: str, font_sz: float) -> Tuple[List[str], float, float]:
    """
    Calculate word-wrapped lines and dynamic box width & height according to text content.
    """
    char_w = font_sz * 0.58
    line_h = font_sz * 1.35
    max_chars_per_line = 24

    raw_paras = (text_content or "Text Box Content").split("\n")
    wrapped_lines = []

    for para in raw_paras:
        if not para.strip():
            wrapped_lines.append("")
            continue
        words = para.split(" ")
        current_line = ""
        for word in words:
            if len(word) > max_chars_per_line:
                if current_line:
                    wrapped_lines.append(current_line)
                    current_line = ""
                for i in range(0, len(word), max_chars_per_line):
                    wrapped_lines.append(word[i:i + max_chars_per_line])
                continue
            if len(current_line + (" " if current_line else "") + word) > max_chars_per_line:
                wrapped_lines.append(current_line)
                current_line = word
            else:
                current_line += (" " if current_line else "") + word
        if current_line:
            wrapped_lines.append(current_line)

    max_line_len = max([len(l) for l in wrapped_lines] or [12])
    padding_x = 16.0
    padding_y = 16.0

    calc_w = max(140.0, max_line_len * char_w + padding_x)
    calc_h = max(45.0, len(wrapped_lines) * line_h + padding_y)

    return wrapped_lines, calc_w, calc_h

def draw_text_box_on_page(page: fitz.Page, ann: Dict[str, Any]):
    """
    Burn a vector text box annotation into a PyMuPDF page with dynamic auto-sizing.
    """
    pts = ann.get("points", [])
    if not pts:
        return

    pt = pts[0]
    x, y = float(pt.get("x", 0)), float(pt.get("y", 0))

    text_content = str(ann.get("text", "Text Box Content")).strip()
    if not text_content:
        text_content = "Text Box Content"

    font_sz = float(ann.get("fontSize", 14.0))
    font_color_hex = ann.get("fontColor", ann.get("color", "#000000"))
    font_rgb = hex_to_rgb(font_color_hex)

    bg_hex = ann.get("backgroundColor", "#FFFFFF")
    bg_rgb = hex_to_rgb(bg_hex)
    has_bg = bg_hex and bg_hex.lower() not in ["transparent", "none"]

    border_hex = ann.get("borderColor", "#2563EB")
    border_rgb = hex_to_rgb(border_hex)

    # Compute dynamic auto-resizing box dimensions
    wrapped_lines, calc_w, calc_h = compute_text_box_dimensions(text_content, font_sz)
    box_w = max(calc_w, float(ann.get("boxWidth", 160.0)))
    box_h = max(calc_h, float(ann.get("boxHeight", 60.0)))

    opacity = float(ann.get("opacity", 1.0))
    stroke_w = float(ann.get("width", 1.5))

    shape = page.new_shape()
    box_rect = fitz.Rect(x, y, x + box_w, y + box_h)

    # Draw Background & Border Box
    shape.draw_rect(box_rect)
    shape.finish(
        color=border_rgb,
        fill=bg_rgb if has_bg else None,
        width=stroke_w,
        stroke_opacity=opacity,
        fill_opacity=min(0.95, opacity) if has_bg else 0.0
    )
    shape.commit()

    # Insert Wrapped Text Content
    formatted_text = "\n".join(wrapped_lines)
    text_inset = fitz.Rect(x + 8.0, y + 6.0, x + box_w - 6.0, y + box_h - 4.0)
    page.insert_textbox(
        text_inset,
        formatted_text,
        fontsize=font_sz,
        color=font_rgb,
        fontname="helv",
        align=fitz.TEXT_ALIGN_LEFT
    )

def apply_text_box_annotations_to_pdf(input_pdf_path: Path, output_pdf_path: Path, annotations: List[Dict[str, Any]]) -> bool:
    """
    Burn all text box annotations into the PDF using PyMuPDF (fitz).
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
            if ann_type in ["text_box", "textbox", "free_text"]:
                draw_text_box_on_page(page, ann)

    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_pdf_path), garbage=4, deflate=True)
    doc.close()

    if not output_pdf_path.exists() or output_pdf_path.stat().st_size == 0:
        return False

    test_doc = fitz.open(str(output_pdf_path))
    valid = len(test_doc) > 0
    test_doc.close()
    return valid
