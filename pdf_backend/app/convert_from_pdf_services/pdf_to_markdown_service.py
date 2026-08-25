"""
PDF to Markdown conversion service.
Extracts text from PDF pages using PyMuPDF and formats it as Markdown.
Headings are inferred from font size, bold text is wrapped with **.
"""
import logging
from pathlib import Path
from typing import Any, Dict

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)


class PDFToMarkdownService:
    async def process(self, request_id: str, filename: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"File not found: {filename}")

        logger.info(f"Converting PDF to Markdown: {pdf_path}")

        try:
            doc = fitz.open(str(pdf_path))
            total_pages = len(doc)
            md_parts = []

            for page_num in range(total_pages):
                page = doc[page_num]
                page_md_lines = [f"---\n\n## Page {page_num + 1}\n"]

                blocks = page.get_text("dict")["blocks"]

                # Collect all font sizes to infer heading levels
                all_sizes = []
                for block in blocks:
                    if block.get("type") != 0:
                        continue
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            if span.get("text", "").strip():
                                all_sizes.append(span.get("size", 12))

                max_size = max(all_sizes) if all_sizes else 12
                med_size = sorted(all_sizes)[len(all_sizes) // 2] if all_sizes else 12

                for block in blocks:
                    if block.get("type") != 0:
                        continue
                    for line in block.get("lines", []):
                        line_parts = []
                        for span in line.get("spans", []):
                            text = span.get("text", "").strip()
                            if not text:
                                continue
                            flags = span.get("flags", 0)
                            size = span.get("size", 12)
                            is_bold = bool(flags & 16)
                            is_italic = bool(flags & 2)

                            if is_bold and is_italic:
                                text = f"***{text}***"
                            elif is_bold:
                                text = f"**{text}**"
                            elif is_italic:
                                text = f"*{text}*"

                            line_parts.append(text)

                        if not line_parts:
                            continue

                        full_line = " ".join(line_parts)

                        # Infer heading level from size
                        span0 = line["spans"][0] if line.get("spans") else {}
                        size = span0.get("size", 12)
                        flags = span0.get("flags", 0)
                        if size >= max_size * 0.95 and size > 14:
                            full_line = f"# {full_line}"
                        elif size >= med_size * 1.15 and size > 12:
                            full_line = f"### {full_line}"

                        page_md_lines.append(full_line)

                md_parts.append("\n".join(page_md_lines))

            doc.close()

            full_md = "\n\n".join(md_parts)
            out_name = f"{pdf_path.stem}.md"
            out_path = output_dir / out_name
            out_path.write_text(full_md, encoding="utf-8")

        except Exception as e:
            logger.error(f"PDF to Markdown failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to Markdown: {e}")

        return {
            "success": True,
            "request_id": request_id,
            "output_filename": out_name,
            "total_pages": total_pages,
            "original_filename": filename,
        }


pdf_to_markdown_service = PDFToMarkdownService()
