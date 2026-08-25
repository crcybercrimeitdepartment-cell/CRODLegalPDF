"""
PDF to JSON conversion service.
Extracts structured text and metadata from PDF pages as a JSON document.
Includes document metadata, page dimensions, and text blocks with positions.
"""
import json
import logging
from pathlib import Path
from typing import Any, Dict

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)


class PDFToJsonService:
    async def process(self, request_id: str, filename: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"File not found: {filename}")

        logger.info(f"Converting PDF to JSON: {pdf_path}")

        try:
            doc = fitz.open(str(pdf_path))

            # Extract document metadata
            meta = doc.metadata or {}
            document_data = {
                "source_file": pdf_path.name,
                "metadata": {
                    "title": meta.get("title", ""),
                    "author": meta.get("author", ""),
                    "subject": meta.get("subject", ""),
                    "creator": meta.get("creator", ""),
                    "producer": meta.get("producer", ""),
                    "creation_date": meta.get("creationDate", ""),
                    "modification_date": meta.get("modDate", ""),
                },
                "total_pages": len(doc),
                "pages": [],
            }

            for page_num in range(len(doc)):
                page = doc[page_num]
                rect = page.rect
                blocks = page.get_text("blocks")

                text_blocks = []
                for block in blocks:
                    x0, y0, x1, y1, text, block_no, block_type = block
                    if block_type == 0 and text.strip():
                        text_blocks.append({
                            "block_no": block_no,
                            "bbox": {"x0": round(x0, 2), "y0": round(y0, 2), "x1": round(x1, 2), "y1": round(y1, 2)},
                            "text": text.strip(),
                        })

                page_data = {
                    "page_number": page_num + 1,
                    "width": round(rect.width, 2),
                    "height": round(rect.height, 2),
                    "text": page.get_text("text").strip(),
                    "blocks": text_blocks,
                }
                document_data["pages"].append(page_data)

            doc.close()

            out_name = f"{pdf_path.stem}.json"
            out_path = output_dir / out_name
            with open(str(out_path), "w", encoding="utf-8") as f:
                json.dump(document_data, f, ensure_ascii=False, indent=2)

        except Exception as e:
            logger.error(f"PDF to JSON failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to JSON: {e}")

        return {
            "success": True,
            "request_id": request_id,
            "output_filename": out_name,
            "total_pages": document_data["total_pages"],
            "original_filename": filename,
        }


pdf_to_json_service = PDFToJsonService()
