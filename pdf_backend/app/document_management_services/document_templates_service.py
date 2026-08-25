"""
Document Templates Service — Document Management Section.

Manages reusable PDF document templates:
  - Save uploaded PDFs as named templates
  - List all saved templates with metadata
  - Search templates by name
  - Generate a new PDF copy from a template
  - Delete templates
  - Store templates in storage/templates/ directory
  - Metadata stored in templates.json alongside files
"""

from __future__ import annotations

import json
import logging
import re
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024


class DocumentTemplatesService:
    """Service for managing reusable PDF document templates."""

    def _templates_dir(self) -> Path:
        """Get or create the templates storage directory."""
        d = Paths.storage() / "templates"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _metadata_path(self) -> Path:
        """Path to the templates metadata JSON file."""
        return self._templates_dir() / "templates.json"

    def _load_metadata(self) -> Dict[str, Any]:
        """Load templates metadata from JSON file."""
        path = self._metadata_path()
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except Exception as e:
                logger.warning(f"Error loading templates metadata: {e}")
        return {"templates": []}

    def _save_metadata(self, data: Dict[str, Any]) -> None:
        """Save templates metadata to JSON file."""
        path = self._metadata_path()
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and unsafe characters."""
        if not filename:
            return "document.pdf"
        clean = Path(filename).name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document.pdf"

    def validate_pdf(self, pdf_bytes: bytes) -> fitz.Document:
        """Validate PDF bytes and return opened fitz.Document."""
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            size_mb = len(pdf_bytes) / (1024 * 1024)
            raise ValueError(f"File size ({size_mb:.1f} MB) exceeds maximum limit of 100 MB.")
        if not pdf_bytes.startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as e:
            logger.warning(f"Failed to open PDF: {e}")
            raise ValueError("Corrupted or unreadable PDF document.")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF is encrypted or password-protected.")
        return doc

    def _format_file_size(self, size_bytes: int) -> str:
        """Format file size to human-readable string."""
        if size_bytes == 0:
            return "0 B"
        k = 1024
        sizes = ["B", "KB", "MB", "GB"]
        i = min(int(__import__("math").log(size_bytes) / __import__("math").log(k)), len(sizes) - 1)
        return f"{size_bytes / k**i:.1f} {sizes[i]}"

    def save_template(
        self,
        pdf_bytes: bytes,
        original_filename: str,
        template_name: str,
        description: str = "",
    ) -> Dict[str, Any]:
        """Save an uploaded PDF as a reusable template."""
        doc = self.validate_pdf(pdf_bytes)
        page_count = doc.page_count
        doc.close()

        template_id = uuid.uuid4().hex[:16]
        safe_name = self.sanitize_filename(original_filename)
        stored_filename = f"{template_id}_{safe_name}"
        stored_path = self._templates_dir() / stored_filename
        stored_path.write_bytes(pdf_bytes)

        meta = self._load_metadata()
        entry = {
            "id": template_id,
            "name": template_name.strip() or Path(original_filename).stem,
            "original_filename": safe_name,
            "stored_filename": stored_filename,
            "description": description.strip(),
            "file_size": len(pdf_bytes),
            "file_size_human": self._format_file_size(len(pdf_bytes)),
            "page_count": page_count,
            "created_at": datetime.now().isoformat(),
        }
        meta["templates"].append(entry)
        self._save_metadata(meta)

        return {
            "success": True,
            "template": entry,
        }

    def list_templates(self, search: str = "") -> List[Dict[str, Any]]:
        """List all saved templates, optionally filtered by name."""
        meta = self._load_metadata()
        templates = meta.get("templates", [])

        # Verify files still exist
        valid = []
        for t in templates:
            fpath = self._templates_dir() / t["stored_filename"]
            if fpath.exists():
                valid.append(t)
            else:
                logger.warning(f"Template file missing: {t['stored_filename']}")

        if search:
            q = search.lower().strip()
            valid = [t for t in valid if q in t["name"].lower() or q in t.get("description", "").lower()]

        return valid

    def get_template(self, template_id: str) -> Dict[str, Any]:
        """Get a single template by ID."""
        meta = self._load_metadata()
        for t in meta.get("templates", []):
            if t["id"] == template_id:
                fpath = self._templates_dir() / t["stored_filename"]
                if not fpath.exists():
                    raise ValueError(f"Template file missing: {t['name']}")
                return t
        raise ValueError("Template not found.")

    def get_template_file_path(self, template_id: str) -> Tuple[Path, str]:
        """Get the file path and name for a template."""
        t = self.get_template(template_id)
        fpath = self._templates_dir() / t["stored_filename"]
        if not fpath.exists():
            raise ValueError("Template file missing.")
        return fpath, t["original_filename"]

    def use_template(
        self,
        template_id: str,
        session_id: str,
        output_name: str = "",
    ) -> Dict[str, Any]:
        """Generate a new PDF copy from a template."""
        t = self.get_template(template_id)
        src_path = self._templates_dir() / t["stored_filename"]

        if not src_path.exists():
            raise ValueError("Template file missing.")

        pdf_bytes = src_path.read_bytes()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)

        out_name = self.sanitize_filename(output_name) if output_name else f"{t['name']}_copy.pdf"
        if not out_name.lower().endswith(".pdf"):
            out_name += ".pdf"
        out_path = out_dir / out_name

        output_bytes = doc.write()
        doc.close()

        out_path.write_bytes(output_bytes)

        return {
            "success": True,
            "template_name": t["name"],
            "output_filename": out_name,
            "page_count": t["page_count"],
            "download_url": f"/document-management/document-templates/download/{session_id}",
        }

    def delete_template(self, template_id: str) -> Dict[str, Any]:
        """Delete a template and its file."""
        meta = self._load_metadata()
        templates = meta.get("templates", [])
        found = None
        for i, t in enumerate(templates):
            if t["id"] == template_id:
                found = i
                break

        if found is None:
            raise ValueError("Template not found.")

        removed = templates.pop(found)
        fpath = self._templates_dir() / removed["stored_filename"]
        if fpath.exists():
            fpath.unlink(missing_ok=True)

        meta["templates"] = templates
        self._save_metadata(meta)

        return {
            "success": True,
            "deleted": removed["name"],
        }

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        """Retrieve output PDF for download."""
        out_dir = Paths.request_output(session_id)
        if not out_dir.exists():
            raise ValueError("Session data not found or expired.")
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()]
        if not files:
            raise ValueError("Output PDF file not found for this session.")
        return files[0], files[0].name


document_templates_service = DocumentTemplatesService()
