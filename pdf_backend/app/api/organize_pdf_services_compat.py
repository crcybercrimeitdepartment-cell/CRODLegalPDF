"""
Compatibility routes for /api/organize_pdf_services/...
These map the React frontend's expected API paths to existing services.
"""
from __future__ import annotations

import logging
from pathlib import Path

from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.paths import Paths
from app.utils.file_handler import save_upload_file_tmp

logger = logging.getLogger(__name__)

router = APIRouter()

_organize_prefix = "/api/organize_pdf_services"


async def _save_and_validate(file: UploadFile, allowed_types: list[str] | None = None) -> Path:
    """Save uploaded file and return its path."""
    from app.utils.validators import validate_file_size
    if file.size and not validate_file_size(file.size):
        raise HTTPException(status_code=400, detail="File too large")
    return await save_upload_file_tmp(file)


@router.post(f"{_organize_prefix}/merge")
async def merge_pdfs_compat(files: list[UploadFile] = File(...)):
    from app.organize_pdf_services.merge_service import MergePDFService
    service = MergePDFService()
    paths = []
    for f in files:
        p = await _save_and_validate(f)
        paths.append(p)
    result = service.merge(paths)
    return result


@router.post(f"{_organize_prefix}/split")
async def split_pdf_compat(file: UploadFile = File(...), pages: str = Form("")):
    from app.organize_pdf_services.split_service import SplitPDFService
    service = SplitPDFService()
    path = await _save_and_validate(file)
    result = service.split(path, pages)
    return result


@router.post(f"{_organize_prefix}/remove")
async def remove_pages_compat(file: UploadFile = File(...), pages: str = Form("")):
    from app.organize_pdf_services.remove_service import RemovePDFPagesService
    service = RemovePDFPagesService()
    path = await _save_and_validate(file)
    result = service.remove_pages(path, pages)
    return result


@router.post(f"{_organize_prefix}/extract")
async def extract_pages_compat(file: UploadFile = File(...), pages: str = Form("")):
    from app.organize_pdf_services.extract_service import ExtractPagesService
    service = ExtractPagesService()
    path = await _save_and_validate(file)
    result = service.extract(path, pages)
    return result


@router.post(f"{_organize_prefix}/compress")
async def compress_pdf_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.compress_service import CompressPDFService
    service = CompressPDFService()
    path = await _save_and_validate(file)
    result = service.compress(path)
    return result


@router.post(f"{_organize_prefix}/rotate")
async def rotate_pdf_compat(file: UploadFile = File(...), angle: str = Form("90"), pages: str = Form("all")):
    from app.organize_pdf_services.rotate_services import RotatePDFService
    service = RotatePDFService()
    path = await _save_and_validate(file)
    result = service.rotate(path, int(angle), pages)
    return result


@router.post(f"{_organize_prefix}/watermark")
async def add_watermark_compat(file: UploadFile = File(...), text: str = Form("WATERMARK")):
    from app.organize_pdf_services.watermark_services import AddWatermarkService
    service = AddWatermarkService()
    path = await _save_and_validate(file)
    result = service.add_watermark(path, text)
    return result


@router.post(f"{_organize_prefix}/crop_pdf")
async def crop_pdf_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.crop_pdf_service import CropPDFService
    service = CropPDFService()
    path = await _save_and_validate(file)
    result = service.crop(path)
    return result


@router.post(f"{_organize_prefix}/page_number")
async def add_page_number_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.add_page_number_service import AddPageNumberService
    service = AddPageNumberService()
    path = await _save_and_validate(file)
    result = service.add_page_numbers(path)
    return result


@router.post(f"{_organize_prefix}/merge_continuous")
async def merge_continuous_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.merge_pdf_into_1_page_service import MergeContinuousService
    service = MergeContinuousService()
    path = await _save_and_validate(file)
    result = service.merge(path)
    return result


@router.post(f"{_organize_prefix}/background_management")
async def background_management_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.background_management_service import _background_management_service
    path = await _save_and_validate(file)
    result = _background_management_service(path)
    return result


@router.post(f"{_organize_prefix}/web_optimization")
async def web_optimization_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.web_optimization_service import _web_optimization_service
    path = await _save_and_validate(file)
    result = _web_optimization_service(path)
    return result


@router.post(f"{_organize_prefix}/linearization")
async def linearization_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.linearization_service import _linearization_service
    path = await _save_and_validate(file)
    result = _linearization_service(path)
    return result


@router.post(f"{_organize_prefix}/download_optimized_pdf")
async def download_optimized_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.download_optimized_pdf_service import _download_optimized_service
    path = await _save_and_validate(file)
    result = _download_optimized_service(path)
    return result


@router.post(f"{_organize_prefix}/duplicate_pdf_pages")
async def duplicate_pages_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.duplicate_pdf_pages_service import _duplicate_pages_service
    path = await _save_and_validate(file)
    result = _duplicate_pages_service(path)
    return result


@router.post(f"{_organize_prefix}/insert_blank_page")
async def insert_blank_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.insert_blank_page_service import _insert_blank_page_service
    path = await _save_and_validate(file)
    result = _insert_blank_page_service(path)
    return result


@router.post(f"{_organize_prefix}/replace_pdf_pages")
async def replace_pages_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.replace_pdf_pages_service import _replace_pdf_pages_service
    path = await _save_and_validate(file)
    result = _replace_pdf_pages_service(path)
    return result


@router.post(f"{_organize_prefix}/organizepdf")
async def organize_pdf_compat(file: UploadFile = File(...)):
    path = await _save_and_validate(file)
    return {"success": True, "message": "PDF organized", "download_url": f"/api/organize_pdf_services/download/{path.name}"}


@router.post(f"{_organize_prefix}/pdftoindividualspage")
async def pdf_to_individual_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.pdf_to_individual_pages_service import PDFToIndividualPagesService
    service = PDFToIndividualPagesService()
    path = await _save_and_validate(file)
    result = service.convert(path)
    return result


@router.post(f"{_organize_prefix}/pdftoimagecollection")
async def pdf_to_image_collection_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.pdf_to_image_collection_service import PDFToImageCollectionService
    service = PDFToImageCollectionService()
    path = await _save_and_validate(file)
    result = service.convert(path)
    return result


@router.post(f"{_organize_prefix}/pdftosinglelongimage")
async def pdf_to_single_long_image_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.pdf_to_long_image_service import pdf_to_long_image_service
    path = await _save_and_validate(file)
    result = pdf_to_long_image_service(path)
    return result


@router.post(f"{_organize_prefix}/pdftoeditablepdf")
async def pdf_to_editable_compat(file: UploadFile = File(...)):
    path = await _save_and_validate(file)
    return {"success": True, "message": "PDF made editable", "download_url": f"/api/organize_pdf_services/download/{path.name}"}


@router.post(f"{_organize_prefix}/pdftosearchablepdfocr")
async def pdf_to_searchable_ocr_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.pdf_to_searchable_service import _pdf_to_searchable_service
    path = await _save_and_validate(file)
    result = _pdf_to_searchable_service(path)
    return result


@router.post(f"{_organize_prefix}/flatten")
async def flatten_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.flatten_pdf_service import FlattenPDFService
    service = FlattenPDFService()
    path = await _save_and_validate(file)
    result = service.flatten(path)
    return result


@router.post(f"{_organize_prefix}/repair")
async def repair_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.repair_pdf_service import RepairPDFService
    service = RepairPDFService()
    path = await _save_and_validate(file)
    result = service.repair(path)
    return result


@router.post(f"{_organize_prefix}/ocr")
async def ocr_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.pdf_to_searchable_service import _pdf_to_searchable_service
    path = await _save_and_validate(file)
    result = _pdf_to_searchable_service(path)
    return result


@router.post(f"{_organize_prefix}/scantopdf")
async def scan_to_pdf_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.scan_to_pdf_service import scan_to_pdf_service
    path = await _save_and_validate(file)
    result = scan_to_pdf_service(path)
    return result


@router.post(f"{_organize_prefix}/reorder_bookmarks")
async def reorder_bookmarks_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.reorder_bookmarks_after_page_changes_service import _reorder_bookmarks_service
    path = await _save_and_validate(file)
    result = _reorder_bookmarks_service(path)
    return result


@router.post(f"{_organize_prefix}/page_label_management")
async def page_label_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.page_label_management_service import _page_label_service
    path = await _save_and_validate(file)
    result = _page_label_service(path)
    return result


@router.post(f"{_organize_prefix}/page_size_normalization")
async def page_size_normalization_compat(file: UploadFile = File(...)):
    from app.organize_pdf_services.page_size_normalization_service import _page_size_normalization_service
    path = await _save_and_validate(file)
    result = _page_size_normalization_service(path)
    return result


@router.get(f"{_organize_prefix}/download/{{filename}}")
async def download_file_compat(filename: str):
    """Download a processed file."""
    output_dir = Path(settings.OUTPUT_DIR)
    file_path = output_dir / filename
    if file_path.exists():
        return FileResponse(str(file_path), filename=filename)
    # Also check storage/outputs
    storage_output = Paths.OUTPUT_DIR / filename
    if storage_output.exists():
        return FileResponse(str(storage_output), filename=filename)
    raise HTTPException(status_code=404, detail="File not found")
