"""
Print Multiple Pages per Sheet Service — Document Management Section.

N-up / imposition PDF layout tool:
  - Place multiple PDF pages onto single output sheets
  - Configurable pages-per-sheet (2, 4, 6, 8, 9, 16, custom)
  - Paper sizes: A4, A3, Letter, Legal, custom (mm)
  - Orientation: portrait, landscape, auto
  - Page order: left-to-right, right-to-left, top-to-bottom
  - Adjustable margins and spacing between pages
  - Fit-to-area scaling preserving aspect ratio
  - Optional page borders and crop marks
  - Preview layout as JSON grid
  - Generate print-ready PDF
  - Download generated PDF
"""

from __future__ import annotations

import logging
import math
import uuid
from pathlib import Path
from typing import Any, Dict, List, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024

PAPER_SIZES_MM = {
    "a4": (210, 297),
    "a3": (297, 420),
    "letter": (215.9, 279.4),
    "legal": (215.9, 355.6),
    "a5": (148, 210),
    "tabloid": (279.4, 431.8),
}

MM_TO_PT = 72 / 25.4  # 1mm = 2.8346 pt


def _mm_to_pt(mm: float) -> float:
    return mm * MM_TO_PT


class PrintMultiplePagesPerSheetService:
    """Service for N-up PDF layout generation."""

    def validate_pdf(self, pdf_bytes: bytes) -> fitz.Document:
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            size_mb = len(pdf_bytes) / (1024 * 1024)
            raise ValueError(f"File size ({size_mb:.1f} MB) exceeds 100 MB limit.")
        if not pdf_bytes.startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception:
            raise ValueError("Corrupted or unreadable PDF document.")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF is encrypted or password-protected.")
        return doc

    def parse_page_range(self, page_range: str, total_pages: int) -> List[int]:
        if not page_range or not page_range.strip():
            return list(range(total_pages))
        pages = set()
        for part in page_range.split(","):
            part = part.strip()
            if "-" in part:
                start_s, end_s = part.split("-", 1)
                try:
                    start = int(start_s.strip())
                    end = int(end_s.strip())
                except ValueError:
                    continue
                for p in range(max(1, start), min(total_pages, end) + 1):
                    pages.add(p - 1)  # 0-indexed
            else:
                try:
                    p = int(part.strip())
                    if 1 <= p <= total_pages:
                        pages.add(p - 1)
                except ValueError:
                    continue
        return sorted(pages)

    def _get_paper_dims(self, paper_size: str, custom_width_mm: float, custom_height_mm: float) -> Tuple[float, float]:
        """Return paper width/height in points."""
        if paper_size == "custom":
            if custom_width_mm <= 0 or custom_height_mm <= 0:
                raise ValueError("Custom paper size requires positive width and height in mm.")
            return _mm_to_pt(custom_width_mm), _mm_to_pt(custom_height_mm)
        if paper_size not in PAPER_SIZES_MM:
            raise ValueError(f"Unknown paper size: {paper_size}")
        w, h = PAPER_SIZES_MM[paper_size]
        return _mm_to_pt(w), _mm_to_pt(h)

    def _resolve_orientation(self, orientation: str, paper_w: float, paper_h: float) -> Tuple[float, float]:
        """Return (sheet_w, sheet_h) based on orientation."""
        if orientation == "auto":
            return (paper_w, paper_h) if paper_h >= paper_w else (paper_h, paper_w)
        if orientation == "landscape":
            return (max(paper_w, paper_h), min(paper_w, paper_h))
        return (min(paper_w, paper_h), max(paper_w, paper_h))  # portrait

    def compute_grid(self, n_pages: int, pages_per_sheet: int) -> Dict[str, Any]:
        """Compute grid rows/cols for given pages-per-sheet."""
        if pages_per_sheet <= 0:
            raise ValueError("Pages per sheet must be positive.")
        if pages_per_sheet == 1:
            cols, rows = 1, 1
        elif pages_per_sheet == 2:
            cols, rows = 2, 1
        elif pages_per_sheet == 4:
            cols, rows = 2, 2
        elif pages_per_sheet == 6:
            cols, rows = 3, 2
        elif pages_per_sheet == 8:
            cols, rows = 4, 2
        elif pages_per_sheet == 9:
            cols, rows = 3, 3
        elif pages_per_sheet == 16:
            cols, rows = 4, 4
        else:
            cols = math.ceil(math.sqrt(pages_per_sheet))
            rows = math.ceil(pages_per_sheet / cols)

        n_sheets = math.ceil(n_pages / pages_per_sheet)
        full_cells = n_pages
        last_sheet_pages = n_pages % pages_per_sheet
        if last_sheet_pages == 0:
            last_sheet_pages = pages_per_sheet

        return {
            "cols": cols,
            "rows": rows,
            "cells": cols * rows,
            "pages_per_sheet": pages_per_sheet,
            "n_sheets": n_sheets,
            "total_pages": n_pages,
            "last_sheet_pages": last_sheet_pages,
        }

    def preview_layout(
        self,
        pdf_bytes: bytes,
        page_range: str = "",
        pages_per_sheet: int = 4,
        paper_size: str = "a4",
        orientation: str = "portrait",
        order: str = "ltr",
        margin_mm: float = 10,
        spacing_mm: float = 5,
        custom_width_mm: float = 0,
        custom_height_mm: float = 0,
    ) -> Dict[str, Any]:
        """Return layout preview info without generating PDF."""
        doc = self.validate_pdf(pdf_bytes)
        page_indices = self.parse_page_range(page_range, doc.page_count)
        n_pages = len(page_indices)

        total_doc_pages = doc.page_count

        if n_pages == 0:
            doc.close()
            raise ValueError("No valid pages in the specified range.")

        # Get sample page aspect ratio while doc is open
        sample_page = doc[page_indices[0]]
        page_rect = sample_page.rect
        page_aspect = page_rect.width / page_rect.height
        doc.close()

        grid = self.compute_grid(n_pages, pages_per_sheet)
        paper_w, paper_h = self._get_paper_dims(paper_size, custom_width_mm, custom_height_mm)
        sheet_w, sheet_h = self._resolve_orientation(orientation, paper_w, paper_h)

        margin_pt = _mm_to_pt(margin_mm)
        spacing_pt = _mm_to_pt(spacing_mm)

        usable_w = sheet_w - 2 * margin_pt
        usable_h = sheet_h - 2 * margin_pt

        cell_w = (usable_w - (grid["cols"] - 1) * spacing_pt) / grid["cols"]
        cell_h = (usable_h - (grid["rows"] - 1) * spacing_pt) / grid["rows"]

        # Fit page into cell preserving aspect ratio
        cell_aspect = cell_w / cell_h
        if page_aspect > cell_aspect:
            display_w = cell_w
            display_h = cell_w / page_aspect
        else:
            display_h = cell_h
            display_w = cell_h * page_aspect

        return {
            "success": True,
            "n_pages": n_pages,
            "grid": grid,
            "sheet_width_pt": round(sheet_w, 1),
            "sheet_height_pt": round(sheet_h, 1),
            "cell_width_pt": round(cell_w, 1),
            "cell_height_pt": round(cell_h, 1),
            "display_width_pt": round(display_w, 1),
            "display_height_pt": round(display_h, 1),
            "margin_pt": round(margin_pt, 1),
            "spacing_pt": round(spacing_pt, 1),
            "paper_size": paper_size,
            "orientation": orientation,
            "order": order,
            "page_range": page_range or f"1-{total_doc_pages}",
        }

    def generate_pdf(
        self,
        pdf_bytes: bytes,
        session_id: str,
        page_range: str = "",
        pages_per_sheet: int = 4,
        paper_size: str = "a4",
        orientation: str = "portrait",
        order: str = "ltr",
        margin_mm: float = 10,
        spacing_mm: float = 5,
        show_borders: bool = False,
        show_crop_marks: bool = False,
        custom_width_mm: float = 0,
        custom_height_mm: float = 0,
        output_name: str = "",
    ) -> Dict[str, Any]:
        """Generate N-up print-ready PDF."""
        src_doc = self.validate_pdf(pdf_bytes)
        page_indices = self.parse_page_range(page_range, src_doc.page_count)
        n_pages = len(page_indices)

        if n_pages == 0:
            src_doc.close()
            raise ValueError("No valid pages in the specified range.")

        grid = self.compute_grid(n_pages, pages_per_sheet)
        paper_w, paper_h = self._get_paper_dims(paper_size, custom_width_mm, custom_height_mm)
        sheet_w, sheet_h = self._resolve_orientation(orientation, paper_w, paper_h)

        margin_pt = _mm_to_pt(margin_mm)
        spacing_pt = _mm_to_pt(spacing_mm)

        usable_w = sheet_w - 2 * margin_pt
        usable_h = sheet_h - 2 * margin_pt

        cell_w = (usable_w - (grid["cols"] - 1) * spacing_pt) / grid["cols"]
        cell_h = (usable_h - (grid["rows"] - 1) * spacing_pt) / grid["rows"]

        out_doc = fitz.open()

        for sheet_idx in range(grid["n_sheets"]):
            start = sheet_idx * pages_per_sheet
            end = min(start + pages_per_sheet, n_pages)
            sheet_page_indices = page_indices[start:end]

            # Order pages
            ordered = self._order_pages(sheet_page_indices, grid["cols"], grid["rows"], order)

            page = out_doc.new_page(width=sheet_w, height=sheet_h)

            for idx, page_num in enumerate(ordered):
                if idx >= grid["cells"]:
                    break
                row = idx // grid["cols"]
                col = idx % grid["cols"]

                # Cell position
                x = margin_pt + col * (cell_w + spacing_pt)
                y = margin_pt + row * (cell_h + spacing_pt)

                # Source page
                src_page = src_doc[page_num]
                src_rect = src_page.rect

                # Fit into cell preserving aspect ratio
                src_aspect = src_rect.width / src_rect.height
                cell_aspect = cell_w / cell_h
                if src_aspect > cell_aspect:
                    draw_w = cell_w
                    draw_h = cell_w / src_aspect
                else:
                    draw_h = cell_h
                    draw_w = cell_h * src_aspect

                # Center in cell
                cx = x + (cell_w - draw_w) / 2
                cy = y + (cell_h - draw_h) / 2
                dest_rect = fitz.Rect(cx, cy, cx + draw_w, cy + draw_h)

                page.show_pdf_page(dest_rect, src_doc, page_num, fitz.Matrix(1, 1))

                # Optional border
                if show_borders:
                    border_rect = fitz.Rect(x, y, x + cell_w, y + cell_h)
                    shape = page.new_shape()
                    shape.draw_rect(border_rect)
                    shape.finish(color=(0.6, 0.6, 0.6), width=0.5)
                    shape.commit()

            # Optional crop marks
            if show_crop_marks:
                self._draw_crop_marks(page, margin_pt, sheet_w, sheet_h, spacing_pt, grid, cell_w, cell_h)

        # Save
        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)

        if not output_name:
            output_name = "nup_layout.pdf"
        if not output_name.lower().endswith(".pdf"):
            output_name += ".pdf"

        out_path = out_dir / output_name
        output_bytes = out_doc.write()
        out_doc.close()
        src_doc.close()

        out_path.write_bytes(output_bytes)

        return {
            "success": True,
            "output_filename": output_name,
            "n_pages": n_pages,
            "n_sheets": grid["n_sheets"],
            "pages_per_sheet": pages_per_sheet,
            "grid": f"{grid['cols']}x{grid['rows']}",
            "file_size": len(output_bytes),
            "download_url": f"/document-management/multi-page-sheet/download/{session_id}",
        }

    def _order_pages(
        self,
        page_indices: List[int],
        cols: int,
        rows: int,
        order: str,
    ) -> List[int]:
        """Arrange page indices into grid order."""
        grid_positions = []
        for r in range(rows):
            for c in range(cols):
                grid_positions.append((r, c))

        # Sort by order
        if order == "rtl":
            grid_positions.sort(key=lambda rc: (rc[0], -rc[1]))
        elif order == "ttb":
            grid_positions.sort(key=lambda rc: (rc[1], rc[0]))
        elif order == "rtl-ttb":
            grid_positions.sort(key=lambda rc: (-rc[1], rc[0]))
        else:  # ltr (default)
            grid_positions.sort(key=lambda rc: (rc[0], rc[1]))

        ordered = []
        for pos in grid_positions:
            idx = pos[0] * cols + pos[1]
            if idx < len(page_indices):
                ordered.append(page_indices[idx])
            else:
                ordered.append(-1)  # empty cell

        return [p for p in ordered if p >= 0]

    def _draw_crop_marks(
        self, page: fitz.Page, margin: float, sheet_w: float, sheet_h: float,
        spacing: float, grid: Dict, cell_w: float, cell_h: float,
    ) -> None:
        """Draw crop marks at page boundaries."""
        shape = page.new_shape()
        mark_len = 6  # points
        offset = 2  # points from cell edge

        for r in range(grid["rows"] + 1):
            for c in range(grid["cols"] + 1):
                x = margin + c * (cell_w + spacing) - offset
                y = margin + r * (cell_h + spacing) - offset

                # Top-left corner marks
                if r == 0 and c == 0:
                    continue

                # Horizontal mark
                if c > 0 and c <= grid["cols"]:
                    shape.draw_line(fitz.Point(x, y - mark_len), fitz.Point(x, y - offset))
                    shape.draw_line(fitz.Point(x, y + offset), fitz.Point(x, y + mark_len))

                # Vertical mark
                if r > 0 and r <= grid["rows"]:
                    shape.draw_line(fitz.Point(x - mark_len, y), fitz.Point(x - offset, y))
                    shape.draw_line(fitz.Point(x + offset, y), fitz.Point(x + mark_len, y))

        shape.finish(color=(0, 0, 0), width=0.3)
        shape.commit()

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Output PDF not found for this session.")
        return files[0], files[0].name


print_multiple_pages_per_sheet_service = PrintMultiplePagesPerSheetService()
