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
        rotations_json: str,
        request_id: str,
    ) -> RotatePDFResponse:
        """
        Apply a specific rotation to each page based on the rotations_json payload.
        """
        import json
        output_dir = Paths.request_output(request_id)
        out_name = output_filename(prefix="rotated")
        out_path = output_dir / out_name
        


        try:
            rotations = json.loads(rotations_json)
        except Exception:
            rotations = {}

        try:
            with Pdf.open(str(input_pdf)) as pdf:
                for i, page in enumerate(pdf.pages):
                    str_i = str(i)
                    if str_i not in rotations and i not in rotations:
                        continue

                    # The desired rotation in degrees (e.g., 90, 180, 270)
                    deg = int(rotations.get(str_i, rotations.get(i, 0)))
                    if deg == 0:
                        continue

                    current_rot = page.get("/Rotate", 0)
                    if not isinstance(current_rot, int):
                        current_rot = int(current_rot)
                    
                    new_rot = (current_rot + deg) % 360
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


