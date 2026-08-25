import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

try:
    import win32com.client
    import pythoncom
except ImportError:
    win32com = None
    pythoncom = None

from app.core.paths import Paths

logger = logging.getLogger(__name__)

class ExcelToPdfService:
    def __init__(self):
        pass

    async def analyze(self, request_id: str, filename: str) -> Dict[str, Any]:
        """
        Open the uploaded Excel file and extract the sheet names.
        """
        if pythoncom is None or win32com is None:
            raise ValueError("Excel conversion is only available on a Windows server with Microsoft Excel installed.")
        pythoncom.CoInitialize()
        excel = None
        wb = None
        try:
            upload_dir = Paths.request_upload(request_id)
            input_path = upload_dir / filename
            
            if not input_path.exists():
                raise ValueError("File not found.")
                
            excel = win32com.client.DispatchEx("Excel.Application")
            excel.Visible = False
            excel.DisplayAlerts = False
            
            wb = excel.Workbooks.Open(str(input_path.resolve()), ReadOnly=True)
            sheets = [sheet.Name for sheet in wb.Sheets]
            
            return {
                "filename": filename,
                "sheets": sheets
            }
        except Exception as e:
            logger.error(f"Failed to analyze Excel file {filename}: {str(e)}")
            raise ValueError(f"Failed to read Excel file: {str(e)}")
        finally:
            if wb:
                try:
                    wb.Close(False)
                except:
                    pass
            if excel:
                try:
                    excel.Quit()
                except:
                    pass
            pythoncom.CoUninitialize()

    async def process(self, request_id: str, filenames: List[str], config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert Excel files to PDF using native COM with specific settings.
        """
        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        results = []

        if pythoncom is None or win32com is None:
            return {
                "success": False,
                "request_id": request_id,
                "results": [{"status": "failed", "message": "Excel conversion is only available on a Windows server with Microsoft Excel installed."}]
            }
        
        pythoncom.CoInitialize()
        excel = None
        try:
            excel = win32com.client.DispatchEx("Excel.Application")
            excel.Visible = False
            excel.DisplayAlerts = False
            
            for filename in filenames:
                input_path = upload_dir / filename
                if not input_path.exists():
                    results.append({"original_filename": filename, "status": "failed", "message": "File not found"})
                    continue
                
                wb = None
                try:
                    wb = excel.Workbooks.Open(str(input_path.resolve()), ReadOnly=True)
                    
                    selected_sheets = config.get("selected_sheets", [])
                    if not selected_sheets:
                        selected_sheets = [sheet.Name for sheet in wb.Sheets]
                        
                    # Select the sheets in an array to print them together
                    wb.Sheets(selected_sheets).Select()
                    
                    # Apply settings to each selected sheet
                    for sheet_name in selected_sheets:
                        ws = wb.Sheets(sheet_name)
                        ps = ws.PageSetup
                        
                        # Print Range
                        print_range = config.get("print_range")
                        if print_range:
                            ps.PrintArea = print_range
                            
                        # Orientation
                        orientation = config.get("orientation", "portrait")
                        if orientation.lower() == "landscape":
                            ps.Orientation = 2 # xlLandscape
                        else:
                            ps.Orientation = 1 # xlPortrait
                            
                        # Page Size
                        paper_size_map = {
                            "a4": 9, "a3": 8, "a5": 11, "letter": 1, "legal": 5
                        }
                        ps.PaperSize = paper_size_map.get(config.get("page_size", "a4").lower(), 9)
                        
                        # Margins
                        margins = config.get("margins", "normal")
                        if margins == "narrow":
                            ps.TopMargin = excel.InchesToPoints(0.75)
                            ps.BottomMargin = excel.InchesToPoints(0.75)
                            ps.LeftMargin = excel.InchesToPoints(0.25)
                            ps.RightMargin = excel.InchesToPoints(0.25)
                        elif margins == "wide":
                            ps.TopMargin = excel.InchesToPoints(1.0)
                            ps.BottomMargin = excel.InchesToPoints(1.0)
                            ps.LeftMargin = excel.InchesToPoints(1.0)
                            ps.RightMargin = excel.InchesToPoints(1.0)
                        elif margins == "custom":
                            ps.TopMargin = excel.InchesToPoints(float(config.get("margin_top", 0.75)))
                            ps.BottomMargin = excel.InchesToPoints(float(config.get("margin_bottom", 0.75)))
                            ps.LeftMargin = excel.InchesToPoints(float(config.get("margin_left", 0.7)))
                            ps.RightMargin = excel.InchesToPoints(float(config.get("margin_right", 0.7)))
                            
                        # Scaling
                        scaling_mode = config.get("scaling_mode", "automatic")
                        if scaling_mode == "fit_width":
                            ps.Zoom = False
                            ps.FitToPagesWide = 1
                            ps.FitToPagesTall = False
                        elif scaling_mode == "fit_height":
                            ps.Zoom = False
                            ps.FitToPagesWide = False
                            ps.FitToPagesTall = 1
                        elif scaling_mode == "fit_all":
                            ps.Zoom = False
                            ps.FitToPagesWide = 1
                            ps.FitToPagesTall = 1
                        elif scaling_mode == "custom":
                            ps.Zoom = int(config.get("scale_percentage", 100))
                        else:
                            ps.Zoom = False
                            ps.FitToPagesWide = False
                            ps.FitToPagesTall = False
                            
                        # Gridlines and Headings
                        ps.PrintGridlines = config.get("gridlines", False)
                        ps.PrintHeadings = config.get("headings", False)
                        
                        # Repeat Rows/Columns
                        repeat_rows = config.get("repeat_rows")
                        if repeat_rows:
                            ps.PrintTitleRows = repeat_rows
                        repeat_columns = config.get("repeat_columns")
                        if repeat_columns:
                            ps.PrintTitleColumns = repeat_columns
                            
                        # Headers and Footers
                        def parse_hf(text):
                            if not text: return ""
                            return text.replace("{page}", "&P").replace("{pages}", "&N").replace("{date}", "&D").replace("{sheet}", "&A").replace("{file}", "&F")
                            
                        ps.LeftHeader = parse_hf(config.get("header_left", ""))
                        ps.CenterHeader = parse_hf(config.get("header_center", ""))
                        ps.RightHeader = parse_hf(config.get("header_right", ""))
                        ps.LeftFooter = parse_hf(config.get("footer_left", ""))
                        ps.CenterFooter = parse_hf(config.get("footer_center", ""))
                        ps.RightFooter = parse_hf(config.get("footer_right", ""))

                    custom_name = config.get("output_filename")
                    if custom_name and len(filenames) == 1:
                        if not custom_name.lower().endswith(".pdf"):
                            custom_name += ".pdf"
                        output_filename = custom_name
                    else:
                        output_filename = f"{input_path.stem}.pdf"
                        
                    output_path = output_dir / output_filename
                    
                    # 0 = xlTypePDF
                    wb.ActiveSheet.ExportAsFixedFormat(0, str(output_path.resolve()), IgnorePrintAreas=False)
                    
                    if output_path.exists():
                        results.append({
                            "original_filename": filename,
                            "pdf_filename": output_filename,
                            "status": "success"
                        })
                    else:
                        results.append({"original_filename": filename, "status": "failed", "message": "PDF not generated"})
                        
                except Exception as e:
                    logger.error(f"Error processing {filename}: {str(e)}")
                    results.append({"original_filename": filename, "status": "failed", "message": str(e)})
                finally:
                    if wb:
                        try:
                            wb.Close(False)
                        except:
                            pass
        except Exception as e:
            logger.error(f"Failed to start Excel COM: {str(e)}")
            results.append({"status": "failed", "message": "Could not initialize Excel engine."})
        finally:
            if excel:
                try:
                    excel.Quit()
                except:
                    pass
            pythoncom.CoUninitialize()

        return {
            "success": any(r.get("status") == "success" for r in results),
            "request_id": request_id,
            "results": results
        }

excel_to_pdf_service = ExcelToPdfService()
