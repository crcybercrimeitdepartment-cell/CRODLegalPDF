"""
API Routes for AI Smart Features.
"""

from __future__ import annotations

import logging
import os
import tempfile
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from app.ai_smart_features_services.ai_service import ai_smart_features_service

logger = logging.getLogger(__name__)

router = APIRouter()


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


@router.post("/ai/chat-with-pdf")
async def chat_with_pdf(
    file: UploadFile = File(...),
    message: str = Form(...),
):
    """AI chat with PDF content."""
    input_path = await _save_upload(file)
    try:
        result = ai_smart_features_service.chat_with_pdf(input_path, message)
        return result
    except Exception as e:
        logger.exception("chat_with_pdf failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/ai/summarize")
async def summarize(
    file: UploadFile = File(...),
):
    """AI document summarization."""
    input_path = await _save_upload(file)
    try:
        result = ai_smart_features_service.summarize(input_path)
        return result
    except Exception as e:
        logger.exception("summarize failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/ai/ocr")
async def ocr_extract(
    file: UploadFile = File(...),
):
    """AI-powered OCR text extraction."""
    input_path = await _save_upload(file)
    try:
        result = ai_smart_features_service.ocr_extract(input_path)
        return result
    except Exception as e:
        logger.exception("ocr_extract failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/ai/semantic-search")
async def semantic_search(
    file: UploadFile = File(...),
    query: str = Form(...),
):
    """Semantic search in PDF."""
    input_path = await _save_upload(file)
    try:
        result = ai_smart_features_service.semantic_search(input_path, query)
        return result
    except Exception as e:
        logger.exception("semantic_search failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/ai/document-insights")
async def document_insights(
    file: UploadFile = File(...),
):
    """Get AI document insights."""
    input_path = await _save_upload(file)
    try:
        result = ai_smart_features_service.get_document_insights(input_path)
        return result
    except Exception as e:
        logger.exception("document_insights failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/ai/contract-summary")
async def contract_summary(
    file: UploadFile = File(...),
):
    """Contract-specific summary."""
    input_path = await _save_upload(file)
    try:
        result = ai_smart_features_service.contract_summary(input_path)
        return result
    except Exception as e:
        logger.exception("contract_summary failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/ai/meeting-summary")
async def meeting_summary(
    file: UploadFile = File(...),
):
    """Meeting notes summary."""
    input_path = await _save_upload(file)
    try:
        result = ai_smart_features_service.meeting_summary(input_path)
        return result
    except Exception as e:
        logger.exception("meeting_summary failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/ai/research-assistant")
async def research_assistant(
    file: UploadFile = File(...),
    query: str = Form(...),
):
    """Research assistant for document analysis."""
    input_path = await _save_upload(file)
    try:
        result = ai_smart_features_service.research_assistant(input_path, query)
        return result
    except Exception as e:
        logger.exception("research_assistant failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/ai/extract-key-points")
async def extract_key_points(
    file: UploadFile = File(...),
):
    """Extract key points from document."""
    input_path = await _save_upload(file)
    try:
        result = ai_smart_features_service.extract_key_points(input_path)
        return result
    except Exception as e:
        logger.exception("extract_key_points failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/ai/answer-questions")
async def answer_questions(
    file: UploadFile = File(...),
    question: str = Form(...),
):
    """Answer questions about the document."""
    input_path = await _save_upload(file)
    try:
        result = ai_smart_features_service.answer_questions(input_path, question)
        return result
    except Exception as e:
        logger.exception("answer_questions failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/ai/translate")
async def translate(
    file: UploadFile = File(...),
    target_language: str = Form(...),
):
    """Translate PDF content."""
    input_path = await _save_upload(file)
    try:
        result = ai_smart_features_service.translate_content(input_path, target_language)
        return result
    except Exception as e:
        logger.exception("translate failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/ai/simplify")
async def simplify(
    file: UploadFile = File(...),
):
    """Simplify document text."""
    input_path = await _save_upload(file)
    try:
        result = ai_smart_features_service.simplify_document(input_path)
        return result
    except Exception as e:
        logger.exception("simplify failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/ai/grammar-check")
async def grammar_check(
    file: UploadFile = File(...),
):
    """Grammar improvement check."""
    input_path = await _save_upload(file)
    try:
        result = ai_smart_features_service.grammar_check(input_path)
        return result
    except Exception as e:
        logger.exception("grammar_check failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/ai/writing-enhancement")
async def writing_enhancement(
    file: UploadFile = File(...),
):
    """Writing enhancement suggestions."""
    input_path = await _save_upload(file)
    try:
        result = ai_smart_features_service.writing_enhancement(input_path)
        return result
    except Exception as e:
        logger.exception("writing_enhancement failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


@router.post("/ai/multi-doc-chat")
async def multi_doc_chat(
    files: List[UploadFile] = File(...),
    message: str = Form(...),
):
    """Multi-document chat."""
    saved_paths = []
    try:
        for upload in files:
            path = await _save_upload(upload)
            saved_paths.append(path)
        result = ai_smart_features_service.multi_doc_chat(saved_paths, message)
        return result
    except Exception as e:
        logger.exception("multi_doc_chat failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for p in saved_paths:
            if os.path.exists(p):
                os.unlink(p)


@router.post("/ai/workflow-automation")
async def workflow_automation(
    file: UploadFile = File(...),
):
    """Workflow automation suggestions."""
    input_path = await _save_upload(file)
    try:
        result = ai_smart_features_service.workflow_automation(input_path)
        return result
    except Exception as e:
        logger.exception("workflow_automation failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)
