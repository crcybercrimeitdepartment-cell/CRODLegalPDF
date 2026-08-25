"""
Batch Compression Service — Document Management Section.

Handles multi-file PDF compression with configurable quality levels:
- extreme: Aggressive compression (quality=15, scale=0.3)
- recommended: Balanced compression (quality=35, scale=0.6)
- less: Light compression (quality=60, scale=0.9)

Features:
- Independent file processing (one failed file does not stop the batch)
- Summary reporting with total, successful, failed, and specific failure reasons
- Collision-free output filename management
- Automatic ZIP packaging for multi-file results or single-file direct download
- Temporary directory lifecycle management
"""

from __future__ import annotations

import io
import logging
import re
import shutil
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Tuple

import fitz  # PyMuPDF
import pikepdf
from pikepdf import Pdf, Name

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024

COMPRESSION_LEVELS = {
    "extreme": {"quality": 15, "scale": 0.3, "label": "Extreme Compression"},
    "recommended": {"quality": 35, "scale": 0.6, "label": "Recommended"},
    "less": {"quality": 60, "scale": 0.9, "label": "Less Compression"},
}


class BatchCompressionService:
    """Enterprise service for batch compressing multiple PDF documents."""

    def sanitize_filename(self, filename: str) -> str:
        clean = Path(filename or "document.pdf").name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document.pdf"

    def validate_pdf_bytes(self, filename: str, pdf_bytes: bytes) -> Tuple[bool, str]:
        if not pdf_bytes or len(pdf_bytes) == 0:
            return False, "File is empty (0 bytes)."

        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            size_mb = len(pdf_bytes) / (1024 * 1024)
            return False, f"File size ({size_mb:.1f} MB) exceeds maximum limit (100 MB)."

        if not pdf_bytes.startswith(b"%PDF"):
            return False, "Not a valid PDF document (missing PDF header)."

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            if doc.is_encrypted:
                doc.close()
                return False, "Encrypted or password-protected PDF."
            page_count = len(doc)
            doc.close()
            if page_count == 0:
                return False, "PDF document contains 0 pages."
        except Exception as e:
            logger.warning(f"Corrupted PDF detected ({filename}): {e}")
            return False, f"Corrupted or unreadable PDF document."

        return True, ""

    def get_unique_filename(self, output_dir: Path, filename: str) -> str:
        dest_path = output_dir / filename
        if not dest_path.exists():
            return filename
        p = Path(filename)
        stem = p.stem
        ext = p.suffix
        match = re.match(r"^(.*?)\s*\(\d+\)$", stem)
        if match:
            stem = match.group(1).strip()
        counter = 1
        while True:
            candidate = f"{stem} ({counter}){ext}"
            if not (output_dir / candidate).exists():
                return candidate
            counter += 1

    def _strip_metadata(self, pdf: Pdf) -> None:
        try:
            pdf.docinfo = {}
        except Exception:
            pass
        for page in pdf.pages:
            for key in ["/Annots", "/AA", "/Metadata"]:
                if key in page:
                    try:
                        del page[key]
                    except Exception:
                        pass

    def _process_page(self, page, quality: int, scale: float) -> None:
        resources = page.get("/Resources")
        if not resources:
            return
        xobjects = resources.get("/XObject")
        if not xobjects:
            return
        for key in list(xobjects):
            try:
                obj = xobjects[key]
                if not isinstance(obj, pikepdf.Stream):
                    continue
                subtype = obj.get("/Subtype")
                if subtype == pikepdf.Name("/Image"):
                    self._compress_image(obj, quality, scale)
                elif "/XObject" in obj.get("/Resources", {}):
                    self._process_sub_xobject(obj, quality, scale)
            except Exception:
                continue

    def _process_sub_xobject(self, obj, quality: int, scale: float) -> None:
        resources = obj.get("/Resources")
        if not resources:
            return
        xobjects = resources.get("/XObject")
        if not xobjects:
            return
        for key in list(xobjects):
            try:
                child = xobjects[key]
                if not isinstance(child, pikepdf.Stream):
                    continue
                if child.get("/Subtype") == pikepdf.Name("/Image"):
                    self._compress_image(child, quality, scale)
                elif "/XObject" in child.get("/Resources", {}):
                    self._process_sub_xobject(child, quality, scale)
            except Exception:
                continue

    def _compress_image(self, img_obj, quality: int, scale: float) -> None:
        try:
            from PIL import Image

            width = int(img_obj.get("/Width", 0))
            height = int(img_obj.get("/Height", 0))
            if width == 0 or height == 0:
                return

            new_w = max(1, int(width * scale))
            new_h = max(1, int(height * scale))

            filter_val = str(img_obj.get("/Filter", ""))

            if "/DCTDecode" in filter_val or "/JPXDecode" in filter_val:
                try:
                    raw_data = img_obj.read_raw_bytes()
                    pil_img = Image.open(io.BytesIO(raw_data))
                except Exception:
                    return
            else:
                try:
                    raw_data = img_obj.read_bytes()
                except Exception:
                    return

                color_space = str(img_obj.get("/ColorSpace", ""))
                try:
                    bpc = int(img_obj.get("/BitsPerComponent", 8))
                except (ValueError, TypeError):
                    bpc = 8

                if "Gray" in color_space or "DeviceGray" in color_space:
                    mode = "L"
                    channels = 1
                elif "CMYK" in color_space:
                    mode = "CMYK"
                    channels = 4
                else:
                    mode = "RGB"
                    channels = 3

                expected_bytes = width * height * channels
                if bpc < 8:
                    expected_bytes = (width * channels * bpc + 7) // 8 * height

                if len(raw_data) < expected_bytes:
                    return

                try:
                    if channels == 1:
                        pil_img = Image.frombytes("L", (width, height), raw_data[:expected_bytes])
                    elif channels == 4:
                        pil_img = Image.frombytes("CMYK", (width, height), raw_data[:expected_bytes])
                    else:
                        pil_img = Image.frombytes("RGB", (width, height), raw_data[:expected_bytes])
                except Exception:
                    return

            if pil_img.mode in ("RGBA", "P", "LA"):
                pil_img = pil_img.convert("RGB")
            elif pil_img.mode == "CMYK":
                pil_img = pil_img.convert("RGB")

            if scale < 1.0:
                pil_img = pil_img.resize((new_w, new_h), Image.LANCZOS)

            buf = io.BytesIO()
            pil_img.save(buf, format="JPEG", quality=quality, optimize=True)
            jpeg_data = buf.getvalue()

            img_obj.write(jpeg_data)
            img_obj[Name.Filter] = Name.DCTDecode
            img_obj[Name.Width] = pil_img.width
            img_obj[Name.Height] = pil_img.height
            img_obj[Name.ColorSpace] = Name.DeviceRGB
            img_obj[Name.BitsPerComponent] = 8

        except Exception:
            pass

    def compress_single_pdf(
        self,
        pdf_bytes: bytes,
        quality: int,
        scale: float,
    ) -> bytes:
        """Compress a single PDF and return compressed bytes."""
        tmp_src = None
        tmp_dst = None
        try:
            import tempfile
            tmp_src = Path(tempfile.mktemp(suffix=".pdf"))
            tmp_dst = Path(tempfile.mktemp(suffix=".pdf"))
            tmp_src.write_bytes(pdf_bytes)

            with Pdf.open(str(tmp_src)) as pdf:
                self._strip_metadata(pdf)
                for page in pdf.pages:
                    self._process_page(page, quality, scale)
                pdf.save(
                    str(tmp_dst),
                    compress_streams=True,
                    object_stream_mode=pikepdf.ObjectStreamMode.generate,
                    recompress_flate=True,
                    linearize=False,
                )

            compressed = tmp_dst.read_bytes()
            if len(compressed) >= len(pdf_bytes):
                return pdf_bytes
            return compressed
        finally:
            if tmp_src and tmp_src.exists():
                tmp_src.unlink(missing_ok=True)
            if tmp_dst and tmp_dst.exists():
                tmp_dst.unlink(missing_ok=True)

    def process_batch_compression(
        self,
        session_id: str,
        files_data: List[Dict[str, Any]],
        compression_level: str = "recommended",
    ) -> Dict[str, Any]:
        level = COMPRESSION_LEVELS.get(compression_level, COMPRESSION_LEVELS["recommended"])
        quality = level["quality"]
        scale = level["scale"]

        if not files_data or len(files_data) == 0:
            raise ValueError("No files provided for batch compression.")

        session_dir = Paths.request_output(session_id)
        session_dir.mkdir(parents=True, exist_ok=True)

        batch_out_dir = session_dir / "compressed_files"
        batch_out_dir.mkdir(parents=True, exist_ok=True)

        results = []
        failed_details = []
        successful_files_count = 0
        failed_files_count = 0
        generated_files: List[Path] = []

        total_files = len(files_data)

        for item in files_data:
            filename = self.sanitize_filename(item.get("filename", "document.pdf"))
            file_bytes = item.get("bytes", b"")

            is_valid, err_msg = self.validate_pdf_bytes(filename, file_bytes)
            if not is_valid:
                failed_files_count += 1
                failed_details.append({"filename": filename, "reason": err_msg})
                results.append({"filename": filename, "status": "failed", "error": err_msg})
                continue

            try:
                original_size = len(file_bytes)
                compressed_bytes = self.compress_single_pdf(file_bytes, quality, scale)
                compressed_size = len(compressed_bytes)

                stem = Path(filename).stem or "compressed"
                clean_stem = re.sub(r'[\\/:*?"<>|]', "_", stem).strip(" ._") or "compressed"
                out_name = self.get_unique_filename(batch_out_dir, f"{clean_stem}_compressed.pdf")
                out_path = batch_out_dir / out_name
                out_path.write_bytes(compressed_bytes)

                reduction = round((1 - compressed_size / original_size) * 100, 2) if original_size > 0 else 0.0
                reduction = max(reduction, 0.0)

                successful_files_count += 1
                generated_files.append(out_path)
                results.append({
                    "filename": filename,
                    "status": "success",
                    "output_filename": out_name,
                    "original_size": original_size,
                    "compressed_size": compressed_size,
                    "reduction_percent": reduction,
                })

            except Exception as exc:
                logger.error(f"Error compressing {filename}: {exc}", exc_info=True)
                failed_files_count += 1
                failed_details.append({"filename": filename, "reason": f"Compression error: {str(exc)}"})
                results.append({"filename": filename, "status": "failed", "error": str(exc)})

        download_filename = ""
        is_zip = False

        if len(generated_files) > 1:
            zip_filename = f"batch_compressed_{session_id[:8]}.zip"
            zip_path = session_dir / zip_filename
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for fpath in generated_files:
                    zf.write(fpath, arcname=fpath.name)
            download_filename = zip_filename
            is_zip = True
        elif len(generated_files) == 1:
            download_filename = generated_files[0].name
            is_zip = False
        else:
            download_filename = ""

        return {
            "session_id": session_id,
            "compression_level": compression_level,
            "compression_label": level["label"],
            "total_files": total_files,
            "successful_files": successful_files_count,
            "failed_files": failed_files_count,
            "results": results,
            "failed_details": failed_details,
            "download_filename": download_filename,
            "is_zip": is_zip,
            "has_download": bool(download_filename),
            "download_url": f"/document-management/batch-compression/download/{session_id}" if download_filename else None,
        }

    def get_download_file(self, session_id: str) -> Tuple[Path, str]:
        session_dir = Paths.request_output(session_id)
        if not session_dir.exists():
            raise ValueError("Session compression data not found or expired.")

        zips = list(session_dir.glob("*.zip"))
        if zips:
            return zips[0], zips[0].name

        batch_out_dir = session_dir / "compressed_files"
        if batch_out_dir.exists():
            files = [f for f in batch_out_dir.iterdir() if f.is_file()]
            if files:
                return files[0], files[0].name

        raise ValueError("No downloadable compressed file found for this session.")

    def get_single_compressed_file(self, session_id: str, filename: str) -> Tuple[Path, str]:
        if not session_id or re.search(r"[\\/]", session_id):
            raise ValueError("Invalid session ID.")
        if not filename or re.search(r"[\\/]", filename):
            raise ValueError("Invalid filename.")

        session_dir = Paths.request_output(session_id)
        batch_out_dir = session_dir / "compressed_files"
        if not batch_out_dir.exists():
            raise ValueError("No compressed files found for this session.")

        target = batch_out_dir / filename
        if not target.exists():
            raise ValueError(f"File '{filename}' not found in compressed results.")

        return target, filename


batch_compression_service = BatchCompressionService()
