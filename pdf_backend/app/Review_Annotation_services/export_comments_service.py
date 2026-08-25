import json
import csv
import io
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict, Any, Tuple
import fitz  # PyMuPDF
import time

def rgb_to_hex(rgb: Tuple[float, float, float]) -> str:
    """Convert RGB float tuple to hex color string."""
    if not rgb:
        return "#000000"
    r = int(max(0.0, min(1.0, rgb[0])) * 255)
    g = int(max(0.0, min(1.0, rgb[1])) * 255)
    b = int(max(0.0, min(1.0, rgb[2])) * 255)
    return f"#{r:02x}{g:02x}{b:02x}"

def extract_annotations_from_pdf(pdf_path: Path) -> List[Dict[str, Any]]:
    """
    Extract native annotations from a PDF file.
    """
    annotations = []
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    doc = fitz.open(str(pdf_path))
    for page_idx, page in enumerate(doc):
        page_height = page.rect.height
        for annot_idx, annot in enumerate(page.annots()):
            try:
                info = annot.info
                rect = annot.rect
                colors = annot.colors
                
                # Convert top-left (PyMuPDF) back to bottom-left (Standard PDF/XFDF)
                # PyMuPDF: x0, y0, x1, y1 (top-left)
                # Bottom-left expected by standard: x0, page_height - y1, x1, page_height - y0
                pdf_x0 = rect.x0
                pdf_y0 = page_height - rect.y1
                pdf_x1 = rect.x1
                pdf_y1 = page_height - rect.y0

                stroke_color = colors.get("stroke")
                color_hex = rgb_to_hex(stroke_color) if stroke_color else "#ff0000"

                # Extract line/points vertices if available
                # annot.vertices has points
                points = []
                vertices = getattr(annot, "vertices", None)
                if vertices:
                    for v in vertices:
                        points.append({
                            "x": v[0],
                            "y": page_height - v[1]
                        })

                # Map PyMuPDF types to standard types
                type_name = annot.type[1].lower() if isinstance(annot.type, tuple) else str(annot.type).lower()

                annot_data = {
                    "id": info.get("name", f"export_{page_idx}_{annot_idx}"),
                    "page": page_idx + 1,  # 1-indexed for export representation
                    "type": type_name,
                    "color": color_hex,
                    "opacity": annot.opacity,
                    "author": info.get("title", "Unknown Author"),
                    "text": info.get("content", ""),
                    "rect": [pdf_x0, pdf_y0, pdf_x1, pdf_y1],
                    "subject": info.get("subject", type_name.capitalize()),
                    "created_at": info.get("creationDate", ""),
                    "updated_at": info.get("modDate", ""),
                    "points": points
                }
                annotations.append(annot_data)
            except Exception:
                continue

    doc.close()
    return annotations

def annotations_to_xfdf(annotations: List[Dict[str, Any]]) -> str:
    """Convert annotations to XFDF (XML) string format."""
    root = ET.Element("xfdf", xmlns="http://ns.adobe.com/xfdf/", xml_space="preserve")
    annots_elem = ET.SubElement(root, "annots")

    for ann in annotations:
        ann_type = ann.get("type", "text").lower()
        # standard XFDF tag name mapping
        tag_map = {
            "text": "text",
            "sticky_note": "text",
            "highlight": "highlight",
            "underline": "underline",
            "strikeout": "strikeout",
            "free_text": "freetext",
            "freetext": "freetext",
            "rectangle": "square",
            "square": "square",
            "circle": "circle",
            "ellipse": "circle",
            "line": "line",
            "polyline": "polyline",
            "polygon": "polygon",
            "ink": "ink"
        }
        tag_name = tag_map.get(ann_type, "text")
        
        rect = ann.get("rect", [0, 0, 0, 0])
        rect_str = f"{rect[0]},{rect[1]},{rect[2]},{rect[3]}"

        attrs = {
            "page": str(ann.get("page", 1) - 1),  # XFDF page index is 0-indexed
            "rect": rect_str,
            "color": ann.get("color", "#ff0000").replace("#", ""),
            "opacity": str(ann.get("opacity", 1.0)),
            "title": ann.get("author", "User"),
            "subject": ann.get("subject", tag_name.capitalize()),
            "name": ann.get("id", ""),
            "date": ann.get("updated_at", "")
        }

        # Vertices representation for polyline/polygon/ink
        pts = ann.get("points", [])
        if pts and tag_name in ["polyline", "polygon", "ink"]:
            # page height is not easily accessible here, but coordinates are already mapped to bottom-left standard
            v_str = ",".join([f"{p['x']},{p['y']}" for p in pts])
            attrs["vertices"] = v_str

        annot_elem = ET.SubElement(annots_elem, tag_name, attrs)

        # Add contents
        contents_elem = ET.SubElement(annot_elem, "contents")
        contents_elem.text = ann.get("text", "")

    # Pretty-print or return raw string
    try:
        # standard encoding to string
        return ET.tostring(root, encoding="utf-8", xml_declaration=True).decode("utf-8")
    except Exception:
        # fallback
        return ET.tostring(root, encoding="utf-8").decode("utf-8")

def annotations_to_fdf(annotations: List[Dict[str, Any]]) -> str:
    """Convert annotations to standard FDF plain text format."""
    fdf = []
    fdf.append("%FDF-1.2")
    fdf.append("1 0 obj")
    fdf.append("<<")
    fdf.append("/FDF <<")
    fdf.append("/Annots [")

    for ann in annotations:
        ann_type = ann.get("type", "text").upper()
        # map subtype to uppercase standard
        subtype_map = {
            "HIGHLIGHT": "Highlight",
            "UNDERLINE": "Underline",
            "STRIKEOUT": "StrikeOut",
            "TEXT": "Text",
            "STICKY_NOTE": "Text",
            "FREE_TEXT": "FreeText",
            "FREETEXT": "FreeText",
            "RECTANGLE": "Square",
            "SQUARE": "Square",
            "CIRCLE": "Circle",
            "ELLIPSE": "Circle",
            "LINE": "Line",
            "POLYLINE": "PolyLine",
            "POLYGON": "Polygon",
            "INK": "Ink"
        }
        subtype = subtype_map.get(ann_type, "Text")
        
        rect = ann.get("rect", [0, 0, 0, 0])
        rect_str = f"[{rect[0]} {rect[1]} {rect[2]} {rect[3]}]"
        
        color_hex = ann.get("color", "#ff0000").lstrip("#")
        # RGB representation as float array [r g b]
        if len(color_hex) == 6:
            r = int(color_hex[0:2], 16) / 255.0
            g = int(color_hex[2:4], 16) / 255.0
            b = int(color_hex[4:6], 16) / 255.0
            color_str = f"[{r:.3f} {g:.3f} {b:.3f}]"
        else:
            color_str = "[1.000 0.000 0.000]"

        # Escape parenthesis in text
        text = ann.get("text", "").replace("(", "\\(").replace(")", "\\)")
        author = ann.get("author", "User").replace("(", "\\(").replace(")", "\\)")

        fdf_annot = f"<< /Type /Annot /Subtype /{subtype} /Rect {rect_str} /Contents ({text}) /T ({author}) /C {color_str} /Page {ann.get('page', 1) - 1} >>"
        fdf.append(fdf_annot)

    fdf.append("]")
    fdf.append(">>")
    fdf.append(">>")
    fdf.append("endobj")
    fdf.append("trailer")
    fdf.append("<<")
    fdf.append("/Root 1 0 R")
    fdf.append(">>")
    fdf.append("%%EOF")

    return "\n".join(fdf)

def annotations_to_csv(annotations: List[Dict[str, Any]]) -> str:
    """Convert annotations to CSV string format."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["Page", "Type", "Author", "Subject", "Text/Comment", "Color", "Opacity", "Coordinates (Rect)"])
    
    for ann in annotations:
        rect = ann.get("rect", [])
        rect_str = ",".join([str(x) for x in rect]) if rect else ""
        writer.writerow([
            ann.get("page", 1),
            ann.get("type", ""),
            ann.get("author", ""),
            ann.get("subject", ""),
            ann.get("text", ""),
            ann.get("color", ""),
            ann.get("opacity", 1.0),
            rect_str
        ])
        
    return output.getvalue()
