"""
Batch Encryption Service — Document Management Section.

Handles multi-file PDF encryption with password protection:
- AES-256 encryption via pikepdf
- User and owner password support
- Configurable document permissions (print, copy, modify)
- Independent file processing (one failed file does not stop the batch)
- Summary reporting with total, successful, failed, and specific failure reasons
- Collision-free output filename management
- Automatic ZIP packaging for multi-file results or single-file direct download
- Temporary directory lifecycle management
- Passwords never logged, stored in filenames, or exposed in responses
"""

from __future__ import annotations

import logging
import re
import tempfile
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Tuple

import fitz  # PyMuPDF
import pikepdf
from pikepdf import Pdf

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024


class BatchEncryptionService:
    """Enterprise service for batch encrypting multiple PDF documents."""

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
                return False, "PDF is already encrypted or password-protected."
            page_count = len(doc)
            doc.close()
            if page_count == 0:
                return False, "PDF document contains 0 pages."
        except Exception as e:
            logger.warning(f"Corrupted PDF detected ({filename}): {e}")
            return False, "Corrupted or unreadable PDF document."

        return True, ""

    def validate_password(self, password: str) -> Tuple[bool, str]:
        if not password or not password.strip():
            return False, "Password cannot be empty."
        if len(password) < 1:
            return False, "Password must be at least 1 character."
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

    def encrypt_single_pdf(
        self,
        pdf_bytes: bytes,
        password: str,
        allow_print: bool = True,
        allow_copy: bool = True,
        allow_modify: bool = True,
    ) -> bytes:
        """Encrypt a single PDF with the given password and return encrypted bytes."""
        tmp_src = None
        tmp_dst = None
        try:
            tmp_src = Path(tempfile.mktemp(suffix=".pdf"))
            tmp_dst = Path(tempfile.mktemp(suffix=".pdf"))
            tmp_src.write_bytes(pdf_bytes)

            with Pdf.open(str(tmp_src)) as pdf:
                owner_password = password
                user_password = password

                perm = pikepdf.Permissions(
                    accessibility=True,
                    extract=allow_copy,
                    modify_assembly=allow_modify,
                    modify_form=allow_modify,
                    modify_annotation=allow_modify,
                    modify_other=allow_modify,
                    print_highres=allow_print,
                    print_lowres=allow_print,
                )

                pdf.save(
                    str(tmp_dst),
                    encryption=pikepdf.Encryption(
                        owner=owner_password,
                        user=user_password,
                        R=6,
                        aes=True,
                        allow=perm,
                    ),
                )

            return tmp_dst.read_bytes()
        finally:
            if tmp_src and tmp_src.exists():
                tmp_src.unlink(missing_ok=True)
            if tmp_dst and tmp_dst.exists():
                tmp_dst.unlink(missing_ok=True)

    def process_batch_encryption(
        self,
        session_id: str,
        files_data: List[Dict[str, Any]],
        password: str = "",
        password_mode: str = "same",
        per_file_passwords: Dict[str, str] = None,
        allow_print: bool = True,
        allow_copy: bool = True,
        allow_modify: bool = True,
    ) -> Dict[str, Any]:
        if not files_data or len(files_data) == 0:
            raise ValueError("No files provided for batch encryption.")

        if password_mode not in ("same", "per_file"):
            password_mode = "same"

        if password_mode == "same":
            is_valid_pw, pw_err = self.validate_password(password)
            if not is_valid_pw:
                raise ValueError(pw_err)
        else:
            if not per_file_passwords:
                per_file_passwords = {}

        session_dir = Paths.request_output(session_id)
        session_dir.mkdir(parents=True, exist_ok=True)

        batch_out_dir = session_dir / "encrypted_files"
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

            file_password = password
            if password_mode == "per_file":
                file_password = per_file_passwords.get(filename, "")
                is_valid_pw, pw_err = self.validate_password(file_password)
                if not is_valid_pw:
                    failed_files_count += 1
                    err_msg = f"Password error: {pw_err}"
                    failed_details.append({"filename": filename, "reason": err_msg})
                    results.append({"filename": filename, "status": "failed", "error": err_msg})
                    continue

            try:
                encrypted_bytes = self.encrypt_single_pdf(
                    pdf_bytes=file_bytes,
                    password=file_password,
                    allow_print=allow_print,
                    allow_copy=allow_copy,
                    allow_modify=allow_modify,
                )

                stem = Path(filename).stem or "encrypted"
                clean_stem = re.sub(r'[\\/:*?"<>|]', "_", stem).strip(" ._") or "encrypted"
                out_name = self.get_unique_filename(batch_out_dir, f"{clean_stem}_encrypted.pdf")
                out_path = batch_out_dir / out_name
                out_path.write_bytes(encrypted_bytes)

                successful_files_count += 1
                generated_files.append(out_path)
                results.append({
                    "filename": filename,
                    "status": "success",
                    "output_filename": out_name,
                    "original_size": len(file_bytes),
                    "encrypted_size": len(encrypted_bytes),
                    "download_url": f"/document-management/batch-encryption/download-file/{session_id}/{out_name}"
                })

            except Exception as exc:
                logger.error(f"Error encrypting {filename}: {exc}", exc_info=True)
                failed_files_count += 1
                failed_details.append({"filename": filename, "reason": f"Encryption error: {str(exc)}"})
                results.append({"filename": filename, "status": "failed", "error": str(exc)})

        download_filename = ""
        is_zip = False

        if len(generated_files) > 1:
            zip_filename = f"batch_encrypted_{session_id[:8]}.zip"
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
            "total_files": total_files,
            "successful_files": successful_files_count,
            "failed_files": failed_files_count,
            "results": results,
            "failed_details": failed_details,
            "download_filename": download_filename,
            "is_zip": is_zip,
            "has_download": bool(download_filename),
            "download_url": f"/document-management/batch-encryption/download/{session_id}" if download_filename else None,
        }

    def get_download_file(self, session_id: str) -> Tuple[Path, str]:
        session_dir = Paths.request_output(session_id)
        if not session_dir.exists():
            raise ValueError("Session encryption data not found or expired.")

        zips = list(session_dir.glob("*.zip"))
        if zips:
            return zips[0], zips[0].name

        batch_out_dir = session_dir / "encrypted_files"
        if batch_out_dir.exists():
            files = [f for f in batch_out_dir.iterdir() if f.is_file()]
            if files:
                return files[0], files[0].name

        raise ValueError("No downloadable encrypted file found for this session.")

    def get_single_encrypted_file(self, session_id: str, filename: str) -> Tuple[Path, str]:
        if not session_id or re.search(r"[\\/]", session_id):
            raise ValueError("Invalid session ID.")
        if not filename or re.search(r"[\\/]", filename):
            raise ValueError("Invalid filename.")

        session_dir = Paths.request_output(session_id)
        batch_out_dir = session_dir / "encrypted_files"
        if not batch_out_dir.exists():
            raise ValueError("No encrypted files found for this session.")

        target = batch_out_dir / filename
        if not target.exists():
            raise ValueError(f"File '{filename}' not found in encrypted results.")

        return target, filename


batch_encryption_service = BatchEncryptionService()
