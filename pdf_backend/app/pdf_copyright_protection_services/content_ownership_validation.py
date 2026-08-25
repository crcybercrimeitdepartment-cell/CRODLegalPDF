"""
Content Ownership Validation Service — PDF Copyright Protection Section.

Validates ownership information from PDF metadata and application copyright records.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024


class ContentOwnershipValidationService:
    """Validate content ownership by comparing PDF metadata with existing records."""

    def _validate_pdf(self, pdf_bytes: bytes) -> None:
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError("File size exceeds the 200 MB limit.")
        if not pdf_bytes[:5].startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")

    def _compute_hash(self, pdf_bytes: bytes) -> str:
        return hashlib.sha256(pdf_bytes).hexdigest()

    def _extract_pdf_metadata(self, pdf_bytes: bytes) -> Dict[str, Any]:
        result: Dict[str, Any] = {}
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            meta = doc.metadata or {}
            result["author"] = str(meta.get("author", "")).strip()
            result["creator"] = str(meta.get("creator", "")).strip()
            result["producer"] = str(meta.get("producer", "")).strip()
            result["title"] = str(meta.get("title", "")).strip()
            result["subject"] = str(meta.get("subject", "")).strip()
            result["keywords"] = str(meta.get("keywords", "")).strip()
            result["creation_date"] = str(meta.get("creationDate", "")).strip()
            result["modification_date"] = str(meta.get("modDate", "")).strip()
            custom_keys = [
                "copyright_holders", "license_information", "copyright_metadata",
                "copyright_registration", "ownership_information", "document_identifier",
            ]
            for key in custom_keys:
                raw = meta.get(key, "") or ""
                if raw:
                    try:
                        result[key] = json.loads(raw)
                    except (json.JSONDecodeError, TypeError):
                        result[key] = raw
                else:
                    result[key] = None
            text = ""
            for page in doc:
                text += page.get_text()
            result["text_preview"] = text[:10000]
            result["total_pages"] = doc.page_count
            result["file_size"] = len(pdf_bytes)
            doc.close()
        except Exception as e:
            logger.warning(f"PDF metadata extraction error: {e}")
        return result

    def _detect_ownership_evidence(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        evidence: Dict[str, Any] = {
            "author_creator": {"found": False, "value": None, "source": "PDF Metadata"},
            "title": {"found": False, "value": None, "source": "PDF Metadata"},
            "copyright_notice": {"found": False, "value": None, "source": "PDF Metadata"},
            "producer": {"found": False, "value": None, "source": "PDF Metadata"},
            "creation_date": {"found": False, "value": None, "source": "PDF Metadata"},
            "modification_date": {"found": False, "value": None, "source": "PDF Metadata"},
            "ownership_info": {"found": False, "value": None, "source": "Application Records"},
            "document_hash": {"found": False, "value": None, "source": "Computed"},
            "copyright_holders": {"found": False, "value": None, "source": "Application Records"},
            "license_info": {"found": False, "value": None, "source": "Application Records"},
            "registration_info": {"found": False, "value": None, "source": "Application Records"},
        }
        author = metadata.get("author", "")
        creator = metadata.get("creator", "")
        if author or creator:
            evidence["author_creator"]["found"] = True
            evidence["author_creator"]["value"] = author or creator
            if author and creator and author != creator:
                evidence["author_creator"]["extra"] = f"Author: {author}, Creator: {creator}"
        title = metadata.get("title", "")
        if title:
            evidence["title"]["found"] = True
            evidence["title"]["value"] = title
        text_preview = metadata.get("text_preview", "")
        copyright_match = re.search(
            r"(?:©|\(c\)|copyright)\s*[\d\w\s,.-]+", text_preview, re.IGNORECASE
        )
        if copyright_match:
            evidence["copyright_notice"]["found"] = True
            evidence["copyright_notice"]["value"] = copyright_match.group(0).strip()
        producer = metadata.get("producer", "")
        if producer:
            evidence["producer"]["found"] = True
            evidence["producer"]["value"] = producer
        creation_date = metadata.get("creation_date", "")
        if creation_date:
            evidence["creation_date"]["found"] = True
            evidence["creation_date"]["value"] = creation_date
        modification_date = metadata.get("modification_date", "")
        if modification_date:
            evidence["modification_date"]["found"] = True
            evidence["modification_date"]["value"] = modification_date
        ownership_info = metadata.get("ownership_information")
        if ownership_info:
            evidence["ownership_info"]["found"] = True
            evidence["ownership_info"]["value"] = ownership_info
        copyright_holders = metadata.get("copyright_holders")
        if copyright_holders:
            evidence["copyright_holders"]["found"] = True
            evidence["copyright_holders"]["value"] = copyright_holders
        license_info = metadata.get("license_information")
        if license_info:
            evidence["license_info"]["found"] = True
            evidence["license_info"]["value"] = license_info
        registration_info = metadata.get("copyright_registration")
        if registration_info:
            evidence["registration_info"]["found"] = True
            evidence["registration_info"]["value"] = registration_info
        return evidence

    def _determine_validation_status(self, evidence: Dict[str, Any], claimed_owner: str) -> Dict[str, Any]:
        matched: List[Dict[str, Any]] = []
        mismatched: List[Dict[str, Any]] = []
        missing: List[Dict[str, Any]] = []
        for field, info in evidence.items():
            if info["found"]:
                if claimed_owner and isinstance(info["value"], str) and claimed_owner.lower() in info["value"].lower():
                    matched.append({"field": field, "value": info["value"], "source": info["source"]})
                elif claimed_owner and isinstance(info["value"], str) and info["value"].lower() not in claimed_owner.lower():
                    mismatched.append({"field": field, "value": info["value"], "source": info["source"]})
                else:
                    matched.append({"field": field, "value": info["value"], "source": info["source"]})
            else:
                missing.append({"field": field, "source": info["source"]})
        total_evidence_fields = len(evidence)
        found_count = sum(1 for v in evidence.values() if v["found"])
        matched_count = len(matched)
        mismatch_count = len(mismatched)
        missing_count = len(missing)
        if claimed_owner:
            if mismatch_count == 0 and matched_count >= 3:
                status = "Ownership Verified"
                explanation = "All available ownership fields are consistent with the claimed owner."
            elif mismatch_count > 0 and matched_count > 0:
                status = "Partially Verified"
                explanation = f"Some fields match the claimed owner but {mismatch_count} field(s) contain different values."
            elif mismatch_count > 0 and matched_count == 0:
                status = "Ownership Mismatch"
                explanation = "None of the extracted ownership fields match the claimed owner."
            elif found_count == 0:
                status = "Ownership Information Missing"
                explanation = "No ownership-related metadata was found in the document."
            else:
                status = "Unable to Validate"
                explanation = "Insufficient information to perform a meaningful comparison."
        else:
            if found_count >= 3:
                status = "Ownership Information Available"
                explanation = f"{found_count} ownership-related fields found in the document. Provide a claimed owner to validate."
            elif found_count > 0:
                status = "Partial Ownership Information"
                explanation = f"Only {found_count} ownership-related field(s) found. More information needed for reliable validation."
            else:
                status = "Ownership Information Missing"
                explanation = "No ownership-related metadata was found in the document."
        return {
            "status": status,
            "explanation": explanation,
            "matched_fields": matched,
            "mismatched_fields": mismatched,
            "missing_fields": missing,
            "summary": {
                "total_fields": total_evidence_fields,
                "found": found_count,
                "matched": matched_count,
                "mismatched": mismatch_count,
                "missing": missing_count,
            },
        }

    def validate(self, pdf_bytes: bytes, claimed_owner: str = "") -> Dict[str, Any]:
        """Validate content ownership for the uploaded PDF."""
        self._validate_pdf(pdf_bytes)
        doc_hash = self._compute_hash(pdf_bytes)
        metadata = self._extract_pdf_metadata(pdf_bytes)
        evidence = self._detect_ownership_evidence(metadata)
        validation = self._determine_validation_status(evidence, claimed_owner)
        return {
            "success": True,
            "validation": {
                "document_hash": doc_hash,
                "claimed_owner": claimed_owner or "Not specified",
                "status": validation["status"],
                "explanation": validation["explanation"],
                "matched_fields": validation["matched_fields"],
                "mismatched_fields": validation["mismatched_fields"],
                "missing_fields": validation["missing_fields"],
                "summary": validation["summary"],
                "evidence": {
                    k: {"found": v["found"], "value": v["value"], "source": v["source"]}
                    for k, v in evidence.items()
                },
                "document_info": {
                    "total_pages": metadata.get("total_pages", 0),
                    "file_size": metadata.get("file_size", 0),
                    "title": metadata.get("title", ""),
                    "author": metadata.get("author", ""),
                    "creator": metadata.get("creator", ""),
                },
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": f"Ownership validation completed: {validation['status']}.",
            "disclaimer": (
                "This validation is based on document metadata analysis only. "
                "Metadata evidence does not by itself constitute legal proof of copyright ownership. "
                "Consult a legal professional for definitive ownership determination."
            ),
        }


content_ownership_validation_service = ContentOwnershipValidationService()
