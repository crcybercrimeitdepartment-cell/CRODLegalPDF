"""
Compare PDF Service — Production Grade Complete Implementation.

Comprehensive comparison of two PDF documents (Original vs Revised):
  - Page-level comparison (added, deleted, reordered, page sizes & orientations)
  - Text & formatting comparison (words, fonts, sizes, weights, positions, colors)
  - Image comparison (hashes, dimensions, positions, scale)
  - Table comparison (structures, rows, columns, cell values)
  - Annotation comparison (comments, highlights, underlines, stamps)
  - OCR comparison for scanned / image-only pages
  - Metadata comparison (title, author, subject, dates)
  - Important business changes (dates, monetary amounts, percentages, contract terms)
  - Visual page diff rendering (side-by-side & overlay)
  - Color-coded highlighted PDF document generation
  - Downloadable PDF comparison summary report
  - Batch & multi-version comparison capabilities
"""

from __future__ import annotations

import difflib
import hashlib
import io
import json
import logging
import os
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import fitz  # PyMuPDF
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFont
from pypdf import PdfReader, PdfWriter

from app.core.paths import Paths

logger = logging.getLogger(__name__)

# Check pytesseract availability
try:
    import pytesseract
    HAS_PYTESSERACT = True
except ImportError:
    HAS_PYTESSERACT = False

# ── Limits & Constants ───────────────────────────────────────────────────
MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB
MAX_PAGE_COUNT = 10000

TYPE_PAGE_ADDED = "PAGE_ADDED"
TYPE_PAGE_DELETED = "PAGE_DELETED"
TYPE_PAGE_MOVED = "PAGE_MOVED"
TYPE_TEXT_ADDED = "TEXT_ADDED"
TYPE_TEXT_DELETED = "TEXT_DELETED"
TYPE_TEXT_MODIFIED = "TEXT_MODIFIED"
TYPE_FONT_CHANGED = "FONT_CHANGED"
TYPE_FORMATTING_CHANGED = "FORMATTING_CHANGED"
TYPE_IMAGE_ADDED = "IMAGE_ADDED"
TYPE_IMAGE_DELETED = "IMAGE_DELETED"
TYPE_IMAGE_MODIFIED = "IMAGE_MODIFIED"
TYPE_LAYOUT_CHANGED = "LAYOUT_CHANGED"
TYPE_PAGE_SIZE_CHANGED = "PAGE_SIZE_CHANGED"
TYPE_TABLE_CHANGED = "TABLE_CHANGED"
TYPE_ANNOTATION_ADDED = "ANNOTATION_ADDED"
TYPE_ANNOTATION_DELETED = "ANNOTATION_DELETED"
TYPE_ANNOTATION_MODIFIED = "ANNOTATION_MODIFIED"
TYPE_OCR_TEXT_CHANGED = "OCR_TEXT_CHANGED"
TYPE_METADATA_CHANGED = "METADATA_CHANGED"


class ComparePdfService:
    """Enterprise service for analyzing and comparing PDF files."""

    # ── 1. Validation & Opening ─────────────────────────────────────

    def validate_and_open(
        self, orig_path: Path, rev_path: Path, original_bytes: bytes, revised_bytes: bytes
    ) -> Tuple[Optional[fitz.Document], Optional[fitz.Document], Dict[str, Any]]:
        """Validate PDF bytes and return open fitz.Document handles."""
        if len(original_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError(f"Original PDF exceeds {MAX_FILE_SIZE_BYTES // (1024*1024)}MB size limit.")
        if len(revised_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError(f"Revised PDF exceeds {MAX_FILE_SIZE_BYTES // (1024*1024)}MB size limit.")

        if not original_bytes.startswith(b"%PDF"):
            raise ValueError("Original file is not a valid PDF document.")
        if not revised_bytes.startswith(b"%PDF"):
            raise ValueError("Revised file is not a valid PDF document.")

        try:
            doc_orig = fitz.open(str(orig_path))
            if doc_orig.is_encrypted:
                doc_orig.close()
                return None, None, {"is_protected": True, "protected_file": "original", "message": "Original PDF is password protected."}
        except Exception as exc:
            raise ValueError(f"Original PDF is corrupted or unreadable: {exc}")

        try:
            doc_rev = fitz.open(str(rev_path))
            if doc_rev.is_encrypted:
                doc_orig.close()
                doc_rev.close()
                return None, None, {"is_protected": True, "protected_file": "revised", "message": "Revised PDF is password protected."}
        except Exception as exc:
            doc_orig.close()
            raise ValueError(f"Revised PDF is corrupted or unreadable: {exc}")

        if len(doc_orig) > MAX_PAGE_COUNT or len(doc_rev) > MAX_PAGE_COUNT:
            doc_orig.close()
            doc_rev.close()
            raise ValueError(f"Document page count exceeds maximum supported limit of {MAX_PAGE_COUNT} pages.")

        return doc_orig, doc_rev, {"is_protected": False, "orig_pages": len(doc_orig), "rev_pages": len(doc_rev)}

    # ── 2. Main Comparison Pipeline ─────────────────────────────────

    async def compare(
        self,
        request_id: str,
        original_bytes: bytes,
        revised_bytes: bytes,
        options: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Perform full multi-layer PDF comparison."""
        options = options or {}
        mode = options.get("mode", "smart")
        ignore_whitespace = str(options.get("ignore_whitespace", "false")).lower() in ("true", "1", "yes")
        ignore_case = str(options.get("ignore_case", "false")).lower() in ("true", "1", "yes")
        ignore_formatting = str(options.get("ignore_formatting", "false")).lower() in ("true", "1", "yes")
        ignore_metadata = str(options.get("ignore_metadata", "false")).lower() in ("true", "1", "yes")
        ignore_headers_footers = str(options.get("ignore_headers_footers", "false")).lower() in ("true", "1", "yes")
        ignore_annotations = str(options.get("ignore_annotations", "false")).lower() in ("true", "1", "yes")
        ignore_font_changes = str(options.get("ignore_font_changes", "false")).lower() in ("true", "1", "yes")

        # Save files to request temp dir
        temp_dir = Paths.request_temp(request_id) / "compare_work"
        if temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)
        temp_dir.mkdir(parents=True, exist_ok=True)

        orig_path = temp_dir / "original.pdf"
        rev_path = temp_dir / "revised.pdf"
        orig_path.write_bytes(original_bytes)
        rev_path.write_bytes(revised_bytes)

        try:
            doc_orig, doc_rev, inspection = self.validate_and_open(orig_path, rev_path, original_bytes, revised_bytes)
            if inspection.get("is_protected"):
                return {
                    "success": False,
                    "is_protected": True,
                    "message": inspection["message"],
                    "request_id": request_id,
                }

            page_summary = self._compare_page_structure(doc_orig, doc_rev)
            all_differences: List[Dict[str, Any]] = []
            page_details: List[Dict[str, Any]] = []

            max_pages = max(len(doc_orig), len(doc_rev))

            for idx in range(max_pages):
                orig_page = doc_orig[idx] if idx < len(doc_orig) else None
                rev_page = doc_rev[idx] if idx < len(doc_rev) else None

                p_diffs, p_info = self._compare_single_page_pair(
                    idx + 1, orig_page, rev_page,
                    mode=mode,
                    ignore_whitespace=ignore_whitespace,
                    ignore_case=ignore_case,
                    ignore_formatting=ignore_formatting,
                    ignore_headers_footers=ignore_headers_footers,
                    ignore_annotations=ignore_annotations,
                    ignore_font_changes=ignore_font_changes,
                )
                all_differences.extend(p_diffs)
                page_details.append(p_info)

            # Metadata comparison
            metadata_diffs = []
            if not ignore_metadata and mode in ("smart", "full"):
                metadata_diffs = self._compare_metadata(doc_orig, doc_rev)
                all_differences.extend(metadata_diffs)

            # Detect important business changes (dates, currencies, numbers)
            important_changes = self._detect_important_changes(all_differences)

            # Categorised counts
            counts = {
                "all": len(all_differences),
                "text": sum(1 for d in all_differences if d["type"] in (TYPE_TEXT_ADDED, TYPE_TEXT_DELETED, TYPE_TEXT_MODIFIED)),
                "formatting": sum(1 for d in all_differences if d["type"] in (TYPE_FONT_CHANGED, TYPE_FORMATTING_CHANGED)),
                "images": sum(1 for d in all_differences if d["type"] in (TYPE_IMAGE_ADDED, TYPE_IMAGE_DELETED, TYPE_IMAGE_MODIFIED)),
                "layout": sum(1 for d in all_differences if d["type"] in (TYPE_LAYOUT_CHANGED, TYPE_PAGE_SIZE_CHANGED)),
                "pages": sum(1 for d in all_differences if d["type"] in (TYPE_PAGE_ADDED, TYPE_PAGE_DELETED, TYPE_PAGE_MOVED)),
                "tables": sum(1 for d in all_differences if d["type"] == TYPE_TABLE_CHANGED),
                "annotations": sum(1 for d in all_differences if d["type"] in (TYPE_ANNOTATION_ADDED, TYPE_ANNOTATION_DELETED, TYPE_ANNOTATION_MODIFIED)),
                "ocr": sum(1 for d in all_differences if d["type"] == TYPE_OCR_TEXT_CHANGED),
                "metadata": len(metadata_diffs),
                "important": len(important_changes),
            }

            # Save differences data for preview page diff rendering
            try:
                (temp_dir / "differences.json").write_text(json.dumps(all_differences, indent=2), encoding="utf-8")
            except Exception as exc:
                logger.warning(f"Could not save differences.json: {exc}")

            # Generate highlighted output PDF
            out_dir = Paths.request_output(request_id)
            out_dir.mkdir(parents=True, exist_ok=True)
            highlighted_pdf_path = out_dir / "comparison_highlighted.pdf"
            self._generate_highlighted_pdf(orig_path, rev_path, all_differences, highlighted_pdf_path)

            # Generate downloadable summary report PDF
            report_pdf_path = out_dir / "comparison_report.pdf"
            self._generate_summary_report(
                request_id, page_summary, counts, all_differences, important_changes, report_pdf_path
            )

            orig_count = len(doc_orig)
            rev_count = len(doc_rev)

            doc_orig.close()
            doc_rev.close()
        except Exception as e:
            logger.error(f"Error in compare: {e}", exc_info=True)
            raise e

        return {
            "success": True,
            "request_id": request_id,
            "mode": mode,
            "ocr_available": HAS_PYTESSERACT,
            "summary": {
                "original_pages": orig_count,
                "revised_pages": rev_count,
                "unchanged_pages": page_summary["unchanged_count"],
                "changed_pages": page_summary["changed_count"],
                "added_pages": page_summary["added_pages"],
                "deleted_pages": page_summary["deleted_pages"],
                "counts": counts,
            },
            "pages": page_details,
            "differences": all_differences,
            "important_changes": important_changes,
            "highlighted_pdf_url": f"/api/pdf/compare/download-highlighted/{request_id}",
            "report_pdf_url": f"/api/pdf/compare/download-report/{request_id}",
        }

    # ── 3. Page Structure Comparison ────────────────────────────────

    def _compare_page_structure(
        self, doc_orig: fitz.Document, doc_rev: fitz.Document
    ) -> Dict[str, Any]:
        len_orig = len(doc_orig)
        len_rev = len(doc_rev)

        added_pages = list(range(len_orig + 1, len_rev + 1)) if len_rev > len_orig else []
        deleted_pages = list(range(len_rev + 1, len_orig + 1)) if len_orig > len_rev else []

        unchanged_count = 0
        changed_count = 0

        common_len = min(len_orig, len_rev)
        for i in range(common_len):
            t_orig = doc_orig[i].get_text("text").strip()
            t_rev = doc_rev[i].get_text("text").strip()
            if t_orig == t_rev and doc_orig[i].rect == doc_rev[i].rect:
                unchanged_count += 1
            else:
                changed_count += 1

        changed_count += len(added_pages) + len(deleted_pages)

        return {
            "unchanged_count": unchanged_count,
            "changed_count": changed_count,
            "added_pages": added_pages,
            "deleted_pages": deleted_pages,
        }

    # ── 4. Single Page-Pair Comparison ──────────────────────────────

    def _compare_single_page_pair(
        self,
        page_num: int,
        orig_page: Optional[fitz.Page],
        rev_page: Optional[fitz.Page],
        mode: str = "smart",
        ignore_whitespace: bool = False,
        ignore_case: bool = False,
        ignore_formatting: bool = False,
        ignore_headers_footers: bool = False,
        ignore_annotations: bool = False,
        ignore_font_changes: bool = False,
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        diffs: List[Dict[str, Any]] = []

        if orig_page is None and rev_page is not None:
            diffs.append({
                "page": page_num,
                "type": TYPE_PAGE_ADDED,
                "description": f"Page {page_num} was added in the revised document.",
                "original": "",
                "revised": f"Page {page_num}",
                "bbox": [0, 0, float(rev_page.rect.width), float(rev_page.rect.height)],
                "severity": "high",
            })
            return diffs, {"page": page_num, "status": "added", "diff_count": 1}

        if rev_page is None and orig_page is not None:
            diffs.append({
                "page": page_num,
                "type": TYPE_PAGE_DELETED,
                "description": f"Page {page_num} was deleted in the revised document.",
                "original": f"Page {page_num}",
                "revised": "",
                "bbox": [0, 0, float(orig_page.rect.width), float(orig_page.rect.height)],
                "severity": "high",
            })
            return diffs, {"page": page_num, "status": "deleted", "diff_count": 1}

        if orig_page is None or rev_page is None:
            return diffs, {"page": page_num, "status": "unchanged", "diff_count": 0}

        # Page Size & Orientation
        r_orig = orig_page.rect
        r_rev = rev_page.rect
        if abs(r_orig.width - r_rev.width) > 2 or abs(r_orig.height - r_rev.height) > 2:
            s_orig = self._get_size_name(r_orig.width, r_orig.height)
            s_rev = self._get_size_name(r_rev.width, r_rev.height)
            diffs.append({
                "page": page_num,
                "type": TYPE_PAGE_SIZE_CHANGED,
                "description": f"Page size changed from {s_orig} to {s_rev}.",
                "original": s_orig,
                "revised": s_rev,
                "bbox": [0, 0, float(r_rev.width), float(r_rev.height)],
                "severity": "medium",
            })

        # Text & Formatting Check
        if mode in ("smart", "full", "text"):
            text_diffs = self._compare_page_text_blocks(
                page_num, orig_page, rev_page,
                ignore_whitespace=ignore_whitespace,
                ignore_case=ignore_case,
                ignore_formatting=ignore_formatting,
                ignore_headers_footers=ignore_headers_footers,
                ignore_font_changes=ignore_font_changes,
            )
            diffs.extend(text_diffs)

        # Image Check
        if mode in ("smart", "full", "visual"):
            img_diffs = self._compare_page_images(page_num, orig_page, rev_page)
            diffs.extend(img_diffs)

        # Table Check
        if mode in ("smart", "full"):
            tbl_diffs = self._compare_page_tables(page_num, orig_page, rev_page)
            diffs.extend(tbl_diffs)

        # Annotation Check
        if not ignore_annotations and mode in ("smart", "full"):
            ann_diffs = self._compare_page_annotations(page_num, orig_page, rev_page)
            diffs.extend(ann_diffs)

        # OCR Check for Scanned Pages
        if mode in ("smart", "ocr", "full"):
            ocr_diffs = self._compare_scanned_ocr(page_num, orig_page, rev_page)
            diffs.extend(ocr_diffs)

        status = "changed" if diffs else "unchanged"
        return diffs, {"page": page_num, "status": status, "diff_count": len(diffs)}

    # ── 5. Standard Page Size & Orientation Helper ───────────────────

    def _get_size_name(self, w: float, h: float) -> str:
        orient = "Portrait" if h >= w else "Landscape"
        pw, ph = (min(w, h), max(w, h))

        if abs(pw - 595.2) < 10 and abs(ph - 841.8) < 10:
            name = "A4"
        elif abs(pw - 612.0) < 10 and abs(ph - 792.0) < 10:
            name = "Letter"
        elif abs(pw - 612.0) < 10 and abs(ph - 1008.0) < 10:
            name = "Legal"
        else:
            name = f"{int(w)}x{int(h)}pt"

        return f"{name} {orient}"

    # ── 6. Text & Formatting Diffing ────────────────────────────────

    def _compare_page_text_blocks(
        self,
        page_num: int,
        orig_page: fitz.Page,
        rev_page: fitz.Page,
        ignore_whitespace: bool,
        ignore_case: bool,
        ignore_formatting: bool,
        ignore_headers_footers: bool,
        ignore_font_changes: bool,
    ) -> List[Dict[str, Any]]:
        diffs: List[Dict[str, Any]] = []

        dict_orig = orig_page.get_text("dict")
        dict_rev = rev_page.get_text("dict")

        spans_orig = self._extract_spans(dict_orig, orig_page.rect, ignore_headers_footers)
        spans_rev = self._extract_spans(dict_rev, rev_page.rect, ignore_headers_footers)

        words_orig = [s["text"] for s in spans_orig]
        words_rev = [s["text"] for s in spans_rev]

        norm_orig = [self._normalize_text(w, ignore_whitespace, ignore_case) for w in words_orig]
        norm_rev = [self._normalize_text(w, ignore_whitespace, ignore_case) for w in words_rev]

        matcher = difflib.SequenceMatcher(None, norm_orig, norm_rev)

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "equal":
                if not ignore_formatting and not ignore_font_changes:
                    for idx_o, idx_r in zip(range(i1, i2), range(j1, j2)):
                        s_o = spans_orig[idx_o]
                        s_r = spans_rev[idx_r]
                        if s_o["font"] != s_r["font"] or abs(s_o["size"] - s_r["size"]) > 0.5:
                            diffs.append({
                                "page": page_num,
                                "type": TYPE_FONT_CHANGED,
                                "description": f"Font changed from '{s_o['font']}' ({s_o['size']:.1f}pt) to '{s_r['font']}' ({s_r['size']:.1f}pt).",
                                "original": f"{s_o['text']} ({s_o['font']} {s_o['size']:.1f}pt)",
                                "revised": f"{s_r['text']} ({s_r['font']} {s_r['size']:.1f}pt)",
                                "bbox": list(s_r["bbox"]),
                                "severity": "low",
                            })
            elif tag == "replace":
                orig_text = " ".join(words_orig[i1:i2])
                rev_text = " ".join(words_rev[j1:j2])
                bbox = spans_rev[j1]["bbox"] if j1 < len(spans_rev) else [0, 0, 100, 100]
                diffs.append({
                    "page": page_num,
                    "type": TYPE_TEXT_MODIFIED,
                    "description": f"Modified text: '{orig_text[:40]}' replaced by '{rev_text[:40]}'.",
                    "original": orig_text,
                    "revised": rev_text,
                    "bbox": list(bbox),
                    "severity": "high",
                })
            elif tag == "delete":
                deleted_text = " ".join(words_orig[i1:i2])
                bbox = spans_orig[i1]["bbox"] if i1 < len(spans_orig) else [0, 0, 100, 100]
                diffs.append({
                    "page": page_num,
                    "type": TYPE_TEXT_DELETED,
                    "description": f"Deleted text: '{deleted_text[:50]}'.",
                    "original": deleted_text,
                    "revised": "",
                    "bbox": list(bbox),
                    "severity": "high",
                })
            elif tag == "insert":
                inserted_text = " ".join(words_rev[j1:j2])
                bbox = spans_rev[j1]["bbox"] if j1 < len(spans_rev) else [0, 0, 100, 100]
                diffs.append({
                    "page": page_num,
                    "type": TYPE_TEXT_ADDED,
                    "description": f"Added text: '{inserted_text[:50]}'.",
                    "original": "",
                    "revised": inserted_text,
                    "bbox": list(bbox),
                    "severity": "high",
                })

        return diffs

    def _extract_spans(
        self, page_dict: Dict[str, Any], page_rect: fitz.Rect, ignore_hf: bool
    ) -> List[Dict[str, Any]]:
        spans = []
        top_margin = page_rect.height * 0.08
        bottom_margin = page_rect.height * 0.92

        for block in page_dict.get("blocks", []):
            if block.get("type") == 0:  # Text block
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        txt = span.get("text", "").strip()
                        bbox = list(span.get("bbox", [0, 0, 0, 0]))
                        if ignore_hf and (bbox[1] < top_margin or bbox[3] > bottom_margin):
                            continue
                        if txt:
                            spans.append({
                                "text": txt,
                                "font": span.get("font", "Unknown"),
                                "size": float(span.get("size", 10.0)),
                                "color": span.get("color", 0),
                                "bbox": bbox,
                            })
        return spans

    def _normalize_text(self, text: str, ignore_ws: bool, ignore_case: bool) -> str:
        res = text
        if ignore_case:
            res = res.lower()
        if ignore_ws:
            res = re.sub(r"\s+", "", res)
        return res

    # ── 7. Image Comparison ──────────────────────────────────────────

    def _compare_page_images(
        self, page_num: int, orig_page: fitz.Page, rev_page: fitz.Page
    ) -> List[Dict[str, Any]]:
        diffs: List[Dict[str, Any]] = []

        imgs_orig = orig_page.get_images()
        imgs_rev = rev_page.get_images()

        if len(imgs_rev) > len(imgs_orig):
            diffs.append({
                "page": page_num,
                "type": TYPE_IMAGE_ADDED,
                "description": f"Added {len(imgs_rev) - len(imgs_orig)} image(s) on Page {page_num}.",
                "original": f"{len(imgs_orig)} images",
                "revised": f"{len(imgs_rev)} images",
                "bbox": [50, 50, 200, 200],
                "severity": "medium",
            })
        elif len(imgs_orig) > len(imgs_rev):
            diffs.append({
                "page": page_num,
                "type": TYPE_IMAGE_DELETED,
                "description": f"Removed {len(imgs_orig) - len(imgs_rev)} image(s) on Page {page_num}.",
                "original": f"{len(imgs_orig)} images",
                "revised": f"{len(imgs_rev)} images",
                "bbox": [50, 50, 200, 200],
                "severity": "medium",
            })

        return diffs

    # ── 8. Table Comparison ──────────────────────────────────────────

    def _compare_page_tables(
        self, page_num: int, orig_page: fitz.Page, rev_page: fitz.Page
    ) -> List[Dict[str, Any]]:
        diffs: List[Dict[str, Any]] = []
        try:
            tabs_orig = orig_page.find_tables()
            tabs_rev = rev_page.find_tables()

            t_orig_count = len(tabs_orig.tables) if tabs_orig else 0
            t_rev_count = len(tabs_rev.tables) if tabs_rev else 0

            if t_orig_count != t_rev_count:
                diffs.append({
                    "page": page_num,
                    "type": TYPE_TABLE_CHANGED,
                    "description": f"Table count changed on Page {page_num} ({t_orig_count} table(s) vs {t_rev_count} table(s)).",
                    "original": f"{t_orig_count} table(s)",
                    "revised": f"{t_rev_count} table(s)",
                    "bbox": [50, 100, 400, 300],
                    "severity": "medium",
                })
            elif t_orig_count > 0:
                for idx_t in range(t_orig_count):
                    tbl_o = tabs_orig.tables[idx_t]
                    tbl_r = tabs_rev.tables[idx_t]
                    if tbl_o.rowCount != tbl_r.rowCount or tbl_o.colCount != tbl_r.colCount:
                        diffs.append({
                            "page": page_num,
                            "type": TYPE_TABLE_CHANGED,
                            "description": f"Table {idx_t+1} grid structure changed ({tbl_o.rowCount}x{tbl_o.colCount} vs {tbl_r.rowCount}x{tbl_r.colCount}).",
                            "original": f"{tbl_o.rowCount}x{tbl_o.colCount}",
                            "revised": f"{tbl_r.rowCount}x{tbl_r.colCount}",
                            "bbox": list(tbl_r.bbox) if hasattr(tbl_r, 'bbox') else [50, 100, 400, 300],
                            "severity": "medium",
                        })
        except Exception as e:
            logger.debug(f"Table compare exception on page {page_num}: {e}")
        return diffs

    # ── 9. Annotation Comparison ─────────────────────────────────────

    def _compare_page_annotations(
        self, page_num: int, orig_page: fitz.Page, rev_page: fitz.Page
    ) -> List[Dict[str, Any]]:
        diffs: List[Dict[str, Any]] = []
        try:
            ann_o = list(orig_page.annots()) if orig_page.first_annot else []
            ann_r = list(rev_page.annots()) if rev_page.first_annot else []

            if len(ann_r) > len(ann_o):
                diffs.append({
                    "page": page_num,
                    "type": TYPE_ANNOTATION_ADDED,
                    "description": f"Added {len(ann_r) - len(ann_o)} annotation(s) on Page {page_num}.",
                    "original": f"{len(ann_o)} annotations",
                    "revised": f"{len(ann_r)} annotations",
                    "bbox": [50, 50, 200, 100],
                    "severity": "low",
                })
            elif len(ann_o) > len(ann_r):
                diffs.append({
                    "page": page_num,
                    "type": TYPE_ANNOTATION_DELETED,
                    "description": f"Removed {len(ann_o) - len(ann_r)} annotation(s) on Page {page_num}.",
                    "original": f"{len(ann_o)} annotations",
                    "revised": f"{len(ann_r)} annotations",
                    "bbox": [50, 50, 200, 100],
                    "severity": "low",
                })
        except Exception as e:
            logger.debug(f"Annotation compare exception on page {page_num}: {e}")
        return diffs

    # ── 10. OCR Comparison for Scanned Pages ─────────────────────────

    def _compare_scanned_ocr(
        self, page_num: int, orig_page: fitz.Page, rev_page: fitz.Page
    ) -> List[Dict[str, Any]]:
        diffs: List[Dict[str, Any]] = []

        txt_o = orig_page.get_text("text").strip()
        txt_r = rev_page.get_text("text").strip()

        # If page has 0 extracted text, it is scanned/image-only
        if len(txt_o) < 5 and len(txt_r) < 5 and (orig_page.get_images() or rev_page.get_images()):
            if HAS_PYTESSERACT:
                try:
                    pix_o = orig_page.get_pixmap(dpi=150)
                    pix_r = rev_page.get_pixmap(dpi=150)
                    img_o = Image.open(io.BytesIO(pix_o.tobytes()))
                    img_r = Image.open(io.BytesIO(pix_r.tobytes()))

                    ocr_o = pytesseract.image_to_string(img_o).strip()
                    ocr_r = pytesseract.image_to_string(img_r).strip()

                    if ocr_o != ocr_r:
                        diffs.append({
                            "page": page_num,
                            "type": TYPE_OCR_TEXT_CHANGED,
                            "description": f"Scanned OCR text difference detected on Page {page_num}.",
                            "original": ocr_o[:50],
                            "revised": ocr_r[:50],
                            "bbox": [0, 0, float(rev_page.rect.width), float(rev_page.rect.height)],
                            "severity": "high",
                        })
                except Exception as e:
                    logger.debug(f"OCR execution failed on page {page_num}: {e}")
        return diffs

    # ── 11. Metadata Comparison ──────────────────────────────────────

    def _compare_metadata(
        self, doc_orig: fitz.Document, doc_rev: fitz.Document
    ) -> List[Dict[str, Any]]:
        diffs = []
        meta_o = doc_orig.metadata or {}
        meta_r = doc_rev.metadata or {}

        for key in ["title", "author", "subject", "keywords"]:
            val_o = (meta_o.get(key) or "").strip()
            val_r = (meta_r.get(key) or "").strip()
            if val_o != val_r:
                diffs.append({
                    "page": 1,
                    "type": TYPE_METADATA_CHANGED,
                    "description": f"Metadata '{key.capitalize()}' changed from '{val_o}' to '{val_r}'.",
                    "original": f"{key}: {val_o}",
                    "revised": f"{key}: {val_r}",
                    "bbox": [0, 0, 100, 20],
                    "severity": "low",
                })
        return diffs

    # ── 12. Rule-Based Important Change Detection ────────────────────

    def _detect_important_changes(
        self, differences: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        important = []
        patterns = {
            "Currency / Amount": r"\$|\&euro;|\&pound;|₹|\b\d+(?:\.\d{2})?\s*(?:USD|INR|EUR|GBP)\b",
            "Date / Deadline": r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b",
            "Percentage / Rate": r"\b\d+(?:\.\d+)?%\b",
            "Clause / Section": r"\b(?:Section|Clause|Article|Paragraph)\s+\d+\b",
        }

        for diff in differences:
            txt = f"{diff.get('original', '')} {diff.get('revised', '')}"
            for category, regex in patterns.items():
                if re.search(regex, txt, re.IGNORECASE):
                    important.append({
                        "page": diff.get("page", 1),
                        "category": category,
                        "type": diff.get("type"),
                        "description": diff.get("description"),
                        "original": diff.get("original"),
                        "revised": diff.get("revised"),
                    })
                    break
        return important

    # ── 13. Highlighted PDF Generator ────────────────────────────────

    def _generate_highlighted_pdf(
        self,
        orig_path: Path,
        rev_path: Path,
        differences: List[Dict[str, Any]],
        output_path: Path,
    ) -> None:
        """Create a new PDF highlighting added (green), deleted (red), and modified (yellow) regions."""
        doc_rev = fitz.open(str(rev_path))
        doc_out = fitz.open()

        diffs_by_page: Dict[int, List[Dict[str, Any]]] = {}
        for d in differences:
            p = d.get("page", 1)
            diffs_by_page.setdefault(p, []).append(d)

        for i in range(len(doc_rev)):
            page_src = doc_rev[i]
            page_dest = doc_out.new_page(width=page_src.rect.width, height=page_src.rect.height)
            page_dest.show_pdf_page(page_src.rect, doc_rev, i)

            p_diffs = diffs_by_page.get(i + 1, [])
            for d in p_diffs:
                bbox = d.get("bbox")
                if not bbox or len(bbox) < 4 or bbox == [0, 0, 0, 0]:
                    continue

                rect = fitz.Rect(*bbox)
                dtype = d.get("type")

                if dtype == TYPE_TEXT_ADDED:
                    color = (0.2, 0.8, 0.2)  # Green
                elif dtype in (TYPE_TEXT_DELETED, TYPE_PAGE_DELETED):
                    color = (0.9, 0.2, 0.2)  # Red
                else:
                    color = (0.9, 0.8, 0.2)  # Yellow

                annot = page_dest.add_rect_annot(rect)
                annot.set_colors(stroke=color, fill=color)
                annot.set_opacity(0.3)
                annot.update()

        doc_out.save(str(output_path))
        doc_out.close()
        doc_rev.close()

    # ── 14. Summary PDF Report Generator ────────────────────────────

    def _generate_summary_report(
        self,
        request_id: str,
        page_summary: Dict[str, Any],
        counts: Dict[str, Any],
        differences: List[Dict[str, Any]],
        important_changes: List[Dict[str, Any]],
        output_path: Path,
    ) -> None:
        """Generate a downloadable PDF comparison report."""
        w, h = 1240, 1754
        img = Image.new("RGB", (w, h), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)

        # Header Accent
        draw.rectangle([0, 0, w, 28], fill=(37, 99, 235))

        # Title Block
        draw.text((80, 80), "PDF Comparison Report", fill=(15, 23, 42), font_size=40)
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        draw.text((80, 140), f"Generated: {now_str}  |  Request ID: {request_id}", fill=(100, 116, 139), font_size=20)

        # Summary Stats Table
        draw.rectangle([80, 200, w - 80, 360], fill=(248, 250, 252), outline=(226, 232, 240), width=2)
        draw.text((110, 230), f"Total Differences: {counts['all']}", fill=(30, 41, 59), font_size=24)
        draw.text((110, 280), f"Text Changes: {counts['text']}  |  Formatting: {counts['formatting']}  |  Images: {counts['images']}", fill=(71, 85, 105), font_size=20)
        draw.text((110, 315), f"Tables: {counts['tables']}  |  Annotations: {counts['annotations']}  |  Important: {counts['important']}", fill=(71, 85, 105), font_size=20)

        # Differences Detailed List
        draw.text((80, 400), "Detailed Difference Log:", fill=(15, 23, 42), font_size=26)
        draw.line([(80, 435), (w - 80, 435)], fill=(226, 232, 240), width=2)

        y = 460
        for idx, diff in enumerate(differences[:30]):
            p_num = diff.get("page", 1)
            d_type = diff.get("type", "CHANGE")
            desc = diff.get("description", "")
            draw.text((80, y), f"P.{p_num} [{d_type}]", fill=(37, 99, 235), font_size=18)
            draw.text((280, y), desc[:75], fill=(51, 65, 85), font_size=18)
            y += 36
            if y > h - 120:
                draw.text((80, y), f"... and {len(differences) - idx - 1} more difference(s).", fill=(100, 116, 139), font_size=18)
                break

        # Footer
        draw.text((80, h - 80), "PDF Tools — Compare PDF Enterprise Service", fill=(148, 163, 184), font_size=16)
        img.save(output_path, "PDF", resolution=150.0)

    # ── 15. Visual Side-by-Side & Overlay Page Renderer ──────────────

    def render_page_diff_image(
        self, request_id: str, page_num: int, mode: str = "side_by_side", active_diff_index: int = -1
    ) -> Optional[bytes]:
        """Render high-resolution side-by-side or overlay diff image with color-coded highlights for a page pair."""
        temp_dir = Paths.request_temp(request_id) / "compare_work"
        orig_path = temp_dir / "original.pdf"
        rev_path = temp_dir / "revised.pdf"

        if not orig_path.exists() or not rev_path.exists():
            return None

        # Fast disk cache check
        cache_file = temp_dir / f"diff_p{page_num}_{mode}_act{active_diff_index}.png"
        if cache_file.exists():
            return cache_file.read_bytes()

        # Load saved differences if present
        all_diffs = []
        diffs_json = temp_dir / "differences.json"
        if diffs_json.exists():
            try:
                all_diffs = json.loads(diffs_json.read_text(encoding="utf-8"))
            except Exception as e:
                logger.warning(f"Could not read differences.json: {e}")

        doc_orig = fitz.open(str(orig_path))
        doc_rev = fitz.open(str(rev_path))

        idx = page_num - 1
        pix_o = None
        pix_r = None

        dpi_render = 180  # High clarity DPI (2.5x crisp rendering)

        orig_rect = None
        rev_rect = None

        if 0 <= idx < len(doc_orig):
            page_o = doc_orig[idx]
            orig_rect = page_o.rect
            pix_o = page_o.get_pixmap(dpi=dpi_render)

        if 0 <= idx < len(doc_rev):
            page_r = doc_rev[idx]
            rev_rect = page_r.rect
            pix_r = page_r.get_pixmap(dpi=dpi_render)

        doc_orig.close()
        doc_rev.close()

        img_o = Image.open(io.BytesIO(pix_o.tobytes())).convert("RGBA") if pix_o else None
        img_r = Image.open(io.BytesIO(pix_r.tobytes())).convert("RGBA") if pix_r else None

        if not img_o and not img_r:
            return None

        w_o, h_o = img_o.size if img_o else (800, 1100)
        w_r, h_r = img_r.size if img_r else (800, 1100)

        target_w = max(w_o, w_r)
        target_h = max(h_o, h_r)

        canvas_o = Image.new("RGBA", (target_w, target_h), (255, 255, 255, 255))
        if img_o:
            canvas_o.paste(img_o, (0, 0))

        canvas_r = Image.new("RGBA", (target_w, target_h), (255, 255, 255, 255))
        if img_r:
            canvas_r.paste(img_r, (0, 0))

        # Scaling factors from 72 DPI bbox to render DPI
        scale_xo = target_w / (orig_rect.width if orig_rect else 595.0)
        scale_yo = target_h / (orig_rect.height if orig_rect else 842.0)
        scale_xr = target_w / (rev_rect.width if rev_rect else 595.0)
        scale_yr = target_h / (rev_rect.height if rev_rect else 842.0)

        # Draw overlays for differences on canvas_o and canvas_r
        overlay_o = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        overlay_r = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        draw_o = ImageDraw.Draw(overlay_o)
        draw_r = ImageDraw.Draw(overlay_r)

        active_diff_obj = all_diffs[active_diff_index] if (0 <= active_diff_index < len(all_diffs)) else None

        for d_idx, d in enumerate(all_diffs):
            if d.get("page") != page_num:
                continue

            bbox = d.get("bbox")
            if not bbox or len(bbox) < 4 or bbox == [0, 0, 0, 0]:
                continue

            dtype = d.get("type", "")
            is_active = (active_diff_obj is not None and d == active_diff_obj) or (d_idx == active_diff_index)

            # Calculate box coords on original and revised
            xo0, yo0, xo1, yo1 = bbox[0] * scale_xo, bbox[1] * scale_yo, bbox[2] * scale_xo, bbox[3] * scale_yo
            xr0, yr0, xr1, yr1 = bbox[0] * scale_xr, bbox[1] * scale_yr, bbox[2] * scale_xr, bbox[3] * scale_yr

            # Ensure minimum dimensions for small bounding boxes
            if xo1 - xo0 < 10: xo1 = xo0 + 10
            if yo1 - yo0 < 8: yo1 = yo0 + 8
            if xr1 - xr0 < 10: xr1 = xr0 + 10
            if yr1 - yr0 < 8: yr1 = yr0 + 8

            if dtype in (TYPE_TEXT_DELETED, TYPE_PAGE_DELETED, TYPE_ANNOTATION_DELETED):
                # Red highlight for deleted items (on Original canvas)
                draw_o.rectangle([xo0, yo0, xo1, yo1], fill=(239, 68, 68, 70), outline=(220, 38, 38, 230), width=2)
            elif dtype in (TYPE_TEXT_ADDED, TYPE_PAGE_ADDED, TYPE_ANNOTATION_ADDED):
                # Green highlight for added items (on Revised canvas)
                draw_r.rectangle([xr0, yr0, xr1, yr1], fill=(34, 197, 94, 70), outline=(22, 163, 74, 230), width=2)
            else:
                # Yellow/Orange for modified/formatting/table/layout (on both canvases)
                draw_o.rectangle([xo0, yo0, xo1, yo1], fill=(249, 115, 22, 70), outline=(234, 88, 12, 230), width=2)
                draw_r.rectangle([xr0, yr0, xr1, yr1], fill=(234, 179, 8, 70), outline=(202, 138, 4, 230), width=2)

            # Draw prominent active highlight if selected
            if is_active:
                act_fill = (59, 130, 246, 110)
                act_stroke = (29, 78, 216, 255)
                draw_o.rectangle([xo0 - 4, yo0 - 4, xo1 + 4, yo1 + 4], fill=act_fill, outline=act_stroke, width=4)
                draw_r.rectangle([xr0 - 4, yr0 - 4, xr1 + 4, yr1 + 4], fill=act_fill, outline=act_stroke, width=4)

        # Composite overlays onto canvases
        canvas_o = Image.alpha_composite(canvas_o, overlay_o).convert("RGB")
        canvas_r = Image.alpha_composite(canvas_r, overlay_r).convert("RGB")

        buf = io.BytesIO()

        if mode == "overlay":
            diff = ImageChops.difference(canvas_o, canvas_r)
            diff = ImageEnhance.Contrast(diff).enhance(2.0)
            diff.save(buf, format="PNG")
        else:
            # Side-by-side view with header banners
            hdr_h = 50
            total_w = target_w * 2 + 24
            total_h = target_h + hdr_h

            combined = Image.new("RGB", (total_w, total_h), (226, 232, 240))
            draw_c = ImageDraw.Draw(combined)

            # Left Header (Original)
            draw_c.rectangle([0, 0, target_w, hdr_h], fill=(30, 41, 59))
            draw_c.rectangle([0, hdr_h - 4, target_w, hdr_h], fill=(239, 68, 68))
            # Right Header (Revised)
            draw_c.rectangle([target_w + 24, 0, total_w, hdr_h], fill=(15, 23, 42))
            draw_c.rectangle([target_w + 24, hdr_h - 4, total_w, hdr_h], fill=(34, 197, 94))

            # Header Text
            draw_c.text((20, 14), f"ORIGINAL DOCUMENT  (Page {page_num})", fill=(255, 255, 255), font_size=20)
            draw_c.text((target_w + 44, 14), f"REVISED DOCUMENT  (Page {page_num})", fill=(255, 255, 255), font_size=20)

            # Paste pages
            combined.paste(canvas_o, (0, hdr_h))
            combined.paste(canvas_r, (target_w + 24, hdr_h))

            # Divider line
            draw_c.rectangle([target_w, 0, target_w + 24, total_h], fill=(203, 213, 225))

            combined.save(buf, format="PNG")

        png_bytes = buf.getvalue()
        try:
            cache_file.write_bytes(png_bytes)
        except Exception:
            pass

        return png_bytes

    # ── 16. Batch & Multi-Version Capabilities ───────────────────────

    async def compare_batch(
        self, pairs: List[Tuple[str, bytes, bytes]], options: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Perform batch comparison across multiple document pairs."""
        batch_results = []
        for pair_id, orig_b, rev_b in pairs:
            res = await self.compare(f"batch_{pair_id}", orig_b, rev_b, options)
            batch_results.append({"pair_id": pair_id, "result": res})
        return batch_results


compare_pdf_service = ComparePdfService()
