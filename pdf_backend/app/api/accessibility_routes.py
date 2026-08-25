"""
API Routes for Accessibility features.
"""

from __future__ import annotations

import logging
import os
import tempfile
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from app.accessibility_services.accessibility_service import accessibility_service

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory store for document IDs (production would use a database)
_document_store: dict = {}


async def _save_upload(upload: UploadFile) -> str:
    """Save an uploaded file to a temp directory and return the path."""
    suffix = Path(upload.filename or "file.pdf").suffix or ".pdf"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=tempfile.gettempdir())
    content = await upload.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    tmp.write(content)
    tmp.close()
    return tmp.name


@router.post("/accessibility/upload")
async def upload_pdf(
    file: UploadFile = File(...),
):
    """Upload PDF for accessibility analysis."""
    input_path = await _save_upload(file)
    try:
        doc_id = accessibility_service.upload_pdf(input_path)
        _document_store[doc_id] = input_path
        return {"success": True, "document_id": doc_id}
    except Exception as e:
        logger.exception("upload_pdf failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/accessibility/wcag-checker/{doc_id}/scan")
async def wcag_scan(
    doc_id: str,
):
    """Run WCAG compliance scan on a stored document."""
    input_path = _document_store.get(doc_id)
    if not input_path:
        raise HTTPException(status_code=404, detail="Document not found. Upload the PDF first.")
    try:
        result = accessibility_service.wcag_scan(input_path)
        return result
    except Exception as e:
        logger.exception("wcag_scan failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/accessibility/pdfua-check")
async def pdfua_check(
    file: UploadFile = File(...),
):
    """Check PDF/UA compliance."""
    input_path = await _save_upload(file)
    try:
        result = accessibility_service.check_pdfua(input_path)
        return result
    except Exception as e:
        logger.exception("pdfua_check failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/accessibility/checker")
async def general_checker(
    file: UploadFile = File(...),
):
    """General accessibility check."""
    input_path = await _save_upload(file)
    try:
        result = accessibility_service.general_accessibility_check(input_path)
        return result
    except Exception as e:
        logger.exception("general_checker failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/accessibility/compliance-dashboard")
async def compliance_dashboard(
    file: UploadFile = File(...),
):
    """Get compliance dashboard data."""
    input_path = await _save_upload(file)
    try:
        result = accessibility_service.get_compliance_dashboard(input_path)
        return result
    except Exception as e:
        logger.exception("compliance_dashboard failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/accessibility/fix-suggestions")
async def fix_suggestions(
    file: UploadFile = File(...),
):
    """AI fix suggestions for accessibility issues."""
    input_path = await _save_upload(file)
    try:
        result = accessibility_service.get_fix_suggestions(input_path)
        return result
    except Exception as e:
        logger.exception("fix_suggestions failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/accessibility/export-report")
async def export_report(
    file: UploadFile = File(...),
):
    """Export accessibility report."""
    input_path = await _save_upload(file)
    try:
        result = accessibility_service.export_report(input_path)
        return result
    except Exception as e:
        logger.exception("export_report failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/accessibility/tagged-pdf-support")
async def tagged_pdf_support(
    file: UploadFile = File(...),
):
    """Check tagged PDF support."""
    input_path = await _save_upload(file)
    try:
        result = accessibility_service.check_tagged_pdf(input_path)
        return result
    except Exception as e:
        logger.exception("tagged_pdf_support failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/accessibility/screen-reader-support")
async def screen_reader_support(
    file: UploadFile = File(...),
):
    """Check screen reader support."""
    input_path = await _save_upload(file)
    try:
        result = accessibility_service.check_screen_reader_support(input_path)
        return result
    except Exception as e:
        logger.exception("screen_reader_support failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/accessibility/read-aloud")
async def read_aloud(
    file: UploadFile = File(...),
):
    """Generate read-aloud text."""
    input_path = await _save_upload(file)
    try:
        result = accessibility_service.get_read_aloud_text(input_path)
        return result
    except Exception as e:
        logger.exception("read_aloud failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/accessibility/reading-order")
async def reading_order(
    file: UploadFile = File(...),
):
    """Analyze reading order."""
    input_path = await _save_upload(file)
    try:
        result = accessibility_service.analyze_reading_order(input_path)
        return result
    except Exception as e:
        logger.exception("reading_order failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/accessibility/color-contrast")
async def color_contrast(
    file: UploadFile = File(...),
):
    """Check color contrast."""
    input_path = await _save_upload(file)
    try:
        result = accessibility_service.check_color_contrast(input_path)
        return result
    except Exception as e:
        logger.exception("color_contrast failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/accessibility/heading-structure")
async def heading_structure(
    file: UploadFile = File(...),
):
    """Validate heading structure."""
    input_path = await _save_upload(file)
    try:
        result = accessibility_service.validate_heading_structure(input_path)
        return result
    except Exception as e:
        logger.exception("heading_structure failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/accessibility/alt-text")
async def alt_text(
    file: UploadFile = File(...),
):
    """Check alt text for images."""
    input_path = await _save_upload(file)
    try:
        result = accessibility_service.check_alt_text(input_path)
        return result
    except Exception as e:
        logger.exception("alt_text failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/accessibility/accessible-forms")
async def accessible_forms(
    file: UploadFile = File(...),
):
    """Check form accessibility."""
    input_path = await _save_upload(file)
    try:
        result = accessibility_service.check_accessible_forms(input_path)
        return result
    except Exception as e:
        logger.exception("accessible_forms failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/accessibility/accessible-tables")
async def accessible_tables(
    file: UploadFile = File(...),
):
    """Check table accessibility."""
    input_path = await _save_upload(file)
    try:
        result = accessibility_service.check_accessible_tables(input_path)
        return result
    except Exception as e:
        logger.exception("accessible_tables failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/accessibility/language-detection")
async def language_detection(
    file: UploadFile = File(...),
):
    """Detect document language."""
    input_path = await _save_upload(file)
    try:
        result = accessibility_service.detect_language(input_path)
        return result
    except Exception as e:
        logger.exception("language_detection failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)
