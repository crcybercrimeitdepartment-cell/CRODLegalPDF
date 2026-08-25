"""
Text to PDF conversion service.
Supports rich text HTML, pagination, headers, footers, margins, metadata, and security.
"""

from __future__ import annotations

import io
import logging
from pathlib import Path
from typing import Dict, Any, Tuple

import fitz

from app.core.paths import Paths
from app.Convert_to_pdf_services.jpg_to_pdf_service import (
    _resolve_page_size,
    _resolve_margins
)

logger = logging.getLogger(__name__)

class TextToPdfService:
    
    async def process(
        self,
        upload_dir: Path,
        html_content: str,
        page_size: str,
        orientation: str,
        margin_preset: str,
        custom_margin_top: str,
        custom_margin_right: str,
        custom_margin_bottom: str,
        custom_margin_left: str,
        custom_page_width: str,
        custom_page_height: str,
        custom_page_unit: str,
        bg_color: str,
        border_width: int,
        border_style: str,
        header_text: str,
        footer_text: str,
        header_align: str,
        footer_align: str,
        page_numbers: bool,
        skip_first_page: bool,
        title: str,
        author: str,
        subject: str,
        keywords: str,
        password: str,
        output_filename: str
    ) -> Path:
        """Process HTML text content into a fully formatted PDF."""
        
        # We need default w, h if original is requested, but for text there is no original.
        # Fallback to A4 if 'original' is somehow passed.
        if page_size == "original":
            page_size = "a4"
            
        w_pt, h_pt = _resolve_page_size(
            page_size, orientation,
            custom_page_width, custom_page_height, custom_page_unit,
            800, 800, 96
        )

        mt, mr, mb, ml = _resolve_margins(
            margin_preset, custom_margin_top, custom_margin_right,
            custom_margin_bottom, custom_margin_left
        )

        # Build full HTML with page background and border
        border_css = ""
        if border_width > 0:
            border_css = f"border: {border_width}px {border_style} #000;"
            
        full_html = f"""
        <html>
        <head>
        <meta charset="utf-8">
        <style>
            body {{
                margin: 0;
                padding: {mt}pt {mr}pt {mb}pt {ml}pt;
                background-color: {bg_color};
                {border_css}
                box-sizing: border-box;
                font-family: Arial, Helvetica, sans-serif;
                min-height: 100vh;
                word-wrap: break-word;
            }}
            table {{ border-collapse: collapse; width: 100%; }}
            th, td {{ border: 1px solid #cbd5e1; padding: 8px; }}
            pre, code {{ font-family: monospace; white-space: pre-wrap; }}
        </style>
        </head>
        <body>
        {html_content}
        </body>
        </html>
        """

        # 1. Generate layout via PyMuPDF HTML engine
        html_doc = fitz.Document(stream=full_html.encode('utf-8'), filetype='html')
        # Apply strict layout size.
        html_doc.layout(rect=fitz.Rect(0, 0, w_pt, h_pt), fontsize=12)
        
        # Extract the structured PDF bytes
        raw_pdf_bytes = html_doc.convert_to_pdf()
        html_doc.close()

        # 2. Open the laid-out PDF to apply headers, footers, metadata, security
        doc = fitz.Document(stream=raw_pdf_bytes, filetype="pdf")
        
        num_pages = len(doc)
        
        for i in range(num_pages):
            page = doc[i]
            is_first_page = (i == 0)
            
            # Skip header/footer on first page if requested
            if skip_first_page and is_first_page:
                continue

            font_size = 10
            margin_offset = 20 # points from edge
            
            def draw_text(text: str, align: str, y_pos: float):
                if not text:
                    return
                tw = fitz.get_text_length(text, fontname="helv", fontsize=font_size)
                if align == "left":
                    x = ml if ml > margin_offset else margin_offset
                elif align == "right":
                    right_edge = w_pt - mr if mr > margin_offset else w_pt - margin_offset
                    x = right_edge - tw
                else: # center
                    x = (w_pt - tw) / 2
                
                # Protect bounds
                x = max(margin_offset, min(x, w_pt - margin_offset - tw))
                page.insert_text((x, y_pos), text, fontname="helv", fontsize=font_size, color=(0.4, 0.4, 0.4))

            # Header
            if header_text:
                draw_text(header_text, header_align, margin_offset + 10)
                
            # Footer & Page Numbers
            footer_str = footer_text
            if page_numbers:
                if footer_str:
                    footer_str += f" - {i + 1}"
                else:
                    footer_str = str(i + 1)
            
            if footer_str:
                draw_text(footer_str, footer_align, h_pt - margin_offset)

        # 3. Apply Metadata
        meta = doc.metadata
        if title: meta["title"] = title
        if author: meta["author"] = author
        if subject: meta["subject"] = subject
        if keywords: meta["keywords"] = keywords
        doc.set_metadata(meta)

        # 4. Save and Apply Security
        out_filename = output_filename if output_filename.lower().endswith(".pdf") else f"{output_filename}.pdf"
        out_pdf_path = upload_dir / out_filename

        save_args = {
            "garbage": 3,
            "deflate": True,
        }
        
        if password:
            save_args["encryption"] = fitz.PDF_ENCRYPT_AES_256
            save_args["user_pw"] = password
            save_args["owner_pw"] = password
            
        doc.save(out_pdf_path, **save_args)
        doc.close()
        
        return out_pdf_path

text_to_pdf_service = TextToPdfService()
