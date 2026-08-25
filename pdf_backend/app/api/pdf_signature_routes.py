"""
API Routes for PDF Signature features.
"""

from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, Response

from app.core.paths import Paths
from app.pdf_signature_services.signature_service import PDFSignatureService

logger = logging.getLogger(__name__)

router = APIRouter()

signature_service = PDFSignatureService()


# ── Helper ──────────────────────────────────────────────────────────────────

async def _save_upload(file: UploadFile, dest: Path) -> None:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail=f"Uploaded file '{file.filename}' is empty.")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(content)


def _get_request_id(request: Request) -> str:
    rid = request.headers.get("X-Request-ID")
    if not rid:
        rid = getattr(request.state, "request_id", uuid.uuid4().hex[:16])
    return rid


# ── 1. Digital Signature ────────────────────────────────────────────────────

@router.post("/signature/digital-sign")
async def digital_sign(
    request: Request,
    file: UploadFile = File(...),
    cert_file: UploadFile = File(...),
    key_file: UploadFile = File(...),
):
    """Add a cryptographic digital signature using certificate and private key."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    cert_path = upload_dir / (cert_file.filename or "cert.pem")
    key_path = upload_dir / (key_file.filename or "key.pem")
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)
    await _save_upload(cert_file, cert_path)
    await _save_upload(key_file, key_path)

    try:
        result = signature_service.add_digital_signature(
            str(input_path), str(output_path), str(cert_path), str(key_path)
        )
        return {
            "success": True,
            "message": "Digital signature added successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Digital sign error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 2. E-Signature ──────────────────────────────────────────────────────────

@router.post("/signature/e-sign")
async def e_sign(
    request: Request,
    file: UploadFile = File(...),
    signer_name: str = Form(...),
    reason: str = Form(""),
):
    """Add an electronic signature with signer name and reason."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.add_esignature(
            str(input_path), str(output_path), signer_name, reason
        )
        return {
            "success": True,
            "message": "Electronic signature added successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"E-sign error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 3. Simple PDF Sign ─────────────────────────────────────────────────────

@router.post("/signature/pdf-sign")
async def pdf_sign(
    request: Request,
    file: UploadFile = File(...),
):
    """Simple PDF signing with default certificate."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.sign_pdf(str(input_path), str(output_path))
        return {
            "success": True,
            "message": "PDF signed successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"PDF sign error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 4. Biometric Signature ─────────────────────────────────────────────────

@router.post("/signature/biometric-sign")
async def biometric_sign(
    request: Request,
    file: UploadFile = File(...),
    signature_image: UploadFile = File(...),
):
    """Add a biometric signature from a signature image."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")
    if not signature_image or not signature_image.filename:
        raise HTTPException(status_code=400, detail="Signature image is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    sig_img_path = upload_dir / (signature_image.filename or "signature.png")
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)
    await _save_upload(signature_image, sig_img_path)

    try:
        result = signature_service.add_biometric_signature(
            str(input_path), str(output_path), str(sig_img_path)
        )
        return {
            "success": True,
            "message": "Biometric signature added successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Biometric sign error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 5. Cloud Signature ─────────────────────────────────────────────────────

@router.post("/signature/cloud-sign")
async def cloud_sign(
    request: Request,
    file: UploadFile = File(...),
    provider: str = Form("default"),
):
    """Cloud-based signature via external provider."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.add_cloud_signature(
            str(input_path), str(output_path), provider
        )
        return {
            "success": True,
            "message": "Cloud signature added successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Cloud sign error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 6. Visible Signature ───────────────────────────────────────────────────

@router.post("/signature/visible-signature")
async def visible_signature(
    request: Request,
    file: UploadFile = File(...),
    x: float = Form(100.0),
    y: float = Form(100.0),
    page: int = Form(1),
    signer_name: str = Form("Signer"),
):
    """Add a visible signature at specified position on a page."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.add_visible_signature(
            str(input_path), str(output_path), x, y, page, signer_name
        )
        return {
            "success": True,
            "message": "Visible signature added successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Visible signature error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 7. Invisible Signature ─────────────────────────────────────────────────

@router.post("/signature/invisible-signature")
async def invisible_signature(
    request: Request,
    file: UploadFile = File(...),
):
    """Add an invisible digital signature to the document."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.add_invisible_signature(
            str(input_path), str(output_path)
        )
        return {
            "success": True,
            "message": "Invisible signature added successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Invisible signature error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 8. Create Signature Field ───────────────────────────────────────────────

@router.post("/signature/create-field")
async def create_signature_field(
    request: Request,
    file: UploadFile = File(...),
    field_name: str = Form(...),
    x: float = Form(100.0),
    y: float = Form(100.0),
    page: int = Form(1),
):
    """Create a signature form field at specified position."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.create_signature_field(
            str(input_path), str(output_path), field_name, x, y, page
        )
        return {
            "success": True,
            "message": "Signature field created successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Create field error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 9. PKI Signature ───────────────────────────────────────────────────────

@router.post("/signature/pki-sign")
async def pki_sign(
    request: Request,
    file: UploadFile = File(...),
):
    """Add PKI-based digital signature."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.add_pki_signature(
            str(input_path), str(output_path)
        )
        return {
            "success": True,
            "message": "PKI signature added successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"PKI sign error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 10. Appearance Templates ───────────────────────────────────────────────

@router.get("/signature/appearance-templates")
async def appearance_templates():
    """Get available signature appearance templates."""
    try:
        result = signature_service.get_appearance_templates()
        return {
            "success": True,
            "message": "Templates retrieved successfully.",
            "data": result,
        }
    except Exception as e:
        logger.error(f"Appearance templates error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 11. USB Token Sign ─────────────────────────────────────────────────────

@router.post("/signature/usb-token-sign")
async def usb_token_sign(
    request: Request,
    file: UploadFile = File(...),
):
    """Sign PDF using USB token certificate."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.add_usb_token_signature(
            str(input_path), str(output_path)
        )
        return {
            "success": True,
            "message": "USB token signature added successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"USB token sign error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 12. Timestamp Signature ────────────────────────────────────────────────

@router.post("/signature/timestamp-sign")
async def timestamp_sign(
    request: Request,
    file: UploadFile = File(...),
):
    """Add a trusted timestamp signature to the document."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.add_timestamp_signature(
            str(input_path), str(output_path)
        )
        return {
            "success": True,
            "message": "Timestamp signature added successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Timestamp sign error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 13. Validate Signature ─────────────────────────────────────────────────

@router.post("/signature/validate")
async def validate_signature(
    request: Request,
    file: UploadFile = File(...),
):
    """Validate all digital signatures in a PDF."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.validate_signature(str(input_path))
        return {
            "success": True,
            "message": "Signature validation completed.",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Validate signature error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 14. Audit Trail ────────────────────────────────────────────────────────

@router.post("/signature/audit-trail")
async def audit_trail(
    request: Request,
    file: UploadFile = File(...),
):
    """Get the audit trail for all signatures in a PDF."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.get_audit_trail(str(input_path))
        return {
            "success": True,
            "message": "Audit trail retrieved successfully.",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Audit trail error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 15. Signature History ──────────────────────────────────────────────────

@router.post("/signature/history")
async def signature_history(
    request: Request,
    file: UploadFile = File(...),
):
    """Get the full signing history of a document."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.get_signature_history(str(input_path))
        return {
            "success": True,
            "message": "Signature history retrieved successfully.",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Signature history error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 16. Certificate Viewer ─────────────────────────────────────────────────

@router.post("/signature/certificate-viewer")
async def certificate_viewer(
    request: Request,
    file: UploadFile = File(...),
):
    """View certificate details embedded in a signed PDF."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.view_certificate(str(input_path))
        return {
            "success": True,
            "message": "Certificate details retrieved.",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Certificate viewer error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 17. Certificate Import ─────────────────────────────────────────────────

@router.post("/signature/certificate-import")
async def certificate_import(
    request: Request,
    cert_file: UploadFile = File(...),
):
    """Import a certificate for signing."""
    request_id = _get_request_id(request)
    if not cert_file or not cert_file.filename:
        raise HTTPException(status_code=400, detail="Certificate file is required.")

    upload_dir = Paths.request_upload(request_id)
    cert_path = upload_dir / cert_file.filename

    await _save_upload(cert_file, cert_path)

    try:
        result = signature_service.import_certificate(str(cert_path))
        return {
            "success": True,
            "message": "Certificate imported successfully.",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Certificate import error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 18. Certificate Export ─────────────────────────────────────────────────

@router.post("/signature/certificate-export")
async def certificate_export(
    request: Request,
    file: UploadFile = File(...),
):
    """Export the signing certificate from a signed PDF."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.export_certificate(str(input_path))
        return {
            "success": True,
            "message": "Certificate exported successfully.",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Certificate export error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 19. Certificate Revocation ─────────────────────────────────────────────

@router.post("/signature/certificate-revocation")
async def certificate_revocation(
    request: Request,
    file: UploadFile = File(...),
):
    """Check certificate revocation status via CRL/OCSP."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.check_revocation(str(input_path))
        return {
            "success": True,
            "message": "Revocation check completed.",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Certificate revocation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 20. Delegated Signing ──────────────────────────────────────────────────

@router.post("/signature/delegated-signing")
async def delegated_signing(
    request: Request,
    file: UploadFile = File(...),
):
    """Delegate signing authority to another party."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.add_delegated_signature(
            str(input_path), str(output_path)
        )
        return {
            "success": True,
            "message": "Delegated signature added successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Delegated signing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 21. Multi-Signer ──────────────────────────────────────────────────────

@router.post("/signature/multi-signer")
async def multi_signer(
    request: Request,
    file: UploadFile = File(...),
    signer_names: str = Form(...),
):
    """Add multiple signatures from multiple signers (comma-separated names)."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    signers = [s.strip() for s in signer_names.split(",") if s.strip()]

    try:
        result = signature_service.multi_sign(
            str(input_path), str(output_path), signers
        )
        return {
            "success": True,
            "message": "Multi-signer signatures added successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Multi-signer error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 22. Signing Order ──────────────────────────────────────────────────────

@router.post("/signature/signing-order")
async def signing_order(
    request: Request,
    file: UploadFile = File(...),
    order: str = Form("sequential"),
):
    """Set the signing order for multi-signer workflows."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    order_list = [o.strip() for o in order.split(",") if o.strip()]

    try:
        result = signature_service.set_signing_order(
            str(input_path), str(output_path), order_list
        )
        return {
            "success": True,
            "message": "Signing order set successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Signing order error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 23. Status Dashboard ───────────────────────────────────────────────────

@router.post("/signature/status-dashboard")
async def status_dashboard(
    request: Request,
    file: UploadFile = File(...),
):
    """Get the current signing status and workflow dashboard."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.get_status_dashboard(str(input_path))
        return {
            "success": True,
            "message": "Status dashboard retrieved.",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Status dashboard error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 24. Face Verification ──────────────────────────────────────────────────

@router.post("/signature/face-verification")
async def face_verification(
    request: Request,
    file: UploadFile = File(...),
):
    """Run face verification before signing."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.face_verify(str(input_path))
        return {
            "success": True,
            "message": "Face verification completed.",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Face verification error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 25. OTP Verification ───────────────────────────────────────────────────

@router.post("/signature/otp-verification")
async def otp_verification(
    request: Request,
    file: UploadFile = File(...),
):
    """Run OTP verification before signing."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.otp_verify(str(input_path))
        return {
            "success": True,
            "message": "OTP verification completed.",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"OTP verification error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 26. QR Verify ──────────────────────────────────────────────────────────

@router.post("/signature/qr-verify")
async def qr_verify(
    request: Request,
    file: UploadFile = File(...),
):
    """Verify signature via QR code embedded in the PDF."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.qr_verify(str(input_path))
        return {
            "success": True,
            "message": "QR verification completed.",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"QR verify error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 27. Remote Sign ────────────────────────────────────────────────────────

@router.post("/signature/remote-sign")
async def remote_sign(
    request: Request,
    file: UploadFile = File(...),
):
    """Send PDF for remote signature via external service."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.remote_sign(
            str(input_path), str(output_path)
        )
        return {
            "success": True,
            "message": "Remote signing initiated.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Remote sign error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 28. Lock Document ──────────────────────────────────────────────────────

@router.post("/signature/lock-document")
async def lock_document(
    request: Request,
    file: UploadFile = File(...),
):
    """Lock the document to prevent further modifications after signing."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.lock_document(
            str(input_path), str(output_path)
        )
        return {
            "success": True,
            "message": "Document locked successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Lock document error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 29. Reminder ───────────────────────────────────────────────────────────

@router.post("/signature/reminder")
async def reminder(
    request: Request,
    file: UploadFile = File(...),
):
    """Send a signing reminder notification."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.set_reminder(str(input_path))
        return {
            "success": True,
            "message": "Reminder sent successfully.",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Reminder error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 30. Expiration ─────────────────────────────────────────────────────────

@router.post("/signature/expiration")
async def expiration(
    request: Request,
    file: UploadFile = File(...),
    expiry_date: str = Form(...),
):
    """Set an expiration date for signatures in the document."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.set_expiration(
            str(input_path), str(output_path), expiry_date
        )
        return {
            "success": True,
            "message": "Signature expiration set successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Expiration error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 31. Comparison ─────────────────────────────────────────────────────────

@router.post("/signature/comparison")
async def comparison(
    request: Request,
    file: UploadFile = File(...),
):
    """Compare multiple signatures within a document."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.compare_signatures(str(input_path))
        return {
            "success": True,
            "message": "Signature comparison completed.",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Comparison error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 32. Compliance Check ───────────────────────────────────────────────────

@router.post("/signature/compliance-check")
async def compliance_check(
    request: Request,
    file: UploadFile = File(...),
):
    """Check signature compliance with standards (PAdES, PDF/A, etc.)."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.compliance_check(str(input_path))
        return {
            "success": True,
            "message": "Compliance check completed.",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Compliance check error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 33. Evidence Report ────────────────────────────────────────────────────

@router.post("/signature/evidence-report")
async def evidence_report(
    request: Request,
    file: UploadFile = File(...),
):
    """Generate a comprehensive signature evidence report."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.generate_evidence_report(str(input_path))
        return {
            "success": True,
            "message": "Evidence report generated.",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Evidence report error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 34. Reject Signature ───────────────────────────────────────────────────

@router.post("/signature/reject")
async def reject_signature(
    request: Request,
    file: UploadFile = File(...),
):
    """Reject a pending signature request."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.reject_signature(
            str(input_path), str(output_path)
        )
        return {
            "success": True,
            "message": "Signature request rejected.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Reject signature error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 35. Reuse Signature ────────────────────────────────────────────────────

@router.post("/signature/reuse")
async def reuse_signature(
    request: Request,
    file: UploadFile = File(...),
):
    """Reuse an existing signature from another document."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.reuse_signature(
            str(input_path), str(output_path)
        )
        return {
            "success": True,
            "message": "Signature reused successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Reuse signature error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 36. Auto Place Signature ───────────────────────────────────────────────

@router.post("/signature/auto-place")
async def auto_place_signature(
    request: Request,
    file: UploadFile = File(...),
):
    """Automatically detect and place signature in the optimal position."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.auto_place_signature(
            str(input_path), str(output_path)
        )
        return {
            "success": True,
            "message": "Signature auto-placed successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Auto-place error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 37. Witness Sign ───────────────────────────────────────────────────────

@router.post("/signature/witness-sign")
async def witness_sign(
    request: Request,
    file: UploadFile = File(...),
    witness_name: str = Form("Witness"),
):
    """Add a witness signature to validate the primary signature."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.witness_sign(
            str(input_path), str(output_path), witness_name
        )
        return {
            "success": True,
            "message": "Witness signature added successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Witness sign error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 38. Initial Sign ───────────────────────────────────────────────────────

@router.post("/signature/initial-sign")
async def initial_sign(
    request: Request,
    file: UploadFile = File(...),
    initial_name: str = Form("Initial"),
):
    """Add an initial signature (short form of full signature)."""
    request_id = _get_request_id(request)
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    upload_dir = Paths.request_upload(request_id)
    input_path = upload_dir / file.filename
    output_path = Paths.request_output(request_id) / file.filename

    await _save_upload(file, input_path)

    try:
        result = signature_service.initial_sign(
            str(input_path), str(output_path), initial_name
        )
        return {
            "success": True,
            "message": "Initial signature added successfully.",
            "data": {
                "output_file": str(output_path),
                "request_id": request_id,
                **result,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Initial sign error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
