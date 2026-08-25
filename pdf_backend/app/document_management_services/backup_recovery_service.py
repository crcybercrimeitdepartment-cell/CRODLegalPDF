"""
Backup Recovery Service — Document Management Section.

Discovers previously created PDF backup copies from the auto_recovery
storage, allows reviewing available versions, selecting a backup,
choosing a safe recovery destination, and restoring the selected PDF
without modifying its contents.
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)


class BackupRecoveryService:
    """Service for discovering, listing, and restoring PDF backup copies."""

    def _recovery_dir(self) -> Path:
        """Return the auto-recovery storage directory."""
        d = Paths.storage() / "auto_recovery"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _meta_path(self, recovery_id: str) -> Path:
        safe_id = re.sub(r'[^a-zA-Z0-9_-]', '', recovery_id)
        return self._recovery_dir() / f"{safe_id}.json"

    def _pdf_path(self, recovery_id: str) -> Path:
        safe_id = re.sub(r'[^a-zA-Z0-9_-]', '', recovery_id)
        return self._recovery_dir() / f"{safe_id}.pdf"

    def _safe_name(self, name: str) -> str:
        """Sanitize a user-supplied recovery_id to prevent path traversal."""
        return re.sub(r'[^a-zA-Z0-9_-]', '', name)

    def _format_size(self, size_bytes: int) -> str:
        if size_bytes <= 0:
            return "0 B"
        units = ["B", "KB", "MB", "GB"]
        i = 0
        size = float(size_bytes)
        while size >= 1024 and i < len(units) - 1:
            size /= 1024
            i += 1
        return f"{size:.1f} {units[i]}"

    def discover_backups(self) -> List[Dict[str, Any]]:
        """Scan the recovery directory and return metadata for every valid backup."""
        recovery_dir = self._recovery_dir()
        backups: List[Dict[str, Any]] = []

        for meta_file in recovery_dir.glob("*.json"):
            try:
                meta = json.loads(meta_file.read_text(encoding="utf-8"))
                recovery_id = meta.get("recovery_id", "")
                pdf_path = self._pdf_path(recovery_id)

                if not pdf_path.exists():
                    continue

                # Validate the PDF is still readable
                try:
                    doc = fitz.open(str(pdf_path))
                    page_count = doc.page_count
                    doc.close()
                except Exception:
                    page_count = meta.get("page_count", 0)

                meta["page_count"] = page_count
                meta["file_size"] = pdf_path.stat().st_size
                meta["file_size_human"] = self._format_size(meta["file_size"])
                meta["backup_path"] = str(pdf_path)
                meta["is_valid"] = True

                backups.append(meta)
            except Exception as e:
                logger.warning(f"Skipping corrupt recovery meta {meta_file.name}: {e}")

        backups.sort(key=lambda x: x.get("updated_at", x.get("created_at", "")), reverse=True)
        return backups

    def get_backup_detail(self, recovery_id: str) -> Dict[str, Any]:
        """Return detailed metadata for a single backup."""
        safe_id = self._safe_name(recovery_id)
        if not safe_id:
            raise ValueError("Invalid backup identifier.")

        meta_path = self._meta_path(safe_id)
        if not meta_path.exists():
            raise ValueError("Backup not found.")

        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        pdf_path = self._pdf_path(safe_id)

        if not pdf_path.exists():
            raise ValueError("Backup PDF file is missing.")

        # Validate PDF
        try:
            doc = fitz.open(str(pdf_path))
            meta["page_count"] = doc.page_count
            doc.close()
        except Exception:
            meta["page_count"] = meta.get("page_count", 0)

        meta["file_size"] = pdf_path.stat().st_size
        meta["file_size_human"] = self._format_size(meta["file_size"])
        meta["is_valid"] = True
        return meta

    def validate_backup(self, recovery_id: str) -> Dict[str, Any]:
        """Validate that a backup exists and is a readable PDF."""
        safe_id = self._safe_name(recovery_id)
        if not safe_id:
            raise ValueError("Invalid backup identifier.")

        meta_path = self._meta_path(safe_id)
        pdf_path = self._pdf_path(safe_id)

        if not meta_path.exists() or not pdf_path.exists():
            raise ValueError("Backup not found.")

        try:
            pdf_bytes = pdf_path.read_bytes()
            if len(pdf_bytes) == 0:
                raise ValueError("Backup PDF file is empty.")
            if not pdf_bytes.startswith(b"%PDF"):
                raise ValueError("Backup file is not a valid PDF.")
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            pages = doc.page_count
            doc.close()
            return {"valid": True, "page_count": pages, "file_size": len(pdf_bytes)}
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Backup PDF is corrupted: {e}")

    def resolve_destination(self, destination: str, original_filename: str) -> Tuple[Path, str]:
        """Safely resolve a recovery destination path.

        Only allows destinations under storage/file_manager or the
        user's requested output directory. Returns the resolved path
        and the final output filename.
        """
        storage_root = Paths.storage().resolve()
        file_manager_root = Paths.file_manager_root().resolve()

        if not destination or not destination.strip():
            # Default: restore to file_manager root
            dest_dir = file_manager_root
        else:
            dest_clean = destination.strip().replace("\\", "/")
            # Block any path traversal attempts
            if ".." in dest_clean:
                raise ValueError("Destination path contains invalid characters.")

            # Only allow subdirectories under file_manager or storage
            candidate = (file_manager_root / dest_clean).resolve()
            if not (candidate == file_manager_root or str(candidate).startswith(str(file_manager_root) + os.sep) or str(candidate).startswith(str(storage_root) + os.sep)):
                raise ValueError("Destination must be within the managed storage area.")

            dest_dir = candidate

        dest_dir.mkdir(parents=True, exist_ok=True)

        # Generate safe output filename
        safe_name = re.sub(r'[<>:"/\\|?*]', '_', original_filename).strip()
        if not safe_name.lower().endswith(".pdf"):
            safe_name += ".pdf"

        out_path = dest_dir / safe_name

        # Handle filename conflict
        if out_path.exists():
            base = out_path.stem
            ext = out_path.suffix
            counter = 1
            while out_path.exists():
                out_path = dest_dir / f"{base}_backup_{counter}{ext}"
                counter += 1

        return out_path, out_path.name

    def restore_backup(
        self,
        recovery_id: str,
        session_id: str,
        destination: str = "",
        output_name: str = "",
    ) -> Dict[str, Any]:
        """Restore a backup to the specified destination and provide for download."""
        safe_id = self._safe_name(recovery_id)
        if not safe_id:
            raise ValueError("Invalid backup identifier.")

        meta_path = self._meta_path(safe_id)
        pdf_path = self._pdf_path(safe_id)

        if not meta_path.exists() or not pdf_path.exists():
            raise ValueError("Backup not found.")

        # Read and validate
        pdf_bytes = pdf_path.read_bytes()
        if len(pdf_bytes) == 0:
            raise ValueError("Backup PDF file is empty.")
        if not pdf_bytes.startswith(b"%PDF"):
            raise ValueError("Backup file is not a valid PDF.")

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            doc.close()
        except Exception:
            raise ValueError("Backup PDF is corrupted and cannot be restored.")

        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        filename = output_name.strip() if output_name else meta.get("original_filename", "recovered.pdf")

        # Resolve destination
        out_path, final_name = self.resolve_destination(destination, filename)

        # Write the restored PDF
        out_path.write_bytes(pdf_bytes)

        # Copy to output dir for download
        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        download_path = out_dir / final_name
        download_path.write_bytes(pdf_bytes)

        return {
            "success": True,
            "recovery_id": safe_id,
            "original_filename": meta.get("original_filename", ""),
            "restored_filename": final_name,
            "page_count": meta.get("page_count", 0),
            "file_size": len(pdf_bytes),
            "file_size_human": self._format_size(len(pdf_bytes)),
            "destination": str(out_path),
            "download_url": f"/document-management/backup-recovery/download/{session_id}",
        }

    def delete_backup(self, recovery_id: str) -> Dict[str, Any]:
        """Delete a backup from the recovery storage."""
        safe_id = self._safe_name(recovery_id)
        if not safe_id:
            raise ValueError("Invalid backup identifier.")

        meta_path = self._meta_path(safe_id)
        pdf_path = self._pdf_path(safe_id)

        if not meta_path.exists() and not pdf_path.exists():
            raise ValueError("Backup not found.")

        deleted = []
        if meta_path.exists():
            meta_path.unlink(missing_ok=True)
            deleted.append("metadata")
        if pdf_path.exists():
            pdf_path.unlink(missing_ok=True)
            deleted.append("PDF")

        return {
            "success": True,
            "recovery_id": safe_id,
            "message": f"Backup deleted ({', '.join(deleted)} removed).",
        }

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        """Get the restored PDF file for download."""
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Restored PDF not found for this session.")
        return files[0], files[0].name


backup_recovery_service = BackupRecoveryService()
