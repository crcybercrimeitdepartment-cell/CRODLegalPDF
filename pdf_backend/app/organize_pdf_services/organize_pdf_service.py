"""
Organize PDF Service - Enterprise-grade PDF page organization.

All Organize PDF business logic lives in this single file.
"""

from __future__ import annotations

import base64
import io
import json
import logging
import shutil
import time
import uuid
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, List, Optional

from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, NumberObject, TextStringObject
from PIL import Image

from app.core.paths import Paths

logger = logging.getLogger(__name__)

PAGE_SIZES = {
    "a4": (595.27, 841.89),
    "letter": (612.0, 792.0),
    "legal": (612.0, 1008.0),
    "a3": (841.89, 1190.55),
    "a5": (419.53, 595.27),
    "tabloid": (792.0, 1224.0),
}

ROMAN_MAP = [
    (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
    (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),
    (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"),
]


def _int_to_roman(num: int, upper: bool = True) -> str:
    if num < 1:
        return str(num)
    result = ""
    for val, sym in ROMAN_MAP:
        while num >= val:
            result += sym
            num -= val
    return result if upper else result.lower()


def _int_to_alpha(num: int, upper: bool = True) -> str:
    result = ""
    while num > 0:
        num, rem = divmod(num - 1, 26)
        result = chr((rem + (0 if upper else 32)) + 65) + result
    return result or "A"


def _generate_label(index: int, style: str, prefix: str = "", restart: int = 0, start: int = 1) -> str:
    n = index + 1
    if restart > 0:
        cycle_len = restart
        n = ((index) % cycle_len) + start
    if style == "arabic":
        return f"{prefix}{n}"
    elif style == "upper_roman":
        return f"{prefix}{_int_to_roman(n, upper=True)}"
    elif style == "lower_roman":
        return f"{prefix}{_int_to_roman(n, upper=False)}"
    elif style == "upper_alpha":
        return f"{prefix}{_int_to_alpha(n, upper=True)}"
    elif style == "lower_alpha":
        return f"{prefix}{_int_to_alpha(n, upper=False)}"
    else:
        return f"{prefix}{n}"


class OrganizePDFService:
    """Enterprise-grade PDF organization service."""

    def __init__(self):
        self._sessions: Dict[str, Dict[str, Any]] = {}

    def _get_session(self, request_id: str) -> Dict[str, Any]:
        if request_id not in self._sessions:
            raise ValueError(f"Session {request_id} not found or expired.")
        return self._sessions[request_id]

    def create_session(self, request_id: str) -> Dict[str, Any]:
        self._sessions[request_id] = {
            "request_id": request_id,
            "created_at": time.time(),
            "pages": [],
            "metadata": {},
            "bookmarks": [],
            "history": [],
            "history_index": -1,
            "clipboard": {"pages": [], "mode": "copy"},
            "original_pdf_path": None,
            "output_filename": None,
        }
        return self._sessions[request_id]

    def upload_pdf(self, file_data, filename: str, request_id: str) -> Dict[str, Any]:
        session = self.create_session(request_id)
        upload_dir = Paths.request_upload(request_id)
        dest = upload_dir / filename
        with open(dest, "wb") as out:
            while True:
                chunk = file_data.read(1024 * 1024)
                if not chunk:
                    break
                out.write(chunk)

        return self._init_session_from_path(session, str(dest), filename, request_id)

    def upload_pdf_from_path(self, file_path: Path, filename: str, request_id: str) -> Dict[str, Any]:
        session = self.create_session(request_id)
        return self._init_session_from_path(session, str(file_path), filename, request_id)

    def _init_session_from_path(self, session: Dict[str, Any], pdf_path: str, filename: str, request_id: str) -> Dict[str, Any]:
        session["original_pdf_path"] = pdf_path
        reader = PdfReader(pdf_path)
        total_pages = len(reader.pages)

        session["metadata"] = self._extract_metadata(reader)
        session["bookmarks"] = self._extract_bookmarks(reader)
        session["pages"] = []
        session["history"] = []
        session["history_index"] = -1

        for i in range(total_pages):
            page = reader.pages[i]
            page_info = self._analyze_page(page, i)
            page_info["original_index"] = i
            page_info["page_id"] = str(uuid.uuid4())[:8]
            session["pages"].append(page_info)

        self._save_state(request_id)

        return {
            "success": True,
            "request_id": request_id,
            "filename": filename,
            "total_pages": total_pages,
            "pages": session["pages"],
            "metadata": session["metadata"],
            "bookmarks": session["bookmarks"],
        }

    def _extract_metadata(self, reader: PdfReader) -> Dict[str, Any]:
        meta = {}
        if reader.metadata:
            for key in ["/Title", "/Author", "/Subject", "/Keywords",
                        "/Creator", "/Producer", "/CreationDate", "/ModDate"]:
                val = reader.metadata.get(key)
                if val:
                    clean_key = key.lstrip("/")
                    meta[clean_key] = str(val)
        return meta

    def _extract_bookmarks(self, reader: PdfReader) -> List[Dict[str, Any]]:
        bookmarks = []
        try:
            outline = reader.outline
            if outline:
                self._flatten_outline(outline, bookmarks, 0, reader)
        except Exception:
            pass
        return bookmarks

    def _flatten_outline(self, outline, result: list, level: int, reader: PdfReader = None):
        for item in outline:
            if isinstance(item, list):
                self._flatten_outline(item, result, level + 1, reader)
            else:
                try:
                    title = str(item.title) if hasattr(item, "title") else str(item.get("/Title", "Untitled"))
                    page_num = 0
                    if reader and hasattr(item, "page"):
                        try:
                            page_num = reader.get_page_number(item.page)
                        except Exception:
                            page_num = 0
                    result.append({
                        "title": title,
                        "level": level,
                        "page": page_num + 1,
                    })
                except Exception:
                    pass

    def _analyze_page(self, page, index: int) -> Dict[str, Any]:
        try:
            box = page.mediabox
            w = float(box.width)
            h = float(box.height)
        except Exception:
            w, h = 612.0, 792.0

        rotation = 0
        try:
            rotation = int(page.get("/Rotate", 0))
        except (ValueError, TypeError):
            rotation = 0

        if rotation in (90, 270):
            display_w, display_h = h, w
        else:
            display_w, display_h = w, h

        orientation = "portrait" if display_h >= display_w else "landscape"

        is_blank = self._is_blank_page(page)

        page_size_name = "custom"
        for name, (pw, ph) in PAGE_SIZES.items():
            if (abs(w - pw) < 1 and abs(h - ph) < 1) or (abs(w - ph) < 1 and abs(h - pw) < 1):
                page_size_name = name
                break

        return {
            "index": index,
            "width": round(w, 2),
            "height": round(h, 2),
            "display_width": round(display_w, 2),
            "display_height": round(display_h, 2),
            "rotation": rotation,
            "orientation": orientation,
            "size_name": page_size_name,
            "is_blank": is_blank,
            "label": str(index + 1),
        }

    def _is_blank_page(self, page) -> bool:
        try:
            text = page.extract_text()
            if text and text.strip():
                return False
            if "/XObject" in (page.get("/Resources") or {}):
                xobjects = page["/Resources"]["/XObject"]
                if xobjects and len(xobjects) > 0:
                    return False
            if "/Font" in (page.get("/Resources") or {}):
                fonts = page["/Resources"]["/Font"]
                if fonts and len(fonts) > 0:
                    return False
            return True
        except Exception:
            return False

    def _save_state(self, request_id: str):
        session = self._sessions.get(request_id)
        if not session:
            return
        state_path = Paths.request_temp(request_id) / "state.json"
        try:
            state = {
                "pages": session["pages"],
                "metadata": session["metadata"],
                "clipboard": session["clipboard"],
            }
            with open(state_path, "w", encoding="utf-8") as f:
                json.dump(state, f)
        except Exception:
            pass

    def _push_history(self, request_id: str):
        session = self._sessions[request_id]
        snapshot = deepcopy(session["pages"])
        if session["history_index"] < len(session["history"]) - 1:
            session["history"] = session["history"][:session["history_index"] + 1]
        session["history"].append(snapshot)
        if len(session["history"]) > 100:
            session["history"] = session["history"][-100:]
        session["history_index"] = len(session["history"]) - 1

    def undo(self, request_id: str) -> Dict[str, Any]:
        session = self._get_session(request_id)
        if session["history_index"] <= 0:
            return {"success": False, "message": "Nothing to undo.", "pages": session["pages"]}
        session["history_index"] -= 1
        session["pages"] = deepcopy(session["history"][session["history_index"]])
        return {"success": True, "message": "Undo successful.", "pages": session["pages"]}

    def redo(self, request_id: str) -> Dict[str, Any]:
        session = self._get_session(request_id)
        if session["history_index"] >= len(session["history"]) - 1:
            return {"success": False, "message": "Nothing to redo.", "pages": session["pages"]}
        session["history_index"] += 1
        session["pages"] = deepcopy(session["history"][session["history_index"]])
        return {"success": True, "message": "Redo successful.", "pages": session["pages"]}

    def reorder_pages(self, request_id: str, new_order: List[int]) -> Dict[str, Any]:
        session = self._get_session(request_id)
        self._push_history(request_id)
        pages = session["pages"]
        ordered = []
        for idx in new_order:
            if 0 <= idx < len(pages):
                ordered.append(pages[idx])
        for i, p in enumerate(ordered):
            p["index"] = i
            p["label"] = str(i + 1)
        session["pages"] = ordered
        self._save_state(request_id)
        return {"success": True, "pages": session["pages"]}

    def rotate_pages(self, request_id: str, page_indices: List[int], degrees: int) -> Dict[str, Any]:
        session = self._get_session(request_id)
        self._push_history(request_id)
        for idx in page_indices:
            if 0 <= idx < len(session["pages"]):
                page = session["pages"][idx]
                page["rotation"] = (page.get("rotation", 0) + degrees) % 360
                if page["rotation"] in (90, 270):
                    page["display_width"] = page["height"]
                    page["display_height"] = page["width"]
                    page["orientation"] = "landscape" if page["width"] < page["height"] else "portrait"
                else:
                    page["display_width"] = page["width"]
                    page["display_height"] = page["height"]
                    page["orientation"] = "portrait" if page["height"] >= page["width"] else "landscape"
        for i, p in enumerate(session["pages"]):
            p["label"] = str(i + 1)
        self._save_state(request_id)
        return {"success": True, "pages": session["pages"]}

    def delete_pages(self, request_id: str, page_indices: List[int]) -> Dict[str, Any]:
        session = self._get_session(request_id)
        self._push_history(request_id)
        if len(page_indices) >= len(session["pages"]):
            return {"success": False, "message": "Cannot delete all pages."}
        new_pages = [p for i, p in enumerate(session["pages"]) if i not in page_indices]
        for i, p in enumerate(new_pages):
            p["index"] = i
            p["label"] = str(i + 1)
        session["pages"] = new_pages
        self._save_state(request_id)
        return {"success": True, "pages": session["pages"]}

    def duplicate_pages(self, request_id: str, page_indices: List[int], copies: int = 1) -> Dict[str, Any]:
        session = self._get_session(request_id)
        self._push_history(request_id)
        pages = session["pages"]
        new_pages = []
        for i, p in enumerate(pages):
            new_pages.append(p)
            if i in page_indices:
                for _ in range(copies):
                    dup = deepcopy(p)
                    dup["page_id"] = str(uuid.uuid4())[:8]
                    new_pages.append(dup)
        for i, p in enumerate(new_pages):
            p["index"] = i
            p["label"] = str(i + 1)
        session["pages"] = new_pages
        self._save_state(request_id)
        return {"success": True, "pages": session["pages"]}

    def insert_blank_page(self, request_id: str, position: int, width: float = 595.27, height: float = 841.89) -> Dict[str, Any]:
        session = self._get_session(request_id)
        self._push_history(request_id)
        blank = {
            "index": position,
            "width": round(width, 2),
            "height": round(height, 2),
            "display_width": round(width, 2),
            "display_height": round(height, 2),
            "rotation": 0,
            "orientation": "portrait" if height >= width else "landscape",
            "size_name": "custom",
            "is_blank": True,
            "label": "",
            "page_id": str(uuid.uuid4())[:8],
            "is_inserted_blank": True,
        }
        pos = max(0, min(position, len(session["pages"])))
        session["pages"].insert(pos, blank)
        for i, p in enumerate(session["pages"]):
            p["index"] = i
            p["label"] = str(i + 1)
        self._save_state(request_id)
        return {"success": True, "pages": session["pages"]}

    def move_pages(self, request_id: str, page_indices: List[int], target: int) -> Dict[str, Any]:
        session = self._get_session(request_id)
        self._push_history(request_id)
        pages = session["pages"]
        moving = [pages[i] for i in sorted(page_indices) if 0 <= i < len(pages)]
        remaining = [p for i, p in enumerate(pages) if i not in page_indices]
        target = max(0, min(target, len(remaining)))
        for j, p in enumerate(moving):
            remaining.insert(target + j, p)
        for i, p in enumerate(remaining):
            p["index"] = i
            p["label"] = str(i + 1)
        session["pages"] = remaining
        self._save_state(request_id)
        return {"success": True, "pages": session["pages"]}

    def swap_pages(self, request_id: str, index_a: int, index_b: int) -> Dict[str, Any]:
        session = self._get_session(request_id)
        self._push_history(request_id)
        pages = session["pages"]
        if 0 <= index_a < len(pages) and 0 <= index_b < len(pages):
            pages[index_a], pages[index_b] = pages[index_b], pages[index_a]
            for i, p in enumerate(pages):
                p["index"] = i
                p["label"] = str(i + 1)
        self._save_state(request_id)
        return {"success": True, "pages": session["pages"]}

    def reverse_pages(self, request_id: str, page_indices: Optional[List[int]] = None) -> Dict[str, Any]:
        session = self._get_session(request_id)
        self._push_history(request_id)
        pages = session["pages"]
        if page_indices is None:
            pages.reverse()
        else:
            subset = [pages[i] for i in sorted(page_indices) if 0 <= i < len(pages)]
            subset.reverse()
            for j, idx in enumerate(sorted(page_indices)):
                pages[idx] = subset[j]
        for i, p in enumerate(pages):
            p["index"] = i
            p["label"] = str(i + 1)
        self._save_state(request_id)
        return {"success": True, "pages": session["pages"]}

    def copy_to_clipboard(self, request_id: str, page_indices: List[int], mode: str = "copy") -> Dict[str, Any]:
        session = self._get_session(request_id)
        valid = [i for i in page_indices if 0 <= i < len(session["pages"])]
        session["clipboard"] = {
            "pages": [deepcopy(session["pages"][i]) for i in valid],
            "original_indices": sorted(valid, reverse=True),
            "mode": mode,
        }
        return {"success": True, "message": f"{len(valid)} page(s) copied to clipboard."}

    def paste_from_clipboard(self, request_id: str, position: int) -> Dict[str, Any]:
        session = self._get_session(request_id)
        self._push_history(request_id)
        clip = session.get("clipboard", {})
        if not clip.get("pages"):
            return {"success": False, "message": "Clipboard is empty.", "pages": session["pages"]}
        paste_count = len(clip["pages"])
        paste_pages = deepcopy(clip["pages"])
        for p in paste_pages:
            p["page_id"] = str(uuid.uuid4())[:8]
        pos = max(0, min(position, len(session["pages"])))
        for j, p in enumerate(paste_pages):
            session["pages"].insert(pos + j, p)
        if clip.get("mode") == "cut":
            orig_indices = sorted(clip.get("original_indices", []), reverse=True)
            for idx in orig_indices:
                if idx >= pos:
                    actual = idx + paste_count
                else:
                    actual = idx
                if 0 <= actual < len(session["pages"]):
                    session["pages"].pop(actual)
            session["clipboard"]["pages"] = []
            session["clipboard"]["original_indices"] = []
        for i, p in enumerate(session["pages"]):
            p["index"] = i
            p["label"] = str(i + 1)
        self._save_state(request_id)
        return {"success": True, "pages": session["pages"]}

    def apply_page_labels(self, request_id: str, style: str = "arabic", prefix: str = "",
                          restart: int = 0, start: int = 1) -> Dict[str, Any]:
        session = self._get_session(request_id)
        for i, page in enumerate(session["pages"]):
            page["label"] = _generate_label(i, style, prefix, restart, start)
        return {"success": True, "pages": session["pages"]}

    def remove_page_labels(self, request_id: str) -> Dict[str, Any]:
        session = self._get_session(request_id)
        for i, page in enumerate(session["pages"]):
            page["label"] = str(i + 1)
        return {"success": True, "pages": session["pages"]}

    def analyze_pdf(self, request_id: str) -> Dict[str, Any]:
        session = self._get_session(request_id)
        pages = session["pages"]
        orientations = {}
        sizes = {}
        blank_count = 0
        for p in pages:
            o = p["orientation"]
            orientations[o] = orientations.get(o, 0) + 1
            sn = p["size_name"]
            sizes[sn] = sizes.get(sn, 0) + 1
            if p.get("is_blank"):
                blank_count += 1
        return {
            "total_pages": len(pages),
            "orientations": orientations,
            "sizes": sizes,
            "blank_pages": blank_count,
            "has_mixed_sizes": len(sizes) > 1,
            "has_mixed_orientations": len(orientations) > 1,
            "metadata": session["metadata"],
        }

    def process_organize(self, request_id: str, output_name: str = "organized.pdf",
                         preserve_metadata: bool = True, preserve_bookmarks: bool = True,
                         label_style: str = "arabic", label_prefix: str = "",
                         label_restart: int = 0) -> Dict[str, Any]:
        session = self._get_session(request_id)
        original_path = session.get("original_pdf_path")
        if not original_path or not Path(original_path).exists():
            raise ValueError("Original PDF not found. Please re-upload.")

        output_dir = Paths.request_output(request_id)
        out_name = output_name if output_name.endswith(".pdf") else f"{output_name}.pdf"
        out_path = output_dir / out_name

        reader = PdfReader(str(original_path))

        writer = PdfWriter()
        page_map = {}
        write_idx = 0

        for seq_idx, page_info in enumerate(session["pages"]):
            if page_info.get("is_inserted_blank"):
                w = page_info.get("width", 595.27)
                h = page_info.get("height", 841.89)
                blank_page = writer.add_blank_page(width=w, height=h)
                page_map[seq_idx] = write_idx
                write_idx += 1
            elif "original_index" in page_info:
                orig_idx = page_info["original_index"]
                if 0 <= orig_idx < len(reader.pages):
                    src_page = reader.pages[orig_idx]
                    rotation = page_info.get("rotation", 0)
                    if rotation != 0:
                        src_page[NameObject("/Rotate")] = NumberObject(rotation)
                    writer.add_page(src_page)
                    page_map[seq_idx] = write_idx
                    write_idx += 1

        if preserve_metadata and reader.metadata:
            try:
                writer.add_metadata(reader.metadata)
            except Exception:
                pass

        writer.add_metadata({
            NameObject("/Producer"): TextStringObject("PDF Backend - Organize PDF"),
        })

        with open(out_path, "wb") as f:
            writer.write(f)

        file_size = out_path.stat().st_size

        session["output_filename"] = out_name

        return {
            "success": True,
            "message": f"Successfully organized {len(session['pages'])} page(s).",
            "request_id": request_id,
            "filename": out_name,
            "download_url": f"/api/pdf/download/{request_id}/{out_name}",
            "file_size": file_size,
            "total_pages": len(session["pages"]),
            "processing_time": 0,
        }

    def generate_thumbnails(self, request_id: str, indices: Optional[List[int]] = None,
                            scale: float = 0.3) -> Dict[str, Any]:
        session = self._get_session(request_id)
        original_path = session.get("original_pdf_path")
        if not original_path or not Path(original_path).exists():
            raise ValueError("Original PDF not found.")

        import fitz
        doc = fitz.open(str(original_path))
        thumbnails = {}

        target_indices = indices if indices else list(range(len(session["pages"])))

        for idx in target_indices:
            if idx >= len(session["pages"]):
                continue
            if idx < doc.page_count:
                page = doc[idx]
                mat = fitz.Matrix(scale, scale)
                pix = page.get_pixmap(matrix=mat)
                img_data = pix.tobytes("png")
                thumb_b64 = base64.b64encode(img_data).decode()
                thumbnails[idx] = f"data:image/png;base64,{thumb_b64}"

        doc.close()
        return {"success": True, "thumbnails": thumbnails}

    def generate_preview(self, request_id: str, page_index: int,
                         scale: float = 1.0) -> Dict[str, Any]:
        session = self._get_session(request_id)
        original_path = session.get("original_pdf_path")
        if not original_path or not Path(original_path).exists():
            raise ValueError("Original PDF not found.")

        import fitz
        doc = fitz.open(str(original_path))

        if page_index >= len(session["pages"]):
            doc.close()
            raise ValueError("Page index out of range.")

        page_info = session["pages"][page_index]
        if page_info.get("is_inserted_blank"):
            w = page_info.get("width", 595.27) * scale
            h = page_info.get("height", 841.89) * scale
            img = Image.new("RGB", (int(w), int(h)), "white")
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            preview_b64 = base64.b64encode(buf.getvalue()).decode()
            doc.close()
            return {"success": True, "preview": f"data:image/png;base64,{preview_b64}"}

        orig_idx = page_info.get("original_index", page_index)
        if orig_idx < doc.page_count:
            page = doc[orig_idx]
            mat = fitz.Matrix(scale, scale)
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.tobytes("png")
            preview_b64 = base64.b64encode(img_data).decode()
            doc.close()
            return {"success": True, "preview": f"data:image/png;base64,{preview_b64}"}

        doc.close()
        return {"success": False, "message": "Could not generate preview."}

    def get_status(self, request_id: str) -> Dict[str, Any]:
        session = self._sessions.get(request_id)
        if not session:
            return {"exists": False, "request_id": request_id}
        return {
            "exists": True,
            "request_id": request_id,
            "total_pages": len(session["pages"]),
            "history_length": len(session["history"]),
            "history_index": session["history_index"],
            "has_clipboard": bool(session.get("clipboard", {}).get("pages")),
        }

    def cleanup(self, request_id: str):
        try:
            upload_dir = Paths.request_upload(request_id)
            temp_dir = Paths.request_temp(request_id)
            if upload_dir.exists():
                shutil.rmtree(str(upload_dir), ignore_errors=True)
            if temp_dir.exists():
                shutil.rmtree(str(temp_dir), ignore_errors=True)
        except Exception:
            pass
        self._sessions.pop(request_id, None)

    def select_pages(self, request_id: str, mode: str, **kwargs) -> List[int]:
        session = self._get_session(request_id)
        pages = session["pages"]
        total = len(pages)

        if mode == "all":
            return list(range(total))
        elif mode == "none":
            return []
        elif mode == "invert":
            selected = kwargs.get("currently_selected", [])
            return [i for i in range(total) if i not in selected]
        elif mode == "odd":
            return [i for i in range(total) if (i + 1) % 2 == 1]
        elif mode == "even":
            return [i for i in range(total) if (i + 1) % 2 == 0]
        elif mode == "portrait":
            return [i for i, p in enumerate(pages) if p["orientation"] == "portrait"]
        elif mode == "landscape":
            return [i for i, p in enumerate(pages) if p["orientation"] == "landscape"]
        elif mode == "rotated":
            return [i for i, p in enumerate(pages) if p.get("rotation", 0) != 0]
        elif mode == "blank":
            return [i for i, p in enumerate(pages) if p.get("is_blank")]
        elif mode == "range":
            start = kwargs.get("start", 1)
            end = kwargs.get("end", total)
            return [i for i in range(max(0, start - 1), min(total, end))]
        return []


organize_pdf_service = OrganizePDFService()
