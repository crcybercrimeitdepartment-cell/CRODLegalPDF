import os
import re
import logging
from pathlib import Path
from typing import List, Dict, Any

try:
    import pythoncom
    import win32com.client
except ImportError:
    pythoncom = None
    win32com = None

from app.core.paths import Paths

logger = logging.getLogger(__name__)

class RtfToPdfService:
    def __init__(self):
        self.wdFormatPDF = 17

    def validate_rtf_file(self, path: Path) -> None:
        """Validate that the file is an RTF and not empty."""
        if not path.exists():
            raise ValueError(f"File not found: {path.name}")
        if path.stat().st_size == 0:
            raise ValueError(f"File '{path.name}' is empty.")
        
        # We don't limit size as strictly as image tools since RTF can be large, but let's say 200MB max.
        if path.stat().st_size > 200 * 1024 * 1024:
            raise ValueError(f"File '{path.name}' exceeds the 200 MB size limit.")
            
        ext = path.suffix.lower()
        if ext != ".rtf":
            raise ValueError(f"File '{path.name}' has an unsupported extension. Only .rtf is allowed.")

    async def process(
        self,
        request_id: str,
        files_config: List[Dict[str, Any]],
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Convert uploaded RTF documents to PDF using Word COM via pywin32.
        """
        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # --- Extract Config ---
        page_size = config.get("page_size", "a4").lower()
        orientation = config.get("orientation", "portrait").lower()
        margin_preset = config.get("margin_preset", "default").lower()
        
        compression = config.get("compression", "balanced").lower()
        
        header_text = config.get("header_text", "")
        footer_text = config.get("footer_text", "")
        
        pdf_title = config.get("pdf_title", "")
        pdf_author = config.get("pdf_author", "")
        pdf_subject = config.get("pdf_subject", "")
        pdf_keywords = config.get("pdf_keywords", "")
        pdf_password = config.get("pdf_password", "")
        
        results = []

        if pythoncom is None or win32com is None:
            raise ValueError("RTF conversion is only available on a Windows server with Microsoft Word installed.")
        
        # COM must be initialized in the thread
        pythoncom.CoInitialize()
        word = None
        try:
            # DispatchEx creates a new independent instance of Word
            word = win32com.client.DispatchEx("Word.Application")
            word.Visible = False
            word.DisplayAlerts = False
            
            for f_conf in files_config:
                filename = f_conf["filename"]
                input_path = upload_dir / filename
                
                try:
                    self.validate_rtf_file(input_path)
                except ValueError as ve:
                    results.append({
                        "original": filename,
                        "status": "error",
                        "message": str(ve)
                    })
                    continue
                
                output_filename = f"{input_path.stem}.pdf"
                output_path = output_dir / output_filename
                
                doc = None
                try:
                    # Open document
                    doc = word.Documents.Open(str(input_path.resolve()), ReadOnly=True)
                    
                    # --- Apply Page Settings ---
                    self._apply_page_setup(doc.PageSetup, page_size, orientation, margin_preset)
                    
                    # --- Apply Header/Footer ---
                    if header_text:
                        # wdHeaderFooterPrimary = 1
                        doc.Sections(1).Headers(1).Range.Text = header_text
                    if footer_text:
                        doc.Sections(1).Footers(1).Range.Text = footer_text
                    
                    # Setup export options
                    # WdExportFormat 17 = wdExportFormatPDF
                    # WdExportOptimizeFor 0 = wdExportOptimizeForPrint (high quality), 1 = wdExportOptimizeForOnScreen (smaller)
                    optimize_for = 1 if compression == "small_file" else 0
                    
                    # Export
                    doc.ExportAsFixedFormat(
                        OutputFileName=str(output_path.resolve()),
                        ExportFormat=17,
                        OpenAfterExport=False,
                        OptimizeFor=optimize_for,
                        CreateBookmarks=0
                    )
                    
                except Exception as e:
                    logger.error(f"Error converting {filename}: {str(e)}")
                    results.append({
                        "original": filename,
                        "status": "error",
                        "message": f"Failed to render RTF via Word engine: {str(e)}"
                    })
                    continue
                finally:
                    if doc:
                        doc.Close(SaveChanges=False)
                        
                # --- Post Processing (Metadata & Password) ---
                if output_path.exists():
                    self._apply_metadata_and_security(
                        output_path, 
                        pdf_title, pdf_author, pdf_subject, pdf_keywords, 
                        pdf_password
                    )
                    
                    results.append({
                        "original": filename,
                        "pdf_filename": output_filename,
                        "status": "success"
                    })
                        
        except Exception as e:
            logger.error(f"Failed to initialize Word COM or general error: {str(e)}")
            raise ValueError("RTF to PDF conversion engine failed. Please try again.")
            
        finally:
            if word:
                try:
                    word.Quit()
                except:
                    pass
            pythoncom.CoUninitialize()

        return {
            "success": True,
            "request_id": request_id,
            "results": results
        }

    def _apply_page_setup(self, page_setup, page_size: str, orientation: str, margin_preset: str):
        """Map UI settings to Word COM PageSetup properties."""
        # Orientation: wdOrientPortrait = 0, wdOrientLandscape = 1
        if orientation == "landscape":
            page_setup.Orientation = 1
        elif orientation == "portrait":
            page_setup.Orientation = 0
            
        # Paper Size Mapping
        # wdPaperA4 = 7, wdPaperA3 = 6, wdPaperA5 = 8, wdPaperLetter = 2, wdPaperLegal = 4
        size_map = {
            "a4": 7,
            "a3": 6,
            "a5": 8,
            "letter": 2,
            "legal": 4
        }
        if page_size in size_map:
            page_setup.PaperSize = size_map[page_size]
            
        # Margin Mapping (in points, 1 inch = 72 points)
        if margin_preset != "default":
            margin_map = {
                "small": 36.0,   # 0.5 inch
                "normal": 72.0,  # 1.0 inch
                "large": 108.0   # 1.5 inch
            }
            pts = margin_map.get(margin_preset)
            if pts:
                page_setup.TopMargin = pts
                page_setup.BottomMargin = pts
                page_setup.LeftMargin = pts
                page_setup.RightMargin = pts

    def _apply_metadata_and_security(
        self, pdf_path: Path, 
        title: str, author: str, subject: str, keywords: str,
        password: str
    ) -> None:
        """Inject metadata and password using pikepdf."""
        if not any([title, author, subject, keywords, password]):
            return
            
        try:
            import pikepdf
            with pikepdf.open(pdf_path, allow_overwriting_input=True) as pdf:
                # Metadata
                with pdf.open_metadata() as meta:
                    if title:    meta["dc:title"]       = title
                    if author:   meta["dc:creator"]     = author
                    if subject:  meta["dc:description"] = subject
                    if keywords: meta["pdf:Keywords"]   = keywords
                    meta["pdf:Producer"] = "PDF Tools (RTF to PDF)"
                
                # Security
                if password:
                    pdf.save(pdf_path, encryption=pikepdf.Encryption(
                        owner=password,
                        user=password,
                        R=4
                    ))
                else:
                    pdf.save(pdf_path)
        except Exception as pe:
            logger.warning(f"pikepdf post-processing failed for {pdf_path.name}: {pe}")

# Singleton
rtf_to_pdf_service = RtfToPdfService()
