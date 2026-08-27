"""
Advanced Search Service — Document Management Section.

Provides multi-target, powerful search capabilities for PDF documents across:
  - Text content
  - Metadata (Title, Author, Subject, Keywords, Producer, Creator)
  - Bookmarks & Outlines
  - Annotations & Comments
  - Document Properties & Page Specifications

Features:
  - Regular Expression (regex) pattern matching
  - Exact & case-sensitive matching
  - Scope filtering (Text, Metadata, Bookmarks, Annotations, Properties)
  - Result snippets with page index & bounding box mapping
"""

from __future__ import annotations

import io
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024


class AdvancedSearchService:
    """Enterprise service for multi-category advanced search across PDF documents."""

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and unsafe characters."""
        if not filename:
            return "document.pdf"
        clean = Path(filename).name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document.pdf"

    def execute_advanced_search(
        self,
        pdf_bytes: bytes,
        original_filename: str,
        query: str,
        search_scopes: Optional[List[str]] = None,
        case_sensitive: bool = False,
        is_regex: bool = False,
    ) -> Dict[str, Any]:
        """
        Execute multi-target search across text, metadata, bookmarks, annotations, and document properties.
        """
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError("File size exceeds maximum limit of 100 MB.")
        if not pdf_bytes.startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")

        if not query or not query.strip():
            raise ValueError("Search query string cannot be empty.")

        q_str = query.strip()
        scopes = search_scopes if search_scopes else ["text", "metadata", "bookmarks", "comments", "properties"]
        scopes = [s.lower() for s in scopes]

        # Compile regex pattern or literal
        flags = 0 if case_sensitive else re.IGNORECASE
        try:
            pattern = re.compile(q_str if is_regex else re.escape(q_str), flags=flags)
        except Exception as exc:
            raise ValueError(f"Invalid Regular Expression pattern '{q_str}': {str(exc)}")

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = len(doc)
        results: List[Dict[str, Any]] = []

        # ── 1. Search Text Content ────────────────────────────────────────
        if "text" in scopes:
            for page_idx in range(total_pages):
                page = doc[page_idx]
                page_text = page.get_text("text") or ""
                
                # --- OCR Fallback for Scanned PDFs ---
                if len(page_text.strip()) < 10:
                    try:
                        import pytesseract
                        from PIL import Image
                        # Use 150 DPI for a good balance of speed and OCR accuracy
                        pix = page.get_pixmap(dpi=150)
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        ocr_text = pytesseract.image_to_string(img)
                        if ocr_text:
                            page_text = ocr_text
                    except Exception as e:
                        pass # Ignore OCR errors and fallback to empty text
                # -------------------------------------

                lines = page_text.splitlines()

                for line_idx, line in enumerate(lines):
                    if pattern.search(line):
                        rects = page.search_for(q_str if not is_regex else line.strip())
                        first_rect = [round(c, 2) for c in rects[0]] if rects else [0, 0, 0, 0]

                        results.append({
                            "type": "Text Match",
                            "scope": "Text Content",
                            "page": page_idx + 1,
                            "snippet": line.strip(),
                            "rect": first_rect,
                            "detail": f"Line {line_idx + 1} on Page {page_idx + 1}"
                        })

        # ── 2. Search Document Metadata ───────────────────────────────────
        if "metadata" in scopes:
            meta = doc.metadata or {}
            for key, val in meta.items():
                if val and pattern.search(str(val)):
                    results.append({
                        "type": "Metadata Match",
                        "scope": "Document Metadata",
                        "page": 1,
                        "snippet": f"{key.capitalize()}: {val}",
                        "rect": [0, 0, 0, 0],
                        "detail": f"Property '{key}'"
                    })

        # ── 3. Search Bookmarks / Outlines ────────────────────────────────
        if "bookmarks" in scopes:
            toc = doc.get_toc() or []
            for item in toc:
                # item format: [level, title, page_number]
                if len(item) >= 2 and item[1]:
                    title = item[1]
                    p_num = item[2] if len(item) >= 3 else 1
                    if pattern.search(title):
                        results.append({
                            "type": "Bookmark Match",
                            "scope": "Bookmarks",
                            "page": p_num,
                            "snippet": f"Bookmark: {title}",
                            "rect": [0, 0, 0, 0],
                            "detail": f"Level {item[0]} Bookmark pointing to Page {p_num}"
                        })

        # ── 4. Search Annotations & Comments ──────────────────────────────
        if "comments" in scopes:
            for page_idx in range(total_pages):
                page = doc[page_idx]
                annots = page.annots()
                if annots:
                    for annot in annots:
                        content = annot.info.get("content", "") or annot.info.get("title", "")
                        if content and pattern.search(content):
                            results.append({
                                "type": "Annotation Match",
                                "scope": "Comments & Annotations",
                                "page": page_idx + 1,
                                "snippet": f"Comment: {content}",
                                "rect": [round(c, 2) for c in list(annot.rect)],
                                "detail": f"{annot.type[1]} annotation on Page {page_idx + 1}"
                            })

        # ── 5. Search Document Properties & Page Geometry ──────────────────
        if "properties" in scopes:
            props_str = f"Pages: {total_pages}, PDF Format: PDF {doc.metadata.get('format', '1.4')}, Is Encrypted: {doc.is_encrypted}"
            if pattern.search(props_str):
                results.append({
                    "type": "Property Match",
                    "scope": "Document Properties",
                    "page": 1,
                    "snippet": props_str,
                    "rect": [0, 0, 0, 0],
                    "detail": "Document Structure & Specification Property"
                })

        doc.close()

        return {
            "success": True,
            "filename": self.sanitize_filename(original_filename),
            "total_matches": len(results),
            "query": q_str,
            "is_regex": is_regex,
            "case_sensitive": case_sensitive,
            "results": results,
        }


advanced_search_service = AdvancedSearchService()
