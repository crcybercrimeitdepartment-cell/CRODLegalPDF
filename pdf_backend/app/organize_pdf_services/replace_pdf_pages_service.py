"""
Replace PDF Pages Service.

Provides backend business logic to replace pages of an original PDF
with pages from a replacement PDF, with support for advanced page scaling,
bookmarks adjustments, metadata retention, and link/annotation coordinates scaling.
"""

from __future__ import annotations

import logging
import shutil
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import fitz

from app.core.paths import Paths
from app.utils.filename import output_filename

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data containers
# ---------------------------------------------------------------------------

class PDFAnalysis:
    """Analysis profile of a PDF document."""

    def __init__(self) -> None:
        self.page_count: int = 0
        self.file_size: int = 0
        self.pdf_version: str = "Unknown"
        self.width: float = 0.0
        self.height: float = 0.0
        self.orientation: str = "Portrait"
        self.has_bookmarks: bool = False
        self.has_metadata: bool = False
        self.has_hyperlinks: bool = False
        self.has_annotations: bool = False
        self.has_page_labels: bool = False

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
            "has_hyperlinks": self.has_hyperlinks,
            "has_annotations": self.has_annotations,
            "has_page_labels": self.has_page_labels,
        }


class ReplaceResult:
    """Response details of replace PDF operation."""

    def __init__(self) -> None:
        self.success: bool = False
        self.message: str = ""
        self.request_id: str = ""
        self.filename: str = ""
        self.download_url: str = ""
        self.original_pages: int = 0
        self.replacement_pages: int = 0
        self.final_pages: int = 0
        self.processed_size: int = 0
        self.processing_time: float = 0.0
        self.orig_analysis: Dict[str, Any] = {}
        self.repl_analysis: Dict[str, Any] = {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "message": self.message,
            "request_id": self.request_id,
            "filename": self.filename,
            "download_url": self.download_url,
            "original_pages": self.original_pages,
            "replacement_pages": self.replacement_pages,
            "final_pages": self.final_pages,
            "processed_size": self.processed_size,
            "processing_time": self.processing_time,
            "orig_analysis": self.orig_analysis,
            "repl_analysis": self.repl_analysis,
        }


# ---------------------------------------------------------------------------
# Replace PDF Pages Service
# ---------------------------------------------------------------------------

class ReplacePDFPagesService:
    """Handles deep original & replacement PDF validation, parsing ranges, scaling contents, and mapping pages."""

    async def analyze(self, pdf_path: Path) -> PDFAnalysis:
        """Validate PDF signature and inspect structural details."""
        analysis = PDFAnalysis()
        analysis.file_size = pdf_path.stat().st_size

        # Validate PDF signature
        with open(pdf_path, "rb") as fh:
            header = fh.read(5)
        if header != b"%PDF-":
            raise ValueError(f"Invalid file: {pdf_path.name} is not a valid PDF document.")

        try:
            with fitz.open(str(pdf_path)) as doc:
                if doc.needs_pass:
                    raise ValueError(f"Password-protected: {pdf_path.name} is encrypted.")
                analysis.page_count = doc.page_count
                if doc.page_count == 0:
                    raise ValueError(f"Empty PDF: {pdf_path.name} has no pages.")

                fmt = (doc.metadata or {}).get("format", "")
                analysis.pdf_version = fmt if fmt else "Unknown"

                # Get dimensions of first page
                first_page = doc[0]
                rect = first_page.rect
                analysis.width = rect.width
                analysis.height = rect.height
                analysis.orientation = "Landscape" if rect.width > rect.height else "Portrait"

                # Bookmarks / TOC
                analysis.has_bookmarks = bool(doc.get_toc())

                # Metadata check
                meta = doc.metadata or {}
                analysis.has_metadata = bool([v for v in meta.values() if v])

                # Check annotations and links on first few pages (optimize performance)
                has_links = False
                has_annots = False
                sample_limit = min(5, doc.page_count)
                for i in range(sample_limit):
                    p = doc[i]
                    if p.get_links():
                        has_links = True
                    if p.first_annot:
                        has_annots = True
                    if has_links and has_annots:
                        break

                analysis.has_hyperlinks = has_links
                analysis.has_annotations = has_annots

                # Labels
                try:
                    labels = doc.get_page_labels()
                    analysis.has_page_labels = bool(labels)
                except Exception:
                    analysis.has_page_labels = False

        except fitz.FileDataError as exc:
            raise ValueError(f"Corrupted file: {pdf_path.name} cannot be read.") from exc
        except Exception as exc:
            raise ValueError(f"Validation failed on {pdf_path.name}: {exc}") from exc

        return analysis

    async def process(
        self,
        orig_pdf: Path,
        repl_pdf: Path,
        request_id: str,
        mapping: List[Dict[str, int]],  # [{"orig": 1, "repl": 3}] (1-based indices)
        size_mode: str = "fit",          # auto, fit, stretch, center, keep
        preserve_bookmarks: bool = True,
        preserve_metadata: bool = True,
        preserve_labels: bool = True,
        preserve_hyperlinks: bool = True,
        preserve_annotations: bool = True,
    ) -> ReplaceResult:
        """
        Process page replacement on original PDF using replacement PDF indices and scaling settings.
        """
        start = time.perf_counter()
        result = ReplaceResult()
        result.request_id = request_id

        # Analyze both files
        orig_analysis = await self.analyze(orig_pdf)
        repl_analysis = await self.analyze(repl_pdf)

        result.orig_analysis = orig_analysis.to_dict()
        result.repl_analysis = repl_analysis.to_dict()
        result.original_pages = orig_analysis.page_count
        result.replacement_pages = repl_analysis.page_count

        if not mapping:
            raise ValueError("Mapping cannot be empty. Please map at least one page.")

        # Parse mapping into dictionaries: {orig_0_idx: repl_0_idx}
        # Validate page indices
        mapped_orig = {}
        for row in mapping:
            orig_page = row.get("orig")
            repl_page = row.get("repl")
            if not orig_page or not repl_page:
                raise ValueError("Invalid mapping row entries.")
            if not (1 <= orig_page <= orig_analysis.page_count):
                raise ValueError(f"Original target page {orig_page} is out of bounds (1-{orig_analysis.page_count}).")
            if not (1 <= repl_page <= repl_analysis.page_count):
                raise ValueError(f"Replacement page {repl_page} is out of bounds (1-{repl_analysis.page_count}).")
            mapped_orig[orig_page - 1] = repl_page - 1

        # Replace Pages Process
        tmp_out = Path(tempfile.mktemp(suffix=".pdf"))
        try:
            with fitz.open(str(orig_pdf)) as orig_doc, fitz.open(str(repl_pdf)) as repl_doc:
                out_doc = fitz.open()

                for i in range(orig_analysis.page_count):
                    if i in mapped_orig:
                        # Perform page replacement
                        repl_page_idx = mapped_orig[i]
                        orig_page = orig_doc[i]
                        repl_page = repl_doc[repl_page_idx]

                        mode = size_mode.lower()
                        # Resolve auto sizing
                        if mode == "auto":
                            # If aspect ratio is close, fit it. Else keep size.
                            orig_ratio = orig_page.rect.width / orig_page.rect.height
                            repl_ratio = repl_page.rect.width / repl_page.rect.height
                            if abs(orig_ratio - repl_ratio) < 0.1:
                                mode = "fit"
                            else:
                                mode = "keep"

                        if mode == "keep":
                            # Create page with replacement size
                            out_page = out_doc.new_page(
                                width=repl_page.rect.width,
                                height=repl_page.rect.height
                            )
                            # Copy links & annotations directly without offset scaling
                            if preserve_hyperlinks:
                                self._copy_links(repl_page, out_page, 1.0, 1.0, 0, 0)
                            if preserve_annotations:
                                self._copy_annots(repl_page, out_page, 1.0, 1.0, 0, 0)
                            # Draw visual layout
                            out_page.show_pdf_page(out_page.rect, repl_doc, repl_page_idx)

                        elif mode == "fit":
                            # Create page with original size
                            out_page = out_doc.new_page(
                                width=orig_page.rect.width,
                                height=orig_page.rect.height
                            )
                            # Fit keeping proportions (scale factors)
                            rect_w = repl_page.rect.width
                            rect_h = repl_page.rect.height
                            orig_w = orig_page.rect.width
                            orig_h = orig_page.rect.height

                            scale = min(orig_w / rect_w, orig_h / rect_h)
                            new_w = rect_w * scale
                            new_h = rect_h * scale
                            dx = (orig_w - new_w) / 2.0
                            dy = (orig_h - new_h) / 2.0

                            target_rect = fitz.Rect(dx, dy, dx + new_w, dy + new_h)
                            if preserve_hyperlinks:
                                self._copy_links(repl_page, out_page, scale, scale, dx, dy)
                            if preserve_annotations:
                                self._copy_annots(repl_page, out_page, scale, scale, dx, dy)
                            out_page.show_pdf_page(target_rect, repl_doc, repl_page_idx, keep_proportion=True)

                        elif mode == "stretch":
                            # Stretch replacement contents completely to cover original rect
                            out_page = out_doc.new_page(
                                width=orig_page.rect.width,
                                height=orig_page.rect.height
                            )
                            sx = orig_page.rect.width / repl_page.rect.width
                            sy = orig_page.rect.height / repl_page.rect.height

                            if preserve_hyperlinks:
                                self._copy_links(repl_page, out_page, sx, sy, 0, 0)
                            if preserve_annotations:
                                self._copy_annots(repl_page, out_page, sx, sy, 0, 0)
                            out_page.show_pdf_page(out_page.rect, repl_doc, repl_page_idx, keep_proportion=False)

                        elif mode == "center":
                            # Keep replacement size, center on original canvas size
                            out_page = out_doc.new_page(
                                width=orig_page.rect.width,
                                height=orig_page.rect.height
                            )
                            rect_w = repl_page.rect.width
                            rect_h = repl_page.rect.height
                            orig_w = orig_page.rect.width
                            orig_h = orig_page.rect.height

                            dx = (orig_w - rect_w) / 2.0
                            dy = (orig_h - rect_h) / 2.0

                            target_rect = fitz.Rect(dx, dy, dx + rect_w, dy + rect_h)
                            if preserve_hyperlinks:
                                self._copy_links(repl_page, out_page, 1.0, 1.0, dx, dy)
                            if preserve_annotations:
                                self._copy_annots(repl_page, out_page, 1.0, 1.0, dx, dy)
                            out_page.show_pdf_page(target_rect, repl_doc, repl_page_idx, keep_proportion=True)

                    else:
                        # Copy original page directly (preserves links, fonts, annots, metadata)
                        out_doc.insert_pdf(orig_doc, from_page=i, to_page=i)

                # Preservation flags
                if preserve_bookmarks:
                    try:
                        toc = orig_doc.get_toc()
                        if toc:
                            out_doc.set_toc(toc)
                    except Exception as exc:
                        logger.warning("Could not copy original bookmarks: %s", exc)

                if preserve_metadata:
                    out_doc.set_metadata(orig_doc.metadata)

                if preserve_labels:
                    try:
                        labels = orig_doc.get_page_labels()
                        if labels:
                            out_doc.set_page_labels(labels)
                    except Exception as exc:
                        logger.warning("Could not preserve page labels: %s", exc)

                # Save document
                out_doc.save(
                    str(tmp_out),
                    garbage=3,
                    deflate=True
                )
                out_doc.close()

            # Output Verification
            self._validate_output(tmp_out, orig_analysis.page_count)

            # Move to final location
            out_dir = Paths.request_output(request_id)
            out_name = output_filename(prefix="replaced_")
            out_path = out_dir / out_name
            shutil.move(str(tmp_out), str(out_path))

            processed_size = out_path.stat().st_size
            proc_time = round(time.perf_counter() - start, 2)

            result.success = True
            result.message = f"Successfully replaced {len(mapping)} page(s) in original document."
            result.filename = out_name
            result.download_url = f"/api/pdf/replace-pdf-pages/download/{request_id}/{out_name}"
            result.final_pages = orig_analysis.page_count
            result.processed_size = processed_size
            result.processing_time = proc_time

            logger.info("PDF Replace Pages processing completed successfully: %s", out_name)
            return result

        except Exception:
            logger.exception("Replace pages operation failed [request_id=%s]", request_id)
            raise
        finally:
            if tmp_out.exists():
                try:
                    tmp_out.unlink()
                except Exception:
                    pass

    # ------------------------------------------------------------------
    # Inner Utilities
    # ------------------------------------------------------------------

    def _copy_links(
        self,
        src_page: fitz.Page,
        dst_page: fitz.Page,
        sx: float,
        sy: float,
        dx: float,
        dy: float,
    ) -> None:
        """Extract links from replacement page, scale coordinates, and insert to output page."""
        try:
            links = src_page.get_links()
            for lnk in links:
                if "from" in lnk:
                    rect = lnk["from"]
                    # Apply scale and translation factors
                    scaled_rect = fitz.Rect(
                        rect.x0 * sx + dx,
                        rect.y0 * sy + dy,
                        rect.x1 * sx + dx,
                        rect.y1 * sy + dy
                    )
                    lnk["from"] = scaled_rect
                    dst_page.insert_link(lnk)
        except Exception as exc:
            logger.debug("Could not copy links: %s", exc)

    def _copy_annots(
        self,
        src_page: fitz.Page,
        dst_page: fitz.Page,
        sx: float,
        sy: float,
        dx: float,
        dy: float,
    ) -> None:
        """Extract annotations from page, adjust coordinates, and insert to target page."""
        try:
            annot = src_page.first_annot
            while annot:
                rect = annot.rect
                scaled_rect = fitz.Rect(
                    rect.x0 * sx + dx,
                    rect.y0 * sy + dy,
                    rect.x1 * sx + dx,
                    rect.y1 * sy + dy
                )
                # Draw standard stamp annotations
                info = annot.info
                content = info.get("content", "")
                subject = info.get("subject", "")
                
                # Copy as text annotations or fallback shapes
                if content:
                    dst_page.insert_annot(
                        scaled_rect,
                        text=content,
                        icon="Note"
                    )
                annot = annot.next
        except Exception as exc:
            logger.debug("Could not copy annotations: %s", exc)

    def _validate_output(self, path: Path, expected_pages: int) -> None:
        """Confirm output file exists and has correct pages number."""
        if not path.exists() or path.stat().st_size < 128:
            raise ValueError("Output validation failed: generated PDF file is empty.")

        try:
            with fitz.open(str(path)) as doc:
                if doc.page_count != expected_pages:
                    raise ValueError(
                        f"Output check failed: expected {expected_pages} pages, "
                        f"but output PDF has {doc.page_count} pages."
                    )
                _ = doc[0].get_text()
        except Exception as exc:
            raise ValueError(f"Generated PDF check failed: {exc}") from exc


# Singleton instance
_replace_pdf_pages_service = ReplacePDFPagesService()
