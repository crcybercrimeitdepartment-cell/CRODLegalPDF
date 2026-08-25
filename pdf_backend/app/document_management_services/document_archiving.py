"""
Document Archiving Service — Document Management Section.

Provides real filesystem-based document archiving: archive single/multiple
PDFs, list/search archives, restore, download, and delete. Uses the
application-managed storage directory with metadata JSON records.
"""

from __future__ import annotations

import json
import logging
import os
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 200 * 1024 * 1024  # 200 MB


class DocumentArchivingService:
    """Service for archiving, listing, searching, restoring, and deleting PDF copies."""

    def _archive_root(self) -> Path:
        d = Paths.storage() / "archive"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _safe_id(self, raw: str) -> str:
        return re.sub(r'[^a-zA-Z0-9_-]', '', raw)

    def _sanitize_filename(self, name: str) -> str:
        if not name:
            return "document.pdf"
        clean = Path(name).name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document.pdf"

    def _fmt_size(self, size_bytes: int) -> str:
        if size_bytes <= 0:
            return "0 B"
        units = ["B", "KB", "MB", "GB"]
        i = 0
        s = float(size_bytes)
        while s >= 1024 and i < len(units) - 1:
            s /= 1024
            i += 1
        return f"{s:.1f} {units[i]}"

    def _validate_pdf(self, pdf_bytes: bytes) -> bool:
        if not pdf_bytes or len(pdf_bytes) < 5:
            return False
        if not pdf_bytes[:5].startswith(b"%PDF"):
            return False
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            doc.close()
            return True
        except Exception:
            return False

    def _write_record(self, archive_id: str, record: Dict[str, Any]) -> None:
        rec_path = self._archive_root() / f"{archive_id}.json"
        rec_path.write_text(json.dumps(record, indent=2, default=str), encoding="utf-8")

    def _read_record(self, archive_id: str) -> Optional[Dict[str, Any]]:
        safe = self._safe_id(archive_id)
        rec_path = self._archive_root() / f"{safe}.json"
        if not rec_path.exists():
            return None
        try:
            return json.loads(rec_path.read_text(encoding="utf-8"))
        except Exception:
            return None

    def _pdf_path(self, archive_id: str) -> Path:
        safe = self._safe_id(archive_id)
        return self._archive_root() / f"{safe}.pdf"

    def archive_single(
        self,
        pdf_bytes: bytes,
        original_filename: str,
        session_id: str = "",
    ) -> Dict[str, Any]:
        """Archive a single PDF file."""
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE:
            raise ValueError(f"File size exceeds the {self._fmt_size(MAX_FILE_SIZE)} limit.")
        if not self._validate_pdf(pdf_bytes):
            raise ValueError("The uploaded file is not a valid PDF.")

        archive_id = uuid.uuid4().hex[:16]
        now = datetime.now()
        safe_name = self._sanitize_filename(original_filename)

        # Check for existing archive with same filename — append timestamp if needed
        pdf_path = self._pdf_path(archive_id)
        final_name = safe_name
        existing = self.list_archives(search=safe_name)
        for ex in existing:
            if ex.get("original_filename") == safe_name:
                base = Path(safe_name).stem
                ext = Path(safe_name).suffix or ".pdf"
                ts = now.strftime("%Y%m%d_%H%M%S")
                final_name = f"{base}_archived_{ts}{ext}"
                break

        pdf_path.write_bytes(pdf_bytes)

        record: Dict[str, Any] = {
            "archive_id": archive_id,
            "original_filename": safe_name,
            "stored_filename": final_name,
            "file_size": len(pdf_bytes),
            "file_size_human": self._fmt_size(len(pdf_bytes)),
            "archived_at": now.isoformat(),
            "session_id": session_id,
            "status": "archived",
        }

        # Try to get page count
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            record["page_count"] = doc.page_count
            doc.close()
        except Exception:
            record["page_count"] = 0

        self._write_record(archive_id, record)

        return {
            "success": True,
            "archive_id": archive_id,
            "original_filename": safe_name,
            "stored_filename": final_name,
            "file_size": len(pdf_bytes),
            "file_size_human": self._fmt_size(len(pdf_bytes)),
            "archived_at": record["archived_at"],
            "message": f"Document '{safe_name}' archived successfully.",
        }

    def archive_multiple(
        self,
        files_data: List[Dict[str, Any]],
        session_id: str = "",
    ) -> Dict[str, Any]:
        """Archive multiple PDF files in one operation."""
        results: List[Dict[str, Any]] = []
        success_count = 0
        fail_count = 0

        for fd in files_data:
            pdf_bytes = fd.get("bytes", b"")
            filename = fd.get("filename", "document.pdf")
            try:
                res = self.archive_single(pdf_bytes, filename, session_id)
                results.append(res)
                success_count += 1
            except Exception as e:
                results.append({
                    "success": False,
                    "filename": filename,
                    "error": str(e),
                })
                fail_count += 1

        return {
            "success": fail_count == 0,
            "total": len(files_data),
            "archived": success_count,
            "failed": fail_count,
            "results": results,
            "message": f"Archived {success_count}/{len(files_data)} file(s).",
        }

    def list_archives(self, search: str = "") -> List[Dict[str, Any]]:
        """List all archived documents, optionally filtered by search."""
        archives: List[Dict[str, Any]] = []
        for rec_file in self._archive_root().glob("*.json"):
            try:
                rec = json.loads(rec_file.read_text(encoding="utf-8"))
                archive_id = rec.get("archive_id", "")

                # Verify PDF still exists
                pdf_path = self._pdf_path(archive_id)
                if not pdf_path.exists():
                    continue

                rec["file_size_human"] = self._fmt_size(rec.get("file_size", 0))

                # Search filter
                if search:
                    q = search.lower()
                    name = (rec.get("original_filename", "") + rec.get("stored_filename", "")).lower()
                    if q not in name:
                        continue

                archives.append(rec)
            except Exception as e:
                logger.warning(f"Skipping corrupt archive record {rec_file.name}: {e}")

        archives.sort(key=lambda x: x.get("archived_at", ""), reverse=True)
        return archives

    def get_archive_detail(self, archive_id: str) -> Dict[str, Any]:
        """Get detailed metadata for a single archive."""
        rec = self._read_record(archive_id)
        if not rec:
            raise ValueError("Archive not found.")
        pdf_path = self._pdf_path(archive_id)
        if not pdf_path.exists():
            raise ValueError("Archived PDF file is missing.")
        rec["file_size"] = pdf_path.stat().st_size
        rec["file_size_human"] = self._fmt_size(rec["file_size"])
        return rec

    def restore_archive(
        self,
        archive_id: str,
        session_id: str,
        output_name: str = "",
    ) -> Dict[str, Any]:
        """Restore an archived PDF to the output directory for download."""
        rec = self._read_record(archive_id)
        if not rec:
            raise ValueError("Archive not found.")

        pdf_path = self._pdf_path(archive_id)
        if not pdf_path.exists():
            raise ValueError("Archived PDF file is missing.")

        pdf_bytes = pdf_path.read_bytes()
        if not self._validate_pdf(pdf_bytes):
            raise ValueError("Archived PDF is corrupted and cannot be restored.")

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)

        filename = output_name.strip() if output_name else rec.get("original_filename", "restored.pdf")
        if not filename.lower().endswith(".pdf"):
            filename += ".pdf"

        out_path = out_dir / filename
        out_path.write_bytes(pdf_bytes)

        return {
            "success": True,
            "archive_id": archive_id,
            "original_filename": rec.get("original_filename", ""),
            "restored_filename": filename,
            "file_size": len(pdf_bytes),
            "file_size_human": self._fmt_size(len(pdf_bytes)),
            "download_url": f"/document-management/document-archiving/download/{session_id}",
            "message": f"Document '{filename}' restored successfully.",
        }

    def delete_archive(self, archive_id: str) -> Dict[str, Any]:
        """Delete an archived PDF and its record."""
        rec = self._read_record(archive_id)
        if not rec:
            raise ValueError("Archive not found.")

        safe = self._safe_id(archive_id)
        deleted = []

        pdf_path = self._archive_root() / f"{safe}.pdf"
        if pdf_path.exists():
            pdf_path.unlink()
            deleted.append("PDF")

        rec_path = self._archive_root() / f"{safe}.json"
        if rec_path.exists():
            rec_path.unlink()
            deleted.append("record")

        return {
            "success": True,
            "archive_id": archive_id,
            "message": f"Archive deleted ({', '.join(deleted)} removed).",
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


document_archiving_service = DocumentArchivingService()
