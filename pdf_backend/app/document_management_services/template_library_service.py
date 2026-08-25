"""
Template Library Service — Document Management Section.

Centralized browsing, searching and using of PDF templates.
Reuses the same storage as Document Templates (storage/templates/).

Features:
  - Browse all available templates
  - Search templates by name/description
  - Preview template details
  - Select and use a template to create a new PDF
  - Generate a safe copy from selected template
  - Handle missing/corrupted template files gracefully
"""

from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)


class TemplateLibraryService:
    """Service for browsing and using saved PDF templates."""

    def _templates_dir(self) -> Path:
        d = Paths.storage() / "templates"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _metadata_path(self) -> Path:
        return self._templates_dir() / "templates.json"

    def _load_metadata(self) -> Dict[str, Any]:
        path = self._metadata_path()
        if path.exists():
            try:
                return __import__("json").loads(path.read_text(encoding="utf-8"))
            except Exception as e:
                logger.warning(f"Error loading templates metadata: {e}")
        return {"templates": []}

    def _format_file_size(self, size_bytes: int) -> str:
        if size_bytes == 0:
            return "0 B"
        k = 1024
        sizes = ["B", "KB", "MB", "GB"]
        i = min(int(__import__("math").log(size_bytes) / __import__("math").log(k)), len(sizes) - 1)
        return f"{size_bytes / k**i:.1f} {sizes[i]}"

    def list_templates(
        self,
        search: str = "",
        category: str = "",
    ) -> Dict[str, Any]:
        """List all valid templates with optional search and category filter."""
        meta = self._load_metadata()
        templates = meta.get("templates", [])

        # Verify files exist, update sizes if needed
        valid = []
        for t in templates:
            fpath = self._templates_dir() / t["stored_filename"]
            if not fpath.exists():
                continue
            # Update file size if stale
            actual_size = fpath.stat().st_size
            if actual_size != t.get("file_size", 0):
                t["file_size"] = actual_size
                t["file_size_human"] = self._format_file_size(actual_size)
            valid.append(t)

        if search:
            q = search.lower().strip()
            valid = [
                t for t in valid
                if q in t["name"].lower()
                or q in t.get("description", "").lower()
                or q in t.get("original_filename", "").lower()
            ]

        if category:
            c = category.lower().strip()
            valid = [t for t in valid if c in t.get("category", "").lower()]

        return {
            "templates": valid,
            "total": len(valid),
            "categories": sorted(set(t.get("category", "") for t in valid if t.get("category"))),
        }

    def get_template(self, template_id: str) -> Dict[str, Any]:
        """Get a single template with details."""
        meta = self._load_metadata()
        for t in meta.get("templates", []):
            if t["id"] == template_id:
                fpath = self._templates_dir() / t["stored_filename"]
                if not fpath.exists():
                    raise ValueError(f"Template file missing: {t['name']}")
                # Verify it's still a valid PDF
                try:
                    doc = fitz.open(stream=fpath.read_bytes(), filetype="pdf")
                    doc.close()
                except Exception:
                    raise ValueError(f"Template file corrupted: {t['name']}")
                return t
        raise ValueError("Template not found.")

    def get_template_bytes(self, template_id: str) -> Tuple[bytes, str]:
        """Get raw PDF bytes and filename for a template."""
        t = self.get_template(template_id)
        fpath = self._templates_dir() / t["stored_filename"]
        return fpath.read_bytes(), t["original_filename"]

    def use_template(
        self,
        template_id: str,
        session_id: str,
        output_name: str = "",
    ) -> Dict[str, Any]:
        """Generate a new PDF copy from a template and save to output dir."""
        t = self.get_template(template_id)
        src_path = self._templates_dir() / t["stored_filename"]

        pdf_bytes = src_path.read_bytes()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)

        # Sanitize output name
        if output_name:
            out_name = re.sub(r'[\\/:*?"<>|]', "_", output_name.strip())
            if not out_name.lower().endswith(".pdf"):
                out_name += ".pdf"
        else:
            out_name = f"{t['name']}_copy.pdf"

        out_path = out_dir / out_name
        output_bytes = doc.write()
        doc.close()
        out_path.write_bytes(output_bytes)

        return {
            "success": True,
            "template_name": t["name"],
            "output_filename": out_name,
            "page_count": t["page_count"],
            "file_size": t["file_size"],
            "file_size_human": t["file_size_human"],
            "download_url": f"/document-management/template-library/download/{session_id}",
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


template_library_service = TemplateLibraryService()
