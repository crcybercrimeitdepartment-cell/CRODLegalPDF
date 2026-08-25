"""
AI Content Similarity Check Service — PDF Copyright Protection Section.

Performs local text similarity analysis on PDF content.
"""

from __future__ import annotations

import json
import logging
import math
import re
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024
CHUNK_SIZE = 500


class AIContentSimilarityService:
    """Perform content similarity analysis on PDF text."""

    def _validate_pdf(self, pdf_bytes: bytes) -> None:
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError("File size exceeds the 200 MB limit.")
        if not pdf_bytes[:5].startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")

    def _extract_text(self, pdf_bytes: bytes) -> List[Dict[str, Any]]:
        chunks = []
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for i, page in enumerate(doc):
            text = page.get_text().strip()
            if text:
                words = text.split()
                for start in range(0, len(words), CHUNK_SIZE):
                    chunk_text = " ".join(words[start:start + CHUNK_SIZE])
                    if len(chunk_text) > 50:
                        chunks.append({
                            "text": chunk_text,
                            "page": i + 1,
                            "chunk_index": len(chunks),
                            "word_count": len(chunk_text.split()),
                        })
        doc.close()
        return chunks

    def _normalize(self, text: str) -> str:
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def _cosine_similarity(self, a: str, b: str) -> float:
        words_a = self._normalize(a).split()
        words_b = self._normalize(b).split()
        if not words_a or not words_b:
            return 0.0
        freq_a = Counter(words_a)
        freq_b = Counter(words_b)
        all_words = set(freq_a.keys()) | set(freq_b.keys())
        dot_product = sum(freq_a.get(w, 0) * freq_b.get(w, 0) for w in all_words)
        mag_a = math.sqrt(sum(v * v for v in freq_a.values()))
        mag_b = math.sqrt(sum(v * v for v in freq_b.values()))
        if mag_a == 0 or mag_b == 0:
            return 0.0
        return dot_product / (mag_a * mag_b)

    def _jaccard_similarity(self, a: str, b: str) -> float:
        set_a = set(self._normalize(a).split())
        set_b = set(self._normalize(b).split())
        if not set_a or not set_b:
            return 0.0
        intersection = set_a & set_b
        union = set_a | set_b
        return len(intersection) / len(union) if union else 0.0

    def _compute_combined_similarity(self, a: str, b: str) -> float:
        cosine = self._cosine_similarity(a, b)
        jaccard = self._jaccard_similarity(a, b)
        return (cosine * 0.6 + jaccard * 0.4)

    def analyze(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Perform full content similarity analysis."""
        self._validate_pdf(pdf_bytes)
        chunks = self._extract_text(pdf_bytes)
        if len(chunks) < 2:
            return {
                "success": True,
                "overall_similarity": 0.0,
                "similarity_level": "N/A",
                "similar_sections": [],
                "total_chunks": len(chunks),
                "message": "Not enough content for similarity analysis.",
            }
        similar_pairs = []
        checked = set()
        for i in range(len(chunks)):
            for j in range(i + 1, len(chunks)):
                key = (chunks[i]["chunk_index"], chunks[j]["chunk_index"])
                if key in checked:
                    continue
                checked.add(key)
                if chunks[i]["page"] == chunks[j]["page"]:
                    continue
                sim = self._compute_combined_similarity(chunks[i]["text"], chunks[j]["text"])
                if sim >= 0.5:
                    similar_pairs.append({
                        "chunk_a": {"page": chunks[i]["page"], "preview": chunks[i]["text"][:200], "word_count": chunks[i]["word_count"]},
                        "chunk_b": {"page": chunks[j]["page"], "preview": chunks[j]["text"][:200], "word_count": chunks[j]["word_count"]},
                        "similarity": round(sim * 100, 1),
                        "cosine": round(self._cosine_similarity(chunks[i]["text"], chunks[j]["text"]) * 100, 1),
                        "jaccard": round(self._jaccard_similarity(chunks[i]["text"], chunks[j]["text"]) * 100, 1),
                    })
        similar_pairs.sort(key=lambda x: x["similarity"], reverse=True)
        if similar_pairs:
            overall = sum(p["similarity"] for p in similar_pairs) / len(similar_pairs)
        else:
            overall = 0.0
        if overall >= 70:
            level = "High"
        elif overall >= 40:
            level = "Medium"
        elif overall > 0:
            level = "Low"
        else:
            level = "None"
        return {
            "success": True,
            "overall_similarity": round(overall, 1),
            "similarity_level": level,
            "similar_sections": similar_pairs[:20],
            "total_chunks_analyzed": len(chunks),
            "total_similar_pairs": len(similar_pairs),
            "message": f"Similarity analysis complete. Overall: {level} ({overall:.1f}%)",
            "disclaimer": "Similarity analysis is an analytical indicator. It does not establish legal copyright infringement or plagiarism.",
        }


ai_content_similarity_service = AIContentSimilarityService()
