"""
Batch Rename Service — Document Management Section.

Handles multi-file PDF batch renaming based on configurable naming rules:
- Prefix (text before original name)
- Suffix (text before extension)
- Sequential Numbering (1, 01, 001, 0001 with custom start number)
- Date Token (YYYY-MM-DD or custom date)
- Custom Token Pattern ({original_name}, {number}, {date}, {prefix}, {suffix})

Features:
- Live preview computation
- Filename sanitization (OS forbidden character replacement, path traversal protection)
- Automatic collision avoidance (no silent overwriting)
- Independent file validation (zero-byte, encryption, corruption checks)
- ZIP archive packaging for batch results
- Summary reporting and safe temporary file lifecycle management
"""

from __future__ import annotations

import datetime
import logging
import re
import shutil
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

# Max allowed file size per uploaded PDF file (100 MB)
MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024


class BatchRenameService:
    """Enterprise service for batch renaming multiple PDF documents."""

    def sanitize_filename_stem(self, name: str) -> str:
        """
        Sanitize filename stem to prevent path traversal and unsafe characters.
        Strips Windows forbidden characters: \\ / : * ? " < > |
        """
        if not name:
            return "document"

        clean = Path(name).name
        # Remove extension if present in input string
        if clean.lower().endswith(".pdf"):
            clean = clean[:-4]

        # Replace forbidden characters with underscore
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        # Collapse multiple spaces
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document"

    def format_sequential_number(self, index_offset: int, start_number_str: str) -> str:
        """
        Format sequential number preserving zero-padding width based on start_number_str.
        Examples:
          start_number_str = "001", index_offset = 0 -> "001"
          start_number_str = "001", index_offset = 1 -> "002"
          start_number_str = "1", index_offset = 2 -> "3"
          start_number_str = "01", index_offset = 9 -> "10"
        """
        start_str = (start_number_str or "1").strip()
        padding_width = len(start_str) if start_str.startswith("0") and len(start_str) > 1 else 1

        try:
            start_num = int(start_str)
        except ValueError:
            start_num = 1

        current_val = start_num + index_offset
        if padding_width > 1:
            return f"{current_val:0{padding_width}d}"
        return str(current_val)

    def generate_single_new_name(
        self,
        original_filename: str,
        index_offset: int = 0,
        prefix: str = "",
        suffix: str = "",
        enable_numbering: bool = False,
        start_number: str = "1",
        enable_date: bool = False,
        custom_date: str = "",
        custom_pattern: str = "",
    ) -> str:
        """
        Generate the newly renamed filename for a single file according to rules/pattern.
        Always returns a clean filename ending with '.pdf'.
        """
        raw_stem = Path(original_filename or "file.pdf").stem
        orig_name_clean = self.sanitize_filename_stem(raw_stem)

        prefix_clean = self.sanitize_filename_stem(prefix) if prefix else ""
        suffix_clean = self.sanitize_filename_stem(suffix) if suffix else ""

        number_str = self.format_sequential_number(index_offset, start_number) if enable_numbering else ""

        if enable_date:
            date_str = (custom_date or "").strip()
            if not date_str:
                date_str = datetime.date.today().strftime("%Y-%m-%d")
            else:
                date_str = re.sub(r'[\\/:*?"<>|]', "-", date_str)
        else:
            date_str = ""

        # If custom pattern is provided and contains tokens, parse it
        pattern = (custom_pattern or "").strip()
        if pattern and ("{" in pattern and "}" in pattern):
            new_stem = pattern
            new_stem = new_stem.replace("{original_name}", orig_name_clean)
            new_stem = new_stem.replace("{number}", number_str)
            new_stem = new_stem.replace("{date}", date_str)
            new_stem = new_stem.replace("{prefix}", prefix_clean)
            new_stem = new_stem.replace("{suffix}", suffix_clean)

            # Clean double underscores or empty token separators
            new_stem = re.sub(r"_{2,}", "_", new_stem)
            new_stem = re.sub(r"^-+|-+$|^_+|_+$", "", new_stem).strip()
            new_stem = self.sanitize_filename_stem(new_stem)
        else:
            # Construct using default rule order
            parts = []
            if prefix_clean:
                parts.append(prefix_clean)
            if enable_numbering and number_str:
                parts.append(number_str)
            if enable_date and date_str:
                parts.append(date_str)
            parts.append(orig_name_clean)
            if suffix_clean:
                parts.append(suffix_clean)

            new_stem = "_".join(parts)
            new_stem = self.sanitize_filename_stem(new_stem)

        if not new_stem:
            new_stem = "renamed_document"

        return f"{new_stem}.pdf"

    def generate_previews(
        self,
        filenames: List[str],
        prefix: str = "",
        suffix: str = "",
        enable_numbering: bool = False,
        start_number: str = "1",
        enable_date: bool = False,
        custom_date: str = "",
        custom_pattern: str = "",
    ) -> List[Dict[str, str]]:
        """
        Generate a list of live previews mapping original filenames to new target filenames.
        Includes automatic collision detection indicator.
        """
        previews = []
        used_names: Dict[str, int] = {}

        for i, original in enumerate(filenames):
            cand_name = self.generate_single_new_name(
                original_filename=original,
                index_offset=i,
                prefix=prefix,
                suffix=suffix,
                enable_numbering=enable_numbering,
                start_number=start_number,
                enable_date=enable_date,
                custom_date=custom_date,
                custom_pattern=custom_pattern,
            )

            # Check collision
            if cand_name in used_names:
                used_names[cand_name] += 1
                stem = Path(cand_name).stem
                final_name = f"{stem} ({used_names[cand_name]}).pdf"
            else:
                used_names[cand_name] = 0
                final_name = cand_name

            previews.append({
                "original": original,
                "new_name": final_name,
                "is_collision_adjusted": final_name != cand_name
            })

        return previews

    def validate_pdf_bytes(self, filename: str, pdf_bytes: bytes) -> Tuple[bool, str]:
        """Validate single PDF file bytes before processing."""
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

    def process_batch_rename(
        self,
        session_id: str,
        files_data: List[Dict[str, Any]],
        prefix: str = "",
        suffix: str = "",
        enable_numbering: bool = False,
        start_number: str = "1",
        enable_date: bool = False,
        custom_date: str = "",
        custom_pattern: str = "",
    ) -> Dict[str, Any]:
        """
        Process batch rename operation for uploaded PDF files.

        Args:
            session_id: Unique session identifier
            files_data: List of dicts containing {"filename": str, "bytes": bytes}
            prefix: Text prefix
            suffix: Text suffix
            enable_numbering: Whether to include sequential numbers
            start_number: Start number string (e.g. "001")
            enable_date: Whether to include date
            custom_date: Optional custom date string
            custom_pattern: Optional custom pattern string

        Returns:
            Dict result summary with totals, successful, failed, failed details, and download link.
        """
        if not files_data or len(files_data) == 0:
            raise ValueError("No files provided for batch rename.")

        session_dir = Paths.request_output(session_id)
        session_dir.mkdir(parents=True, exist_ok=True)

        renamed_out_dir = session_dir / "renamed_files"
        renamed_out_dir.mkdir(parents=True, exist_ok=True)

        results = []
        failed_details = []
        successful_count = 0
        failed_count = 0
        generated_pdf_files: List[Path] = []
        used_target_filenames: Dict[str, int] = {}

        total_files = len(files_data)

        for i, item in enumerate(files_data):
            orig_filename = item.get("filename", f"file_{i+1}.pdf")
            file_bytes = item.get("bytes", b"")

            # Validate PDF file
            is_valid, err_msg = self.validate_pdf_bytes(orig_filename, file_bytes)
            if not is_valid:
                failed_count += 1
                failed_details.append({
                    "filename": orig_filename,
                    "reason": err_msg
                })
                results.append({
                    "original": orig_filename,
                    "renamed": "-",
                    "status": "failed",
                    "error": err_msg
                })
                continue

            # Generate target new filename
            target_name = self.generate_single_new_name(
                original_filename=orig_filename,
                index_offset=i,
                prefix=prefix,
                suffix=suffix,
                enable_numbering=enable_numbering,
                start_number=start_number,
                enable_date=enable_date,
                custom_date=custom_date,
                custom_pattern=custom_pattern,
            )

            # Automatic filename collision resolution
            if target_name in used_target_filenames:
                used_target_filenames[target_name] += 1
                stem = Path(target_name).stem
                final_target_name = f"{stem} ({used_target_filenames[target_name]}).pdf"
            else:
                used_target_filenames[target_name] = 0
                final_target_name = target_name

            out_path = renamed_out_dir / final_target_name

            try:
                # Write/save renamed PDF file
                out_path.write_bytes(file_bytes)
                successful_count += 1
                generated_pdf_files.append(out_path)
                results.append({
                    "original": orig_filename,
                    "renamed": final_target_name,
                    "status": "success"
                })
            except Exception as exc:
                logger.error(f"Error saving renamed file {final_target_name}: {exc}", exc_info=True)
                failed_count += 1
                failed_details.append({
                    "filename": orig_filename,
                    "reason": f"File save error: {str(exc)}"
                })
                results.append({
                    "original": orig_filename,
                    "renamed": final_target_name,
                    "status": "failed",
                    "error": str(exc)
                })

        # Package outputs for download
        download_filename = ""
        is_zip = False

        if len(generated_pdf_files) > 1:
            zip_filename = f"renamed_pdfs_{session_id[:8]}.zip"
            zip_path = session_dir / zip_filename
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for pdf_file in generated_pdf_files:
                    zf.write(pdf_file, arcname=pdf_file.name)
            download_filename = zip_filename
            is_zip = True
        elif len(generated_pdf_files) == 1:
            single_file = generated_pdf_files[0]
            download_filename = single_file.name
            shutil.copy(str(single_file), str(session_dir / download_filename))
            is_zip = False
        else:
            download_filename = ""

        return {
            "session_id": session_id,
            "total_files": total_files,
            "successful_files": successful_count,
            "failed_files": failed_count,
            "results": results,
            "failed_details": failed_details,
            "download_filename": download_filename,
            "is_zip": is_zip,
            "has_download": bool(download_filename),
            "download_url": f"/document-management/batch-rename/download/{session_id}" if download_filename else None,
        }

    def get_renamed_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        """Locate the renamed files ZIP archive or single PDF for download response."""
        session_dir = Paths.request_output(session_id)
        if not session_dir.exists():
            raise ValueError("Session rename data not found or expired.")

        # Check ZIP file
        zips = list(session_dir.glob("*.zip"))
        if zips:
            return zips[0], zips[0].name

        # Check single PDF directly in session_dir
        pdfs = [f for f in session_dir.iterdir() if f.is_file() and f.name.endswith(".pdf") and f.name != "renamed_files"]
        if pdfs:
            return pdfs[0], pdfs[0].name

        # Check renamed_files directory
        renamed_out_dir = session_dir / "renamed_files"
        if renamed_out_dir.exists():
            sub_files = [f for f in renamed_out_dir.iterdir() if f.is_file()]
            if sub_files:
                return sub_files[0], sub_files[0].name

        raise ValueError("No downloadable renamed file found for this session.")


batch_rename_service = BatchRenameService()
