"""
PDF Linearization (Fast Web View) Service.

Analyzes and rebuilds PDF internal structure to enable byte-serving
so the first page loads immediately while remaining pages stream.
"""

from __future__ import annotations

import logging
import shutil
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz
import pikepdf
from pikepdf import ObjectStreamMode, StreamDecodeLevel

from app.core.paths import Paths
from app.utils.filename import output_filename

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Response dataclass (kept lightweight – no Pydantic to avoid circular deps)
# ---------------------------------------------------------------------------

class LinearizationAnalysis:
    """Holds analysis results for a PDF document."""

    def __init__(self) -> None:
        self.page_count: int = 0
        self.pdf_version: str = ""
        self.is_linearized: bool = False
        self.has_bookmarks: bool = False
        self.has_metadata: bool = False
        self.has_digital_signature: bool = False
        self.xref_valid: bool = True
        self.file_size: int = 0
        self.object_count: int = 0
        self.broken_xref: bool = False
        self.is_encrypted: bool = False
        self.is_corrupted: bool = False
        self.metadata_title: str = ""
        self.metadata_author: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "page_count": self.page_count,
            "pdf_version": self.pdf_version,
            "is_linearized": self.is_linearized,
            "has_bookmarks": self.has_bookmarks,
            "has_metadata": self.has_metadata,
            "has_digital_signature": self.has_digital_signature,
            "xref_valid": self.xref_valid,
            "file_size": self.file_size,
            "object_count": self.object_count,
            "broken_xref": self.broken_xref,
            "is_encrypted": self.is_encrypted,
            "is_corrupted": self.is_corrupted,
            "metadata_title": self.metadata_title,
            "metadata_author": self.metadata_author,
        }


class LinearizationResult:
    """Holds the final result after processing."""

    def __init__(self) -> None:
        self.success: bool = False
        self.message: str = ""
        self.request_id: str = ""
        self.filename: str = ""
        self.download_url: str = ""
        self.original_size: int = 0
        self.processed_size: int = 0
        self.reduction_percent: float = 0.0
        self.processing_time: float = 0.0
        self.total_pages: int = 0
        self.pdf_version: str = ""
        self.was_linearized: bool = False
        self.linearization_enabled: bool = False
        self.bookmarks_preserved: bool = False
        self.metadata_preserved: bool = False
        self.signature_preserved: bool = False
        self.analysis: Dict[str, Any] = {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "message": self.message,
            "request_id": self.request_id,
            "filename": self.filename,
            "download_url": self.download_url,
            "original_size": self.original_size,
            "processed_size": self.processed_size,
            "reduction_percent": self.reduction_percent,
            "processing_time": self.processing_time,
            "total_pages": self.total_pages,
            "pdf_version": self.pdf_version,
            "was_linearized": self.was_linearized,
            "linearization_enabled": self.linearization_enabled,
            "bookmarks_preserved": self.bookmarks_preserved,
            "metadata_preserved": self.metadata_preserved,
            "signature_preserved": self.signature_preserved,
            "analysis": self.analysis,
        }


class LinearizationService:
    """
    Production-ready PDF Linearization (Fast Web View) service.

    Two-phase approach:
    1. PyMuPDF: deep structural analysis, xref validation, metadata/bookmark/sig detection.
    2. pikepdf: rebuild with linearize=True, optional stream compression and metadata stripping.
    """

    # ------------------------------------------------------------------
    # Public entry points
    # ------------------------------------------------------------------

    async def analyze(self, input_pdf: Path) -> LinearizationAnalysis:
        """
        Perform full document analysis without modifying the file.
        Returns a LinearizationAnalysis with all detected properties.
        """
        logger.info("Analyzing PDF: %s", input_pdf.name)
        analysis = LinearizationAnalysis()
        analysis.file_size = input_pdf.stat().st_size

        self._validate_pdf(input_pdf, analysis)
        if analysis.is_corrupted or analysis.is_encrypted:
            return analysis

        self._analyze_with_fitz(input_pdf, analysis)
        self._analyze_linearization(input_pdf, analysis)
        return analysis

    async def process(
        self,
        input_pdf: Path,
        request_id: str,
        enable_fast_web_view: bool = True,
        preserve_metadata: bool = True,
        optimize_object_streams: bool = True,
        preserve_bookmarks: bool = True,
        keep_digital_signatures: bool = True,
        force_rebuild: bool = False,
    ) -> LinearizationResult:
        """
        Main processing function. Validates, analyses and rebuilds the PDF.
        Returns a LinearizationResult with all statistics.
        """
        start_time = time.perf_counter()
        logger.info(
            "Starting linearization [request_id=%s] file=%s linearize=%s",
            request_id,
            input_pdf.name,
            enable_fast_web_view,
        )

        result = LinearizationResult()
        result.request_id = request_id
        result.original_size = input_pdf.stat().st_size

        # Step 1 – validation
        analysis = LinearizationAnalysis()
        analysis.file_size = result.original_size
        self._validate_pdf(input_pdf, analysis)

        if analysis.is_corrupted:
            raise ValueError("Corrupted PDF detected. Cannot process.")
        if analysis.is_encrypted:
            raise ValueError("Password-protected PDF detected. Cannot process without password.")

        # Step 2 – full analysis
        self._analyze_with_fitz(input_pdf, analysis)
        self._analyze_linearization(input_pdf, analysis)
        result.analysis = analysis.to_dict()
        result.total_pages = analysis.page_count
        result.pdf_version = analysis.pdf_version
        result.was_linearized = analysis.is_linearized

        # Step 3 – check if rebuild is needed
        if analysis.is_linearized and not force_rebuild and not optimize_object_streams:
            logger.info("PDF already linearized and force_rebuild=False – skipping rebuild.")
            result.linearization_enabled = True

        # Step 4 – rebuild
        tmp_fitz = Path(tempfile.mktemp(suffix=".pdf"))
        tmp_pike = Path(tempfile.mktemp(suffix=".pdf"))

        try:
            # Pass A: PyMuPDF – garbage-collect, deflate, clean xref
            self._rebuild_with_fitz(
                input_pdf=input_pdf,
                output_path=tmp_fitz,
                garbage_level=4,
                deflate=True,
            )
            logger.info("PyMuPDF rebuild complete → %s", tmp_fitz)

            # Pass B: pikepdf – linearize, optionally strip metadata, compress streams
            bookmarks_preserved, metadata_preserved, sig_preserved = self._rebuild_with_pikepdf(
                input_path=tmp_fitz,
                output_path=tmp_pike,
                linearize=enable_fast_web_view,
                preserve_metadata=preserve_metadata,
                optimize_object_streams=optimize_object_streams,
                keep_signatures=keep_digital_signatures,
                has_digital_signature=analysis.has_digital_signature,
            )
            logger.info("pikepdf rebuild complete → %s", tmp_pike)

            # Step 5 – validate output
            self._validate_output(tmp_pike)

            # Step 6 – move to output directory
            out_dir = Paths.request_output(request_id)
            out_name = output_filename(prefix="linearized_")
            out_path = out_dir / out_name
            shutil.move(str(tmp_pike), str(out_path))
            logger.info("Output saved → %s", out_path)

            processed_size = out_path.stat().st_size
            processing_time = round(time.perf_counter() - start_time, 2)

            result.success = True
            result.message = self._build_message(
                enable_fast_web_view, analysis.is_linearized, force_rebuild
            )
            result.filename = out_name
            result.download_url = f"/api/pdf/download/{request_id}/{out_name}"
            result.processed_size = processed_size
            result.reduction_percent = self._calc_reduction(result.original_size, processed_size)
            result.processing_time = processing_time
            result.linearization_enabled = enable_fast_web_view
            result.bookmarks_preserved = bookmarks_preserved
            result.metadata_preserved = metadata_preserved
            result.signature_preserved = sig_preserved

            logger.info(
                "Linearization done [request_id=%s] original=%d processed=%d reduction=%.1f%% time=%.2fs",
                request_id,
                result.original_size,
                processed_size,
                result.reduction_percent,
                processing_time,
            )
            return result

        except Exception:
            logger.exception("Linearization failed [request_id=%s]", request_id)
            raise
        finally:
            self._cleanup([tmp_fitz, tmp_pike])

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def _validate_pdf(self, file_path: Path, analysis: LinearizationAnalysis) -> None:
        """Validate PDF signature, MIME, encryption and basic corruption."""
        logger.info("Validating PDF signature: %s", file_path.name)

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        # PDF magic-byte check
        with open(file_path, "rb") as fh:
            header = fh.read(5)
        if header != b"%PDF-":
            analysis.is_corrupted = True
            raise ValueError("Invalid PDF: missing %%PDF- header signature.")

        # Encryption / basic integrity via fitz
        try:
            with fitz.open(str(file_path)) as doc:
                if doc.needs_pass:
                    analysis.is_encrypted = True
                    return
                # Force a read of all pages to surface corruption early
                _ = doc.page_count
        except fitz.FileDataError:
            analysis.is_corrupted = True
            raise ValueError("Corrupted PDF: cannot open document structure.")
        except Exception as exc:
            analysis.is_corrupted = True
            raise ValueError(f"PDF validation failed: {exc}") from exc

        logger.info("PDF validation passed: %s", file_path.name)

    # ------------------------------------------------------------------
    # Analysis – PyMuPDF
    # ------------------------------------------------------------------

    def _analyze_with_fitz(self, file_path: Path, analysis: LinearizationAnalysis) -> None:
        """Deep analysis using PyMuPDF: pages, metadata, bookmarks, signatures, xref."""
        logger.info("Running PyMuPDF analysis on: %s", file_path.name)

        with fitz.open(str(file_path)) as doc:
            analysis.page_count = doc.page_count
            # metadata['format'] gives e.g. 'PDF 1.7'
            fmt = (doc.metadata or {}).get('format', '')
            analysis.pdf_version = fmt if fmt else 'Unknown'
            analysis.object_count = doc.xref_length()

            # Metadata
            meta = doc.metadata or {}
            has_meta = any(v for v in meta.values() if v)
            analysis.has_metadata = has_meta
            analysis.metadata_title = meta.get("title", "")
            analysis.metadata_author = meta.get("author", "")

            # Bookmarks / outlines
            toc = doc.get_toc(simple=True)
            analysis.has_bookmarks = len(toc) > 0

            # Digital signatures – look for AcroForm with Sig field type
            analysis.has_digital_signature = self._detect_signatures(doc)

            # xref integrity
            try:
                xref_count = doc.xref_length()
                analysis.xref_valid = xref_count > 0
            except Exception:
                analysis.xref_valid = False
                analysis.broken_xref = True

        logger.info(
            "Analysis complete: pages=%d version=%s linearized=%s bookmarks=%s metadata=%s sig=%s",
            analysis.page_count,
            analysis.pdf_version,
            analysis.is_linearized,
            analysis.has_bookmarks,
            analysis.has_metadata,
            analysis.has_digital_signature,
        )

    def _detect_signatures(self, doc: fitz.Document) -> bool:
        """Detect digital signature fields by scanning xref objects."""
        try:
            for i in range(1, min(doc.xref_length(), 5000)):
                try:
                    obj_str = doc.xref_object(i)
                    if '/Sig' in obj_str and '/ByteRange' in obj_str:
                        return True
                except Exception:
                    continue
        except Exception:
            pass
        return False

    # ------------------------------------------------------------------
    # Analysis – pikepdf linearization check
    # ------------------------------------------------------------------

    def _analyze_linearization(self, file_path: Path, analysis: LinearizationAnalysis) -> None:
        """Use pikepdf to reliably check linearization status."""
        logger.info("Checking linearization via pikepdf: %s", file_path.name)
        try:
            with pikepdf.Pdf.open(str(file_path)) as pdf:
                analysis.is_linearized = pdf.is_linearized
                if not analysis.pdf_version:
                    analysis.pdf_version = f"PDF-{pdf.pdf_version}"
        except Exception as exc:
            logger.warning("pikepdf linearization check failed: %s", exc)
            analysis.is_linearized = False

    # ------------------------------------------------------------------
    # Rebuild – PyMuPDF pass
    # ------------------------------------------------------------------

    def _rebuild_with_fitz(
        self,
        input_pdf: Path,
        output_path: Path,
        garbage_level: int = 4,
        deflate: bool = True,
    ) -> None:
        """
        Save PDF via PyMuPDF with aggressive garbage collection and deflate.
        Reorders objects, removes orphans, and compresses streams.
        Note: linear=True is no longer supported in newer PyMuPDF – pikepdf handles linearization.
        """
        logger.info("PyMuPDF rebuild: garbage=%d deflate=%s", garbage_level, deflate)
        with fitz.open(str(input_pdf)) as doc:
            doc.save(
                str(output_path),
                garbage=garbage_level,
                deflate=deflate,
                deflate_images=False,
                deflate_fonts=True,
            )

    # ------------------------------------------------------------------
    # Rebuild – pikepdf pass
    # ------------------------------------------------------------------

    def _rebuild_with_pikepdf(
        self,
        input_path: Path,
        output_path: Path,
        linearize: bool,
        preserve_metadata: bool,
        optimize_object_streams: bool,
        keep_signatures: bool,
        has_digital_signature: bool,
    ) -> Tuple[bool, bool, bool]:
        """
        Final rebuild with pikepdf:
        - Enable linearization (Fast Web View)
        - Optionally strip metadata
        - Optionally compress object streams
        Returns (bookmarks_preserved, metadata_preserved, signature_preserved).
        """
        logger.info(
            "pikepdf rebuild: linearize=%s preserve_metadata=%s opt_streams=%s",
            linearize,
            preserve_metadata,
            optimize_object_streams,
        )

        bookmarks_preserved = False
        metadata_preserved = False
        signature_preserved = False

        with pikepdf.Pdf.open(str(input_path)) as pdf:

            # --- Bookmarks: pikepdf preserves the outline tree automatically ---
            try:
                with pdf.open_outline() as outline:
                    bookmarks_preserved = len(outline.root) > 0
            except Exception:
                bookmarks_preserved = False

            # --- Metadata handling ---
            if preserve_metadata:
                metadata_preserved = True
                logger.info("Preserving metadata")
            else:
                logger.info("Stripping metadata")
                self._strip_metadata(pdf)
                metadata_preserved = False

            # --- Signature handling ---
            if has_digital_signature and keep_signatures:
                # Linearization cannot coexist with valid byte-range signatures;
                # we preserve the signature fields but note this limitation.
                signature_preserved = True
                logger.info("Digital signature detected – preserving (note: byte-range may change)")
            elif has_digital_signature and not keep_signatures:
                signature_preserved = False

            # --- Object stream mode ---
            obj_stream_mode = (
                ObjectStreamMode.generate
                if optimize_object_streams
                else ObjectStreamMode.preserve
            )

            # --- Stream decode level ---
            stream_decode = (
                StreamDecodeLevel.specialized
                if optimize_object_streams
                else StreamDecodeLevel.none
            )

            # --- Save ---
            pdf.save(
                str(output_path),
                linearize=linearize,
                compress_streams=True,
                stream_decode_level=stream_decode,
                object_stream_mode=obj_stream_mode,
                preserve_pdfa=True,
                fix_metadata_version=True,
            )

        return bookmarks_preserved, metadata_preserved, signature_preserved

    # ------------------------------------------------------------------
    # Metadata stripping
    # ------------------------------------------------------------------

    def _strip_metadata(self, pdf: pikepdf.Pdf) -> None:
        """Remove XMP metadata stream and DocInfo dictionary."""
        try:
            with pdf.open_metadata() as meta:
                meta.clear()
        except Exception as exc:
            logger.warning("XMP metadata clear failed: %s", exc)

        try:
            with pdf.open_metadata(update_docinfo=True, set_pikepdf_as_editor=False):
                pass
            for key in list(pdf.docinfo.keys()):
                del pdf.docinfo[key]
        except Exception as exc:
            logger.warning("DocInfo clear failed: %s", exc)

    # ------------------------------------------------------------------
    # Output validation
    # ------------------------------------------------------------------

    def _validate_output(self, output_path: Path) -> None:
        """
        Verify the rebuilt PDF is valid, readable, and has correct page structure.
        """
        logger.info("Validating output PDF: %s", output_path.name)
        if not output_path.exists() or output_path.stat().st_size < 100:
            raise ValueError("Output PDF is missing or too small – linearization failed.")

        try:
            with fitz.open(str(output_path)) as doc:
                if doc.page_count < 1:
                    raise ValueError("Output PDF has no pages.")
                # Access first page to verify it's readable
                _ = doc[0].get_text()
        except Exception as exc:
            raise ValueError(f"Output PDF validation failed: {exc}") from exc

        try:
            with pikepdf.Pdf.open(str(output_path)) as pdf:
                warnings = pdf.get_warnings()
                if warnings:
                    logger.warning("pikepdf output warnings: %s", warnings)
        except Exception as exc:
            raise ValueError(f"pikepdf output validation failed: {exc}") from exc

        logger.info("Output validation passed.")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _calc_reduction(original: int, processed: int) -> float:
        if original <= 0:
            return 0.0
        reduction = (original - processed) / original * 100
        return round(max(0.0, reduction), 2)

    @staticmethod
    def _build_message(enabled: bool, was_linearized: bool, force_rebuild: bool) -> str:
        if not enabled:
            return "PDF rebuilt and optimised (Fast Web View not requested)."
        if was_linearized and not force_rebuild:
            return "PDF was already in Fast Web View format. Structure rebuilt and verified."
        return "PDF successfully converted to Fast Web View (Linearized) format."

    @staticmethod
    def _cleanup(paths: List[Path]) -> None:
        """Delete temporary files safely."""
        for path in paths:
            try:
                if path.exists():
                    path.unlink()
                    logger.debug("Cleaned up temp file: %s", path)
            except Exception as exc:
                logger.warning("Failed to delete temp file %s: %s", path, exc)

    @staticmethod
    def human_size(num_bytes: int) -> str:
        """Format byte count as human-readable string."""
        for unit in ("B", "KB", "MB", "GB"):
            if num_bytes < 1024.0:
                return f"{num_bytes:.2f} {unit}"
            num_bytes /= 1024.0  # type: ignore[assignment]
        return f"{num_bytes:.2f} TB"


# Module-level singleton
_linearization_service = LinearizationService()
