"""
Biometric / Fingerprint Authentication API endpoints.

Exposes biometric operations (fingerprint, face, handwritten, iris,
palm, voice signatures) under the ``/biometric`` prefix.
"""

from __future__ import annotations

import logging
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from fastapi.responses import JSONResponse

from app.biometric_services.biometric_service import biometric_service

logger = logging.getLogger(__name__)

router = APIRouter()


def _save_temp(upload: UploadFile) -> Path:
    ext = Path(upload.filename).suffix if upload.filename else ".pdf"
    tmp = Path(tempfile.gettempdir()) / f"biometric_{uuid.uuid4().hex}{ext}"
    shutil.copyfileobj(upload.file, tmp)
    return tmp


def _output_path() -> Path:
    return Path(tempfile.gettempdir()) / f"biometric_out_{uuid.uuid4().hex}.pdf"


# ── Fingerprint ───────────────────────────────────────────────────────────


@router.post("/add-fingerprint")
async def add_fingerprint(
    file: UploadFile = File(..., description="PDF to add fingerprint to"),
    fingerprint_data: str = Form(..., description="Fingerprint template data"),
):
    """Add fingerprint biometric data to a PDF document."""
    input_tmp = _save_temp(file)
    output_tmp = str(_output_path())
    try:
        result = biometric_service.add_fingerprint(str(input_tmp), output_tmp, fingerprint_data)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("add_fingerprint failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/verify-fingerprint")
async def verify_fingerprint(
    file: UploadFile = File(..., description="PDF with fingerprint data"),
    fingerprint_data: str = Form(..., description="Fingerprint data to verify"),
):
    """Verify fingerprint data stored in a PDF document."""
    input_tmp = _save_temp(file)
    try:
        result = biometric_service.verify_fingerprint(str(input_tmp), fingerprint_data)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("verify_fingerprint failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/update-fingerprint")
async def update_fingerprint(
    file: UploadFile = File(..., description="PDF to update fingerprint in"),
    fingerprint_data: str = Form(..., description="New fingerprint data"),
):
    """Update fingerprint biometric data in a PDF document."""
    input_tmp = _save_temp(file)
    output_tmp = str(_output_path())
    try:
        result = biometric_service.update_fingerprint(str(input_tmp), output_tmp, fingerprint_data)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("update_fingerprint failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/replace-fingerprint")
async def replace_fingerprint(
    file: UploadFile = File(..., description="PDF to replace fingerprint in"),
    old_fingerprint: str = Form(..., description="Old fingerprint data to match"),
    new_fingerprint: str = Form(..., description="New fingerprint data"),
):
    """Replace fingerprint biometric data in a PDF document."""
    input_tmp = _save_temp(file)
    output_tmp = str(_output_path())
    try:
        result = biometric_service.replace_fingerprint(
            str(input_tmp), output_tmp, old_fingerprint, new_fingerprint
        )
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("replace_fingerprint failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/remove-fingerprint")
async def remove_fingerprint(
    file: UploadFile = File(..., description="PDF to remove fingerprint from"),
):
    """Remove fingerprint biometric data from a PDF document."""
    input_tmp = _save_temp(file)
    output_tmp = str(_output_path())
    try:
        result = biometric_service.remove_fingerprint(str(input_tmp), output_tmp)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("remove_fingerprint failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/match-fingerprint")
async def match_fingerprint(
    file: UploadFile = File(..., description="PDF with fingerprint data"),
    fingerprint_data: str = Form(..., description="Fingerprint data to match"),
):
    """Match fingerprint data against stored fingerprint in a PDF."""
    input_tmp = _save_temp(file)
    try:
        result = biometric_service.match_fingerprint(str(input_tmp), fingerprint_data)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("match_fingerprint failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


# ── Face Signature ────────────────────────────────────────────────────────


@router.post("/add-face-signature")
async def add_face_signature(
    file: UploadFile = File(..., description="PDF to add face signature to"),
    face_image: UploadFile = File(..., description="Face image data"),
):
    """Add face biometric signature to a PDF document."""
    input_tmp = _save_temp(file)
    face_tmp = _save_temp(face_image)
    output_tmp = str(_output_path())
    try:
        result = biometric_service.add_face_signature(str(input_tmp), output_tmp, str(face_tmp))
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("add_face_signature failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)
        face_tmp.unlink(missing_ok=True)


@router.post("/verify-face-signature")
async def verify_face_signature(
    file: UploadFile = File(..., description="PDF with face signature"),
    face_image: UploadFile = File(..., description="Face image to verify"),
):
    """Verify face biometric signature stored in a PDF document."""
    input_tmp = _save_temp(file)
    face_tmp = _save_temp(face_image)
    try:
        result = biometric_service.verify_face_signature(str(input_tmp), str(face_tmp))
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("verify_face_signature failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)
        face_tmp.unlink(missing_ok=True)


@router.post("/remove-face-signature")
async def remove_face_signature(
    file: UploadFile = File(..., description="PDF to remove face signature from"),
):
    """Remove face biometric signature from a PDF document."""
    input_tmp = _save_temp(file)
    output_tmp = str(_output_path())
    try:
        result = biometric_service.remove_face_signature(str(input_tmp), output_tmp)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("remove_face_signature failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


# ── Handwritten Signature ─────────────────────────────────────────────────


@router.post("/add-handwritten-signature")
async def add_handwritten_signature(
    file: UploadFile = File(..., description="PDF to add handwritten signature to"),
    signature_image: UploadFile = File(..., description="Handwritten signature image"),
):
    """Add handwritten biometric signature to a PDF document."""
    input_tmp = _save_temp(file)
    sig_tmp = _save_temp(signature_image)
    output_tmp = str(_output_path())
    try:
        result = biometric_service.add_handwritten_signature(str(input_tmp), output_tmp, str(sig_tmp))
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("add_handwritten_signature failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)
        sig_tmp.unlink(missing_ok=True)


@router.post("/verify-handwritten-signature")
async def verify_handwritten_signature(
    file: UploadFile = File(..., description="PDF with handwritten signature"),
    signature_image: UploadFile = File(..., description="Handwritten signature image to verify"),
):
    """Verify handwritten biometric signature stored in a PDF document."""
    input_tmp = _save_temp(file)
    sig_tmp = _save_temp(signature_image)
    try:
        result = biometric_service.verify_handwritten_signature(str(input_tmp), str(sig_tmp))
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("verify_handwritten_signature failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)
        sig_tmp.unlink(missing_ok=True)


@router.post("/remove-handwritten-signature")
async def remove_handwritten_signature(
    file: UploadFile = File(..., description="PDF to remove handwritten signature from"),
):
    """Remove handwritten biometric signature from a PDF document."""
    input_tmp = _save_temp(file)
    output_tmp = str(_output_path())
    try:
        result = biometric_service.remove_handwritten_signature(str(input_tmp), output_tmp)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("remove_handwritten_signature failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


# ── Iris Signature ────────────────────────────────────────────────────────


@router.post("/add-iris-signature")
async def add_iris_signature(
    file: UploadFile = File(..., description="PDF to add iris signature to"),
    iris_data: str = Form(..., description="Iris biometric template data"),
):
    """Add iris biometric signature to a PDF document."""
    input_tmp = _save_temp(file)
    output_tmp = str(_output_path())
    try:
        result = biometric_service.add_iris_signature(str(input_tmp), output_tmp, iris_data)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("add_iris_signature failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/verify-iris-signature")
async def verify_iris_signature(
    file: UploadFile = File(..., description="PDF with iris signature"),
    iris_data: str = Form(..., description="Iris data to verify"),
):
    """Verify iris biometric signature stored in a PDF document."""
    input_tmp = _save_temp(file)
    try:
        result = biometric_service.verify_iris_signature(str(input_tmp), iris_data)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("verify_iris_signature failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/remove-iris-signature")
async def remove_iris_signature(
    file: UploadFile = File(..., description="PDF to remove iris signature from"),
):
    """Remove iris biometric signature from a PDF document."""
    input_tmp = _save_temp(file)
    output_tmp = str(_output_path())
    try:
        result = biometric_service.remove_iris_signature(str(input_tmp), output_tmp)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("remove_iris_signature failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


# ── Palm Signature ────────────────────────────────────────────────────────


@router.post("/add-palm-signature")
async def add_palm_signature(
    file: UploadFile = File(..., description="PDF to add palm signature to"),
    palm_data: str = Form(..., description="Palm biometric template data"),
):
    """Add palm biometric signature to a PDF document."""
    input_tmp = _save_temp(file)
    output_tmp = str(_output_path())
    try:
        result = biometric_service.add_palm_signature(str(input_tmp), output_tmp, palm_data)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("add_palm_signature failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/verify-palm-signature")
async def verify_palm_signature(
    file: UploadFile = File(..., description="PDF with palm signature"),
    palm_data: str = Form(..., description="Palm data to verify"),
):
    """Verify palm biometric signature stored in a PDF document."""
    input_tmp = _save_temp(file)
    try:
        result = biometric_service.verify_palm_signature(str(input_tmp), palm_data)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("verify_palm_signature failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/remove-palm-signature")
async def remove_palm_signature(
    file: UploadFile = File(..., description="PDF to remove palm signature from"),
):
    """Remove palm biometric signature from a PDF document."""
    input_tmp = _save_temp(file)
    output_tmp = str(_output_path())
    try:
        result = biometric_service.remove_palm_signature(str(input_tmp), output_tmp)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("remove_palm_signature failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


# ── Voice Signature ───────────────────────────────────────────────────────


@router.post("/add-voice-signature")
async def add_voice_signature(
    file: UploadFile = File(..., description="PDF to add voice signature to"),
    voice_data: str = Form(..., description="Voice biometric template data"),
):
    """Add voice biometric signature to a PDF document."""
    input_tmp = _save_temp(file)
    output_tmp = str(_output_path())
    try:
        result = biometric_service.add_voice_signature(str(input_tmp), output_tmp, voice_data)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("add_voice_signature failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/verify-voice-signature")
async def verify_voice_signature(
    file: UploadFile = File(..., description="PDF with voice signature"),
    voice_data: str = Form(..., description="Voice data to verify"),
):
    """Verify voice biometric signature stored in a PDF document."""
    input_tmp = _save_temp(file)
    try:
        result = biometric_service.verify_voice_signature(str(input_tmp), voice_data)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("verify_voice_signature failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/remove-voice-signature")
async def remove_voice_signature(
    file: UploadFile = File(..., description="PDF to remove voice signature from"),
):
    """Remove voice biometric signature from a PDF document."""
    input_tmp = _save_temp(file)
    output_tmp = str(_output_path())
    try:
        result = biometric_service.remove_voice_signature(str(input_tmp), output_tmp)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("remove_voice_signature failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


# ── Utility Endpoints ─────────────────────────────────────────────────────


@router.post("/validation")
async def validation(
    file: UploadFile = File(..., description="PDF to validate biometric data"),
):
    """Validate all biometric data in a PDF document."""
    input_tmp = _save_temp(file)
    try:
        result = biometric_service.validate_biometric(str(input_tmp))
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("validation failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/timestamp")
async def timestamp(
    file: UploadFile = File(..., description="PDF to get biometric timestamp"),
):
    """Get biometric timestamps from a PDF document."""
    input_tmp = _save_temp(file)
    try:
        result = biometric_service.get_timestamp(str(input_tmp))
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("timestamp failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/audit-trail")
async def audit_trail(
    file: UploadFile = File(..., description="PDF to get biometric audit trail"),
):
    """Get biometric audit trail from a PDF document."""
    input_tmp = _save_temp(file)
    try:
        result = biometric_service.get_audit_trail(str(input_tmp))
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("audit_trail failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/history")
async def history(
    file: UploadFile = File(..., description="PDF to get biometric history"),
):
    """Get biometric history from a PDF document."""
    input_tmp = _save_temp(file)
    try:
        result = biometric_service.get_history(str(input_tmp))
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("history failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/export")
async def export_biometric(
    file: UploadFile = File(..., description="PDF to export biometric data"),
):
    """Export all biometric data from a PDF document."""
    input_tmp = _save_temp(file)
    try:
        result = biometric_service.export_biometric(str(input_tmp))
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("export failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/import")
async def import_biometric(
    file: UploadFile = File(..., description="PDF to import biometric data into"),
    biometric_data: str = Form(..., description="JSON string of biometric data to import"),
):
    """Import biometric data into a PDF document."""
    input_tmp = _save_temp(file)
    try:
        result = biometric_service.import_biometric(str(input_tmp), biometric_data)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("import failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/extract")
async def extract(
    file: UploadFile = File(..., description="PDF to extract biometric data from"),
):
    """Extract biometric data from a PDF document."""
    input_tmp = _save_temp(file)
    try:
        result = biometric_service.extract_biometric(str(input_tmp))
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("extract failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/lock")
async def lock(
    file: UploadFile = File(..., description="PDF to lock biometric data"),
    passcode: str = Form(..., description="Passcode to lock with"),
):
    """Lock biometric data in a PDF with a passcode."""
    input_tmp = _save_temp(file)
    output_tmp = str(_output_path())
    try:
        result = biometric_service.lock_biometric(str(input_tmp), output_tmp, passcode)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("lock failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/unlock")
async def unlock(
    file: UploadFile = File(..., description="PDF to unlock biometric data"),
    passcode: str = Form(..., description="Passcode to unlock with"),
):
    """Unlock biometric data in a PDF with a passcode."""
    input_tmp = _save_temp(file)
    try:
        result = biometric_service.unlock_biometric(str(input_tmp), passcode)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("unlock failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/backup")
async def backup(
    file: UploadFile = File(..., description="PDF to backup biometric data from"),
):
    """Create a backup of all biometric data in a PDF document."""
    input_tmp = _save_temp(file)
    try:
        result = biometric_service.backup_biometric(str(input_tmp))
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("backup failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)


@router.post("/restore")
async def restore(
    file: UploadFile = File(..., description="PDF to restore biometric data into"),
    backup_data: str = Form(..., description="JSON string of backup data to restore"),
):
    """Restore biometric data from a backup into a PDF document."""
    input_tmp = _save_temp(file)
    try:
        result = biometric_service.restore_biometric(str(input_tmp), backup_data)
        return JSONResponse(content=result)
    except Exception as exc:
        logger.exception("restore failed")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_tmp.unlink(missing_ok=True)
