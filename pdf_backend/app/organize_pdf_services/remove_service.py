"""
Service for removing pages from a PDF file.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import List

from pypdf import PdfReader, PdfWriter

from app.core.constants import PDF_EXTENSION, REMOVED_OUTPUT_PREFIX
from app.core.paths import Paths
from app.schemas.pdf_schema import RemovePagesResponse
from app.utils.filename import output_filename
from app.utils.page_parser import pages_to_remove

logger = logging.getLogger(__name__)


class RemovePDFPagesService:
    """Remove selected pages from a PDF and return the result."""

    async def remove_pages(
        self,
        input_pdf: Path,
        page_string: str,
        request_id: str,
    ) -> RemovePagesResponse:
        """
        Remove pages specified by ``page_string`` from ``input_pdf``.

        Args:
            input_pdf: Path to the uploaded PDF.
            page_string: Comma/range string, e.g. ``"1,3,5-8"``.
            request_id: Unique request identifier.

        Returns:
            RemovePagesResponse with output filename and download URL.
        """
        output_dir = Paths.request_output(request_id)

        reader = PdfReader(str(input_pdf))
        total_pages = len(reader.pages)

        remove_idxs, keep_idxs = pages_to_remove(page_string, total_pages)

        if not keep_idxs:
            raise ValueError(
                "Cannot remove all pages. At least one page must remain."
            )

        writer = PdfWriter()

        for idx in keep_idxs:
            writer.add_page(reader.pages[idx])

        if reader.metadata:
            writer.add_metadata(reader.metadata)

        out_name = output_filename(prefix=REMOVED_OUTPUT_PREFIX)
        out_path = output_dir / out_name

        with open(out_path, "wb") as f:
            writer.write(f)

        logger.info(
            "Removed %d page(s) from PDF → %s", len(remove_idxs), out_name
        )

        file_size = out_path.stat().st_size

        return RemovePagesResponse(
            success=True,
            message=f"Successfully removed {len(remove_idxs)} page(s).",
            request_id=request_id,
            filename=out_name,
            download_url=f"/api/pdf/download/{request_id}/{out_name}",
            file_size=file_size,
        )
