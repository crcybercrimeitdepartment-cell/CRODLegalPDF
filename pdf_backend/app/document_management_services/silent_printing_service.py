"""
Silent Printing Service — Document Management Section.

PDF printing workflow with configurable printer and settings:
  - Discover available local printers
  - Configure print settings (copies, page range, orientation, paper size)
  - Validate PDF and settings
  - Send PDF to selected printer via OS print mechanism
  - Return clear success/failure status

Platform-aware printer discovery:
  - Windows: wmic printer
  - Linux/macOS: lpstat -p

Print execution:
  - Windows: SumatraPDF (if available) or lp command
  - Linux/macOS: lp command
"""

from __future__ import annotations

import logging
import os
import platform
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024


class SilentPrintingService:
    """Service for PDF printing with configurable settings."""

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
        except Exception:
            raise ValueError("Corrupted or unreadable PDF document.")
        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF is encrypted or password-protected.")
        return doc

    def discover_printers(self) -> List[Dict[str, str]]:
        """Discover available local printers using OS commands."""
        system = platform.system()
        printers = []

        try:
            if system == "Windows":
                result = subprocess.run(
                    ["wmic", "printer", "get", "name,status"],
                    capture_output=True, text=True, timeout=15,
                    creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0,
                )
                lines = [l.strip() for l in result.stdout.strip().split("\n") if l.strip()]
                if len(lines) > 1:
                    for line in lines[1:]:
                        parts = line.rsplit(None, 1)
                        name = parts[0].strip()
                        status = parts[1].strip() if len(parts) > 1 else "Unknown"
                        if name and name.lower() != "name":
                            printers.append({"name": name, "status": status})

            elif system in ("Linux", "Darwin"):
                result = subprocess.run(
                    ["lpstat", "-p"],
                    capture_output=True, text=True, timeout=15,
                )
                for line in result.stdout.strip().split("\n"):
                    line = line.strip()
                    if line.startswith("printer "):
                        parts = line.split(None, 2)
                        if len(parts) >= 2:
                            name = parts[1]
                            status = parts[2] if len(parts) > 2 else "unknown"
                            printers.append({"name": name, "status": status})

        except FileNotFoundError:
            logger.warning("Printer discovery command not available on this system.")
        except subprocess.TimeoutExpired:
            logger.warning("Printer discovery timed out.")
        except Exception as e:
            logger.error(f"Printer discovery error: {e}")

        return printers

    def validate_settings(
        self,
        copies: int,
        page_range: str,
        orientation: str,
        paper_size: str,
        doc: fitz.Document,
    ) -> Dict[str, Any]:
        """Validate print settings and return parsed values."""
        if copies < 1 or copies > 99:
            raise ValueError("Copies must be between 1 and 99.")

        valid_orientations = ["portrait", "landscape"]
        if orientation.lower() not in valid_orientations:
            raise ValueError(f"Invalid orientation. Must be: {', '.join(valid_orientations)}.")

        valid_paper_sizes = ["a4", "letter", "legal", "a3", "a5", "tabloid"]
        if paper_size.lower() not in valid_paper_sizes:
            raise ValueError(f"Invalid paper size. Must be: {', '.join(valid_paper_sizes)}.")

        # Parse page range
        total_pages = doc.page_count
        if not page_range or page_range.strip() == "":
            page_range = f"1-{total_pages}"

        pages = self._parse_page_range(page_range, total_pages)
        if not pages:
            raise ValueError(f"Invalid page range '{page_range}' for document with {total_pages} pages.")

        return {
            "copies": copies,
            "pages": pages,
            "page_range_str": page_range,
            "orientation": orientation.lower(),
            "paper_size": paper_size.lower(),
            "total_pages_in_doc": total_pages,
        }

    def _parse_page_range(self, page_range: str, total_pages: int) -> List[int]:
        """Parse page range string into list of 1-based page numbers."""
        pages = set()
        for part in page_range.split(","):
            part = part.strip()
            if "-" in part:
                start_str, end_str = part.split("-", 1)
                try:
                    start = int(start_str.strip())
                    end = int(end_str.strip())
                except ValueError:
                    continue
                if start < 1 or end < 1:
                    continue
                start = max(1, min(start, total_pages))
                end = max(1, min(end, total_pages))
                for p in range(start, end + 1):
                    pages.add(p)
            else:
                try:
                    p = int(part.strip())
                    if 1 <= p <= total_pages:
                        pages.add(p)
                except ValueError:
                    continue
        return sorted(pages)

    def send_to_printer(
        self,
        pdf_bytes: bytes,
        filename: str,
        printer_name: str,
        settings: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Send PDF to the specified printer using OS print mechanism."""
        system = platform.system()
        copies = settings["copies"]
        orientation = settings["orientation"]
        paper_size = settings["paper_size"]

        # Write PDF to temp file
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name

        try:
            if system == "Windows":
                return self._print_windows(tmp_path, printer_name, copies, orientation, paper_size)
            elif system in ("Linux", "Darwin"):
                return self._print_unix(tmp_path, printer_name, copies, orientation, paper_size)
            else:
                raise ValueError(f"Printing not supported on platform: {system}")
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    def _print_windows(
        self,
        pdf_path: str,
        printer_name: str,
        copies: int,
        orientation: str,
        paper_size: str,
    ) -> Dict[str, Any]:
        """Print on Windows using SumatraPDF (preferred) or PowerShell fallback."""
        # Try SumatraPDF first (silent print capable)
        sumatra_paths = [
            r"C:\Program Files\SumatraPDF\SumatraPDF.exe",
            r"C:\Program Files (x86)\SumatraPDF\SumatraPDF.exe",
        ]
        for sp in sumatra_paths:
            if os.path.exists(sp):
                cmd = [
                    sp,
                    "-print-to", printer_name,
                    "-print-settings", f"{copies}x",
                    "-silent",
                    pdf_path,
                ]
                result = subprocess.run(
                    cmd, capture_output=True, text=True, timeout=60,
                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                )
                if result.returncode == 0:
                    return {
                        "success": True,
                        "message": f"Sent to printer '{printer_name}' via SumatraPDF.",
                        "printer": printer_name,
                        "copies": copies,
                    }
                else:
                    logger.warning(f"SumatraPDF failed: {result.stderr}")

        # Fallback: PowerShell Start-Process with -Verb Print
        ps_script = (
            f'Start-Process -FilePath "{pdf_path}" -Verb PrintTo '
            f'-ArgumentList "{printer_name}" -Wait -WindowStyle Hidden'
        )
        result = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps_script],
            capture_output=True, text=True, timeout=60,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        if result.returncode == 0:
            return {
                "success": True,
                "message": f"Sent to printer '{printer_name}' via PowerShell.",
                "printer": printer_name,
                "copies": copies,
            }
        else:
            err = result.stderr.strip() or "Unknown error"
            raise ValueError(f"Print failed on Windows: {err}")

    def _print_unix(
        self,
        pdf_path: str,
        printer_name: str,
        copies: int,
        orientation: str,
        paper_size: str,
    ) -> Dict[str, Any]:
        """Print on Linux/macOS using lp command."""
        cmd = [
            "lp",
            "-d", printer_name,
            "-n", str(copies),
            "-o", f"media={paper_size}",
        ]
        if orientation == "landscape":
            cmd.append("-o", "landscape")
        cmd.append(pdf_path)

        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=60,
        )
        if result.returncode == 0:
            return {
                "success": True,
                "message": f"Sent to printer '{printer_name}' via lp.",
                "printer": printer_name,
                "copies": copies,
            }
        else:
            err = result.stderr.strip() or "Unknown error"
            raise ValueError(f"Print failed: {err}")

    def get_default_printer(self) -> Optional[str]:
        """Get the system default printer name."""
        system = platform.system()
        try:
            if system == "Windows":
                result = subprocess.run(
                    ["wmic", "printer", "where", "default=TRUE", "get", "name"],
                    capture_output=True, text=True, timeout=10,
                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                )
                lines = [l.strip() for l in result.stdout.strip().split("\n") if l.strip()]
                if len(lines) > 1:
                    return lines[1].strip()

            elif system in ("Linux", "Darwin"):
                result = subprocess.run(
                    ["lpstat", "-d"],
                    capture_output=True, text=True, timeout=10,
                )
                output = result.stdout.strip()
                if ":" in output:
                    return output.split(":", 1)[1].strip().rstrip(".")

        except Exception as e:
            logger.warning(f"Could not determine default printer: {e}")

        return None


silent_printing_service = SilentPrintingService()
