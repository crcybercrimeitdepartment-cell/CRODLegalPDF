"""
Auto Recovery Service — Document Management Section.

Protects unsaved PDF editing work by periodically creating recovery
snapshots in an isolated temporary recovery location.

Features:
  - Create/update recovery snapshots for editing sessions
  - List available recovery data
  - Recover a document from recovery snapshot
  - Discard/delete recovery data
  - Cleanup obsolete/expired recovery data
  - Never overwrite user's original PDF
  - Isolated recovery storage separate from user files
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024
RECOVERY_EXPIRY_SECONDS = 24 * 60 * 60  # 24 hours


class AutoRecoveryService:
    """Service for auto-recovery of unsaved PDF editing work."""

    def _recovery_dir(self) -> Path:
        """Isolated recovery storage directory."""
        d = Paths.storage() / "auto_recovery"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _meta_path(self, recovery_id: str) -> Path:
        """Metadata file for a recovery session."""
        safe_id = re.sub(r'[^a-zA-Z0-9_-]', '', recovery_id)
        return self._recovery_dir() / f"{safe_id}.json"

    def _pdf_path(self, recovery_id: str) -> Path:
        """PDF file for a recovery session."""
        safe_id = re.sub(r'[^a-zA-Z0-9_-]', '', recovery_id)
        return self._recovery_dir() / f"{safe_id}.pdf"

    def validate_pdf(self, pdf_bytes: bytes) -> fitz.Document:
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            size_mb = len(pdf_bytes) / (1024 * 1024)
            raise ValueError(f"File size ({size_mb:.1f} MB) exceeds 100 MB limit.")
        if not pdf_bytes.startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception:
            raise ValueError("Corrupted or unreadable PDF document.")
        return doc

    def create_recovery(
        self,
        pdf_bytes: bytes,
        original_filename: str,
        session_name: str = "",
    ) -> Dict[str, Any]:
        """Create or update a recovery snapshot."""
        doc = self.validate_pdf(pdf_bytes)
        page_count = doc.page_count
        doc.close()

        recovery_id = uuid.uuid4().hex[:16]
        now = datetime.now().isoformat()

        # Save PDF snapshot
        pdf_path = self._pdf_path(recovery_id)
        pdf_path.write_bytes(pdf_bytes)

        # Save metadata
        meta = {
            "recovery_id": recovery_id,
            "original_filename": original_filename,
            "session_name": session_name.strip() or original_filename,
            "page_count": page_count,
            "file_size": len(pdf_bytes),
            "created_at": now,
            "updated_at": now,
        }
        self._meta_path(recovery_id).write_text(
            json.dumps(meta, indent=2), encoding="utf-8"
        )

        return {
            "success": True,
            "recovery_id": recovery_id,
            "message": f"Recovery snapshot created for '{original_filename}'.",
        }

    def update_recovery(
        self,
        recovery_id: str,
        pdf_bytes: bytes,
    ) -> Dict[str, Any]:
        """Update an existing recovery snapshot with new PDF state."""
        meta_path = self._meta_path(recovery_id)
        if not meta_path.exists():
            raise ValueError("Recovery session not found.")

        doc = self.validate_pdf(pdf_bytes)
        doc.close()

        # Update PDF
        pdf_path = self._pdf_path(recovery_id)
        pdf_path.write_bytes(pdf_bytes)

        # Update metadata
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        meta["updated_at"] = datetime.now().isoformat()
        meta["page_count"] = doc.page_count if hasattr(doc, 'page_count') else 0
        meta["file_size"] = len(pdf_bytes)
        meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

        return {
            "success": True,
            "recovery_id": recovery_id,
            "message": "Recovery snapshot updated.",
        }

    def list_recoveries(self) -> List[Dict[str, Any]]:
        """List all available recovery snapshots."""
        recovery_dir = self._recovery_dir()
        results = []

        for meta_file in recovery_dir.glob("*.json"):
            try:
                meta = json.loads(meta_file.read_text(encoding="utf-8"))
                recovery_id = meta.get("recovery_id", "")
                pdf_path = self._pdf_path(recovery_id)

                # Verify PDF still exists
                if not pdf_path.exists():
                    continue

                # Check expiry
                created = meta.get("created_at", "")
                if created:
                    try:
                        created_dt = datetime.fromisoformat(created)
                        age = (datetime.now() - created_dt).total_seconds()
                        if age > RECOVERY_EXPIRY_SECONDS:
                            continue  # Skip expired
                    except Exception:
                        pass

                meta["file_size_human"] = self._format_size(meta.get("file_size", 0))
                results.append(meta)
            except Exception as e:
                logger.warning(f"Error reading recovery meta {meta_file}: {e}")

        # Sort by updated_at descending (newest first)
        results.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return results

    def get_recovery(self, recovery_id: str) -> Dict[str, Any]:
        """Get a single recovery snapshot metadata."""
        meta_path = self._meta_path(recovery_id)
        if not meta_path.exists():
            raise ValueError("Recovery session not found.")
        meta = json.loads(meta_path.read_text(encoding="utf-8"))

        pdf_path = self._pdf_path(recovery_id)
        if not pdf_path.exists():
            raise ValueError("Recovery PDF file missing.")

        meta["file_size_human"] = self._format_size(meta.get("file_size", 0))
        return meta

    def recover(
        self,
        recovery_id: str,
        session_id: str,
        output_name: str = "",
    ) -> Dict[str, Any]:
        """Recover a PDF from recovery snapshot and provide for download."""
        meta_path = self._meta_path(recovery_id)
        if not meta_path.exists():
            raise ValueError("Recovery session not found.")

        pdf_path = self._pdf_path(recovery_id)
        if not pdf_path.exists():
            raise ValueError("Recovery PDF file missing.")

        pdf_bytes = pdf_path.read_bytes()

        # Validate recovered PDF
        doc = self.validate_pdf(pdf_bytes)
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        doc.close()

        # Save to output for download
        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)

        if not output_name:
            output_name = meta.get("original_filename", "recovered.pdf")
        if not output_name.lower().endswith(".pdf"):
            output_name += ".pdf"

        out_path = out_dir / output_name
        out_path.write_bytes(pdf_bytes)

        return {
            "success": True,
            "recovery_id": recovery_id,
            "original_filename": meta.get("original_filename", ""),
            "session_name": meta.get("session_name", ""),
            "page_count": meta.get("page_count", 0),
            "output_filename": output_name,
            "download_url": f"/document-management/auto-recovery/download/{session_id}",
        }

    def discard_recovery(self, recovery_id: str) -> Dict[str, Any]:
        """Discard/delete a recovery snapshot."""
        meta_path = self._meta_path(recovery_id)
        pdf_path = self._pdf_path(recovery_id)

        if not meta_path.exists() and not pdf_path.exists():
            raise ValueError("Recovery session not found.")

        deleted_files = []
        if meta_path.exists():
            meta_path.unlink(missing_ok=True)
            deleted_files.append("metadata")
        if pdf_path.exists():
            pdf_path.unlink(missing_ok=True)
            deleted_files.append("PDF")

        return {
            "success": True,
            "recovery_id": recovery_id,
            "message": f"Recovery snapshot discarded ({', '.join(deleted_files)} deleted).",
        }

    def cleanup_expired(self) -> Dict[str, Any]:
        """Remove all expired recovery snapshots."""
        recovery_dir = self._recovery_dir()
        removed = 0

        for meta_file in recovery_dir.glob("*.json"):
            try:
                meta = json.loads(meta_file.read_text(encoding="utf-8"))
                recovery_id = meta.get("recovery_id", "")
                created = meta.get("created_at", "")

                if created:
                    created_dt = datetime.fromisoformat(created)
                    age = (datetime.now() - created_dt).total_seconds()
                    if age > RECOVERY_EXPIRY_SECONDS:
                        # Delete files
                        pdf_path = self._pdf_path(recovery_id)
                        if pdf_path.exists():
                            pdf_path.unlink(missing_ok=True)
                        meta_file.unlink(missing_ok=True)
                        removed += 1
            except Exception as e:
                logger.warning(f"Error during cleanup: {e}")

        return {
            "success": True,
            "removed": removed,
            "message": f"Cleaned up {removed} expired recovery snapshot(s).",
        }

    def cleanup_all(self) -> Dict[str, Any]:
        """Remove ALL recovery snapshots."""
        recovery_dir = self._recovery_dir()
        removed = 0

        for f in recovery_dir.glob("*"):
            if f.is_file():
                f.unlink(missing_ok=True)
                removed += 1

        return {
            "success": True,
            "removed": removed,
            "message": f"Removed {removed} recovery file(s).",
        }

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Recovered PDF not found for this session.")
        return files[0], files[0].name

    def _format_size(self, size_bytes: int) -> str:
        if size_bytes == 0:
            return "0 B"
        k = 1024
        sizes = ["B", "KB", "MB", "GB"]
        i = min(int(__import__("math").log(size_bytes) / __import__("math").log(k)), len(sizes) - 1)
        return f"{size_bytes / k**i:.1f} {sizes[i]}"


auto_recovery_service = AutoRecoveryService()
