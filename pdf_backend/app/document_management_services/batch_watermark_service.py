"""
Batch Watermark Service — Document Management Section.

Handles multi-file PDF watermarking with text or image watermarks:
- Text watermarks: configurable text, font size, color, opacity, rotation, position
- Image watermarks: configurable image, scale, opacity, rotation, position
- Position presets: Top Left, Top Center, Top Right, Center Left, Center,
  Center Right, Bottom Left, Bottom Center, Bottom Right
- Page scope: all pages or custom page range

Features:
- Independent file processing (one failed file does not stop the batch)
- Summary reporting with total, successful, failed, and specific failure reasons
- Collision-free output filename management
- Automatic ZIP packaging for multi-file results or single-file direct download
- Temporary directory lifecycle management
"""

from __future__ import annotations

import io
import json
import logging
import re
import tempfile
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import fitz  # PyMuPDF
from PIL import Image as PILImage, ImageEnhance

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024
ALLOWED_IMAGE_FORMATS = {"PNG", "JPEG", "JPG", "BMP", "TIFF", "WEBP"}

POSITION_PRESETS = {
    "Top Left", "Top Center", "Top Right",
    "Center Left", "Center", "Center Right",
    "Bottom Left", "Bottom Center", "Bottom Right",
}


class BatchWatermarkService:
    """Enterprise service for batch watermarking multiple PDF documents."""

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
        except Exception:
            return False, "Corrupted or unreadable PDF document."

        return True, ""

    def validate_image_bytes(self, image_bytes: bytes) -> Tuple[bool, str]:
        if not image_bytes or len(image_bytes) == 0:
            return False, "Watermark image is empty."

        try:
            with PILImage.open(io.BytesIO(image_bytes)) as img:
                fmt = img.format
                if not fmt or fmt.upper() not in ALLOWED_IMAGE_FORMATS:
                    return False, f"Unsupported image format: {fmt or 'unknown'}"
        except Exception:
            return False, "Invalid or corrupted watermark image."

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

    def _hex_to_rgb(self, hex_color: str) -> Tuple[float, float, float]:
        hex_color = hex_color.lstrip("#")
        if len(hex_color) == 6:
            return (
                int(hex_color[0:2], 16) / 255.0,
                int(hex_color[2:4], 16) / 255.0,
                int(hex_color[4:6], 16) / 255.0,
            )
        return (0.0, 0.0, 0.0)

    def _get_fitz_font(self, font_family: str, bold: bool, italic: bool) -> str:
        base = "helv"
        fam = font_family.lower()
        if "times" in fam:
            base = "tiro"
        elif "courier" in fam:
            base = "cour"
        elif "symbol" in fam:
            return "symb"
        elif "zapf" in fam:
            return "zadb"

        if base == "tiro":
            if bold and italic:
                return "tibi"
            if bold:
                return "tibo"
            if italic:
                return "tiit"
            return "tiro"
        elif base == "cour":
            if bold and italic:
                return "cobi"
            if bold:
                return "cobo"
            if italic:
                return "coit"
            return "cour"
        else:
            if bold and italic:
                return "hebi"
            if bold:
                return "hebo"
            if italic:
                return "heit"
            return "helv"

    def _parse_pages(self, selection: str, total: int) -> Set[int]:
        if not selection or selection.lower() == "all":
            return set(range(total))

        selection = selection.lower().strip()
        if selection == "first page":
            return {0}
        if selection == "last page":
            return {total - 1}
        if selection == "odd pages":
            return set(i for i in range(total) if i % 2 == 0)
        if selection == "even pages":
            return set(i for i in range(total) if i % 2 == 1)

        result = set()
        for part in selection.split(","):
            part = part.strip()
            if not part:
                continue
            if "-" in part:
                try:
                    start_str, end_str = part.split("-", 1)
                    start = int(start_str.strip())
                    end = int(end_str.strip())
                    for i in range(start - 1, end):
                        if 0 <= i < total:
                            result.add(i)
                except ValueError:
                    raise ValueError(f"Invalid page range: {part}")
            else:
                try:
                    val = int(part) - 1
                    if 0 <= val < total:
                        result.add(val)
                except ValueError:
                    raise ValueError(f"Invalid page number: {part}")

        if not result:
            raise ValueError("No valid pages selected for watermarking.")

        return result

    def _get_preset_position(
        self, preset: str, pw: float, ph: float, ww: float, wh: float, margin: float
    ) -> Tuple[float, float]:
        x_center = (pw - ww) / 2.0
        y_center = (ph - wh) / 2.0
        x_right = pw - ww - margin
        y_bottom = ph - wh - margin
        x_left = margin
        y_top = margin

        positions = {
            "Top Left": (x_left, y_top),
            "Top Center": (x_center, y_top),
            "Top Right": (x_right, y_top),
            "Center Left": (x_left, y_center),
            "Center": (x_center, y_center),
            "Center Right": (x_right, y_center),
            "Bottom Left": (x_left, y_bottom),
            "Bottom Center": (x_center, y_bottom),
            "Bottom Right": (x_right, y_bottom),
        }
        return positions.get(preset, (x_center, y_center))

    def _apply_text_watermark(
        self,
        page: fitz.Page,
        text: str,
        font_name: str,
        font_size: float,
        color_rgb: Tuple[float, float, float],
        opacity: float,
        rotation: float,
        position: str,
        scale: float,
        margin: float,
    ) -> None:
        page_rect = page.rect
        tw = fitz.get_text_length(text, fontname=font_name, fontsize=font_size * scale)
        th = font_size * scale
        w_width, w_height = tw, th

        x, y = self._get_preset_position(position, page_rect.width, page_rect.height, w_width, w_height, margin)

        point = fitz.Point(x, y + w_height * 0.8)
        center = fitz.Point(x + w_width / 2, y + w_height / 2)
        page.insert_text(
            point,
            text,
            fontname=font_name,
            fontsize=font_size * scale,
            color=color_rgb,
            fill_opacity=opacity,
            morph=(center, fitz.Matrix(-rotation)),
            overlay=True,
        )

    def _apply_image_watermark(
        self,
        page: fitz.Page,
        image_bytes: bytes,
        img_width: float,
        img_height: float,
        position: str,
        margin: float,
    ) -> None:
        page_rect = page.rect
        w_width, w_height = img_width, img_height

        x, y = self._get_preset_position(position, page_rect.width, page_rect.height, w_width, w_height, margin)

        rect = fitz.Rect(x, y, x + w_width, y + w_height)
        page.insert_image(rect, stream=image_bytes, overlay=True)

    def watermark_single_pdf(
        self,
        pdf_bytes: bytes,
        watermark_type: str,
        text: str = "",
        font_family: str = "Helvetica",
        font_size: float = 36.0,
        font_color: str = "#000000",
        bold: bool = False,
        italic: bool = False,
        opacity: float = 50.0,
        rotation: float = 0.0,
        scale: float = 1.0,
        position: str = "Center",
        pages_selection: str = "all",
        image_bytes: Optional[bytes] = None,
        image_scale: float = 1.0,
        image_rotation: float = 0.0,
        image_opacity: float = 50.0,
    ) -> bytes:
        """Apply watermark to a single PDF and return the watermarked bytes."""
        opacity_ratio = max(0.0, min(100.0, opacity)) / 100.0

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        if doc.needs_pass:
            doc.close()
            raise ValueError("Password-protected PDFs are not supported.")

        if doc.page_count == 0:
            doc.close()
            raise ValueError("Empty PDF provided.")

        try:
            pages_to_watermark = self._parse_pages(pages_selection, doc.page_count)

            processed_image_bytes = None
            img_width, img_height = 0.0, 0.0

            if watermark_type == "image":
                if not image_bytes:
                    raise ValueError("No watermark image provided.")
                try:
                    pil_img = PILImage.open(io.BytesIO(image_bytes))
                    if pil_img.format not in ALLOWED_IMAGE_FORMATS:
                        raise ValueError(f"Unsupported image format: {pil_img.format}")

                    if image_opacity < 1.0:
                        if pil_img.mode != "RGBA":
                            pil_img = pil_img.convert("RGBA")
                        alpha = pil_img.split()[3]
                        alpha = ImageEnhance.Brightness(alpha).enhance(image_opacity)
                        pil_img.putalpha(alpha)

                    if image_scale != 1.0:
                        new_size = (int(pil_img.width * image_scale), int(pil_img.height * image_scale))
                        pil_img = pil_img.resize(new_size, PILImage.Resampling.LANCZOS)

                    if image_rotation != 0.0:
                        pil_img = pil_img.rotate(-image_rotation, expand=True, resample=PILImage.Resampling.BICUBIC)

                    img_width, img_height = float(pil_img.width), float(pil_img.height)

                    buf = io.BytesIO()
                    pil_img.save(buf, format="PNG")
                    processed_image_bytes = buf.getvalue()
                except ValueError:
                    raise
                except Exception as e:
                    raise ValueError(f"Error processing watermark image: {str(e)}")
            elif watermark_type != "text":
                raise ValueError("Watermark type must be 'text' or 'image'.")

            if watermark_type == "text" and not text:
                raise ValueError("Watermark text cannot be empty.")

            font_name = self._get_fitz_font(font_family, bold, italic)
            color_rgb = self._hex_to_rgb(font_color) if watermark_type == "text" else (0.0, 0.0, 0.0)

            for page_num in range(doc.page_count):
                if page_num not in pages_to_watermark:
                    continue

                page = doc[page_num]

                if watermark_type == "text":
                    self._apply_text_watermark(
                        page, text, font_name, font_size, color_rgb,
                        opacity_ratio, rotation, position, scale, margin=0.0,
                    )
                else:
                    self._apply_image_watermark(
                        page, processed_image_bytes, img_width, img_height,
                        position, margin=0.0,
                    )

            result_bytes = doc.tobytes(garbage=4, deflate=True)
            doc.close()
            return result_bytes

        except Exception as e:
            if doc and not doc.is_closed:
                doc.close()
            raise

    def process_batch_watermark(
        self,
        session_id: str,
        files_data: List[Dict[str, Any]],
        watermark_type: str,
        text: str = "",
        font_family: str = "Helvetica",
        font_size: float = 36.0,
        font_color: str = "#000000",
        bold: bool = False,
        italic: bool = False,
        opacity: float = 50.0,
        rotation: float = 0.0,
        scale: float = 1.0,
        position: str = "Center",
        pages_selection: str = "all",
        image_bytes: Optional[bytes] = None,
        image_scale: float = 1.0,
        image_rotation: float = 0.0,
        image_opacity: float = 50.0,
    ) -> Dict[str, Any]:
        if not files_data or len(files_data) == 0:
            raise ValueError("No files provided for batch watermark.")

        if watermark_type == "text" and not text:
            raise ValueError("Watermark text cannot be empty.")

        if watermark_type == "image" and not image_bytes:
            raise ValueError("No watermark image provided for image watermark.")

        if position not in POSITION_PRESETS:
            position = "Center"

        session_dir = Paths.request_output(session_id)
        session_dir.mkdir(parents=True, exist_ok=True)

        batch_out_dir = session_dir / "watermarked_files"
        batch_out_dir.mkdir(parents=True, exist_ok=True)

        results: List[Dict[str, Any]] = []
        failed_details: List[Dict[str, str]] = []
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
                watermarked_bytes = self.watermark_single_pdf(
                    pdf_bytes=file_bytes,
                    watermark_type=watermark_type,
                    text=text,
                    font_family=font_family,
                    font_size=font_size,
                    font_color=font_color,
                    bold=bold,
                    italic=italic,
                    opacity=opacity,
                    rotation=rotation,
                    scale=scale,
                    position=position,
                    pages_selection=pages_selection,
                    image_bytes=image_bytes,
                    image_scale=image_scale,
                    image_rotation=image_rotation,
                    image_opacity=image_opacity,
                )

                stem = Path(filename).stem or "watermarked"
                clean_stem = re.sub(r'[\\/:*?"<>|]', "_", stem).strip(" ._") or "watermarked"
                out_name = self.get_unique_filename(batch_out_dir, f"{clean_stem}_watermarked.pdf")
                out_path = batch_out_dir / out_name
                out_path.write_bytes(watermarked_bytes)

                successful_files_count += 1
                generated_files.append(out_path)
                results.append({
                    "filename": filename,
                    "status": "success",
                    "output_filename": out_name,
                    "original_size": len(file_bytes),
                    "watermarked_size": len(watermarked_bytes),
                })

            except Exception as exc:
                logger.error(f"Error watermarking {filename}: {exc}", exc_info=True)
                failed_files_count += 1
                failed_details.append({"filename": filename, "reason": f"Watermark error: {str(exc)}"})
                results.append({"filename": filename, "status": "failed", "error": str(exc)})

        download_filename = ""
        is_zip = False

        if len(generated_files) > 1:
            zip_filename = f"batch_watermarked_{session_id[:8]}.zip"
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
            "watermark_type": watermark_type,
            "total_files": total_files,
            "successful_files": successful_files_count,
            "failed_files": failed_files_count,
            "results": results,
            "failed_details": failed_details,
            "download_filename": download_filename,
            "is_zip": is_zip,
            "has_download": bool(download_filename),
            "download_url": f"/document-management/batch-watermark/download/{session_id}" if download_filename else None,
        }

    def get_download_file(self, session_id: str) -> Tuple[Path, str]:
        session_dir = Paths.request_output(session_id)
        if not session_dir.exists():
            raise ValueError("Session watermark data not found or expired.")

        zips = list(session_dir.glob("*.zip"))
        if zips:
            return zips[0], zips[0].name

        batch_out_dir = session_dir / "watermarked_files"
        if batch_out_dir.exists():
            files = [f for f in batch_out_dir.iterdir() if f.is_file()]
            if files:
                return files[0], files[0].name

        raise ValueError("No downloadable watermarked file found for this session.")

    def get_single_watermarked_file(self, session_id: str, filename: str) -> Tuple[Path, str]:
        if not session_id or re.search(r"[\\/]", session_id):
            raise ValueError("Invalid session ID.")
        if not filename or re.search(r"[\\/]", filename):
            raise ValueError("Invalid filename.")

        session_dir = Paths.request_output(session_id)
        batch_out_dir = session_dir / "watermarked_files"
        if not batch_out_dir.exists():
            raise ValueError("No watermarked files found for this session.")

        target = batch_out_dir / filename
        if not target.exists():
            raise ValueError(f"File '{filename}' not found in watermarked results.")

        return target, filename


batch_watermark_service = BatchWatermarkService()
