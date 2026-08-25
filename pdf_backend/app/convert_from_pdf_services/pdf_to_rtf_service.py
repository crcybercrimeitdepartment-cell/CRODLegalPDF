"""
PDF to RTF (Rich Text Format) conversion service.
Extracts text and basic formatting from PDF pages using PyMuPDF
and writes a proper RTF document.
"""
import logging
from pathlib import Path
from typing import Any, Dict

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)


class PDFToRtfService:
    async def process(self, request_id: str, filename: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"File not found: {filename}")

        logger.info(f"Converting PDF to RTF: {pdf_path}")

        try:
            doc = fitz.open(str(pdf_path))
            total_pages = len(doc)
            rtf_parts = []

            for page_num in range(total_pages):
                page = doc[page_num]
                blocks = page.get_text("dict")["blocks"]

                rtf_parts.append(
                    r"{\pard\sb240\sa120\b\fs28 "
                    + f"Page {page_num + 1}"
                    + r"\b0\fs24\par}"
                )

                for block in blocks:
                    if block.get("type") != 0:
                        continue
                    for line in block.get("lines", []):
                        line_text_parts = []
                        for span in line.get("spans", []):
                            raw = span.get("text", "").strip()
                            if not raw:
                                continue
                            # Escape RTF special chars
                            raw = raw.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")
                            # Encode non-ASCII as RTF unicode escapes
                            encoded = ""
                            for ch in raw:
                                if ord(ch) > 127:
                                    encoded += f"\\u{ord(ch)}?"
                                else:
                                    encoded += ch

                            flags = span.get("flags", 0)
                            is_bold = bool(flags & 16)
                            is_italic = bool(flags & 2)

                            chunk = encoded
                            if is_bold:
                                chunk = r"\b " + chunk + r"\b0 "
                            if is_italic:
                                chunk = r"\i " + chunk + r"\i0 "
                            line_text_parts.append(chunk)

                        if line_text_parts:
                            line_rtf = " ".join(line_text_parts)
                            rtf_parts.append(r"{\pard\sa60 " + line_rtf + r"\par}")

                if page_num < total_pages - 1:
                    rtf_parts.append(r"{\pard\page\par}")

            doc.close()

            rtf_body = "\n".join(rtf_parts)
            full_rtf = (
                r"{\rtf1\ansi\deff0"
                r"{\fonttbl{\f0\froman\fcharset0 Times New Roman;}{\f1\fswiss\fcharset0 Arial;}}"
                r"{\colortbl;\red0\green0\blue0;}"
                r"\deflang1033\widowctrl\hyphauto"
                r"\f1\fs24 "
                + rtf_body
                + r"}"
            )

            out_name = f"{pdf_path.stem}.rtf"
            out_path = output_dir / out_name
            out_path.write_text(full_rtf, encoding="utf-8")

        except Exception as e:
            logger.error(f"PDF to RTF failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to RTF: {e}")

        return {
            "success": True,
            "request_id": request_id,
            "output_filename": out_name,
            "total_pages": total_pages,
            "original_filename": filename,
        }


pdf_to_rtf_service = PDFToRtfService()
