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

UNIT_FACTORS = {
    "pt": 1.0,
    "in": 1.0 / 72.0,
    "cm": 2.54 / 72.0,
    "mm": 25.4 / 72.0,
    "ft": 1.0 / (72.0 * 12.0),
    "m": 0.0254 / 72.0
}

def calculate_distance(p1: Tuple[float, float], p2: Tuple[float, float], unit: str = "cm", scale: float = 1.0) -> Tuple[float, str]:
    dist_pt = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    factor = UNIT_FACTORS.get(unit.lower(), UNIT_FACTORS["cm"])
    val = dist_pt * factor * scale
    return val, f"{val:.2f} {unit}"

def calculate_polygon_area(points: List[Tuple[float, float]], unit: str = "cm", scale: float = 1.0) -> Tuple[float, str]:
    n = len(points)
    if n < 3:
        return 0.0, f"0.00 sq {unit}"
    area_pt = 0.0
    for i in range(n):
        j = (i + 1) % n
        area_pt += points[i][0] * points[j][1]
        area_pt -= points[j][0] * points[i][1]
    area_pt = abs(area_pt) / 2.0
    factor = UNIT_FACTORS.get(unit.lower(), UNIT_FACTORS["cm"])
    val = area_pt * (factor * scale) ** 2
    return val, f"{val:.2f} sq {unit}"

def draw_perpendicular_tick(shape: fitz.Shape, p: Tuple[float, float], dir_vec: Tuple[float, float], length: float = 8.0):
    nx = -dir_vec[1]
    ny = dir_vec[0]
    t1 = fitz.Point(p[0] + nx * length, p[1] + ny * length)
    t2 = fitz.Point(p[0] - nx * length, p[1] - ny * length)
    shape.draw_line(t1, t2)

def draw_measurement_label(page: fitz.Page, text: str, pos: Tuple[float, float], text_color_rgb: Tuple[float, float, float]):
    """
    Render a clean white pill label with measurement text at pos.
    """
    fontsize = 10.0
    pad_x = 6.0
    pad_y = 3.0
    text_w = fitz.get_text_length(text, fontname="helv", fontsize=fontsize)
    text_h = fontsize

    rx1 = pos[0] - text_w / 2.0 - pad_x
    ry1 = pos[1] - text_h / 2.0 - pad_y
    rx2 = pos[0] + text_w / 2.0 + pad_x
    ry2 = pos[1] + text_h / 2.0 + pad_y

    label_shape = page.new_shape()
    rect = fitz.Rect(rx1, ry1, rx2, ry2)
    label_shape.draw_rect(rect)
    label_shape.finish(
        color=text_color_rgb,
        fill=(1.0, 1.0, 1.0),
        width=1.0,
        stroke_opacity=1.0,
        fill_opacity=0.95
    )
    label_shape.commit()

    page.insert_text(
        fitz.Point(pos[0] - text_w / 2.0, pos[1] + text_h / 3.0),
        text,
        fontsize=fontsize,
        fontname="helv",
        color=text_color_rgb
    )

def draw_measurement_on_page(page: fitz.Page, ann: Dict[str, Any]):
    pts_raw = ann.get("points", [])
    if len(pts_raw) < 2:
        return

    pts = [(float(p.get("x", 0)), float(p.get("y", 0))) for p in pts_raw]
    m_type = str(ann.get("measureType", ann.get("type", "distance"))).lower()
    unit = str(ann.get("measureUnit", "cm"))
    scale = float(ann.get("measureScale", 1.0))
    color_hex = ann.get("color", ann.get("borderColor", "#2563EB"))
    stroke_rgb = hex_to_rgb(color_hex)
    stroke_w = float(ann.get("width", 2.5))
    opacity = float(ann.get("opacity", 1.0))

    shape = page.new_shape()

    if "area" in m_type or m_type == "measure_area":
        # Closed Area Polygon Measurement
        fitz_pts = [fitz.Point(p[0], p[1]) for p in pts]
        shape.draw_polyline(fitz_pts)
        shape.draw_line(fitz_pts[-1], fitz_pts[0])

        fill_color_hex = ann.get("fillColor", "#DBEAFE")
        has_fill = fill_color_hex and fill_color_hex.lower() not in ["transparent", "none"]
        fill_rgb = hex_to_rgb(fill_color_hex) if has_fill else (0.85, 0.92, 1.0)

        shape.finish(
            color=stroke_rgb,
            fill=fill_rgb,
            width=stroke_w,
            stroke_opacity=opacity,
            fill_opacity=0.35,
            lineCap=1,
            lineJoin=1
        )
        shape.commit()

        # Calculate Area & Centroid
        _, label_str = calculate_polygon_area(pts, unit=unit, scale=scale)
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        draw_measurement_label(page, label_str, (cx, cy), stroke_rgb)

    elif "perimeter" in m_type or m_type == "measure_perimeter":
        # Multi-segment Perimeter Measurement
        fitz_pts = [fitz.Point(p[0], p[1]) for p in pts]
        shape.draw_polyline(fitz_pts)

        total_dist_pt = 0.0
        for i in range(len(pts) - 1):
            p1, p2 = pts[i], pts[i + 1]
            seg_len_pt = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
            total_dist_pt += seg_len_pt
            # End tick marks
            dx = (p2[0] - p1[0]) / max(1e-5, seg_len_pt)
            dy = (p2[1] - p1[1]) / max(1e-5, seg_len_pt)
            draw_perpendicular_tick(shape, p1, (dx, dy), length=6.0)
            draw_perpendicular_tick(shape, p2, (dx, dy), length=6.0)

        shape.finish(
            color=stroke_rgb,
            width=stroke_w,
            stroke_opacity=opacity,
            lineCap=1,
            lineJoin=1
        )
        shape.commit()

        factor = UNIT_FACTORS.get(unit.lower(), UNIT_FACTORS["cm"])
        total_val = total_dist_pt * factor * scale
        label_str = f"P = {total_val:.2f} {unit}"
        last_pt = pts[-1]
        draw_measurement_label(page, label_str, (last_pt[0] + 15.0, last_pt[1] - 10.0), stroke_rgb)

    else:
        # Distance Line Measurement (Default)
        p1, p2 = pts[0], pts[-1]
        fitz_p1 = fitz.Point(p1[0], p1[1])
        fitz_p2 = fitz.Point(p2[0], p2[1])
        shape.draw_line(fitz_p1, fitz_p2)

        dist_pt = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        if dist_pt > 1e-5:
            dx = (p2[0] - p1[0]) / dist_pt
            dy = (p2[1] - p1[1]) / dist_pt
            draw_perpendicular_tick(shape, p1, (dx, dy), length=8.0)
            draw_perpendicular_tick(shape, p2, (dx, dy), length=8.0)

        shape.finish(
            color=stroke_rgb,
            width=stroke_w,
            stroke_opacity=opacity,
            lineCap=1,
            lineJoin=1
        )
        shape.commit()

        _, label_str = calculate_distance(p1, p2, unit=unit, scale=scale)
        mx = (p1[0] + p2[0]) / 2.0
        my = (p1[1] + p2[1]) / 2.0
        draw_measurement_label(page, label_str, (mx, my), stroke_rgb)

def apply_measurement_annotations_to_pdf(input_pdf_path: Path, output_pdf_path: Path, annotations: List[Dict[str, Any]]) -> bool:
    """
    Burn all measurement annotations into the PDF using PyMuPDF (fitz).
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
            if ann_type in ["measurement", "measure_distance", "measure_perimeter", "measure_area"]:
                draw_measurement_on_page(page, ann)

    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    pdf_bytes = doc.tobytes(garbage=4, deflate=True)
    doc.close()
    output_pdf_path.write_bytes(pdf_bytes)

    if not output_pdf_path.exists() or output_pdf_path.stat().st_size == 0:
        return False

    test_doc = fitz.open(str(output_pdf_path))
    valid = len(test_doc) > 0
    test_doc.close()
    return valid
