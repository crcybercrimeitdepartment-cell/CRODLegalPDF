"""
Table of Contents (TOC) Service — Document Management Section.

Generates and inserts a visual, clickable Table of Contents (TOC) page into PDF documents:
Features:
  - Automatic heading detection based on font size and text layout analysis
  - Manual TOC entry creation and page target assignment
  - Custom insertion position (e.g. Page 1, Page 2)
  - Automatic dotted leaders and page alignment
  - Direct internal hyperlinking from TOC items to target document pages
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


class TableOfContentsService:
    """Enterprise service for generating and embedding Table of Contents (TOC) in PDF documents."""

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and unsafe characters."""
        if not filename:
            return "document.pdf"
        clean = Path(filename).name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document.pdf"

    def auto_detect_headings(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Scan PDF document text for prospective headings using font size and heading pattern heuristics.
        """
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError("File size exceeds maximum limit of 100 MB.")
        if not pdf_bytes.startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = len(doc)
        detected_entries: List[Dict[str, Any]] = []
        entry_id = 1

        for page_idx in range(total_pages):
            page = doc[page_idx]
            blocks = page.get_text("dict").get("blocks", [])

            for b in blocks:
                if "lines" not in b:
                    continue
                for l in b["lines"]:
                    for s in l.get("spans", []):
                        text = s.get("text", "").strip()
                        size = s.get("size", 10)
                        flags = s.get("flags", 0)

                        # Heading heuristics: larger font or bold or matching heading patterns
                        is_bold = bool(flags & 2) or ("bold" in s.get("font", "").lower())
                        is_large = size >= 13.0

                        match_heading_pattern = bool(re.match(r"^(chapter|section|part|\d+\.|\d+\.\d+)\b", text, re.IGNORECASE))

                        if (is_large or (is_bold and len(text) > 3) or match_heading_pattern) and len(text) <= 120:
                            level = 1 if size >= 16 else (2 if size >= 13 else 3)
                            detected_entries.append({
                                "id": entry_id,
                                "level": level,
                                "title": text,
                                "page": page_idx + 1,
                            })
                            entry_id += 1

        doc.close()

        # Fallback if no headings detected
        if not detected_entries:
            for p in range(1, min(total_pages + 1, 10)):
                detected_entries.append({
                    "id": p,
                    "level": 1,
                    "title": f"Section Page {p}",
                    "page": p,
                })

        return {
            "success": True,
            "total_pages": total_pages,
            "total_headings": len(detected_entries),
            "headings": detected_entries,
        }

    def generate_toc_page(
        self,
        session_id: str,
        pdf_bytes: bytes,
        original_filename: str,
        toc_entries: List[Dict[str, Any]],
        insert_position: int = 1,
    ) -> Dict[str, Any]:
        """
        Generate a visual Table of Contents page and insert it into the PDF document.
        """
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = len(doc)
        insert_idx = max(0, min(total_pages, insert_position - 1))

        # Create new blank TOC page
        toc_page = doc.new_page(pno=insert_idx, width=595, height=842) # A4 dimensions

        # Draw Header
        toc_page.insert_textbox(
            fitz.Rect(50, 40, 545, 90),
            "TABLE OF CONTENTS",
            fontsize=20,
            fontname="helv",
            color=(0.1, 0.2, 0.5),
            align=1,
        )
        toc_page.draw_line(fitz.Point(50, 95), fitz.Point(545, 95), color=(0.1, 0.2, 0.5), width=1.5)

        y_pos = 120
        toc_tree: List[List[Any]] = []

        for item in toc_entries:
            title = str(item.get("title", "")).strip()
            if not title:
                continue
            level = max(1, min(3, int(item.get("level", 1))))
            page_num = max(1, min(total_pages, int(item.get("page", 1))))

            # Adjust page number offset since a page was inserted
            actual_target_page = page_num + 1 if page_num > insert_idx else page_num
            toc_tree.append([level, title, actual_target_page])

            if y_pos < 780:
                indent = (level - 1) * 20
                rect_title = fitz.Rect(50 + indent, y_pos, 440, y_pos + 20)
                rect_page = fitz.Rect(480, y_pos, 545, y_pos + 20)

                # Draw Title & Page Number
                toc_page.insert_textbox(rect_title, title, fontsize=10, fontname="helv", color=(0.1, 0.1, 0.1), align=0)
                toc_page.insert_textbox(rect_page, str(actual_target_page), fontsize=10, fontname="helv", color=(0.1, 0.2, 0.5), align=2)

                # Draw Dotted Leader Line
                dots_line = ". " * int((470 - (50 + indent + len(title) * 5)) / 8)
                if len(dots_line) > 2:
                    toc_page.insert_textbox(fitz.Rect(50 + indent + len(title) * 6 + 10, y_pos, 475, y_pos + 20), dots_line, fontsize=8, color=(0.6, 0.6, 0.6))

                # Add clickable link on TOC entry pointing to target page
                link_rect = fitz.Rect(50 + indent, y_pos, 545, y_pos + 18)
                link_dict = {"kind": fitz.LINK_GOTO, "from": link_rect, "page": actual_target_page - 1}
                toc_page.insert_link(link_dict)

                y_pos += 24

        # Update PDF outline / bookmarks
        doc.set_toc(toc_tree)

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)

        clean_filename = self.sanitize_filename(original_filename)
        out_filename = f"toc_{clean_filename}"
        out_path = out_dir / out_filename

        output_bytes = doc.write()
        doc.close()

        out_path.write_bytes(output_bytes)

        return {
            "success": True,
            "session_id": session_id,
            "original_filename": clean_filename,
            "saved_filename": out_filename,
            "total_entries": len(toc_tree),
            "inserted_at_page": insert_idx + 1,
            "download_url": f"/document-management/table-of-contents/download/{session_id}",
        }

    def get_toc_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        """Retrieve output PDF for download."""
        out_dir = Paths.request_output(session_id)
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()] if out_dir.exists() else []
        if not files:
            raise ValueError("TOC PDF file not found for this session.")
        return files[0], files[0].name


table_of_contents_service = TableOfContentsService()
