"""
File Manager Service — Document Management Section.

Provides filesystem operations for file & folder management:
  - Strict path traversal protection & safe resolution
  - Folder creation & file uploading
  - Directory content listing with metadata & breadcrumbs
  - File/Folder move, copy, rename, and deletion
  - File download and folder ZIP export
"""

from __future__ import annotations

import mimetypes
import os
import re
import shutil
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.core.paths import Paths


class FileManagerService:
    """Enterprise service for File Manager operations within Document Management."""

    def get_root_dir(self) -> Path:
        """Get the root storage directory for file manager."""
        return Paths.file_manager_root()

    def resolve_safe_path(self, rel_path: str = "") -> Path:
        """
        Safely resolve relative path within file manager root.
        Strictly prevents path traversal outside root storage.
        """
        root = self.get_root_dir().resolve()

        if not rel_path:
            return root

        # Strip leading slashes/backslashes and normalize
        clean_rel = rel_path.strip().lstrip("/\\")

        # Resolve target path
        target_path = (root / clean_rel).resolve()

        # Path traversal security check
        try:
            target_path.relative_to(root)
        except ValueError:
            raise ValueError("Access denied: Invalid path traversal outside storage directory.")

        return target_path

    def get_relative_path_str(self, target_path: Path) -> str:
        """Get forward-slash relative path string from storage root."""
        root = self.get_root_dir().resolve()
        try:
            rel = target_path.resolve().relative_to(root)
            return rel.as_posix() if str(rel) != "." else ""
        except ValueError:
            return ""

    # ── 1. Content Listing & Breadcrumbs ─────────────────────────────────

    def list_contents(self, rel_path: str = "") -> Dict[str, Any]:
        """List files and folders in current directory with metadata and breadcrumbs."""
        target_dir = self.resolve_safe_path(rel_path)

        if not target_dir.exists():
            raise ValueError(f"Directory '{rel_path}' does not exist.")
        if not target_dir.is_dir():
            raise ValueError(f"Path '{rel_path}' is a file, not a directory.")

        current_rel = self.get_relative_path_str(target_dir)

        items: List[Dict[str, Any]] = []

        try:
            entries = list(target_dir.iterdir())
        except PermissionError:
            raise ValueError("Permission denied to read directory.")

        for entry in entries:
            try:
                stat = entry.stat()
                mod_time = datetime.fromtimestamp(stat.st_mtime).strftime("%b %d, %Y %I:%M %p")
                item_rel = self.get_relative_path_str(entry)

                if entry.is_dir():
                    try:
                        child_count = len(list(entry.iterdir()))
                    except Exception:
                        child_count = 0
                    items.append({
                        "name": entry.name,
                        "path": item_rel,
                        "is_dir": True,
                        "size_bytes": 0,
                        "size_formatted": f"{child_count} item(s)",
                        "modified_at": mod_time,
                        "extension": "folder",
                        "mime_type": "inode/directory",
                    })
                else:
                    size_bytes = stat.st_size
                    ext = entry.suffix.lstrip(".").lower() or "file"
                    mime_type, _ = mimetypes.guess_type(entry.name)

                    items.append({
                        "name": entry.name,
                        "path": item_rel,
                        "is_dir": False,
                        "size_bytes": size_bytes,
                        "size_formatted": self._format_size(size_bytes),
                        "modified_at": mod_time,
                        "extension": ext,
                        "mime_type": mime_type or "application/octet-stream",
                    })
            except Exception:
                continue

        # Sort directories first (A-Z), then files (A-Z)
        items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))

        # Build breadcrumbs
        breadcrumbs = [{"name": "Home", "path": ""}]
        if current_rel:
            parts = current_rel.split("/")
            accum = []
            for p in parts:
                accum.append(p)
                breadcrumbs.append({"name": p, "path": "/".join(accum)})

        return {
            "success": True,
            "current_path": current_rel,
            "breadcrumbs": breadcrumbs,
            "total_items": len(items),
            "items": items,
        }

    # ── 2. Create Folder & Upload ─────────────────────────────────────────

    def create_folder(self, parent_path: str, folder_name: str) -> Dict[str, Any]:
        """Create a new subfolder inside parent directory."""
        folder_name = (folder_name or "").strip()
        if not folder_name:
            raise ValueError("Folder name cannot be empty.")
        if re.search(r'[\\/:*?"<>|]', folder_name):
            raise ValueError("Folder name contains invalid characters.")

        parent_dir = self.resolve_safe_path(parent_path)
        if not parent_dir.exists() or not parent_dir.is_dir():
            raise ValueError("Parent directory does not exist.")

        new_folder = parent_dir / folder_name
        if new_folder.exists():
            raise ValueError(f"A folder or file named '{folder_name}' already exists.")

        new_folder.mkdir(parents=True, exist_ok=False)

        return {
            "success": True,
            "message": f"Folder '{folder_name}' created successfully.",
            "path": self.get_relative_path_str(new_folder),
        }

    def upload_file(self, parent_path: str, filename: str, content: bytes) -> Dict[str, Any]:
        """Upload file content into parent directory safely."""
        clean_filename = Path(filename or "").name.strip()
        if not clean_filename:
            raise ValueError("Filename cannot be empty.")
        if re.search(r'[\\/:*?"<>|]', clean_filename):
            raise ValueError("Filename contains invalid characters.")

        parent_dir = self.resolve_safe_path(parent_path)
        if not parent_dir.exists() or not parent_dir.is_dir():
            raise ValueError("Parent directory does not exist.")

        target_file = parent_dir / clean_filename
        if target_file.exists() and target_file.is_dir():
            raise ValueError(f"A folder named '{clean_filename}' already exists.")

        target_file.write_bytes(content)

        return {
            "success": True,
            "message": f"File '{clean_filename}' uploaded successfully.",
            "path": self.get_relative_path_str(target_file),
            "size_bytes": len(content),
        }

    # ── 3. Rename, Move, Copy, Delete ──────────────────────────────────────

    def rename_item(self, rel_path: str, new_name: str) -> Dict[str, Any]:
        """Rename file or folder."""
        new_name = (new_name or "").strip()
        if not new_name:
            raise ValueError("New name cannot be empty.")
        if re.search(r'[\\/:*?"<>|]', new_name):
            raise ValueError("New name contains invalid characters.")

        target = self.resolve_safe_path(rel_path)
        if not target.exists():
            raise ValueError("Item to rename does not exist.")

        root = self.get_root_dir().resolve()
        if target == root:
            raise ValueError("Cannot rename root storage directory.")

        dest = target.parent / new_name
        if dest.exists() and dest != target:
            raise ValueError(f"An item named '{new_name}' already exists in this directory.")

        target.rename(dest)

        return {
            "success": True,
            "message": f"Renamed to '{new_name}'.",
            "new_path": self.get_relative_path_str(dest),
        }

    def move_item(self, source_path: str, target_folder_path: str) -> Dict[str, Any]:
        """Move file or folder to target directory."""
        src = self.resolve_safe_path(source_path)
        dest_dir = self.resolve_safe_path(target_folder_path)

        if not src.exists():
            raise ValueError("Source item does not exist.")
        if not dest_dir.exists() or not dest_dir.is_dir():
            raise ValueError("Target destination directory does not exist.")

        root = self.get_root_dir().resolve()
        if src == root:
            raise ValueError("Cannot move root storage directory.")

        target = dest_dir / src.name
        if target == src:
            raise ValueError("Source and destination paths are identical.")
        if target.exists():
            raise ValueError(f"An item named '{src.name}' already exists in destination folder.")

        shutil.move(str(src), str(target))

        return {
            "success": True,
            "message": f"Moved '{src.name}' successfully.",
            "new_path": self.get_relative_path_str(target),
        }

    def copy_item(self, source_path: str, target_folder_path: str) -> Dict[str, Any]:
        """Copy file or directory recursively to target directory."""
        src = self.resolve_safe_path(source_path)
        dest_dir = self.resolve_safe_path(target_folder_path)

        if not src.exists():
            raise ValueError("Source item does not exist.")
        if not dest_dir.exists() or not dest_dir.is_dir():
            raise ValueError("Target destination directory does not exist.")

        root = self.get_root_dir().resolve()
        if src == root:
            raise ValueError("Cannot copy root storage directory.")

        target = dest_dir / src.name
        if target.exists():
            base_stem = src.stem
            suffix = src.suffix if src.is_file() else ""
            target = dest_dir / f"{base_stem}_copy{suffix}"

        if src.is_dir():
            shutil.copytree(str(src), str(target))
        else:
            shutil.copy2(str(src), str(target))

        return {
            "success": True,
            "message": f"Copied '{src.name}' successfully.",
            "new_path": self.get_relative_path_str(target),
        }

    def delete_item(self, rel_path: str) -> Dict[str, Any]:
        """Delete file or directory recursively."""
        target = self.resolve_safe_path(rel_path)
        if not target.exists():
            raise ValueError("Item to delete does not exist.")

        root = self.get_root_dir().resolve()
        if target == root:
            raise ValueError("Cannot delete root storage directory.")

        name = target.name
        if target.is_dir():
            shutil.rmtree(str(target))
        else:
            target.unlink()

        return {
            "success": True,
            "message": f"Deleted '{name}' successfully.",
        }

    # ── 4. File & Folder Download ─────────────────────────────────────────

    def get_file_for_download(self, rel_path: str) -> Tuple[Path, str]:
        """Get file path and filename for download."""
        target = self.resolve_safe_path(rel_path)
        if not target.exists() or not target.is_file():
            raise ValueError("File does not exist or is a directory.")
        return target, target.name

    def download_folder_as_zip(self, rel_path: str, session_id: str) -> Tuple[Path, str]:
        """Zip directory contents and return zip archive path."""
        target_dir = self.resolve_safe_path(rel_path)
        if not target_dir.exists() or not target_dir.is_dir():
            raise ValueError("Directory does not exist.")

        out_dir = Paths.request_output(session_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        zip_filename = f"{target_dir.name or 'Home'}_archive.zip"
        zip_path = out_dir / zip_filename

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for root_path, _, files in os.walk(target_dir):
                for f in files:
                    file_abs = Path(root_path) / f
                    arcname = file_abs.relative_to(target_dir).as_posix()
                    zf.write(file_abs, arcname=arcname)

        return zip_path, zip_filename

    # ── 5. Directory Tree Listing for Move/Copy Pickers ──────────────────

    def get_all_directories(self) -> List[Dict[str, str]]:
        """Walk root storage directory and return flat list of all subfolders for destination dropdowns."""
        root = self.get_root_dir().resolve()
        dirs = [{"name": "Home (Root Storage)", "path": ""}]

        for dirpath, dirnames, _ in os.walk(root):
            dirnames.sort()
            for dname in dirnames:
                full_p = Path(dirpath) / dname
                rel_p = self.get_relative_path_str(full_p)
                if rel_p:
                    dirs.append({
                        "name": f"📂 {rel_p}",
                        "path": rel_p,
                    })

        return dirs

    # ── 6. Recursive Workspace Search Engine ─────────────────────────────

    def search_storage(self, query: str) -> List[Dict[str, Any]]:
        """Recursively search files and directories matching query string."""
        q = (query or "").strip().lower()
        if not q:
            return []

        root = self.get_root_dir().resolve()
        results: List[Dict[str, Any]] = []

        for dirpath, dirnames, filenames in os.walk(root):
            curr_dir = Path(dirpath)
            for d in dirnames:
                if q in d.lower():
                    dp = curr_dir / d
                    rel_p = self.get_relative_path_str(dp)
                    try:
                        stat = dp.stat()
                        mod_time = datetime.fromtimestamp(stat.st_mtime).strftime("%b %d, %Y %I:%M %p")
                    except Exception:
                        mod_time = "N/A"
                    results.append({
                        "name": d,
                        "path": rel_p,
                        "parent_path": self.get_relative_path_str(curr_dir),
                        "is_dir": True,
                        "extension": "folder",
                        "size_formatted": "Folder",
                        "modified_at": mod_time,
                    })

            for f in filenames:
                if q in f.lower():
                    fp = curr_dir / f
                    rel_p = self.get_relative_path_str(fp)
                    try:
                        stat = fp.stat()
                        size_str = self._format_size(stat.st_size)
                        mod_time = datetime.fromtimestamp(stat.st_mtime).strftime("%b %d, %Y %I:%M %p")
                    except Exception:
                        size_str = "N/A"
                        mod_time = "N/A"
                    ext = fp.suffix.lstrip(".").lower() or "file"
                    results.append({
                        "name": f,
                        "path": rel_p,
                        "parent_path": self.get_relative_path_str(curr_dir),
                        "is_dir": False,
                        "extension": ext,
                        "size_formatted": size_str,
                        "modified_at": mod_time,
                    })

            if len(results) >= 100:
                break

        return results

    # ── Helper: Format Bytes ──────────────────────────────────────────────

    def _format_size(self, size_bytes: int) -> str:
        """Format size in bytes to human-readable string."""
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB"
        elif size_bytes < 1024 * 1024 * 1024:
            return f"{size_bytes / (1024 * 1024):.1f} MB"
        else:
            return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"


file_manager_service = FileManagerService()

