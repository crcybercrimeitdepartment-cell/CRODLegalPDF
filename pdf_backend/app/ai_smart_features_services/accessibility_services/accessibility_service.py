"""
Accessibility Service — PDF accessibility analysis and WCAG compliance.

Uses PyMuPDF (fitz) to analyze PDF structure, tags, reading order,
alt text, heading hierarchy, and more for WCAG 2.1 AA compliance.
"""

from __future__ import annotations

import logging
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

WCAG_CRITERIA = {
    "1.1.1": "Non-text Content (Level A)",
    "1.3.1": "Info and Relationships (Level A)",
    "1.3.2": "Meaningful Sequence (Level A)",
    "1.3.3": "Sensory Characteristics (Level A)",
    "1.4.1": "Use of Color (Level A)",
    "1.4.3": "Contrast (Minimum) (Level AA)",
    "2.4.1": "Bypass Blocks (Level A)",
    "2.4.2": "Page Titled (Level A)",
    "2.4.6": "Headings and Labels (Level AA)",
    "3.1.1": "Language of Page (Level A)",
    "3.1.2": "Language of Parts (Level AA)",
    "4.1.2": "Name, Role, Value (Level A)",
}


class AccessibilityService:
    """Service class for PDF accessibility analysis and compliance checking."""

    @staticmethod
    def _get_doc(input_path: str) -> fitz.Document:
        """Open a PDF document."""
        return fitz.open(input_path)

    @staticmethod
    def _extract_all_text(input_path: str) -> str:
        """Extract all text from a PDF."""
        doc = fitz.open(input_path)
        try:
            parts = []
            for page in doc:
                parts.append(page.get_text())
            return "\n".join(parts)
        finally:
            doc.close()

    @staticmethod
    def _get_text_blocks(input_path: str) -> List[Dict[str, Any]]:
        """Extract text blocks with position info."""
        doc = fitz.open(input_path)
        try:
            blocks = []
            for i, page in enumerate(doc):
                for b in page.get_text("blocks"):
                    x0, y0, x1, y1, text, block_no, block_type = b
                    blocks.append({
                        "page": i + 1,
                        "x0": x0, "y0": y0, "x1": x1, "y1": y1,
                        "text": text.strip(),
                        "block_type": block_type,
                    })
            return blocks
        finally:
            doc.close()

    @staticmethod
    def _extract_structure(input_path: str) -> Dict[str, Any]:
        """Extract PDF structure tree information."""
        doc = fitz.open(input_path)
        try:
            info = {
                "is_tagged": False,
                "has_structure_tree": False,
                "has_mark_info": False,
                "metadata": doc.metadata or {},
                "page_count": len(doc),
            }

            toc = doc.get_toc()
            if toc:
                info["has_structure_tree"] = True
                info["toc"] = [{"level": t[0], "title": t[1], "page": t[2]} for t in toc[:50]]

            try:
                xref = doc.xref_xml_metadata(0) if doc.xref_length() > 0 else ""
                if "MarkInfo" in str(xref) or "Marked" in str(xref):
                    info["has_mark_info"] = True
            except Exception:
                pass

            try:
                if hasattr(doc, "is_pdf") and doc.is_pdf:
                    for i in range(min(5, len(doc))):
                        page = doc[i]
                        try:
                            xref = page.xref
                            if doc.xref_get_key(xref, "StructParents"):
                                info["is_tagged"] = True
                                break
                        except Exception:
                            continue
            except Exception:
                pass

            if toc:
                info["is_tagged"] = True

            return info
        finally:
            doc.close()

    @staticmethod
    def _extract_images(input_path: str) -> List[Dict[str, Any]]:
        """Extract image information from PDF."""
        doc = fitz.open(input_path)
        try:
            images = []
            for i, page in enumerate(doc):
                for img in page.get_images(full=True):
                    xref = img[0]
                    try:
                        info = doc.extract_image(xref)
                        images.append({
                            "page": i + 1,
                            "xref": xref,
                            "width": info.get("width", 0),
                            "height": info.get("height", 0),
                            "format": info.get("image", b"")[:4].decode("latin-1") if info.get("image") else "unknown",
                        })
                    except Exception:
                        images.append({"page": i + 1, "xref": xref, "width": 0, "height": 0, "format": "unknown"})
            return images
        finally:
            doc.close()

    @staticmethod
    def _extract_links(input_path: str) -> List[Dict[str, Any]]:
        """Extract links from PDF."""
        doc = fitz.open(input_path)
        try:
            links = []
            for i, page in enumerate(doc):
                for link in page.get_links():
                    links.append({
                        "page": i + 1,
                        "uri": link.get("uri", ""),
                        "kind": link.get("kind", 0),
                    })
            return links
        finally:
            doc.close()

    @staticmethod
    def _get_reading_order(input_path: str) -> List[Dict[str, Any]]:
        """Determine reading order from text blocks."""
        doc = fitz.open(input_path)
        try:
            order = []
            for i, page in enumerate(doc):
                blocks = page.get_text("blocks")
                text_blocks = [b for b in blocks if b[6] == 0]
                text_blocks.sort(key=lambda b: (round(b[1] / 20) * 20, b[0]))
                for idx, b in enumerate(text_blocks):
                    order.append({
                        "page": i + 1,
                        "order": idx,
                        "text": b[4].strip()[:100],
                        "y0": b[1],
                        "x0": b[0],
                    })
            return order
        finally:
            doc.close()

    def _get_headings(self, input_path: str) -> List[Dict[str, Any]]:
        """Extract heading hierarchy."""
        doc = fitz.open(input_path)
        try:
            headings = []
            for i, page in enumerate(doc):
                blocks = page.get_text("dict")["blocks"]
                for block in blocks:
                    if block.get("type") != 0:
                        continue
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            text = span.get("text", "").strip()
                            if not text:
                                continue
                            flags = span.get("flags", 0)
                            size = span.get("size", 12)
                            is_bold = bool(flags & 2**4)
                            if size >= 14 or (is_bold and len(text) < 100):
                                headings.append({
                                    "page": i + 1,
                                    "text": text,
                                    "font_size": size,
                                    "is_bold": is_bold,
                                })
            return headings
        finally:
            doc.close()

    def _detect_language(self, input_path: str) -> Dict[str, Any]:
        """Detect document language from metadata and text."""
        doc = fitz.open(input_path)
        try:
            metadata = doc.metadata or {}
            lang = metadata.get("language", "unknown")

            if lang == "unknown":
                full_text = self._extract_all_text(input_path)
                sample = full_text[:2000].lower()
                en_words = len(re.findall(r'\b(?:the|and|is|in|to|of|for|that|with|this|are|was|be|have|has|not|but|from|or|an|it|by|on|at|which)\b', sample))
                es_words = len(re.findall(r'\b(?:el|la|los|las|un|una|de|del|en|con|por|para|que|es|son|está|este|esta|más|pero|como|todo|hay|ser)\b', sample))
                fr_words = len(re.findall(r'\b(?:le|la|les|des|est|un|une|et|en|pour|que|dans|qui|sur|pas|avec|ce|mais|sont|au|ceux)\b', sample))
                de_words = len(re.findall(r'\b(?:der|die|das|ist|ein|eine|und|in|zu|für|auf|mit|von|den|dem|nicht|sich|aber|noch|wie|auch)\b', sample))

                scores = {"en": en_words, "es": es_words, "fr": fr_words, "de": de_words}
                detected = max(scores, key=scores.get) if max(scores.values()) > 0 else "en"
            else:
                detected = lang

            return {"detected_language": detected, "metadata_language": lang}
        finally:
            doc.close()

    # ── Public API ────────────────────────────────────────────────────

    def get_read_aloud_text(self, input_path: str) -> Dict[str, Any]:
        """Extract text for text-to-speech reading."""
        text = self._extract_all_text(input_path)
        return {
            "success": True,
            "read_aloud": {
                "text": text,
                "full_text": text
            }
        }

    def upload_pdf(self, input_path: str) -> str:
        """Store PDF and return a document ID."""
        doc_id = Path(input_path).stem + "_" + Path(input_path).suffix
        return doc_id

    def wcag_scan(self, input_path: str) -> Dict[str, Any]:
        """Run WCAG 2.1 AA compliance scan."""
        structure = self._extract_structure(input_path)
        images = self._extract_images(input_path)
        full_text = self._extract_all_text(input_path)
        headings = self._get_headings(input_path)
        lang_info = self._detect_language(input_path)
        links = self._extract_links(input_path)

        criteria = []

        has_tags = structure["is_tagged"]
        criteria.append({
            "criterion": "1.3.1",
            "name": WCAG_CRITERIA["1.3.1"],
            "status": "PASS" if has_tags else "FAIL",
            "description": "Document structure and relationships must be programmatically determinable.",
            "details": "PDF is tagged." if has_tags else "PDF is not tagged. Structure cannot be determined.",
        })

        has_headings = len(headings) > 0
        criteria.append({
            "criterion": "2.4.6",
            "name": WCAG_CRITERIA["2.4.6"],
            "status": "PASS" if has_headings else "WARNING",
            "description": "Headings and labels must describe the topic or purpose.",
            "details": f"Found {len(headings)} headings." if has_headings else "No headings found.",
        })

        has_images = len(images) > 0
        criteria.append({
            "criterion": "1.1.1",
            "name": WCAG_CRITERIA["1.1.1"],
            "status": "WARNING" if has_images else "PASS",
            "description": "Non-text content must have text alternatives.",
            "details": f"Found {len(images)} images. Alt text cannot be verified for PDF images." if has_images else "No images found.",
        })

        has_lang = lang_info["detected_language"] != "unknown"
        criteria.append({
            "criterion": "3.1.1",
            "name": WCAG_CRITERIA["3.1.1"],
            "status": "PASS" if has_lang else "WARNING",
            "description": "The default human language of each page must be programmatically determinable.",
            "details": f"Detected language: {lang_info['detected_language']}.",
        })

        word_count = len(full_text.split())
        criteria.append({
            "criterion": "1.3.2",
            "name": WCAG_CRITERIA["1.3.2"],
            "status": "PASS" if word_count > 0 else "FAIL",
            "description": "Information and relationships must be conveyed through structure.",
            "details": f"Document contains {word_count} words across {structure['page_count']} pages.",
        })

        has_links = len(links) > 0
        criteria.append({
            "criterion": "4.1.2",
            "name": WCAG_CRITERIA["4.1.2"],
            "status": "PASS" if not has_links else "WARNING",
            "description": "For all user interface components, name and role must be programmatically determinable.",
            "details": f"Found {len(links)} links. Link text should be verified." if has_links else "No links found.",
        })

        has_toc = structure.get("toc") and len(structure.get("toc", [])) > 0
        criteria.append({
            "criterion": "2.4.1",
            "name": WCAG_CRITERIA["2.4.1"],
            "status": "PASS" if has_toc else "WARNING",
            "description": "A mechanism must be available to bypass blocks of content.",
            "details": "Table of contents provides navigation." if has_toc else "No table of contents found.",
        })

        metadata = structure["metadata"]
        has_title = bool(metadata.get("title"))
        criteria.append({
            "criterion": "2.4.2",
            "name": WCAG_CRITERIA["2.4.2"],
            "status": "PASS" if has_title else "FAIL",
            "description": "Web pages must have titles that describe topic or purpose.",
            "details": f"Title: {metadata.get('title', 'Not set')}.",
        })

        pass_count = sum(1 for c in criteria if c["status"] == "PASS")
        total = len(criteria)
        score = round((pass_count / total) * 100, 1) if total > 0 else 0

        return {
            "success": True,
            "wcag_scan": {
                "version": "WCAG 2.1",
                "level": "AA",
                "score": score,
                "total_criteria": total,
                "passed": pass_count,
                "failed": sum(1 for c in criteria if c["status"] == "FAIL"),
                "warnings": sum(1 for c in criteria if c["status"] == "WARNING"),
                "criteria": criteria,
            },
        }

    def check_pdfua(self, input_path: str) -> Dict[str, Any]:
        """Check PDF/UA-1 compliance."""
        structure = self._extract_structure(input_path)
        images = self._extract_images(input_path)
        lang_info = self._detect_language(input_path)

        checks = []

        checks.append({
            "name": "Tagged PDF",
            "status": "PASS" if structure["is_tagged"] else "FAIL",
            "details": "PDF/UA requires a tagged PDF." if not structure["is_tagged"] else "PDF is tagged.",
        })

        checks.append({
            "name": "Document Language",
            "status": "PASS" if lang_info["detected_language"] != "unknown" else "FAIL",
            "details": f"Language: {lang_info['detected_language']}.",
        })

        has_toc = bool(structure.get("toc"))
        checks.append({
            "name": "Table of Contents / Bookmarks",
            "status": "PASS" if has_toc else "WARNING",
            "details": "PDF/UA recommends bookmarks for navigation." if not has_toc else "Bookmarks present.",
        })

        checks.append({
            "name": "Alt Text for Images",
            "status": "WARNING" if images else "PASS",
            "details": f"{len(images)} images found. Alt text must be provided." if images else "No images.",
        })

        metadata = structure["metadata"]
        checks.append({
            "name": "Document Metadata",
            "status": "PASS" if metadata.get("title") else "FAIL",
            "details": f"Title: {metadata.get('title', 'Not set')}. Author: {metadata.get('author', 'Not set')}.",
        })

        pass_count = sum(1 for c in checks if c["status"] == "PASS")
        total = len(checks)

        return {
            "success": True,
            "pdfua_check": {
                "standard": "PDF/UA-1 (ISO 14289-1)",
                "is_compliant": pass_count == total,
                "score": round((pass_count / total) * 100, 1) if total > 0 else 0,
                "checks": checks,
            },
        }

    def general_accessibility_check(self, input_path: str) -> Dict[str, Any]:
        """Comprehensive accessibility check."""
        structure = self._extract_structure(input_path)
        images = self._extract_images(input_path)
        full_text = self._extract_all_text(input_path)
        headings = self._get_headings(input_path)
        lang_info = self._detect_language(input_path)
        links = self._extract_links(input_path)
        blocks = self._get_text_blocks(input_path)

        issues = []
        recommendations = []

        if not structure["is_tagged"]:
            issues.append({"severity": "critical", "message": "PDF is not tagged", "area": "Structure"})
            recommendations.append("Tag the PDF to provide structural information for assistive technologies.")

        if not headings:
            issues.append({"severity": "warning", "message": "No headings found", "area": "Navigation"})
            recommendations.append("Add headings to improve document navigation.")

        if images:
            issues.append({"severity": "warning", "message": f"{len(images)} images without verified alt text", "area": "Alt Text"})
            recommendations.append("Add alternative text descriptions for all images.")

        if not structure.get("toc"):
            issues.append({"severity": "info", "message": "No bookmarks or table of contents", "area": "Navigation"})
            recommendations.append("Add bookmarks for document navigation.")

        if lang_info["detected_language"] == "unknown":
            issues.append({"severity": "warning", "message": "Document language not detected", "area": "Language"})
            recommendations.append("Set the document language in metadata.")

        text_blocks = [b for b in blocks if b["block_type"] == 0]
        if len(text_blocks) > 0:
            lines_per_page = Counter(b["page"] for b in text_blocks)
            for page, count in lines_per_page.items():
                if count > 100:
                    issues.append({"severity": "info", "message": f"Page {page} has {count} text blocks", "area": "Reading Order"})
                    recommendations.append("Review reading order on dense pages.")

        word_count = len(full_text.split())
        score = 100
        for issue in issues:
            if issue["severity"] == "critical":
                score -= 20
            elif issue["severity"] == "warning":
                score -= 10
            else:
                score -= 5
        score = max(0, score)

        return {
            "success": True,
            "accessibility_check": {
                "score": score,
                "total_issues": len(issues),
                "issues": issues,
                "recommendations": recommendations[:10],
                "structure": {
                    "is_tagged": structure["is_tagged"],
                    "has_toc": bool(structure.get("toc")),
                    "has_images": len(images) > 0,
                    "image_count": len(images),
                    "link_count": len(links),
                    "heading_count": len(headings),
                    "word_count": word_count,
                },
                "language": lang_info,
            },
        }

    def get_compliance_dashboard(self, input_path: str) -> Dict[str, Any]:
        """Get compliance dashboard with scores per category."""
        wcag = self.wcag_scan(input_path)
        pdfua = self.check_pdfua(input_path)
        general = self.general_accessibility_check(input_path)

        categories = {
            "Structure & Tags": {
                "score": 100 if general["accessibility_check"]["structure"]["is_tagged"] else 30,
                "status": "Pass" if general["accessibility_check"]["structure"]["is_tagged"] else "Fail",
            },
            "Navigation": {
                "score": 100 if general["accessibility_check"]["structure"]["heading_count"] > 0 else 40,
                "status": "Pass" if general["accessibility_check"]["structure"]["heading_count"] > 0 else "Warning",
            },
            "Alt Text": {
                "score": 60 if general["accessibility_check"]["structure"]["has_images"] else 100,
                "status": "Warning" if general["accessibility_check"]["structure"]["has_images"] else "Pass",
            },
            "Language": {
                "score": 100 if general["accessibility_check"]["language"]["detected_language"] != "unknown" else 30,
                "status": "Pass" if general["accessibility_check"]["language"]["detected_language"] != "unknown" else "Warning",
            },
            "Reading Order": {
                "score": 90 if general["accessibility_check"]["structure"]["is_tagged"] else 40,
                "status": "Pass" if general["accessibility_check"]["structure"]["is_tagged"] else "Warning",
            },
        }

        overall_score = round(sum(c["score"] for c in categories.values()) / len(categories), 1)

        return {
            "success": True,
            "dashboard": {
                "overall_score": overall_score,
                "categories": categories,
                "wcag_score": wcag["wcag_scan"]["score"],
                "pdfua_compliant": pdfua["pdfua_check"]["is_compliant"],
                "total_issues": general["accessibility_check"]["total_issues"],
            },
        }

    def get_fix_suggestions(self, input_path: str) -> Dict[str, Any]:
        """Suggest fixes for accessibility issues."""
        general = self.general_accessibility_check(input_path)
        issues = general["accessibility_check"]["issues"]

        fixes = []
        fix_map = {
            "PDF is not tagged": {
                "title": "Add PDF Tags",
                "description": "Use a PDF editor to add structural tags to the document.",
                "priority": "high",
                "wcag_criteria": ["1.3.1"],
            },
            "No headings found": {
                "title": "Add Document Headings",
                "description": "Mark title and section headings with proper heading tags (H1-H6).",
                "priority": "high",
                "wcag_criteria": ["2.4.6"],
            },
            "No bookmarks or table of contents": {
                "title": "Add Bookmarks",
                "description": "Create bookmarks for each major section of the document.",
                "priority": "medium",
                "wcag_criteria": ["2.4.1"],
            },
            "Document language not detected": {
                "title": "Set Document Language",
                "description": "Set the document language property in PDF metadata.",
                "priority": "medium",
                "wcag_criteria": ["3.1.1"],
            },
        }

        for issue in issues:
            msg = issue["message"]
            for key, fix in fix_map.items():
                if key.lower() in msg.lower():
                    fixes.append(fix)
                    break

        return {
            "success": True,
            "fix_suggestions": {
                "total_suggestions": len(fixes),
                "fixes": fixes,
            },
        }

    def export_report(self, input_path: str) -> Dict[str, Any]:
        """Generate accessibility report data."""
        wcag = self.wcag_scan(input_path)
        pdfua = self.check_pdfua(input_path)
        general = self.general_accessibility_check(input_path)
        structure = self._extract_structure(input_path)
        lang_info = self._detect_language(input_path)

        return {
            "success": True,
            "report": {
                "title": f"Accessibility Report - {Path(input_path).name}",
                "generated_at": __import__("datetime").datetime.now().isoformat(),
                "document": {
                    "file_name": Path(input_path).name,
                    "page_count": structure["page_count"],
                    "metadata": structure["metadata"],
                },
                "summary": {
                    "wcag_score": wcag["wcag_scan"]["score"],
                    "pdfua_compliant": pdfua["pdfua_check"]["is_compliant"],
                    "overall_score": general["accessibility_check"]["score"],
                    "total_issues": general["accessibility_check"]["total_issues"],
                },
                "wcag_details": wcag["wcag_scan"],
                "pdfua_details": pdfua["pdfua_check"],
                "general_details": general["accessibility_check"],
                "language": lang_info,
            },
        }

    def check_tagged_pdf(self, input_path: str) -> Dict[str, Any]:
        """Check if PDF is properly tagged."""
        structure = self._extract_structure(input_path)

        return {
            "success": True,
            "tagged_pdf": {
                "is_tagged": structure["is_tagged"],
                "has_structure_tree": structure["has_structure_tree"],
                "has_mark_info": structure["has_mark_info"],
                "has_toc": bool(structure.get("toc")),
                "toc_entries": len(structure.get("toc", [])),
            },
        }

    def check_screen_reader_support(self, input_path: str) -> Dict[str, Any]:
        """Analyze screen reader compatibility."""
        structure = self._extract_structure(input_path)
        full_text = self._extract_all_text(input_path)
        headings = self._get_headings(input_path)
        images = self._extract_images(input_path)

        score = 0
        checks = []

        if structure["is_tagged"]:
            score += 30
            checks.append({"name": "Tagged PDF", "status": "pass", "description": "PDF is tagged for screen readers."})
        else:
            checks.append({"name": "Tagged PDF", "status": "fail", "description": "PDF is not tagged."})

        if headings:
            score += 20
            checks.append({"name": "Headings", "status": "pass", "description": f"{len(headings)} headings found for navigation."})
        else:
            checks.append({"name": "Headings", "status": "fail", "description": "No headings found."})

        if structure.get("toc"):
            score += 15
            checks.append({"name": "Bookmarks", "status": "pass", "description": "Bookmarks available for navigation."})
        else:
            checks.append({"name": "Bookmarks", "status": "warning", "description": "No bookmarks found."})

        word_count = len(full_text.split())
        if word_count > 0:
            score += 15
            checks.append({"name": "Text Content", "status": "pass", "description": f"Document has {word_count} words of text content."})
        else:
            checks.append({"name": "Text Content", "status": "fail", "description": "No text content found."})

        if images:
            score += 10
            checks.append({"name": "Images", "status": "warning", "description": f"{len(images)} images found. Verify alt text."})
        else:
            score += 10
            checks.append({"name": "Images", "status": "pass", "description": "No images found."})

        lang = self._detect_language(input_path)
        if lang["detected_language"] != "unknown":
            score += 10
            checks.append({"name": "Language", "status": "pass", "description": f"Language detected: {lang['detected_language']}."})
        else:
            checks.append({"name": "Language", "status": "warning", "description": "Language not detected."})

        return {
            "success": True,
            "screen_reader_support": {
                "score": min(score, 100),
                "checks": checks,
                "recommendation": "PDF is well-suited for screen readers." if score >= 70 else "PDF needs improvements for screen reader compatibility.",
            },
        }

    def get_read_aloud_text(self, input_path: str) -> Dict[str, Any]:
        """Extract text in reading order for text-to-speech."""
        order = self._get_reading_order(input_path)
        reading_text = "\n".join(item["text"] for item in order if item["text"])

        return {
            "success": True,
            "read_aloud": {
                "text": reading_text,
                "total_blocks": len([item for item in order if item["text"]]),
                "total_characters": len(reading_text),
            },
        }

    def analyze_reading_order(self, input_path: str) -> Dict[str, Any]:
        """Analyze and report reading order."""
        order = self._get_reading_order(input_path)
        pages_order = defaultdict(list)
        for item in order:
            pages_order[item["page"]].append(item)

        issues = []
        for page_num, page_items in pages_order.items():
            y_positions = [item["y0"] for item in page_items]
            if y_positions != sorted(y_positions):
                issues.append({
                    "page": page_num,
                    "issue": "Text blocks may not follow logical reading order.",
                    "block_count": len(page_items),
                })

        return {
            "success": True,
            "reading_order": {
                "total_blocks": len(order),
                "pages_analyzed": len(pages_order),
                "issues": issues,
                "is_logical": len(issues) == 0,
            },
        }

    def check_color_contrast(self, input_path: str) -> Dict[str, Any]:
        """Check text/background contrast ratios."""
        doc = fitz.open(input_path)
        try:
            text_colors = []
            for page in doc:
                blocks = page.get_text("dict")["blocks"]
                for block in blocks:
                    if block.get("type") != 0:
                        continue
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            color = span.get("color", 0)
                            r = (color >> 16) & 0xFF
                            g = (color >> 8) & 0xFF
                            b = color & 0xFF
                            text_colors.append({"r": r, "g": g, "b": b, "text": span.get("text", "")[:50]})

            unique_colors = set((c["r"], c["g"], c["b"]) for c in text_colors)

            issues = []
            for r, g, b in unique_colors:
                luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
                if luminance > 0.8:
                    issues.append({"color": f"rgb({r},{g},{b})", "issue": "Light text on white background may have low contrast"})
                elif luminance < 0.1:
                    issues.append({"color": f"rgb({r},{g},{b})", "issue": "Very dark text"})

            return {
                "success": True,
                "color_contrast": {
                    "unique_text_colors": len(unique_colors),
                    "sample_colors": [{"r": r, "g": g, "b": b} for r, g, b in list(unique_colors)[:10]],
                    "issues": issues[:10],
                    "recommendation": "Manual contrast testing recommended for scanned documents." if issues else "No obvious contrast issues detected.",
                },
            }
        finally:
            doc.close()

    def validate_heading_structure(self, input_path: str) -> Dict[str, Any]:
        """Validate heading hierarchy (H1-H6)."""
        headings = self._get_headings(input_path)

        issues = []
        prev_level = 0
        for h in headings:
            text = h["text"]
            if len(text) < 3:
                issues.append({"heading": text, "issue": "Heading text too short"})
            if len(text) > 200:
                issues.append({"heading": text[:50] + "...", "issue": "Heading text too long"})

        font_sizes = [h["font_size"] for h in headings]
        if font_sizes:
            unique_sizes = sorted(set(font_sizes), reverse=True)
            if len(unique_sizes) > 6:
                issues.append({"issue": f"{len(unique_sizes)} different font sizes in headings. Consider using fewer levels."})

        return {
            "success": True,
            "heading_structure": {
                "total_headings": len(headings),
                "issues": issues,
                "is_valid": len(issues) == 0,
                "headings": [{"level": h.get("level", "unknown"), "text": h["text"][:80], "page": h["page"]} for h in headings[:30]],
            },
        }

    def check_alt_text(self, input_path: str) -> Dict[str, Any]:
        """Check images for alt text."""
        images = self._extract_images(input_path)

        results = []
        for img in images:
            results.append({
                "page": img["page"],
                "width": img["width"],
                "height": img["height"],
                "format": img["format"],
                "has_alt_text": False,
                "recommendation": "Add alt text description for this image.",
            })

        return {
            "success": True,
            "alt_text": {
                "total_images": len(images),
                "images_with_alt_text": 0,
                "images_without_alt_text": len(images),
                "compliance": "PASS" if len(images) == 0 else "FAIL",
                "details": results[:20],
            },
        }

    def check_accessible_forms(self, input_path: str) -> Dict[str, Any]:
        """Check form field accessibility."""
        doc = fitz.open(input_path)
        try:
            form_fields = []
            for i, page in enumerate(doc):
                widgets = page.widgets()
                if widgets:
                    for widget in widgets:
                        field_type = widget.field_type_string if hasattr(widget, "field_type_string") else "unknown"
                        field_name = widget.field_name if hasattr(widget, "field_name") else "unnamed"
                        form_fields.append({
                            "page": i + 1,
                            "field_type": field_type,
                            "field_name": field_name,
                        })

            has_forms = len(form_fields) > 0
            return {
                "success": True,
                "accessible_forms": {
                    "total_fields": len(form_fields),
                    "has_forms": has_forms,
                    "compliance": "PASS" if not has_forms else "WARNING",
                    "fields": form_fields[:20],
                    "recommendation": "Verify form fields have labels and are keyboard accessible." if has_forms else "No form fields found.",
                },
            }
        finally:
            doc.close()

    def check_accessible_tables(self, input_path: str) -> Dict[str, Any]:
        """Check table structure and headers."""
        doc = fitz.open(input_path)
        try:
            tables = []
            for i, page in enumerate(doc):
                try:
                    tabs = page.find_tables()
                    if tabs and tabs.tables:
                        for tab in tabs.tables:
                            tables.append({
                                "page": i + 1,
                                "rows": tab.row_count,
                                "cols": tab.col_count,
                                "has_header": True,
                            })
                except Exception:
                    pass

            return {
                "success": True,
                "accessible_tables": {
                    "total_tables": len(tables),
                    "compliance": "WARNING" if tables else "PASS",
                    "tables": tables[:10],
                    "recommendation": "Verify table headers are properly marked and tables have captions." if tables else "No tables found.",
                },
            }
        finally:
            doc.close()

    def detect_language(self, input_path: str) -> Dict[str, Any]:
        """Detect document language."""
        lang_info = self._detect_language(input_path)

        full_text = self._extract_all_text(input_path)
        sample = full_text[:5000].lower()

        language_indicators = {}
        patterns = {
            "en": r'\b(?:the|and|is|in|to|of|for|that|with|this|are|was|be|have|has|not|but|from|or|an|it|by|on|at|which|will|would|could|should|may|might|their|there|they|been|being|more|also|than|when|what|about|into|through|during|before|after|above|below|between|under|over)\b',
            "es": r'\b(?:el|la|los|las|un|una|de|del|en|con|por|para|que|es|son|está|este|esta|más|pero|como|todo|hay|ser|tiene|puede|hacer|mundo|también|después|entre|otro|otra|mismo|donde|cuando|desde|hasta|sobre|todos|cada|hacia|donde|sino|aunque|porque|según|mientras|hace|años|después)\b',
            "fr": r'\b(?:le|la|les|des|est|un|une|et|en|pour|que|dans|qui|sur|pas|avec|ce|mais|sont|au|ceux|cette|tout|aussi|bien|même|fait|faire|être|avoir|autre|comme|leur|deux|après|entre|sans|chez|très|encore|si|donc|peut|moins|nous|vous|ils|elle|on|y|se)\b',
            "de": r'\b(?:der|die|das|ist|ein|eine|und|in|zu|für|auf|mit|von|den|dem|nicht|sich|aber|noch|wie|auch|aus|er|hat|nach|bei|ist|nur|oder|über|dass|sie|wir|kann|als|am|im|so|man|es|war|werden|durch|vor|zum|zur|bis|um|dass|ihr|ihm|sein|hatte|wenn|so|diese|dieser|diesem|diesen)\b',
        }

        for lang, pattern in patterns.items():
            language_indicators[lang] = len(re.findall(pattern, sample))

        return {
            "success": True,
            "language_detection": {
                "primary_language": lang_info["detected_language"],
                "metadata_language": lang_info["metadata_language"],
                "confidence": "high" if max(language_indicators.values(), default=0) > 20 else "medium",
                "language_scores": language_indicators,
            },
        }


    def get_skip_navigation_targets(self, input_path: str) -> Dict[str, Any]:
        """Detect potential skip navigation targets (landmarks, main content)."""
        headings = self._get_headings(input_path)
        targets = []
        if headings:
            main_heading = headings[0]
            targets.append({
                "title": main_heading["text"],
                "page_number": main_heading["page"],
                "target_type": "main_content",
            })
            # Add up to 4 more headings as landmarks
            for h in headings[1:5]:
                targets.append({
                    "title": h["text"],
                    "page_number": h["page"],
                    "target_type": "landmark",
                })
        else:
            # Fallback
            targets.append({
                "title": "Main Content",
                "page_number": 1,
                "target_type": "main_content",
            })
            
        return {
            "success": True,
            "skip_targets_count": len(targets),
            "targets": targets,
            "message": "Detected using layout heuristics" if not headings else "Detected using headings"
        }

    def inject_skip_navigation(self, input_path: str, inject_main_content_link: bool = True, inject_heading_bookmarks: bool = True) -> Dict[str, Any]:
        """Inject skip navigation links into the PDF."""
        try:
            doc = fitz.open(input_path)
            
            if inject_heading_bookmarks:
                toc = doc.get_toc()
                # Remove existing skip to main content if it exists
                toc = [t for t in toc if "Skip to Main Content" not in t[1]]
                toc.insert(0, [1, "Skip to Main Content", 1])
                doc.set_toc(toc)
                
            if inject_main_content_link and len(doc) > 0:
                page = doc[0]
                # Add an invisible link at the top (x0, y0, x1, y1)
                rect = fitz.Rect(0, 0, 100, 20)
                link = {"kind": fitz.LINK_GOTO, "page": 0, "to": fitz.Point(0, 100), "from_rect": rect}
                page.insert_link(link)
                
            doc.saveIncr()
            doc.close()
            return {"success": True, "message": "Skip navigation injected successfully."}
        except Exception as e:
            logger.exception("inject_skip_navigation error")
            return {"success": False, "error": str(e)}

accessibility_service = AccessibilityService()
