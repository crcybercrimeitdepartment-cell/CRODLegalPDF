import json
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict, Any, Tuple
import fitz  # PyMuPDF
import re

def parse_xfdf(xml_content: str, page_heights: Dict[int, float]) -> Tuple[List[Dict[str, Any]], int, int]:
    """
    Parse XFDF (XML) string and extract annotations.
    Returns: (list of annotations, skipped_count, unsupported_count)
    """
    annotations = []
    skipped_count = 0
    unsupported_count = 0

    try:
        # Handle namespaces if present
        root = ET.fromstring(xml_content)
    except Exception:
        # Try to clean up/parse without strict XML rules if slight malformation
        try:
            # Strip XML declaration if it causes issues
            cleaned = re.sub(r'^<\?xml[^?]*\?>', '', xml_content).strip()
            root = ET.fromstring(cleaned)
        except Exception as e:
            raise ValueError(f"Invalid XML or XFDF format: {str(e)}")

    # Standard namespace helper
    ns = ""
    m = re.match(r'({.*})', root.tag)
    if m:
        ns = m.group(1)

    annots_parent = root.find(f"./{ns}annots")
    if annots_parent is None:
        # Check if the root is already <annots> or contains tags directly
        annots_parent = root

    # Loop through each child tag in annots
    for element in annots_parent:
        tag_name = element.tag.replace(ns, "").lower()
        if tag_name in ["pdf", "fdf"]:
            continue

        try:
            # Common attributes
            page_attr = element.attrib.get("page")
            if page_attr is None:
                skipped_count += 1
                continue
            
            page_idx = int(page_attr)
            author = element.attrib.get("title", element.attrib.get("author", "Imported User"))
            color_hex = element.attrib.get("color", "#000000")
            opacity_val = float(element.attrib.get("opacity", "1.0"))
            subject = element.attrib.get("subject", tag_name.capitalize())
            created = element.attrib.get("date", "")
            
            # Extract content text
            content_elem = element.find(f"./{ns}contents")
            content_text = ""
            if content_elem is not None and content_elem.text:
                content_text = content_elem.text.strip()
            else:
                # Fallback to contents-richtext
                rt_elem = element.find(f"./{ns}contents-richtext")
                if rt_elem is not None:
                    # Extract text from span/body tags
                    text_parts = [t for t in rt_elem.itertext()]
                    content_text = "".join(text_parts).strip()

            # Parent / reply info
            parent_id = element.attrib.get("inreplyto", None)

            # Coordinates mapping (rect)
            rect_str = element.attrib.get("rect", "")
            if not rect_str:
                skipped_count += 1
                continue

            rect_coords = [float(x) for x in rect_str.split(",")]
            if len(rect_coords) != 4:
                skipped_count += 1
                continue

            # Convert bottom-left coordinates to top-left if we know the page height
            p_height = page_heights.get(page_idx, 842.0) # default A4 height
            
            # XFDF: x1, y1, x2, y2 (bottom-left)
            # PyMuPDF expects: x0, y0, x1, y1 (top-left)
            x0 = min(rect_coords[0], rect_coords[2])
            y0 = p_height - max(rect_coords[1], rect_coords[3])
            x1 = max(rect_coords[0], rect_coords[2])
            y1 = p_height - min(rect_coords[1], rect_coords[3])

            # Prepare standard internal annotation dictionary
            annot_data = {
                "id": element.attrib.get("name", f"import_{page_idx}_{len(annotations)}"),
                "page": page_idx + 1,  # convert 0-indexed to 1-indexed
                "type": tag_name,      # highlight, underline, strikeout, text, freetext, line, square, circle, polyline, polygon, ink
                "color": color_hex if color_hex.startswith("#") else f"#{color_hex}" if len(color_hex) == 6 else "#000000",
                "opacity": opacity_val,
                "author": author,
                "text": content_text,
                "rect": [x0, y0, x1, y1],
                "created_at": float(element.attrib.get("created", 0.0)) or None,
                "subject": subject,
                "parent_id": parent_id
            }

            # Type specific attributes
            if tag_name in ["highlight", "highlighter"]:
                annot_data["type"] = "highlight"
                annot_data["highlightColor"] = color_hex
            elif tag_name in ["underline", "strikeout"]:
                pass
            elif tag_name in ["text", "sticky_note"]:
                annot_data["type"] = "sticky_note"
                annot_data["stickyColor"] = color_hex
            elif tag_name in ["freetext", "text_box"]:
                annot_data["type"] = "free_text"
            elif tag_name in ["line", "polyline", "polygon", "ink"]:
                # Parse points/vertices if available
                # vertices attribute has coords e.g., "100,200,300,400..."
                vertices_str = element.attrib.get("vertices", element.attrib.get("head", ""))
                if vertices_str:
                    try:
                        v_coords = [float(x) for x in vertices_str.split(",")]
                        pts = []
                        for idx in range(0, len(v_coords) - 1, 2):
                            pts.append({
                                "x": v_coords[idx],
                                "y": p_height - v_coords[idx+1]
                            })
                        annot_data["points"] = pts
                    except Exception:
                        pass
            elif tag_name in ["square", "rectangle"]:
                annot_data["type"] = "rectangle"
            elif tag_name in ["circle", "ellipse"]:
                annot_data["type"] = "circle"
            else:
                unsupported_count += 1
                continue

            annotations.append(annot_data)
        except Exception:
            skipped_count += 1

    return annotations, skipped_count, unsupported_count

def parse_json_comments(json_content: str) -> Tuple[List[Dict[str, Any]], int, int]:
    """Parse internal JSON format for comments."""
    try:
        data = json.loads(json_content)
    except Exception as e:
        raise ValueError(f"Invalid JSON format: {str(e)}")

    if isinstance(data, dict) and "annotations" in data:
        annots = data["annotations"]
    elif isinstance(data, list):
        annots = data
    else:
        raise ValueError("JSON must contain a list of annotations or an 'annotations' field")

    annotations = []
    skipped_count = 0
    unsupported_count = 0

    for item in annots:
        try:
            if "page" not in item or "type" not in item:
                skipped_count += 1
                continue
            
            # Simple sanitization
            annotations.append(item)
        except Exception:
            skipped_count += 1

    return annotations, skipped_count, unsupported_count

def apply_native_annotations(doc: fitz.Document, annotations: List[Dict[str, Any]]) -> Tuple[int, int, int]:
    """
    Apply native interactive annotations to PyMuPDF document pages.
    Returns: (imported_count, skipped_count, unsupported_count)
    """
    imported_count = 0
    skipped_count = 0
    unsupported_count = 0

    for ann in annotations:
        try:
            page_num = int(ann.get("page", 1)) - 1  # 0-indexed in PyMuPDF
            if page_num < 0 or page_num >= len(doc):
                skipped_count += 1
                continue

            page = doc[page_num]
            ann_type = str(ann.get("type", "")).lower()

            rect_coords = ann.get("rect")
            if not rect_coords and "points" in ann:
                # Compute bounding box from points
                pts = ann["points"]
                xs = [float(p.get("x", 0)) for p in pts]
                ys = [float(p.get("y", 0)) for p in pts]
                if xs and ys:
                    rect_coords = [min(xs), min(ys), max(xs), max(ys)]
            
            if not rect_coords or len(rect_coords) != 4:
                # Default rect if none provided (e.g. for text notes)
                rect_coords = [100, 100, 150, 150]

            rect = fitz.Rect(rect_coords[0], rect_coords[1], rect_coords[2], rect_coords[3])
            
            # RGB conversion helper
            color_hex = ann.get("color", "#ff0000").lstrip("#")
            if len(color_hex) == 6:
                color_rgb = (int(color_hex[0:2], 16)/255.0, int(color_hex[2:4], 16)/255.0, int(color_hex[4:6], 16)/255.0)
            else:
                color_rgb = (1.0, 0.0, 0.0)

            annot = None

            if ann_type in ["highlight", "highlighter"]:
                annot = page.add_highlight_annot(rect)
            elif ann_type in ["underline"]:
                annot = page.add_underline_annot(rect)
            elif ann_type in ["strikeout", "strike"]:
                annot = page.add_strikeout_annot(rect)
            elif ann_type in ["sticky_note", "text"]:
                point = fitz.Point(rect.x0, rect.y0)
                annot = page.add_text_annot(point, ann.get("text", ""), icon="Note")
            elif ann_type in ["free_text", "freetext"]:
                annot = page.add_freetext_annot(rect, ann.get("text", ""))
            elif ann_type in ["rectangle", "square"]:
                annot = page.add_rect_annot(rect)
            elif ann_type in ["circle", "ellipse"]:
                annot = page.add_circle_annot(rect)
            elif ann_type == "line":
                p1 = fitz.Point(rect.x0, rect.y0)
                p2 = fitz.Point(rect.x1, rect.y1)
                annot = page.add_line_annot(p1, p2)
            elif ann_type in ["polyline", "polygon"]:
                pts = ann.get("points", [])
                fitz_pts = [fitz.Point(float(p.get("x", 0)), float(p.get("y", 0))) for p in pts]
                if len(fitz_pts) >= 2:
                    if ann_type == "polyline":
                        annot = page.add_polyline_annot(fitz_pts)
                    else:
                        annot = page.add_polygon_annot(fitz_pts)
                else:
                    skipped_count += 1
                    continue
            elif ann_type == "ink":
                pts = ann.get("points", [])
                fitz_pts = [fitz.Point(float(p.get("x", 0)), float(p.get("y", 0))) for p in pts]
                if fitz_pts:
                    annot = page.add_ink_annot([fitz_pts])
                else:
                    skipped_count += 1
                    continue
            else:
                unsupported_count += 1
                continue

            if annot:
                # Set common properties
                annot.set_colors(stroke=color_rgb)
                annot.set_opacity(float(ann.get("opacity", 1.0)))
                
                # Set metadata
                info = annot.info
                info["title"] = ann.get("author", "Imported User")
                info["content"] = ann.get("text", "")
                info["subject"] = ann.get("subject", ann_type.capitalize())
                annot.set_info(info)
                
                annot.update()
                imported_count += 1
        except Exception:
            skipped_count += 1

    return imported_count, skipped_count, unsupported_count
