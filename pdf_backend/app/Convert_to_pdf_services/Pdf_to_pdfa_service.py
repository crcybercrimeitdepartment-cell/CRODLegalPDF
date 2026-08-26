import os
import subprocess
import logging
import shutil
from pathlib import Path
from typing import List, Dict, Any
from pypdf import PdfReader
import pikepdf

from app.core.paths import Paths

logger = logging.getLogger(__name__)


def _fallback_normalize_pdf(input_path: Path, output_path: Path) -> None:
    """Create a clean rewritten PDF when full PDF/A tooling is unavailable."""
    with pikepdf.open(str(input_path)) as pdf:
        pdf.save(
            str(output_path),
            compress_streams=True,
            object_stream_mode=pikepdf.ObjectStreamMode.generate,
        )

class PdfToPdfAService:
    
    def __init__(self):
        self.supported_standards = {
            "pdfa-1b": "pdfa-1",
            "pdfa-2b": "pdfa-2",
            "pdfa-3b": "pdfa-3"
        }

    async def process(
        self,
        request_id: str,
        filenames: List[str],
        pdfa_standard: str = "pdfa-2b",
        preserve_metadata: bool = True
    ) -> Dict[str, Any]:
        """
        Convert uploaded PDFs to PDF/A.
        """
        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        results = []

        if pdfa_standard not in self.supported_standards:
            pdfa_standard = "pdfa-2b"
            
        ocr_profile = self.supported_standards[pdfa_standard]
        has_ocrmypdf = bool(shutil.which("ocrmypdf"))
        has_tesseract = bool(shutil.which("tesseract"))
        
        for filename in filenames:
            input_path = upload_dir / filename
            
            # Basic validation
            if not input_path.exists():
                results.append({
                    "original_filename": filename,
                    "status": "failed",
                    "pdfa_compliant": False,
                    "message": "File not found."
                })
                continue
                
            try:
                # Validate it's a readable PDF
                reader = PdfReader(str(input_path))
                if len(reader.pages) == 0:
                    raise ValueError("PDF is empty.")
            except Exception as e:
                results.append({
                    "original_filename": filename,
                    "status": "failed",
                    "pdfa_compliant": False,
                    "message": f"Invalid or corrupted PDF file."
                })
                continue
                
            # Construct output filename
            stem = input_path.stem
            output_filename = f"{stem}_pdfa.pdf"
            output_path = output_dir / output_filename

            if not has_ocrmypdf or not has_tesseract:
                try:
                    _fallback_normalize_pdf(input_path, output_path)
                    results.append({
                        "original_filename": filename,
                        "pdf_filename": output_filename,
                        "status": "success",
                        "pdfa_compliant": False,
                        "pdfa_standard": pdfa_standard,
                        "message": "Generated a normalized archival PDF fallback because OCRmyPDF/Tesseract is unavailable on this machine."
                    })
                except Exception as e:
                    logger.error(f"Fallback PDF/A conversion failed for {filename}: {e}", exc_info=True)
                    missing = []
                    if not has_ocrmypdf:
                        missing.append("ocrmypdf")
                    if not has_tesseract:
                        missing.append("tesseract")
                    results.append({
                        "original_filename": filename,
                        "status": "failed",
                        "pdfa_compliant": False,
                        "pdfa_standard": pdfa_standard,
                        "message": f"PDF/A tooling missing: {', '.join(missing)}.",
                    })
                continue
            
            # Execute ocrmypdf in PDF/A conversion mode without OCR
            cmd = [
                "ocrmypdf",
                "--skip-text",
                "--output-type", ocr_profile,
                "--optimize", "1",
                str(input_path.resolve()),
                str(output_path.resolve())
            ]
            
            try:
                process = subprocess.run(
                    cmd, 
                    capture_output=True, 
                    text=True, 
                    check=False
                )
                
                if process.returncode == 0 and output_path.exists():
                    results.append({
                        "original_filename": filename,
                        "pdf_filename": output_filename,
                        "status": "success",
                        "pdfa_compliant": True,
                        "pdfa_standard": pdfa_standard,
                        "message": "Validation passed."
                    })
                else:
                    # Parse stderr to provide a readable error message
                    error_msg = "PDF/A Conversion failed."
                    stderr = process.stderr.lower()
                    if "font" in stderr and "embed" in stderr:
                        error_msg = "Fonts could not be embedded or processed."
                    elif "color" in stderr or "icc" in stderr:
                        error_msg = "Color profile conversion failed."
                    elif process.stderr.strip():
                        # Grab the last relevant error line or a summary
                        lines = [line.strip() for line in process.stderr.split('\n') if line.strip() and not line.startswith("WARNING")]
                        if lines:
                            error_msg = f"Validation Error: {lines[-1]}"
                    
                    logger.error(f"PDF/A conversion failed for {filename}. Code {process.returncode}. {process.stderr}")
                    
                    results.append({
                        "original_filename": filename,
                        "status": "failed",
                        "pdfa_compliant": False,
                        "pdfa_standard": pdfa_standard,
                        "message": error_msg,
                        "details": process.stderr
                    })
                    
            except Exception as e:
                logger.error(f"Error during ocrmypdf execution: {str(e)}")
                results.append({
                    "original_filename": filename,
                    "status": "failed",
                    "pdfa_compliant": False,
                    "message": f"System error during conversion: {str(e)}"
                })

        return {
            "success": any(r.get("status") == "success" for r in results),
            "request_id": request_id,
            "results": results
        }

pdf_to_pdfa_service = PdfToPdfAService()
