"""
Page Size Normalization Service
Normalizes PDF pages to a specific target size while preserving content.
"""
from __future__ import annotations

import logging
import os
import fitz
from typing import Dict, Any, List
from fastapi import HTTPException
from pathlib import Path

logger = logging.getLogger(__name__)

class PageSizeNormalizationService:
    
    STANDARD_SIZES = {
        "A3": (842, 1190),
        "A4": (595, 842),
        "A5": (420, 595),
        "Letter": (612, 792),
        "Legal": (612, 1008),
        "Tabloid": (792, 1224),
        "Executive": (522, 756),
        "B4": (708, 1001),
        "B5": (498, 708)
    }

    @staticmethod
    def _get_size_name(width: float, height: float) -> str:
        # Match within a 5-point tolerance
        for name, (w, h) in PageSizeNormalizationService.STANDARD_SIZES.items():
            if (abs(width - w) < 5 and abs(height - h) < 5) or \
               (abs(width - h) < 5 and abs(height - w) < 5):
                return name
        return "Custom Size"

    @staticmethod
    def analyze_pdf(input_path: Path, request_id: str, original_filename: str) -> Dict[str, Any]:
        """Analyze the PDF to detect page sizes, metadata, and mixed orientations."""
        try:
            doc = fitz.open(str(input_path))
            if not doc.is_pdf:
                raise HTTPException(status_code=400, detail="Invalid PDF file.")
            
            page_count = len(doc)
            if page_count == 0:
                raise HTTPException(status_code=400, detail="Empty PDF.")

            size_summary = {}
            for i in range(page_count):
                page = doc[i]
                rect = page.rect
                w, h = round(rect.width), round(rect.height)
                
                size_name = PageSizeNormalizationService._get_size_name(w, h)
                
                # Format label for frontend: e.g. "A4 (210 x 297 mm)"
                # 1 pt = 25.4 / 72 mm
                w_mm = round(w * 25.4 / 72)
                h_mm = round(h * 25.4 / 72)
                
                if w > h:
                    label = f"{size_name} ({h_mm} x {w_mm} mm) Landscape"
                else:
                    label = f"{size_name} ({w_mm} x {h_mm} mm)"
                
                if label not in size_summary:
                    size_summary[label] = 0
                size_summary[label] += 1
                
            meta = doc.metadata
            format_str = meta.get("format", "")
            pdf_version = format_str.replace("PDF ", "") if format_str else "Unknown"
            file_size = os.path.getsize(input_path)

            doc.close()
            
            # Format summary for frontend percentage bars
            summary_list = []
            for lbl, count in size_summary.items():
                summary_list.append({
                    "label": lbl,
                    "count": count,
                    "percentage": round((count / page_count) * 100)
                })
            
            # Sort by count descending
            summary_list.sort(key=lambda x: x["count"], reverse=True)

            return {
                "request_id": request_id,
                "filename": original_filename,
                "file_size": file_size,
                "page_count": page_count,
                "pdf_version": pdf_version,
                "metadata": meta,
                "size_summary": summary_list
            }

        except fitz.FileDataError:
            raise HTTPException(status_code=400, detail="Corrupted or invalid PDF file.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to analyze PDF: {str(e)}")

    @staticmethod
    def process_normalization(input_path: Path, output_path: Path, settings: Dict[str, Any]) -> int:
        """
        Normalize all pages to target size and save to output_path.
        Returns the number of pages processed.
        """
        try:
            doc = fitz.open(str(input_path))
            out_doc = fitz.open()

            # Parse settings
            target_size = settings.get("target_size", "A4") # "A4", "Letter", or "Custom"
            custom_w_mm = settings.get("custom_w_mm", 210)
            custom_h_mm = settings.get("custom_h_mm", 297)
            orientation = settings.get("orientation", "Portrait") # "Portrait", "Landscape", "Auto Detect"
            mode = settings.get("normalization_mode", "Scale to Fit")
            preserve_aspect = settings.get("preserve_aspect", True)
            center_content = settings.get("center_content", True)
            bg_color = settings.get("background", "White") # "White", "Black", "Transparent"
            
            margin_top_mm = settings.get("margin_top", 0)
            margin_bottom_mm = settings.get("margin_bottom", 0)
            margin_left_mm = settings.get("margin_left", 0)
            margin_right_mm = settings.get("margin_right", 0)
            
            # Convert mm to points
            mm_to_pt = 72 / 25.4
            
            if target_size == "Custom":
                target_w_pt = custom_w_mm * mm_to_pt
                target_h_pt = custom_h_mm * mm_to_pt
            else:
                target_w_pt, target_h_pt = PageSizeNormalizationService.STANDARD_SIZES.get(target_size, (595, 842))
            
            # Apply margins to get content bounding box
            m_top = margin_top_mm * mm_to_pt
            m_bot = margin_bottom_mm * mm_to_pt
            m_lft = margin_left_mm * mm_to_pt
            m_rgt = margin_right_mm * mm_to_pt

            for i in range(len(doc)):
                src_page = doc[i]
                orig_rect = src_page.rect
                orig_w, orig_h = orig_rect.width, orig_rect.height
                
                # Determine Final Orientation for this page
                if orientation == "Auto Detect":
                    is_landscape = orig_w > orig_h
                else:
                    is_landscape = (orientation == "Landscape")
                    
                if is_landscape:
                    final_w = max(target_w_pt, target_h_pt)
                    final_h = min(target_w_pt, target_h_pt)
                else:
                    final_w = min(target_w_pt, target_h_pt)
                    final_h = max(target_w_pt, target_h_pt)
                    
                out_page = out_doc.new_page(width=final_w, height=final_h)
                
                # Apply background
                if bg_color != "Transparent":
                    bg_rgb = (1, 1, 1) if bg_color == "White" else (0, 0, 0)
                    out_page.draw_rect(out_page.rect, color=bg_rgb, fill=bg_rgb)
                
                # Available content area
                avail_w = final_w - m_lft - m_rgt
                avail_h = final_h - m_top - m_bot
                
                # Determine scale factor based on mode
                scale_x = avail_w / orig_w if orig_w > 0 else 1
                scale_y = avail_h / orig_h if orig_h > 0 else 1
                
                if preserve_aspect:
                    if mode == "Scale to Fit":
                        scale = min(scale_x, scale_y)
                        scale_x = scale_y = scale
                    elif mode == "Scale Down Only":
                        scale = min(scale_x, scale_y, 1.0)
                        scale_x = scale_y = scale
                    elif mode == "Scale Up":
                        scale = max(scale_x, scale_y, 1.0)
                        scale_x = scale_y = scale
                    elif mode == "Center Without Scaling":
                        scale_x = scale_y = 1.0
                else:
                    if mode == "Scale Down Only":
                        scale_x = min(scale_x, 1.0)
                        scale_y = min(scale_y, 1.0)
                    elif mode == "Center Without Scaling":
                        scale_x = scale_y = 1.0
                        
                # New dimensions of the stamped content
                stamp_w = orig_w * scale_x
                stamp_h = orig_h * scale_y
                
                # Centering offsets
                if center_content:
                    off_x = m_lft + (avail_w - stamp_w) / 2
                    off_y = m_top + (avail_h - stamp_h) / 2
                else:
                    off_x = m_lft
                    off_y = m_top
                    
                target_rect = fitz.Rect(off_x, off_y, off_x + stamp_w, off_y + stamp_h)
                
                # Stamp the original page onto the new page
                # show_pdf_page preserves vectors, text, fonts
                out_page.show_pdf_page(target_rect, doc, i, keep_proportion=preserve_aspect)
                
            # Copy TOC and Metadata
            out_doc.set_toc(doc.get_toc())
            out_doc.set_metadata(doc.metadata)

            out_doc.save(str(output_path), garbage=4, deflate=True)
            page_count = len(doc)
            
            out_doc.close()
            doc.close()
            return page_count
            
        except Exception as e:
            logger.error(f"Normalization failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

_page_size_normalization_service = PageSizeNormalizationService()
