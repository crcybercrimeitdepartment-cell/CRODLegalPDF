"""
AI Smart Features Service — Text analysis and intelligent PDF processing.

Uses PyMuPDF (fitz) for all PDF operations and implements intelligent
text analysis for summarization, search, insights, and more.
"""

from __future__ import annotations

import logging
import re
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "shall", "can", "this",
    "that", "these", "those", "i", "me", "my", "we", "our", "you", "your",
    "he", "him", "his", "she", "her", "it", "its", "they", "them", "their",
    "what", "which", "who", "whom", "where", "when", "why", "how", "all",
    "each", "every", "both", "few", "more", "most", "other", "some", "such",
    "no", "not", "only", "own", "same", "so", "than", "too", "very", "just",
    "because", "if", "then", "else", "about", "up", "out", "into", "through",
    "during", "before", "after", "above", "below", "between", "under", "again",
    "further", "once", "here", "there", "also", "while", "against", "over",
}


class AISmartFeaturesService:
    """Service class for AI-powered smart PDF features."""

    # ── helpers ────────────────────────────────────────────────────────

    @staticmethod
    def _extract_all_text(input_path: str) -> str:
        """Extract all text from a PDF file."""
        doc = fitz.open(input_path)
        try:
            pages = []
            for page in doc:
                pages.append(page.get_text())
            return "\n".join(pages)
        finally:
            doc.close()

    @staticmethod
    def _extract_pages_text(input_path: str) -> List[Dict[str, Any]]:
        """Extract text from each page with metadata."""
        doc = fitz.open(input_path)
        try:
            result = []
            for i, page in enumerate(doc):
                text = page.get_text()
                result.append({
                    "page_number": i + 1,
                    "text": text,
                    "word_count": len(text.split()),
                    "char_count": len(text),
                })
            return result
        finally:
            doc.close()

    @staticmethod
    def _extract_blocks(input_path: str) -> List[Dict[str, Any]]:
        """Extract text blocks with position info from all pages."""
        doc = fitz.open(input_path)
        try:
            blocks = []
            for i, page in enumerate(doc):
                page_blocks = page.get_text("blocks")
                for b in page_blocks:
                    x0, y0, x1, y1, text, block_no, block_type = b
                    blocks.append({
                        "page": i + 1,
                        "x0": x0, "y0": y0, "x1": x1, "y1": y1,
                        "text": text.strip(),
                        "block_type": block_type,
                        "is_heading": block_type == 0 and (y1 - y0) > 20,
                    })
            return blocks
        finally:
            doc.close()

    @staticmethod
    def _extract_headings(input_path: str) -> List[Dict[str, Any]]:
        """Extract headings from document using font size analysis."""
        doc = fitz.open(input_path)
        try:
            headings = []
            font_sizes: Counter = Counter()
            spans_by_size: Dict[float, List[Dict[str, Any]]] = {}

            for page_num, page in enumerate(doc):
                blocks = page.get_text("dict")["blocks"]
                for block in blocks:
                    if block.get("type") != 0:
                        continue
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            text = span.get("text", "").strip()
                            if not text:
                                continue
                            size = round(span.get("size", 12), 1)
                            font_sizes[size] += 1
                            spans_by_size.setdefault(size, []).append({
                                "page": page_num + 1,
                                "text": text,
                                "font": span.get("font", ""),
                                "size": size,
                                "flags": span.get("flags", 0),
                            })

            if not font_sizes:
                return []

            sorted_sizes = sorted(font_sizes.keys(), reverse=True)
            top_sizes = sorted_sizes[:4]
            size_labels = {s: f"H{idx + 1}" for idx, s in enumerate(top_sizes)}

            for size in top_sizes:
                for span in spans_by_size.get(size, []):
                    headings.append({
                        "level": size_labels[size],
                        "text": span["text"],
                        "page": span["page"],
                        "font_size": span["size"],
                    })

            headings.sort(key=lambda h: (h["page"], -h["font_size"]))
            return headings
        finally:
            doc.close()

    @staticmethod
    def _get_keywords(text: str, top_n: int = 15) -> List[Dict[str, Any]]:
        """Extract top keywords from text."""
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        filtered = [w for w in words if w not in STOP_WORDS]
        freq = Counter(filtered)
        return [{"keyword": word, "count": count}
                for word, count in freq.most_common(top_n)]

    @staticmethod
    def _split_sentences(text: str) -> List[str]:
        """Split text into sentences."""
        return [s.strip() for s in re.split(r'[.!?]+', text) if len(s.strip()) > 10]

    @staticmethod
    def _sentence_scores(sentences: List[str], query_words: List[str]) -> List[Tuple[float, str]]:
        """Score sentences by relevance to query keywords."""
        scored = []
        for sent in sentences:
            words = set(re.findall(r'\b\w+\b', sent.lower()))
            score = sum(1 for q in query_words if q.lower() in words)
            if score > 0:
                scored.append((score, sent))
        scored.sort(key=lambda x: -x[0])
        return scored

    # ── public API ────────────────────────────────────────────────────

    def chat_with_pdf(self, input_path: str, message: str) -> Dict[str, Any]:
        """Chat with PDF content — find relevant text based on user message."""
        doc = fitz.open(input_path)
        try:
            full_text = ""
            page_texts = []
            for page in doc:
                t = page.get_text()
                page_texts.append(t)
                full_text += t + "\n"

            query_words = [w for w in re.findall(r'\b\w+\b', message.lower()) if w not in STOP_WORDS and len(w) > 2]
            if not query_words:
                query_words = re.findall(r'\b\w+\b', message.lower())

            relevant = []
            for i, pt in enumerate(page_texts):
                pt_lower = pt.lower()
                matches = sum(1 for w in query_words if w in pt_lower)
                if matches > 0:
                    sentences = self._split_sentences(pt)
                    scored = self._sentence_scores(sentences, query_words)
                    for score, sent in scored[:3]:
                        relevant.append({
                            "page": i + 1,
                            "text": sent,
                            "relevance_score": score,
                        })

            relevant.sort(key=lambda x: -x["relevance_score"])

            if relevant:
                answer_parts = [f"[Page {r['page']}] {r['text']}" for r in relevant[:5]]
                answer = " ".join(answer_parts)
            else:
                answer = "I found the following relevant information in the document:\n" + full_text[:500]

            return {
                "success": True,
                "answer": answer,
                "pages_found": len(set(r["page"] for r in relevant)),
                "total_matches": len(relevant),
                "query": message,
            }
        finally:
            doc.close()

    def summarize(self, input_path: str) -> Dict[str, Any]:
        """Create an extractive summary of the document."""
        pages = self._extract_pages_text(input_path)
        headings = self._extract_headings(input_path)

        total_words = sum(p["word_count"] for p in pages)
        total_chars = sum(p["char_count"] for p in pages)

        summary_sentences = []
        for p in pages[:3]:
            sentences = self._split_sentences(p["text"])
            summary_sentences.extend(sentences[:3])

        key_sentences = summary_sentences[:10]

        paragraphs = []
        for p in pages:
            paras = [para.strip() for para in p["text"].split("\n\n") if len(para.strip()) > 50]
            paragraphs.extend(paras[:2])

        return {
            "success": True,
            "summary": {
                "overview": " ".join(key_sentences) if key_sentences else "No content available.",
                "total_pages": len(pages),
                "total_words": total_words,
                "total_characters": total_chars,
                "headings_count": len(headings),
                "sections": [h["text"] for h in headings[:10]],
                "key_paragraphs": paragraphs[:5],
            },
        }

    def ocr_extract(self, input_path: str) -> Dict[str, Any]:
        """Extract all text from PDF pages."""
        pages = self._extract_pages_text(input_path)
        full_text = "\n\n".join(
            f"--- Page {p['page_number']} ---\n{p['text']}" for p in pages
        )
        return {
            "success": True,
            "extracted_text": full_text,
            "page_count": len(pages),
            "total_characters": sum(p["char_count"] for p in pages),
            "total_words": sum(p["word_count"] for p in pages),
            "pages": [{"page_number": p["page_number"], "text": p["text"], "word_count": p["word_count"]} for p in pages],
        }

    def semantic_search(self, input_path: str, query: str) -> Dict[str, Any]:
        """Search for query terms and return matching paragraphs with context."""
        blocks = self._extract_blocks(input_path)
        query_words = [w.lower() for w in re.findall(r'\b\w+\b', query) if len(w) > 2]
        if not query_words:
            query_words = [w.lower() for w in re.findall(r'\b\w+\b', query)]

        matches = []
        for block in blocks:
            text = block.get("text", "")
            if not text or block.get("block_type") != 0:
                continue
            text_lower = text.lower()
            hit_count = sum(1 for w in query_words if w in text_lower)
            if hit_count > 0:
                matches.append({
                    "page": block["page"],
                    "text": text,
                    "relevance_score": hit_count,
                    "position": {"x0": block["x0"], "y0": block["y0"], "x1": block["x1"], "y1": block["y1"]},
                })

        matches.sort(key=lambda m: -m["relevance_score"])
        return {
            "success": True,
            "query": query,
            "total_matches": len(matches),
            "results": matches[:20],
        }

    def get_document_insights(self, input_path: str) -> Dict[str, Any]:
        """Analyze document structure and provide insights."""
        doc = fitz.open(input_path)
        try:
            pages = self._extract_pages_text(input_path)
            headings = self._extract_headings(input_path)
            full_text = self._extract_all_text(input_path)
            keywords = self._get_keywords(full_text)
            blocks = self._extract_blocks(input_path)

            total_words = sum(p["word_count"] for p in pages)
            avg_words_per_page = total_words / len(pages) if pages else 0

            has_images = False
            image_count = 0
            for page in doc:
                img_list = page.get_images()
                if img_list:
                    has_images = True
                    image_count += len(img_list)

            annotations = 0
            links = 0
            for page in doc:
                annotations += len(page.annots() or [])
                links += len(page.get_links())

            reading_time_minutes = round(total_words / 200, 1)
            sentences = self._split_sentences(full_text)
            avg_sentence_length = round(total_words / max(len(sentences), 1), 1)

            return {
                "success": True,
                "insights": {
                    "page_count": len(pages),
                    "word_count": total_words,
                    "character_count": sum(p["char_count"] for p in pages),
                    "sentence_count": len(sentences),
                    "avg_words_per_page": round(avg_words_per_page, 1),
                    "avg_sentence_length": avg_sentence_length,
                    "reading_time_minutes": reading_time_minutes,
                    "heading_count": len(headings),
                    "headings": [h["text"] for h in headings[:20]],
                    "top_keywords": keywords,
                    "has_images": has_images,
                    "image_count": image_count,
                    "annotation_count": annotations,
                    "link_count": links,
                    "text_block_count": len([b for b in blocks if b["block_type"] == 0]),
                },
            }
        finally:
            doc.close()

    def contract_summary(self, input_path: str) -> Dict[str, Any]:
        """Extract contract-specific information: parties, dates, key terms."""
        full_text = self._extract_all_text(input_path)

        date_pattern = r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b'
        dates = list(set(re.findall(date_pattern, full_text)))

        party_patterns = [
            r'(?:between|by and between|entered into by)\s+(.{5,80}?)(?:\s+(?:and|with|,))',
            r'(?:Party|Party A|Party B|Licensor|Licensee|Buyer|Seller|Tenant|Landlord|Employer|Employee|Company|Client|Contractor|Provider|Recipient)[:\s]+(.{3,100})',
        ]
        parties = []
        for pat in party_patterns:
            found = re.findall(pat, full_text, re.IGNORECASE)
            parties.extend([p.strip() for p in found])
        parties = list(set(parties))[:10]

        obligation_keywords = ["shall", "must", "agree", "obligated", "required", "warrant", "covenant"]
        obligations = []
        for sent in self._split_sentences(full_text):
            if any(kw in sent.lower() for kw in obligation_keywords):
                obligations.append(sent.strip())

        return {
            "success": True,
            "contract_summary": {
                "parties": parties,
                "dates": dates,
                "key_terms": obligations[:15],
                "total_obligations": len(obligations),
                "document_type": "contract" if parties else "general",
                "sections": [h["text"] for h in self._extract_headings(input_path)[:15]],
            },
        }

    def meeting_summary(self, input_path: str) -> Dict[str, Any]:
        """Extract action items, decisions, and attendees from meeting notes."""
        full_text = self._extract_all_text(input_path)

        action_patterns = [
            r'(?:action item|todo|task|assign(?:ed)?|follow.?up)[:\s]*(.{10,200})',
            r'(?:will|should|needs? to|must|shall)\s+(.{10,200})',
        ]
        action_items = []
        for pat in action_patterns:
            found = re.findall(pat, full_text, re.IGNORECASE)
            action_items.extend(found)

        decision_patterns = [
            r'(?:decided|decision|agreed|resolved|approved)[:\s]*(.{10,200})',
        ]
        decisions = []
        for pat in decision_patterns:
            found = re.findall(pat, full_text, re.IGNORECASE)
            decisions.extend(found)

        name_pattern = r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b'
        potential_names = re.findall(name_pattern, full_text)
        attendees = list(set(potential_names))[:20]

        return {
            "success": True,
            "meeting_summary": {
                "action_items": [a.strip() for a in action_items[:15]],
                "decisions": [d.strip() for d in decisions[:10]],
                "attendees": attendees,
                "total_action_items": len(action_items),
                "total_decisions": len(decisions),
                "summary": self._split_sentences(full_text)[:5],
            },
        }

    def research_assistant(self, input_path: str, query: str) -> Dict[str, Any]:
        """Find and extract relevant sections for a research query."""
        blocks = self._extract_blocks(input_path)
        headings = self._extract_headings(input_path)

        query_words = [w.lower() for w in re.findall(r'\b\w+\b', query) if len(w) > 2]
        if not query_words:
            query_words = [w.lower() for w in re.findall(r'\b\w+\b', query)]

        relevant_sections = []
        current_section = {"heading": "Introduction", "text": "", "relevance": 0}

        for block in blocks:
            text = block.get("text", "").strip()
            if not text or block.get("block_type") != 0:
                continue

            if block.get("is_heading") and len(text) > 2:
                if current_section["text"]:
                    relevant_sections.append(current_section)
                current_section = {"heading": text, "text": "", "relevance": 0}

            text_lower = text.lower()
            hits = sum(1 for w in query_words if w in text_lower)
            if hits > 0:
                current_section["text"] += text + " "
                current_section["relevance"] += hits

        if current_section["text"]:
            relevant_sections.append(current_section)

        relevant_sections.sort(key=lambda s: -s["relevance"])

        return {
            "success": True,
            "query": query,
            "relevant_sections": [
                {"heading": s["heading"], "text": s["text"].strip()[:1000], "relevance_score": s["relevance"]}
                for s in relevant_sections[:10]
            ],
            "total_sections_found": len(relevant_sections),
        }

    def extract_key_points(self, input_path: str) -> Dict[str, Any]:
        """Extract bullet points from headings and lists."""
        headings = self._extract_headings(input_path)
        full_text = self._extract_all_text(input_path)

        bullet_points = []
        for line in full_text.split("\n"):
            stripped = line.strip()
            if re.match(r'^[\-\•\*\►\‣\⁃]\s+', stripped):
                bullet_points.append(stripped)
            elif re.match(r'^\d+[\.\)]\s+', stripped):
                bullet_points.append(stripped)

        key_sentences = []
        for sent in self._split_sentences(full_text):
            if any(kw in sent.lower() for kw in ["important", "key", "significant", "critical", "essential", "note", "summary", "conclusion"]):
                key_sentences.append(sent.strip())

        return {
            "success": True,
            "key_points": {
                "headings": [{"level": h["level"], "text": h["text"], "page": h["page"]} for h in headings[:30]],
                "bullet_points": bullet_points[:30],
                "key_sentences": key_sentences[:15],
                "total_bullets": len(bullet_points),
                "total_headings": len(headings),
            },
        }

    def answer_questions(self, input_path: str, question: str) -> Dict[str, Any]:
        """Find relevant text to answer a question about the document."""
        full_text = self._extract_all_text(input_path)
        question_words = [w.lower() for w in re.findall(r'\b\w+\b', question) if len(w) > 2]
        if not question_words:
            question_words = [w.lower() for w in re.findall(r'\b\w+\b', question)]

        sentences = self._split_sentences(full_text)
        scored = self._sentence_scores(sentences, question_words)

        answer_parts = []
        for _, sent in scored[:5]:
            answer_parts.append(sent.strip())

        return {
            "success": True,
            "question": question,
            "answer": " ".join(answer_parts) if answer_parts else "No directly relevant answer found in the document.",
            "confidence": "high" if scored and scored[0][0] >= 3 else "medium" if scored else "low",
            "sources": [{"text": s[:200]} for _, s in scored[:3]],
        }

    def translate_content(self, input_path: str, target_language: str) -> Dict[str, Any]:
        """Extract text for translation. Frontend handles actual translation."""
        pages = self._extract_pages_text(input_path)
        full_text = "\n\n".join(
            f"--- Page {p['page_number']} ---\n{p['text']}" for p in pages
        )
        return {
            "success": True,
            "source_text": full_text,
            "target_language": target_language,
            "page_count": len(pages),
            "total_characters": sum(p["char_count"] for p in pages),
        }

    def simplify_document(self, input_path: str) -> Dict[str, Any]:
        """Simplify complex sentences and provide readability info."""
        full_text = self._extract_all_text(input_path)
        sentences = self._split_sentences(full_text)

        complex_sentences = []
        simple_sentences = []
        for sent in sentences:
            words = sent.split()
            if len(words) > 25:
                complex_sentences.append({
                    "original": sent.strip(),
                    "word_count": len(words),
                    "suggestion": f"Consider splitting into shorter sentences. ({len(words)} words)",
                })
            else:
                simple_sentences.append(sent.strip())

        avg_word_length = sum(len(w) for w in full_text.split()) / max(len(full_text.split()), 1)

        return {
            "success": True,
            "simplified": {
                "total_sentences": len(sentences),
                "complex_sentences_count": len(complex_sentences),
                "simple_sentences_count": len(simple_sentences),
                "complexity_score": round(avg_word_length, 2),
                "readability_level": "complex" if avg_word_length > 6 else "moderate" if avg_word_length > 4.5 else "simple",
                "complex_sentences": complex_sentences[:15],
                "sample_simple_text": " ".join(simple_sentences[:5]),
            },
        }

    def grammar_check(self, input_path: str) -> Dict[str, Any]:
        """Identify potential grammar issues in the document text."""
        full_text = self._extract_all_text(input_path)
        sentences = self._split_sentences(full_text)

        suggestions = []
        for sent in sentences:
            words = sent.split()
            if len(words) < 2:
                continue
            if re.search(r'\b(there|their|they\'re)\b', sent.lower()):
                suggestions.append({
                    "text": sent[:150],
                    "type": "homophone",
                    "message": "Possible homophone confusion detected.",
                    "severity": "warning",
                })
            if re.search(r'\b(\w+)\s+\1\b', sent, re.IGNORECASE):
                match = re.search(r'\b(\w+)\s+\1\b', sent, re.IGNORECASE)
                suggestions.append({
                    "text": sent[:150],
                    "type": "repetition",
                    "message": f"Repeated word: '{match.group(1)}'.",
                    "severity": "info",
                })
            if words[0][0].islower() and len(sent) > 20:
                suggestions.append({
                    "text": sent[:150],
                    "type": "capitalization",
                    "message": "Sentence may not start with a capital letter.",
                    "severity": "info",
                })

        return {
            "success": True,
            "grammar_check": {
                "total_sentences": len(sentences),
                "total_words": len(full_text.split()),
                "suggestions_count": len(suggestions),
                "suggestions": suggestions[:20],
            },
        }

    def writing_enhancement(self, input_path: str) -> Dict[str, Any]:
        """Provide writing improvement suggestions."""
        full_text = self._extract_all_text(input_path)
        words = full_text.split()
        sentences = self._split_sentences(full_text)

        word_freq = Counter(w.lower() for w in words if len(w) > 3 and w.lower() not in STOP_WORDS)
        repeated_words = [w for w, c in word_freq.most_common(20) if c > 5]

        passive_pattern = re.compile(r'\b(?:is|are|was|were|be|been|being)\s+\w+ed\b', re.IGNORECASE)
        passive_count = len(passive_pattern.findall(full_text))

        long_sentences = [s.strip() for s in sentences if len(s.split()) > 30]
        short_sentences = [s.strip() for s in sentences if len(s.split()) < 5 and len(s.strip()) > 3]

        return {
            "success": True,
            "writing_enhancement": {
                "total_words": len(words),
                "total_sentences": len(sentences),
                "avg_words_per_sentence": round(len(words) / max(len(sentences), 1), 1),
                "passive_voice_count": passive_count,
                "long_sentences": [{"text": s[:200], "word_count": len(s.split())} for s in long_sentences[:10]],
                "short_sentences": [{"text": s[:200]} for s in short_sentences[:5]],
                "repeated_words": repeated_words[:10],
                "suggestions": [
                    {"type": "passive_voice", "message": f"Found {passive_count} passive voice instances. Consider using active voice."} if passive_count > 3 else None,
                    {"type": "sentence_length", "message": f"Found {len(long_sentences)} sentences over 30 words. Consider breaking them up."} if long_sentences else None,
                    {"type": "repetition", "message": f"Words repeated frequently: {', '.join(repeated_words[:5])}"} if repeated_words else None,
                ],
            },
        }

    def multi_doc_chat(self, file_paths: List[str], message: str) -> Dict[str, Any]:
        """Analyze multiple PDFs and answer a question about all of them."""
        documents = []
        for fp in file_paths:
            if not Path(fp).exists():
                continue
            doc = fitz.open(fp)
            try:
                full_text = ""
                for page in doc:
                    full_text += page.get_text() + "\n"
                documents.append({
                    "file": Path(fp).name,
                    "text": full_text,
                    "word_count": len(full_text.split()),
                })
            finally:
                doc.close()

        all_text = "\n".join(d["text"] for d in documents)
        query_words = [w.lower() for w in re.findall(r'\b\w+\b', message) if len(w) > 2]
        if not query_words:
            query_words = [w.lower() for w in re.findall(r'\b\w+\b', message)]

        doc_results = []
        for doc_info in documents:
            sentences = self._split_sentences(doc_info["text"])
            scored = self._sentence_scores(sentences, query_words)
            relevant = [{"text": s[:300], "score": sc} for sc, s in scored[:3]]
            doc_results.append({
                "file": doc_info["file"],
                "word_count": doc_info["word_count"],
                "relevant_segments": relevant,
            })

        return {
            "success": True,
            "documents_analyzed": len(documents),
            "query": message,
            "results": doc_results,
        }

    def workflow_automation(self, input_path: str) -> Dict[str, Any]:
        """Suggest workflow actions based on document analysis."""
        headings = self._extract_headings(input_path)
        full_text = self._extract_all_text(input_path)
        insights = self.get_document_insights(input_path)["insights"]

        actions = []
        if insights["has_images"]:
            actions.append({"action": "Extract Images", "description": "Document contains images that can be extracted.", "category": "extraction"})
        if insights["link_count"] > 0:
            actions.append({"action": "Extract Links", "description": f"Found {insights['link_count']} hyperlinks.", "category": "extraction"})
        if insights["annotation_count"] > 0:
            actions.append({"action": "Export Annotations", "description": f"Document has {insights['annotation_count']} annotations.", "category": "review"})

        if any("contract" in h["text"].lower() for h in headings):
            actions.append({"action": "Contract Analysis", "description": "Document appears to be a contract. Run contract analysis.", "category": "analysis"})
        if any("meeting" in h["text"].lower() for h in headings):
            actions.append({"action": "Meeting Summary", "description": "Document appears to be meeting notes.", "category": "summary"})
        if any("research" in h["text"].lower() or "analysis" in h["text"].lower() for h in headings):
            actions.append({"action": "Research Analysis", "description": "Document appears to be research material.", "category": "analysis"})

        actions.append({"action": "Create Summary", "description": "Generate a document summary.", "category": "summary"})
        actions.append({"action": "Extract Key Points", "description": "Extract key points and bullet lists.", "category": "extraction"})
        actions.append({"action": "Check Accessibility", "description": "Run accessibility compliance check.", "category": "compliance"})

        return {
            "success": True,
            "workflow": {
                "suggested_actions": actions,
                "document_type": "contract" if any("contract" in h["text"].lower() for h in headings) else "general",
                "page_count": insights["page_count"],
                "complexity": "high" if insights["word_count"] > 5000 else "medium" if insights["word_count"] > 1000 else "low",
            },
        }


ai_smart_features_service = AISmartFeaturesService()
