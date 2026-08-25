"""
PDF to CSV conversion service.
Extracts text blocks from PDF with positional data and writes them as CSV rows.
Columns: page, block_no, x0, y0, x1, y1, text
"""
import csv
import io
import logging
from pathlib import Path
from typing import Any, Dict

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)


class PDFToCsvService:
    async def process(self, request_id: str, filename: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"File not found: {filename}")

        logger.info(f"Converting PDF to CSV: {pdf_path}")

        try:
            doc = fitz.open(str(pdf_path))
            rows = []
            total_pages = len(doc)

            for page_num in range(total_pages):
                page = doc[page_num]
                blocks = page.get_text("blocks")  # returns (x0, y0, x1, y1, text, block_no, block_type)
                for block in blocks:
                    x0, y0, x1, y1, text, block_no, block_type = block
                    if block_type == 0:  # only text blocks (not images)
                        clean_text = text.strip().replace("\n", " ")
                        if clean_text:
                            rows.append({
                                "page": page_num + 1,
                                "block": block_no,
                                "x0": round(x0, 2),
                                "y0": round(y0, 2),
                                "x1": round(x1, 2),
                                "y1": round(y1, 2),
                                "text": clean_text,
                            })

            doc.close()

            out_name = f"{pdf_path.stem}.csv"
            out_path = output_dir / out_name

            with open(str(out_path), "w", newline="", encoding="utf-8-sig") as f:
                fieldnames = ["page", "block", "x0", "y0", "x1", "y1", "text"]
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)

        except Exception as e:
            logger.error(f"PDF to CSV failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to CSV: {e}")

        return {
            "success": True,
            "request_id": request_id,
            "output_filename": out_name,
            "total_pages": total_pages,
            "total_rows": len(rows),
            "original_filename": filename,
        }


pdf_to_csv_service = PDFToCsvService()
