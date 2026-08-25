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

class PowerPointToPdfService:
    def __init__(self):
        pass

    def _parse_slide_range(self, range_str: str) -> List[tuple]:
        """Parse a string like '1-5, 7, 9-11' into a list of tuples [(1, 5), (7, 7), (9, 11)]"""
        ranges = []
        if not range_str or range_str.strip() == "" or range_str.lower() == "all":
            return ranges
            
        parts = range_str.split(',')
        for part in parts:
            part = part.strip()
            if '-' in part:
                try:
                    start, end = part.split('-', 1)
                    ranges.append((int(start.strip()), int(end.strip())))
                except ValueError:
                    pass
            else:
                try:
                    val = int(part)
                    ranges.append((val, val))
                except ValueError:
                    pass
        return ranges

    def _convert_single_file(self, input_path: Path, output_path: Path, config: Dict[str, Any]) -> None:
        """
        Convert a single PowerPoint file to PDF using its own COM instance.
        Raises on failure.
        """
        if pythoncom is None or win32com is None:
            raise ValueError("PowerPoint conversion is only available on a Windows server with Microsoft PowerPoint installed.")
        pythoncom.CoInitialize()
        ppt = None
        pres = None
        try:
            ppt = win32com.client.DispatchEx("PowerPoint.Application")
            pres = ppt.Presentations.Open(
                str(input_path.resolve()),
                ReadOnly=True,
                Untitled=False,
                WithWindow=False
            )

            layout_mode = config.get("layout_mode", "slides")
            quality = config.get("quality", "standard")
            slide_range_str = config.get("slide_range", "all")
            include_hidden = config.get("include_hidden", False)
            include_metadata = config.get("include_metadata", True)

            # Output Type mapping
            if layout_mode == "slides":       out_type = 1
            elif layout_mode == "handouts_2": out_type = 3
            elif layout_mode == "handouts_3": out_type = 4
            elif layout_mode == "handouts_4": out_type = 5
            elif layout_mode == "handouts_6": out_type = 6
            elif layout_mode == "handouts_9": out_type = 7
            elif layout_mode == "notes":      out_type = 10
            else:                             out_type = 1

            # Intent: ppFixedFormatIntentScreen=1, ppFixedFormatIntentPrint=2
            intent = 1 if quality == "standard" else 2

            # Slide Ranges
            ranges = self._parse_slide_range(slide_range_str)
            try:
                pres.PrintOptions.Ranges.ClearAll()
            except Exception:
                pass

            if ranges:
                for start, end in ranges:
                    pres.PrintOptions.Ranges.Add(start, end)
                range_type = 4  # ppPrintSlideRange
            else:
                range_type = 1  # ppPrintAll

            # Hidden slides: msoTrue=-1, msoFalse=0
            print_hidden = -1 if include_hidden else 0

            # ExportAsFixedFormat with positional arguments (required for win32com COM dispatch)
            pres.ExportAsFixedFormat(
                str(output_path.resolve()),  # Path
                2,                           # FixedFormatType = ppFixedFormatTypePDF
                intent,                      # Intent
                False,                       # FrameSlides
                1,                           # HandoutOrder = Vertical
                out_type,                    # OutputType
                print_hidden,                # PrintHiddenSlides
                None,                        # PrintRange
                range_type,                  # RangeType
                "",                          # SlideShowName
                include_metadata,            # IncludeDocProperties
                True,                        # KeepIRMSettings
                True,                        # DocStructureTags
                True,                        # BitmapMissingFonts
                False                        # UseISO19005_1
            )
        finally:
            if pres:
                try:
                    pres.Close()
                except Exception:
                    pass
            if ppt:
                try:
                    ppt.Quit()
                except Exception:
                    pass
            pythoncom.CoUninitialize()

    async def analyze(self, request_id: str, filename: str) -> Dict[str, Any]:
        """
        Open the uploaded PowerPoint file and extract the slide count.
        """
        if pythoncom is None or win32com is None:
            raise ValueError("PowerPoint conversion is only available on a Windows server with Microsoft PowerPoint installed.")
        pythoncom.CoInitialize()
        ppt = None
        pres = None
        try:
            upload_dir = Paths.request_upload(request_id)
            input_path = upload_dir / filename
            
            if not input_path.exists():
                raise ValueError("File not found.")
                
            ppt = win32com.client.DispatchEx("PowerPoint.Application")
            pres = ppt.Presentations.Open(
                str(input_path.resolve()),
                ReadOnly=True,
                Untitled=False,
                WithWindow=False
            )
            slide_count = pres.Slides.Count
            
            return {
                "filename": filename,
                "slide_count": slide_count
            }
        except Exception as e:
            logger.error(f"Failed to analyze PowerPoint file {filename}: {str(e)}")
            raise ValueError(f"Failed to read PowerPoint file: {str(e)}")
        finally:
            if pres:
                try:
                    pres.Close()
                except Exception:
                    pass
            if ppt:
                try:
                    ppt.Quit()
                except Exception:
                    pass
            pythoncom.CoUninitialize()

    async def process(self, request_id: str, filenames: List[str], config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert PowerPoint presentations to PDF.
        Each file gets its own isolated COM instance to avoid state corruption.
        """
        upload_dir = Paths.request_upload(request_id)
        output_dir = Paths.request_output(request_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        results = []

        for filename in filenames:
            input_path = upload_dir / filename
            if not input_path.exists():
                logger.warning(f"File not found: {filename}")
                results.append({
                    "original_filename": filename,
                    "status": "error",
                    "message": "File not found on server. Please re-upload."
                })
                continue

            # Determine output filename
            pdf_filename = config.get("output_filename")
            if not pdf_filename or len(filenames) > 1:
                base_name = Path(filename).stem
                pdf_filename = f"{base_name}.pdf"

            output_path = output_dir / pdf_filename

            try:
                # Each file gets a fresh, isolated COM PowerPoint instance
                self._convert_single_file(input_path, output_path, config)

                if not output_path.exists():
                    raise RuntimeError("PDF was not created — PowerPoint export may have failed silently.")

                results.append({
                    "original_filename": filename,
                    "pdf_filename": pdf_filename,
                    "status": "success"
                })
                logger.info(f"Successfully converted {filename} -> {pdf_filename}")

            except Exception as e:
                logger.error(f"Error converting {filename}: {str(e)}")
                results.append({
                    "original_filename": filename,
                    "status": "error",
                    "message": str(e)
                })

        return {
            "success": any(r.get("status") == "success" for r in results),
            "request_id": request_id,
            "results": results
        }

powerpoint_to_pdf_service = PowerPointToPdfService()
