"""
Service for repairing corrupted or damaged PDF files.
"""

from __future__ import annotations

import logging
from pathlib import Path

import fitz  # PyMuPDF
import pikepdf
from pikepdf import Pdf

from app.core.paths import Paths
from app.utils.filename import output_filename

logger = logging.getLogger(__name__)


class RepairPDFService:
    """Repair corrupted or damaged PDF files using pikepdf and PyMuPDF."""

    async def repair(self, input_pdf: Path, request_id: str) -> dict:
        """
        Attempt to repair the given PDF document and return a status report.
        """
        output_dir = Paths.request_output(request_id)
        out_name = output_filename(prefix="repaired")
        out_path = output_dir / out_name

        original_size = input_pdf.stat().st_size if input_pdf.exists() else 0
        if original_size == 0:
            raise ValueError("The uploaded PDF is empty.")

        # Try to detect password protection before doing structural repair
        try:
            with Pdf.open(str(input_pdf)) as pdf:
                if pdf.is_encrypted:
                    raise ValueError("Cannot repair password-protected PDF. Please unlock it first.")
        except pikepdf.PasswordError:
            raise ValueError("Cannot repair password-protected PDF. Please unlock it first.")
        except Exception:
            # Continue to repair if it's corrupted and throws other errors
            pass

        repair_successful = False
        repair_method = ""
        error_details = []

        # Attempt 1: pikepdf (built on qpdf, excellent at rebuilding corrupted XREF tables)
        try:
            with Pdf.open(str(input_pdf), allow_overwriting_input=False) as pdf:
                pdf.save(str(out_path))
            repair_successful = True
            repair_method = "pikepdf (Structural Rebuild)"
        except Exception as e:
            error_details.append(f"pikepdf failed: {str(e)}")
            logger.warning(f"pikepdf repair failed for {input_pdf}: {e}")

        # Attempt 2: PyMuPDF (fitz) as a fallback if pikepdf fails
        if not repair_successful:
            try:
                doc = fitz.open(str(input_pdf))
                if doc.needs_pass:
                    raise ValueError("Cannot repair password-protected PDF. Please unlock it first.")
                
                # Saving with garbage=4 cleans up unused objects and restructures the document
                doc.save(str(out_path), garbage=4, deflate=True)
                doc.close()
                
                repair_successful = True
                repair_method = "PyMuPDF (Garbage Collection Rebuild)"
            except Exception as e:
                error_details.append(f"PyMuPDF failed: {str(e)}")
                logger.warning(f"PyMuPDF repair failed for {input_pdf}: {e}")

        if not repair_successful:
            logger.error(f"All repair attempts failed for request {request_id}. Errors: {error_details}")
            raise ValueError(
                "PDF is severely corrupted and cannot be repaired automatically. "
                "The file may not be a valid PDF or the header is missing."
            )

        # Validate repaired file
        final_size = out_path.stat().st_size if out_path.exists() else 0
        if final_size == 0:
            raise ValueError("Repair process produced an empty output file.")

        return {
            "filename": out_name,
            "download_url": f"/api/pdf/download/{request_id}/{out_name}",
            "request_id": request_id,
            "status": "success",
            "report": {
                "original_size": original_size,
                "repaired_size": final_size,
                "repair_method": repair_method
            },
            "message": "PDF repaired successfully."
        }
