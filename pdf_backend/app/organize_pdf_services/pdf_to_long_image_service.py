"""
PDF to Single Long Image Service.

Converts all or selected pages of a PDF into one continuous
vertically-stitched image.
"""

from __future__ import annotations

import gc
import io
import logging
import math
import os
import shutil
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF
from PIL import Image

from app.core.paths import Paths
from app.utils.filename import output_filename

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Format / DPI / Quality maps
# ---------------------------------------------------------------------------

OUTPUT_FORMATS = {
    "png": {"pil": "PNG", "ext": ".png", "supports_transparency": True},
    "jpg": {"pil": "JPEG", "ext": ".jpg", "supports_transparency": False},
    "jpeg": {"pil": "JPEG", "ext": ".jpg", "supports_transparency": False},
    "webp": {"pil": "WEBP", "ext": ".webp", "supports_transparency": True},
    "tiff": {"pil": "TIFF", "ext": ".tiff", "supports_transparency": True},
    "bmp": {"pil": "BMP", "ext": ".bmp", "supports_transparency": False},
}

QUALITY_MAP = {
    "low": 50,
    "medium": 75,
    "high": 90,
    "maximum": 100,
}

# PIL image size limits (safe ceiling)
MAX_DIMENSION = 300_000
MAX_PIXELS = 4_000_000_000  # 4 billion


# ---------------------------------------------------------------------------
# Data containers
# ---------------------------------------------------------------------------

class PDFAnalysis:
    """Holds structural analysis of the source PDF."""

    def __init__(self) -> None:
        self.page_count: int = 0
        self.file_size: int = 0
        self.is_encrypted: bool = False
        self.is_corrupted: bool = False
        self.pages: List[Dict[str, Any]] = []
        self.total_width: float = 0.0
        self.total_height: float = 0.0
        self.orientation: str = "Portrait"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "page_count": self.page_count,
            "file_size": self.file_size,
            "pages": self.pages,
            "orientation": self.orientation,
            "is_encrypted": self.is_encrypted,
            "is_corrupted": self.is_corrupted,
        }


class ConversionResult:
    """Holds result details of the conversion."""

    def __init__(self) -> None:
        self.success: bool = False
        self.message: str = ""
        self.request_id: str = ""
        self.filename: str = ""
        self.download_url: str = ""
        self.original_size: int = 0
        self.output_size: int = 0
        self.output_width: int = 0
        self.output_height: int = 0
        self.pages_used: int = 0
        self.processing_time: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "message": self.message,
            "request_id": self.request_id,
            "filename": self.filename,
            "download_url": self.download_url,
            "original_size": self.original_size,
            "output_size": self.output_size,
            "output_width": self.output_width,
            "output_height": self.output_height,
            "pages_used": self.pages_used,
            "processing_time": self.processing_time,
        }


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class PDFToLongImageService:
    """Business logic for PDF-to-long-image conversion."""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def analyze(self, input_pdf: Path) -> PDFAnalysis:
        """Validate and inspect the PDF, returning page-level details."""
        logger.info("Analyzing PDF: %s", input_pdf.name)
        analysis = PDFAnalysis()
        analysis.file_size = input_pdf.stat().st_size

        self._validate_pdf(input_pdf, analysis)
        if analysis.is_corrupted or analysis.is_encrypted:
            return analysis

        self._inspect_pages(input_pdf, analysis)
        return analysis

    async def process(
        self,
        input_pdf: Path,
        request_id: str,
        pages_selection: str = "all",
        output_format: str = "png",
        dpi: int = 300,
        quality: str = "high",
        page_gap: int = 10,
        bg_color: str = "#ffffff",
        alignment: str = "center",
        max_width: int = 0,
    ) -> ConversionResult:
        """Render pages, stitch vertically, optimise, and save."""
        start = time.perf_counter()
        logger.info(
            "Starting long-image conversion [request_id=%s] pages=%s fmt=%s dpi=%d",
            request_id, pages_selection, output_format, dpi,
        )

        result = ConversionResult()
        result.request_id = request_id

        # Validate input
        analysis = PDFAnalysis()
        analysis.file_size = input_pdf.stat().st_size
        self._validate_pdf(input_pdf, analysis)
        if analysis.is_corrupted:
            raise ValueError("Cannot process a corrupted PDF.")
        if analysis.is_encrypted:
            raise ValueError("Password-protected PDFs are not supported.")
        self._inspect_pages(input_pdf, analysis)

        # Parse page selection
        page_indices = self._parse_pages(pages_selection, analysis.page_count)
        if not page_indices:
            raise ValueError("No valid pages selected.")
        result.pages_used = len(page_indices)

        # Resolve output format
        fmt_key = output_format.lower().strip()
        if fmt_key not in OUTPUT_FORMATS:
            raise ValueError(f"Unsupported format: {fmt_key}")
        fmt = OUTPUT_FORMATS[fmt_key]
        pil_format = fmt["pil"]
        ext = fmt["ext"]

        # Resolve quality
        quality_val = QUALITY_MAP.get(quality.lower(), 90)

        # Parse background colour
        bg_rgb = self._hex_to_rgb(bg_color)

        # Parse max-width
        safe_max_width = max_width if max_width > 0 else 0

        # ---- Render pages & stitch ----
        output_dir = Paths.request_output(request_id)
        out_name = output_filename(prefix="long_image", extension=ext)
        out_path = output_dir / out_name
        tmp_files: List[Path] = []

        try:
            doc = fitz.open(str(input_pdf))

            if not page_indices:
                raise ValueError("No pages were rendered.")

            # --- Pass 1: compute canvas dimensions (no pixel data loaded) ---
            first_page = doc[page_indices[0]]
            first_pix = first_page.get_pixmap(dpi=dpi, alpha=False, colorspace=fitz.csRGB)
            canvas_width = first_pix.width
            first_pix = None  # release immediately

            total_height = 0
            for pno in page_indices:
                rect = doc[pno].rect
                total_height += int(rect.height * dpi / 72)
            total_height += page_gap * max(0, len(page_indices) - 1)
            total_height = max(total_height, 1)

            if safe_max_width > 0 and canvas_width > safe_max_width:
                canvas_width = safe_max_width

            # Safety: clamp to PIL limits
            if canvas_width > MAX_DIMENSION or total_height > MAX_DIMENSION:
                scale = min(MAX_DIMENSION / canvas_width, MAX_DIMENSION / total_height)
                canvas_width = int(canvas_width * scale)
                total_height = int(total_height * scale)

            if canvas_width * total_height > MAX_PIXELS:
                scale = math.sqrt(MAX_PIXELS / (canvas_width * total_height))
                canvas_width = int(canvas_width * scale)
                total_height = int(total_height * scale)

            # --- Pass 2: create canvas and paste pages one at a time ---
            final_img = Image.new("RGB", (canvas_width, total_height), bg_rgb)
            y_offset = 0

            for idx, pno in enumerate(page_indices):
                page = doc[pno]
                pix = page.get_pixmap(dpi=dpi, alpha=False, colorspace=fitz.csRGB)
                page_img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                pix = None  # release pixmap

                # Scale page to fit canvas_width if needed
                if page_img.width != canvas_width:
                    ratio = canvas_width / page_img.width
                    new_h = int(page_img.height * ratio)
                    page_img = page_img.resize((canvas_width, new_h), Image.LANCZOS)

                # Alignment
                if alignment == "left":
                    x_off = 0
                elif alignment == "right":
                    x_off = canvas_width - page_img.width
                else:
                    x_off = (canvas_width - page_img.width) // 2
                x_off = max(0, x_off)

                final_img.paste(page_img, (x_off, y_offset))
                y_offset += page_img.height + page_gap

                page_img.close()
                del page_img

                if idx % 20 == 0:
                    gc.collect()

            doc.close()
            gc.collect()

            result.output_width = final_img.width
            result.output_height = final_img.height

            # Save
            save_kwargs: Dict[str, Any] = {}
            if pil_format in ("JPEG", "WEBP"):
                save_kwargs["quality"] = quality_val
                if pil_format == "WEBP":
                    save_kwargs["method"] = 4
            if pil_format == "PNG":
                save_kwargs["optimize"] = True
            if pil_format == "TIFF":
                save_kwargs["compression"] = "tiff_lzw"

            # Handle transparency
            if pil_format == "JPEG" and final_img.mode in ("RGBA", "P", "LA"):
                bg = Image.new("RGB", final_img.size, bg_rgb)
                if final_img.mode == "RGBA":
                    bg.paste(final_img, mask=final_img.split()[3])
                else:
                    bg.paste(final_img)
                final_img.close()
                final_img = bg
            elif pil_format == "BMP" and final_img.mode in ("RGBA", "P", "LA"):
                bg = Image.new("RGB", final_img.size, bg_rgb)
                if final_img.mode == "RGBA":
                    bg.paste(final_img, mask=final_img.split()[3])
                else:
                    bg.paste(final_img)
                final_img.close()
                final_img = bg

            final_img.save(str(out_path), format=pil_format, **save_kwargs)
            final_img.close()
            gc.collect()

            # Verify
            if not out_path.exists() or out_path.stat().st_size == 0:
                raise ValueError("Failed to save the output image.")

            result.output_size = out_path.stat().st_size
            result.original_size = analysis.file_size
            result.success = True
            result.filename = out_name
            result.download_url = f"/api/pdf/pdf-to-long-image/download/{request_id}/{out_name}"
            result.processing_time = round(time.perf_counter() - start, 2)
            result.message = (
                f"Successfully converted {result.pages_used} pages into one "
                f"{result.output_width}x{result.output_height} image."
            )

            logger.info(
                "Long-image conversion complete [request_id=%s] %dx%d %d bytes in %.2fs",
                request_id, result.output_width, result.output_height,
                result.output_size, result.processing_time,
            )
            return result

        except Exception as exc:
            logger.exception("Long-image conversion failed [request_id=%s]", request_id)
            raise
        finally:
            for p in tmp_files:
                try:
                    if p.exists():
                        p.unlink()
                except OSError:
                    pass

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _validate_pdf(self, path: Path, analysis: PDFAnalysis) -> None:
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        with open(path, "rb") as fh:
            header = fh.read(5)
        if header != b"%PDF-":
            analysis.is_corrupted = True
            raise ValueError("Not a valid PDF file.")
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

    def _inspect_pages(self, path: Path, analysis: PDFAnalysis) -> None:
        with fitz.open(str(path)) as doc:
            analysis.page_count = doc.page_count
            orientations: List[str] = []
            for i, page in enumerate(doc):
                rect = page.rect
                w, h = rect.width, rect.height
                orientation = "Landscape" if w > h else "Portrait"
                orientations.append(orientation)
                analysis.pages.append({
                    "index": i,
                    "width": round(w, 2),
                    "height": round(h, 2),
                    "orientation": orientation,
                })
            portrait_count = orientations.count("Portrait")
            landscape_count = orientations.count("Landscape")
            if portrait_count >= landscape_count:
                analysis.orientation = "Portrait"
            else:
                analysis.orientation = "Landscape"

    def _parse_pages(self, selection: str, total_pages: int) -> List[int]:
        selection = selection.strip().lower()
        if not selection or selection == "all":
            return list(range(total_pages))

        pages: set = set()
        parts = [p.strip() for p in selection.split(",") if p.strip()]
        for part in parts:
            if part == "odd":
                pages.update(range(0, total_pages, 2))
            elif part == "even":
                pages.update(range(1, total_pages, 2))
            elif "-" in part:
                try:
                    start_str, end_str = part.split("-", 1)
                    start = int(start_str) if start_str else 1
                    end = int(end_str) if end_str else total_pages
                    start = max(1, min(start, total_pages))
                    end = max(1, min(end, total_pages))
                    if start <= end:
                        pages.update(range(start - 1, end))
                    else:
                        pages.update(range(end - 1, start))
                except ValueError:
                    pass
            else:
                try:
                    num = int(part)
                    if 1 <= num <= total_pages:
                        pages.add(num - 1)
                except ValueError:
                    pass

        if not pages:
            return list(range(total_pages))
        return sorted(pages)

    @staticmethod
    def _hex_to_rgb(hex_str: str) -> Tuple[int, int, int]:
        hex_str = hex_str.lstrip("#")
        if len(hex_str) != 6:
            return (255, 255, 255)
        try:
            r = int(hex_str[0:2], 16)
            g = int(hex_str[2:4], 16)
            b = int(hex_str[4:6], 16)
            return (r, g, b)
        except Exception:
            return (255, 255, 255)


# Singleton
pdf_to_long_image_service = PDFToLongImageService()
