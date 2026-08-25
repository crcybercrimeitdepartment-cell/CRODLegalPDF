import os
import time
import uuid
import json
import fitz
from pathlib import Path
from fastapi import UploadFile, HTTPException

TEMP_DIR = Path("temp_processing")
TEMP_DIR.mkdir(exist_ok=True)

class PageLabelManagementService:
    @staticmethod
    async def process_upload(file: UploadFile):
        """Analyze the PDF and return its existing page labels and metadata."""
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Invalid file format. Only PDF allowed.")
            
        request_id = str(uuid.uuid4())
        input_filename = f"{request_id}_{file.filename}"
        input_path = TEMP_DIR / input_filename
        
        try:
            content = await file.read()
            with open(input_path, "wb") as f:
                f.write(content)
                
            doc = fitz.open(input_path)
            
            if doc.needs_pass:
                doc.close()
                input_path.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail="Encrypted PDFs are not supported directly. Please decrypt first.")
                
            page_count = len(doc)
            if page_count == 0:
                doc.close()
                input_path.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail="Empty PDF provided.")
                
            # Get existing page labels
            raw_labels = doc.get_page_labels()
            formatted_labels = PageLabelManagementService._format_labels_for_ui(raw_labels, page_count)
            
            meta = doc.metadata
            bookmarks = len(doc.get_toc())
            
            # Additional Enhanced Document Info
            pdf_version = doc.is_pdf
            encrypted_status = doc.is_encrypted
            
            doc.close()
            
            return {
                "request_id": request_id,
                "filename": file.filename,
                "page_count": page_count,
                "existing_labels": formatted_labels,
                "raw_labels": raw_labels,
                "bookmark_count": bookmarks,
                "metadata": meta,
                "pdf_version": pdf_version,
                "encrypted_status": encrypted_status,
                "file_size": os.path.getsize(input_path)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            if input_path.exists():
                input_path.unlink()
            raise HTTPException(status_code=500, detail=f"Failed to analyze PDF: {str(e)}")

    @staticmethod
    def _format_labels_for_ui(raw_labels: list, total_pages: int) -> list:
        if not raw_labels:
            return []
            
        STYLE_NAMES = {
            "D": "Arabic",
            "r": "Lower Roman",
            "R": "Upper Roman",
            "a": "Lower Alphabet",
            "A": "Upper Alphabet",
            "": "Custom"
        }
        
        results = []
        for i, rule in enumerate(raw_labels):
            start_idx = rule.get("startpage", 0)
            end_idx = raw_labels[i+1].get("startpage", total_pages) - 1 if i + 1 < len(raw_labels) else total_pages - 1
            
            sp_display = start_idx + 1
            ep_display = end_idx + 1
            
            style_code = rule.get("style", "D")
            style_name = STYLE_NAMES.get(style_code, "Arabic")
            prefix = rule.get("prefix", "")
            first_num = rule.get("firstpagenum", 1)
            
            if prefix and style_code == "":
                results.append(f"Custom '{prefix}' (Pages {sp_display}-{ep_display})")
            else:
                results.append(f"{style_name} (Pages {sp_display}-{ep_display}) [Start: {first_num}, Prefix: '{prefix}']")
                
        return results

    @staticmethod
    def _apply_rules(doc: fitz.Document, rules: list, page_count: int):
        """
        Convert our frontend rules into fitz page label dictionary format.
        Frontend rules format:
        [
            {
                "start_page": 1, 
                "end_page": 5, 
                "style": "arabic",  # 'arabic', 'lroman', 'uroman', 'lalpha', 'ualpha', 'custom'
                "prefix": "INV-", 
                "start_num": 1,
                "padding": 3  # e.g., 001
            }
        ]
        """
        pdf_rules = []
        
        STYLE_MAP = {
            "arabic": "D",
            "lroman": "r",
            "uroman": "R",
            "lalpha": "a",
            "ualpha": "A",
            "custom": ""
        }
        
        for rule in rules:
            sp = rule.get("start_page", 1) - 1  # 0-indexed
            ep = rule.get("end_page", page_count) - 1 # 0-indexed
            style = rule.get("style", "arabic")
            prefix = rule.get("prefix", "")
            start_num = rule.get("start_num", 1)
            padding = rule.get("padding", 0)
            
            # Bound checks
            sp = max(0, min(sp, page_count - 1))
            ep = max(0, min(ep, page_count - 1))
            
            if padding > 0 and style != "custom":
                # If padding is requested, standard PDF styles do not support "001".
                # We must generate an explicit rule per page.
                curr_num = start_num
                for p in range(sp, ep + 1):
                    pad_str = str(curr_num).zfill(padding)
                    pdf_rules.append({
                        "startpage": p,
                        "prefix": f"{prefix}{pad_str}",
                        "style": "",
                        "firstpagenum": 1
                    })
                    curr_num += 1
            elif style == "custom":
                # Pure custom text per page, no numbering auto-increment via style
                curr_num = start_num
                for p in range(sp, ep + 1):
                    pad_str = str(curr_num).zfill(padding) if padding > 0 else str(curr_num)
                    pdf_rules.append({
                        "startpage": p,
                        "prefix": f"{prefix}{pad_str}",
                        "style": "",
                        "firstpagenum": 1
                    })
                    curr_num += 1
            else:
                # Standard PDF Page Label format
                pdf_rules.append({
                    "startpage": sp,
                    "prefix": prefix,
                    "style": STYLE_MAP.get(style, "D"),
                    "firstpagenum": start_num
                })
                
        # PyMuPDF expects rules sorted by startpage, and it automatically handles the ranges.
        # But wait, if we have ranges that stop (e.g. 1-5 Roman, 6-10 Arabic), 
        # the rule starting at page 6 naturally overrides the rule at page 1.
        # So we just pass the sorted list.
        pdf_rules.sort(key=lambda x: x["startpage"])
        
        # Eliminate duplicates on the same startpage by keeping the last one applied
        final_rules_dict = {}
        for pr in pdf_rules:
            final_rules_dict[pr["startpage"]] = pr
            
        final_rules = list(final_rules_dict.values())
        final_rules.sort(key=lambda x: x["startpage"])
        
        doc.set_page_labels(final_rules)
        return len(final_rules)

    @staticmethod
    def process_labels(request_id: str, original_filename: str, rules_json: str, action: str):
        """
        action can be 'apply' or 'remove'
        """
        start_time = time.time()
        input_filename = f"{request_id}_{original_filename}"
        input_path = TEMP_DIR / input_filename
        
        if not input_path.exists():
            raise HTTPException(status_code=404, detail="File not found or session expired.")
            
        output_filename = f"labeled_{original_filename}"
        output_path = TEMP_DIR / f"{request_id}_{output_filename}"
        
        try:
            doc = fitz.open(input_path)
            page_count = len(doc)
            rules_applied = 0
            
            if action == "remove":
                # Clearing labels is done by setting an empty list
                doc.set_page_labels([])
            else:
                rules = json.loads(rules_json)
                if not isinstance(rules, list):
                    raise ValueError("Rules must be a JSON array.")
                rules_applied = PageLabelManagementService._apply_rules(doc, rules, page_count)
                
            # Save the document preserving everything
            doc.save(
                output_path, 
                garbage=1,
                clean=False,
                deflate=True
            )
            doc.close()
            
            processing_time = round(time.time() - start_time, 2)
            out_size = os.path.getsize(output_path)
            
            return {
                "request_id": request_id,
                "filename": output_filename,
                "processing_time": f"{processing_time}s",
                "output_size": out_size,
                "rules_applied": rules_applied,
                "action": action
            }
            
        except Exception as e:
            if output_path.exists():
                output_path.unlink()
            raise HTTPException(status_code=500, detail=f"Failed to process labels: {str(e)}")

_page_label_service = PageLabelManagementService()
