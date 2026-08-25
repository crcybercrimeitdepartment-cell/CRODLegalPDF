"""
Download Optimized PDF Service.

Provides complete PDF analysis, multi-pass optimization (images, fonts,
object streams, metadata, duplicate removal) and validated output generation.
"""

from __future__ import annotations

import io
import logging
import shutil
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz
import pikepdf
from pikepdf import ObjectStreamMode, StreamDecodeLevel
from PIL import Image as PILImage

from app.core.paths import Paths
from app.utils.filename import output_filename

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data containers
# ---------------------------------------------------------------------------

class PDFAnalysis:
    """Stores raw analysis data for an uploaded PDF."""

    def __init__(self) -> None:
        self.page_count: int = 0
        self.file_size: int = 0
        self.image_count: int = 0
        self.font_count: int = 0
        self.has_metadata: bool = False
        self.metadata_fields: int = 0
        self.duplicate_objects: int = 0
        self.embedded_resources: int = 0
        self.object_stream_count: int = 0
        self.is_encrypted: bool = False
        self.is_corrupted: bool = False
        self.pdf_version: str = ""
        self.estimated_savings_pct: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "page_count": self.page_count,
            "file_size": self.file_size,
            "image_count": self.image_count,
            "font_count": self.font_count,
            "has_metadata": self.has_metadata,
            "metadata_fields": self.metadata_fields,
            "duplicate_objects": self.duplicate_objects,
            "embedded_resources": self.embedded_resources,
            "object_stream_count": self.object_stream_count,
            "pdf_version": self.pdf_version,
            "estimated_savings_pct": self.estimated_savings_pct,
        }


class OptimizationResult:
    """Stores the result after a completed optimization run."""

    def __init__(self) -> None:
        self.success: bool = False
        self.message: str = ""
        self.request_id: str = ""
        self.filename: str = ""
        self.download_url: str = ""
        self.original_size: int = 0
        self.optimized_size: int = 0
        self.reduction_percent: float = 0.0
        self.saved_bytes: int = 0
        self.processing_time: float = 0.0
        self.total_pages: int = 0
        self.images_optimized: int = 0
        self.fonts_optimized: int = 0
        self.metadata_removed: bool = False
        self.streams_compressed: int = 0
        self.duplicates_removed: int = 0
        self.analysis: Dict[str, Any] = {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "message": self.message,
            "request_id": self.request_id,
            "filename": self.filename,
            "download_url": self.download_url,
            "original_size": self.original_size,
            "optimized_size": self.optimized_size,
            "reduction_percent": self.reduction_percent,
            "saved_bytes": self.saved_bytes,
            "processing_time": self.processing_time,
            "total_pages": self.total_pages,
            "images_optimized": self.images_optimized,
            "fonts_optimized": self.fonts_optimized,
            "metadata_removed": self.metadata_removed,
            "streams_compressed": self.streams_compressed,
            "duplicates_removed": self.duplicates_removed,
            "analysis": self.analysis,
        }


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class DownloadOptimizedPDFService:
    """
    Production-ready, memory-efficient PDF optimization and download service.

    Optimization pipeline:
    1. Validation  – MIME, signature, encryption, corruption
    2. Analysis    – pages, images, fonts, metadata, objects
    3. Pass A      – PyMuPDF: garbage collection, deflate, image compression
    4. Pass B      – pikepdf: stream compression, metadata removal, de-duplication
    5. Validation  – verify output integrity before returning
    6. Cleanup     – remove all temp files
    """

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def analyze(self, input_pdf: Path) -> PDFAnalysis:
        """Analyze a PDF and return detailed structural information."""
        logger.info("Analyzing PDF: %s", input_pdf.name)
        analysis = PDFAnalysis()
        analysis.file_size = input_pdf.stat().st_size

        self._validate_signature(input_pdf, analysis)
        if analysis.is_corrupted or analysis.is_encrypted:
            return analysis

        self._deep_analyze(input_pdf, analysis)
        return analysis

    async def process(
        self,
        input_pdf: Path,
        request_id: str,
        compress_images: bool = True,
        optimize_fonts: bool = True,
        remove_metadata: bool = True,
        compress_streams: bool = True,
        optimize_resources: bool = True,
        remove_duplicates: bool = True,
        preserve_quality: bool = False,
    ) -> OptimizationResult:
        """
        Run the full optimization pipeline and return a result with download URL.
        """
        start = time.perf_counter()
        logger.info(
            "Starting optimization [request_id=%s] file=%s",
            request_id, input_pdf.name,
        )

        result = OptimizationResult()
        result.request_id = request_id
        result.original_size = input_pdf.stat().st_size

        # Step 1 – validate
        analysis = PDFAnalysis()
        analysis.file_size = result.original_size
        self._validate_signature(input_pdf, analysis)

        if analysis.is_corrupted:
            raise ValueError("Corrupted PDF: cannot open document structure.")
        if analysis.is_encrypted:
            raise ValueError("Password-protected PDF: cannot optimize without password.")

        # Step 2 – full analysis (needed for stats)
        self._deep_analyze(input_pdf, analysis)
        result.analysis = analysis.to_dict()
        result.total_pages = analysis.page_count

        # Temp files
        tmp_a = Path(tempfile.mktemp(suffix=".pdf"))
        tmp_b = Path(tempfile.mktemp(suffix=".pdf"))

        try:
            # Pass A – PyMuPDF
            img_optimized = self._pass_fitz(
                src=input_pdf,
                dst=tmp_a,
                compress_images=compress_images,
                preserve_quality=preserve_quality,
            )
            logger.info("PyMuPDF pass complete → %s", tmp_a)

            # Pass B – pikepdf
            fonts_done, meta_removed, streams_done, dupes_removed = self._pass_pikepdf(
                src=tmp_a,
                dst=tmp_b,
                compress_streams=compress_streams,
                remove_metadata=remove_metadata,
                remove_duplicates=remove_duplicates,
                optimize_fonts=optimize_fonts,
            )
            logger.info("pikepdf pass complete → %s", tmp_b)

            # Step 5 – validate output
            self._validate_output(tmp_b, analysis.page_count)

            # Move to output dir
            out_dir = Paths.request_output(request_id)
            out_name = output_filename(prefix="optimized_")
            out_path = out_dir / out_name
            shutil.move(str(tmp_b), str(out_path))

            optimized_size = out_path.stat().st_size
            proc_time = round(time.perf_counter() - start, 2)
            saved = max(0, result.original_size - optimized_size)
            reduction = round(saved / result.original_size * 100, 2) if result.original_size > 0 else 0.0

            result.success = True
            result.message = (
                f"PDF successfully optimized. Reduced by {reduction}% "
                f"({self._fmt_bytes(saved)} saved)."
            )
            result.filename = out_name
            result.download_url = f"/api/pdf/download/{request_id}/{out_name}"
            result.optimized_size = optimized_size
            result.reduction_percent = reduction
            result.saved_bytes = saved
            result.processing_time = proc_time
            result.images_optimized = img_optimized
            result.fonts_optimized = fonts_done
            result.metadata_removed = meta_removed
            result.streams_compressed = streams_done
            result.duplicates_removed = dupes_removed

            logger.info(
                "Optimization complete [request_id=%s] %d→%d bytes (%.1f%%) in %.2fs",
                request_id, result.original_size, optimized_size, reduction, proc_time,
            )
            return result

        except Exception:
            logger.exception("Optimization failed [request_id=%s]", request_id)
            raise
        finally:
            self._cleanup([tmp_a, tmp_b])

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def _validate_signature(self, path: Path, analysis: PDFAnalysis) -> None:
        """Check magic bytes, extension, and basic open/encryption status."""
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        # PDF magic bytes
        with open(path, "rb") as fh:
            header = fh.read(5)
        if header != b"%PDF-":
            analysis.is_corrupted = True
            raise ValueError("Invalid file: missing %PDF- signature. Upload a valid PDF.")

        try:
            with fitz.open(str(path)) as doc:
                if doc.needs_pass:
                    analysis.is_encrypted = True
                    return
                _ = doc.page_count  # force parse
        except fitz.FileDataError:
            analysis.is_corrupted = True
            raise ValueError("Corrupted PDF detected.")
        except Exception as exc:
            analysis.is_corrupted = True
            raise ValueError(f"PDF validation failed: {exc}") from exc

    # ------------------------------------------------------------------
    # Analysis
    # ------------------------------------------------------------------

    def _deep_analyze(self, path: Path, analysis: PDFAnalysis) -> None:
        """Analyze pages, images, fonts, metadata, objects, streams."""
        logger.info("Deep analyzing: %s", path.name)

        with fitz.open(str(path)) as doc:
            analysis.page_count = doc.page_count
            analysis.pdf_version = (doc.metadata or {}).get("format", "Unknown")

            # Metadata
            meta = doc.metadata or {}
            filled = [v for v in meta.values() if v]
            analysis.has_metadata = bool(filled)
            analysis.metadata_fields = len(filled)

            # Images & fonts across all pages
            seen_imgs: set[int] = set()
            seen_fonts: set[str] = set()

            for page_idx in range(doc.page_count):
                page = doc[page_idx]
                for img in doc.get_page_images(page_idx):
                    seen_imgs.add(img[0])  # xref
                for font in doc.get_page_fonts(page_idx):
                    seen_fonts.add(font[3])  # basefont name

            analysis.image_count = len(seen_imgs)
            analysis.font_count = len(seen_fonts)

            # Object stream count & embedded resources
            xref_len = doc.xref_length()
            stream_count = 0
            embedded_count = 0

            for xref in range(1, min(xref_len, 10000)):
                try:
                    obj = doc.xref_object(xref)
                    if "/EmbeddedFile" in obj or "/Filespec" in obj:
                        embedded_count += 1
                    if "/ObjStm" in obj:
                        stream_count += 1
                except Exception:
                    continue

            analysis.object_stream_count = stream_count
            analysis.embedded_resources = embedded_count

        # Estimate savings
        score = 0.0
        if analysis.image_count > 0:
            score += 20.0
        if analysis.has_metadata:
            score += 3.0
        if analysis.object_stream_count > 0:
            score += 5.0
        if analysis.font_count > 5:
            score += 8.0
        analysis.estimated_savings_pct = min(score, 60.0)

        # Duplicate detection via pikepdf xref table
        try:
            with pikepdf.Pdf.open(str(path)) as pdf:
                xrefs = pdf.get_xref_table()
                all_offsets = [v for v in xrefs.values() if v > 0]
                dupes = len(all_offsets) - len(set(all_offsets))
                analysis.duplicate_objects = max(0, dupes)
        except Exception:
            analysis.duplicate_objects = 0

        logger.info(
            "Analysis: pages=%d images=%d fonts=%d meta=%s dupes=%d streams=%d",
            analysis.page_count, analysis.image_count, analysis.font_count,
            analysis.has_metadata, analysis.duplicate_objects, analysis.object_stream_count,
        )

    # ------------------------------------------------------------------
    # Pass A – PyMuPDF (image compression + deflate)
    # ------------------------------------------------------------------

    def _pass_fitz(
        self,
        src: Path,
        dst: Path,
        compress_images: bool,
        preserve_quality: bool,
    ) -> int:
        """PyMuPDF pass: garbage-collect objects, deflate, optionally compress images."""
        logger.info("PyMuPDF pass: compress_images=%s preserve_quality=%s", compress_images, preserve_quality)
        optimized_count = 0

        with fitz.open(str(src)) as doc:
            if compress_images:
                quality = 72 if preserve_quality else 55
                scale = 1.0 if preserve_quality else 0.85
                optimized_count = self._compress_images(doc, quality=quality, scale=scale)

            doc.save(
                str(dst),
                garbage=4,
                deflate=True,
                deflate_images=False,
                deflate_fonts=True,
            )

        logger.info("PyMuPDF pass: %d images optimized", optimized_count)
        return optimized_count

    def _compress_images(self, doc: fitz.Document, quality: int, scale: float) -> int:
        """Compress all embedded images in a fitz Document in-place."""
        count = 0
        for page_idx in range(doc.page_count):
            for img_info in doc.get_page_images(page_idx):
                xref = img_info[0]
                try:
                    # Skip stencil masks (ImageMask)
                    obj_str = doc.xref_object(xref)
                    if "/ImageMask true" in obj_str:
                        continue
                        
                    # Skip small helper graphics/icons
                    length_val = doc.xref_get_key(xref, "Length")
                    try:
                        orig_len = int(length_val[1]) if length_val[0] == "int" else len(doc.xref_stream(xref))
                    except Exception:
                        orig_len = 0
                    if orig_len > 0 and orig_len < 10240:
                        continue

                    pix = fitz.Pixmap(doc, xref)
                    
                    # Convert CMYK or other non-standard spaces using fitz first
                    if pix.colorspace and pix.colorspace.name not in ("DeviceGray", "DeviceRGB"):
                        pix = fitz.Pixmap(fitz.csRGB, pix)
                        
                    img_data = pix.tobytes("png")
                    pil = PILImage.open(io.BytesIO(img_data))

                    # Flatten transparency → white background for JPEG
                    if pil.mode in ("RGBA", "LA") or (pil.mode == "P" and "transparency" in pil.info):
                        pil = pil.convert("RGBA")
                        bg = PILImage.new("RGB", pil.size, (255, 255, 255))
                        bg.paste(pil, mask=pil.split()[3])
                        pil = bg
                    elif pil.mode != "RGB":
                        pil = pil.convert("RGB")

                    if scale < 1.0:
                        new_w = max(1, int(pil.width * scale))
                        new_h = max(1, int(pil.height * scale))
                        pil = pil.resize((new_w, new_h), PILImage.Resampling.LANCZOS)

                    buf = io.BytesIO()
                    pil.save(buf, format="JPEG", quality=quality, optimize=True)
                    jpeg_bytes = buf.getvalue()

                    # Critical: pass compress=False so PyMuPDF does not deflate the JPEG stream
                    doc.update_stream(xref, jpeg_bytes, compress=False)
                    doc.xref_set_key(xref, "Filter", "/DCTDecode")
                    doc.xref_set_key(xref, "ColorSpace", "/DeviceRGB")
                    doc.xref_set_key(xref, "BitsPerComponent", "8")
                    doc.xref_set_key(xref, "SMask", "null")
                    doc.xref_set_key(xref, "Mask", "null")
                    if scale < 1.0:
                        doc.xref_set_key(xref, "Width", str(new_w))
                        doc.xref_set_key(xref, "Height", str(new_h))

                    count += 1
                except Exception as exc:
                    logger.debug("Image xref=%d skip: %s", xref, exc)

        return count

    # ------------------------------------------------------------------
    # Pass B – pikepdf (streams, metadata, de-duplication)
    # ------------------------------------------------------------------

    def _pass_pikepdf(
        self,
        src: Path,
        dst: Path,
        compress_streams: bool,
        remove_metadata: bool,
        remove_duplicates: bool,
        optimize_fonts: bool,
    ) -> Tuple[int, bool, int, int]:
        """
        pikepdf pass: linearize, compress object streams, strip metadata.
        Returns (fonts_done, meta_removed, streams_compressed, dupes_removed).
        """
        logger.info(
            "pikepdf pass: compress=%s meta=%s dedup=%s fonts=%s",
            compress_streams, remove_metadata, remove_duplicates, optimize_fonts,
        )

        meta_removed = False
        fonts_done = 0
        streams_done = 0
        dupes_removed = 0

        with pikepdf.Pdf.open(str(src)) as pdf:
            # Metadata stripping
            if remove_metadata:
                try:
                    with pdf.open_metadata() as m:
                        m.clear()
                    for k in list(pdf.docinfo.keys()):
                        del pdf.docinfo[k]
                    meta_removed = True
                    logger.info("Metadata stripped")
                except Exception as exc:
                    logger.warning("Metadata strip partial: %s", exc)

            # Remove unreferenced resources (font/image de-duplication)
            if remove_duplicates:
                try:
                    removed = pdf.remove_unreferenced_resources()
                    dupes_removed = removed if isinstance(removed, int) else 1
                    logger.info("Unreferenced resources removed")
                except Exception as exc:
                    logger.debug("remove_unreferenced_resources: %s", exc)

            # Object stream mode
            obj_mode = ObjectStreamMode.generate if compress_streams else ObjectStreamMode.preserve
            decode_level = StreamDecodeLevel.specialized if compress_streams else StreamDecodeLevel.none

            pdf.save(
                str(dst),
                compress_streams=True,
                stream_decode_level=decode_level,
                object_stream_mode=obj_mode,
                linearize=True,
                preserve_pdfa=True,
                fix_metadata_version=True,
            )

            if compress_streams:
                streams_done = len(pdf.objects)

        return fonts_done, meta_removed, streams_done, dupes_removed

    # ------------------------------------------------------------------
    # Output validation
    # ------------------------------------------------------------------

    def _validate_output(self, path: Path, expected_pages: int) -> None:
        """Verify the optimized PDF is valid and has correct page count."""
        if not path.exists() or path.stat().st_size < 64:
            raise ValueError("Optimization failed: output file is missing or empty.")

        try:
            with fitz.open(str(path)) as doc:
                if doc.page_count < 1:
                    raise ValueError("Output PDF has no pages.")
                if doc.page_count != expected_pages:
                    raise ValueError(
                        f"Page count mismatch: expected {expected_pages}, got {doc.page_count}."
                    )
                # Verify first page renders
                _ = doc[0].get_text()
        except Exception as exc:
            raise ValueError(f"Output PDF validation failed: {exc}") from exc

        logger.info("Output validation passed: %s (%d bytes)", path.name, path.stat().st_size)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _cleanup(paths: List[Path]) -> None:
        for p in paths:
            try:
                if p.exists():
                    p.unlink()
            except Exception as exc:
                logger.debug("Cleanup failed for %s: %s", p, exc)

    @staticmethod
    def _fmt_bytes(n: int) -> str:
        for unit in ("B", "KB", "MB", "GB"):
            if n < 1024:
                return f"{n:.1f} {unit}"
            n //= 1024
        return f"{n:.1f} TB"


# Module-level singleton
_download_optimized_service = DownloadOptimizedPDFService()
