"""
Insert Blank Page Service.

Provides complete business logic to generate and insert custom blank pages
into a PDF document while preserving links, outlines, annotations, and metadata.
"""

from __future__ import annotations

import logging
import shutil
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz

from app.core.paths import Paths
from app.utils.filename import output_filename

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data containers
# ---------------------------------------------------------------------------

class PDFAnalysis:
    """Holds structural analysis of the source PDF."""

    def __init__(self) -> None:
        self.page_count: int = 0
        self.file_size: int = 0
        self.pdf_version: str = ""
        self.width: float = 0.0
        self.height: float = 0.0
        self.orientation: str = "Portrait"
        self.has_bookmarks: bool = False
        self.has_metadata: bool = False
        self.has_page_labels: bool = False
        self.is_encrypted: bool = False
        self.is_corrupted: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "page_count": self.page_count,
            "file_size": self.file_size,
            "pdf_version": self.pdf_version,
            "width": round(self.width, 2),
            "height": round(self.height, 2),
            "orientation": self.orientation,
            "has_bookmarks": self.has_bookmarks,
            "has_metadata": self.has_metadata,
            "has_page_labels": self.has_page_labels,
        }


class InsertResult:
    """Holds the result details of blank page insertion."""

    def __init__(self) -> None:
        self.success: bool = False
        self.message: str = ""
        self.request_id: str = ""
        self.filename: str = ""
        self.download_url: str = ""
        self.original_pages: int = 0
        self.inserted_pages: int = 0
        self.total_pages: int = 0
        self.processed_size: int = 0
        self.processing_time: float = 0.0
        self.analysis: Dict[str, Any] = {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "message": self.message,
            "request_id": self.request_id,
            "filename": self.filename,
            "download_url": self.download_url,
            "original_pages": self.original_pages,
            "inserted_pages": self.inserted_pages,
            "total_pages": self.total_pages,
            "processed_size": self.processed_size,
            "processing_time": self.processing_time,
            "analysis": self.analysis,
        }


# ---------------------------------------------------------------------------
# Service Class
# ---------------------------------------------------------------------------

class InsertBlankPageService:
    """
    Business logic for inserting configurable blank pages into existing PDFs.
    """

    # Page size map in points (1 inch = 72 points)
    PAGE_SIZES = {
        "a4": (595.27, 841.89),
        "letter": (612.0, 792.0),
        "legal": (612.0, 1008.0),
        "a3": (841.89, 1190.55),
    }

    async def analyze(self, input_pdf: Path) -> PDFAnalysis:
        """Validate PDF and inspect page properties and outline."""
        logger.info("Analyzing PDF for blank page insertion: %s", input_pdf.name)
        analysis = PDFAnalysis()
        analysis.file_size = input_pdf.stat().st_size

        self._validate_pdf(input_pdf, analysis)
        if analysis.is_corrupted or analysis.is_encrypted:
            return analysis

        self._deep_analyze(input_pdf, analysis)
        return analysis

    async def process(
        self,
        input_pdf: Path,
        request_id: str,
        insert_mode: str = "after",       # beginning, end, before, after, between
        target_page: int = 1,             # 1-based page number for before/after/between
        target_page_end: Optional[int] = None, # for between mode
        blank_page_count: int = 1,
        page_size_name: str = "a4",       # a4, letter, legal, a3, custom
        custom_width: float = 595.27,
        custom_height: float = 841.89,
        orientation: str = "portrait",    # portrait, landscape
        bg_color_hex: str = "#ffffff",
        margin_preset: str = "standard",  # standard, narrow, wide, none, custom
        margin_top: float = 36.0,
        margin_bottom: float = 36.0,
        margin_left: float = 36.0,
        margin_right: float = 36.0,
        page_label_prefix: str = "",
        placeholder_text: str = "",
        preserve_metadata: bool = True,
        preserve_bookmarks: bool = True,
    ) -> InsertResult:
        """
        Create target blank pages and insert them at requested location.
        """
        start = time.perf_counter()
        logger.info(
            "Inserting blank pages [request_id=%s] mode=%s count=%d size=%s",
            request_id, insert_mode, blank_page_count, page_size_name,
        )

        result = InsertResult()
        result.request_id = request_id

        # 1. Validation & Analysis
        analysis = PDFAnalysis()
        analysis.file_size = input_pdf.stat().st_size
        self._validate_pdf(input_pdf, analysis)

        if analysis.is_corrupted:
            raise ValueError("Corrupted PDF: cannot open document structure.")
        if analysis.is_encrypted:
            raise ValueError("Password-protected PDF: cannot insert pages without password.")

        self._deep_analyze(input_pdf, analysis)
        result.analysis = analysis.to_dict()
        result.original_pages = analysis.page_count
        result.inserted_pages = blank_page_count
        result.total_pages = analysis.page_count + blank_page_count

        # 2. Validate Insertion Coordinates
        insert_index = self._get_insert_index(
            insert_mode=insert_mode,
            target_page=target_page,
            target_page_end=target_page_end,
            total_pages=analysis.page_count,
        )

        if blank_page_count < 1:
            raise ValueError("Blank page count must be at least 1.")

        # 3. Create Blank Pages Document
        tmp_blank = Path(tempfile.mktemp(suffix=".pdf"))
        self._create_blank_pages(
            dst_path=tmp_blank,
            count=blank_page_count,
            page_size_name=page_size_name,
            custom_width=custom_width,
            custom_height=custom_height,
            orientation=orientation,
            bg_color_hex=bg_color_hex,
            margin_preset=margin_preset,
            margin_top=margin_top,
            margin_bottom=margin_bottom,
            margin_left=margin_left,
            margin_right=margin_right,
            placeholder_text=placeholder_text,
        )

        # 4. Perform Insertion and Outline Shifting
        tmp_out = Path(tempfile.mktemp(suffix=".pdf"))
        try:
            with fitz.open(str(input_pdf)) as src_doc, fitz.open(str(tmp_blank)) as blank_doc:
                out_doc = fitz.open()

                # Insert original preceding pages
                if insert_index > 0:
                    out_doc.insert_pdf(src_doc, from_page=0, to_page=insert_index - 1)

                # Insert new blank pages
                out_doc.insert_pdf(blank_doc, from_page=0, to_page=blank_page_count - 1)

                # Insert original remaining pages
                if insert_index < analysis.page_count:
                    out_doc.insert_pdf(src_doc, from_page=insert_index, to_page=analysis.page_count - 1)

                # Realign Outline Bookmarks
                if preserve_bookmarks:
                    try:
                        toc = src_doc.get_toc()
                        if toc:
                            adjusted_toc = self._shift_toc_references(toc, insert_index, blank_page_count)
                            out_doc.set_toc(adjusted_toc)
                    except Exception as exc:
                        logger.warning("Could not preserve bookmarks: %s", exc)

                # Metadata
                if preserve_metadata:
                    out_doc.set_metadata(src_doc.metadata)

                # Save document
                out_doc.save(
                    str(tmp_out),
                    garbage=4,
                    deflate=True,
                )
                out_doc.close()

            # 5. Output Verification
            self._validate_output(tmp_out, result.total_pages)

            # 6. Save to final destination
            out_dir = Paths.request_output(request_id)
            out_name = output_filename(prefix="inserted_")
            out_path = out_dir / out_name
            shutil.move(str(tmp_out), str(out_path))

            processed_size = out_path.stat().st_size
            proc_time = round(time.perf_counter() - start, 2)

            result.success = True
            result.message = (
                f"Successfully inserted {blank_page_count} blank page(s). "
                f"Total page count is now {result.total_pages}."
            )
            result.filename = out_name
            result.download_url = f"/api/pdf/insert-blank-page/download/{request_id}/{out_name}"
            result.processed_size = processed_size
            result.processing_time = proc_time

            logger.info(
                "Blank page insertion complete [request_id=%s] output size=%d pages=%d in %.2fs",
                request_id, processed_size, result.total_pages, proc_time,
            )
            return result

        except Exception:
            logger.exception("Blank page insertion failed [request_id=%s]", request_id)
            raise
        finally:
            self._cleanup([tmp_blank, tmp_out])

    # ------------------------------------------------------------------
    # Backend Utilities
    # ------------------------------------------------------------------

    def _validate_pdf(self, path: Path, analysis: PDFAnalysis) -> None:
        """Validate basic file type and encryption status."""
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        with open(path, "rb") as fh:
            header = fh.read(5)
        if header != b"%PDF-":
            analysis.is_corrupted = True
            raise ValueError("Invalid file structure: file is not a valid PDF.")

        try:
            with fitz.open(str(path)) as doc:
                if doc.needs_pass:
                    analysis.is_encrypted = True
                    return
                _ = doc.page_count
        except fitz.FileDataError:
            analysis.is_corrupted = True
            raise ValueError("Corrupted PDF data.")
        except Exception as exc:
            analysis.is_corrupted = True
            raise ValueError(f"PDF validation failed: {exc}") from exc

    def _deep_analyze(self, path: Path, analysis: PDFAnalysis) -> None:
        """Inspect page dimensions, orientation, outline, labels and metadata."""
        with fitz.open(str(path)) as doc:
            analysis.page_count = doc.page_count
            fmt = (doc.metadata or {}).get("format", "")
            analysis.pdf_version = fmt if fmt else "Unknown"

            # Dimensions of the first page
            if doc.page_count > 0:
                first_page = doc[0]
                rect = first_page.rect
                analysis.width = rect.width
                analysis.height = rect.height
                analysis.orientation = "Landscape" if rect.width > rect.height else "Portrait"

            # Bookmarks
            try:
                toc = doc.get_toc()
                analysis.has_bookmarks = bool(toc)
            except Exception:
                analysis.has_bookmarks = False

            # Metadata
            meta = doc.metadata or {}
            analysis.has_metadata = bool([v for v in meta.values() if v])

            # Labels
            try:
                labels = doc.get_page_labels()
                analysis.has_page_labels = bool(labels)
            except Exception:
                analysis.has_page_labels = False

    def _get_insert_index(
        self,
        insert_mode: str,
        target_page: int,
        target_page_end: Optional[int],
        total_pages: int,
    ) -> int:
        """
        Determine the 0-based insertion index index.
        Beginning: index 0.
        End: index total_pages.
        Before Selected Page: page - 1.
        After Selected Page: page.
        Between Pages: average or split index.
        """
        mode = insert_mode.lower()
        if mode == "beginning":
            return 0
        elif mode == "end":
            return total_pages
        elif mode == "before":
            if not (1 <= target_page <= total_pages):
                raise ValueError(f"Page number {target_page} is outside the document.")
            return target_page - 1
        elif mode == "after":
            if not (1 <= target_page <= total_pages):
                raise ValueError(f"Page number {target_page} is outside the document.")
            return target_page
        elif mode == "between":
            if target_page_end is None:
                target_page_end = target_page + 1
            if not (1 <= target_page <= total_pages) or not (1 <= target_page_end <= total_pages):
                raise ValueError("Target pages for insertion are outside the document.")
            # Insert immediately after the first page in the gap
            return min(target_page, target_page_end)
        else:
            raise ValueError(f"Unsupported insertion mode: '{insert_mode}'.")

    # ------------------------------------------------------------------
    # Blank Page Generator
    # ------------------------------------------------------------------

    def _create_blank_pages(
        self,
        dst_path: Path,
        count: int,
        page_size_name: str,
        custom_width: float,
        custom_height: float,
        orientation: str,
        bg_color_hex: str,
        margin_preset: str,
        margin_top: float,
        margin_bottom: float,
        margin_left: float,
        margin_right: float,
        placeholder_text: str,
    ) -> None:
        """
        Generate a temporary PDF containing target blank pages painted with background colors.
        """
        # Determine base size
        name = page_size_name.lower()
        if name in self.PAGE_SIZES:
            width, height = self.PAGE_SIZES[name]
        else:
            width, height = custom_width, custom_height

        # Apply orientation
        if orientation.lower() == "landscape":
            if width < height:
                width, height = height, width
        else:
            if width > height:
                width, height = height, width

        # Resolve margins preset
        preset = margin_preset.lower()
        if preset == "standard":
            m_top = m_bottom = m_left = m_right = 36.0  # 0.5 inch
        elif preset == "narrow":
            m_top = m_bottom = m_left = m_right = 18.0  # 0.25 inch
        elif preset == "wide":
            m_top = m_bottom = m_left = m_right = 54.0  # 0.75 inch
        elif preset == "none":
            m_top = m_bottom = m_left = m_right = 0.0
        else:
            m_top, m_bottom, m_left, m_right = margin_top, margin_bottom, margin_left, margin_right

        # Parse RGB color
        rgb = self._hex_to_rgb(bg_color_hex)

        # Draw document
        doc = fitz.open()
        for _ in range(count):
            page = doc.new_page(width=width, height=height)

            # Paint background color
            if bg_color_hex.lower() != "#ffffff":
                page.draw_rect(page.rect, color=rgb, fill=rgb, overlay=False)

            # Insert placeholder text
            if placeholder_text:
                # Place text centered in the margin-restricted zone
                text_rect = fitz.Rect(m_left, m_top, width - m_right, height - m_bottom)
                try:
                    # Draw text in the middle
                    page.insert_textbox(
                        text_rect,
                        placeholder_text,
                        fontsize=12,
                        color=(0.5, 0.5, 0.5) if rgb[0] > 0.4 else (0.9, 0.9, 0.9),
                        align=fitz.TEXT_ALIGN_CENTER,
                    )
                except Exception as exc:
                    logger.debug("Could not insert textbox: %s", exc)

        doc.save(str(dst_path))
        doc.close()

    @staticmethod
    def _hex_to_rgb(hex_str: str) -> Tuple[float, float, float]:
        """Convert hex color string (e.g. '#2563eb') to RGB floats (0.0 to 1.0)."""
        hex_str = hex_str.lstrip("#")
        if len(hex_str) != 6:
            return (1.0, 1.0, 1.0)
        try:
            r = int(hex_str[0:2], 16) / 255.0
            g = int(hex_str[2:4], 16) / 255.0
            b = int(hex_str[4:6], 16) / 255.0
            return (r, g, b)
        except Exception:
            return (1.0, 1.0, 1.0)

    # ------------------------------------------------------------------
    # Bookmark outline Shifting
    # ------------------------------------------------------------------

    def _shift_toc_references(
        self,
        toc: List[List[Any]],
        insert_index: int,
        offset: int,
    ) -> List[List[Any]]:
        """
        Shift outlines referencing pages at or after insertion index by the offset count.
        """
        shifted = []
        for item in toc:
            if len(item) >= 3:
                level, title, page = item[0], item[1], item[2]
                if page > 0:
                    page_idx = page - 1
                    # Shift if page index is at or after insertion point
                    new_page = page + offset if page_idx >= insert_index else page
                    new_item = list(item)
                    new_item[2] = new_page
                    shifted.append(new_item)
                else:
                    shifted.append(item)
            else:
                shifted.append(item)
        return shifted

    # ------------------------------------------------------------------
    # Verification & Cleanup
    # ------------------------------------------------------------------

    def _validate_output(self, path: Path, expected_pages: int) -> None:
        """Verify output PDF exists and has correct page count."""
        if not path.exists() or path.stat().st_size < 64:
            raise ValueError("Insertion failed: output file is empty.")

        try:
            with fitz.open(str(path)) as doc:
                if doc.page_count != expected_pages:
                    raise ValueError(
                        f"Output verification failed: expected {expected_pages} pages, "
                        f"but output document has {doc.page_count} pages."
                    )
                _ = doc[0].get_text()
        except Exception as exc:
            raise ValueError(f"Output verification failed: {exc}") from exc

    @staticmethod
    def _cleanup(paths: List[Path]) -> None:
        for p in paths:
            try:
                if p.exists():
                    p.unlink()
            except Exception:
                pass


# Singleton instance
_insert_blank_page_service = InsertBlankPageService()
