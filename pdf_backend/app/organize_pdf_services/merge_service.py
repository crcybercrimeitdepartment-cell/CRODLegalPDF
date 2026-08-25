"""
Service for merging multiple PDF files into one.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import List

from pypdf import PdfReader, PdfWriter

from app.core.constants import MERGED_OUTPUT_NAME, PDF_METADATA_CREATOR
from app.core.paths import Paths
from app.schemas.pdf_schema import MergePDFResponse
from app.utils.file_handler import file_size

logger = logging.getLogger(__name__)


class MergePDFService:
    """Merge multiple PDFs into a single file."""

    async def merge(
        self,
        input_files: List[Path],
        request_id: str,
    ) -> MergePDFResponse:
        """
        Merge all ``input_files`` into one PDF.

        Args:
            input_files: Ordered list of PDF paths to merge.
            request_id: Unique request identifier.

        Returns:
            MergePDFResponse with output filename and download URL.
        """
        if not input_files:
            raise ValueError("No input files provided for merge.")

        output_dir = Paths.request_output(request_id)
        output_path = output_dir / MERGED_OUTPUT_NAME

        writer = PdfWriter()

        for pdf_path in input_files:
            reader = PdfReader(str(pdf_path))
            for page in reader.pages:
                writer.add_page(page)

        if input_files:
            first_reader = PdfReader(str(input_files[0]))
            if first_reader.metadata:
                writer.add_metadata(first_reader.metadata)

        writer.add_metadata({
            "/Producer": PDF_METADATA_CREATOR,
        })

        with open(output_path, "wb") as f:
            writer.write(f)

        logger.info("Merged %d PDF(s) → %s", len(input_files), MERGED_OUTPUT_NAME)

        size = file_size(output_path)

        return MergePDFResponse(
            success=True,
            message=f"Successfully merged {len(input_files)} PDF(s).",
            request_id=request_id,
            filename=MERGED_OUTPUT_NAME,
            download_url=f"/api/pdf/download/{request_id}/{MERGED_OUTPUT_NAME}",
            file_size=size,
        )
