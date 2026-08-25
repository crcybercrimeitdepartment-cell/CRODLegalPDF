"""
Batch Export Service — Document Management Section.

Handles multi-file PDF processing and batch exporting into supported formats:
- PDF (Standard / Resaved PDF)
- Images (JPG, PNG, WEBP, BMP, GIF, SVG, TIFF)
- Text & Documents (TXT, Markdown, HTML, CSV, JSON)
- Office Documents (DOCX, XLSX, PPTX)

Features:
- Independent file processing (one failed/corrupt file does not stop the batch)
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
import shutil
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF
from PIL import Image

from app.core.paths import Paths
from app.document_management_services.save_as_service import save_as_service

logger = logging.getLogger(__name__)

# Max allowed file size per uploaded PDF file (100 MB)
MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024

# Supported export formats and their display names / extensions
SUPPORTED_EXPORT_FORMATS = {
    "pdf": {"name": "PDF Document", "ext": ".pdf"},
    "docx": {"name": "Word Document", "ext": ".docx"},
    "xlsx": {"name": "Excel Spreadsheet", "ext": ".xlsx"},
    "pptx": {"name": "PowerPoint Presentation", "ext": ".pptx"},
    "jpg": {"name": "JPEG Image", "ext": ".jpg"},
    "png": {"name": "PNG Image", "ext": ".png"},
    "webp": {"name": "WEBP Image", "ext": ".webp"},
    "bmp": {"name": "BMP Image", "ext": ".bmp"},
    "gif": {"name": "GIF Image", "ext": ".gif"},
    "svg": {"name": "SVG Vector Image", "ext": ".svg"},
    "tiff": {"name": "TIFF Image", "ext": ".tiff"},
    "txt": {"name": "Text File", "ext": ".txt"},
    "html": {"name": "HTML Document", "ext": ".html"},
    "json": {"name": "JSON Data", "ext": ".json"},
    "csv": {"name": "CSV Spreadsheet", "ext": ".csv"},
    "md": {"name": "Markdown Document", "ext": ".md"},
}


class BatchExportService:
    """Enterprise service for batch exporting multiple PDF documents."""

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and unsafe characters."""
        clean = Path(filename or "document.pdf").name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "exported_document.pdf"

    def validate_pdf_bytes(self, filename: str, pdf_bytes: bytes) -> Tuple[bool, str]:
        """
        Validate single PDF file bytes before processing.
        Checks empty bytes, size limit, PDF magic header, encryption/password, and corruption.
        """
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
            return False, f"Corrupted or unreadable PDF document ({str(e)})"

        return True, ""

    def get_unique_filename(self, output_dir: Path, filename: str) -> str:
        """Generate a safe, unique filename inside output_dir to prevent filename collisions."""
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

    def convert_single_pdf(
        self,
        session_id: str,
        pdf_bytes: bytes,
        original_filename: str,
        target_format: str,
        output_dir: Path,
    ) -> List[Path]:
        """
        Convert a single validated PDF document into the requested target format.
        Returns a list of generated file paths in output_dir.
        """
        fmt = (target_format or "pdf").lower().strip()
        stem = Path(original_filename).stem or "exported"
        clean_stem = re.sub(r'[\\/:*?"<>|]', "_", stem).strip(" ._") or "exported"

        fmt_info = SUPPORTED_EXPORT_FORMATS.get(fmt, {"ext": f".{fmt}"})
        target_ext = fmt_info["ext"]

        # Rely on save_as_service execution for supported formats
        try:
            res = save_as_service.execute_save_as(
                session_id=session_id,
                source_bytes=pdf_bytes,
                original_filename=original_filename,
                desired_filename=f"{clean_stem}{target_ext}",
                target_format=fmt,
            )
            
            # save_as_service places files into Paths.request_output(session_id)
            save_as_out_dir = Paths.request_output(session_id)
            out_files = [f for f in save_as_out_dir.iterdir() if f.is_file() and not f.name.endswith(".zip") and f.parent == save_as_out_dir]
            
            moved_paths = []
            for sf in out_files:
                target_name = self.get_unique_filename(output_dir, sf.name)
                dest = output_dir / target_name
                shutil.move(str(sf), str(dest))
                moved_paths.append(dest)
            return moved_paths

        except Exception as e:
            logger.warning(f"save_as_service fallback for {original_filename} ({fmt}): {e}")
            # Fallback manual conversion if needed
            output_paths = []
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")

            if fmt == "pdf":
                target_name = self.get_unique_filename(output_dir, f"{clean_stem}.pdf")
                out_path = output_dir / target_name
                out_path.write_bytes(pdf_bytes)
                output_paths.append(out_path)

            elif fmt in ["jpg", "jpeg", "png", "webp", "bmp", "gif", "tiff"]:
                img_ext = fmt if fmt != "jpeg" else "jpg"
                if len(doc) == 1:
                    target_name = self.get_unique_filename(output_dir, f"{clean_stem}.{img_ext}")
                    out_path = output_dir / target_name
                    pix = doc[0].get_pixmap(dpi=150)
                    pix.save(str(out_path))
                    output_paths.append(out_path)
                else:
                    for i, page in enumerate(doc):
                        target_name = self.get_unique_filename(output_dir, f"{clean_stem}_page_{i+1}.{img_ext}")
                        out_path = output_dir / target_name
                        pix = page.get_pixmap(dpi=150)
                        pix.save(str(out_path))
                        output_paths.append(out_path)

            elif fmt == "txt":
                target_name = self.get_unique_filename(output_dir, f"{clean_stem}.txt")
                out_path = output_dir / target_name
                content = "\n\n".join([f"--- Page {i+1} ---\n" + page.get_text("text") for i, page in enumerate(doc)])
                out_path.write_text(content, encoding="utf-8")
                output_paths.append(out_path)

            elif fmt in ["md", "markdown"]:
                target_name = self.get_unique_filename(output_dir, f"{clean_stem}.md")
                out_path = output_dir / target_name
                content = "\n\n---\n\n".join([f"# Page {i+1}\n\n" + page.get_text("text") for i, page in enumerate(doc)])
                out_path.write_text(content, encoding="utf-8")
                output_paths.append(out_path)

            elif fmt == "html":
                target_name = self.get_unique_filename(output_dir, f"{clean_stem}.html")
                out_path = output_dir / target_name
                html_body = "".join([f"<h2>Page {i+1}</h2><p>{page.get_text('html')}</p>" for i, page in enumerate(doc)])
                full_html = f"<!DOCTYPE html><html><head><meta charset='utf-8'><title>{clean_stem}</title></head><body>{html_body}</body></html>"
                out_path.write_text(full_html, encoding="utf-8")
                output_paths.append(out_path)

            else:
                target_name = self.get_unique_filename(output_dir, f"{clean_stem}.pdf")
                out_path = output_dir / target_name
                out_path.write_bytes(pdf_bytes)
                output_paths.append(out_path)

            doc.close()
            return output_paths

    def process_batch_export(
        self,
        session_id: str,
        files_data: List[Dict[str, Any]],
        target_format: str = "pdf",
    ) -> Dict[str, Any]:
        """
        Process a batch of uploaded PDF files for export.

        Args:
            session_id: Unique session / request ID
            files_data: List of dicts containing {"filename": str, "bytes": bytes}
            target_format: Requested export format (pdf, docx, xlsx, pptx, jpg, png, webp, txt, html, etc.)

        Returns:
            Dict summary containing total, successful, failed, failed details, and download information.
        """
        fmt = (target_format or "pdf").lower().strip()
        if fmt not in SUPPORTED_EXPORT_FORMATS:
            raise ValueError(f"Unsupported export format '{target_format}'. Supported formats: {', '.join(SUPPORTED_EXPORT_FORMATS.keys())}")

        if not files_data or len(files_data) == 0:
            raise ValueError("No files provided for batch export.")

        session_dir = Paths.request_output(session_id)
        session_dir.mkdir(parents=True, exist_ok=True)

        batch_out_dir = session_dir / "exported_files"
        batch_out_dir.mkdir(parents=True, exist_ok=True)

        results = []
        failed_details = []
        successful_files_count = 0
        failed_files_count = 0
        generated_all_files: List[Path] = []

        total_files = len(files_data)

        for item in files_data:
            filename = self.sanitize_filename(item.get("filename", "document.pdf"))
            file_bytes = item.get("bytes", b"")

            # Validate PDF file
            is_valid, err_msg = self.validate_pdf_bytes(filename, file_bytes)
            if not is_valid:
                failed_files_count += 1
                failed_details.append({
                    "filename": filename,
                    "reason": err_msg
                })
                results.append({
                    "filename": filename,
                    "status": "failed",
                    "error": err_msg
                })
                continue

            # Convert valid PDF file
            try:
                converted_paths = self.convert_single_pdf(
                    session_id=session_id,
                    pdf_bytes=file_bytes,
                    original_filename=filename,
                    target_format=fmt,
                    output_dir=batch_out_dir,
                )

                if converted_paths:
                    successful_files_count += 1
                    generated_all_files.extend(converted_paths)
                    results.append({
                        "filename": filename,
                        "status": "success",
                        "output_files": [p.name for p in converted_paths]
                    })
                else:
                    failed_files_count += 1
                    failed_details.append({
                        "filename": filename,
                        "reason": "Conversion produced no output files."
                    })
                    results.append({
                        "filename": filename,
                        "status": "failed",
                        "error": "Conversion produced no output files."
                    })

            except Exception as exc:
                logger.error(f"Error converting {filename} to {fmt}: {exc}", exc_info=True)
                failed_files_count += 1
                failed_details.append({
                    "filename": filename,
                    "reason": f"Export error: {str(exc)}"
                })
                results.append({
                    "filename": filename,
                    "status": "failed",
                    "error": str(exc)
                })

        # Package output into downloadable response
        download_filename = ""
        is_zip = False

        if len(generated_all_files) > 1:
            zip_filename = f"batch_export_{fmt}_{session_id[:8]}.zip"
            zip_path = session_dir / zip_filename
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for fpath in generated_all_files:
                    zf.write(fpath, arcname=fpath.name)
            download_filename = zip_filename
            is_zip = True
        elif len(generated_all_files) == 1:
            single_file = generated_all_files[0]
            download_filename = single_file.name
            shutil.copy(str(single_file), str(session_dir / download_filename))
            is_zip = download_filename.endswith(".zip")
        else:
            download_filename = ""

        return {
            "session_id": session_id,
            "target_format": fmt,
            "format_name": SUPPORTED_EXPORT_FORMATS[fmt]["name"],
            "total_files": total_files,
            "successful_files": successful_files_count,
            "failed_files": failed_files_count,
            "results": results,
            "failed_details": failed_details,
            "download_filename": download_filename,
            "is_zip": is_zip,
            "has_download": bool(download_filename),
            "download_url": f"/document-management/batch-export/download/{session_id}" if download_filename else None,
        }

    def get_export_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        """Locate the exported file or ZIP archive for download response."""
        session_dir = Paths.request_output(session_id)
        if not session_dir.exists():
            raise ValueError("Session export data not found or expired.")

        # Look for zip file first
        zips = list(session_dir.glob("*.zip"))
        if zips:
            return zips[0], zips[0].name

        # Otherwise look for any file directly in session_dir
        files = [f for f in session_dir.iterdir() if f.is_file() and f.name != "exported_files"]
        if files:
            return files[0], files[0].name

        # Check exported_files subdirectory
        batch_out_dir = session_dir / "exported_files"
        if batch_out_dir.exists():
            sub_files = [f for f in batch_out_dir.iterdir() if f.is_file()]
            if sub_files:
                return sub_files[0], sub_files[0].name

        raise ValueError("No downloadable export file found for this session.")


batch_export_service = BatchExportService()
