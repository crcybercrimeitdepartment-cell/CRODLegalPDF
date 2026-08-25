import os
import re
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

import markdown
from pygments.formatters import HtmlFormatter
from xhtml2pdf import pisa

from app.core.paths import Paths

logger = logging.getLogger(__name__)

class MarkdownToPdfService:
    def __init__(self):
        # We configure markdown with the most robust extensions
        self.md_extensions = [
            'tables',          # Support tables
            'fenced_code',     # Code blocks ```
            'codehilite',      # Pygments syntax highlighting
            'toc',             # Table of Contents [TOC]
            'sane_lists',      # Better list handling
            'nl2br',           # Newline to break
            'def_list',        # Definition lists
            'footnotes'        # Footnotes
        ]

    def validate_md_file(self, path: Path) -> None:
        """Validate that the file is an MD and safe."""
        if not path.exists():
            raise ValueError(f"File not found: {path.name}")
        if path.stat().st_size == 0:
            raise ValueError(f"File '{path.name}' is empty.")
        
        # Markdown files shouldn't be massive, 50MB is extremely large for pure text
        if path.stat().st_size > 50 * 1024 * 1024:
            raise ValueError(f"File '{path.name}' exceeds the 50 MB size limit.")
            
        ext = path.suffix.lower()
        if ext not in [".md", ".markdown"]:
            raise ValueError(f"File '{path.name}' has an unsupported extension. Only .md and .markdown are allowed.")

    def _fetch_resources_securely(self, uri: str, rel: str, upload_dir: Path) -> str:
        """
        Callback for xhtml2pdf to securely fetch resources (like images).
        Prevents path traversal and external URL fetching.
        """
        # Block external resources entirely
        if uri.startswith("http://") or uri.startswith("https://"):
            logger.warning(f"Blocked external resource: {uri}")
            return ""

        # Remove query params or anchors if any
        uri = uri.split('?')[0].split('#')[0]

        # Resolve local paths safely to the upload directory
        # The user might do ![img](img.png) or ![img](./img.png)
        # We strip leading slashes or relative traversals safely
        safe_path = Path(uri).name
        resolved_path = upload_dir / safe_path
        
        if resolved_path.exists():
            return str(resolved_path)
            
        return ""

    def _build_css(self, config: Dict[str, Any]) -> str:
        """Build CSS incorporating Page Setup, Theme, Pygments, and Header/Footer frames."""
        # 1. Base Styles & Themes
        theme = config.get("theme", "default").lower()
        
        # Default Typography
        font_family = "Helvetica, Arial, sans-serif"
        font_size = "11pt"
        h1_color = "#2c3e50"
        h2_color = "#34495e"
        link_color = "#2980b9"
        code_bg = "#f8f9fa"
        
        if theme == "github":
            font_family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
            font_size = "10.5pt"
            h1_color = "#24292e"
            h2_color = "#24292e"
            link_color = "#0366d6"
            code_bg = "#f6f8fa"
        elif theme == "academic":
            font_family = "'Times New Roman', Times, serif"
            font_size = "12pt"
            h1_color = "#000000"
            h2_color = "#000000"
            link_color = "#0000ee"
            code_bg = "#f5f5f5"
        elif theme == "professional":
            font_family = "Georgia, serif"
            font_size = "11pt"
            h1_color = "#1a365d"
            h2_color = "#2a4365"
            link_color = "#3182ce"
            code_bg = "#edf2f7"
        elif theme == "minimal":
            font_family = "sans-serif"
            font_size = "10pt"
            h1_color = "#333333"
            h2_color = "#333333"
            link_color = "#333333"
            code_bg = "#fafafa"

        # 2. Pygments Syntax Highlighting CSS
        formatter = HtmlFormatter(style='default')
        pygments_css = formatter.get_style_defs('.codehilite')

        # 3. Page Setup
        page_size = config.get("page_size", "a4").upper()
        orientation = config.get("orientation", "portrait").lower()
        if orientation == "landscape":
            page_size = f"{page_size} landscape"
            
        margin_preset = config.get("margin_preset", "normal").lower()
        if margin_preset == "small":
            margin = "1cm"
        elif margin_preset == "large":
            margin = "3cm"
        else:
            margin = "2cm"
            
        # Top margin needs space for header, bottom for footer
        header_text = config.get("header_text", "")
        footer_text = config.get("footer_text", "")
        
        top_margin = "3cm" if header_text else margin
        bottom_margin = "3cm" if footer_text else margin

        # Build Frame CSS for Header and Footer
        frame_css = ""
        if header_text:
            frame_css += f"""
            @frame header {{
                -pdf-frame-content: header_content;
                top: 1cm;
                margin-left: {margin};
                margin-right: {margin};
                height: 1cm;
            }}
            """
        if footer_text:
            frame_css += f"""
            @frame footer {{
                -pdf-frame-content: footer_content;
                bottom: 1cm;
                margin-left: {margin};
                margin-right: {margin};
                height: 1cm;
            }}
            """

        page_css = f"""
        @page {{
            size: {page_size};
            margin-top: {top_margin};
            margin-bottom: {bottom_margin};
            margin-left: {margin};
            margin-right: {margin};
            {frame_css}
        }}
        """

        # Combine all CSS
        full_css = f"""
        {page_css}
        
        body {{
            font-family: {font_family};
            font-size: {font_size};
            color: #333;
            line-height: 1.5;
        }}
        h1, h2, h3, h4, h5, h6 {{
            font-weight: bold;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }}
        h1 {{ color: {h1_color}; font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }}
        h2 {{ color: {h2_color}; font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }}
        h3 {{ font-size: 1.25em; }}
        h4 {{ font-size: 1em; }}
        a {{ color: {link_color}; text-decoration: none; }}
        p, ul, ol, blockquote, table {{ margin-bottom: 1em; }}
        li {{ margin-bottom: 0.25em; }}
        blockquote {{
            border-left: 4px solid #dfe2e5;
            padding-left: 1em;
            color: #6a737d;
            margin-left: 0;
        }}
        hr {{ border: 0; border-bottom: 1px solid #eaecef; margin: 2em 0; }}
        img {{ max-width: 100%; }}
        
        /* Tables */
        table {{
            border-collapse: collapse;
            width: 100%;
        }}
        th, td {{
            border: 1px solid #dfe2e5;
            padding: 6px 13px;
        }}
        th {{
            font-weight: bold;
            background-color: #f6f8fa;
        }}
        tr:nth-child(even) {{
            background-color: #f8f9fa;
        }}
        
        /* Inline Code */
        code {{
            background-color: rgba(27,31,35,0.05);
            border-radius: 3px;
            font-family: monospace;
            padding: 0.2em 0.4em;
            font-size: 0.9em;
        }}
        
        /* Fenced Code Blocks */
        pre {{
            background-color: {code_bg};
            padding: 16px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 0.9em;
            white-space: pre-wrap;
            word-wrap: break-word;
        }}
        pre code {{
            background-color: transparent;
            padding: 0;
        }}
        
        {pygments_css}
        """
        
        return full_css

    def _build_html_envelope(self, content_html: str, css: str, config: Dict[str, Any]) -> str:
        """Wrap the Markdown HTML in a full HTML document with CSS and header/footer divs."""
        
        header_text = config.get("header_text", "")
        footer_text = config.get("footer_text", "")
        
        header_div = ""
        if header_text:
            header_div = f'<div id="header_content" style="text-align: right; font-size: 9pt; color: #777;">{header_text}</div>'
            
        footer_div = ""
        if footer_text:
            # pdf:pagenumber is supported by xhtml2pdf
            # Check if user wanted page numbers or just text
            footer_div = f'<div id="footer_content" style="text-align: center; font-size: 9pt; color: #777;">{footer_text} - Page <pdf:pagenumber></div>'

        # If user wanted TOC
        toc_html = ""
        if config.get("enable_toc", False):
            toc_html = "<h1>Table of Contents</h1>\n<pdf:toc />\n<pdf:nextpage />"

        envelope = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                {css}
            </style>
        </head>
        <body>
            {header_div}
            {footer_div}
            {toc_html}
            {content_html}
        </body>
        </html>
        """
        return envelope

    async def process(
        self,
        request_id: str,
        files_config: List[Dict[str, Any]],
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Convert uploaded MD documents to PDF securely."""
        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        pdf_title = config.get("pdf_title", "")
        pdf_author = config.get("pdf_author", "")
        pdf_subject = config.get("pdf_subject", "")
        pdf_keywords = config.get("pdf_keywords", "")
        
        results = []
        
        md = markdown.Markdown(extensions=self.md_extensions)
        css = self._build_css(config)
        
        for f_conf in files_config:
            filename = f_conf["filename"]
            input_path = upload_dir / filename
            
            try:
                self.validate_md_file(input_path)
            except ValueError as ve:
                results.append({
                    "original": filename,
                    "status": "error",
                    "message": str(ve)
                })
                continue
            
            output_filename = f"{input_path.stem}.pdf"
            output_path = output_dir / output_filename
            
            try:
                # 1. Read Markdown
                md_text = input_path.read_text(encoding='utf-8')
                
                # 2. Convert to HTML snippet
                md.reset()
                html_snippet = md.convert(md_text)
                
                # 3. Wrap in full document
                full_html = self._build_html_envelope(html_snippet, css, config)
                
                # 4. Generate PDF securely with xhtml2pdf
                def safe_fetch(uri, rel):
                    return self._fetch_resources_securely(uri, rel, upload_dir)
                    
                with open(output_path, "wb") as out_f:
                    pisa_status = pisa.CreatePDF(
                        src=full_html,
                        dest=out_f,
                        link_callback=safe_fetch
                    )
                    
                if pisa_status.err:
                    raise Exception("PDF rendering engine returned an error during generation.")
                    
                # 5. Apply Metadata via pikepdf
                if output_path.exists() and any([pdf_title, pdf_author, pdf_subject, pdf_keywords]):
                    try:
                        import pikepdf
                        with pikepdf.open(output_path, allow_overwriting_input=True) as pdf:
                            with pdf.open_metadata() as meta:
                                if pdf_title:    meta["dc:title"]       = pdf_title
                                if pdf_author:   meta["dc:creator"]     = pdf_author
                                if pdf_subject:  meta["dc:description"] = pdf_subject
                                if pdf_keywords: meta["pdf:Keywords"]   = pdf_keywords
                                meta["pdf:Producer"] = "PDF Tools (Markdown to PDF)"
                            pdf.save(output_path)
                    except Exception as pe:
                        logger.warning(f"pikepdf post-processing failed for {output_filename}: {pe}")
                        
                results.append({
                    "original": filename,
                    "pdf_filename": output_filename,
                    "status": "success"
                })
                
            except Exception as e:
                logger.error(f"Error converting {filename}: {str(e)}")
                results.append({
                    "original": filename,
                    "status": "error",
                    "message": f"Failed to render Markdown to PDF: {str(e)}"
                })

        return {
            "success": True,
            "request_id": request_id,
            "results": results
        }

# Singleton instance
markdown_to_pdf_service = MarkdownToPdfService()
