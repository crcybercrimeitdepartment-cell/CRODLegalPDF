"""
Service for rotating PDF files.
"""

from __future__ import annotations

import logging
from pathlib import Path

from pikepdf import Pdf

from app.core.paths import Paths
from app.schemas.pdf_schema import APIResponse, RotatePDFResponse
from app.utils.filename import output_filename

logger = logging.getLogger(__name__)

class RotatePDFService:
    """Rotate all pages in a PDF document."""

    async def rotate(
        self,
        input_pdf: Path,
        rotation: int,
        pages: str,
        request_id: str,
    ) -> RotatePDFResponse:
        """
        Apply a specific rotation to each selected page.
        """
        output_dir = Paths.request_output(request_id)
        out_name = output_filename(prefix="rotated")
        out_path = output_dir / out_name

        try:
            with Pdf.open(str(input_pdf)) as pdf:
                total_pages = len(pdf.pages)
                
                # Determine which pages to rotate
                pages_to_rotate = set()
                if pages == 'all':
                    pages_to_rotate = set(range(total_pages))
                elif pages == 'odd':
                    pages_to_rotate = set(range(0, total_pages, 2))
                elif pages == 'even':
                    pages_to_rotate = set(range(1, total_pages, 2))
                else:
                    # Parse custom string like '1,3,5-7' using utility
                    from app.utils.page_parser import parse_page_range
                    try:
                        pages_1indexed = parse_page_range(pages, total_pages)
                        pages_to_rotate = {p - 1 for p in pages_1indexed}
                    except ValueError:
                        # Fallback if invalid
                        pages_to_rotate = set()

                for i, page in enumerate(pdf.pages):
                    if i not in pages_to_rotate:
                        continue

                    if rotation == 0:
                        continue

                    current_rot = page.get("/Rotate", 0)
                    if not isinstance(current_rot, int):
                        current_rot = int(current_rot)
                    
                    new_rot = (current_rot + rotation) % 360
                    page.Rotate = new_rot

                pdf.save(str(out_path))

            final_size = out_path.stat().st_size
            msg = "PDF successfully rotated."
            
            return RotatePDFResponse(
                success=True,
                message=msg,
                request_id=request_id,
                filename=out_name,
                download_url=f"/api/pdf/download/{request_id}/{out_name}",
                file_size=final_size,
            )

        except Exception as e:
            logger.exception("Error rotating PDF")
            raise e


