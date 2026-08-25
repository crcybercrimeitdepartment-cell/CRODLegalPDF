"""
API Routes for PDF Security features.
"""

from __future__ import annotations

import logging
import re
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from app.core.paths import Paths
from app.utils.file_handler import save_upload
from app.pdf_security_services.security_service import pdf_security_service

logger = logging.getLogger(__name__)

router = APIRouter()


# ── HELPERS ──────────────────────────────────────────────────────────────

def _get_request_id(request: Request) -> str:
    rid = request.headers.get("X-Request-ID")
    if not rid:
        rid = getattr(request.state, "request_id", uuid.uuid4().hex[:16])
    return rid


def _save_upload_to_request(file: UploadFile, request_id: str) -> tuple[Path, str]:
    """Save an uploaded file to the request upload directory and return (path, filename)."""
    filename = file.filename or f"upload_{uuid.uuid4().hex[:8]}.pdf"
    upload_dir = Paths.request_upload(request_id)
    dest = upload_dir / filename
    import asyncio
    asyncio.get_event_loop().run_until_complete(save_upload(file.file, dest))
    return dest, filename


def _output_path(request_id: str, filename: str) -> Path:
    return Paths.request_output(request_id) / filename


def _download_url(request_id: str, filename: str) -> str:
    return f"/api/pdf/download/{request_id}/{filename}"


# ── 1. PROTECT PDF ──────────────────────────────────────────────────────

@router.post("/security/protect")
async def protect_pdf(
    request: Request,
    file: UploadFile = File(...),
    password: str = Form(...),
):
    """Password protect a PDF with encryption."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required.")

    try:
        upload_path, filename = _save_upload_to_request(file, request_id)
        output_file = f"protected_{filename}"
        out_path = _output_path(request_id, output_file)

        result = pdf_security_service.protect_pdf(str(upload_path), str(out_path), password)

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Protection failed."))

        return {
            **result,
            "download_url": _download_url(request_id, output_file),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"protect_pdf error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 2. UNLOCK PDF ───────────────────────────────────────────────────────

@router.post("/security/unlock")
async def unlock_pdf(
    request: Request,
    file: UploadFile = File(...),
    password: str = Form(...),
):
    """Remove password protection from a PDF."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required.")

    try:
        upload_path, filename = _save_upload_to_request(file, request_id)
        output_file = f"unlocked_{filename}"
        out_path = _output_path(request_id, output_file)

        result = pdf_security_service.unlock_pdf(str(upload_path), str(out_path), password)

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Unlock failed."))

        return {
            **result,
            "download_url": _download_url(request_id, output_file),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"unlock_pdf error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 3. REMOVE JAVASCRIPT ───────────────────────────────────────────────

@router.post("/security/remove-javascript")
async def remove_javascript(
    request: Request,
    file: UploadFile = File(...),
):
    """Remove all JavaScript from a PDF."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, filename = _save_upload_to_request(file, request_id)
        output_file = f"no_js_{filename}"
        out_path = _output_path(request_id, output_file)

        result = pdf_security_service.remove_javascript(str(upload_path), str(out_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "JavaScript removal failed."))

        return {
            **result,
            "download_url": _download_url(request_id, output_file),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"remove_javascript error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 4. REMOVE FORM DATA ────────────────────────────────────────────────

@router.post("/security/remove-form-data")
async def remove_form_data(
    request: Request,
    file: UploadFile = File(...),
):
    """Remove all form data from a PDF."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, filename = _save_upload_to_request(file, request_id)
        output_file = f"no_forms_{filename}"
        out_path = _output_path(request_id, output_file)

        result = pdf_security_service.remove_form_data(str(upload_path), str(out_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Form data removal failed."))

        return {
            **result,
            "download_url": _download_url(request_id, output_file),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"remove_form_data error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 5. REMOVE HIDDEN DATA ──────────────────────────────────────────────

@router.post("/security/remove-hidden-data")
async def remove_hidden_data(
    request: Request,
    file: UploadFile = File(...),
):
    """Remove hidden data, metadata, and attachments from a PDF."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, filename = _save_upload_to_request(file, request_id)
        output_file = f"clean_{filename}"
        out_path = _output_path(request_id, output_file)

        result = pdf_security_service.remove_hidden_data(str(upload_path), str(out_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Hidden data removal failed."))

        return {
            **result,
            "download_url": _download_url(request_id, output_file),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"remove_hidden_data error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 6. RESTRICT EXTRACTION ─────────────────────────────────────────────

@router.post("/security/restrict-extraction")
async def restrict_extraction(
    request: Request,
    file: UploadFile = File(...),
):
    """Restrict page extraction from a PDF."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, filename = _save_upload_to_request(file, request_id)
        output_file = f"no_extract_{filename}"
        out_path = _output_path(request_id, output_file)

        result = pdf_security_service.restrict_extraction(str(upload_path), str(out_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Extraction restriction failed."))

        return {
            **result,
            "download_url": _download_url(request_id, output_file),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"restrict_extraction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 7. RESTRICT COPY ───────────────────────────────────────────────────

@router.post("/security/restrict-copy")
async def restrict_copy(
    request: Request,
    file: UploadFile = File(...),
):
    """Restrict text copying and accessibility."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, filename = _save_upload_to_request(file, request_id)
        output_file = f"no_copy_{filename}"
        out_path = _output_path(request_id, output_file)

        result = pdf_security_service.restrict_copy(str(upload_path), str(out_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Copy restriction failed."))

        return {
            **result,
            "download_url": _download_url(request_id, output_file),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"restrict_copy error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 8. SECURITY SCORE ──────────────────────────────────────────────────

@router.post("/security/security-score")
async def security_score(
    request: Request,
    file: UploadFile = File(...),
):
    """Analyse a PDF and return a comprehensive security score."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, _ = _save_upload_to_request(file, request_id)
        result = pdf_security_service.get_security_score(str(upload_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Security score failed."))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"security_score error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 9. MALWARE SCAN ────────────────────────────────────────────────────

@router.post("/security/malware-scan")
async def malware_scan(
    request: Request,
    file: UploadFile = File(...),
):
    """Scan a PDF for suspicious objects and malware patterns."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, _ = _save_upload_to_request(file, request_id)
        result = pdf_security_service.scan_malware(str(upload_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Malware scan failed."))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"malware_scan error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 10. PDF/A VALIDATION ───────────────────────────────────────────────

@router.post("/security/pdfa-validation")
async def pdfa_validation(
    request: Request,
    file: UploadFile = File(...),
):
    """Validate PDF/A compliance of a document."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, _ = _save_upload_to_request(file, request_id)
        result = pdf_security_service.validate_pdfa(str(upload_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "PDF/A validation failed."))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"pdfa_validation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 11. DIGITAL SIGNATURE VERIFY ───────────────────────────────────────

@router.post("/security/digital-signature-verify")
async def digital_signature_verify(
    request: Request,
    file: UploadFile = File(...),
):
    """Verify digital signatures in a PDF."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, _ = _save_upload_to_request(file, request_id)
        result = pdf_security_service.verify_digital_signatures(str(upload_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Signature verification failed."))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"digital_signature_verify error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 12. DOCUMENT INTEGRITY ─────────────────────────────────────────────

@router.post("/security/document-integrity")
async def document_integrity(
    request: Request,
    file: UploadFile = File(...),
):
    """Verify document integrity via hashing and structure checks."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, _ = _save_upload_to_request(file, request_id)
        result = pdf_security_service.check_document_integrity(str(upload_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Integrity check failed."))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"document_integrity error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 13. EMBEDDED FILE DETECT ───────────────────────────────────────────

@router.post("/security/embedded-file-detect")
async def embedded_file_detect(
    request: Request,
    file: UploadFile = File(...),
):
    """Detect embedded files and attachments in a PDF."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, _ = _save_upload_to_request(file, request_id)
        result = pdf_security_service.detect_embedded_files(str(upload_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Embedded file detection failed."))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"embedded_file_detect error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 14. EMBEDDED MEDIA DETECT ──────────────────────────────────────────

@router.post("/security/embedded-media-detect")
async def embedded_media_detect(
    request: Request,
    file: UploadFile = File(...),
):
    """Detect embedded media (images, audio, video) in a PDF."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, _ = _save_upload_to_request(file, request_id)
        result = pdf_security_service.detect_embedded_media(str(upload_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Embedded media detection failed."))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"embedded_media_detect error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 15. FILE EXPIRATION ────────────────────────────────────────────────

@router.post("/security/file-expiration")
async def file_expiration(
    request: Request,
    file: UploadFile = File(...),
):
    """Check and verify file expiration metadata."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, _ = _save_upload_to_request(file, request_id)
        result = pdf_security_service.check_expiration(str(upload_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Expiration check failed."))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"file_expiration error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 16. HIDE SENSITIVE INFORMATION ─────────────────────────────────────

@router.post("/security/hide-sensitive")
async def hide_sensitive(
    request: Request,
    file: UploadFile = File(...),
):
    """Redact detected sensitive information patterns from the PDF."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, filename = _save_upload_to_request(file, request_id)
        output_file = f"redacted_{filename}"
        out_path = _output_path(request_id, output_file)

        result = pdf_security_service.hide_sensitive_info(str(upload_path), str(out_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Sensitive data redaction failed."))

        return {
            **result,
            "download_url": _download_url(request_id, output_file),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"hide_sensitive error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 17. BLACKOUT AREAS ─────────────────────────────────────────────────

@router.post("/security/blackout-areas")
async def blackout_areas(
    request: Request,
    file: UploadFile = File(...),
    areas: str = Form(...),
):
    """Blackout/redact specific rectangular areas in the PDF.

    `areas` is a JSON string: [{"page": 1, "x0": 10, "y0": 10, "x1": 200, "y1": 50}]
    """
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        import json
        area_list = json.loads(areas)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid areas JSON format.")

    try:
        upload_path, filename = _save_upload_to_request(file, request_id)
        output_file = f"blackout_{filename}"
        out_path = _output_path(request_id, output_file)

        result = pdf_security_service.blackout_areas(str(upload_path), str(out_path), area_list)

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Blackout failed."))

        return {
            **result,
            "download_url": _download_url(request_id, output_file),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"blackout_areas error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 18. METADATA PROTECTION ────────────────────────────────────────────

@router.post("/security/metadata-protection")
async def metadata_protection(
    request: Request,
    file: UploadFile = File(...),
):
    """Remove or protect PDF metadata to prevent information leakage."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, filename = _save_upload_to_request(file, request_id)
        output_file = f"meta_protected_{filename}"
        out_path = _output_path(request_id, output_file)

        result = pdf_security_service.protect_metadata(str(upload_path), str(out_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Metadata protection failed."))

        return {
            **result,
            "download_url": _download_url(request_id, output_file),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"metadata_protection error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 19. SANITIZE PDF ───────────────────────────────────────────────────

@router.post("/security/sanitize")
async def sanitize_pdf(
    request: Request,
    file: UploadFile = File(...),
):
    """Perform full PDF sanitization: remove JS, forms, metadata, attachments."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, filename = _save_upload_to_request(file, request_id)
        output_file = f"sanitized_{filename}"
        out_path = _output_path(request_id, output_file)

        result = pdf_security_service.sanitize_pdf(str(upload_path), str(out_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Sanitization failed."))

        return {
            **result,
            "download_url": _download_url(request_id, output_file),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"sanitize_pdf error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 20. POLICY TEMPLATES ───────────────────────────────────────────────

@router.post("/security/policy-templates")
async def policy_templates(request: Request):
    """Get available security policy templates."""
    try:
        return pdf_security_service.get_policy_templates()
    except Exception as e:
        logger.error(f"policy_templates error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 21. VERSION SECURITY ───────────────────────────────────────────────

@router.post("/security/version-check")
async def version_check(
    request: Request,
    file: UploadFile = File(...),
):
    """Check PDF version for known security issues."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, _ = _save_upload_to_request(file, request_id)
        result = pdf_security_service.check_version_security(str(upload_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Version check failed."))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"version_check error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 22. SECURE SHARING ─────────────────────────────────────────────────

@router.post("/security/secure-sharing")
async def secure_sharing(
    request: Request,
    file: UploadFile = File(...),
):
    """Create a secure sharing link for a PDF."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, _ = _save_upload_to_request(file, request_id)
        result = pdf_security_service.create_secure_share(str(upload_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Secure sharing failed."))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"secure_sharing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 23. AUDIT REPORT ───────────────────────────────────────────────────

@router.post("/security/audit-report")
async def audit_report(
    request: Request,
    file: UploadFile = File(...),
):
    """Generate a comprehensive security audit report."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, _ = _save_upload_to_request(file, request_id)
        result = pdf_security_service.generate_audit_report(str(upload_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Audit report failed."))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"audit_report error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 24. TRUSTED CERTS ──────────────────────────────────────────────────

@router.post("/security/trusted-certs")
async def trusted_certs(request: Request):
    """Get the list of trusted root certificates."""
    try:
        return pdf_security_service.get_trusted_certs()
    except Exception as e:
        logger.error(f"trusted_certs error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 25. UNSAFE LINK DETECT ─────────────────────────────────────────────

@router.post("/security/unsafe-link-detect")
async def unsafe_link_detect(
    request: Request,
    file: UploadFile = File(...),
):
    """Detect and analyse all URLs embedded in the PDF."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, _ = _save_upload_to_request(file, request_id)
        result = pdf_security_service.detect_unsafe_links(str(upload_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Link detection failed."))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"unsafe_link_detect error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 26. WATERMARK PROTECTION ───────────────────────────────────────────

@router.post("/security/watermark-protection")
async def watermark_protection(
    request: Request,
    file: UploadFile = File(...),
    watermark_text: str = Form("CONFIDENTIAL"),
):
    """Add a protective diagonal watermark to all pages."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, filename = _save_upload_to_request(file, request_id)
        output_file = f"watermarked_{filename}"
        out_path = _output_path(request_id, output_file)

        result = pdf_security_service.add_watermark_protection(
            str(upload_path), str(out_path), watermark_text
        )

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Watermark failed."))

        return {
            **result,
            "download_url": _download_url(request_id, output_file),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"watermark_protection error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 27. AI CLASSIFICATION ──────────────────────────────────────────────

@router.post("/security/ai-classification")
async def ai_classification(
    request: Request,
    file: UploadFile = File(...),
):
    """AI-based document type classification."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, _ = _save_upload_to_request(file, request_id)
        result = pdf_security_service.ai_classify_document(str(upload_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "AI classification failed."))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ai_classification error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 28. AI RECOMMENDATIONS ─────────────────────────────────────────────

@router.post("/security/ai-recommendations")
async def ai_recommendations(
    request: Request,
    file: UploadFile = File(...),
):
    """AI-driven security recommendations."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, _ = _save_upload_to_request(file, request_id)
        result = pdf_security_service.ai_security_recommendations(str(upload_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "AI recommendations failed."))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ai_recommendations error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 29. AI RISK DETECTION ──────────────────────────────────────────────

@router.post("/security/ai-risk-detection")
async def ai_risk_detection(
    request: Request,
    file: UploadFile = File(...),
):
    """AI-based security risk detection."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, _ = _save_upload_to_request(file, request_id)
        result = pdf_security_service.ai_risk_detection(str(upload_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "AI risk detection failed."))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ai_risk_detection error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 30. AI SENSITIVE DETECTION ─────────────────────────────────────────

@router.post("/security/ai-sensitive-detect")
async def ai_sensitive_detect(
    request: Request,
    file: UploadFile = File(...),
):
    """AI-based PII and sensitive data detection."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, _ = _save_upload_to_request(file, request_id)
        result = pdf_security_service.ai_sensitive_detection(str(upload_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "AI sensitive detection failed."))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ai_sensitive_detect error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 31. FORENSIC ANALYSIS ──────────────────────────────────────────────

@router.post("/security/forensic-analysis")
async def forensic_analysis(
    request: Request,
    file: UploadFile = File(...),
):
    """Deep forensic analysis of PDF internal structure."""
    request_id = _get_request_id(request)

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required.")

    try:
        upload_path, _ = _save_upload_to_request(file, request_id)
        result = pdf_security_service.forensic_analysis(str(upload_path))

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Forensic analysis failed."))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"forensic_analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
