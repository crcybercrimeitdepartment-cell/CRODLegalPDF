"""
Biometric Authentication Service for PDF documents.

Stores and manages biometric data (fingerprints, face signatures,
handwritten signatures, iris, palm, voice) as PDF metadata entries
using PyMuPDF (fitz).
"""

from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

BIOMETRIC_PREFIX = "biometric_"
METADATA_KEY_MAP = {
    "fingerprint": f"{BIOMETRIC_PREFIX}fingerprint",
    "face": f"{BIOMETRIC_PREFIX}face_signature",
    "handwritten": f"{BIOMETRIC_PREFIX}handwritten_signature",
    "iris": f"{BIOMETRIC_PREFIX}iris_signature",
    "palm": f"{BIOMETRIC_PREFIX}palm_signature",
    "voice": f"{BIOMETRIC_PREFIX}voice_signature",
    "audit_trail": f"{BIOMETRIC_PREFIX}audit_trail",
    "history": f"{BIOMETRIC_PREFIX}history",
    "locked": f"{BIOMETRIC_PREFIX}locked",
    "passcode_hash": f"{BIOMETRIC_PREFIX}passcode_hash",
    "backup": f"{BIOMETRIC_PREFIX}backup",
    "created_at": f"{BIOMETRIC_PREFIX}created_at",
    "updated_at": f"{BIOMETRIC_PREFIX}updated_at",
}


class BiometricService:
    """Manages biometric signature data embedded in PDF metadata."""

    # ── helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _hash_data(data: str) -> str:
        return hashlib.sha256(data.encode("utf-8")).hexdigest()

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _read_meta(doc: fitz.Document, key: str) -> Optional[str]:
        meta = doc.metadata or {}
        return meta.get(key)

    @staticmethod
    def _set_meta(doc: fitz.Document, key: str, value: str) -> None:
        meta = doc.metadata or {}
        meta[key] = value
        doc.set_metadata(meta)

    @staticmethod
    def _get_biometric_data(doc: fitz.Document, biometric_type: str) -> Optional[Dict[str, Any]]:
        raw = BiometricService._read_meta(doc, METADATA_KEY_MAP.get(biometric_type, f"{BIOMETRIC_PREFIX}{biometric_type}"))
        if not raw:
            return None
        try:
            decoded = base64.b64decode(raw).decode("utf-8")
            return json.loads(decoded)
        except Exception:
            return None

    @staticmethod
    def _set_biometric_data(doc: fitz.Document, biometric_type: str, data: Dict[str, Any]) -> None:
        key = METADATA_KEY_MAP.get(biometric_type, f"{BIOMETRIC_PREFIX}{biometric_type}")
        encoded = base64.b64encode(json.dumps(data).encode("utf-8")).decode("utf-8")
        BiometricService._set_meta(doc, key, encoded)

    @staticmethod
    def _append_audit(doc: fitz.Document, action: str, details: str = "") -> None:
        audit_raw = BiometricService._read_meta(doc, METADATA_KEY_MAP["audit_trail"])
        audit: List[Dict[str, Any]] = []
        if audit_raw:
            try:
                audit = json.loads(base64.b64decode(audit_raw).decode("utf-8"))
            except Exception:
                audit = []
        audit.append({
            "action": action,
            "timestamp": BiometricService._now_iso(),
            "details": details,
        })
        encoded = base64.b64encode(json.dumps(audit).encode("utf-8")).decode("utf-8")
        BiometricService._set_meta(doc, METADATA_KEY_MAP["audit_trail"], encoded)

    @staticmethod
    def _append_history(doc: fitz.Document, event: str, details: str = "") -> None:
        hist_raw = BiometricService._read_meta(doc, METADATA_KEY_MAP["history"])
        history: List[Dict[str, Any]] = []
        if hist_raw:
            try:
                history = json.loads(base64.b64decode(hist_raw).decode("utf-8"))
            except Exception:
                history = []
        history.append({
            "event": event,
            "timestamp": BiometricService._now_iso(),
            "details": details,
        })
        encoded = base64.b64encode(json.dumps(history).encode("utf-8")).decode("utf-8")
        BiometricService._set_meta(doc, METADATA_KEY_MAP["history"], encoded)

    @staticmethod
    def _is_locked(doc: fitz.Document) -> bool:
        val = BiometricService._read_meta(doc, METADATA_KEY_MAP["locked"])
        return val == "true"

    @staticmethod
    def _check_locked(doc: fitz.Document) -> None:
        if BiometricService._is_locked(doc):
            raise ValueError("Biometric data is locked. Unlock with the correct passcode first.")

    @staticmethod
    def _compute_checksum(file_path: str) -> str:
        sha = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha.update(chunk)
        return sha.hexdigest()

    # ── Fingerprint ──────────────────────────────────────────────────────

    def add_fingerprint(self, input_path: str, output_path: str, fingerprint_data: str) -> Dict[str, Any]:
        shutil.copy2(input_path, output_path)
        doc = fitz.open(output_path)
        try:
            BiometricService._check_locked(doc)
            data = {
                "type": "fingerprint",
                "template": fingerprint_data,
                "added_at": BiometricService._now_iso(),
                "version": "1.0",
            }
            BiometricService._set_biometric_data(doc, "fingerprint", data)
            BiometricService._append_audit(doc, "add_fingerprint", "Fingerprint added")
            BiometricService._append_history(doc, "fingerprint_added")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["created_at"], BiometricService._now_iso())
            BiometricService._set_meta(doc, METADATA_KEY_MAP["updated_at"], BiometricService._now_iso())
            doc.save(output_path, incremental=False, encryption=fitz.PDF_ENCRYPT_KEEP)
        finally:
            doc.close()
        return {
            "success": True,
            "message": "Fingerprint added successfully",
            "output_path": output_path,
        }

    def verify_fingerprint(self, input_path: str, fingerprint_data: str) -> Dict[str, Any]:
        doc = fitz.open(input_path)
        try:
            stored = BiometricService._get_biometric_data(doc, "fingerprint")
            if not stored:
                return {"success": False, "message": "No fingerprint data found", "verified": False}
            match = BiometricService._hash_data(fingerprint_data) == BiometricService._hash_data(stored.get("template", ""))
            BiometricService._append_audit(doc, "verify_fingerprint", f"Match: {match}")
            doc.save(input_path, incremental=True, encryption=fitz.PDF_ENCRYPT_KEEP)
            return {
                "success": True,
                "verified": match,
                "message": "Fingerprint verified" if match else "Fingerprint mismatch",
            }
        finally:
            doc.close()

    def update_fingerprint(self, input_path: str, output_path: str, fingerprint_data: str) -> Dict[str, Any]:
        shutil.copy2(input_path, output_path)
        doc = fitz.open(output_path)
        try:
            BiometricService._check_locked(doc)
            existing = BiometricService._get_biometric_data(doc, "fingerprint")
            data = {
                "type": "fingerprint",
                "template": fingerprint_data,
                "added_at": existing.get("added_at", BiometricService._now_iso()) if existing else BiometricService._now_iso(),
                "updated_at": BiometricService._now_iso(),
                "version": "1.1",
            }
            BiometricService._set_biometric_data(doc, "fingerprint", data)
            BiometricService._append_audit(doc, "update_fingerprint", "Fingerprint updated")
            BiometricService._append_history(doc, "fingerprint_updated")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["updated_at"], BiometricService._now_iso())
            doc.save(output_path, incremental=False, encryption=fitz.PDF_ENCRYPT_KEEP)
        finally:
            doc.close()
        return {
            "success": True,
            "message": "Fingerprint updated successfully",
            "output_path": output_path,
        }

    def replace_fingerprint(self, input_path: str, output_path: str, old_data: str, new_data: str) -> Dict[str, Any]:
        shutil.copy2(input_path, output_path)
        doc = fitz.open(output_path)
        try:
            BiometricService._check_locked(doc)
            existing = BiometricService._get_biometric_data(doc, "fingerprint")
            if existing and BiometricService._hash_data(existing.get("template", "")) != BiometricService._hash_data(old_data):
                return {"success": False, "message": "Old fingerprint data does not match stored data", "replaced": False}
            data = {
                "type": "fingerprint",
                "template": new_data,
                "added_at": existing.get("added_at", BiometricService._now_iso()) if existing else BiometricService._now_iso(),
                "replaced_at": BiometricService._now_iso(),
                "version": "1.2",
            }
            BiometricService._set_biometric_data(doc, "fingerprint", data)
            BiometricService._append_audit(doc, "replace_fingerprint", "Fingerprint replaced")
            BiometricService._append_history(doc, "fingerprint_replaced")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["updated_at"], BiometricService._now_iso())
            doc.save(output_path, incremental=False, encryption=fitz.PDF_ENCRYPT_KEEP)
        finally:
            doc.close()
        return {
            "success": True,
            "message": "Fingerprint replaced successfully",
            "output_path": output_path,
        }

    def remove_fingerprint(self, input_path: str, output_path: str) -> Dict[str, Any]:
        shutil.copy2(input_path, output_path)
        doc = fitz.open(output_path)
        try:
            BiometricService._check_locked(doc)
            meta = doc.metadata or {}
            meta.pop(METADATA_KEY_MAP["fingerprint"], None)
            doc.set_metadata(meta)
            BiometricService._append_audit(doc, "remove_fingerprint", "Fingerprint removed")
            BiometricService._append_history(doc, "fingerprint_removed")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["updated_at"], BiometricService._now_iso())
            doc.save(output_path, incremental=False, encryption=fitz.PDF_ENCRYPT_KEEP)
        finally:
            doc.close()
        return {
            "success": True,
            "message": "Fingerprint removed successfully",
            "output_path": output_path,
        }

    def match_fingerprint(self, input_path: str, fingerprint_data: str) -> Dict[str, Any]:
        doc = fitz.open(input_path)
        try:
            stored = BiometricService._get_biometric_data(doc, "fingerprint")
            if not stored:
                return {"success": False, "message": "No fingerprint data found", "matched": False}
            match = BiometricService._hash_data(fingerprint_data) == BiometricService._hash_data(stored.get("template", ""))
            BiometricService._append_audit(doc, "match_fingerprint", f"Match result: {match}")
            doc.save(input_path, incremental=True, encryption=fitz.PDF_ENCRYPT_KEEP)
            return {
                "success": True,
                "matched": match,
                "message": "Fingerprint match" if match else "Fingerprint does not match",
            }
        finally:
            doc.close()

    # ── Face Signature ───────────────────────────────────────────────────

    def add_face_signature(self, input_path: str, output_path: str, face_image_path: str) -> Dict[str, Any]:
        shutil.copy2(input_path, output_path)
        doc = fitz.open(output_path)
        try:
            BiometricService._check_locked(doc)
            with open(face_image_path, "rb") as f:
                img_b64 = base64.b64encode(f.read()).decode("utf-8")
            data = {
                "type": "face",
                "face_image_b64": img_b64,
                "added_at": BiometricService._now_iso(),
                "version": "1.0",
            }
            BiometricService._set_biometric_data(doc, "face", data)
            BiometricService._append_audit(doc, "add_face_signature", "Face signature added")
            BiometricService._append_history(doc, "face_signature_added")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["created_at"], BiometricService._now_iso())
            BiometricService._set_meta(doc, METADATA_KEY_MAP["updated_at"], BiometricService._now_iso())
            doc.save(output_path, incremental=False, encryption=fitz.PDF_ENCRYPT_KEEP)
        finally:
            doc.close()
        return {
            "success": True,
            "message": "Face signature added successfully",
            "output_path": output_path,
        }

    def verify_face_signature(self, input_path: str, face_image_path: str) -> Dict[str, Any]:
        doc = fitz.open(input_path)
        try:
            stored = BiometricService._get_biometric_data(doc, "face")
            if not stored:
                return {"success": False, "message": "No face signature data found", "verified": False}
            with open(face_image_path, "rb") as f:
                provided_b64 = base64.b64encode(f.read()).decode("utf-8")
            match = provided_b64 == stored.get("face_image_b64", "")
            BiometricService._append_audit(doc, "verify_face_signature", f"Match: {match}")
            doc.save(input_path, incremental=True, encryption=fitz.PDF_ENCRYPT_KEEP)
            return {
                "success": True,
                "verified": match,
                "message": "Face signature verified" if match else "Face signature mismatch",
            }
        finally:
            doc.close()

    def remove_face_signature(self, input_path: str, output_path: str) -> Dict[str, Any]:
        shutil.copy2(input_path, output_path)
        doc = fitz.open(output_path)
        try:
            BiometricService._check_locked(doc)
            meta = doc.metadata or {}
            meta.pop(METADATA_KEY_MAP["face"], None)
            doc.set_metadata(meta)
            BiometricService._append_audit(doc, "remove_face_signature", "Face signature removed")
            BiometricService._append_history(doc, "face_signature_removed")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["updated_at"], BiometricService._now_iso())
            doc.save(output_path, incremental=False, encryption=fitz.PDF_ENCRYPT_KEEP)
        finally:
            doc.close()
        return {
            "success": True,
            "message": "Face signature removed successfully",
            "output_path": output_path,
        }

    # ── Handwritten Signature ────────────────────────────────────────────

    def add_handwritten_signature(self, input_path: str, output_path: str, sig_image_path: str) -> Dict[str, Any]:
        shutil.copy2(input_path, output_path)
        doc = fitz.open(output_path)
        try:
            BiometricService._check_locked(doc)
            with open(sig_image_path, "rb") as f:
                img_b64 = base64.b64encode(f.read()).decode("utf-8")
            data = {
                "type": "handwritten",
                "signature_image_b64": img_b64,
                "added_at": BiometricService._now_iso(),
                "version": "1.0",
            }
            BiometricService._set_biometric_data(doc, "handwritten", data)
            BiometricService._append_audit(doc, "add_handwritten_signature", "Handwritten signature added")
            BiometricService._append_history(doc, "handwritten_signature_added")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["created_at"], BiometricService._now_iso())
            BiometricService._set_meta(doc, METADATA_KEY_MAP["updated_at"], BiometricService._now_iso())
            doc.save(output_path, incremental=False, encryption=fitz.PDF_ENCRYPT_KEEP)
        finally:
            doc.close()
        return {
            "success": True,
            "message": "Handwritten signature added successfully",
            "output_path": output_path,
        }

    def verify_handwritten_signature(self, input_path: str, sig_image_path: str) -> Dict[str, Any]:
        doc = fitz.open(input_path)
        try:
            stored = BiometricService._get_biometric_data(doc, "handwritten")
            if not stored:
                return {"success": False, "message": "No handwritten signature data found", "verified": False}
            with open(sig_image_path, "rb") as f:
                provided_b64 = base64.b64encode(f.read()).decode("utf-8")
            match = provided_b64 == stored.get("signature_image_b64", "")
            BiometricService._append_audit(doc, "verify_handwritten_signature", f"Match: {match}")
            doc.save(input_path, incremental=True, encryption=fitz.PDF_ENCRYPT_KEEP)
            return {
                "success": True,
                "verified": match,
                "message": "Handwritten signature verified" if match else "Handwritten signature mismatch",
            }
        finally:
            doc.close()

    def remove_handwritten_signature(self, input_path: str, output_path: str) -> Dict[str, Any]:
        shutil.copy2(input_path, output_path)
        doc = fitz.open(output_path)
        try:
            BiometricService._check_locked(doc)
            meta = doc.metadata or {}
            meta.pop(METADATA_KEY_MAP["handwritten"], None)
            doc.set_metadata(meta)
            BiometricService._append_audit(doc, "remove_handwritten_signature", "Handwritten signature removed")
            BiometricService._append_history(doc, "handwritten_signature_removed")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["updated_at"], BiometricService._now_iso())
            doc.save(output_path, incremental=False, encryption=fitz.PDF_ENCRYPT_KEEP)
        finally:
            doc.close()
        return {
            "success": True,
            "message": "Handwritten signature removed successfully",
            "output_path": output_path,
        }

    # ── Iris Signature ───────────────────────────────────────────────────

    def add_iris_signature(self, input_path: str, output_path: str, iris_data: str) -> Dict[str, Any]:
        shutil.copy2(input_path, output_path)
        doc = fitz.open(output_path)
        try:
            BiometricService._check_locked(doc)
            data = {
                "type": "iris",
                "template": iris_data,
                "added_at": BiometricService._now_iso(),
                "version": "1.0",
            }
            BiometricService._set_biometric_data(doc, "iris", data)
            BiometricService._append_audit(doc, "add_iris_signature", "Iris signature added")
            BiometricService._append_history(doc, "iris_signature_added")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["created_at"], BiometricService._now_iso())
            BiometricService._set_meta(doc, METADATA_KEY_MAP["updated_at"], BiometricService._now_iso())
            doc.save(output_path, incremental=False, encryption=fitz.PDF_ENCRYPT_KEEP)
        finally:
            doc.close()
        return {
            "success": True,
            "message": "Iris signature added successfully",
            "output_path": output_path,
        }

    def verify_iris_signature(self, input_path: str, iris_data: str) -> Dict[str, Any]:
        doc = fitz.open(input_path)
        try:
            stored = BiometricService._get_biometric_data(doc, "iris")
            if not stored:
                return {"success": False, "message": "No iris signature data found", "verified": False}
            match = BiometricService._hash_data(iris_data) == BiometricService._hash_data(stored.get("template", ""))
            BiometricService._append_audit(doc, "verify_iris_signature", f"Match: {match}")
            doc.save(input_path, incremental=True, encryption=fitz.PDF_ENCRYPT_KEEP)
            return {
                "success": True,
                "verified": match,
                "message": "Iris signature verified" if match else "Iris signature mismatch",
            }
        finally:
            doc.close()

    def remove_iris_signature(self, input_path: str, output_path: str) -> Dict[str, Any]:
        shutil.copy2(input_path, output_path)
        doc = fitz.open(output_path)
        try:
            BiometricService._check_locked(doc)
            meta = doc.metadata or {}
            meta.pop(METADATA_KEY_MAP["iris"], None)
            doc.set_metadata(meta)
            BiometricService._append_audit(doc, "remove_iris_signature", "Iris signature removed")
            BiometricService._append_history(doc, "iris_signature_removed")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["updated_at"], BiometricService._now_iso())
            doc.save(output_path, incremental=False, encryption=fitz.PDF_ENCRYPT_KEEP)
        finally:
            doc.close()
        return {
            "success": True,
            "message": "Iris signature removed successfully",
            "output_path": output_path,
        }

    # ── Palm Signature ───────────────────────────────────────────────────

    def add_palm_signature(self, input_path: str, output_path: str, palm_data: str) -> Dict[str, Any]:
        shutil.copy2(input_path, output_path)
        doc = fitz.open(output_path)
        try:
            BiometricService._check_locked(doc)
            data = {
                "type": "palm",
                "template": palm_data,
                "added_at": BiometricService._now_iso(),
                "version": "1.0",
            }
            BiometricService._set_biometric_data(doc, "palm", data)
            BiometricService._append_audit(doc, "add_palm_signature", "Palm signature added")
            BiometricService._append_history(doc, "palm_signature_added")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["created_at"], BiometricService._now_iso())
            BiometricService._set_meta(doc, METADATA_KEY_MAP["updated_at"], BiometricService._now_iso())
            doc.save(output_path, incremental=False, encryption=fitz.PDF_ENCRYPT_KEEP)
        finally:
            doc.close()
        return {
            "success": True,
            "message": "Palm signature added successfully",
            "output_path": output_path,
        }

    def verify_palm_signature(self, input_path: str, palm_data: str) -> Dict[str, Any]:
        doc = fitz.open(input_path)
        try:
            stored = BiometricService._get_biometric_data(doc, "palm")
            if not stored:
                return {"success": False, "message": "No palm signature data found", "verified": False}
            match = BiometricService._hash_data(palm_data) == BiometricService._hash_data(stored.get("template", ""))
            BiometricService._append_audit(doc, "verify_palm_signature", f"Match: {match}")
            doc.save(input_path, incremental=True, encryption=fitz.PDF_ENCRYPT_KEEP)
            return {
                "success": True,
                "verified": match,
                "message": "Palm signature verified" if match else "Palm signature mismatch",
            }
        finally:
            doc.close()

    def remove_palm_signature(self, input_path: str, output_path: str) -> Dict[str, Any]:
        shutil.copy2(input_path, output_path)
        doc = fitz.open(output_path)
        try:
            BiometricService._check_locked(doc)
            meta = doc.metadata or {}
            meta.pop(METADATA_KEY_MAP["palm"], None)
            doc.set_metadata(meta)
            BiometricService._append_audit(doc, "remove_palm_signature", "Palm signature removed")
            BiometricService._append_history(doc, "palm_signature_removed")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["updated_at"], BiometricService._now_iso())
            doc.save(output_path, incremental=False, encryption=fitz.PDF_ENCRYPT_KEEP)
        finally:
            doc.close()
        return {
            "success": True,
            "message": "Palm signature removed successfully",
            "output_path": output_path,
        }

    # ── Voice Signature ──────────────────────────────────────────────────

    def add_voice_signature(self, input_path: str, output_path: str, voice_data: str) -> Dict[str, Any]:
        shutil.copy2(input_path, output_path)
        doc = fitz.open(output_path)
        try:
            BiometricService._check_locked(doc)
            data = {
                "type": "voice",
                "template": voice_data,
                "added_at": BiometricService._now_iso(),
                "version": "1.0",
            }
            BiometricService._set_biometric_data(doc, "voice", data)
            BiometricService._append_audit(doc, "add_voice_signature", "Voice signature added")
            BiometricService._append_history(doc, "voice_signature_added")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["created_at"], BiometricService._now_iso())
            BiometricService._set_meta(doc, METADATA_KEY_MAP["updated_at"], BiometricService._now_iso())
            doc.save(output_path, incremental=False, encryption=fitz.PDF_ENCRYPT_KEEP)
        finally:
            doc.close()
        return {
            "success": True,
            "message": "Voice signature added successfully",
            "output_path": output_path,
        }

    def verify_voice_signature(self, input_path: str, voice_data: str) -> Dict[str, Any]:
        doc = fitz.open(input_path)
        try:
            stored = BiometricService._get_biometric_data(doc, "voice")
            if not stored:
                return {"success": False, "message": "No voice signature data found", "verified": False}
            match = BiometricService._hash_data(voice_data) == BiometricService._hash_data(stored.get("template", ""))
            BiometricService._append_audit(doc, "verify_voice_signature", f"Match: {match}")
            doc.save(input_path, incremental=True, encryption=fitz.PDF_ENCRYPT_KEEP)
            return {
                "success": True,
                "verified": match,
                "message": "Voice signature verified" if match else "Voice signature mismatch",
            }
        finally:
            doc.close()

    def remove_voice_signature(self, input_path: str, output_path: str) -> Dict[str, Any]:
        shutil.copy2(input_path, output_path)
        doc = fitz.open(output_path)
        try:
            BiometricService._check_locked(doc)
            meta = doc.metadata or {}
            meta.pop(METADATA_KEY_MAP["voice"], None)
            doc.set_metadata(meta)
            BiometricService._append_audit(doc, "remove_voice_signature", "Voice signature removed")
            BiometricService._append_history(doc, "voice_signature_removed")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["updated_at"], BiometricService._now_iso())
            doc.save(output_path, incremental=False, encryption=fitz.PDF_ENCRYPT_KEEP)
        finally:
            doc.close()
        return {
            "success": True,
            "message": "Voice signature removed successfully",
            "output_path": output_path,
        }

    # ── Validation / History / Audit ─────────────────────────────────────

    def validate_biometric(self, input_path: str) -> Dict[str, Any]:
        doc = fitz.open(input_path)
        try:
            types_present = []
            for btype in ("fingerprint", "face", "handwritten", "iris", "palm", "voice"):
                if BiometricService._get_biometric_data(doc, btype):
                    types_present.append(btype)
            created = BiometricService._read_meta(doc, METADATA_KEY_MAP["created_at"])
            updated = BiometricService._read_meta(doc, METADATA_KEY_MAP["updated_at"])
            locked = BiometricService._is_locked(doc)
            checksum = BiometricService._compute_checksum(input_path)
            return {
                "success": True,
                "valid": len(types_present) > 0,
                "biometric_types_present": types_present,
                "biometric_count": len(types_present),
                "created_at": created,
                "updated_at": updated,
                "is_locked": locked,
                "checksum": checksum,
            }
        finally:
            doc.close()

    def get_timestamp(self, input_path: str) -> Dict[str, Any]:
        doc = fitz.open(input_path)
        try:
            created = BiometricService._read_meta(doc, METADATA_KEY_MAP["created_at"])
            updated = BiometricService._read_meta(doc, METADATA_KEY_MAP["updated_at"])
            return {
                "success": True,
                "created_at": created,
                "updated_at": updated,
                "timestamp": BiometricService._now_iso(),
            }
        finally:
            doc.close()

    def get_audit_trail(self, input_path: str) -> Dict[str, Any]:
        doc = fitz.open(input_path)
        try:
            audit_raw = BiometricService._read_meta(doc, METADATA_KEY_MAP["audit_trail"])
            audit: List[Dict[str, Any]] = []
            if audit_raw:
                try:
                    audit = json.loads(base64.b64decode(audit_raw).decode("utf-8"))
                except Exception:
                    audit = []
            return {
                "success": True,
                "audit_trail": audit,
                "total_entries": len(audit),
            }
        finally:
            doc.close()

    def get_history(self, input_path: str) -> Dict[str, Any]:
        doc = fitz.open(input_path)
        try:
            hist_raw = BiometricService._read_meta(doc, METADATA_KEY_MAP["history"])
            history: List[Dict[str, Any]] = []
            if hist_raw:
                try:
                    history = json.loads(base64.b64decode(hist_raw).decode("utf-8"))
                except Exception:
                    history = []
            return {
                "success": True,
                "history": history,
                "total_events": len(history),
            }
        finally:
            doc.close()

    # ── Export / Import / Extract ─────────────────────────────────────────

    def export_biometric(self, input_path: str) -> Dict[str, Any]:
        doc = fitz.open(input_path)
        try:
            export_data: Dict[str, Any] = {}
            for btype in ("fingerprint", "face", "handwritten", "iris", "palm", "voice"):
                data = BiometricService._get_biometric_data(doc, btype)
                if data:
                    export_data[btype] = data
            audit_raw = BiometricService._read_meta(doc, METADATA_KEY_MAP["audit_trail"])
            if audit_raw:
                try:
                    export_data["audit_trail"] = json.loads(base64.b64decode(audit_raw).decode("utf-8"))
                except Exception:
                    export_data["audit_trail"] = []
            hist_raw = BiometricService._read_meta(doc, METADATA_KEY_MAP["history"])
            if hist_raw:
                try:
                    export_data["history"] = json.loads(base64.b64decode(hist_raw).decode("utf-8"))
                except Exception:
                    export_data["history"] = []
            export_data["created_at"] = BiometricService._read_meta(doc, METADATA_KEY_MAP["created_at"])
            export_data["updated_at"] = BiometricService._read_meta(doc, METADATA_KEY_MAP["updated_at"])
            return {
                "success": True,
                "exported_at": BiometricService._now_iso(),
                "biometric_data": export_data,
            }
        finally:
            doc.close()

    def import_biometric(self, input_path: str, biometric_data: str) -> Dict[str, Any]:
        shutil.copy2(input_path, input_path)
        doc = fitz.open(input_path)
        try:
            BiometricService._check_locked(doc)
            data = json.loads(biometric_data)
            imported_count = 0
            for btype in ("fingerprint", "face", "handwritten", "iris", "palm", "voice"):
                if btype in data:
                    BiometricService._set_biometric_data(doc, btype, data[btype])
                    imported_count += 1
            if "audit_trail" in data:
                encoded = base64.b64encode(json.dumps(data["audit_trail"]).encode("utf-8")).decode("utf-8")
                BiometricService._set_meta(doc, METADATA_KEY_MAP["audit_trail"], encoded)
            if "history" in data:
                encoded = base64.b64encode(json.dumps(data["history"]).encode("utf-8")).decode("utf-8")
                BiometricService._set_meta(doc, METADATA_KEY_MAP["history"], encoded)
            BiometricService._append_audit(doc, "import_biometric", f"Imported {imported_count} biometric type(s)")
            BiometricService._append_history(doc, "biometric_imported", f"{imported_count} type(s)")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["updated_at"], BiometricService._now_iso())
            doc.save(input_path, incremental=False, encryption=fitz.PDF_ENCRYPT_KEEP)
        finally:
            doc.close()
        return {
            "success": True,
            "message": f"Imported {imported_count} biometric type(s) successfully",
            "imported_count": imported_count,
        }

    def extract_biometric(self, input_path: str) -> Dict[str, Any]:
        doc = fitz.open(input_path)
        try:
            extracted: Dict[str, Any] = {}
            for btype in ("fingerprint", "face", "handwritten", "iris", "palm", "voice"):
                data = BiometricService._get_biometric_data(doc, btype)
                if data:
                    extracted[btype] = data
            return {
                "success": True,
                "extracted_at": BiometricService._now_iso(),
                "biometric_data": extracted,
                "types_found": list(extracted.keys()),
                "count": len(extracted),
            }
        finally:
            doc.close()

    # ── Lock / Unlock ────────────────────────────────────────────────────

    def lock_biometric(self, input_path: str, output_path: str, passcode: str) -> Dict[str, Any]:
        shutil.copy2(input_path, output_path)
        doc = fitz.open(output_path)
        try:
            if BiometricService._is_locked(doc):
                return {"success": False, "message": "Biometric data is already locked"}
            passcode_hash = BiometricService._hash_data(passcode)
            BiometricService._set_meta(doc, METADATA_KEY_MAP["locked"], "true")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["passcode_hash"], passcode_hash)
            BiometricService._append_audit(doc, "lock_biometric", "Biometric data locked")
            BiometricService._append_history(doc, "biometric_locked")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["updated_at"], BiometricService._now_iso())
            doc.save(output_path, incremental=False, encryption=fitz.PDF_ENCRYPT_KEEP)
        finally:
            doc.close()
        return {
            "success": True,
            "message": "Biometric data locked successfully",
            "output_path": output_path,
        }

    def unlock_biometric(self, input_path: str, passcode: str) -> Dict[str, Any]:
        doc = fitz.open(input_path)
        try:
            if not BiometricService._is_locked(doc):
                return {"success": False, "message": "Biometric data is not locked"}
            stored_hash = BiometricService._read_meta(doc, METADATA_KEY_MAP["passcode_hash"])
            provided_hash = BiometricService._hash_data(passcode)
            if stored_hash != provided_hash:
                BiometricService._append_audit(doc, "unlock_biometric_failed", "Incorrect passcode")
                doc.save(input_path, incremental=True, encryption=fitz.PDF_ENCRYPT_KEEP)
                return {"success": False, "message": "Incorrect passcode", "unlocked": False}
            meta = doc.metadata or {}
            meta[METADATA_KEY_MAP["locked"]] = "false"
            meta.pop(METADATA_KEY_MAP["passcode_hash"], None)
            doc.set_metadata(meta)
            BiometricService._append_audit(doc, "unlock_biometric", "Biometric data unlocked")
            BiometricService._append_history(doc, "biometric_unlocked")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["updated_at"], BiometricService._now_iso())
            doc.save(input_path, incremental=True, encryption=fitz.PDF_ENCRYPT_KEEP)
            return {
                "success": True,
                "unlocked": True,
                "message": "Biometric data unlocked successfully",
            }
        finally:
            doc.close()

    # ── Backup / Restore ─────────────────────────────────────────────────

    def backup_biometric(self, input_path: str) -> Dict[str, Any]:
        doc = fitz.open(input_path)
        try:
            backup_data: Dict[str, Any] = {}
            for btype in ("fingerprint", "face", "handwritten", "iris", "palm", "voice"):
                data = BiometricService._get_biometric_data(doc, btype)
                if data:
                    backup_data[btype] = data
            audit_raw = BiometricService._read_meta(doc, METADATA_KEY_MAP["audit_trail"])
            if audit_raw:
                try:
                    backup_data["audit_trail"] = json.loads(base64.b64decode(audit_raw).decode("utf-8"))
                except Exception:
                    backup_data["audit_trail"] = []
            hist_raw = BiometricService._read_meta(doc, METADATA_KEY_MAP["history"])
            if hist_raw:
                try:
                    backup_data["history"] = json.loads(base64.b64decode(hist_raw).decode("utf-8"))
                except Exception:
                    backup_data["history"] = []
            backup_data["created_at"] = BiometricService._read_meta(doc, METADATA_KEY_MAP["created_at"])
            backup_data["updated_at"] = BiometricService._read_meta(doc, METADATA_KEY_MAP["updated_at"])
            checksum = BiometricService._compute_checksum(input_path)
            return {
                "success": True,
                "backup_at": BiometricService._now_iso(),
                "backup_data": backup_data,
                "checksum": checksum,
            }
        finally:
            doc.close()

    def restore_biometric(self, input_path: str, backup_data: str) -> Dict[str, Any]:
        shutil.copy2(input_path, input_path)
        doc = fitz.open(input_path)
        try:
            BiometricService._check_locked(doc)
            data = json.loads(backup_data)
            restored_count = 0
            for btype in ("fingerprint", "face", "handwritten", "iris", "palm", "voice"):
                if btype in data:
                    BiometricService._set_biometric_data(doc, btype, data[btype])
                    restored_count += 1
            if "audit_trail" in data:
                encoded = base64.b64encode(json.dumps(data["audit_trail"]).encode("utf-8")).decode("utf-8")
                BiometricService._set_meta(doc, METADATA_KEY_MAP["audit_trail"], encoded)
            if "history" in data:
                encoded = base64.b64encode(json.dumps(data["history"]).encode("utf-8")).decode("utf-8")
                BiometricService._set_meta(doc, METADATA_KEY_MAP["history"], encoded)
            if "created_at" in data and data["created_at"]:
                BiometricService._set_meta(doc, METADATA_KEY_MAP["created_at"], data["created_at"])
            BiometricService._append_audit(doc, "restore_biometric", f"Restored {restored_count} biometric type(s)")
            BiometricService._append_history(doc, "biometric_restored", f"{restored_count} type(s)")
            BiometricService._set_meta(doc, METADATA_KEY_MAP["updated_at"], BiometricService._now_iso())
            doc.save(input_path, incremental=False, encryption=fitz.PDF_ENCRYPT_KEEP)
        finally:
            doc.close()
        return {
            "success": True,
            "message": f"Restored {restored_count} biometric type(s) successfully",
            "restored_count": restored_count,
        }


biometric_service = BiometricService()
