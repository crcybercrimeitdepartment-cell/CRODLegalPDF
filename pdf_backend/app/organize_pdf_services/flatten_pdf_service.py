"""
Service for flattening PDF interactive elements into static content.
"""

from __future__ import annotations

import logging
from pathlib import Path

import fitz  # PyMuPDF

from app.core.constants import FLATTEN_OUTPUT_PREFIX
from app.core.paths import Paths
from app.utils.filename import output_filename

logger = logging.getLogger(__name__)


class FlattenPDFService:
    """Flatten PDF by making interactive elements non-editable."""

    async def flatten(
        self,
        input_pdf: Path,
        request_id: str,
        flatten_forms: bool = True,
        flatten_comments: bool = True,
        flatten_highlights: bool = True,
        flatten_annotations: bool = True,
        flatten_stamps: bool = True,
        flatten_signature: bool = True,
        flatten_entire_document: bool = False,
    ) -> dict:
        """
        Flatten selected interactive elements in a PDF document.
        """
        if flatten_entire_document:
            flatten_forms = True
            flatten_comments = True
            flatten_highlights = True
            flatten_annotations = True
            flatten_stamps = True
            flatten_signature = True

        output_dir = Paths.request_output(request_id)
        out_name = output_filename(prefix=FLATTEN_OUTPUT_PREFIX)
        out_path = output_dir / out_name

        try:
            doc = fitz.open(str(input_pdf))
        except Exception as e:
            raise ValueError(f"Invalid or corrupted PDF file: {str(e)}")

        if doc.is_encrypted:
            raise ValueError("Cannot flatten password-protected PDF. Please unlock it first.")

        if doc.page_count == 0:
            doc.close()
            raise ValueError("The PDF document is empty.")

        # Flags that make an annotation un-editable and strictly printed
        # bit 3: Print, bit 7: ReadOnly, bit 8: Locked, bit 10: LockedContents
        FLATTEN_FLAGS = (
            fitz.PDF_ANNOT_IS_PRINT |
            fitz.PDF_ANNOT_IS_READ_ONLY |
            fitz.PDF_ANNOT_IS_LOCKED |
            fitz.PDF_ANNOT_IS_LOCKED_CONTENTS
        )

        for page in doc:
            for annot in page.annots():
                should_flatten = False
                atype = annot.type[0]

                # Identify annotation types
                if flatten_forms and atype == fitz.PDF_ANNOT_WIDGET:
                    should_flatten = True
                elif flatten_comments and atype in (fitz.PDF_ANNOT_TEXT, fitz.PDF_ANNOT_FREE_TEXT):
                    should_flatten = True
                elif flatten_highlights and atype in (fitz.PDF_ANNOT_HIGHLIGHT, fitz.PDF_ANNOT_UNDERLINE, fitz.PDF_ANNOT_STRIKE_OUT, fitz.PDF_ANNOT_SQUIGGLY):
                    should_flatten = True
                elif flatten_stamps and atype == fitz.PDF_ANNOT_STAMP:
                    should_flatten = True
                elif flatten_signature and atype == fitz.PDF_ANNOT_WIDGET:
                    # Signatures are also widgets
                    should_flatten = True
                elif flatten_annotations and atype not in (fitz.PDF_ANNOT_WIDGET, fitz.PDF_ANNOT_TEXT, fitz.PDF_ANNOT_FREE_TEXT, fitz.PDF_ANNOT_HIGHLIGHT, fitz.PDF_ANNOT_STAMP):
                    should_flatten = True

                if should_flatten:
                    annot.flags |= FLATTEN_FLAGS
                    # Optional: bake appearance into PDF stream (if PyMuPDF supports)
                    try:
                        annot.update()
                    except Exception:
                        pass
        
        # To strictly flatten forms and prevent AcroForm from being recognized, we can strip the Root AcroForm entry
        if flatten_forms:
            try:
                # Remove AcroForm from document catalog
                doc.xref_set_key(doc.pdf_catalog(), "AcroForm", "null")
            except Exception as e:
                logger.warning(f"Could not strip AcroForm: {e}")

        # Save optimized flattened PDF
        doc.save(
            str(out_path),
            garbage=4,       # Remove unused objects
            deflate=True,    # Compress streams
            clean=True       # Clean content streams
        )
        doc.close()

        original_size = input_pdf.stat().st_size
        final_size = out_path.stat().st_size

        return {
            "filename": out_name,
            "download_url": f"/api/pdf/download/{request_id}/{out_name}",
            "request_id": request_id,
            "original_size": original_size,
            "final_size": final_size,
            "message": "PDF flattened successfully."
        }
