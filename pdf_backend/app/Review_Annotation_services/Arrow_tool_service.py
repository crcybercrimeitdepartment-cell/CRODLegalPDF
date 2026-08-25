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
        hex_str = "".join(c * 2 for c in hex_str)

    if len(hex_str) != 6:
        return (0.0, 0.0, 0.0)

    try:
        r = int(hex_str[0:2], 16) / 255.0
        g = int(hex_str[2:4], 16) / 255.0
        b = int(hex_str[4:6], 16) / 255.0
        return (r, g, b)
    except ValueError:
        return (0.0, 0.0, 0.0)


def draw_arrow_on_shape(
    shape,
    p1: fitz.Point,
    p2: fitz.Point,
    width: float,
    color_rgb: Tuple[float, float, float],
    opacity: float,
    arrow_style: str = "solid",
    head_size: str = "medium",
):
    """
    Draw only the arrow graphics.

    No measurement, distance, length, unit, or text is rendered.
    """

    arrow_style = str(arrow_style).lower()
    head_size = str(head_size).lower()

    # Dashed or solid main line
    dashes = "[6 3] 0" if arrow_style == "dashed" else None

    # Main arrow line
    shape.draw_line(p1, p2)
    shape.finish(
        color=color_rgb,
        width=width,
        stroke_opacity=opacity,
        dashes=dashes,
        lineCap=1,
    )

    # Calculate arrow direction
    dx = p2.x - p1.x
    dy = p2.y - p1.y
    angle = math.atan2(dy, dx)

    # Arrowhead size
    head_mult = (
        4.5
        if head_size == "large"
        else 2.5
        if head_size == "small"
        else 3.5
    )

    head_len = max(12.0, width * head_mult)
    head_angle = math.pi / 6.0

    # -----------------------------
    # Primary arrowhead at p2
    # -----------------------------
    x_left = p2.x - head_len * math.cos(angle - head_angle)
    y_left = p2.y - head_len * math.sin(angle - head_angle)

    x_right = p2.x - head_len * math.cos(angle + head_angle)
    y_right = p2.y - head_len * math.sin(angle + head_angle)

    arrow_head_pts = [
        fitz.Point(x_left, y_left),
        p2,
        fitz.Point(x_right, y_right),
    ]

    shape.draw_polyline(arrow_head_pts)
    shape.finish(
        color=color_rgb,
        fill=color_rgb,
        width=1.0,
        stroke_opacity=opacity,
        fill_opacity=opacity,
        lineJoin=1,
    )

    # -----------------------------
    # Secondary arrowhead for double arrow
    # -----------------------------
    if arrow_style == "double":
        reverse_angle = angle + math.pi

        rx_left = p1.x - head_len * math.cos(
            reverse_angle - head_angle
        )
        ry_left = p1.y - head_len * math.sin(
            reverse_angle - head_angle
        )

        rx_right = p1.x - head_len * math.cos(
            reverse_angle + head_angle
        )
        ry_right = p1.y - head_len * math.sin(
            reverse_angle + head_angle
        )

        reverse_head_pts = [
            fitz.Point(rx_left, ry_left),
            p1,
            fitz.Point(rx_right, ry_right),
        ]

        shape.draw_polyline(reverse_head_pts)
        shape.finish(
            color=color_rgb,
            fill=color_rgb,
            width=1.0,
            stroke_opacity=opacity,
            fill_opacity=opacity,
            lineJoin=1,
        )


def apply_arrow_annotations_to_pdf(
    input_pdf_path: Path,
    output_pdf_path: Path,
    annotations: List[Dict[str, Any]],
) -> bool:
    """
    Burn arrow graphics into the PDF.

    Only arrow graphics are rendered.
    No arrow length, distance, measurement, or unit text is added.
    """

    if not input_pdf_path.exists():
        raise FileNotFoundError(
            f"Input PDF not found: {input_pdf_path}"
        )

    doc = fitz.open(str(input_pdf_path))

    try:
        page_annots: Dict[int, List[Dict[str, Any]]] = {}

        # Group annotations by page
        for ann in annotations:
            if str(ann.get("type", "")).lower() != "arrow":
                continue

            page_number = int(ann.get("page", 1))
            page_annots.setdefault(page_number, []).append(ann)

        # Render arrows
        for page_num in range(1, len(doc) + 1):
            if page_num not in page_annots:
                continue

            page = doc[page_num - 1]
            shape = page.new_shape()

            for ann in page_annots[page_num]:
                color_rgb = hex_to_rgb(
                    ann.get("color", "#FF0000")
                )

                width = float(
                    ann.get("width", 3.0)
                )

                opacity = float(
                    ann.get("opacity", 1.0)
                )

                arrow_style = ann.get(
                    "arrowStyle",
                    "solid",
                )

                head_size = ann.get(
                    "headSize",
                    "medium",
                )

                points = ann.get("points", [])

                if len(points) < 2:
                    continue

                p1 = fitz.Point(
                    float(points[0]["x"]),
                    float(points[0]["y"]),
                )

                p2 = fitz.Point(
                    float(points[-1]["x"]),
                    float(points[-1]["y"]),
                )

                # Only draw the arrow.
                # No length/measurement label is generated here.
                draw_arrow_on_shape(
                    shape=shape,
                    p1=p1,
                    p2=p2,
                    width=width,
                    color_rgb=color_rgb,
                    opacity=opacity,
                    arrow_style=arrow_style,
                    head_size=head_size,
                )

            shape.commit()

        # Save output PDF
        output_pdf_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        doc.save(
            str(output_pdf_path),
            garbage=4,
            deflate=True,
        )

    finally:
        doc.close()

    # Validate output
    if (
        not output_pdf_path.exists()
        or output_pdf_path.stat().st_size == 0
    ):
        return False

    try:
        test_doc = fitz.open(str(output_pdf_path))
        valid = len(test_doc) > 0
        test_doc.close()
        return valid
    except Exception:
        return False