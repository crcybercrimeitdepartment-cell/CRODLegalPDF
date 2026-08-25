"""
Multiple Files to PDF conversion service.
Orchestrates conversion of mixed file types into a single merged PDF.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import shutil
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from pypdf import PdfReader, PdfWriter

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_COUNT = 100
MAX_TOTAL_SIZE_BYTES = 500 * 1024 * 1024
MAX_SINGLE_FILE_BYTES = 100 * 1024 * 1024

CATEGORY_PDF = "pdf"
CATEGORY_IMAGE = "image"
CATEGORY_DOCUMENT = "document"
CATEGORY_SPREADSHEET = "spreadsheet"
CATEGORY_PRESENTATION = "presentation"
CATEGORY_DATA = "data"
CATEGORY_WEB = "web"
CATEGORY_EMAIL = "email"
CATEGORY_DESIGN = "design"
CATEGORY_EBOOK = "ebook"
CATEGORY_UNSUPPORTED = "unsupported"

EXTENSION_CATEGORIES: Dict[str, str] = {
    ".pdf": CATEGORY_PDF,
    ".jpg": CATEGORY_IMAGE, ".jpeg": CATEGORY_IMAGE, ".png": CATEGORY_IMAGE,
    ".bmp": CATEGORY_IMAGE, ".gif": CATEGORY_IMAGE, ".tiff": CATEGORY_IMAGE,
    ".tif": CATEGORY_IMAGE, ".webp": CATEGORY_IMAGE, ".svg": CATEGORY_IMAGE,
    ".heic": CATEGORY_IMAGE,
    ".docx": CATEGORY_DOCUMENT, ".rtf": CATEGORY_DOCUMENT,
    ".odt": CATEGORY_DOCUMENT, ".xps": CATEGORY_DOCUMENT,
    ".xlsx": CATEGORY_SPREADSHEET, ".ods": CATEGORY_SPREADSHEET,
    ".csv": CATEGORY_SPREADSHEET,
    ".pptx": CATEGORY_PRESENTATION, ".odp": CATEGORY_PRESENTATION,
    ".json": CATEGORY_DATA, ".xml": CATEGORY_DATA,
    ".md": CATEGORY_DATA, ".markdown": CATEGORY_DATA, ".txt": CATEGORY_DATA,
    ".html": CATEGORY_WEB, ".htm": CATEGORY_WEB,
    ".eml": CATEGORY_EMAIL, ".msg": CATEGORY_EMAIL,
    ".ai": CATEGORY_DESIGN,
    ".epub": CATEGORY_EBOOK, ".mobi": CATEGORY_EBOOK,
}

CATEGORY_LABELS: Dict[str, str] = {
    CATEGORY_PDF: "PDF", CATEGORY_IMAGE: "Image",
    CATEGORY_DOCUMENT: "Document", CATEGORY_SPREADSHEET: "Spreadsheet",
    CATEGORY_PRESENTATION: "Presentation", CATEGORY_DATA: "Data",
    CATEGORY_WEB: "Web Page", CATEGORY_EMAIL: "Email",
    CATEGORY_DESIGN: "Design", CATEGORY_EBOOK: "E-book",
    CATEGORY_UNSUPPORTED: "Unsupported",
}

ALLOWED_EXTENSIONS = set(EXTENSION_CATEGORIES.keys())

def _sanitize_filename(name: str) -> str:
    name = os.path.basename(name)
    name = re.sub(r'[^\w\-. ]', '_', name)
    name = name.strip(". ")
    return name or "merged_output"

def _get_file_category(extension: str) -> str:
    return EXTENSION_CATEGORIES.get(extension.lower(), CATEGORY_UNSUPPORTED)


class MultipleFilesToPdfService:
    """Orchestrate mixed-file upload -> individual PDFs -> merged PDF."""

    def analyze_files(
        self, filenames: List[str], request_id: str,
    ) -> Dict[str, Any]:
        upload_dir = Paths.request_upload(request_id)
        total_size = 0
        files_info = []
        unsupported = []
        categories_found = set()

        for filename in filenames:
            file_path = upload_dir / filename
            if not file_path.exists():
                unsupported.append({"filename": filename, "reason": "File not found"})
                continue

            ext = file_path.suffix.lower()
            size_bytes = file_path.stat().st_size
            total_size += size_bytes

            if size_bytes > MAX_SINGLE_FILE_BYTES:
                mb = MAX_SINGLE_FILE_BYTES // (1024 * 1024)
                unsupported.append({"filename": filename, "reason": f"Exceeds {mb} MB limit"})
                continue

            category = _get_file_category(ext)
            categories_found.add(category)

            if category == CATEGORY_UNSUPPORTED:
                unsupported.append({"filename": filename, "reason": f"Unsupported format: {ext}"})
                continue

            files_info.append({
                "filename": filename,
                "extension": ext,
                "size_bytes": size_bytes,
                "category": category,
                "category_label": CATEGORY_LABELS.get(category, "Unknown"),
            })

        if total_size > MAX_TOTAL_SIZE_BYTES:
            mb = MAX_TOTAL_SIZE_BYTES // (1024 * 1024)
            raise ValueError(f"Total upload size exceeds {mb} MB limit.")
        if len(filenames) > MAX_FILE_COUNT:
            raise ValueError(f"Too many files (limit: {MAX_FILE_COUNT}).")

        return {
            "files": files_info,
            "unsupported": unsupported,
            "total_files": len(files_info),
            "unsupported_count": len(unsupported),
            "categories": list(categories_found),
            "total_size_bytes": total_size,
        }

    def _group_files(self, filenames: List[str]) -> Dict[str, List[str]]:
        """Group files by their converter category."""
        groups: Dict[str, List[str]] = {}
        for fn in filenames:
            ext = Path(fn).suffix.lower()
            cat = _get_file_category(ext)
            if cat == CATEGORY_UNSUPPORTED:
                continue
            groups.setdefault(cat, []).append(fn)
        return groups

    async def _convert_group(
        self, request_id: str, files: List[str],
        config: Dict[str, Any], temp_dir: Path,
    ) -> List[Path]:
        """Convert a group of same-category files to individual PDFs."""
        if not files:
            return []

        first_ext = Path(files[0]).suffix.lower()
        cat = _get_file_category(first_ext)

        converters = {
            CATEGORY_IMAGE: self._convert_images,
            CATEGORY_PDF: self._convert_pdfs,
            CATEGORY_DOCUMENT: self._convert_documents,
            CATEGORY_SPREADSHEET: self._convert_spreadsheets,
            CATEGORY_PRESENTATION: self._convert_presentations,
            CATEGORY_DATA: self._convert_data,
            CATEGORY_WEB: self._convert_web,
            CATEGORY_EMAIL: self._convert_email,
            CATEGORY_DESIGN: self._convert_design,
            CATEGORY_EBOOK: self._convert_ebooks,
        }

        converter = converters.get(cat)
        if not converter:
            logger.warning(f"No converter for category: {cat}")
            return []

        return await converter(request_id, files, config, temp_dir)

    # ── Image converters ──────────────────────────────────────

    async def _convert_images(
        self, request_id: str, files: List[str],
        config: Dict[str, Any], temp_dir: Path,
    ) -> List[Path]:
        from app.Convert_to_pdf_services.jpg_to_pdf_service import jpg_to_pdf_service
        from app.Convert_to_pdf_services.png_to_pdf_service import png_to_pdf_service
        from app.Convert_to_pdf_services.bmp_to_pdf_service import bmp_to_pdf_service
        from app.Convert_to_pdf_services.svg_to_pdf_service import svg_to_pdf_service

        ext = Path(files[0]).suffix.lower()

        if ext in (".jpg", ".jpeg"):
            result = await jpg_to_pdf_service.process(request_id, files, config)
            pdf_name = result.get("pdf_filename", "")
            pdf_path = Paths.request_output(request_id) / pdf_name
            if pdf_path.exists():
                return [pdf_path]
            return []

        if ext == ".png":
            result = await png_to_pdf_service.process(request_id, files, config)
            pdf_name = result.get("pdf_filename", "")
            pdf_path = Paths.request_output(request_id) / pdf_name
            if pdf_path.exists():
                return [pdf_path]
            return []

        if ext == ".bmp":
            result = await bmp_to_pdf_service.process(request_id, files, config)
            pdf_name = result.get("pdf_filename", "")
            pdf_path = Paths.request_output(request_id) / pdf_name
            if pdf_path.exists():
                return [pdf_path]
            return []

        if ext == ".svg":
            result = await svg_to_pdf_service.process(request_id, files, config)
            pdfs = []
            for r in result.get("results", []):
                p = Paths.request_output(request_id) / r["pdf_filename"]
                if p.exists():
                    pdfs.append(p)
            return pdfs

        if ext == ".gif":
            return await self._convert_gif(request_id, files, config, temp_dir)

        if ext in (".tiff", ".tif"):
            return await self._convert_tiff(request_id, files, config, temp_dir)

        if ext == ".webp":
            return await self._convert_webp(request_id, files, config, temp_dir)

        if ext == ".heic":
            return await self._convert_heic(request_id, files, config, temp_dir)

        return []

    async def _convert_gif(
        self, request_id: str, files: List[str],
        config: Dict[str, Any], temp_dir: Path,
    ) -> List[Path]:
        from app.Convert_to_pdf_services.gif_to_pdf_service import gif_to_pdf_service
        files_config = [{"filename": f} for f in files]
        try:
            result = await gif_to_pdf_service.process(
                request_id=request_id,
                files_config=files_config,
                page_size=config.get("page_size", "a4"),
                orientation=config.get("orientation", "portrait"),
                margin_preset=config.get("margin_preset", "medium"),
                fit_mode=config.get("fit_mode", "fit"),
                remove_duplicates=True,
                background_color=config.get("bg_color", "#ffffff"),
                quality=config.get("quality", "high"),
                dpi=int(config.get("dpi", 150)),
                output_mode="single",
                custom_w_str="",
                custom_h_str="",
                custom_unit="mm",
                custom_margin_top=config.get("custom_margin_top", "10"),
                custom_margin_right=config.get("custom_margin_right", "10"),
                custom_margin_bottom=config.get("custom_margin_bottom", "10"),
                custom_margin_left=config.get("custom_margin_left", "10"),
                password="",
                title="",
                author="",
                subject="",
                keywords="",
                output_filename="converted_gifs.pdf",
            )
            pdf_name = result.get("pdf_filename", "converted_gifs.pdf")
            pdf_path = Paths.request_output(request_id) / pdf_name
            if pdf_path.exists():
                return [pdf_path]
        except Exception as e:
            logger.error(f"GIF conversion failed: {e}")
        return []

    async def _convert_tiff(
        self, request_id: str, files: List[str],
        config: Dict[str, Any], temp_dir: Path,
    ) -> List[Path]:
        from app.Convert_to_pdf_services.tiff_to_pdf_service import tiff_to_pdf_service
        files_config = [{"filename": f, "frames": []} for f in files]
        try:
            result = await tiff_to_pdf_service.process(
                request_id=request_id,
                files_config=files_config,
                config=config,
            )
            pdf_name = result.get("pdf_filename", "converted_tiffs.pdf")
            pdf_path = Paths.request_output(request_id) / pdf_name
            if pdf_path.exists():
                return [pdf_path]
        except Exception as e:
            logger.error(f"TIFF conversion failed: {e}")
        return []

    async def _convert_webp(
        self, request_id: str, files: List[str],
        config: Dict[str, Any], temp_dir: Path,
    ) -> List[Path]:
        from app.Convert_to_pdf_services.webp_to_pdf_service import webp_to_pdf_service
        files_config = [{"filename": f} for f in files]
        try:
            result = await webp_to_pdf_service.process(
                request_id=request_id,
                files_config=files_config,
                config=config,
            )
            pdf_name = result.get("pdf_filename", "converted_webp.pdf")
            pdf_path = Paths.request_output(request_id) / pdf_name
            if pdf_path.exists():
                return [pdf_path]
        except Exception as e:
            logger.error(f"WebP conversion failed: {e}")
        return []

    async def _convert_heic(
        self, request_id: str, files: List[str],
        config: Dict[str, Any], temp_dir: Path,
    ) -> List[Path]:
        from app.Convert_to_pdf_services.heic_to_pdf_service import heic_to_pdf_service
        files_config = [{"filename": f} for f in files]
        try:
            result = await heic_to_pdf_service.process(
                request_id=request_id,
                files_config=files_config,
                config=config,
            )
            pdf_name = result.get("pdf_filename", "converted_heic.pdf")
            pdf_path = Paths.request_output(request_id) / pdf_name
            if pdf_path.exists():
                return [pdf_path]
        except Exception as e:
            logger.error(f"HEIC conversion failed: {e}")
        return []

    # ── Document converters ────────────────────────────────────

    async def _convert_documents(
        self, request_id: str, files: List[str],
        config: Dict[str, Any], temp_dir: Path,
    ) -> List[Path]:
        pdfs = []
        for f in files:
            ext = Path(f).suffix.lower()
            try:
                paths = await self._convert_single_document(request_id, f, ext, config, temp_dir)
                pdfs.extend(paths)
            except Exception as e:
                logger.error(f"Document conversion failed for {f}: {e}")
        return pdfs

    async def _convert_single_document(
        self, request_id: str, filename: str, ext: str,
        config: Dict[str, Any], temp_dir: Path,
    ) -> List[Path]:
        output_dir = Paths.request_output(request_id)
        upload_dir = Paths.request_upload(request_id)

        if ext == ".docx":
            from app.Convert_to_pdf_services.word_to_pdf_service import word_to_pdf_service
            result = await word_to_pdf_service.process(request_id, [filename])
            for r in result.get("results", []):
                if r.get("status") == "success":
                    p = output_dir / r["pdf_filename"]
                    if p.exists():
                        return [p]

        if ext == ".rtf":
            from app.Convert_to_pdf_services.rtf_to_pdf_service import rtf_to_pdf_service
            files_config = [{"filename": filename}]
            result = await rtf_to_pdf_service.process(request_id, files_config, config)
            for r in result.get("results", []):
                if r.get("status") == "success":
                    p = output_dir / r.get("pdf_filename", "")
                    if p.exists():
                        return [p]

        if ext == ".odt":
            from app.Convert_to_pdf_services.odt_to_pdf_service import odt_to_pdf_service
            result = await odt_to_pdf_service.process(request_id, filename)
            pdf_name = result.get("pdf_filename", "")
            if pdf_name:
                p = output_dir / pdf_name
                if p.exists():
                    return [p]

        if ext == ".xps":
            from app.Convert_to_pdf_services.xps_to_pdf_service import xps_to_pdf_service
            result = await xps_to_pdf_service.process(request_id, [filename])
            for r in result.get("results", []):
                if r.get("status") == "success":
                    p = output_dir / r["pdf_filename"]
                    if p.exists():
                        return [p]

        return []

    # ── Spreadsheet converter ──────────────────────────────────

    async def _convert_spreadsheets(
        self, request_id: str, files: List[str],
        config: Dict[str, Any], temp_dir: Path,
    ) -> List[Path]:
        from app.Convert_to_pdf_services.excel_to_pdf_service import excel_to_pdf_service
        from app.Convert_to_pdf_services.csv_to_pdf_service import csv_to_pdf_service

        pdfs = []
        for f in files:
            ext = Path(f).suffix.lower()
            try:
                if ext in (".xlsx", ".xls"):
                    result = await excel_to_pdf_service.process(request_id, [f], config)
                    for r in result.get("results", []):
                        if r.get("status") == "success":
                            p = Paths.request_output(request_id) / r["pdf_filename"]
                            if p.exists():
                                pdfs.append(p)
                elif ext == ".ods":
                    from app.Convert_to_pdf_services.ods_to_pdf_service import ods_to_pdf_service
                    result = await ods_to_pdf_service.process(request_id, f)
                    pdf_name = result.get("pdf_filename", "")
                    if pdf_name:
                        p = Paths.request_output(request_id) / pdf_name
                        if p.exists():
                            pdfs.append(p)
                elif ext == ".csv":
                    csv_config = {
                        "page_size": config.get("page_size", "a4"),
                        "orientation": config.get("orientation", "landscape"),
                        "has_header": True,
                        "delimiter": ",",
                        "encoding": "utf-8",
                        "pdf_title": config.get("pdf_title", ""),
                        "pdf_author": config.get("pdf_author", ""),
                    }
                    result = await csv_to_pdf_service.process(request_id, f, csv_config)
                    pdf_name = result.get("pdf_filename", "")
                    if pdf_name:
                        p = Paths.request_output(request_id) / pdf_name
                        if p.exists():
                            pdfs.append(p)
            except Exception as e:
                logger.error(f"Spreadsheet conversion failed for {f}: {e}")
        return pdfs

    # ── Presentation converter ─────────────────────────────────

    async def _convert_presentations(
        self, request_id: str, files: List[str],
        config: Dict[str, Any], temp_dir: Path,
    ) -> List[Path]:
        from app.Convert_to_pdf_services.powerpoint_to_pdf_service import powerpoint_to_pdf_service

        pdfs = []
        for f in files:
            ext = Path(f).suffix.lower()
            try:
                if ext in (".pptx", ".ppt"):
                    result = await powerpoint_to_pdf_service.process(request_id, [f], config)
                    for r in result.get("results", []):
                        if r.get("status") == "success":
                            p = Paths.request_output(request_id) / r["pdf_filename"]
                            if p.exists():
                                pdfs.append(p)
                elif ext == ".odp":
                    from app.Convert_to_pdf_services.odp_to_pdf_service import odp_to_pdf_service
                    result = await odp_to_pdf_service.process(request_id, f)
                    pdf_name = result.get("pdf_filename", "")
                    if pdf_name:
                        p = Paths.request_output(request_id) / pdf_name
                        if p.exists():
                            pdfs.append(p)
            except Exception as e:
                logger.error(f"Presentation conversion failed for {f}: {e}")
        return pdfs

    # ── Data converters ────────────────────────────────────────

    async def _convert_data(
        self, request_id: str, files: List[str],
        config: Dict[str, Any], temp_dir: Path,
    ) -> List[Path]:
        pdfs = []
        for f in files:
            ext = Path(f).suffix.lower()
            try:
                paths = await self._convert_single_data(request_id, f, ext, config)
                pdfs.extend(paths)
            except Exception as e:
                logger.error(f"Data conversion failed for {f}: {e}")
        return pdfs

    async def _convert_single_data(
        self, request_id: str, filename: str, ext: str,
        config: Dict[str, Any],
    ) -> List[Path]:
        output_dir = Paths.request_output(request_id)
        upload_dir = Paths.request_upload(request_id)

        if ext == ".csv":
            from app.Convert_to_pdf_services.csv_to_pdf_service import csv_to_pdf_service
            csv_config = {
                "page_size": config.get("page_size", "a4"),
                "orientation": config.get("orientation", "landscape"),
                "has_header": True,
                "delimiter": ",",
                "encoding": "utf-8",
                "pdf_title": config.get("pdf_title", ""),
                "pdf_author": config.get("pdf_author", ""),
            }
            result = await csv_to_pdf_service.process(request_id, filename, csv_config)
            pdf_name = result.get("pdf_filename", "")
            if pdf_name:
                p = output_dir / pdf_name
                if p.exists():
                    return [p]

        if ext == ".json":
            from app.Convert_to_pdf_services.json_to_pdf_service import json_to_pdf_service
            file_path = upload_dir / filename
            content = file_path.read_text(encoding="utf-8", errors="replace")
            json_config = {
                "mode": "table",
                "page_size": config.get("page_size", "a4"),
                "orientation": config.get("orientation", "portrait"),
                "pdf_title": config.get("pdf_title", Path(filename).stem),
            }
            result = await json_to_pdf_service.process(request_id, filename, content, json_config)
            pdf_name = result.get("pdf_filename", "")
            if pdf_name:
                p = output_dir / pdf_name
                if p.exists():
                    return [p]

        if ext == ".xml":
            from app.Convert_to_pdf_services.xml_to_pdf_service import xml_to_pdf_service
            xml_config = {
                "page_size": config.get("page_size", "a4"),
                "orientation": config.get("orientation", "portrait"),
                "view_mode": "auto",
            }
            files_config = [{"filename": filename}]
            result = await xml_to_pdf_service.process(request_id, files_config, xml_config)
            for r in result.get("results", []):
                if r.get("status") == "success":
                    p = output_dir / r["pdf_filename"]
                    if p.exists():
                        return [p]

        if ext in (".md", ".markdown"):
            from app.Convert_to_pdf_services.markdown_to_pdf_service import markdown_to_pdf_service
            md_config = {
                "page_size": config.get("page_size", "a4"),
                "orientation": config.get("orientation", "portrait"),
                "margin_preset": "normal",
            }
            files_config = [{"filename": filename}]
            result = await markdown_to_pdf_service.process(request_id, files_config, md_config)
            for r in result.get("results", []):
                if r.get("status") == "success":
                    p = output_dir / r["pdf_filename"]
                    if p.exists():
                        return [p]

        if ext == ".txt":
            from app.Convert_to_pdf_services.text_to_pdf_service import text_to_pdf_service
            file_path = upload_dir / filename
            content = file_path.read_text(encoding="utf-8", errors="replace")
            html_content = f"<pre>{content}</pre>"
            pdf_name = Path(filename).stem + ".pdf"
            p = await text_to_pdf_service.process(
                upload_dir=upload_dir,
                html_content=html_content,
                page_size=config.get("page_size", "a4"),
                orientation=config.get("orientation", "portrait"),
                margin_preset="medium",
                custom_margin_top="10",
                custom_margin_right="10",
                custom_margin_bottom="10",
                custom_margin_left="10",
                custom_page_width="210",
                custom_page_height="297",
                custom_page_unit="mm",
                bg_color="#ffffff",
                border_width=0,
                border_style="solid",
                header_text="",
                footer_text="",
                header_align="center",
                footer_align="center",
                page_numbers=True,
                skip_first_page=False,
                title=config.get("pdf_title", ""),
                author=config.get("pdf_author", ""),
                subject="",
                keywords="",
                password="",
                output_filename=pdf_name,
            )
            if p and p.exists():
                return [p]

        return []

    # ── Web page converter ─────────────────────────────────────

    async def _convert_web(
        self, request_id: str, files: List[str],
        config: Dict[str, Any], temp_dir: Path,
    ) -> List[Path]:
        from app.Convert_to_pdf_services.html_to_pdf_service import html_to_pdf_service

        pdfs = []
        for f in files:
            try:
                upload_dir = Paths.request_upload(request_id)
                file_path = upload_dir / f
                content = file_path.read_text(encoding="utf-8", errors="replace")
                pdf_name = Path(f).stem + ".pdf"
                await html_to_pdf_service.process(
                    request_id=request_id,
                    input_type="html",
                    content=content,
                    page_size=config.get("page_size", "a4"),
                    orientation=config.get("orientation", "portrait"),
                    margin_preset="medium",
                    custom_margin_top="10",
                    custom_margin_right="10",
                    custom_margin_bottom="10",
                    custom_margin_left="10",
                    custom_page_width="210",
                    custom_page_height="297",
                    custom_page_unit="mm",
                    print_background=True,
                    header_text="",
                    footer_text="",
                    page_numbers=False,
                    title=config.get("pdf_title", ""),
                    author=config.get("pdf_author", ""),
                    subject="",
                    keywords="",
                    password="",
                    output_filename=pdf_name,
                )
                p = Paths.request_output(request_id) / pdf_name
                if p.exists():
                    pdfs.append(p)
            except Exception as e:
                logger.error(f"HTML conversion failed for {f}: {e}")
        return pdfs

    # ── Email converter ────────────────────────────────────────

    async def _convert_email(
        self, request_id: str, files: List[str],
        config: Dict[str, Any], temp_dir: Path,
    ) -> List[Path]:
        from app.Convert_to_pdf_services.email_to_pdf_service import email_to_pdf_service

        try:
            result = await email_to_pdf_service.process(
                request_id, files, {"output_mode": "combined"}
            )
            pdfs = []
            for r in result.get("results", []):
                if r.get("status") == "success":
                    p = Paths.request_output(request_id) / r.get("pdf_filename", "")
                    if p.exists():
                        pdfs.append(p)
            return pdfs
        except Exception as e:
            logger.error(f"Email conversion failed: {e}")
        return []

    # ── Design converter (Illustrator) ─────────────────────────

    async def _convert_design(
        self, request_id: str, files: List[str],
        config: Dict[str, Any], temp_dir: Path,
    ) -> List[Path]:
        from app.Convert_to_pdf_services.illustrator_to_pdf_service import illustrator_to_pdf_service

        pdfs = []
        for f in files:
            try:
                result = await illustrator_to_pdf_service.process(request_id, f)
                pdf_name = result.get("pdf_filename", "")
                if pdf_name:
                    p = Paths.request_output(request_id) / pdf_name
                    if p.exists():
                        pdfs.append(p)
            except Exception as e:
                logger.error(f"Illustrator conversion failed for {f}: {e}")
        return pdfs

    # ── Ebook converter ────────────────────────────────────────

    async def _convert_ebooks(
        self, request_id: str, files: List[str],
        config: Dict[str, Any], temp_dir: Path,
    ) -> List[Path]:
        from app.Convert_to_pdf_services.epub_to_pdf_service import epub_to_pdf_service

        pdfs = []
        for f in files:
            ext = Path(f).suffix.lower()
            try:
                epub_config = {
                    "page_size": config.get("page_size", "a4"),
                    "orientation": config.get("orientation", "portrait"),
                    "margin_preset": "normal",
                    "header_text": "",
                    "footer_text": "",
                    "page_numbers": True,
                    "pdf_title": config.get("pdf_title", ""),
                    "pdf_author": config.get("pdf_author", ""),
                }
                result = await epub_to_pdf_service.process(request_id, f, epub_config)
                pdf_name = result.get("filename", "")
                if pdf_name:
                    p = Paths.request_output(request_id) / pdf_name
                    if p.exists():
                        pdfs.append(p)
            except Exception as e:
                logger.error(f"Ebook conversion failed for {f}: {e}")
        return pdfs

    # ── PDF passthrough ────────────────────────────────────────

    async def _convert_pdfs(
        self, request_id: str, files: List[str],
        config: Dict[str, Any], temp_dir: Path,
    ) -> List[Path]:
        """Copy existing PDFs to temp for later merging."""
        upload_dir = Paths.request_upload(request_id)
        pdfs = []
        for f in files:
            src = upload_dir / f
            if src.exists():
                dst = temp_dir / f
                shutil.copy2(src, dst)
                pdfs.append(dst)
        return pdfs

    # ── Merge all collected PDFs ───────────────────────────────

    def _merge_pdfs(
        self, pdf_paths: List[Path], output_path: Path,
    ) -> int:
        """Merge multiple PDF files into one. Returns total page count."""
        writer = PdfWriter()
        total_pages = 0

        for pdf_path in pdf_paths:
            try:
                reader = PdfReader(str(pdf_path))
                for page in reader.pages:
                    writer.add_page(page)
                    total_pages += 1
            except Exception as e:
                logger.error(f"Failed to read PDF {pdf_path.name}: {e}")
                continue

        if total_pages == 0:
            raise ValueError("No pages found in any PDF to merge.")

        with open(output_path, "wb") as f:
            writer.write(f)

        return total_pages

    # ── Main process entry point ───────────────────────────────

    async def process(
        self,
        request_id: str,
        filenames: List[str],
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        temp_dir = Paths.request_temp(request_id) / "multi_files_temp"
        output_dir.mkdir(parents=True, exist_ok=True)

        if temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)
        temp_dir.mkdir(parents=True, exist_ok=True)

        if not filenames:
            raise ValueError("No files provided for conversion.")

        raw_name = config.get("output_filename", "merged_output")
        safe_name = _sanitize_filename(raw_name)
        if not safe_name.lower().endswith(".pdf"):
            safe_name += ".pdf"

        all_pdf_paths: List[Path] = []
        conversion_results: List[Dict[str, Any]] = []
        errors: List[Dict[str, Any]] = []
        temp_files_to_cleanup: List[Path] = []

        for idx, fn in enumerate(filenames):
            ext = Path(fn).suffix.lower()
            cat = _get_file_category(ext)
            if cat == CATEGORY_UNSUPPORTED:
                errors.append({
                    "filename": fn,
                    "status": "error",
                    "message": f"Unsupported format: {ext}",
                })
                continue

            file_config = config.copy()
            # To avoid collisions if multiple conversions of the same type run,
            # name the intermediate files uniquely using their indices.
            file_config["output_filename"] = f"temp_convert_{idx}"

            try:
                pdfs = await self._convert_group(
                    request_id, [fn], file_config, temp_dir
                )
                for pdf_path in pdfs:
                    # If the PDF is not already inside temp_dir, copy/move it to temp_dir
                    # to keep output_dir clean and prevent file conflicts.
                    if temp_dir not in pdf_path.parents:
                        dst_path = temp_dir / f"temp_convert_{idx}_{pdf_path.name}"
                        shutil.copy2(pdf_path, dst_path)
                        temp_files_to_cleanup.append(pdf_path) # Mark original for deletion
                        pdf_path = dst_path

                    all_pdf_paths.append(pdf_path)
                    conversion_results.append({
                        "filename": fn,
                        "status": "success",
                    })
            except Exception as e:
                logger.error(f"Error converting file {fn}: {e}")
                errors.append({
                    "filename": fn,
                    "status": "error",
                    "message": str(e),
                })

        if not all_pdf_paths:
            raise ValueError("All files failed to convert. No PDF output generated.")

        output_path = output_dir / safe_name
        try:
            total_pages = self._merge_pdfs(all_pdf_paths, output_path)
        except Exception as e:
            logger.error(f"PDF merge failed: {e}")
            raise ValueError(f"PDF merge failed: {e}")
        finally:
            # Clean up the intermediate files in output_dir
            for p in temp_files_to_cleanup:
                try:
                    if p.exists():
                        p.unlink()
                except Exception as cleanup_err:
                    logger.warning(f"Failed to cleanup temp file {p}: {cleanup_err}")

        # Cleanup temp dir
        if temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)

        return {
            "success": True,
            "request_id": request_id,
            "pdf_filename": safe_name,
            "page_count": total_pages,
            "files_converted": len(conversion_results),
            "files_failed": len(errors),
            "results": conversion_results,
            "errors": errors,
        }


multiple_files_to_pdf_service = MultipleFilesToPdfService()
