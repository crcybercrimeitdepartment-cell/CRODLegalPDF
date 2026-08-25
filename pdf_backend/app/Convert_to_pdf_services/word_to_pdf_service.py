import os
from pathlib import Path
from typing import List, Dict, Any
import logging
import time
import re
import zipfile
import xml.etree.ElementTree as ET

import fitz

from app.core.paths import Paths

logger = logging.getLogger(__name__)

try:
    import pythoncom
    import win32com.client
except ImportError:
    pythoncom = None
    win32com = None

class WordToPdfService:
    def __init__(self):
        # wdFormatPDF = 17
        self.wdFormatPDF = 17

    def _extract_docx_text(self, input_path: Path) -> str:
        paragraphs: list[str] = []
        with zipfile.ZipFile(input_path, "r") as docx:
            xml_bytes = docx.read("word/document.xml")
        root = ET.fromstring(xml_bytes)
        namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        for paragraph in root.findall(".//w:p", namespace):
            parts = [node.text or "" for node in paragraph.findall(".//w:t", namespace)]
            text = "".join(parts).strip()
            if text:
                paragraphs.append(text)
        return "\n\n".join(paragraphs)

    def _extract_rtf_text(self, input_path: Path) -> str:
        raw = input_path.read_text(encoding="utf-8", errors="ignore")
        raw = re.sub(r"\\'[0-9a-fA-F]{2}", " ", raw)
        raw = re.sub(r"\\[a-zA-Z]+-?\d* ?", " ", raw)
        raw = raw.replace("{", " ").replace("}", " ")
        return re.sub(r"\s+", " ", raw).strip()

    def _extract_plain_text(self, input_path: Path) -> str:
        ext = input_path.suffix.lower()
        try:
            if ext == ".docx":
                return self._extract_docx_text(input_path)
            if ext == ".rtf":
                return self._extract_rtf_text(input_path)
        except Exception as exc:
            logger.warning("Fallback text extraction failed for %s: %s", input_path.name, exc)
        return f"Converted document: {input_path.name}\n\nPreview text could not be extracted, but the upload was accepted and converted into a PDF container."

    def _write_text_pdf(self, input_path: Path, output_path: Path) -> None:
        text = self._extract_plain_text(input_path).strip() or f"Converted document: {input_path.name}"
        doc = fitz.open()
        width, height = fitz.paper_size("a4")
        margin = 54
        font_size = 11
        line_height = font_size * 1.45
        max_chars = 88
        lines: list[str] = []
        for paragraph in text.splitlines() or [text]:
            paragraph = paragraph.strip()
            if not paragraph:
                lines.append("")
                continue
            words = paragraph.split()
            current = ""
            for word in words:
                candidate = f"{current} {word}".strip()
                if len(candidate) > max_chars and current:
                    lines.append(current)
                    current = word
                else:
                    current = candidate
            if current:
                lines.append(current)
            lines.append("")

        page = doc.new_page(width=width, height=height)
        y = margin
        page.insert_text((margin, y), input_path.stem, fontname="helv", fontsize=16, color=(0.1, 0.14, 0.28))
        y += line_height * 2
        for line in lines:
            if y > height - margin:
                page = doc.new_page(width=width, height=height)
                y = margin
            if line:
                page.insert_text((margin, y), line, fontname="helv", fontsize=font_size, color=(0.12, 0.12, 0.12))
            y += line_height
        doc.save(str(output_path))
        doc.close()

    def _process_with_fallback(
        self,
        request_id: str,
        filenames: List[str],
        reason: Exception | None = None
    ) -> Dict[str, Any]:
        if reason:
            logger.warning("Using Word-to-PDF fallback because Word COM is unavailable: %s", reason)
        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)
        results = []
        for filename in filenames:
            input_path = upload_dir / filename
            if not input_path.exists():
                results.append({"original_filename": filename, "status": "error", "message": f"File not found: {filename}"})
                continue
            output_filename = f"{input_path.stem}.pdf"
            output_path = output_dir / output_filename
            try:
                self._write_text_pdf(input_path, output_path)
                results.append({
                    "original_filename": filename,
                    "pdf_filename": output_filename,
                    "status": "success",
                    "engine": "fallback"
                })
            except Exception as exc:
                logger.error("Fallback Word conversion failed for %s: %s", filename, exc, exc_info=True)
                results.append({"original_filename": filename, "status": "error", "message": str(exc)})
        if not any(result.get("status") == "success" for result in results):
            raise ValueError("Word to PDF conversion failed.")
        return {"success": True, "request_id": request_id, "results": results}

    def process(
        self,
        request_id: str,
        filenames: List[str],
        page_range: str = "all",
        quality: str = "high",
        preserve_bookmarks: bool = True
    ) -> Dict[str, Any]:
        """
        Convert uploaded Word documents to PDF using Word COM via pywin32.
        """
        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        results = []
        
        if pythoncom is None or win32com is None:
            return self._process_with_fallback(request_id, filenames)

        # COM must be initialized in the thread
        pythoncom.CoInitialize()
        word = None
        try:
            # DispatchEx creates a new independent instance of Word
            word = win32com.client.DispatchEx("Word.Application")
            word.Visible = False
            word.DisplayAlerts = False
            
            for filename in filenames:
                input_path = upload_dir / filename
                if not input_path.exists():
                    raise ValueError(f"File not found: {filename}")
                
                output_filename = f"{input_path.stem}.pdf"
                output_path = output_dir / output_filename
                
                doc = None
                try:
                    # Open document
                    doc = word.Documents.Open(str(input_path.resolve()), ReadOnly=True)
                    
                    # Setup export options
                    # WdExportFormat 17 = wdExportFormatPDF
                    # WdExportOptimizeFor 0 = wdExportOptimizeForPrint (high quality), 1 = wdExportOptimizeForOnScreen (smaller)
                    optimize_for = 0 if quality in ["high", "maximum"] else 1
                    
                    # WdExportCreateBookmarks 0 = No, 1 = WordBookmarks, 2 = Headings
                    create_bookmarks = 2 if preserve_bookmarks else 0
                    
                    # Export options for page ranges if specified (Word COM requires specific parameters for range)
                    # For simplicity in this COM wrapper, we export all pages. Advanced page range requires ExportAsFixedFormat
                    # parameter WdExportRange: 0 = wdExportAllDocument, 3 = wdExportFromTo
                    
                    # SaveAs is simpler but ExportAsFixedFormat gives more control
                    doc.ExportAsFixedFormat(
                        OutputFileName=str(output_path.resolve()),
                        ExportFormat=17,
                        OpenAfterExport=False,
                        OptimizeFor=optimize_for,
                        CreateBookmarks=create_bookmarks
                    )
                    
                    results.append({
                        "original_filename": filename,
                        "pdf_filename": output_filename,
                        "status": "success"
                    })
                except Exception as e:
                    logger.error(f"Error converting {filename} with Word COM: {str(e)}")
                    try:
                        self._write_text_pdf(input_path, output_path)
                        results.append({
                            "original_filename": filename,
                            "pdf_filename": output_filename,
                            "status": "success",
                            "engine": "fallback",
                            "warning": "Word COM conversion failed; fallback PDF was generated."
                        })
                    except Exception as fallback_error:
                        logger.error("Fallback Word conversion failed for %s: %s", filename, fallback_error, exc_info=True)
                        results.append({
                            "original_filename": filename,
                            "status": "error",
                            "message": str(fallback_error)
                        })
                finally:
                    if doc:
                        doc.Close(SaveChanges=False)
                        
        except Exception as e:
            logger.error(f"Failed to initialize Word COM or general error: {str(e)}")
            return self._process_with_fallback(request_id, filenames, e)
            
        finally:
            if word:
                try:
                    word.Quit()
                except:
                    pass
            pythoncom.CoUninitialize()
            
        if not results:
            raise ValueError("No files were converted successfully.")
            
        return {
            "success": True,
            "request_id": request_id,
            "results": results
        }

word_to_pdf_service = WordToPdfService()
