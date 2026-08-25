"""
Publisher to PDF conversion service.
Uses LibreOffice headless mode for native .pub import and conversion.
Uses pypdf for page selection and metadata application.
"""

from __future__ import annotations

import logging
import shutil
import subprocess
import os
import zipfile
import asyncio
from pathlib import Path
from typing import Dict, Any, List, Optional

from app.core.paths import Paths

try:
    from pypdf import PdfReader, PdfWriter
except ImportError:
    PdfReader = None
    PdfWriter = None

logger = logging.getLogger(__name__)

PAGE_SIZES_MM = {
    "a4": (210, 297),
    "a3": (297, 420),
    "a5": (148, 210),
    "letter": (215.9, 279.4),
    "legal": (215.9, 355.6),
    "tabloid": (279.4, 431.8),
}


class PublisherToPdfService:
    """
    Convert Microsoft Publisher (.pub) files to PDF using LibreOffice headless.
    """

    def _find_soffice(self) -> str:
        """Locate the LibreOffice soffice executable."""
        if os.name == "nt":
            common_paths = [
                r"C:\Program Files\LibreOffice\program\soffice.exe",
                r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
            ]
            for p in common_paths:
                if os.path.exists(p):
                    return p
        return "soffice"

    def validate(self, file_path: Path) -> Dict[str, Any]:
        """
        Validate that the file is a proper Publisher file.
        Returns file metadata for the upload response.
        """
        if not file_path.exists():
            raise ValueError("File not found.")

        if file_path.stat().st_size == 0:
            raise ValueError("The uploaded Publisher file is empty.")

        ext = file_path.suffix.lower()
        if ext not in (".pub",):
            raise ValueError("Unsupported format. Only .pub files are supported.")

        size_mb = round(file_path.stat().st_size / (1024 * 1024), 2)

        return {
            "filename": file_path.name,
            "size_bytes": file_path.stat().st_size,
            "size_mb": size_mb,
            "format": "Microsoft Publisher Document",
        }

    def _parse_page_range(self, range_str: str, total_pages: int) -> List[int]:
        """
        Parse a string like '1,3,5-8' into a sorted list of zero-indexed page numbers.
        """
        if not range_str or not range_str.strip():
            return list(range(total_pages))

        pages: set[int] = set()
        parts = range_str.strip().split(",")
        for part in parts:
            part = part.strip()
            if not part:
                continue
            if "-" in part:
                try:
                    start_str, end_str = part.split("-", 1)
                    start = int(start_str.strip())
                    end = int(end_str.strip())
                    if start > end:
                        start, end = end, start
                    for p in range(start, end + 1):
                        pages.add(p - 1)
                except (ValueError, TypeError):
                    pass
            else:
                try:
                    p = int(part)
                    pages.add(p - 1)
                except ValueError:
                    pass

        valid_pages = sorted(p for p in pages if 0 <= p < total_pages)
        if not valid_pages:
            return list(range(total_pages))
        return valid_pages

    async def _run_libreoffice(
        self, input_path: Path, output_dir: Path, timeout: int = 120
    ) -> None:
        """Run LibreOffice headless to convert .pub to PDF."""
        soffice_cmd = self._find_soffice()

        command = [
            soffice_cmd,
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            str(output_dir),
            str(input_path),
        ]

        loop = asyncio.get_event_loop()

        def _run():
            return subprocess.run(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
                timeout=timeout,
            )

        try:
            result = await loop.run_in_executor(None, _run)
        except FileNotFoundError:
            raise ValueError(
                "LibreOffice is not installed or not found. "
                "Please install LibreOffice and ensure it is accessible."
            )
        except subprocess.TimeoutExpired:
            raise ValueError(
                "Conversion timed out. The Publisher file may be too large or complex."
            )

        if result.returncode != 0:
            err_msg = result.stderr.decode("utf-8", errors="ignore").strip()
            logger.error(f"LibreOffice conversion failed (rc={result.returncode}): {err_msg}")
            raise ValueError(
                f"Publisher to PDF conversion failed during processing. "
                f"Ensure the .pub file is valid and not corrupted."
            )

    async def process(
        self,
        request_id: str,
        filenames: List[str],
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Convert one or more Publisher files to PDF.
        """
        config = config or {}
        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        page_range = config.get("page_range", "")
        page_size = config.get("page_size", "original")
        orientation = config.get("orientation", "auto")
        scaling = config.get("scaling", "fit_to_page")
        margin_top = config.get("margin_top", "0")
        margin_bottom = config.get("margin_bottom", "0")
        margin_left = config.get("margin_left", "0")
        margin_right = config.get("margin_right", "0")
        pdf_title = config.get("pdf_title", "")
        pdf_author = config.get("pdf_author", "")
        pdf_subject = config.get("pdf_subject", "")
        pdf_keywords = config.get("pdf_keywords", "")
        quality = config.get("quality", "standard")
        merge = config.get("merge", False)

        results: List[Dict[str, Any]] = []
        temp_dir = Paths.request_temp(request_id) / "publisher_processing"

        try:
            # Create isolated temp dir
            if temp_dir.exists():
                shutil.rmtree(temp_dir, ignore_errors=True)
            temp_dir.mkdir(parents=True, exist_ok=True)

            converted_paths: List[Path] = []

            for filename in filenames:
                input_path = upload_dir / filename
                if not input_path.exists():
                    results.append({
                        "original_filename": filename,
                        "status": "error",
                        "message": "File not found on server. Please re-upload.",
                    })
                    continue

                # Validate
                try:
                    self.validate(input_path)
                except ValueError as e:
                    results.append({
                        "original_filename": filename,
                        "status": "error",
                        "message": str(e),
                    })
                    continue

                # Use a subdirectory per file to avoid name collisions
                file_temp_dir = temp_dir / Path(filename).stem
                file_temp_dir.mkdir(parents=True, exist_ok=True)

                try:
                    await self._run_libreoffice(input_path, file_temp_dir)

                    expected_pdf = file_temp_dir / (Path(filename).stem + ".pdf")
                    if not expected_pdf.exists() or expected_pdf.stat().st_size == 0:
                        raise RuntimeError(
                            "PDF was not created. The .pub file may be corrupted "
                            "or unsupported by LibreOffice."
                        )

                    # Determine final output name
                    pdf_filename = Path(filename).stem + ".pdf"
                    final_path = output_dir / pdf_filename

                    # Post-process with pypdf
                    needs_post = (
                        bool(page_range.strip())
                        or pdf_title
                        or pdf_author
                        or pdf_subject
                        or pdf_keywords
                        or page_size != "original"
                        or orientation != "auto"
                        or scaling != "fit_to_page"
                        or any(
                            float(m) > 0
                            for m in [margin_top, margin_bottom, margin_left, margin_right]
                        )
                    )

                    if needs_post and PdfReader and PdfWriter:
                        try:
                            reader = PdfReader(str(expected_pdf))
                            writer = PdfWriter()

                            total = len(reader.pages)
                            selected = self._parse_page_range(page_range, total)

                            for idx in selected:
                                writer.add_page(reader.pages[idx])

                            # Apply metadata
                            meta: Dict[str, str] = {}
                            if pdf_title:
                                meta["/Title"] = pdf_title
                            if pdf_author:
                                meta["/Author"] = pdf_author
                            if pdf_subject:
                                meta["/Subject"] = pdf_subject
                            if pdf_keywords:
                                meta["/Keywords"] = pdf_keywords
                            if meta:
                                writer.add_metadata(meta)

                            with open(str(final_path), "wb") as f_out:
                                writer.write(f_out)

                        except Exception as e:
                            logger.warning(f"pypdf post-processing failed, using raw output: {e}")
                            shutil.move(str(expected_pdf), str(final_path))
                    else:
                        shutil.move(str(expected_pdf), str(final_path))

                    # Validate output
                    if not final_path.exists() or final_path.stat().st_size == 0:
                        raise RuntimeError("Output PDF is missing or empty.")

                    converted_paths.append(final_path)
                    results.append({
                        "original_filename": filename,
                        "pdf_filename": pdf_filename,
                        "status": "success",
                    })

                except Exception as e:
                    logger.error(f"Error converting {filename}: {e}")
                    results.append({
                        "original_filename": filename,
                        "status": "error",
                        "message": str(e),
                    })

            # Handle merge
            if merge and len(converted_paths) > 1:
                try:
                    merged_name = "merged_publisher.pdf"
                    merged_path = output_dir / merged_name
                    writer = PdfWriter()
                    for p in converted_paths:
                        reader = PdfReader(str(p))
                        for page in reader.pages:
                            writer.add_page(page)
                    with open(str(merged_path), "wb") as f_out:
                        writer.write(f_out)
                    results.append({
                        "original_filename": merged_name,
                        "pdf_filename": merged_name,
                        "status": "success",
                        "is_merged": True,
                    })
                except Exception as e:
                    logger.error(f"Failed to merge PDFs: {e}")
                    results.append({
                        "original_filename": "merged",
                        "status": "error",
                        "message": f"Failed to merge PDFs: {e}",
                    })

        finally:
            # Cleanup temp directory
            if temp_dir.exists():
                shutil.rmtree(temp_dir, ignore_errors=True)

        if not results:
            raise ValueError("No files were processed.")

        return {
            "success": any(r.get("status") == "success" for r in results),
            "request_id": request_id,
            "results": results,
        }


publisher_to_pdf_service = PublisherToPdfService()
