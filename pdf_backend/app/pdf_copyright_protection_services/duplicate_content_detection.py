"""
Duplicate Content Detection Service — PDF Copyright Protection Section.

Analyses PDF for duplicate or highly similar content within the document.
Detects duplicates on the same page and across different pages.
Uses n-gram fingerprinting and cosine similarity for accurate detection.
"""

from __future__ import annotations

import logging
import re
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024
MAX_FINDINGS = 200
NGRAM_SIZE = 3


class DuplicateContentDetectionService:
    """Detect duplicate and similar content within a PDF."""

    def _validate_pdf(self, pdf_bytes: bytes) -> None:
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError("File size exceeds the 200 MB limit.")
        if not pdf_bytes[:5].startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")

    def _normalize(self, text: str) -> str:
        text = text.lower().strip()
        text = re.sub(r'\s+', ' ', text)
        return text

    def _make_ngrams(self, text: str) -> Set[str]:
        normalized = self._normalize(text)
        words = normalized.split()
        if len(words) < NGRAM_SIZE:
            return {normalized} if normalized else set()
        ngrams = set()
        for i in range(len(words) - NGRAM_SIZE + 1):
            ngrams.add(" ".join(words[i:i + NGRAM_SIZE]))
        return ngrams

    def _jaccard(self, a: set, b: set) -> float:
        if not a or not b:
            return 0.0
        inter = len(a & b)
        union = len(a | b)
        return inter / union if union else 0.0

    def _extract_blocks(self, pdf_bytes: bytes) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Extract text at two levels: page-level chunks and sentence-level lines."""
        page_chunks = []
        sentences = []
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        for i, page in enumerate(doc):
            page_num = i + 1
            full_text = page.get_text()

            chunks = re.split(r'\n{2,}', full_text)
            if len(chunks) == 1:
                sub_chunks = re.split(r'(?<=[.!?])\s*\n', chunks[0])
                if len(sub_chunks) > 1:
                    chunks = sub_chunks
            for p in chunks:
                cleaned = p.strip()
                if len(cleaned) >= 15:
                    page_chunks.append({"text": cleaned, "page": page_num})

            lines = full_text.split('\n')
            for ln in lines:
                cleaned = ln.strip()
                if len(cleaned) >= 15:
                    sentences.append({"text": cleaned, "page": page_num})

        doc.close()
        return page_chunks, sentences

    def _find_exact_duplicates(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Find exact or near-exact text duplicates."""
        findings = []
        seen = {}
        for item in items:
            key = self._normalize(item["text"])
            if len(key) < 10:
                continue
            if key in seen:
                prev = seen[key]
                all_pages = sorted(set([prev["page"], item["page"]]))
                if len(all_pages) > 1:
                    loc = f"across pages {all_pages[0]} and {all_pages[1]}"
                else:
                    loc = f"on page {all_pages[0]}"
                findings.append({
                    "type": "exact_duplicate",
                    "text_preview": item["text"][:250],
                    "pages": all_pages,
                    "similarity": 100.0,
                    "length": len(item["text"]),
                    "message": f"Exact duplicate found {loc}.",
                })
                if len(findings) >= MAX_FINDINGS:
                    break
            else:
                seen[key] = item
        return findings

    def _find_similar_ngram(self, chunks: List[Dict[str, Any]], threshold: float = 0.60) -> List[Dict[str, Any]]:
        """Find similar content using n-gram fingerprinting — handles reworded content."""
        findings = []
        precomputed = []
        for c in chunks:
            ng = self._make_ngrams(c["text"])
            if ng:
                precomputed.append((c, ng))

        if len(precomputed) > 800:
            precomputed = precomputed[:800]

        reported = set()
        for i in range(len(precomputed)):
            c_i, ng_i = precomputed[i]
            for j in range(i + 1, len(precomputed)):
                c_j, ng_j = precomputed[j]

                min_size = min(len(ng_i), len(ng_j))
                if min_size == 0:
                    continue
                overlap = len(ng_i & ng_j)
                if overlap / min_size < 0.3:
                    continue

                sim = self._jaccard(ng_i, ng_j)
                if sim >= threshold:
                    all_pages = sorted(set([c_i["page"], c_j["page"]]))
                    report_key = tuple(all_pages)
                    if report_key in reported:
                        continue
                    reported.add(report_key)

                    if len(all_pages) == 1:
                        loc = f"on page {all_pages[0]}"
                    else:
                        loc = f"on pages {', '.join(str(p) for p in all_pages)}"

                    findings.append({
                        "type": "similar_content",
                        "text_preview": c_i["text"][:250],
                        "pages": all_pages,
                        "similarity": round(sim * 100, 1),
                        "length": len(c_i["text"]),
                        "message": f"Similar content ({sim*100:.1f}% match) {loc}.",
                    })
                    if len(findings) >= MAX_FINDINGS:
                        break
            if len(findings) >= MAX_FINDINGS:
                break
        return findings

    def _page_level_comparison(self, page_chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Compare overall page content for page-level similarity."""
        findings = []
        page_groups = defaultdict(list)
        for c in page_chunks:
            page_groups[c["page"]].append(c)
        pages = sorted(page_groups.keys())

        page_ngrams = {}
        for pg in pages:
            combined = " ".join(c["text"] for c in page_groups[pg])
            page_ngrams[pg] = self._make_ngrams(combined)

        compared = 0
        max_pairs = min(300, len(pages) * (len(pages) - 1) // 2)
        reported = set()
        for i in range(len(pages)):
            for j in range(i + 1, len(pages)):
                if compared >= max_pairs:
                    break
                pg_a, pg_b = pages[i], pages[j]
                ng_a, ng_b = page_ngrams[pg_a], page_ngrams[pg_b]
                if not ng_a or not ng_b:
                    continue
                sim = self._jaccard(ng_a, ng_b)
                compared += 1
                if sim >= 0.60:
                    pair_key = (pg_a, pg_b)
                    if pair_key in reported:
                        continue
                    reported.add(pair_key)
                    findings.append({
                        "type": "page_similarity",
                        "pages": [pg_a, pg_b],
                        "similarity": round(sim * 100, 1),
                        "message": f"Pages {pg_a} and {pg_b} are {sim*100:.1f}% similar overall.",
                    })
            if compared >= max_pairs:
                break
        return findings

    def analyze(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Perform full duplicate content analysis."""
        self._validate_pdf(pdf_bytes)
        page_chunks, sentences = self._extract_blocks(pdf_bytes)

        all_findings = []
        all_findings.extend(self._find_exact_duplicates(page_chunks))
        all_findings.extend(self._find_exact_duplicates(sentences))
        all_findings.extend(self._find_similar_ngram(page_chunks, threshold=0.60))
        all_findings.extend(self._page_level_comparison(page_chunks))

        seen_keys = set()
        deduped = []
        for f in all_findings:
            fkey = (f["type"], tuple(f["pages"]), f.get("similarity", 0))
            if fkey not in seen_keys:
                seen_keys.add(fkey)
                deduped.append(f)
        all_findings = deduped

        all_findings.sort(key=lambda x: x.get("similarity", 0), reverse=True)

        total_duplicates = sum(1 for f in all_findings if f.get("type") == "exact_duplicate")
        total_similar = sum(1 for f in all_findings if f.get("type") in ("similar_content", "page_similarity"))

        if total_duplicates >= 3 or total_similar >= 5:
            summary = "Significant Duplicate Content Detected"
        elif total_duplicates >= 1 or total_similar >= 2:
            summary = "Some Duplicate Content Found"
        else:
            summary = "No Significant Duplicates Found"

        return {
            "success": True,
            "summary": summary,
            "findings": all_findings[:MAX_FINDINGS],
            "total_paragraphs": len(page_chunks),
            "total_duplicates": total_duplicates,
            "total_similar": total_similar,
            "total_findings": len(all_findings),
            "message": f"Analysis complete: {summary}",
        }


duplicate_content_detection_service = DuplicateContentDetectionService()
