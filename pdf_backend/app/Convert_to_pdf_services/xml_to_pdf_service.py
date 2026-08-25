import os
import re
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from lxml import etree

from xhtml2pdf import pisa
from app.core.paths import Paths

logger = logging.getLogger(__name__)

class XmlToPdfService:
    def __init__(self):
        # Configure lxml XMLParser for extreme security
        # resolve_entities=False prevents XXE attacks
        # no_network=True prevents external DTD/schema fetching
        self.parser = etree.XMLParser(
            resolve_entities=False,
            no_network=True,
            recover=False,
            remove_comments=True
        )

    def validate_xml_file(self, path: Path) -> None:
        """Validate that the file is XML and safe."""
        if not path.exists():
            raise ValueError(f"File not found: {path.name}")
        if path.stat().st_size == 0:
            raise ValueError(f"File '{path.name}' is empty.")
            
        if path.stat().st_size > 50 * 1024 * 1024:
            raise ValueError(f"File '{path.name}' exceeds the 50 MB size limit.")
            
        ext = path.suffix.lower()
        if ext not in [".xml"]:
            raise ValueError(f"File '{path.name}' has an unsupported extension. Only .xml is allowed.")
            
    def _parse_xml_safely(self, path: Path) -> etree._Element:
        """Parse XML and gracefully handle syntax errors."""
        try:
            tree = etree.parse(str(path), parser=self.parser)
            return tree.getroot()
        except etree.XMLSyntaxError as e:
            # Provide exact line and column
            line, col = e.position
            raise ValueError(f"Invalid XML structure. {e.msg} at line {line}, column {col}.")
        except Exception as e:
            raise ValueError(f"Failed to parse XML: {str(e)}")

    def _is_table_structure(self, root: etree._Element) -> bool:
        """Detect if the XML represents a tabular dataset."""
        children = list(root)
        if not children:
            return False
            
        # Must have more than 1 child to be a meaningful table, though 1 is technically possible
        first_tag = children[0].tag
        for child in children:
            # If siblings have different tags, it's not a simple flat table
            if child.tag != first_tag:
                return False
            # If a row has sub-children with their own sub-children, it's too nested for a simple table
            for subchild in child:
                if len(list(subchild)) > 0:
                    return False
        return True

    def _render_table(self, root: etree._Element) -> str:
        """Render flat XML records into an HTML table."""
        children = list(root)
        if not children:
            return ""
            
        # Collect all possible column headers from children
        columns = []
        for child in children:
            for subchild in child:
                if subchild.tag not in columns:
                    columns.append(subchild.tag)
            # Also collect attributes of the child itself as columns
            for attr in child.attrib:
                attr_col = f"@{attr}"
                if attr_col not in columns:
                    columns.append(attr_col)
                    
        html = ["<table class='xml-table'>", "<thead><tr>"]
        for col in columns:
            col_name = col.lstrip('@').replace('_', ' ').title()
            html.append(f"<th>{col_name}</th>")
        html.append("</tr></thead><tbody>")
        
        for child in children:
            html.append("<tr>")
            for col in columns:
                if col.startswith("@"):
                    val = child.attrib.get(col[1:], "")
                else:
                    found = child.find(col)
                    val = found.text.strip() if found is not None and found.text else ""
                html.append(f"<td>{val}</td>")
            html.append("</tr>")
            
        html.append("</tbody></table>")
        return "".join(html)

    def _render_structured(self, node: etree._Element, level: int = 1) -> str:
        """Recursively render nested XML into structured HTML headings and paragraphs."""
        html = []
        
        # Heading for the current node
        tag_name = node.tag.replace('_', ' ').title()
        if level <= 6:
            html.append(f"<h{level}>{tag_name}</h{level}>")
        else:
            html.append(f"<div class='deep-heading'>{tag_name}</div>")
            
        # Render Attributes
        if node.attrib:
            html.append("<div class='attributes'>")
            for k, v in node.attrib.items():
                html.append(f"<div class='attr-item'><span class='attr-key'>{k}:</span> <span class='attr-val'>{v}</span></div>")
            html.append("</div>")
            
        # Text content
        text_content = node.text.strip() if node.text else ""
        if text_content:
            html.append(f"<p class='node-text'>{text_content}</p>")
            
        # Render children
        children = list(node)
        if children:
            html.append("<div class='children'>")
            for child in children:
                # If child has no sub-children and no attributes, render as key/value
                if len(list(child)) == 0 and not child.attrib:
                    child_tag = child.tag.replace('_', ' ').title()
                    child_text = child.text.strip() if child.text else ""
                    html.append(f"<div class='kv-pair'><span class='kv-key'>{child_tag}:</span> <span class='kv-val'>{child_text}</span></div>")
                else:
                    html.append(self._render_structured(child, level + 1))
            html.append("</div>")
            
        return "".join(html)

    def _render_raw(self, root: etree._Element) -> str:
        """Render pretty-printed raw XML source."""
        raw_bytes = etree.tostring(root, pretty_print=True, encoding='utf-8')
        raw_str = raw_bytes.decode('utf-8')
        import html
        escaped = html.escape(raw_str)
        return f"<pre class='raw-xml'><code>{escaped}</code></pre>"

    def _build_css(self, config: Dict[str, Any]) -> str:
        """Build CSS incorporating Page Setup and PDF constraints."""
        font_size = config.get("font_size", "11pt")
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
            
        header_text = config.get("header_text", "")
        footer_text = config.get("footer_text", "")
        
        top_margin = "3cm" if header_text else margin
        bottom_margin = "3cm" if footer_text else margin

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

        return f"""
        @page {{
            size: {page_size};
            margin-top: {top_margin};
            margin-bottom: {bottom_margin};
            margin-left: {margin};
            margin-right: {margin};
            {frame_css}
        }}
        
        body {{
            font-family: "Helvetica", "Arial", sans-serif;
            font-size: {font_size};
            color: #333;
            line-height: 1.5;
        }}
        
        h1, h2, h3, h4, h5, h6 {{
            color: #1a365d;
            margin-top: 1.2em;
            margin-bottom: 0.5em;
            font-weight: bold;
        }}
        h1 {{ font-size: 1.8em; border-bottom: 2px solid #edf2f7; padding-bottom: 5px; }}
        h2 {{ font-size: 1.5em; border-bottom: 1px solid #edf2f7; padding-bottom: 4px; }}
        h3 {{ font-size: 1.2em; }}
        
        /* Table Styles */
        .xml-table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            -pdf-keep-with-next: false;
        }}
        .xml-table th, .xml-table td {{
            border: 1px solid #cbd5e1;
            padding: 8px;
            word-wrap: break-word;
        }}
        .xml-table th {{
            background-color: #f1f5f9;
            font-weight: bold;
            color: #0f172a;
            text-align: left;
        }}
        .xml-table tr:nth-child(even) {{
            background-color: #f8fafc;
        }}
        
        /* Structured Styles */
        .children {{
            margin-left: 20px;
            border-left: 2px solid #e2e8f0;
            padding-left: 15px;
            margin-bottom: 15px;
        }}
        .kv-pair {{
            margin-bottom: 6px;
        }}
        .kv-key {{
            font-weight: bold;
            color: #475569;
        }}
        .kv-val {{
            color: #0f172a;
        }}
        .attributes {{
            background-color: #f8fafc;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 10px;
            border: 1px dashed #cbd5e1;
        }}
        .attr-item {{ display: inline-block; margin-right: 15px; }}
        .attr-key {{ font-weight: bold; color: #2563eb; font-size: 0.9em; }}
        .attr-val {{ font-size: 0.9em; }}
        
        /* Raw XML Styles */
        .raw-xml {{
            background-color: #1e293b;
            color: #f8fafc;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 0.85em;
            white-space: pre-wrap;
            word-wrap: break-word;
        }}
        """

    def _build_html_envelope(self, content_html: str, css: str, config: Dict[str, Any]) -> str:
        header_text = config.get("header_text", "")
        footer_text = config.get("footer_text", "")
        
        header_div = ""
        if header_text:
            import html
            header_div = f'<div id="header_content" style="text-align: right; font-size: 9pt; color: #777;">{html.escape(header_text)}</div>'
            
        footer_div = ""
        if footer_text:
            import html
            footer_div = f'<div id="footer_content" style="text-align: center; font-size: 9pt; color: #777;">{html.escape(footer_text)} - Page <pdf:pagenumber></div>'

        return f"""
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
            {content_html}
        </body>
        </html>
        """

    def _fetch_resources_securely(self, uri: str, rel: str, upload_dir: Path) -> str:
        """Strictly block external entities/images and path traversal in xhtml2pdf."""
        if uri.startswith("http://") or uri.startswith("https://"):
            logger.warning(f"Blocked external XML resource: {uri}")
            return ""

        safe_path = Path(uri).name
        resolved_path = upload_dir / safe_path
        
        if resolved_path.exists():
            return str(resolved_path)
            
        return ""

    async def process(
        self,
        request_id: str,
        files_config: List[Dict[str, Any]],
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Convert uploaded XML documents to PDF securely."""
        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        pdf_title = config.get("pdf_title", "")
        pdf_author = config.get("pdf_author", "")
        pdf_subject = config.get("pdf_subject", "")
        
        results = []
        css = self._build_css(config)
        
        view_mode = config.get("view_mode", "auto") # auto, raw, structured
        
        for f_conf in files_config:
            filename = f_conf["filename"]
            input_path = upload_dir / filename
            
            try:
                self.validate_xml_file(input_path)
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
                # 1. Safely Parse XML
                root = self._parse_xml_safely(input_path)
                
                # 2. Render Structure
                if view_mode == "raw":
                    html_snippet = self._render_raw(root)
                elif view_mode == "auto" and self._is_table_structure(root):
                    html_snippet = self._render_table(root)
                else:
                    html_snippet = self._render_structured(root)
                    
                # 3. Wrap in Document
                full_html = self._build_html_envelope(html_snippet, css, config)
                
                # 4. Generate PDF Securely
                def safe_fetch(uri, rel):
                    return self._fetch_resources_securely(uri, rel, upload_dir)
                    
                with open(output_path, "wb") as out_f:
                    pisa_status = pisa.CreatePDF(
                        src=full_html,
                        dest=out_f,
                        link_callback=safe_fetch,
                        encoding="utf-8"
                    )
                    
                if pisa_status.err:
                    raise Exception("PDF rendering engine returned an error during generation.")
                    
                # 5. Apply Metadata
                if output_path.exists() and any([pdf_title, pdf_author, pdf_subject]):
                    try:
                        import pikepdf
                        with pikepdf.open(output_path, allow_overwriting_input=True) as pdf:
                            with pdf.open_metadata() as meta:
                                if pdf_title:    meta["dc:title"]       = pdf_title
                                if pdf_author:   meta["dc:creator"]     = pdf_author
                                if pdf_subject:  meta["dc:description"] = pdf_subject
                                meta["pdf:Producer"] = "PDF Tools (XML to PDF)"
                            pdf.save(output_path)
                    except Exception as pe:
                        logger.warning(f"pikepdf post-processing failed for {output_filename}: {pe}")
                        
                results.append({
                    "original": filename,
                    "pdf_filename": output_filename,
                    "status": "success"
                })
                
            except Exception as e:
                logger.error(f"Error converting XML {filename}: {str(e)}")
                results.append({
                    "original": filename,
                    "status": "error",
                    "message": f"{str(e)}"
                })

        return {
            "success": True,
            "request_id": request_id,
            "results": results
        }

xml_to_pdf_service = XmlToPdfService()
