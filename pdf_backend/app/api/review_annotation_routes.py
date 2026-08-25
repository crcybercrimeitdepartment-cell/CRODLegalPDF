import json
from pathlib import Path
from typing import List, Optional
import io
import time

import fitz
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

from app.schemas.pdf_schema import (
    UploadResponse,
    AnnotationModel,
    DocumentAnnotationsPayload,
    SavePdfRequest,
    SavePdfResponse,
    ReplyPayload
)
from app.utils.filename import sanitize_filename, generate_document_id
from app.utils.validators import validate_pdf_upload
from app.utils.file_handler import (
    save_uploaded_file,
    read_annotations_file,
    write_annotations_file
)
from app.utils.page_parser import extract_pdf_metadata
from app.core.paths import get_upload_path, get_output_path
from app.Review_Annotation_services.Pencil_tool_service import apply_pencil_annotations_to_pdf
from app.Review_Annotation_services.Measurement_tool_service import apply_measurement_annotations_to_pdf
from app.Review_Annotation_services.Area_measurement_tool_service import apply_area_measurement_annotations_to_pdf
from app.Review_Annotation_services.Distance_measurement_tool_service import apply_distance_measurement_annotations_to_pdf
from app.Review_Annotation_services.import_comments_service import parse_xfdf, parse_json_comments, apply_native_annotations
from app.Review_Annotation_services.export_comments_service import extract_annotations_from_pdf, annotations_to_xfdf, annotations_to_fdf, annotations_to_csv

router = APIRouter(prefix="/api/v1/review-annotation", tags=["Review & Pencil Annotations"])

@router.post("/upload", response_model=UploadResponse)
async def upload_pdf_for_annotation(file: UploadFile = File(...)):
    """Upload a PDF file, validate, generate unique document ID, and extract page dimensions."""
    validate_pdf_upload(file)
    
    doc_id = generate_document_id()
    upload_path = get_upload_path(doc_id)
    
    await save_uploaded_file(file, upload_path)
    
    try:
        pages_metadata = extract_pdf_metadata(upload_path)
    except Exception as e:
        import traceback
        traceback.print_exc()
        if upload_path.exists():
            try:
                upload_path.unlink()
            except Exception as unlink_err:
                print(f"Failed to delete temporary file {upload_path}: {unlink_err}")
        raise HTTPException(status_code=400, detail=f"Failed to process uploaded PDF: {str(e)}")
    
    clean_name = sanitize_filename(file.filename)
    
    return UploadResponse(
        success=True,
        document_id=doc_id,
        filename=clean_name,
        page_count=len(pages_metadata),
        pages=pages_metadata
    )

@router.get("/{document_id}/file")
async def serve_pdf_document(document_id: str):
    """Serve the uploaded raw PDF file for rendering in the PDF.js canvas viewer."""
    path = get_upload_path(document_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Document not found")
    return FileResponse(
        path=path,
        media_type="application/pdf",
        filename=f"{document_id}.pdf"
    )

@router.get("/{document_id}/annotations")
async def get_document_annotations(document_id: str):
    """Retrieve saved pencil and freehand annotations JSON for a document."""
    upload_path = get_upload_path(document_id)
    if not upload_path.exists():
        raise HTTPException(status_code=404, detail="Document not found")
    
    annots = read_annotations_file(document_id)
    return {
        "success": True,
        "document_id": document_id,
        "annotations": annots
    }

@router.post("/{document_id}/annotations")
async def save_document_annotations(document_id: str, payload: DocumentAnnotationsPayload):
    """Save or update full annotations JSON list (Autosave & manual sync)."""
    upload_path = get_upload_path(document_id)
    if not upload_path.exists():
        raise HTTPException(status_code=404, detail="Document not found")
    
    annots_dict = [ann.model_dump() for ann in payload.annotations]
    success = write_annotations_file(document_id, annots_dict)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save annotations to storage")
    
    return {
        "success": True,
        "document_id": document_id,
        "count": len(annots_dict),
        "message": "Annotations saved successfully"
    }

@router.put("/{document_id}/annotations/{annotation_id}")
async def update_single_annotation(document_id: str, annotation_id: str, ann_update: AnnotationModel):
    """Update a specific pencil stroke annotation by ID."""
    annots = read_annotations_file(document_id)
    updated = False
    new_annots = []
    
    for ann in annots:
        if ann.get("id") == annotation_id:
            new_annots.append(ann_update.model_dump())
            updated = True
        else:
            new_annots.append(ann)
            
    if not updated:
        new_annots.append(ann_update.model_dump())
        
    write_annotations_file(document_id, new_annots)
    return {"success": True, "document_id": document_id, "annotation_id": annotation_id}

@router.delete("/{document_id}/annotations/{annotation_id}")
async def delete_single_annotation(document_id: str, annotation_id: str):
    """Delete a specific pencil stroke annotation by ID."""
    annots = read_annotations_file(document_id)
    filtered = [ann for ann in annots if ann.get("id") != annotation_id]
    write_annotations_file(document_id, filtered)
    return {"success": True, "document_id": document_id, "annotation_id": annotation_id, "remaining": len(filtered)}

@router.post("/{document_id}/annotations/{annotation_id}/reply")
async def post_annotation_reply(document_id: str, annotation_id: str, payload: ReplyPayload):
    """Add a threaded reply message to a specific annotation comment."""
    import time
    annots = read_annotations_file(document_id)
    target_ann = None
    
    for ann in annots:
        if ann.get("id") == annotation_id:
            target_ann = ann
            break
            
    if not target_ann:
        raise HTTPException(status_code=404, detail="Annotation comment not found")
        
    replies = target_ann.get("replies") or []
    reply_item = {
        "id": f"reply_{int(time.time()*1000)}",
        "author": payload.author or "Collaborator",
        "text": payload.text,
        "created_at": time.time()
    }
    replies.append(reply_item)
    target_ann["replies"] = replies
    target_ann["updated_at"] = time.time()
    if payload.status:
        target_ann["status"] = payload.status
        
    write_annotations_file(document_id, annots)
    return {
        "success": True,
        "document_id": document_id,
        "annotation_id": annotation_id,
        "reply": reply_item,
        "total_replies": len(replies),
        "status": target_ann.get("status", "Open")
    }

@router.post("/{document_id}/save", response_model=SavePdfResponse)
async def save_pdf_with_pencil_annotations(document_id: str, payload: Optional[SavePdfRequest] = None):
    """
    Burn all pencil, pen, and highlighter annotations into the PDF using PyMuPDF (fitz) via Pencil_tool_service,
    and generate a downloadable annotated PDF file.
    """
    input_path = get_upload_path(document_id)
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Original document not found")
        
    output_path = get_output_path(document_id)
    
    if payload and payload.annotations is not None:
        annotations = [ann.model_dump() for ann in payload.annotations]
        write_annotations_file(document_id, annotations)
    else:
        annotations = read_annotations_file(document_id)
        
    try:
        success = apply_pencil_annotations_to_pdf(input_path, output_path, annotations)
        if success and output_path.exists():
            apply_measurement_annotations_to_pdf(output_path, output_path, annotations)
            apply_area_measurement_annotations_to_pdf(output_path, output_path, annotations)
            apply_distance_measurement_annotations_to_pdf(output_path, output_path, annotations)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render annotations into PDF: {str(e)}")
        
    if not success:
        raise HTTPException(status_code=500, detail="Generated output PDF validation failed")
        
    download_url = f"/api/v1/review-annotation/{document_id}/download"
    return SavePdfResponse(
        success=True,
        document_id=document_id,
        output_file=output_path.name,
        download_url=download_url,
        message="PDF with pencil annotations saved successfully"
    )

@router.get("/{document_id}/download")
async def download_annotated_pdf(document_id: str):
    """Download the final PDF with burned-in pencil annotations."""
    output_path = get_output_path(document_id)
    if not output_path.exists():
        output_path = get_upload_path(document_id)
        if not output_path.exists():
            raise HTTPException(status_code=404, detail="Annotated PDF file not found. Save PDF first.")
            
    return FileResponse(
        path=output_path,
        media_type="application/pdf",
        filename=f"annotated_{document_id}.pdf"
    )

@router.post("/import-comments")
async def import_pdf_comments(
    pdf_file: UploadFile = File(...),
    comment_file: UploadFile = File(...)
):
    """
    Import comments from XFDF, JSON, or FDF and apply them to the PDF.
    """
    validate_pdf_upload(pdf_file)
    
    comment_name = comment_file.filename or ""
    ext = Path(comment_name).suffix.lower()
    if ext not in [".xfdf", ".fdf", ".json"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported comment file format. Must be .xfdf, .fdf, or .json"
        )

    doc_id = generate_document_id()
    input_path = get_upload_path(doc_id)
    await save_uploaded_file(pdf_file, input_path)

    try:
        pages_metadata = extract_pdf_metadata(input_path)
        page_heights = {idx: p["height"] for idx, p in enumerate(pages_metadata)}
    except Exception as e:
        if input_path.exists():
            input_path.unlink()
        raise HTTPException(status_code=400, detail=f"Failed to read PDF pages: {str(e)}")

    try:
        content_bytes = await comment_file.read()
        content_str = content_bytes.decode("utf-8", errors="ignore")
    except Exception as e:
        if input_path.exists():
            input_path.unlink()
        raise HTTPException(status_code=400, detail=f"Failed to read comment file: {str(e)}")

    is_xml = content_str.strip().startswith("<") or "xml" in content_str[:100]
    
    parsed_annotations = []
    skipped_count = 0
    unsupported_count = 0

    try:
        if ext == ".json":
            parsed_annotations, skipped_count, unsupported_count = parse_json_comments(content_str)
        elif ext in [".xfdf", ".fdf"]:
            if is_xml or ext == ".xfdf":
                parsed_annotations, skipped_count, unsupported_count = parse_xfdf(content_str, page_heights)
            else:
                raise ValueError("Binary FDF parsing is not supported. Please use XFDF.")
    except Exception as e:
        if input_path.exists():
            input_path.unlink()
        raise HTTPException(status_code=400, detail=f"Parsing error: {str(e)}")

    output_path = get_output_path(doc_id)
    doc = fitz.open(str(input_path))
    
    imported_count, app_skipped, app_unsupported = apply_native_annotations(doc, parsed_annotations)
    
    doc.save(str(output_path), garbage=4, deflate=True)
    doc.close()

    if input_path.exists():
        input_path.unlink()

    total_skipped = skipped_count + app_skipped
    total_unsupported = unsupported_count + app_unsupported

    return {
        "success": True,
        "document_id": doc_id,
        "download_url": f"/api/v1/review-annotation/{doc_id}/download",
        "imported_count": imported_count,
        "skipped_count": total_skipped,
        "unsupported_count": total_unsupported
    }

@router.post("/export-comments")
async def export_pdf_comments(
    pdf_file: UploadFile = File(...),
    format: str = Form("xfdf")
):
    """
    Extract comments/annotations from PDF and return as XFDF, FDF, CSV, or JSON file.
    """
    validate_pdf_upload(pdf_file)
    
    fmt = format.lower()
    if fmt not in ["xfdf", "fdf", "csv", "json"]:
        raise HTTPException(status_code=400, detail="Unsupported export format. Must be xfdf, fdf, csv, or json")

    temp_doc_id = f"export_temp_{int(time.time())}"
    temp_path = get_upload_path(temp_doc_id)
    await save_uploaded_file(pdf_file, temp_path)

    try:
        annotations = extract_annotations_from_pdf(temp_path)
    except Exception as e:
        if temp_path.exists():
            temp_path.unlink()
        raise HTTPException(status_code=500, detail=f"Error extracting annotations: {str(e)}")

    if temp_path.exists():
        temp_path.unlink()

    try:
        if fmt == "json":
            content = json.dumps({"annotations": annotations}, indent=2)
            media_type = "application/json"
            filename = "comments.json"
        elif fmt == "csv":
            content = annotations_to_csv(annotations)
            media_type = "text/csv"
            filename = "comments.csv"
        elif fmt == "fdf":
            content = annotations_to_fdf(annotations)
            media_type = "application/vnd.fdf"
            filename = "comments.fdf"
        else:
            content = annotations_to_xfdf(annotations)
            media_type = "application/vnd.adobe.xfdf"
            filename = "comments.xfdf"

        return StreamingResponse(
            io.BytesIO(content.encode("utf-8")),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate export file: {str(e)}")
