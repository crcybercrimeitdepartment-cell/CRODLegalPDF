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

def draw_cumulus_lobe(shape: fitz.Shape, p1: Tuple[float, float], p2: Tuple[float, float], bulge: float = 0.4):
    """
    Draw a single puffy circular cumulus cloud arc lobe between p1 and p2.
    """
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    dist = math.hypot(dx, dy)
    if dist < 1.0:
        return

    nx = -dy / dist
    ny = dx / dist
    h = dist * bulge
    h_factor = h * (4.0 / 3.0)

    c1x = p1[0] + (1.0 / 3.0) * dx + nx * h_factor
    c1y = p1[1] + (1.0 / 3.0) * dy + ny * h_factor
    c2x = p1[0] + (2.0 / 3.0) * dx + nx * h_factor
    c2y = p1[1] + (2.0 / 3.0) * dy + ny * h_factor

    shape.draw_bezier(fitz.Point(p1[0], p1[1]), fitz.Point(c1x, c1y), fitz.Point(c2x, c2y), fitz.Point(p2[0], p2[1]))

def draw_cloud_on_page(page: fitz.Page, ann: Dict[str, Any]):
    """
    Burn a natural organic cumulus cloud shape into a PyMuPDF page.
    """
    pts = ann.get("points", [])
    if len(pts) < 2:
        return

    p1_in, p2_in = pts[0], pts[-1]
    x1, y1 = float(p1_in.get("x", 0)), float(p1_in.get("y", 0))
    x2, y2 = float(p2_in.get("x", 0)), float(p2_in.get("y", 0))

    rx = min(x1, x2)
    ry = min(y1, y2)
    rw = abs(x2 - x1)
    rh = abs(y2 - y1)

    if rw < 10.0 or rh < 10.0:
        return

    stroke_color_hex = ann.get("color", ann.get("borderColor", "#1E3A8A"))
    stroke_rgb = hex_to_rgb(stroke_color_hex)

    fill_color_hex = ann.get("fillColor", ann.get("backgroundColor", "transparent"))
    has_fill = fill_color_hex and fill_color_hex.lower() not in ["transparent", "none"]
    fill_rgb = hex_to_rgb(fill_color_hex) if has_fill else None

    stroke_w = float(ann.get("width", 2.5))
    opacity = float(ann.get("opacity", 1.0))
    fill_opacity = float(ann.get("fillOpacity", 0.25)) if has_fill else 0.0

    shape = page.new_shape()

    # Perimeter key points for natural organic cumulus cloud
    v0 = (rx + 0.15 * rw, ry + 0.85 * rh)  # Bottom-left base
    v1 = (rx + 0.40 * rw, ry + 0.88 * rh)  # Bottom scallop 1
    v2 = (rx + 0.65 * rw, ry + 0.88 * rh)  # Bottom scallop 2
    v3 = (rx + 0.88 * rw, ry + 0.82 * rh)  # Bottom-right base
    v4 = (rx + 0.98 * rw, ry + 0.58 * rh)  # Right side puffy lobe
    v5 = (rx + 0.78 * rw, ry + 0.18 * rh)  # Top-right high dome
    v6 = (rx + 0.46 * rw, ry + 0.05 * rh)  # Top-center main peak
    v7 = (rx + 0.20 * rw, ry + 0.22 * rh)  # Top-left dome
    v8 = (rx + 0.02 * rw, ry + 0.55 * rh)  # Left side puffy lobe

    # Draw outer cumulus cloud lobes (closed loop)
    draw_cumulus_lobe(shape, v0, v1, bulge=0.35)
    draw_cumulus_lobe(shape, v1, v2, bulge=0.35)
    draw_cumulus_lobe(shape, v2, v3, bulge=0.35)
    draw_cumulus_lobe(shape, v3, v4, bulge=0.45)
    draw_cumulus_lobe(shape, v4, v5, bulge=0.45)
    draw_cumulus_lobe(shape, v5, v6, bulge=0.48)
    draw_cumulus_lobe(shape, v6, v7, bulge=0.45)
    draw_cumulus_lobe(shape, v7, v8, bulge=0.45)
    draw_cumulus_lobe(shape, v8, v0, bulge=0.45)

    shape.finish(
        color=stroke_rgb,
        fill=fill_rgb if has_fill else None,
        width=stroke_w,
        stroke_opacity=opacity,
        fill_opacity=fill_opacity if has_fill else 0.0,
        lineCap=1,
        lineJoin=1
    )
    shape.commit()

def apply_cloud_annotations_to_pdf(input_pdf_path: Path, output_pdf_path: Path, annotations: List[Dict[str, Any]]) -> bool:
    """
    Burn all organic cumulus cloud shape annotations into the PDF using PyMuPDF (fitz).
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
            if ann_type in ["cloud", "cloud_annotation", "shape_cloud"]:
                draw_cloud_on_page(page, ann)

    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_pdf_path), garbage=4, deflate=True)
    doc.close()

    if not output_pdf_path.exists() or output_pdf_path.stat().st_size == 0:
        return False

    test_doc = fitz.open(str(output_pdf_path))
    valid = len(test_doc) > 0
    test_doc.close()
    return valid
