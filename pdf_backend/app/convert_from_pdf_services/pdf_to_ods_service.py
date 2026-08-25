import logging
from pathlib import Path
from typing import Any, Dict
import pdfplumber

from odf.opendocument import OpenDocumentSpreadsheet
from odf.text import P
from odf.table import Table, TableRow, TableCell

from app.core.paths import Paths

logger = logging.getLogger(__name__)

class PDFToOdsService:
    async def process(self, request_id: str, filename: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        if config is None:
            config = {}

        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = upload_dir / filename
        if not pdf_path.exists():
            raise ValueError(f"File not found: {filename}")

        logger.info(f"Converting PDF to ODS: {pdf_path}")

        try:
            ods_doc = OpenDocumentSpreadsheet()
            
            with pdfplumber.open(pdf_path) as pdf:
                for i, page in enumerate(pdf.pages):
                    table = Table(name=f"Page {i+1}")
                    extracted_table = page.extract_table()
                    
                    if extracted_table:
                        for row in extracted_table:
                            tr = TableRow()
                            for cell in row:
                                tc = TableCell(valuetype="string")
                                tc.addElement(P(text=str(cell) if cell else ""))
                                tr.addElement(tc)
                            table.addElement(tr)
                    else:
                        tr = TableRow()
                        tc = TableCell(valuetype="string")
                        tc.addElement(P(text="No table found on this page."))
                        tr.addElement(tc)
                        table.addElement(tr)
                        
                    ods_doc.spreadsheet.addElement(table)

            out_name = f"{pdf_path.stem}.ods"
            out_path = output_dir / out_name
            ods_doc.save(str(out_path))

            return {
                "success": True,
                "request_id": request_id,
                "original_filename": filename,
                "output_filename": out_name,
                "message": "Successfully converted PDF to ODS.",
                "download_url": f"/api/convert-from-pdf/pdf-to-ods/download/{request_id}/{out_name}",
                "view_url": f"/api/convert-from-pdf/pdf-to-ods/view/{request_id}/{out_name}",
            }
        except Exception as e:
            logger.error(f"Failed to convert PDF to ODS: {str(e)}")
            raise

pdf_to_ods_service = PDFToOdsService()
