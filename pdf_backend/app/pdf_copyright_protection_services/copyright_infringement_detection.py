"""
Copyright Infringement Detection Service — PDF Copyright Protection Section.

Analyzes PDF content for potential copyright infringement indicators.
"""

from __future__ import annotations

import json
import logging
import re
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024


class CopyrightInfringementDetectionService:
    """Analyze PDF for potential copyright infringement indicators."""

    def _validate_pdf(self, pdf_bytes: bytes) -> None:
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError("File size exceeds the 200 MB limit.")
        if not pdf_bytes[:5].startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")

    def _extract_text_by_page(self, pdf_bytes: bytes) -> List[str]:
        pages = []
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page in doc:
            pages.append(page.get_text())
        doc.close()
        return pages

    def _find_repeated_sections(self, pages: List[str]) -> List[Dict[str, Any]]:
        findings = []
        paragraphs_by_page = []
        for i, text in enumerate(pages):
            paras = [p.strip() for p in re.split(r'\n\s*\n', text) if len(p.strip()) > 80]
            paragraphs_by_page.append((i + 1, paras))
        all_paras = []
        for page_num, paras in paragraphs_by_page:
            for p in paras:
                all_paras.append({"text": p, "page": page_num})
        for i in range(len(all_paras)):
            for j in range(i + 1, len(all_paras)):
                t1 = all_paras[i]["text"].lower()
                t2 = all_paras[j]["text"].lower()
                if t1 == t2 and len(t1) > 100:
                    findings.append({
                        "type": "exact_duplicate",
                        "text_preview": all_paras[i]["text"][:200],
                        "pages": [all_paras[i]["page"], all_paras[j]["page"]],
                        "length": len(t1),
                        "severity": "warning",
                        "message": f"Exact duplicate paragraph found on pages {all_paras[i]['page']} and {all_paras[j]['page']}.",
                    })
                elif len(t1) > 100 and len(t2) > 100:
                    common = len(set(t1.split()) & set(t2.split()))
                    total = len(set(t1.split()) | set(t2.split()))
                    if total > 0:
                        sim = common / total
                        if sim > 0.85:
                            findings.append({
                                "type": "near_duplicate",
                                "text_preview": all_paras[i]["text"][:200],
                                "pages": [all_paras[i]["page"], all_paras[j]["page"]],
                                "similarity": round(sim * 100, 1),
                                "severity": "potential_issue",
                                "message": f"Near-duplicate content ({sim*100:.1f}% similar) on pages {all_paras[i]['page']} and {all_paras[j]['page']}.",
                            })
        return findings

    def _check_copyright_notices(self, pages: List[str]) -> List[Dict[str, Any]]:
        findings = []
        copyright_pattern = re.compile(r'(?:©|copyright|\(c\))\s*\d{4}', re.IGNORECASE)
        notices = []
        for i, text in enumerate(pages):
            matches = copyright_pattern.findall(text)
            if matches:
                notices.extend([(i + 1, m) for m in matches])
        if len(notices) > 3:
            findings.append({
                "type": "multiple_notices",
                "count": len(notices),
                "locations": [f"page {n[0]}" for n in notices[:5]],
                "severity": "info",
                "message": f"Found {len(notices)} copyright notice(s) across the document.",
            })
        return findings

    def _check_conflicting_metadata(self, pdf_bytes: bytes) -> List[Dict[str, Any]]:
        findings = []
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            meta = doc.metadata or {}
            author = (meta.get("author") or "").strip()
            creator = (meta.get("creator") or "").strip()
            if author and creator and author.lower() != creator.lower():
                findings.append({
                    "type": "metadata_conflict",
                    "field1": "author",
                    "value1": author,
                    "field2": "creator",
                    "value2": creator,
                    "severity": "warning",
                    "message": "Author and Creator fields contain different values.",
                })
            holders_raw = meta.get("copyright_holders", "") or ""
            if holders_raw:
                try:
                    holders = json.loads(holders_raw)
                    if isinstance(holders, list) and len(holders) > 1:
                        names = [h.get("name", "") for h in holders if isinstance(h, dict)]
                        unique_names = set(n.lower() for n in names if n)
                        if len(unique_names) < len(names):
                            findings.append({
                                "type": "duplicate_holders",
                                "severity": "info",
                                "message": "Duplicate holder names detected.",
                            })
                except (json.JSONDecodeError, TypeError):
                    pass
            doc.close()
        except Exception as e:
            logger.warning(f"Metadata check error: {e}")
        return findings

    def _check_missing_attribution(self, pages: List[str]) -> List[Dict[str, Any]]:
        findings = []
        full_text = " ".join(pages).lower()
        if "attribution required" in full_text or "credit required" in full_text:
            has_attribution = "attribution" in full_text and ("provided" in full_text or "given" in full_text or "include" in full_text)
            if not has_attribution:
                findings.append({
                    "type": "missing_attribution",
                    "severity": "warning",
                    "message": "Document mentions attribution requirement but no attribution instructions found.",
                })
        return findings

    def analyze(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Perform full infringement indicator analysis."""
        self._validate_pdf(pdf_bytes)
        pages = self._extract_text_by_page(pdf_bytes)
        all_findings = []
        all_findings.extend(self._find_repeated_sections(pages))
        all_findings.extend(self._check_copyright_notices(pages))
        all_findings.extend(self._check_conflicting_metadata(pdf_bytes))
        all_findings.extend(self._check_missing_attribution(pages))
        warnings = sum(1 for f in all_findings if f.get("severity") == "warning")
        potential = sum(1 for f in all_findings if f.get("severity") == "potential_issue")
        if warnings >= 3 or potential >= 2:
            risk_summary = "Potential Issues Detected"
        elif warnings >= 1 or potential >= 1:
            risk_summary = "Warnings Found"
        elif all_findings:
            risk_summary = "Minor Observations"
        else:
            risk_summary = "No Obvious Issue Detected"
        return {
            "success": True,
            "risk_summary": risk_summary,
            "findings": all_findings,
            "total_findings": len(all_findings),
            "warnings": warnings,
            "potential_issues": potential,
            "total_pages": len(pages),
            "message": f"Analysis complete: {risk_summary}",
            "disclaimer": "This analysis detects potential indicators only. It does not determine legal copyright infringement.",
        }


copyright_infringement_detection_service = CopyrightInfringementDetectionService()
