"""
Batch Import Service — Document Management Section.

Handles multi-file / folder bulk import, validation, corruption detection,
SHA-256 duplicate detection, duplicate strategies (skip, rename, replace),
folder structure preservation, auto-organization, and summary reporting.
"""

from __future__ import annotations

import hashlib
import io
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF
from PIL import Image

from app.core.paths import Paths
from app.document_management_services.file_manager_service import file_manager_service

logger = logging.getLogger(__name__)

# Dangerous extensions that are prohibited for security
PROHIBITED_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".sh", ".py", ".js", ".vbs", ".ps1",
    ".jar", ".msi", ".dll", ".so", ".com", ".scr", ".pif", ".hta"
}

# Max allowed file size per uploaded file (50 MB default)
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

# Category mapping for auto-organize
CATEGORY_FOLDERS = {
    ".pdf": "PDFs",
    ".docx": "Documents", ".doc": "Documents", ".txt": "Documents", ".rtf": "Documents", ".md": "Documents", ".epub": "Documents", ".odt": "Documents",
    ".xlsx": "Spreadsheets", ".xls": "Spreadsheets", ".csv": "Spreadsheets", ".ods": "Spreadsheets",
    ".pptx": "Presentations", ".ppt": "Presentations", ".odp": "Presentations",
    ".png": "Images", ".jpg": "Images", ".jpeg": "Images", ".webp": "Images", ".bmp": "Images", ".gif": "Images", ".tiff": "Images", ".svg": "Images", ".heic": "Images", ".raw": "Images",
    ".json": "Data", ".xml": "Data", ".html": "Data", ".msg": "Data", ".eml": "Data", ".dxf": "Data", ".ai": "Data", ".psd": "Data", ".vsdx": "Data", ".pub": "Data", ".xps": "Data", ".zip": "Packages",
}


class BatchImportService:
    """Business logic for bulk importing documents into Document Management."""

    def calculate_sha256(self, file_bytes: bytes) -> str:
        """Calculate SHA-256 checksum of file content."""
        return hashlib.sha256(file_bytes).hexdigest()

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and unsafe characters."""
        clean = Path(filename or "file").name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "imported_document"

    def sanitize_relative_path(self, rel_path: str) -> str:
        """Sanitize relative path for folder preservation to prevent path traversal."""
        if not rel_path:
            return ""
        # Remove any leading slashes or drive letters
        clean_path = re.sub(r"^[/\\]+", "", rel_path)
        clean_path = re.sub(r"^[a-zA-Z]:", "", clean_path)

        parts = []
        for part in clean_path.replace("\\", "/").split("/"):
            part_clean = part.strip()
            if not part_clean or part_clean == ".":
                continue
            if part_clean == "..":
                # Path traversal attempt! Skip
                continue
            part_safe = re.sub(r'[\\/:*?"<>|]', "_", part_clean)
            parts.append(part_safe)

        return "/".join(parts)

    def validate_file(self, filename: str, file_bytes: bytes) -> Tuple[bool, str]:
        """Validate filename, extension, file size, and emptiness."""
        if not file_bytes or len(file_bytes) == 0:
            return False, "File is empty (0 bytes)."

        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            size_mb = len(file_bytes) / (1024 * 1024)
            return False, f"File size ({size_mb:.1f} MB) exceeds maximum limit (50 MB)."

        ext = Path(filename).suffix.lower()
        if ext in PROHIBITED_EXTENSIONS:
            return False, f"File type '{ext}' is prohibited for security reasons."

        return True, ""

    def verify_file_integrity(self, filename: str, file_bytes: bytes) -> Tuple[bool, str]:
        """Check corrupted or unreadable documents (PDFs, Images)."""
        ext = Path(filename).suffix.lower()

        if ext == ".pdf":
            try:
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                if doc.is_encrypted:
                    # PDF is password protected / encrypted
                    doc.close()
                    return False, "Encrypted or password-protected PDF."
                if len(doc) == 0:
                    doc.close()
                    return False, "PDF contains no pages."
                doc.close()
            except Exception as e:
                logger.warning(f"Corrupted PDF detected ({filename}): {e}")
                return False, "Corrupted or unreadable PDF document."

        elif ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tiff"]:
            try:
                img = Image.open(io.BytesIO(file_bytes))
                img.verify()
            except Exception as e:
                logger.warning(f"Corrupted image detected ({filename}): {e}")
                return False, "Corrupted or unreadable image file."

        return True, ""

    def find_duplicate_by_content(self, target_dir: Path, file_sha256: str) -> Optional[Path]:
        """Check if an identical file exists anywhere in target directory using SHA-256."""
        if not target_dir.exists():
            return None

        for existing in target_dir.rglob("*"):
            if existing.is_file():
                try:
                    # Quick size match first
                    if existing.stat().st_size > 0:
                        ex_sha = hashlib.sha256(existing.read_bytes()).hexdigest()
                        if ex_sha == file_sha256:
                            return existing
                except Exception:
                    continue
        return None

    def process_batch(
        self,
        files_data: List[Dict[str, Any]],
        duplicate_strategy: str = "rename",
        preserve_folder_structure: bool = False,
        auto_organize: bool = False,
        target_folder: str = "",
    ) -> Dict[str, Any]:
        """
        Process a batch of uploaded files.

        files_data is a list of dicts:
        [
            {"filename": "doc.pdf", "relative_path": "Folder/doc.pdf", "bytes": b"..."}
        ]
        """
        dup_strat = (duplicate_strategy or "rename").lower().strip()
        if dup_strat not in ["skip", "rename", "replace"]:
            dup_strat = "rename"

        root_dir = Paths.file_manager_root()
        base_dest_dir = file_manager_service.resolve_safe_path(target_folder or "")
        base_dest_dir.mkdir(parents=True, exist_ok=True)

        results = []
        total_count = len(files_data)
        imported_count = 0
        duplicate_count = 0
        failed_count = 0
        skipped_count = 0

        for item in files_data:
            orig_filename = item.get("filename", "file")
            raw_rel_path = item.get("relative_path", "")
            file_bytes = item.get("bytes", b"")

            clean_filename = self.sanitize_filename(orig_filename)

            # 1. Validation
            valid, val_msg = self.validate_file(orig_filename, file_bytes)
            if not valid:
                failed_count += 1
                results.append({
                    "filename": orig_filename,
                    "relative_path": raw_rel_path or orig_filename,
                    "status": "failed",
                    "message": val_msg,
                    "file_size_bytes": len(file_bytes),
                    "saved_path": "",
                })
                continue

            # 2. Integrity / Corruption Check
            integrity_ok, integrity_msg = self.verify_file_integrity(orig_filename, file_bytes)
            if not integrity_ok:
                failed_count += 1
                results.append({
                    "filename": orig_filename,
                    "relative_path": raw_rel_path or orig_filename,
                    "status": "failed",
                    "message": integrity_msg,
                    "file_size_bytes": len(file_bytes),
                    "saved_path": "",
                })
                continue

            # 3. Determine Destination Path
            ext = Path(clean_filename).suffix.lower()
            dest_dir = base_dest_dir

            if preserve_folder_structure and raw_rel_path:
                safe_rel_dir = self.sanitize_relative_path(Path(raw_rel_path).parent.as_posix())
                if safe_rel_dir:
                    dest_dir = base_dest_dir / safe_rel_dir
                    dest_dir.mkdir(parents=True, exist_ok=True)
            elif auto_organize:
                category = CATEGORY_FOLDERS.get(ext, "Other")
                dest_dir = base_dest_dir / category
                dest_dir.mkdir(parents=True, exist_ok=True)

            target_path = dest_dir / clean_filename
            file_sha256 = self.calculate_sha256(file_bytes)

            # 4. Duplicate Check (SHA-256 and Filename)
            existing_duplicate = None
            if target_path.exists():
                existing_duplicate = target_path
            else:
                existing_duplicate = self.find_duplicate_by_content(dest_dir, file_sha256)

            is_duplicate = existing_duplicate is not None

            if is_duplicate:
                duplicate_count += 1
                if dup_strat == "skip":
                    skipped_count += 1
                    results.append({
                        "filename": orig_filename,
                        "relative_path": raw_rel_path or orig_filename,
                        "status": "duplicate",
                        "message": f"Duplicate file skipped ({existing_duplicate.name}).",
                        "file_size_bytes": len(file_bytes),
                        "saved_path": "",
                    })
                    continue

                elif dup_strat == "rename":
                    stem = Path(clean_filename).stem
                    counter = 1
                    while True:
                        cand_name = f"{stem} ({counter}){ext}"
                        cand_path = dest_dir / cand_name
                        if not cand_path.exists():
                            target_path = cand_path
                            break
                        counter += 1

                elif dup_strat == "replace":
                    target_path = existing_duplicate

            # 5. Save File
            try:
                target_path.write_bytes(file_bytes)
                imported_count += 1
                rel_saved = target_path.resolve().relative_to(root_dir.resolve()).as_posix()

                status_label = "imported" if not is_duplicate else "imported (replaced)" if dup_strat == "replace" else "imported (renamed)"
                msg_label = f"Successfully imported as '{target_path.name}'" if is_duplicate and dup_strat != "replace" else "Successfully imported"

                results.append({
                    "filename": orig_filename,
                    "relative_path": raw_rel_path or orig_filename,
                    "status": status_label,
                    "message": msg_label,
                    "file_size_bytes": len(file_bytes),
                    "saved_path": rel_saved,
                })
            except Exception as e:
                logger.error(f"Failed to write file '{target_path}': {e}", exc_info=True)
                failed_count += 1
                results.append({
                    "filename": orig_filename,
                    "relative_path": raw_rel_path or orig_filename,
                    "status": "failed",
                    "message": f"Storage error: {e}",
                    "file_size_bytes": len(file_bytes),
                    "saved_path": "",
                })

        return {
            "success": True,
            "total": total_count,
            "imported": imported_count,
            "duplicates": duplicate_count,
            "skipped": skipped_count,
            "failed": failed_count,
            "duplicate_strategy": dup_strat,
            "preserve_folder_structure": preserve_folder_structure,
            "auto_organize": auto_organize,
            "results": results,
        }


batch_import_service = BatchImportService()
