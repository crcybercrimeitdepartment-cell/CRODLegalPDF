"""
PDF to EPUB conversion service.
Extracts text from each PDF page using PyMuPDF and packages it
as a valid EPUB 3 archive (ZIP-based format).
"""
import logging
import zipfile
import io
from pathlib import Path
from typing import Any, Dict

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)


class PDFToEpubService:
    async def process(self, request_id: str, filename: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"File not found: {filename}")

        logger.info(f"Converting PDF to EPUB: {pdf_path}")

        try:
            doc = fitz.open(str(pdf_path))
            total_pages = len(doc)
            title = pdf_path.stem

            # Collect page HTML content
            pages_html = []
            for page_num in range(total_pages):
                page = doc[page_num]
                page_text = page.get_text("text")
                # Escape HTML special chars
                page_text = (
                    page_text.replace("&", "&amp;")
                             .replace("<", "&lt;")
                             .replace(">", "&gt;")
                )
                # Convert newlines to paragraphs
                paragraphs = [f"<p>{p.strip()}</p>" for p in page_text.split("\n") if p.strip()]
                page_html = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Page {page_num + 1}</title>
  <style>
    body {{ font-family: serif; font-size: 1em; margin: 1em 2em; line-height: 1.6; }}
    p {{ margin: 0.5em 0; }}
    .page-num {{ color: #666; font-size: 0.8em; border-bottom: 1px solid #ccc; margin-bottom: 1em; }}
  </style>
</head>
<body>
  <div class="page-num">Page {page_num + 1} of {total_pages}</div>
  {"".join(paragraphs) if paragraphs else "<p></p>"}
</body>
</html>"""
                pages_html.append((f"page{page_num + 1}.xhtml", page_html))

            doc.close()

            # Build EPUB zip
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as epub:
                # mimetype MUST be first and uncompressed
                epub.writestr(
                    zipfile.ZipInfo("mimetype"),
                    "application/epub+zip",
                    compress_type=zipfile.ZIP_STORED
                )

                # container.xml
                epub.writestr(
                    "META-INF/container.xml",
                    """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>"""
                )

                # content.opf (package document)
                manifest_items = "\n    ".join(
                    f'<item id="page{i+1}" href="page{i+1}.xhtml" media-type="application/xhtml+xml"/>'
                    for i in range(total_pages)
                )
                spine_items = "\n    ".join(
                    f'<itemref idref="page{i+1}"/>'
                    for i in range(total_pages)
                )
                epub.writestr(
                    "EPUB/content.opf",
                    f"""<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">{title}</dc:identifier>
    <dc:title>{title}</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    {manifest_items}
  </manifest>
  <spine toc="ncx">
    {spine_items}
  </spine>
</package>"""
                )

                # toc.ncx
                nav_points = "\n    ".join(
                    f"""<navPoint id="navPoint{i+1}" playOrder="{i+1}">
      <navLabel><text>Page {i+1}</text></navLabel>
      <content src="page{i+1}.xhtml"/>
    </navPoint>"""
                    for i in range(total_pages)
                )
                epub.writestr(
                    "EPUB/toc.ncx",
                    f"""<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="{title}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>{title}</text></docTitle>
  <navMap>
    {nav_points}
  </navMap>
</ncx>"""
                )

                # Page XHTML files
                for page_filename, page_html_content in pages_html:
                    epub.writestr(f"EPUB/{page_filename}", page_html_content)

            out_name = f"{pdf_path.stem}.epub"
            out_path = output_dir / out_name
            out_path.write_bytes(buf.getvalue())

        except Exception as e:
            logger.error(f"PDF to EPUB failed: {e}", exc_info=True)
            raise ValueError(f"Failed to convert PDF to EPUB: {e}")

        return {
            "success": True,
            "request_id": request_id,
            "output_filename": out_name,
            "total_pages": total_pages,
            "original_filename": filename,
        }


pdf_to_epub_service = PDFToEpubService()
