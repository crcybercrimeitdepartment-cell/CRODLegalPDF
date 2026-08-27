"""
API Routes for Document Management Section — File Manager Feature.
"""

from __future__ import annotations

import json
import logging
import re
import uuid
from typing import Any, List, Optional

from fastapi import APIRouter, Body, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

from app.document_management_services.advanced_search_service import advanced_search_service
from app.document_management_services.batch_compression_service import batch_compression_service
from app.document_management_services.batch_conversion_service import batch_conversion_service
from app.document_management_services.batch_export_service import batch_export_service
from app.document_management_services.batch_import_service import batch_import_service
from app.document_management_services.batch_printing_service import batch_printing_service
from app.document_management_services.batch_rename_service import batch_rename_service
from app.document_management_services.bookmark_management_service import bookmark_management_service
from app.document_management_services.edit_metadata_service import edit_metadata_service
from app.document_management_services.external_links_service import external_links_service
from app.document_management_services.file_manager_service import file_manager_service
from app.document_management_services.find_replace_service import find_replace_service
from app.document_management_services.hyperlink_support_service import hyperlink_support_service
from app.document_management_services.internal_links_service import internal_links_service
from app.document_management_services.named_destinations_service import named_destinations_service
from app.document_management_services.quick_navigation_service import quick_navigation_service
from app.document_management_services.save_as_service import save_as_service
from app.document_management_services.table_of_contents_service import table_of_contents_service
from app.document_management_services.batch_watermark_service import batch_watermark_service
from app.document_management_services.batch_encryption_service import batch_encryption_service
from app.document_management_services.batch_decryption_service import batch_decryption_service
from app.document_management_services.document_properties_service import document_properties_service
from app.document_management_services.custom_properties_service import custom_properties_service
from app.document_management_services.file_attachments_service import file_attachments_service
from app.document_management_services.add_attachments_service import add_attachments_service
from app.document_management_services.extract_attachments_service import extract_attachments_service
from app.document_management_services.remove_attachments_service import remove_attachments_service
from app.document_management_services.document_templates_service import document_templates_service
from app.document_management_services.template_library_service import template_library_service
from app.document_management_services.silent_printing_service import silent_printing_service
from app.document_management_services.print_multiple_pages_per_sheet_service import print_multiple_pages_per_sheet_service
from app.document_management_services.print_booklet_service import print_booklet_service
from app.document_management_services.auto_recovery_service import auto_recovery_service
from app.document_management_services.backup_recovery_service import backup_recovery_service
from app.document_management_services.pdf_validation_service import pdf_validation_service
from app.document_management_services.digital_signature_validation import digital_signature_validation_service
from app.document_management_services.document_archiving import document_archiving_service

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Pydantic Request Schemas ──────────────────────────────────────────────

class CreateFolderRequest(BaseModel):
    parent_path: str = ""
    folder_name: str


class RenameRequest(BaseModel):
    path: str
    new_name: str


class MoveCopyRequest(BaseModel):
    source_path: str
    target_folder_path: str


class DeleteRequest(BaseModel):
    path: str


class BatchRenamePreviewRequest(BaseModel):
    filenames: List[str]
    prefix: str = ""
    suffix: str = ""
    enable_numbering: bool = False
    start_number: str = "1"
    enable_date: bool = False
    custom_date: str = ""
    custom_pattern: str = ""


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.get("/file-manager/list")
async def file_manager_list(path: str = Query("", description="Relative folder path")):
    """List files, folders, metadata, and breadcrumbs for given directory path."""
    try:
        res = file_manager_service.list_contents(rel_path=path)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"File manager list error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/file-manager/create-folder")
async def file_manager_create_folder(
    parent_path: str = Form(""),
    folder_name: str = Form(...),
):
    """Create a new folder inside parent directory."""
    try:
        res = file_manager_service.create_folder(parent_path=parent_path, folder_name=folder_name)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"File manager create folder error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/file-manager/upload")
async def file_manager_upload(
    parent_path: str = Form(""),
    file: UploadFile = File(...),
):
    """Upload a file into parent directory."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    try:
        content = await file.read()
        res = file_manager_service.upload_file(
            parent_path=parent_path, filename=file.filename, content=content
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"File manager upload error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/file-manager/rename")
async def file_manager_rename(payload: RenameRequest):
    """Rename a file or folder."""
    try:
        res = file_manager_service.rename_item(rel_path=payload.path, new_name=payload.new_name)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"File manager rename error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/file-manager/move")
async def file_manager_move(payload: MoveCopyRequest):
    """Move a file or folder to a target directory."""
    try:
        res = file_manager_service.move_item(
            source_path=payload.source_path, target_folder_path=payload.target_folder_path
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"File manager move error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/file-manager/copy")
async def file_manager_copy(payload: MoveCopyRequest):
    """Copy a file or directory recursively to a target directory."""
    try:
        res = file_manager_service.copy_item(
            source_path=payload.source_path, target_folder_path=payload.target_folder_path
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"File manager copy error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/file-manager/delete")
async def file_manager_delete(payload: DeleteRequest):
    """Delete a file or directory."""
    try:
        res = file_manager_service.delete_item(rel_path=payload.path)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"File manager delete error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/file-manager/download")
async def file_manager_download(path: str = Query(..., description="File relative path")):
    """Download a single file."""
    try:
        file_path, filename = file_manager_service.get_file_for_download(rel_path=path)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"File manager download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/file-manager/download-zip")
async def file_manager_download_zip(
    request: Request, path: str = Query("", description="Folder relative path")
):
    """Download a directory as a ZIP archive."""
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    try:
        zip_path, zip_filename = file_manager_service.download_folder_as_zip(
            rel_path=path, session_id=session_id
        )
        return FileResponse(
            path=str(zip_path),
            filename=zip_filename,
            media_type="application/zip",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"File manager download zip error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/file-manager/directories")
async def file_manager_directories():
    """Get flat list of all available subdirectories for Move/Copy target folder pickers."""
    try:
        dirs = file_manager_service.get_all_directories()
        return {"success": True, "directories": dirs}
    except Exception as e:
        logger.error(f"File manager directories error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/file-manager/search")
async def file_manager_search(q: str = Query(..., description="Search query string")):
    """Recursively search storage root for files and folders matching query."""
    try:
        results = file_manager_service.search_storage(query=q)
        return {"success": True, "query": q, "total": len(results), "results": results}
    except Exception as e:
        logger.error(f"File manager search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── SAVE AS PDF ENDPOINTS ─────────────────────────────────────────────────

@router.post("/save-as/process")
@router.post("/file-manager/save-as/process")
async def save_as_process(
    request: Request,
    file: UploadFile = File(...),
    new_filename: str = Form(...),
    target_format: str = Form("pdf"),
):
    """Save an uploaded PDF under a new user-specified filename and format (PDF, JPG, PNG, TXT, DOCX, HTML)."""
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No source PDF file provided.")

    try:
        source_bytes = await file.read()
        res = save_as_service.execute_save_as(
            session_id=session_id,
            source_bytes=source_bytes,
            original_filename=file.filename,
            desired_filename=new_filename,
            target_format=target_format,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Save As process error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/save-as/download/{session_id}")
@router.get("/file-manager/save-as/download/{session_id}")
async def save_as_download(session_id: str):
    """Download the newly saved file directly with attachment header."""
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")

    try:
        file_path, filename = save_as_service.get_saved_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Save As download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Batch Import Endpoints ────────────────────────────────────────────────

@router.post("/batch-import")
@router.post("/file-manager/batch-import")
@router.post("/document-management/batch-import")
async def batch_import_endpoint(
    files: List[UploadFile] = File(...),
    relative_paths: Optional[List[str]] = Form(None),
    duplicate_strategy: str = Form("rename"),
    preserve_folder_structure: bool = Form(False),
    auto_organize: bool = Form(False),
    target_folder: str = Form(""),
):
    """
    Bulk import multiple documents / folder hierarchy into Document Management.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files provided for batch import.")

    files_data = []
    for i, file_obj in enumerate(files):
        if not file_obj or not file_obj.filename:
            continue
        rel_p = ""
        if relative_paths and i < len(relative_paths):
            rel_p = relative_paths[i] or ""

        file_bytes = await file_obj.read()
        files_data.append({
            "filename": file_obj.filename,
            "relative_path": rel_p,
            "bytes": file_bytes,
        })

    if not files_data:
        raise HTTPException(status_code=400, detail="No valid files extracted from batch request.")

    try:
        res = batch_import_service.process_batch(
            files_data=files_data,
            duplicate_strategy=duplicate_strategy,
            preserve_folder_structure=preserve_folder_structure,
            auto_organize=auto_organize,
            target_folder=target_folder,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Batch import error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Batch Export Endpoints ────────────────────────────────────────────────

@router.post("/batch-export")
@router.post("/file-manager/batch-export")
@router.post("/document-management/batch-export")
async def batch_export_endpoint(
    request: Request,
    files: List[UploadFile] = File(...),
    target_format: str = Form("pdf"),
):
    """
    Export multiple PDF documents in one batch operation to chosen target format.
    """
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No PDF files provided for batch export.")

    files_data = []
    for file_obj in files:
        if not file_obj or not file_obj.filename:
            continue
        file_bytes = await file_obj.read()
        files_data.append({
            "filename": file_obj.filename,
            "bytes": file_bytes,
        })

    if not files_data:
        raise HTTPException(status_code=400, detail="No valid files extracted from batch export request.")

    try:
        res = batch_export_service.process_batch_export(
            session_id=session_id,
            files_data=files_data,
            target_format=target_format,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Batch export error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch export failed: {str(e)}")


@router.get("/batch-export/download/{session_id}")
@router.get("/file-manager/batch-export/download/{session_id}")
@router.get("/document-management/batch-export/download/{session_id}")
async def batch_export_download_endpoint(session_id: str):
    """
    Download exported batch result file or ZIP archive for a given session.
    """
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")

    try:
        file_path, filename = batch_export_service.get_export_file_for_download(session_id)
        media_type = "application/zip" if filename.endswith(".zip") else "application/octet-stream"
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Batch export download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Batch Rename Endpoints ────────────────────────────────────────────────

@router.post("/batch-rename/preview")
@router.post("/file-manager/batch-rename/preview")
@router.post("/document-management/batch-rename/preview")
async def batch_rename_preview_endpoint(payload: BatchRenamePreviewRequest):
    """
    Generate live preview mapping of original filenames to new target filenames.
    """
    try:
        previews = batch_rename_service.generate_previews(
            filenames=payload.filenames,
            prefix=payload.prefix,
            suffix=payload.suffix,
            enable_numbering=payload.enable_numbering,
            start_number=payload.start_number,
            enable_date=payload.enable_date,
            custom_date=payload.custom_date,
            custom_pattern=payload.custom_pattern,
        )
        return {"success": True, "previews": previews}
    except Exception as e:
        logger.error(f"Batch rename preview error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-rename")
@router.post("/file-manager/batch-rename")
@router.post("/document-management/batch-rename")
async def batch_rename_endpoint(
    request: Request,
    files: List[UploadFile] = File(...),
    prefix: str = Form(""),
    suffix: str = Form(""),
    enable_numbering: bool = Form(False),
    start_number: str = Form("1"),
    enable_date: bool = Form(False),
    custom_date: str = Form(""),
    custom_pattern: str = Form(""),
):
    """
    Rename multiple PDF files according to configurable naming rules and pattern.
    """
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No PDF files provided for batch rename.")

    files_data = []
    for file_obj in files:
        if not file_obj or not file_obj.filename:
            continue
        file_bytes = await file_obj.read()
        files_data.append({
            "filename": file_obj.filename,
            "bytes": file_bytes,
        })

    if not files_data:
        raise HTTPException(status_code=400, detail="No valid files extracted from batch rename request.")

    try:
        res = batch_rename_service.process_batch_rename(
            session_id=session_id,
            files_data=files_data,
            prefix=prefix,
            suffix=suffix,
            enable_numbering=enable_numbering,
            start_number=start_number,
            enable_date=enable_date,
            custom_date=custom_date,
            custom_pattern=custom_pattern,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Batch rename error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch rename failed: {str(e)}")


@router.get("/batch-rename/download/{session_id}")
@router.get("/file-manager/batch-rename/download/{session_id}")
@router.get("/document-management/batch-rename/download/{session_id}")
async def batch_rename_download_endpoint(session_id: str):
    """
    Download renamed PDF files or ZIP archive for a given session.
    """
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")

    try:
        file_path, filename = batch_rename_service.get_renamed_file_for_download(session_id)
        media_type = "application/zip" if filename.endswith(".zip") else "application/pdf"
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Batch rename download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Batch Conversion Endpoints ───────────────────────────────────────────

@router.post("/batch-conversion")
@router.post("/file-manager/batch-conversion")
@router.post("/document-management/batch-conversion")
async def batch_conversion_endpoint(
    request: Request,
    files: List[UploadFile] = File(...),
    target_format: str = Form("pdf"),
):
    """
    Convert multiple documents in a single batch operation into target format.
    """
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files provided for batch conversion.")

    files_data = []
    for file_obj in files:
        if not file_obj or not file_obj.filename:
            continue
        file_bytes = await file_obj.read()
        files_data.append({
            "filename": file_obj.filename,
            "bytes": file_bytes,
        })

    if not files_data:
        raise HTTPException(status_code=400, detail="No valid files extracted from batch conversion request.")

    try:
        res = batch_conversion_service.process_batch_conversion(
            session_id=session_id,
            files_data=files_data,
            target_format=target_format,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Batch conversion error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch conversion failed: {str(e)}")


@router.get("/batch-conversion/download-zip/{session_id}")
@router.get("/file-manager/batch-conversion/download-zip/{session_id}")
@router.get("/document-management/batch-conversion/download-zip/{session_id}")
async def batch_conversion_download_zip_endpoint(session_id: str):
    """
    Download converted batch result as ZIP archive for a given session.
    """
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")

    try:
        file_path, filename = batch_conversion_service.get_zip_for_download(session_id)
        media_type = "application/zip" if filename.endswith(".zip") else "application/octet-stream"
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Batch conversion ZIP download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batch-conversion/download-file/{session_id}/{filename}")
@router.get("/file-manager/batch-conversion/download-file/{session_id}/{filename}")
@router.get("/document-management/batch-conversion/download-file/{session_id}/{filename}")
async def batch_conversion_download_single_endpoint(session_id: str, filename: str):
    """
    Download a single converted file from a given batch session.
    """
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    if not filename or re.search(r"[\\/]", filename):
        raise HTTPException(status_code=400, detail="Invalid filename.")

    try:
        file_path, out_filename = batch_conversion_service.get_converted_file_for_download(session_id, filename)
        return FileResponse(
            path=str(file_path),
            filename=out_filename,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{out_filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Batch conversion single file download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Batch Printing Endpoints ──────────────────────────────────────────────

@router.get("/batch-printing/printers")
@router.get("/file-manager/batch-printing/printers")
@router.get("/document-management/batch-printing/printers")
async def batch_printing_printers_endpoint():
    """
    Fetch dynamically detected installed system printers and default printer.
    """
    try:
        res = batch_printing_service.get_available_printers()
        return res
    except Exception as e:
        logger.error(f"Error fetching printers: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to query system printers: {str(e)}")


@router.post("/batch-printing")
@router.post("/file-manager/batch-printing")
@router.post("/document-management/batch-printing")
async def batch_printing_endpoint(
    request: Request,
    files: List[UploadFile] = File(...),
    printer_name: str = Form(""),
    copies: int = Form(1),
    page_range: str = Form("all"),
    paper_size: str = Form("A4"),
    orientation: str = Form("portrait"),
    collation: bool = Form(True),
):
    """
    Dispatch a batch of PDF documents to the specified OS system printer queue.
    """
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No PDF files provided for batch printing.")

    files_data = []
    for file_obj in files:
        if not file_obj or not file_obj.filename:
            continue
        file_bytes = await file_obj.read()
        files_data.append({
            "filename": file_obj.filename,
            "bytes": file_bytes,
        })

    if not files_data:
        raise HTTPException(status_code=400, detail="No valid PDF files extracted from batch printing request.")

    try:
        res = batch_printing_service.process_batch_print(
            session_id=session_id,
            files_data=files_data,
            printer_name=printer_name,
            copies=copies,
            page_range=page_range,
            paper_size=paper_size,
            orientation=orientation,
            collation=collation,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Batch printing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch printing failed: {str(e)}")


# ── Find & Replace Endpoints ──────────────────────────────────────────────

@router.post("/find-replace/search")
@router.post("/document-management/find-replace/search")
async def find_replace_search_endpoint(
    file: UploadFile = File(...),
    search_query: str = Form(...),
    case_sensitive: bool = Form(False),
    match_whole_word: bool = Form(False),
):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        res = find_replace_service.search_text(
            pdf_bytes=pdf_bytes,
            search_query=search_query,
            case_sensitive=case_sensitive,
            match_whole_word=match_whole_word,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Find & replace search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/find-replace/replace")
@router.post("/document-management/find-replace/replace")
async def find_replace_replace_endpoint(
    request: Request,
    file: UploadFile = File(...),
    search_query: str = Form(...),
    replacement_text: str = Form(""),
    replace_all: bool = Form(True),
    target_page: Optional[int] = Form(None),
    case_sensitive: bool = Form(False),
):
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")

    try:
        pdf_bytes = await file.read()
        res = find_replace_service.replace_text(
            session_id=session_id,
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
            search_query=search_query,
            replacement_text=replacement_text,
            replace_all=replace_all,
            target_page=target_page,
            case_sensitive=case_sensitive,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Find & replace replace error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/find-replace/download/{session_id}")
@router.get("/document-management/find-replace/download/{session_id}")
async def find_replace_download_endpoint(session_id: str):
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    try:
        file_path, filename = find_replace_service.get_replaced_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Find & replace download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Advanced Search Endpoints ─────────────────────────────────────────────

@router.post("/advanced-search/execute")
@router.post("/document-management/advanced-search/execute")
async def advanced_search_execute_endpoint(
    file: UploadFile = File(...),
    query: str = Form(...),
    search_scopes: Optional[List[str]] = Form(None),
    case_sensitive: bool = Form(False),
    is_regex: bool = Form(False),
):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        res = advanced_search_service.execute_advanced_search(
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
            query=query,
            search_scopes=search_scopes,
            case_sensitive=case_sensitive,
            is_regex=is_regex,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Advanced search execution error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Bookmark Management Endpoints ─────────────────────────────────────────

@router.post("/bookmark-management/extract")
@router.post("/document-management/bookmark-management/extract")
async def bookmark_management_extract_endpoint(file: UploadFile = File(...)):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        res = bookmark_management_service.extract_bookmarks(pdf_bytes=pdf_bytes)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Bookmark extract error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bookmark-management/update")
@router.post("/document-management/bookmark-management/update")
async def bookmark_management_update_endpoint(
    request: Request,
    file: UploadFile = File(...),
    bookmarks_json: str = Form(...),
):
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")

    try:
        pdf_bytes = await file.read()
        b_list = json.loads(bookmarks_json) if isinstance(bookmarks_json, str) else []
        res = bookmark_management_service.update_bookmarks(
            session_id=session_id,
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
            bookmarks_list=b_list,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Bookmark update error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bookmark-management/download/{session_id}")
@router.get("/document-management/bookmark-management/download/{session_id}")
async def bookmark_management_download_endpoint(session_id: str):
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    try:
        file_path, filename = bookmark_management_service.get_bookmark_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Bookmark download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Table of Contents Endpoints ───────────────────────────────────────────

@router.post("/table-of-contents/detect")
@router.post("/document-management/table-of-contents/detect")
async def table_of_contents_detect_endpoint(file: UploadFile = File(...)):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        res = table_of_contents_service.auto_detect_headings(pdf_bytes=pdf_bytes)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"TOC detect error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/table-of-contents/generate")
@router.post("/document-management/table-of-contents/generate")
async def table_of_contents_generate_endpoint(
    request: Request,
    file: UploadFile = File(...),
    toc_json: str = Form(...),
    insert_position: int = Form(1),
):
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")

    try:
        pdf_bytes = await file.read()
        toc_list = json.loads(toc_json) if isinstance(toc_json, str) else []
        res = table_of_contents_service.generate_toc_page(
            session_id=session_id,
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
            toc_entries=toc_list,
            insert_position=insert_position,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"TOC generate error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/table-of-contents/download/{session_id}")
@router.get("/document-management/table-of-contents/download/{session_id}")
async def table_of_contents_download_endpoint(session_id: str):
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    try:
        file_path, filename = table_of_contents_service.get_toc_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"TOC download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Hyperlink Support Endpoints ───────────────────────────────────────────

@router.post("/hyperlink-support/extract")
@router.post("/document-management/hyperlink-support/extract")
async def hyperlink_support_extract_endpoint(file: UploadFile = File(...)):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        res = hyperlink_support_service.extract_hyperlinks(pdf_bytes=pdf_bytes)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Hyperlink extract error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hyperlink-support/apply")
@router.post("/document-management/hyperlink-support/apply")
async def hyperlink_support_apply_endpoint(
    request: Request,
    file: UploadFile = File(...),
    links_json: str = Form(...),
):
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")

    try:
        pdf_bytes = await file.read()
        links_list = json.loads(links_json) if isinstance(links_json, str) else []
        res = hyperlink_support_service.apply_hyperlinks(
            session_id=session_id,
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
            links_to_add=links_list,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Hyperlink apply error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hyperlink-support/download/{session_id}")
@router.get("/document-management/hyperlink-support/download/{session_id}")
async def hyperlink_support_download_endpoint(session_id: str):
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    try:
        file_path, filename = hyperlink_support_service.get_hyperlink_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Hyperlink download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Internal Links Endpoints ──────────────────────────────────────────────

@router.post("/internal-links/extract")
@router.post("/document-management/internal-links/extract")
async def internal_links_extract_endpoint(file: UploadFile = File(...)):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        res = internal_links_service.extract_internal_links(pdf_bytes=pdf_bytes)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Internal links extract error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/internal-links/add")
@router.post("/document-management/internal-links/add")
async def internal_links_add_endpoint(
    request: Request,
    file: UploadFile = File(...),
    source_page: int = Form(...),
    target_page: int = Form(...),
    search_text: str = Form(""),
):
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        res = internal_links_service.add_internal_link(
            session_id=session_id,
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
            source_page=source_page,
            target_page=target_page,
            search_text=search_text,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Internal links add error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/internal-links/download/{session_id}")
@router.get("/document-management/internal-links/download/{session_id}")
async def internal_links_download_endpoint(session_id: str):
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    try:
        file_path, filename = internal_links_service.get_internal_link_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Internal links download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── External Links Endpoints ──────────────────────────────────────────────

@router.post("/external-links/extract")
@router.post("/document-management/external-links/extract")
async def external_links_extract_endpoint(file: UploadFile = File(...)):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        res = external_links_service.extract_external_links(pdf_bytes=pdf_bytes)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"External links extract error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/external-links/add")
@router.post("/document-management/external-links/add")
async def external_links_add_endpoint(
    request: Request,
    file: UploadFile = File(...),
    page_number: int = Form(...),
    target_url_or_email: str = Form(...),
    search_text: str = Form(""),
):
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        res = external_links_service.add_external_link(
            session_id=session_id,
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
            page_number=page_number,
            target_url_or_email=target_url_or_email,
            search_text=search_text,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"External links add error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/external-links/download/{session_id}")
@router.get("/document-management/external-links/download/{session_id}")
async def external_links_download_endpoint(session_id: str):
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    try:
        file_path, filename = external_links_service.get_external_link_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"External links download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Named Destinations Endpoints ──────────────────────────────────────────

@router.post("/named-destinations/extract")
@router.post("/document-management/named-destinations/extract")
async def named_destinations_extract_endpoint(file: UploadFile = File(...)):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        res = named_destinations_service.extract_named_destinations(pdf_bytes=pdf_bytes)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Named destinations extract error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/named-destinations/create")
@router.post("/document-management/named-destinations/create")
async def named_destinations_create_endpoint(
    request: Request,
    file: UploadFile = File(...),
    destination_name: str = Form(...),
    target_page: int = Form(...),
):
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        res = named_destinations_service.create_named_destination(
            session_id=session_id,
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
            destination_name=destination_name,
            target_page=target_page,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Named destinations create error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/named-destinations/download/{session_id}")
@router.get("/document-management/named-destinations/download/{session_id}")
async def named_destinations_download_endpoint(session_id: str):
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    try:
        file_path, filename = named_destinations_service.get_named_destination_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Named destinations download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Quick Navigation Endpoints ────────────────────────────────────────────

@router.post("/quick-navigation/tree")
@router.post("/document-management/quick-navigation/tree")
async def quick_navigation_tree_endpoint(file: UploadFile = File(...)):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        res = quick_navigation_service.get_navigation_tree(
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Quick navigation tree error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Batch Compression Endpoints ─────────────────────────────────────────

@router.post("/batch-compression")
@router.post("/file-manager/batch-compression")
@router.post("/document-management/batch-compression")
async def batch_compression_endpoint(
    request: Request,
    files: List[UploadFile] = File(...),
    compression_level: str = Form("recommended"),
):
    """
    Compress multiple PDF documents in a single batch operation.
    """
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No PDF files provided for batch compression.")

    files_data = []
    for file_obj in files:
        if not file_obj or not file_obj.filename:
            continue
        file_bytes = await file_obj.read()
        files_data.append({
            "filename": file_obj.filename,
            "bytes": file_bytes,
        })

    if not files_data:
        raise HTTPException(status_code=400, detail="No valid PDF files extracted from batch compression request.")

    try:
        res = batch_compression_service.process_batch_compression(
            session_id=session_id,
            files_data=files_data,
            compression_level=compression_level,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Batch compression error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch compression failed: {str(e)}")


@router.get("/batch-compression/download/{session_id}")
@router.get("/file-manager/batch-compression/download/{session_id}")
@router.get("/document-management/batch-compression/download/{session_id}")
async def batch_compression_download_endpoint(session_id: str):
    """
    Download compressed batch result file or ZIP archive for a given session.
    """
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")

    try:
        file_path, filename = batch_compression_service.get_download_file(session_id)
        media_type = "application/zip" if filename.endswith(".zip") else "application/pdf"
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Batch compression download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batch-compression/download-file/{session_id}/{filename}")
@router.get("/file-manager/batch-compression/download-file/{session_id}/{filename}")
@router.get("/document-management/batch-compression/download-file/{session_id}/{filename}")
async def batch_compression_download_single_endpoint(session_id: str, filename: str):
    """
    Download a single compressed file from a given batch session.
    """
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    if not filename or re.search(r"[\\/]", filename):
        raise HTTPException(status_code=400, detail="Invalid filename.")

    try:
        file_path, out_filename = batch_compression_service.get_single_compressed_file(session_id, filename)
        return FileResponse(
            path=str(file_path),
            filename=out_filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{out_filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Batch compression single file download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Batch Watermark Endpoints ─────────────────────────────────────────

@router.post("/batch-watermark")
@router.post("/file-manager/batch-watermark")
@router.post("/document-management/batch-watermark")
async def batch_watermark_endpoint(
    request: Request,
    files: List[UploadFile] = File(...),
    watermark_type: str = Form("text"),
    text: str = Form(""),
    font_family: str = Form("Helvetica"),
    font_size: float = Form(36.0),
    font_color: str = Form("#000000"),
    bold: bool = Form(False),
    italic: bool = Form(False),
    opacity: float = Form(50.0),
    rotation: float = Form(0.0),
    scale: float = Form(1.0),
    position: str = Form("Center"),
    custom_x_ratio: Optional[float] = Form(None),
    custom_y_ratio: Optional[float] = Form(None),
    pages_selection: str = Form("all"),
    image_scale: float = Form(1.0),
    image_rotation: float = Form(0.0),
    image_opacity: float = Form(50.0),
    watermark_image: Optional[UploadFile] = File(None),
):
    """
    Apply text or image watermark to multiple PDF documents in a single batch operation.
    """
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No PDF files provided for batch watermark.")

    files_data = []
    for file_obj in files:
        if not file_obj or not file_obj.filename:
            continue
        file_bytes = await file_obj.read()
        files_data.append({
            "filename": file_obj.filename,
            "bytes": file_bytes,
        })

    if not files_data:
        raise HTTPException(status_code=400, detail="No valid PDF files extracted from batch watermark request.")

    image_bytes = None
    if watermark_type == "image":
        if not watermark_image or not watermark_image.filename:
            raise HTTPException(status_code=400, detail="Watermark image is required for image watermark type.")
        image_bytes = await watermark_image.read()
        is_valid_img, img_err = batch_watermark_service.validate_image_bytes(image_bytes)
        if not is_valid_img:
            raise HTTPException(status_code=400, detail=img_err)

    try:
        res = batch_watermark_service.process_batch_watermark(
            session_id=session_id,
            files_data=files_data,
            watermark_type=watermark_type,
            text=text,
            font_family=font_family,
            font_size=font_size,
            font_color=font_color,
            bold=bold,
            italic=italic,
            opacity=opacity,
            rotation=rotation,
            scale=scale,
            position=position,
            custom_x_ratio=custom_x_ratio,
            custom_y_ratio=custom_y_ratio,
            pages_selection=pages_selection,
            image_bytes=image_bytes,
            image_scale=image_scale,
            image_rotation=image_rotation,
            image_opacity=image_opacity,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Batch watermark error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch watermark failed: {str(e)}")


@router.get("/batch-watermark/download/{session_id}")
@router.get("/file-manager/batch-watermark/download/{session_id}")
@router.get("/document-management/batch-watermark/download/{session_id}")
async def batch_watermark_download_endpoint(session_id: str):
    """
    Download watermarked batch result file or ZIP archive for a given session.
    """
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")

    try:
        file_path, filename = batch_watermark_service.get_download_file(session_id)
        media_type = "application/zip" if filename.endswith(".zip") else "application/pdf"
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Batch watermark download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batch-watermark/download-file/{session_id}/{filename}")
@router.get("/file-manager/batch-watermark/download-file/{session_id}/{filename}")
@router.get("/document-management/batch-watermark/download-file/{session_id}/{filename}")
async def batch_watermark_download_single_endpoint(session_id: str, filename: str):
    """
    Download a single watermarked file from a given batch session.
    """
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    if not filename or re.search(r"[\\/]", filename):
        raise HTTPException(status_code=400, detail="Invalid filename.")

    try:
        file_path, out_filename = batch_watermark_service.get_single_watermarked_file(session_id, filename)
        return FileResponse(
            path=str(file_path),
            filename=out_filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{out_filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Batch watermark single file download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Edit Metadata Endpoints ───────────────────────────────────────────────

@router.post("/edit-metadata/extract")
@router.post("/document-management/edit-metadata/extract")
async def edit_metadata_extract_endpoint(file: UploadFile = File(...)):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        res = edit_metadata_service.extract_metadata(pdf_bytes=pdf_bytes)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Edit metadata extract error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/edit-metadata/update")
@router.post("/document-management/edit-metadata/update")
async def edit_metadata_update_endpoint(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(""),
    author: str = Form(""),
    subject: str = Form(""),
    keywords: str = Form(""),
    creator: str = Form(""),
    producer: str = Form(""),
):
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        res = edit_metadata_service.update_metadata(
            session_id=session_id,
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
            title=title,
            author=author,
            subject=subject,
            keywords=keywords,
            creator=creator,
            producer=producer,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Edit metadata update error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/edit-metadata/download/{session_id}")
@router.get("/document-management/edit-metadata/download/{session_id}")
async def edit_metadata_download_endpoint(session_id: str):
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    try:
        file_path, filename = edit_metadata_service.get_metadata_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Edit metadata download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Batch Encryption Endpoints ────────────────────────────────────────────

@router.post("/batch-encryption")
@router.post("/file-manager/batch-encryption")
@router.post("/document-management/batch-encryption")
async def batch_encryption_endpoint(
    request: Request,
    files: List[UploadFile] = File(...),
    password: str = Form(""),
    password_mode: str = Form("same"),
    per_file_passwords: Optional[str] = Form(None),
    allow_print: bool = Form(True),
    allow_copy: bool = Form(True),
    allow_modify: bool = Form(True),
):
    """
    Encrypt and password-protect multiple PDF documents in one batch operation.
    Supports two modes:
    - same: one password applied to all files
    - per_file: each file gets its own password (via per_file_passwords JSON)
    """
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No PDF files provided for batch encryption.")

    files_data = []
    for file_obj in files:
        if not file_obj or not file_obj.filename:
            continue
        file_bytes = await file_obj.read()
        files_data.append({
            "filename": file_obj.filename,
            "bytes": file_bytes,
        })

    if not files_data:
        raise HTTPException(status_code=400, detail="No valid files extracted from batch encryption request.")

    import json as _json
    parsed_per_file = {}
    if password_mode == "per_file" and per_file_passwords:
        try:
            parsed_per_file = _json.loads(per_file_passwords)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid per-file passwords data.")

    try:
        res = batch_encryption_service.process_batch_encryption(
            session_id=session_id,
            files_data=files_data,
            password=password,
            password_mode=password_mode,
            per_file_passwords=parsed_per_file,
            allow_print=allow_print,
            allow_copy=allow_copy,
            allow_modify=allow_modify,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Batch encryption error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch encryption failed: {str(e)}")


@router.get("/batch-encryption/download/{session_id}")
@router.get("/file-manager/batch-encryption/download/{session_id}")
@router.get("/document-management/batch-encryption/download/{session_id}")
async def batch_encryption_download_endpoint(session_id: str):
    """
    Download encrypted batch result file or ZIP archive for a given session.
    """
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")

    try:
        file_path, filename = batch_encryption_service.get_download_file(session_id)
        media_type = "application/zip" if filename.endswith(".zip") else "application/pdf"
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Batch encryption download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batch-encryption/download-file/{session_id}/{filename}")
@router.get("/file-manager/batch-encryption/download-file/{session_id}/{filename}")
@router.get("/document-management/batch-encryption/download-file/{session_id}/{filename}")
async def batch_encryption_download_single_endpoint(session_id: str, filename: str):
    """
    Download a single encrypted file from a given batch session.
    """
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    if not filename or re.search(r"[\\/]", filename):
        raise HTTPException(status_code=400, detail="Invalid filename.")

    try:
        file_path, out_filename = batch_encryption_service.get_single_encrypted_file(session_id, filename)
        return FileResponse(
            path=str(file_path),
            filename=out_filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{out_filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Batch encryption single file download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Batch Decryption Endpoints ────────────────────────────────────────────

@router.post("/batch-decryption")
@router.post("/file-manager/batch-decryption")
@router.post("/document-management/batch-decryption")
async def batch_decryption_endpoint(
    request: Request,
    files: List[UploadFile] = File(...),
    password: str = Form(""),
    password_mode: str = Form("same"),
    per_file_passwords: Optional[str] = Form(None),
):
    """
    Decrypt multiple encrypted PDF documents in one batch operation.
    Supports two modes:
    - same: one password applied to all files
    - per_file: each file gets its own password (via per_file_passwords JSON)
    """
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No PDF files provided for batch decryption.")

    files_data = []
    for file_obj in files:
        if not file_obj or not file_obj.filename:
            continue
        file_bytes = await file_obj.read()
        files_data.append({
            "filename": file_obj.filename,
            "bytes": file_bytes,
        })

    if not files_data:
        raise HTTPException(status_code=400, detail="No valid files extracted from batch decryption request.")

    import json as _json
    parsed_per_file = {}
    if password_mode == "per_file" and per_file_passwords:
        try:
            parsed_per_file = _json.loads(per_file_passwords)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid per-file passwords data.")

    try:
        res = batch_decryption_service.process_batch_decryption(
            session_id=session_id,
            files_data=files_data,
            password=password,
            password_mode=password_mode,
            per_file_passwords=parsed_per_file,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Batch decryption error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch decryption failed: {str(e)}")


@router.get("/batch-decryption/download/{session_id}")
@router.get("/file-manager/batch-decryption/download/{session_id}")
@router.get("/document-management/batch-decryption/download/{session_id}")
async def batch_decryption_download_endpoint(session_id: str):
    """
    Download decrypted batch result file or ZIP archive for a given session.
    """
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")

    try:
        file_path, filename = batch_decryption_service.get_download_file(session_id)
        media_type = "application/zip" if filename.endswith(".zip") else "application/pdf"
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Batch decryption download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batch-decryption/download-file/{session_id}/{filename}")
@router.get("/file-manager/batch-decryption/download-file/{session_id}/{filename}")
@router.get("/document-management/batch-decryption/download-file/{session_id}/{filename}")
async def batch_decryption_download_single_endpoint(session_id: str, filename: str):
    """
    Download a single decrypted file from a given batch session.
    """
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    if not filename or re.search(r"[\\/]", filename):
        raise HTTPException(status_code=400, detail="Invalid filename.")

    try:
        file_path, out_filename = batch_decryption_service.get_single_decrypted_file(session_id, filename)
        return FileResponse(
            path=str(file_path),
            filename=out_filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{out_filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Batch decryption single file download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Document Properties Endpoints ──────────────────────────────────────────

@router.post("/document-properties/analyze")
@router.post("/document-management/document-properties/analyze")
async def document_properties_analyze_endpoint(
    file: UploadFile = File(...),
):
    """
    Analyze PDF document and return comprehensive properties.
    Read-only operation — does not modify or save anything.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")

    try:
        pdf_bytes = await file.read()
        res = document_properties_service.analyze_properties(
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Document properties analyze error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to analyze document: {str(e)}")


@router.post("/document-properties/update")
@router.post("/document-management/document-properties/update")
async def document_properties_update_endpoint(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(""),
    author: str = Form(""),
    subject: str = Form(""),
    keywords: str = Form(""),
):
    """
    Update PDF document metadata and save to a new file.
    Original PDF remains unchanged.
    """
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")

    try:
        pdf_bytes = await file.read()
        res = document_properties_service.update_metadata(
            session_id=session_id,
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
            title=title,
            author=author,
            subject=subject,
            keywords=keywords,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Document properties update error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update metadata: {str(e)}")


@router.get("/document-properties/download/{session_id}")
@router.get("/document-management/document-properties/download/{session_id}")
async def document_properties_download_endpoint(session_id: str):
    """
    Download the updated PDF file for a given session.
    """
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")

    try:
        file_path, filename = document_properties_service.get_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Document properties download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Custom Properties Endpoints ────────────────────────────────────────────

@router.post("/custom-properties/analyze")
@router.post("/document-management/custom-properties/analyze")
async def custom_properties_analyze_endpoint(
    file: UploadFile = File(...),
):
    """
    Analyze PDF and return file info plus existing custom properties.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")

    try:
        pdf_bytes = await file.read()
        res = custom_properties_service.analyze_pdf(
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Custom properties analyze error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to analyze document: {str(e)}")


@router.post("/custom-properties/validate")
@router.post("/document-management/custom-properties/validate")
async def custom_properties_validate_endpoint(
    name: str = Form(...),
    value: str = Form(...),
    prop_type: str = Form("Text"),
):
    """
    Validate a single custom property name and value.
    """
    try:
        name_valid, name_err = custom_properties_service.validate_property_name(name)
        if not name_valid:
            return {"valid": False, "error": name_err}

        value_valid, value_err = custom_properties_service.validate_property_value(value, prop_type)
        if not value_valid:
            return {"valid": False, "error": value_err}

        return {"valid": True, "error": ""}
    except Exception as e:
        logger.error(f"Custom properties validate error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.post("/custom-properties/save")
@router.post("/document-management/custom-properties/save")
async def custom_properties_save_endpoint(
    request: Request,
    file: UploadFile = File(...),
    properties: str = Form("[]"),
):
    """
    Save custom properties to a new PDF file.
    Original PDF remains unchanged.
    """
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")

    import json as _json
    try:
        props_list = _json.loads(properties)
        if not isinstance(props_list, list):
            raise ValueError("Properties must be a list.")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid properties data format.")

    for prop in props_list:
        if not isinstance(prop, dict):
            raise HTTPException(status_code=400, detail="Each property must be an object.")
        if "name" not in prop or "value" not in prop:
            raise HTTPException(status_code=400, detail="Each property must have 'name' and 'value' fields.")
        if "type" not in prop:
            prop["type"] = "Text"

        name_valid, name_err = custom_properties_service.validate_property_name(prop["name"])
        if not name_valid:
            raise HTTPException(status_code=400, detail=f"Invalid property name '{prop['name']}': {name_err}")

        value_valid, value_err = custom_properties_service.validate_property_value(prop["value"], prop["type"])
        if not value_valid:
            raise HTTPException(status_code=400, detail=f"Invalid value for '{prop['name']}': {value_err}")

    seen_names = set()
    for prop in props_list:
        name_lower = prop["name"].lower().strip()
        if name_lower in seen_names:
            raise HTTPException(status_code=400, detail=f'Duplicate property name: "{prop["name"]}". Property names are case-insensitive.')
        seen_names.add(name_lower)

    try:
        pdf_bytes = await file.read()
        res = custom_properties_service.save_custom_properties(
            session_id=session_id,
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
            properties=props_list,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Custom properties save error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save properties: {str(e)}")


@router.get("/custom-properties/download/{session_id}")
@router.get("/document-management/custom-properties/download/{session_id}")
async def custom_properties_download_endpoint(session_id: str):
    """
    Download the updated PDF file for a given session.
    """
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")

    try:
        file_path, filename = custom_properties_service.get_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Custom properties download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── File Attachments Endpoints ──────────────────────────────────────────────

@router.post("/file-attachments/analyze")
@router.post("/document-management/file-attachments/analyze")
async def file_attachments_analyze_endpoint(
    file: UploadFile = File(...),
):
    """Analyze PDF and return file info plus existing embedded attachments."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")

    try:
        pdf_bytes = await file.read()
        res = file_attachments_service.analyze_pdf(
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"File attachments analyze error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to analyze document: {str(e)}")


@router.post("/file-attachments/add")
@router.post("/document-management/file-attachments/add")
async def file_attachments_add_endpoint(
    request: Request,
    file: UploadFile = File(...),
    attachments_json: str = Form("[]"),
):
    """Add one or more file attachments to the PDF.

    attachments_json should be a JSON array of objects with:
    - name: attachment name/identifier
    - filename: original filename
    - description: optional description
    The actual file bytes are read from the uploaded files.
    """
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")

    import json as _json
    try:
        att_list = _json.loads(attachments_json)
        if not isinstance(att_list, list):
            raise ValueError("Attachments data must be a list.")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid attachments data format.")

    try:
        pdf_bytes = await file.read()
        res = file_attachments_service.add_attachments(
            session_id=session_id,
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
            new_attachments=att_list,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"File attachments add error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to add attachments: {str(e)}")


@router.post("/file-attachments/download-attachment")
@router.post("/document-management/file-attachments/download-attachment")
async def file_attachments_download_single_endpoint(
    file: UploadFile = File(...),
    attachment_name: str = Form(...),
):
    """Download a single embedded attachment from the PDF."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")

    try:
        pdf_bytes = await file.read()
        file_data, filename, content_type = file_attachments_service.download_attachment(
            pdf_bytes=pdf_bytes,
            attachment_name=attachment_name,
        )
        return Response(
            content=file_data,
            media_type=content_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"File attachment download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/file-attachments/remove")
@router.post("/document-management/file-attachments/remove")
async def file_attachments_remove_endpoint(
    request: Request,
    file: UploadFile = File(...),
    attachment_name: str = Form(...),
):
    """Remove a single embedded attachment from the PDF."""
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")

    try:
        pdf_bytes = await file.read()
        res = file_attachments_service.remove_attachment(
            session_id=session_id,
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
            attachment_name=attachment_name,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"File attachments remove error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/file-attachments/details")
@router.post("/document-management/file-attachments/details")
async def file_attachments_details_endpoint(
    file: UploadFile = File(...),
    attachment_name: str = Form(...),
):
    """Get detailed information about a specific attachment."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")

    try:
        pdf_bytes = await file.read()
        res = file_attachments_service.get_attachment_details(
            pdf_bytes=pdf_bytes,
            attachment_name=attachment_name,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"File attachment details error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/file-attachments/download/{session_id}")
@router.get("/document-management/file-attachments/download/{session_id}")
async def file_attachments_download_pdf_endpoint(session_id: str):
    """Download the updated PDF file with modified attachments."""
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")

    try:
        file_path, filename = file_attachments_service.get_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"File attachments download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Add Attachments Endpoints (Section-34) ─────────────────────────────────

@router.post("/add-attachments/process")
@router.post("/document-management/add-attachments/process")
async def add_attachments_process_endpoint(
    request: Request,
    file: UploadFile = File(...),
    attachments_json: str = Form("[]"),
):
    """Process PDF and embed selected attachment files.

    attachments_json should be a JSON array of objects with:
    - name: attachment name/identifier
    - filename: original filename
    - description: optional description
    - bytes_b64: base64-encoded file content
    """
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")

    import json as _json
    try:
        att_list = _json.loads(attachments_json)
        if not isinstance(att_list, list):
            raise ValueError("Attachments data must be a list.")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid attachments data format.")

    if not att_list:
        raise HTTPException(status_code=400, detail="No attachments provided. Select at least one file to embed.")

    try:
        pdf_bytes = await file.read()

        # Decode base64 attachment data
        import base64
        decoded_attachments = []
        for att in att_list:
            att_bytes = b""
            if att.get("bytes_b64"):
                try:
                    att_bytes = base64.b64decode(att["bytes_b64"])
                except Exception:
                    logger.warning(f"Skipping attachment '{att.get('name', '?')}': invalid base64 data")
                    continue
            elif att.get("bytes"):
                att_bytes = att["bytes"]

            decoded_attachments.append({
                "name": att.get("name", ""),
                "filename": att.get("filename", att.get("name", "attachment")),
                "description": att.get("description", ""),
                "bytes": att_bytes,
            })

        if not decoded_attachments:
            raise HTTPException(status_code=400, detail="No valid attachment data provided.")

        res = add_attachments_service.create_updated_pdf(
            session_id=session_id,
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
            attachments=decoded_attachments,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Add attachments error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to add attachments: {str(e)}")


@router.get("/add-attachments/download/{session_id}")
@router.get("/document-management/add-attachments/download/{session_id}")
async def add_attachments_download_endpoint(session_id: str):
    """Download the updated PDF with embedded attachments."""
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")

    try:
        file_path, filename = add_attachments_service.get_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Add attachments download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Extract Attachments Endpoints (Section-35) ─────────────────────────────

@router.post("/extract-attachments/analyze")
@router.post("/document-management/extract-attachments/analyze")
async def extract_attachments_analyze_endpoint(
    file: UploadFile = File(...),
):
    """Analyze PDF and list all embedded attachments."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        return extract_attachments_service.analyze_pdf(pdf_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Extract attachments analyze error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-attachments/extract")
@router.post("/document-management/extract-attachments/extract")
async def extract_attachments_extract_endpoint(
    request: Request,
    file: UploadFile = File(...),
    attachment_names: str = Form("[]"),
    extract_all: bool = Form(False),
):
    """Extract selected attachments. Single file or ZIP download."""
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")

    import json as _json
    try:
        names_list = _json.loads(attachment_names)
        if not isinstance(names_list, list):
            raise ValueError("Attachment names must be a list.")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid attachment names format.")

    try:
        pdf_bytes = await file.read()
        return extract_attachments_service.extract_multiple(
            pdf_bytes=pdf_bytes,
            attachment_names=names_list,
            session_id=session_id,
            extract_all=extract_all,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Extract attachments error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/extract-attachments/file/{session_id}/{filename}")
@router.get("/document-management/extract-attachments/file/{session_id}/{filename}")
async def extract_attachments_file_endpoint(session_id: str, filename: str):
    """Download a single extracted attachment file."""
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    if not filename or re.search(r"[\\/]", filename):
        raise HTTPException(status_code=400, detail="Invalid filename.")
    try:
        file_path, fname = extract_attachments_service.get_file_for_download(session_id, filename)
        return FileResponse(
            path=str(file_path),
            filename=fname,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{fname}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Extract attachments file download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/extract-attachments/zip/{session_id}")
@router.get("/document-management/extract-attachments/zip/{session_id}")
async def extract_attachments_zip_endpoint(session_id: str):
    """Download ZIP of multiple extracted attachments."""
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    try:
        file_path, filename = extract_attachments_service.get_zip_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Extract attachments ZIP download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Remove Attachments Endpoints (Section-36) ──────────────────────────────

@router.post("/remove-attachments/analyze")
@router.post("/document-management/remove-attachments/analyze")
async def remove_attachments_analyze_endpoint(
    file: UploadFile = File(...),
):
    """Analyze PDF and list all embedded attachments."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        return remove_attachments_service.analyze_pdf(pdf_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Remove attachments analyze error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/remove-attachments/remove")
@router.post("/document-management/remove-attachments/remove")
async def remove_attachments_remove_endpoint(
    request: Request,
    file: UploadFile = File(...),
    attachment_names: str = Form("[]"),
    remove_all: bool = Form(False),
):
    """Remove selected attachments from the PDF."""
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")

    import json as _json
    try:
        names_list = _json.loads(attachment_names)
        if not isinstance(names_list, list):
            raise ValueError("Attachment names must be a list.")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid attachment names format.")

    try:
        pdf_bytes = await file.read()
        return remove_attachments_service.remove_attachments(
            session_id=session_id,
            pdf_bytes=pdf_bytes,
            original_filename=file.filename,
            names_to_remove=names_list,
            remove_all=remove_all,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Remove attachments error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/remove-attachments/download/{session_id}")
@router.get("/document-management/remove-attachments/download/{session_id}")
async def remove_attachments_download_endpoint(session_id: str):
    """Download the cleaned PDF with selected attachments removed."""
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    try:
        file_path, filename = remove_attachments_service.get_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Remove attachments download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Document Templates Endpoints (Section-37) ────────────────────────────────

@router.post("/document-templates/save")
@router.post("/document-management/document-templates/save")
async def document_templates_save_endpoint(
    request: Request,
    file: UploadFile = File(...),
    template_name: str = Form(...),
    description: str = Form(""),
):
    """Save an uploaded PDF as a reusable template."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    if not template_name or not template_name.strip():
        raise HTTPException(status_code=400, detail="Template name is required.")
    try:
        pdf_bytes = await file.read()
        return document_templates_service.save_template(pdf_bytes, file.filename, template_name, description)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Document templates save error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document-templates/list")
@router.get("/document-management/document-templates/list")
async def document_templates_list_endpoint(
    search: str = Query("", description="Search by name or description"),
):
    """List all saved templates, optionally filtered by search."""
    try:
        return {"templates": document_templates_service.list_templates(search)}
    except Exception as e:
        logger.error(f"Document templates list error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document-templates/{template_id}")
@router.get("/document-management/document-templates/{template_id}")
async def document_templates_get_endpoint(
    template_id: str,
):
    """Get a single template by ID."""
    try:
        return document_templates_service.get_template(template_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Document templates get error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/document-templates/use")
@router.post("/document-management/document-templates/use")
async def document_templates_use_endpoint(
    request: Request,
    template_id: str = Form(...),
    output_name: str = Form(""),
):
    """Use a template to generate a new PDF copy."""
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])
    try:
        return document_templates_service.use_template(template_id, session_id, output_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Document templates use error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/document-templates/{template_id}")
@router.delete("/document-management/document-templates/{template_id}")
async def document_templates_delete_endpoint(
    template_id: str,
):
    """Delete a template."""
    try:
        return document_templates_service.delete_template(template_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Document templates delete error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document-templates/download/{session_id}")
@router.get("/document-management/document-templates/download/{session_id}")
async def document_templates_download_endpoint(
    session_id: str,
):
    """Download the generated PDF copy."""
    try:
        file_path, filename = document_templates_service.get_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Document templates download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Template Library Endpoints (Section-38) ──────────────────────────────────

@router.get("/template-library/list")
@router.get("/document-management/template-library/list")
async def template_library_list_endpoint(
    search: str = Query("", description="Search by name or description"),
    category: str = Query("", description="Filter by category"),
):
    """List all templates in the library with optional search and category filter."""
    try:
        return template_library_service.list_templates(search, category)
    except Exception as e:
        logger.error(f"Template library list error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/template-library/{template_id}")
@router.get("/document-management/template-library/{template_id}")
async def template_library_get_endpoint(
    template_id: str,
):
    """Get template details for preview."""
    try:
        return template_library_service.get_template(template_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Template library get error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/template-library/preview/{template_id}")
@router.get("/document-management/template-library/preview/{template_id}")
async def template_library_preview_endpoint(
    template_id: str,
):
    """Download template PDF for preview."""
    try:
        pdf_bytes, filename = template_library_service.get_template_bytes(template_id)
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{filename}"'})
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Template library preview error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/template-library/use")
@router.post("/document-management/template-library/use")
async def template_library_use_endpoint(
    request: Request,
    template_id: str = Form(...),
    output_name: str = Form(""),
):
    """Use a template to generate a new PDF copy."""
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])
    try:
        return template_library_service.use_template(template_id, session_id, output_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Template library use error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/template-library/download/{session_id}")
@router.get("/document-management/template-library/download/{session_id}")
async def template_library_download_endpoint(
    session_id: str,
):
    """Download the generated PDF copy."""
    try:
        file_path, filename = template_library_service.get_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Template library download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Silent Printing Endpoints (Section-39) ───────────────────────────────────

@router.get("/silent-printing/printers")
@router.get("/document-management/silent-printing/printers")
async def silent_printing_printers_endpoint():
    """Discover available local printers."""
    try:
        printers = silent_printing_service.discover_printers()
        default_printer = silent_printing_service.get_default_printer()
        return {
            "printers": printers,
            "default_printer": default_printer,
            "total": len(printers),
        }
    except Exception as e:
        logger.error(f"Silent printing printers error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/silent-printing/validate")
@router.post("/document-management/silent-printing/validate")
async def silent_printing_validate_endpoint(
    file: UploadFile = File(...),
    copies: int = Form(1),
    page_range: str = Form(""),
    orientation: str = Form("portrait"),
    paper_size: str = Form("a4"),
):
    """Validate PDF and print settings."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        doc = silent_printing_service.validate_pdf(pdf_bytes)
        settings = silent_printing_service.validate_settings(
            copies, page_range, orientation, paper_size, doc
        )
        doc.close()
        return {
            "valid": True,
            "settings": settings,
            "filename": file.filename,
            "file_size": len(pdf_bytes),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Silent printing validate error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/silent-printing/print")
@router.post("/document-management/silent-printing/print")
async def silent_printing_print_endpoint(
    file: UploadFile = File(...),
    printer_name: str = Form(""),
    copies: int = Form(1),
    page_range: str = Form(""),
    orientation: str = Form("portrait"),
    paper_size: str = Form("a4"),
):
    """Send PDF to printer with configured settings."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        doc = silent_printing_service.validate_pdf(pdf_bytes)
        settings = silent_printing_service.validate_settings(
            copies, page_range, orientation, paper_size, doc
        )
        doc.close()

        # Determine printer
        target_printer = printer_name.strip()
        if not target_printer:
            target_printer = silent_printing_service.get_default_printer()
        if not target_printer:
            raise ValueError("No printer specified and no default printer found.")

        result = silent_printing_service.send_to_printer(
            pdf_bytes, file.filename, target_printer, settings
        )
        result["filename"] = file.filename
        result["settings"] = settings
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Silent printing print error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Print Multiple Pages per Sheet Endpoints (Section-22) ────────────────────

@router.post("/multi-page-sheet/preview")
@router.post("/document-management/multi-page-sheet/preview")
async def multi_page_sheet_preview_endpoint(
    file: UploadFile = File(...),
    page_range: str = Form(""),
    pages_per_sheet: int = Form(4),
    paper_size: str = Form("a4"),
    orientation: str = Form("portrait"),
    order: str = Form("ltr"),
    margin_mm: float = Form(10),
    spacing_mm: float = Form(5),
    custom_width_mm: float = Form(0),
    custom_height_mm: float = Form(0),
):
    """Preview the N-up layout without generating PDF."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        return print_multiple_pages_per_sheet_service.preview_layout(
            pdf_bytes, page_range, pages_per_sheet, paper_size,
            orientation, order, margin_mm, spacing_mm,
            custom_width_mm, custom_height_mm,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Multi-page sheet preview error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/multi-page-sheet/generate")
@router.post("/document-management/multi-page-sheet/generate")
async def multi_page_sheet_generate_endpoint(
    request: Request,
    file: UploadFile = File(...),
    page_range: str = Form(""),
    pages_per_sheet: int = Form(4),
    paper_size: str = Form("a4"),
    orientation: str = Form("portrait"),
    order: str = Form("ltr"),
    margin_mm: float = Form(10),
    spacing_mm: float = Form(5),
    show_borders: bool = Form(False),
    show_crop_marks: bool = Form(False),
    custom_width_mm: float = Form(0),
    custom_height_mm: float = Form(0),
    output_name: str = Form(""),
):
    """Generate N-up print-ready PDF."""
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        return print_multiple_pages_per_sheet_service.generate_pdf(
            pdf_bytes, session_id, page_range, pages_per_sheet, paper_size,
            orientation, order, margin_mm, spacing_mm,
            show_borders, show_crop_marks,
            custom_width_mm, custom_height_mm, output_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Multi-page sheet generate error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/multi-page-sheet/download/{session_id}")
@router.get("/document-management/multi-page-sheet/download/{session_id}")
async def multi_page_sheet_download_endpoint(
    session_id: str,
):
    """Download the generated N-up PDF."""
    try:
        file_path, filename = print_multiple_pages_per_sheet_service.get_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Multi-page sheet download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Print Booklet Endpoints (Section-23) ─────────────────────────────────────

@router.post("/print-booklet/preview")
@router.post("/document-management/print-booklet/preview")
async def print_booklet_preview_endpoint(
    file: UploadFile = File(...),
    page_range: str = Form(""),
    paper_size: str = Form("a4"),
    orientation: str = Form("portrait"),
    binding: str = Form("left"),
    duplex: str = Form("long-edge"),
    margin_inner_mm: float = Form(15),
    margin_outer_mm: float = Form(10),
    gutter_mm: float = Form(8),
    bleed_mm: float = Form(0),
    custom_w: float = Form(0),
    custom_h: float = Form(0),
):
    """Preview booklet imposition layout."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        return print_booklet_service.preview(
            pdf_bytes, page_range, paper_size, orientation,
            binding, duplex, margin_inner_mm, margin_outer_mm,
            gutter_mm, bleed_mm, custom_w, custom_h,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Print booklet preview error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/print-booklet/generate")
@router.post("/document-management/print-booklet/generate")
async def print_booklet_generate_endpoint(
    request: Request,
    file: UploadFile = File(...),
    page_range: str = Form(""),
    paper_size: str = Form("a4"),
    orientation: str = Form("portrait"),
    binding: str = Form("left"),
    duplex: str = Form("long-edge"),
    margin_inner_mm: float = Form(15),
    margin_outer_mm: float = Form(10),
    gutter_mm: float = Form(8),
    bleed_mm: float = Form(0),
    show_borders: bool = Form(False),
    show_crop_marks: bool = Form(False),
    custom_w: float = Form(0),
    custom_h: float = Form(0),
    output_name: str = Form(""),
):
    """Generate print-ready booklet PDF."""
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        return print_booklet_service.generate(
            pdf_bytes, session_id, page_range, paper_size, orientation,
            binding, duplex, margin_inner_mm, margin_outer_mm,
            gutter_mm, bleed_mm, show_borders, show_crop_marks,
            custom_w, custom_h, output_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Print booklet generate error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/print-booklet/download/{session_id}")
@router.get("/document-management/print-booklet/download/{session_id}")
async def print_booklet_download_endpoint(
    session_id: str,
):
    """Download the generated booklet PDF."""
    try:
        file_path, filename = print_booklet_service.get_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Print booklet download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Auto Recovery Endpoints (Section-24) ─────────────────────────────────────

@router.post("/auto-recovery/create")
@router.post("/document-management/auto-recovery/create")
async def auto_recovery_create_endpoint(
    file: UploadFile = File(...),
    session_name: str = Form(""),
):
    """Create a new recovery snapshot for a PDF."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        return auto_recovery_service.create_recovery(pdf_bytes, file.filename, session_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Auto recovery create error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auto-recovery/update/{recovery_id}")
@router.post("/document-management/auto-recovery/update/{recovery_id}")
async def auto_recovery_update_endpoint(
    recovery_id: str,
    file: UploadFile = File(...),
):
    """Update an existing recovery snapshot with new PDF state."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        return auto_recovery_service.update_recovery(recovery_id, pdf_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Auto recovery update error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/auto-recovery/list")
@router.get("/document-management/auto-recovery/list")
async def auto_recovery_list_endpoint():
    """List all available recovery snapshots."""
    try:
        return {"recoveries": auto_recovery_service.list_recoveries()}
    except Exception as e:
        logger.error(f"Auto recovery list error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/auto-recovery/{recovery_id}")
@router.get("/document-management/auto-recovery/{recovery_id}")
async def auto_recovery_get_endpoint(
    recovery_id: str,
):
    """Get a single recovery snapshot metadata."""
    try:
        return auto_recovery_service.get_recovery(recovery_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Auto recovery get error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auto-recovery/recover/{recovery_id}")
@router.post("/document-management/auto-recovery/recover/{recovery_id}")
async def auto_recovery_recover_endpoint(
    recovery_id: str,
    request: Request,
    output_name: str = Form(""),
):
    """Recover a PDF from a recovery snapshot."""
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])
    try:
        return auto_recovery_service.recover(recovery_id, session_id, output_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Auto recovery recover error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/auto-recovery/{recovery_id}")
@router.delete("/document-management/auto-recovery/{recovery_id}")
async def auto_recovery_discard_endpoint(
    recovery_id: str,
):
    """Discard/delete a recovery snapshot."""
    try:
        return auto_recovery_service.discard_recovery(recovery_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Auto recovery discard error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auto-recovery/cleanup")
@router.post("/document-management/auto-recovery/cleanup")
async def auto_recovery_cleanup_endpoint():
    """Clean up expired recovery snapshots."""
    try:
        return auto_recovery_service.cleanup_expired()
    except Exception as e:
        logger.error(f"Auto recovery cleanup error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/auto-recovery/download/{session_id}")
@router.get("/document-management/auto-recovery/download/{session_id}")
async def auto_recovery_download_endpoint(
    session_id: str,
):
    """Download the recovered PDF."""
    try:
        file_path, filename = auto_recovery_service.get_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Auto recovery download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Backup Recovery Endpoints (Section-25) ──────────────────────────────────

@router.get("/backup-recovery/list")
@router.get("/document-management/backup-recovery/list")
async def backup_recovery_list_endpoint():
    """Discover and list all available PDF backup copies."""
    try:
        return {"backups": backup_recovery_service.discover_backups()}
    except Exception as e:
        logger.error(f"Backup recovery list error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/backup-recovery/detail/{recovery_id}")
@router.get("/document-management/backup-recovery/detail/{recovery_id}")
async def backup_recovery_detail_endpoint(recovery_id: str):
    """Get detailed metadata for a single backup."""
    try:
        return backup_recovery_service.get_backup_detail(recovery_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Backup recovery detail error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/backup-recovery/validate/{recovery_id}")
@router.post("/document-management/backup-recovery/validate/{recovery_id}")
async def backup_recovery_validate_endpoint(recovery_id: str):
    """Validate that a backup exists and is a readable PDF."""
    try:
        return backup_recovery_service.validate_backup(recovery_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Backup recovery validate error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/backup-recovery/restore/{recovery_id}")
@router.post("/document-management/backup-recovery/restore/{recovery_id}")
async def backup_recovery_restore_endpoint(
    recovery_id: str,
    request: Request,
    destination: str = Form(""),
    output_name: str = Form(""),
):
    """Restore a backup to the specified destination."""
    session_id = request.headers.get("X-Request-ID")
    if not session_id:
        session_id = getattr(request.state, "request_id", uuid.uuid4().hex[:16])
    try:
        return backup_recovery_service.restore_backup(
            recovery_id=recovery_id,
            session_id=session_id,
            destination=destination,
            output_name=output_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Backup recovery restore error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/backup-recovery/delete/{recovery_id}")
@router.delete("/document-management/backup-recovery/delete/{recovery_id}")
async def backup_recovery_delete_endpoint(recovery_id: str):
    """Delete a backup from recovery storage."""
    try:
        return backup_recovery_service.delete_backup(recovery_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Backup recovery delete error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/backup-recovery/download/{session_id}")
@router.get("/document-management/backup-recovery/download/{session_id}")
async def backup_recovery_download_endpoint(session_id: str):
    """Download the restored PDF."""
    if not session_id or re.search(r"[\\/]", session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    try:
        file_path, filename = backup_recovery_service.get_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Backup recovery download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── PDF Validation Endpoints (Section-26) ───────────────────────────────────

@router.post("/pdf-validation/validate")
@router.post("/document-management/pdf-validation/validate")
async def pdf_validation_validate_endpoint(
    file: UploadFile = File(...),
):
    """Validate a PDF file for integrity, structure, and metadata."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        return pdf_validation_service.validate(pdf_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"PDF validation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Digital Signature Validation ────────────────────────────────────────────


@router.post("/digital-signature-validation/validate")
@router.post("/document-management/digital-signature-validation/validate")
async def digital_signature_validate(file: UploadFile = File(...)):
    """Validate digital signatures in a PDF file."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No PDF file provided.")
    try:
        pdf_bytes = await file.read()
        return digital_signature_validation_service.validate(pdf_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Digital signature validation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Document Archiving ──────────────────────────────────────────────────────


@router.post("/document-archiving/archive")
@router.post("/document-management/document-archiving/archive")
async def document_archiving_archive(files: List[UploadFile] = File(...)):
    """Archive one or more PDF files."""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")
    try:
        files_data = []
        for f in files:
            if not f.filename:
                continue
            pdf_bytes = await f.read()
            files_data.append({"bytes": pdf_bytes, "filename": f.filename})
        if not files_data:
            raise HTTPException(status_code=400, detail="No valid PDF files provided.")
        return document_archiving_service.archive_multiple(files_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document archiving error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document-archiving/list")
@router.get("/document-management/document-archiving/list")
async def document_archiving_list(search: str = Query("")):
    """List archived documents with optional search filter."""
    try:
        archives = document_archiving_service.list_archives(search=search)
        return {"success": True, "archives": archives, "total": len(archives)}
    except Exception as e:
        logger.error(f"Document archive list error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document-archiving/detail/{archive_id}")
@router.get("/document-management/document-archiving/detail/{archive_id}")
async def document_archiving_detail(archive_id: str):
    """Get metadata for a single archive."""
    try:
        return document_archiving_service.get_archive_detail(archive_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Document archive detail error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/document-archiving/restore/{archive_id}")
@router.post("/document-management/document-archiving/restore/{archive_id}")
async def document_archiving_restore(
    archive_id: str,
    request: Request,
    output_name: str = Query(""),
):
    """Restore an archived PDF to the output directory."""
    try:
        session_id = request.query_params.get("session_id", "")
        return document_archiving_service.restore_archive(archive_id, session_id, output_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Document archive restore error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/document-archiving/delete/{archive_id}")
@router.delete("/document-management/document-archiving/delete/{archive_id}")
async def document_archiving_delete(archive_id: str):
    """Delete an archived PDF and its record."""
    try:
        return document_archiving_service.delete_archive(archive_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Document archive delete error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document-archiving/download/{session_id}")
@router.get("/document-management/document-archiving/download/{session_id}")
async def document_archiving_download(session_id: str):
    """Download a restored archived PDF."""
    try:
        file_path, filename = document_archiving_service.get_file_for_download(session_id)
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Document archive download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))



