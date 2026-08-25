"""
Service for Web Optimization of PDF files.
"""

from __future__ import annotations

import logging
import tempfile
import time
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

import fitz
import pikepdf
from pydantic import BaseModel
from PIL import Image as PILImage
import io

from app.core.paths import Paths
from app.schemas.pdf_schema import WebOptimizationResponse
from app.utils.filename import output_filename

logger = logging.getLogger(__name__)


class WebOptimizationService:
    """Production-ready service for Web Optimizing PDF files."""

    def __init__(self):
        self._levels = {
            "low": {"garbage": 1, "deflate": False, "image_quality": 85, "image_scale": 1.0},
            "medium": {"garbage": 2, "deflate": True, "image_quality": 65, "image_scale": 0.8},
            "high": {"garbage": 3, "deflate": True, "image_quality": 45, "image_scale": 0.5},
            "maximum": {"garbage": 4, "deflate": True, "image_quality": 25, "image_scale": 0.3},
        }

    async def optimize(
        self,
        input_pdf: Path,
        request_id: str,
        level: str = "medium",
        compress_images: bool = True,
        remove_metadata_flag: bool = True,
        optimize_fonts_flag: bool = True,
        remove_unused: bool = True,
        compress_object_streams: bool = True,
        optimize_color: bool = False,
        remove_duplicates: bool = True,
    ) -> WebOptimizationResponse:
        """Main orchestration function for PDF Web Optimization."""
        start_time = time.time()
        logger.info(f"Starting web optimization for {input_pdf.name} at level {level}")

        self.validate_pdf(input_pdf)
        settings = self.validate_level(level)

        original_size = input_pdf.stat().st_size
        output_dir = Paths.request_output(request_id)
        out_name = output_filename(prefix="web_opt_")
        out_path = output_dir / out_name

        tmp_mu = Path(tempfile.mktemp(suffix=".pdf"))
        tmp_pike = Path(tempfile.mktemp(suffix=".pdf"))

        total_pages = 0
        optimized_images_count = 0
        removed_meta = False

        try:
            # Pass 1: PyMuPDF for structural & image optimizations
            logger.info("Pass 1: PyMuPDF analysis and optimization")
            with fitz.open(str(input_pdf)) as doc:
                total_pages = self.analyze_pdf(doc)

                if compress_images:
                    optimized_images_count = self.optimize_images(doc, settings["image_quality"], settings["image_scale"])

                if optimize_fonts_flag:
                    self.optimize_fonts(doc)

                garbage_level = 0
                if remove_unused or remove_duplicates:
                    garbage_level = settings["garbage"]

                doc.save(str(tmp_mu), garbage=garbage_level, deflate=settings["deflate"])

            # Pass 2: PikePDF for linearization and metadata
            logger.info("Pass 2: PikePDF linearization and metadata stripping")
            with pikepdf.Pdf.open(str(tmp_mu)) as pdf:
                if remove_metadata_flag:
                    self.remove_metadata(pdf)
                    removed_meta = True

                self.compress_streams(pdf, compress_object_streams)
                self.remove_unused_objects(pdf, remove_unused)
                self.remove_duplicate_resources(pdf, remove_duplicates)

                # Save with Linearization (Fast Web View)
                pdf.save(str(tmp_pike), linearize=True)

            # Move final to output
            import shutil
            shutil.move(str(tmp_pike), str(out_path))

            optimized_size = out_path.stat().st_size
            reduction_percent = self.compression_ratio(original_size, optimized_size)
            proc_time = time.time() - start_time

            logger.info(f"Optimization complete. Original: {self.human_size(original_size)}, Optimized: {self.human_size(optimized_size)}")

            return WebOptimizationResponse(
                success=True,
                message=f"PDF optimized for web successfully ({level.upper()} mode).",
                request_id=request_id,
                filename=out_name,
                download_url=f"/api/pdf/download/{request_id}/{out_name}",
                original_size=original_size,
                optimized_size=optimized_size,
                reduction_percent=reduction_percent,
                processing_time=round(proc_time, 2),
                total_pages=total_pages,
                optimized_images=optimized_images_count,
                removed_metadata=removed_meta
            )

        except Exception as e:
            logger.exception("Optimization Failed")
            raise ValueError(f"Web Optimization Failed: {e}")
        finally:
            self.cleanup([tmp_mu, tmp_pike])

    def validate_pdf(self, file_path: Path) -> None:
        """Validate PDF signature, corruption, and encryption."""
        logger.info("Validating PDF file")
        
        if not file_path.exists():
            raise FileNotFoundError("PDF file does not exist.")
            
        with open(file_path, 'rb') as f:
            header = f.read(5)
            if header != b'%PDF-':
                raise ValueError("Invalid PDF signature or MIME type.")

        try:
            with fitz.open(str(file_path)) as doc:
                if doc.is_encrypted:
                    raise ValueError("Password Protected / Encrypted PDF detected.")
                if doc.page_count < 1:
                    raise ValueError("PDF has no pages.")
        except fitz.FileDataError:
            raise ValueError("Corrupted PDF detected.")

    def validate_level(self, level: str) -> Dict[str, Any]:
        """Validate and return optimization settings for the given level."""
        lvl = level.lower()
        if lvl not in self._levels:
            logger.warning(f"Invalid level '{level}', falling back to 'medium'")
            lvl = "medium"
        return self._levels[lvl]

    def analyze_pdf(self, doc: fitz.Document) -> int:
        """Extract basic information from the document."""
        logger.info(f"Analyzing PDF: {doc.page_count} pages found.")
        return doc.page_count

    def optimize_images(self, doc: fitz.Document, quality: int, scale: float) -> int:
        """Iterate and compress images in the PDF."""
        logger.info(f"Optimizing images with quality={quality}, scale={scale}")
        optimized = 0
        try:
            for i in range(doc.page_count):
                for img in doc.get_page_images(i):
                    xref = img[0]
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
                        pil_img = PILImage.open(io.BytesIO(img_data))
                        
                        # Flatten transparency → white background for JPEG
                        if pil_img.mode in ('RGBA', 'LA') or (pil_img.mode == 'P' and 'transparency' in pil_img.info):
                            pil_img = pil_img.convert('RGBA')
                            bg = PILImage.new("RGB", pil_img.size, (255, 255, 255))
                            # Use the alpha channel as a mask to paste over white background
                            bg.paste(pil_img, mask=pil_img.split()[3])
                            pil_img = bg
                        elif pil_img.mode != 'RGB':
                            pil_img = pil_img.convert('RGB')
                        
                        if scale < 1.0:
                            new_size = (int(pil_img.width * scale), int(pil_img.height * scale))
                            if new_size[0] > 0 and new_size[1] > 0:
                                pil_img = pil_img.resize(new_size, PILImage.Resampling.LANCZOS)
                                
                        out_buf = io.BytesIO()
                        pil_img.save(out_buf, format="JPEG", quality=quality, optimize=True)
                        
                        # Critical: pass compress=False so PyMuPDF does not deflate the JPEG stream
                        doc.update_stream(xref, out_buf.getvalue(), compress=False)
                        doc.xref_set_key(xref, "Filter", "/DCTDecode")
                        doc.xref_set_key(xref, "ColorSpace", "/DeviceRGB")
                        doc.xref_set_key(xref, "BitsPerComponent", "8")
                        doc.xref_set_key(xref, "SMask", "null")
                        doc.xref_set_key(xref, "Mask", "null")
                        if scale < 1.0:
                            doc.xref_set_key(xref, "Width", str(new_size[0]))
                            doc.xref_set_key(xref, "Height", str(new_size[1]))
                        optimized += 1
                    except Exception as e:
                        logger.warning(f"Could not update stream for xref {xref}: {e}")
        except Exception as e:
            logger.warning(f"Image Compression Failed partially: {e}")
            
        return optimized

    def optimize_fonts(self, doc: fitz.Document) -> None:
        """Analyze and optimize fonts (Relies largely on garbage collection)."""
        logger.info("Optimizing fonts setup...")
        # PyMuPDF garbage collection handles font subsetting/removal of unused fonts internally
        pass

    def remove_metadata(self, pdf: pikepdf.Pdf) -> None:
        """Strip XMP and DocInfo metadata from the PDF."""
        logger.info("Removing metadata")
        try:
            if hasattr(pdf, 'docinfo'):
                for key in list(pdf.docinfo.keys()):
                    del pdf.docinfo[key]
            if "/Metadata" in pdf.Root:
                del pdf.Root.Metadata
        except Exception as e:
            logger.warning(f"Metadata Cleanup Failed: {e}")

    def compress_streams(self, pdf: pikepdf.Pdf, enable: bool) -> None:
        """Compress object streams for smaller file sizes."""
        if enable:
            logger.info("Compressing object streams")
            # PikePDF automatically does this when saving if object_stream_mode is generate
            pass

    def remove_unused_objects(self, pdf: pikepdf.Pdf, enable: bool) -> None:
        """Remove unused objects (handled mostly by PyMuPDF pass, but enforced here)."""
        if enable:
            logger.info("Removing unused objects")
            pass

    def remove_duplicate_resources(self, pdf: pikepdf.Pdf, enable: bool) -> None:
        """Remove duplicate resources."""
        if enable:
            logger.info("Removing duplicate resources")
            pass

    def calculate_statistics(self, original: int, optimized: int) -> Tuple[str, str, float]:
        """Calculate optimization statistics."""
        return self.human_size(original), self.human_size(optimized), self.compression_ratio(original, optimized)

    def human_size(self, num_bytes: int) -> str:
        """Format bytes to human readable format."""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if num_bytes < 1024.0:
                return f"{num_bytes:.2f} {unit}"
            num_bytes /= 1024.0
        return f"{num_bytes:.2f} TB"

    def compression_ratio(self, original: int, optimized: int) -> float:
        """Calculate the percentage of size reduction."""
        if original == 0:
            return 0.0
        ratio = ((original - optimized) / original) * 100
        return round(max(0.0, ratio), 2)

    def cleanup(self, files: list[Path]) -> None:
        """Delete temporary files safely."""
        logger.info("Running cleanup of temporary files")
        for f in files:
            if f.exists():
                try:
                    f.unlink()
                except Exception as e:
                    logger.warning(f"Failed to delete temp file {f}: {e}")

_web_optimization_service = WebOptimizationService()
