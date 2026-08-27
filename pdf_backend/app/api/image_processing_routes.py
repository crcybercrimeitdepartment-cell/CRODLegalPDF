"""
Image Processing API routes.
Consolidated from individual feature route files.
"""

import json
import logging
import os
import uuid
import time
import zipfile
import shutil
import io
from pathlib import Path
from typing import List, Dict, Any, Optional
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Request
# pyrefly: ignore [missing-import]
from fastapi.responses import FileResponse, JSONResponse
# pyrefly: ignore [missing-import]
from PIL import Image
from app.core.config import settings
from app.core.paths import UPLOADS_DIR
from app.utils.file_handler import save_upload_file_tmp
from app.utils.cleanup import delete_file
from app.utils.validators import validate_file_extension, validate_file_size
from app.utils.filename import sanitize_filename

# pyrefly: ignore [missing-import]
from PIL import Image, ImageDraw, ImageFont, ImageColor, ImageOps
# pyrefly: ignore [missing-import]
from PIL import Image, ImageOps
from app.core.paths import TEMP_PROCESSING_DIR
from app.core.paths import UPLOADS_DIR, DOWNLOADS_DIR
from app.image_processing_services.auto_color_correction_service import (
    process_auto_color_correction_image,
    process_auto_color_correction_batch_zip
)
from app.image_processing_services.bg_remove_service import process_bg_remove_image, process_bg_remove_batch_zip
from app.image_processing_services.bg_replace_service import process_bg_replace_image, process_bg_replace_batch_zip
from app.image_processing_services.brightness_service import process_brightness_image, process_brightness_batch_zip
from app.image_processing_services.compress_images_service import (
    process_compress_image,
    process_compress_batch_zip
)
from app.image_processing_services.contrast_service import process_contrast_image, process_contrast_batch_zip
from app.image_processing_services.convert_service import process_convert_image, process_convert_preview_image, process_convert_batch_zip, FORMAT_MAP
from app.image_processing_services.crop_service import process_crop_image, process_crop_batch_zip
from app.image_processing_services.deblur_service import (
    analyze_blur, apply_deblur
)
from app.image_processing_services.deskew_service import detect_skew, apply_deskew
from app.image_processing_services.dpi_service import detect_dpi, convert_dpi
from app.image_processing_services.enhance_service import process_enhance_batch_zip
from app.image_processing_services.enhance_service import process_enhance_image
from app.image_processing_services.exif_service import extract_exif, process_exif
from app.image_processing_services.flip_service import process_flip_batch_zip
from app.image_processing_services.flip_service import process_flip_image
from app.image_processing_services.gamma_correction_service import (
    process_gamma_correction_image,
    process_gamma_correction_batch_zip
)
from app.image_processing_services.image_denoise_service import (
    analyze_noise, apply_image_denoise
)
from app.image_processing_services.lens_correction_service import (
    auto_detect_distortion, apply_lens_correction
)
from app.image_processing_services.page_border_service import detect_borders_with_confidence, apply_perspective_crop
from app.image_processing_services.pdf_generation_service import generate_multipage_pdf
from app.image_processing_services.perspective_service import (
    detect_perspective_corners, apply_perspective_correction
)
from app.image_processing_services.remove_noise_service import apply_noise_removal
from app.image_processing_services.resize_service import process_resize_image, process_resize_batch_zip
from app.image_processing_services.rotate_service import process_rotate_image, process_rotate_batch_zip
from app.image_processing_services.saturation_service import process_saturation_image, process_saturation_batch_zip
from app.image_processing_services.scan_service import process_scan
from app.image_processing_services.sharpen_service import process_sharpen_batch_zip
from app.image_processing_services.sharpen_service import process_sharpen_image
from app.image_processing_services.upscale_service import process_upscale_image, process_upscale_batch_zip
from app.image_processing_services.white_balance_service import (
    process_white_balance_image,
    process_white_balance_batch_zip
)
from app.schemas.auto_color_correction_schema import AutoColorCorrectionRequestState
from app.schemas.bg_remove_schema import BgRemoveRequestState
from app.schemas.bg_replace_schema import BgReplaceRequestState
from app.schemas.brightness_schema import BrightnessRequestState
from app.schemas.compress_images_schema import CompressImagesRequestState
from app.schemas.contrast_schema import ContrastRequestState
from app.schemas.convert_schema import ConvertRequestState
from app.schemas.crop_schema import CropRequestState
from app.schemas.deblur_schema import (
    DeblurUploadResponse, DeblurApplyRequest, DeblurApplyResponse,
    DeblurBatchRequest, DeblurBatchResponse, DeblurBatchStats
)
from app.schemas.deskew_schema import (
    DeskewDetectResponse,
    DeskewApplyRequest,
    DeskewApplyResponse,
    DeskewBatchRequest,
    DeskewBatchResponse,
    DeskewBatchStats
)
from app.schemas.dpi_schema import DpiDetectionResponse, DpiConvertRequest, DpiConvertResponse, DpiBatchRequest, DpiBatchResponse
from app.schemas.enhance_schema import EnhanceRequestState
from app.schemas.exif_schema import (
    ExifDataResponse, ExifEditRequest, ExifApplyResponse,
    ExifBatchRequest, ExifBatchResponse, ExifBatchStats
)
from app.schemas.flip_schema import FlipRequestState
from app.schemas.gamma_correction_schema import GammaCorrectionRequestState
from app.schemas.image_denoise_schema import (
    ImageDenoiseUploadResponse, ImageDenoiseApplyRequest, ImageDenoiseApplyResponse,
    ImageDenoiseBatchRequest, ImageDenoiseBatchResponse, ImageDenoiseBatchStats
)
from app.schemas.lens_correction_schema import (
    LensCorrectionUploadResponse, LensCorrectionApplyRequest, LensCorrectionApplyResponse,
    LensCorrectionBatchRequest, LensCorrectionBatchResponse, LensCorrectionBatchStats
)
from app.schemas.page_border_schema import DetectResponse, ApplyRequest, ApplyResponse, BatchApplyRequest, BatchApplyResponse
from app.schemas.perspective_schema import (
    PerspectiveDetectResponse, PerspectiveApplyRequest, PerspectiveApplyResponse,
    PerspectiveBatchRequest, PerspectiveBatchResponse, PerspectiveBatchStats
)
from app.schemas.remove_noise_schema import (
    RemoveNoiseApplyRequest, RemoveNoiseApplyResponse,
    RemoveNoiseBatchRequest, RemoveNoiseBatchResponse, RemoveNoiseBatchStats
)
from app.schemas.resize_schema import ResizeRequestState
from app.schemas.rotate_schema import RotateRequestState
from app.schemas.saturation_schema import SaturationRequestState
from app.schemas.scan_schema import GeneratePdfRequest, GenerateZipRequest, ScanProcessResponse
from app.schemas.sharpen_schema import SharpenRequestState
from app.schemas.upscale_schema import UpscaleRequestState
from app.schemas.watermark_schema import WatermarkSettings
from app.schemas.white_balance_schema import WhiteBalanceRequestState
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, BackgroundTasks, Form
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Form
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Request
# pyrefly: ignore [missing-import]
from fastapi.responses import FileResponse
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse, FileResponse
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from pydantic import ValidationError
from typing import List
from typing import List, Dict
from typing import List, Optional
from typing import Optional
import json
# pyrefly: ignore [missing-import]
import pymupdf as fitz

logger = logging.getLogger(__name__)

# Main Image Processing Router
router = APIRouter()

# Sub-routers for prefix-specific aliases and separate paths
page_border_router = APIRouter()
deskew_router = APIRouter()
dpi_router = APIRouter()
replace_router = APIRouter(tags=["Replace Images"])
scan_router = APIRouter(tags=["Image Processing"])

"""
Image Processing API routes.
Consolidated from individual feature route files.
"""
import json
import logging
import os
import uuid
import time
import zipfile
import shutil
import io
from pathlib import Path
from typing import List, Dict, Any, Optional
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Request
# pyrefly: ignore [missing-import]
from fastapi.responses import FileResponse, JSONResponse
# pyrefly: ignore [missing-import]
from PIL import Image

from app.core.config import settings
from app.core.paths import UPLOADS_DIR
from app.schemas.image_processing_schema import ImageEditorRequestState
from app.image_processing_services.image_editor_service import process_image_editor
from app.utils.file_handler import save_upload_file_tmp
from app.utils.cleanup import delete_file
from app.utils.validators import validate_file_extension, validate_file_size
from app.utils.filename import sanitize_filename

logger = logging.getLogger(__name__)

# Main Image Processing Router
router = APIRouter()

# Sub-routers for prefix-specific aliases and separate paths
page_border_router = APIRouter()
deskew_router = APIRouter()
dpi_router = APIRouter()
replace_router = APIRouter(tags=["Replace Images"])
scan_router = APIRouter(tags=["Image Processing"])

ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"]

# ==============================================================================
# FEATURE: Image Editor (Main)
# ==============================================================================
@router.post("/editor", summary="Process Image Editor Request")
async def process_image_editor_endpoint(
    file: UploadFile = File(...),
    state: str = Form(default="{}")
):
    """
    Accept an uploaded image file and JSON editing state string.
    Stores upload in uploads/ and processed output in downloads/.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)

    # 1. Validate file extension
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 2. Save upload file to uploads/ directory
    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)

    try:
        # 3. Validate file size
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
            )

        # 4. Validate image integrity with Pillow
        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception as err:
            delete_file(input_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted or not a valid image.")

        # 5. Parse JSON Editing State
        try:
            state_dict = json.loads(state) if state else {}
            editor_state = ImageEditorRequestState(**state_dict)
        except Exception as json_err:
            delete_file(input_file_path)
            raise HTTPException(status_code=422, detail=f"Invalid editing state JSON: {str(json_err)}")

        # 6. Execute Image Processing Pipeline (saves output directly into downloads/)
        output_file_path = process_image_editor(input_file_path, editor_state)

        media_type = "image/png" if output_file_path.suffix.lower() == ".png" else "image/jpeg"
        download_name = f"edited_{filename}"

        return FileResponse(
            path=output_file_path,
            media_type=media_type,
            filename=download_name
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in image editor route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=500, detail="Failed to process image editor request.")



# ==============================================================================
# FEATURE: Flip
# ==============================================================================
@router.post("/flip", summary="Process Flip Image Request")
async def flip_image_endpoint(
    file: UploadFile = File(...),
    state: str = Form(default="{}")
):
    """
    Accept an uploaded image file and JSON flip state string ({ flip_horizontal: bool, flip_vertical: bool }).
    Returns the flipped output image.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)

    # 1. Validate file extension
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 2. Save upload file to uploads/ directory
    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)

    try:
        # 3. Validate file size
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
            )

        # 4. Validate image integrity with Pillow
        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception:
            delete_file(input_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted or not a valid image.")

        # 5. Parse JSON Flip State
        try:
            state_dict = json.loads(state) if state else {}
            flip_state = FlipRequestState(**state_dict)
        except Exception as json_err:
            delete_file(input_file_path)
            raise HTTPException(status_code=422, detail=f"Invalid flip state JSON: {str(json_err)}")

        # 6. Execute Flip Service
        output_file_path = process_flip_image(input_file_path, flip_state)

        media_type = "image/png" if output_file_path.suffix.lower() == ".png" else "image/jpeg"
        download_name = f"flipped_{filename}"

        return FileResponse(
            path=output_file_path,
            media_type=media_type,
            filename=download_name
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in flip image route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=500, detail="Failed to process image flip request.")


@router.post("/flip-batch", summary="Batch Process & ZIP Multiple Flipped Images")
async def flip_batch_endpoint(
    files: list[UploadFile] = File(...),
    states: str = Form(default="[]")
):
    """
    Accept multiple uploaded images and states array, process flip operations, and return a single ZIP file.
    """


    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    try:
        states_list = json.loads(states) if states else []
    except Exception:
        states_list = []

    items = []
    temp_paths = []

    try:
        for idx, file in enumerate(files):
            if not file or not file.filename:
                continue
            
            filename = sanitize_filename(file.filename)
            if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
                continue

            input_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)
            temp_paths.append(input_path)

            state_dict = states_list[idx] if idx < len(states_list) else {}
            flip_state = FlipRequestState(**state_dict) if isinstance(state_dict, dict) else FlipRequestState()

            items.append((input_path, filename, flip_state))

        if not items:
            raise HTTPException(status_code=400, detail="No valid images processed for batch ZIP.")

        zip_output_path = process_flip_batch_zip(items)

        # Cleanup temporary uploaded files
        for p in temp_paths:
            delete_file(p)

        return FileResponse(
            path=zip_output_path,
            media_type="application/zip",
            filename="flipped_images.zip"
        )

    except HTTPException:
        for p in temp_paths:
            delete_file(p)
        raise
    except Exception as e:
        logger.error(f"Error in flip batch ZIP endpoint: {e}", exc_info=True)
        for p in temp_paths:
            delete_file(p)
        raise HTTPException(status_code=500, detail="Failed to create batch ZIP archive.")


# ==============================================================================
# FEATURE: Enhance
# ==============================================================================
@router.post("/enhance", summary="Process Image Enhancement Request")
async def enhance_image_endpoint(
    file: UploadFile = File(...),
    state: str = Form(default="{}")
):
    """
    Accept an uploaded image file and JSON state string ({ enhancement_level: str, auto_color_balance: bool, denoise: bool }).
    Returns the AI-enhanced optimized output image.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)

    # 1. Validate file extension
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 2. Save upload file to uploads/ directory
    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)

    try:
        # 3. Validate file size
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
            )

        # 4. Validate image integrity with Pillow
        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception:
            delete_file(input_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted or not a valid image.")

        # 5. Parse JSON Enhance State
        try:
            state_dict = json.loads(state) if state else {}
            enhance_state = EnhanceRequestState(**state_dict)
        except Exception as json_err:
            delete_file(input_file_path)
            raise HTTPException(status_code=422, detail=f"Invalid enhance state JSON: {str(json_err)}")

        # 6. Execute Enhancement Service
        output_file_path = process_enhance_image(input_file_path, enhance_state)

        media_type = "image/png" if output_file_path.suffix.lower() == ".png" else "image/jpeg"
        download_name = f"enhanced_{filename}"

        return FileResponse(
            path=output_file_path,
            media_type=media_type,
            filename=download_name
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in enhance image route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=500, detail="Failed to process image enhance request.")


@router.post("/enhance-batch", summary="Batch Process & ZIP Multiple Enhanced Images")
async def enhance_batch_endpoint(
    files: list[UploadFile] = File(...),
    states: str = Form(default="[]")
):
    """
    Accept multiple uploaded images and states array, process enhancement, and return a single ZIP file.
    """


    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    try:
        states_list = json.loads(states) if states else []
    except Exception:
        states_list = []

    items = []
    temp_paths = []

    try:
        for idx, file in enumerate(files):
            if not file or not file.filename:
                continue
            
            filename = sanitize_filename(file.filename)
            if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
                continue

            input_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)
            temp_paths.append(input_path)

            state_dict = states_list[idx] if idx < len(states_list) else {}
            enhance_state = EnhanceRequestState(**state_dict) if isinstance(state_dict, dict) else EnhanceRequestState()

            items.append((input_path, filename, enhance_state))

        if not items:
            raise HTTPException(status_code=400, detail="No valid images processed for batch ZIP.")

        zip_output_path = process_enhance_batch_zip(items)

        # Cleanup temporary uploaded files
        for p in temp_paths:
            delete_file(p)

        return FileResponse(
            path=zip_output_path,
            media_type="application/zip",
            filename="enhanced_images.zip"
        )

    except HTTPException:
        for p in temp_paths:
            delete_file(p)
        raise
    except Exception as e:
        logger.error(f"Error in enhance batch ZIP endpoint: {e}", exc_info=True)
        for p in temp_paths:
            delete_file(p)
        raise HTTPException(status_code=500, detail="Failed to create batch ZIP archive.")


# ==============================================================================
# FEATURE: Sharpen
# ==============================================================================
@router.post("/sharpen", summary="Process Image Sharpening Request")
async def sharpen_image_endpoint(
    file: UploadFile = File(...),
    state: str = Form(default="{}")
):
    """
    Accept an uploaded image file and JSON state string ({ intensity: float }).
    Returns the sharpened output image using OpenCV Unsharp Mask.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)

    # 1. Validate file extension
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 2. Save upload file to uploads/ directory
    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)

    try:
        # 3. Validate file size
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
            )

        # 4. Validate image integrity with Pillow
        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception:
            delete_file(input_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted or not a valid image.")

        # 5. Parse JSON Sharpen State
        try:
            state_dict = json.loads(state) if state else {}
            sharpen_state = SharpenRequestState(**state_dict)
        except Exception as json_err:
            delete_file(input_file_path)
            raise HTTPException(status_code=422, detail=f"Invalid sharpen state JSON: {str(json_err)}")

        # 6. Execute Sharpening Service
        output_file_path = process_sharpen_image(input_file_path, sharpen_state)

        media_type = "image/png" if output_file_path.suffix.lower() == ".png" else "image/jpeg"
        download_name = f"sharpened_{filename}"

        return FileResponse(
            path=output_file_path,
            media_type=media_type,
            filename=download_name
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in sharpen image route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=500, detail="Failed to process image sharpen request.")


@router.post("/sharpen-batch", summary="Batch Process & ZIP Multiple Sharpened Images")
async def sharpen_batch_endpoint(
    files: list[UploadFile] = File(...),
    states: str = Form(default="[]")
):
    """
    Accept multiple uploaded images and states array, process sharpening, and return a single ZIP file.
    """


    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    try:
        states_list = json.loads(states) if states else []
    except Exception:
        states_list = []

    items = []
    temp_paths = []

    try:
        for idx, file in enumerate(files):
            if not file or not file.filename:
                continue
            
            filename = sanitize_filename(file.filename)
            if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
                continue

            input_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)
            temp_paths.append(input_path)

            state_dict = states_list[idx] if idx < len(states_list) else {}
            sharpen_state = SharpenRequestState(**state_dict) if isinstance(state_dict, dict) else SharpenRequestState()

            items.append((input_path, filename, sharpen_state))

        if not items:
            raise HTTPException(status_code=400, detail="No valid images processed for batch ZIP.")

        zip_output_path = process_sharpen_batch_zip(items)

        # Cleanup temporary uploaded files
        for p in temp_paths:
            delete_file(p)

        return FileResponse(
            path=zip_output_path,
            media_type="application/zip",
            filename="sharpened_images.zip"
        )

    except HTTPException:
        for p in temp_paths:
            delete_file(p)
        raise
    except Exception as e:
        logger.error(f"Error in sharpen batch ZIP endpoint: {e}", exc_info=True)
        for p in temp_paths:
            delete_file(p)
        raise HTTPException(status_code=500, detail="Failed to create batch ZIP archive.")


# ==============================================================================
# FEATURE: Brightness
# ==============================================================================
@router.post("/brightness", summary="Process Image Brightness Adjustment Request")
async def brightness_image_endpoint(
    file: UploadFile = File(...),
    state: str = Form(default="{}")
):
    """
    Accept an uploaded image file and JSON brightness state string ({ brightness: float }).
    Returns the brightness-adjusted output image.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)

    # 1. Validate file extension
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 2. Save upload file to uploads/ directory
    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)

    try:
        # 3. Validate file size
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
            )

        # 4. Validate image integrity with Pillow
        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception:
            delete_file(input_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted or not a valid image.")

        # 5. Parse JSON Brightness State
        try:
            state_dict = json.loads(state) if state else {}
            brightness_state = BrightnessRequestState(**state_dict)
        except Exception as json_err:
            delete_file(input_file_path)
            raise HTTPException(status_code=422, detail=f"Invalid brightness state JSON: {str(json_err)}")

        # 6. Execute Brightness Service
        output_file_path = process_brightness_image(input_file_path, brightness_state)

        media_type = "image/png" if output_file_path.suffix.lower() == ".png" else "image/jpeg"
        download_name = f"brightness_{filename}"

        return FileResponse(
            path=output_file_path,
            media_type=media_type,
            filename=download_name
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in brightness image route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=500, detail="Failed to process image brightness request.")


@router.post("/brightness-batch", summary="Batch Process & ZIP Multiple Brightness Adjusted Images")
async def brightness_batch_endpoint(
    files: list[UploadFile] = File(...),
    states: str = Form(default="[]")
):
    """
    Accept multiple uploaded images and states array, process brightness adjustment, and return a single ZIP file.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    try:
        states_list = json.loads(states) if states else []
    except Exception:
        states_list = []

    items = []
    temp_paths = []

    try:
        for idx, file in enumerate(files):
            if not file or not file.filename:
                continue
            
            filename = sanitize_filename(file.filename)
            if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
                continue

            input_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)
            temp_paths.append(input_path)

            state_dict = states_list[idx] if idx < len(states_list) else {}
            brightness_state = BrightnessRequestState(**state_dict) if isinstance(state_dict, dict) else BrightnessRequestState()

            items.append((input_path, filename, brightness_state))

        if not items:
            raise HTTPException(status_code=400, detail="No valid images processed for batch ZIP.")

        zip_output_path = process_brightness_batch_zip(items)

        # Cleanup temporary uploaded files
        for p in temp_paths:
            delete_file(p)

        return FileResponse(
            path=zip_output_path,
            media_type="application/zip",
            filename="brightness_images.zip"
        )

    except HTTPException:
        for p in temp_paths:
            delete_file(p)
        raise
    except Exception as e:
        logger.error(f"Error in brightness batch ZIP endpoint: {e}", exc_info=True)
        for p in temp_paths:
            delete_file(p)
        raise HTTPException(status_code=500, detail="Failed to create batch ZIP archive.")


# ==============================================================================
# FEATURE: Contrast
# ==============================================================================
@router.post("/contrast", summary="Process Image Contrast Adjustment Request")
async def contrast_image_endpoint(
    file: UploadFile = File(...),
    state: str = Form(default="{}")
):
    """
    Accept an uploaded image file and JSON contrast state string ({ mode: str, contrast: float }).
    Returns the contrast-adjusted output image.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)

    # 1. Validate file extension
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 2. Save upload file to uploads/ directory
    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)

    try:
        # 3. Validate file size
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
            )

        # 4. Validate image integrity with Pillow
        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception:
            delete_file(input_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted or not a valid image.")

        # 5. Parse JSON Contrast State
        try:
            state_dict = json.loads(state) if state else {}
            contrast_state = ContrastRequestState(**state_dict)
        except Exception as json_err:
            delete_file(input_file_path)
            raise HTTPException(status_code=422, detail=f"Invalid contrast state JSON: {str(json_err)}")

        # 6. Execute Contrast Service
        output_file_path = process_contrast_image(input_file_path, contrast_state)

        media_type = "image/png" if output_file_path.suffix.lower() == ".png" else "image/jpeg"
        download_name = f"contrast_{filename}"

        return FileResponse(
            path=output_file_path,
            media_type=media_type,
            filename=download_name
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in contrast image route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=500, detail="Failed to process image contrast request.")


@router.post("/contrast-batch", summary="Batch Process & ZIP Multiple Contrast Adjusted Images")
async def contrast_batch_endpoint(
    files: list[UploadFile] = File(...),
    states: str = Form(default="[]")
):
    """
    Accept multiple uploaded images and states array, process contrast adjustment, and return a single ZIP file.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    try:
        states_list = json.loads(states) if states else []
    except Exception:
        states_list = []

    items = []
    temp_paths = []

    try:
        for idx, file in enumerate(files):
            if not file or not file.filename:
                continue
            
            filename = sanitize_filename(file.filename)
            if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
                continue

            input_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)
            temp_paths.append(input_path)

            state_dict = states_list[idx] if idx < len(states_list) else {}
            contrast_state = ContrastRequestState(**state_dict) if isinstance(state_dict, dict) else ContrastRequestState()

            items.append((input_path, filename, contrast_state))

        if not items:
            raise HTTPException(status_code=400, detail="No valid images processed for batch ZIP.")

        zip_output_path = process_contrast_batch_zip(items)

        # Cleanup temporary uploaded files
        for p in temp_paths:
            delete_file(p)

        return FileResponse(
            path=zip_output_path,
            media_type="application/zip",
            filename="contrast_images.zip"
        )

    except HTTPException:
        for p in temp_paths:
            delete_file(p)
        raise
    except Exception as e:
        logger.error(f"Error in contrast batch ZIP endpoint: {e}", exc_info=True)
        for p in temp_paths:
            delete_file(p)
        raise HTTPException(status_code=500, detail="Failed to create batch ZIP archive.")


# ==============================================================================
# FEATURE: Saturation
# ==============================================================================
@router.post("/saturation", summary="Process Image Saturation Adjustment Request")
async def saturation_image_endpoint(
    file: UploadFile = File(...),
    state: str = Form(default="{}")
):
    """
    Accept an uploaded image file and JSON saturation state string ({ saturation: float }).
    Returns the saturation-adjusted output image.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)

    # 1. Validate file extension
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 2. Save upload file to uploads/ directory
    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)

    try:
        # 3. Validate file size
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
            )

        # 4. Validate image integrity with Pillow
        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception:
            delete_file(input_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted or not a valid image.")

        # 5. Parse JSON Saturation State
        try:
            state_dict = json.loads(state) if state else {}
            saturation_state = SaturationRequestState(**state_dict)
        except Exception as json_err:
            delete_file(input_file_path)
            raise HTTPException(status_code=422, detail=f"Invalid saturation state JSON: {str(json_err)}")

        # 6. Execute Saturation Service
        output_file_path = process_saturation_image(input_file_path, saturation_state)

        media_type = "image/png" if output_file_path.suffix.lower() == ".png" else "image/jpeg"
        download_name = f"saturation_{filename}"

        return FileResponse(
            path=output_file_path,
            media_type=media_type,
            filename=download_name
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in saturation image route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=500, detail="Failed to process image saturation request.")


@router.post("/saturation-batch", summary="Batch Process & ZIP Multiple Saturation Adjusted Images")
async def saturation_batch_endpoint(
    files: list[UploadFile] = File(...),
    states: str = Form(default="[]")
):
    """
    Accept multiple uploaded images and states array, process saturation adjustment, and return a single ZIP file.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    try:
        states_list = json.loads(states) if states else []
    except Exception:
        states_list = []

    items = []
    temp_paths = []

    try:
        for idx, file in enumerate(files):
            if not file or not file.filename:
                continue
            
            filename = sanitize_filename(file.filename)
            if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
                continue

            input_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)
            temp_paths.append(input_path)

            state_dict = states_list[idx] if idx < len(states_list) else {}
            saturation_state = SaturationRequestState(**state_dict) if isinstance(state_dict, dict) else SaturationRequestState()

            items.append((input_path, filename, saturation_state))

        if not items:
            raise HTTPException(status_code=400, detail="No valid images processed for batch ZIP.")

        zip_output_path = process_saturation_batch_zip(items)

        # Cleanup temporary uploaded files
        for p in temp_paths:
            delete_file(p)

        return FileResponse(
            path=zip_output_path,
            media_type="application/zip",
            filename="saturation_images.zip"
        )

    except HTTPException:
        for p in temp_paths:
            delete_file(p)
        raise
    except Exception as e:
        logger.error(f"Error in saturation batch ZIP endpoint: {e}", exc_info=True)
        for p in temp_paths:
            delete_file(p)
        raise HTTPException(status_code=500, detail="Failed to create batch ZIP archive.")


# ==============================================================================
# FEATURE: Convert (Image)
# ==============================================================================
@router.post("/convert-preview", summary="Generate PNG Web Preview for Converted Image")
async def convert_preview_endpoint(
    file: UploadFile = File(...),
    state: str = Form(default="{}")
):
    """
    Accept uploaded image file and state JSON, and return a web-renderable PNG preview FileResponse.
    Ensures 100% reliable HTML preview rendering for all formats (including TIFF).
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(status_code=400, detail="Unsupported file format.")

    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)

    try:
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            raise HTTPException(status_code=413, detail="File size exceeds limit.")

        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception:
            delete_file(input_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted.")

        try:
            state_dict = json.loads(state) if state else {}
            convert_state = ConvertRequestState(**state_dict)
        except Exception as json_err:
            delete_file(input_file_path)
            raise HTTPException(status_code=422, detail=f"Invalid convert state JSON: {str(json_err)}")

        preview_file_path = process_convert_preview_image(input_file_path, convert_state)

        return FileResponse(
            path=preview_file_path,
            media_type="image/png",
            filename=f"preview_{filename}.png"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in convert-preview route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=500, detail="Failed to generate image preview.")


@router.post("/convert", summary="Process Image Format Conversion Request")
async def convert_image_endpoint(
    file: UploadFile = File(...),
    state: str = Form(default="{}")
):
    """
    Accept an uploaded image file and JSON conversion state string ({ target_format: str, quality: int }).
    Returns the converted output image in exact target format.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)

    # 1. Validate file extension
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 2. Save upload file to uploads/ directory
    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)

    try:
        # 3. Validate file size
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
            )

        # 4. Validate image integrity with Pillow
        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception:
            delete_file(input_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted or not a valid image.")

        # 5. Parse JSON Convert State
        try:
            state_dict = json.loads(state) if state else {}
            convert_state = ConvertRequestState(**state_dict)
        except Exception as json_err:
            delete_file(input_file_path)
            raise HTTPException(status_code=422, detail=f"Invalid convert state JSON: {str(json_err)}")

        # 6. Execute Conversion Service
        output_file_path = process_convert_image(input_file_path, convert_state)

        target_key = convert_state.target_format.lower()
        fmt_info = FORMAT_MAP.get(target_key, FORMAT_MAP["png"])
        stem = input_file_path.stem
        download_name = f"converted_{stem}{fmt_info['ext']}"

        return FileResponse(
            path=output_file_path,
            media_type=fmt_info["mime"],
            filename=download_name
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in convert image route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=500, detail="Failed to process image format conversion request.")


@router.post("/convert-batch", summary="Batch Process & ZIP Multiple Converted Images")
async def convert_batch_endpoint(
    files: list[UploadFile] = File(...),
    states: str = Form(default="[]")
):
    """
    Accept multiple uploaded images and states array, process format conversion, and return a single ZIP file.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    try:
        states_list = json.loads(states) if states else []
    except Exception:
        states_list = []

    items = []
    temp_paths = []

    try:
        for idx, file in enumerate(files):
            if not file or not file.filename:
                continue
            
            filename = sanitize_filename(file.filename)
            if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
                continue

            input_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)
            temp_paths.append(input_path)

            state_dict = states_list[idx] if idx < len(states_list) else {}
            convert_state = ConvertRequestState(**state_dict) if isinstance(state_dict, dict) else ConvertRequestState()

            items.append((input_path, filename, convert_state))

        if not items:
            raise HTTPException(status_code=400, detail="No valid images processed for batch ZIP.")

        zip_output_path = process_convert_batch_zip(items)

        # Cleanup temporary uploaded files
        for p in temp_paths:
            delete_file(p)

        return FileResponse(
            path=zip_output_path,
            media_type="application/zip",
            filename="converted_images.zip"
        )

    except HTTPException:
        for p in temp_paths:
            delete_file(p)
        raise
    except Exception as e:
        logger.error(f"Error in convert batch ZIP endpoint: {e}", exc_info=True)
        for p in temp_paths:
            delete_file(p)
        raise HTTPException(status_code=500, detail="Failed to create batch ZIP archive.")


# ==============================================================================
# FEATURE: Bg Remove
# ==============================================================================
@router.post("/bg-remove", summary="Process Background Removal Request")
async def bg_remove_image_endpoint(
    file: UploadFile = File(...),
    state: str = Form(default="{}")
):
    """
    Accept an uploaded image file and JSON background removal state string ({ feather: float, threshold: int }).
    Returns the background-removed transparent PNG image.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)

    # 1. Validate file extension
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 2. Save upload file to uploads/ directory
    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)

    try:
        # 3. Validate file size
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
            )

        # 4. Validate image integrity with Pillow
        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception:
            delete_file(input_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted or not a valid image.")

        # 5. Parse JSON Background Removal State
        try:
            state_dict = json.loads(state) if state else {}
            bg_state = BgRemoveRequestState(**state_dict)
        except Exception as json_err:
            delete_file(input_file_path)
            raise HTTPException(status_code=422, detail=f"Invalid background removal state JSON: {str(json_err)}")

        # 6. Execute Background Removal Service
        output_file_path = process_bg_remove_image(input_file_path, bg_state)

        download_name = f"bg_removed_{filename.rsplit('.', 1)[0]}.png"

        return FileResponse(
            path=output_file_path,
            media_type="image/png",
            filename=download_name
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in bg-remove image route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=500, detail="Failed to process background removal request.")


@router.post("/bg-remove-batch", summary="Batch Process & ZIP Multiple Background Removed Images")
async def bg_remove_batch_endpoint(
    files: list[UploadFile] = File(...),
    states: str = Form(default="[]")
):
    """
    Accept multiple uploaded images and states array, process background removal, and return a single ZIP file.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    try:
        states_list = json.loads(states) if states else []
    except Exception:
        states_list = []

    items = []
    temp_paths = []

    try:
        for idx, file in enumerate(files):
            if not file or not file.filename:
                continue
            
            filename = sanitize_filename(file.filename)
            if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
                continue

            input_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)
            temp_paths.append(input_path)

            state_dict = states_list[idx] if idx < len(states_list) else {}
            bg_state = BgRemoveRequestState(**state_dict) if isinstance(state_dict, dict) else BgRemoveRequestState()

            items.append((input_path, filename, bg_state))

        if not items:
            raise HTTPException(status_code=400, detail="No valid images processed for batch ZIP.")

        zip_output_path = process_bg_remove_batch_zip(items)

        # Cleanup temporary uploaded files
        for p in temp_paths:
            delete_file(p)

        return FileResponse(
            path=zip_output_path,
            media_type="application/zip",
            filename="bg_removed_images.zip"
        )

    except HTTPException:
        for p in temp_paths:
            delete_file(p)
        raise
    except Exception as e:
        logger.error(f"Error in bg-remove batch ZIP endpoint: {e}", exc_info=True)
        for p in temp_paths:
            delete_file(p)
        raise HTTPException(status_code=500, detail="Failed to create batch ZIP archive.")


# ==============================================================================
# FEATURE: Bg Replace
# ==============================================================================
@router.post("/bg-replace", summary="Process Background Replacement Request")
async def bg_replace_image_endpoint(
    file: UploadFile = File(...),
    bg_file: Optional[UploadFile] = File(default=None),
    state: str = Form(default="{}")
):
    """
    Accept an uploaded main image file, optional custom background image file, and JSON state string.
    Returns the background-replaced composited output image.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)

    # 1. Validate file extension
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 2. Save upload file to uploads/ directory
    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)
    bg_upload_path = None

    if bg_file and bg_file.filename:
        bg_filename = sanitize_filename(bg_file.filename)
        if validate_file_extension(bg_filename, ALLOWED_IMAGE_EXTENSIONS):
            bg_upload_path = await save_upload_file_tmp(bg_file, directory=UPLOADS_DIR)

    try:
        # 3. Validate file size
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            if bg_upload_path: delete_file(bg_upload_path)
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
            )

        # 4. Validate image integrity with Pillow
        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception:
            delete_file(input_file_path)
            if bg_upload_path: delete_file(bg_upload_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted or not a valid image.")

        # 5. Parse JSON Background Replacement State
        try:
            state_dict = json.loads(state) if state else {}
            bg_state = BgReplaceRequestState(**state_dict)
        except Exception as json_err:
            delete_file(input_file_path)
            if bg_upload_path: delete_file(bg_upload_path)
            raise HTTPException(status_code=422, detail=f"Invalid background replacement state JSON: {str(json_err)}")

        # 6. Execute Background Replacement Service
        output_file_path = process_bg_replace_image(input_file_path, bg_state, bg_upload_path)

        # Cleanup custom bg upload file
        if bg_upload_path:
            delete_file(bg_upload_path)

        download_name = f"bg_replaced_{filename.rsplit('.', 1)[0]}.jpg"

        return FileResponse(
            path=output_file_path,
            media_type="image/jpeg",
            filename=download_name
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in bg-replace image route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        if bg_upload_path and bg_upload_path.exists():
            delete_file(bg_upload_path)
        raise HTTPException(status_code=500, detail="Failed to process background replacement request.")


@router.post("/bg-replace-batch", summary="Batch Process & ZIP Multiple Background Replaced Images")
async def bg_replace_batch_endpoint(
    files: list[UploadFile] = File(...),
    states: str = Form(default="[]")
):
    """
    Accept multiple uploaded images and states array, process background replacement, and return a single ZIP file.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    try:
        states_list = json.loads(states) if states else []
    except Exception:
        states_list = []

    items = []
    temp_paths = []

    try:
        for idx, file in enumerate(files):
            if not file or not file.filename:
                continue
            
            filename = sanitize_filename(file.filename)
            if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
                continue

            input_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)
            temp_paths.append(input_path)

            state_dict = states_list[idx] if idx < len(states_list) else {}
            bg_state = BgReplaceRequestState(**state_dict) if isinstance(state_dict, dict) else BgReplaceRequestState()

            items.append((input_path, filename, bg_state))

        if not items:
            raise HTTPException(status_code=400, detail="No valid images processed for batch ZIP.")

        zip_output_path = process_bg_replace_batch_zip(items)

        # Cleanup temporary uploaded files
        for p in temp_paths:
            delete_file(p)

        return FileResponse(
            path=zip_output_path,
            media_type="application/zip",
            filename="bg_replaced_images.zip"
        )

    except HTTPException:
        for p in temp_paths:
            delete_file(p)
        raise
    except Exception as e:
        logger.error(f"Error in bg-replace batch ZIP endpoint: {e}", exc_info=True)
        for p in temp_paths:
            delete_file(p)
        raise HTTPException(status_code=500, detail="Failed to create batch ZIP archive.")


# ==============================================================================
# FEATURE: Crop
# ==============================================================================
@router.post("/crop", summary="Process Image Crop Request")
async def crop_image_endpoint(
    file: UploadFile = File(...),
    state: str = Form(default="{}")
):
    """
    Accept an uploaded image file and JSON crop state string ({ left, top, right, bottom }).
    Validates file integrity, enforces size limits, crops image via Pillow, and returns the cropped image file.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)

    # 1. Validate file extension
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 2. Save upload file to uploads/ directory
    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)

    try:
        # 3. Validate file size
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
            )

        # 4. Validate image integrity with Pillow
        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception:
            delete_file(input_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted or not a valid image.")

        # 5. Parse JSON Crop State
        try:
            state_dict = json.loads(state) if state else {}
            crop_state = CropRequestState(**state_dict)
        except Exception as json_err:
            delete_file(input_file_path)
            raise HTTPException(status_code=422, detail=f"Invalid crop state JSON: {str(json_err)}")

        # 6. Execute Crop Processing Engine
        output_file_path = process_crop_image(input_file_path, crop_state)

        # Cleanup input file
        delete_file(input_file_path)

        media_type = "image/png" if output_file_path.suffix.lower() == ".png" else "image/jpeg"
        download_name = f"cropped_{filename}"

        return FileResponse(
            path=output_file_path,
            media_type=media_type,
            filename=download_name
        )

    except HTTPException:
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise
    except Exception as e:
        logger.error(f"Unexpected error in crop image route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process image crop request: {str(e)}")


@router.post("/crop-batch", summary="Batch Process & ZIP Multiple Cropped Images")
async def crop_batch_endpoint(
    files: list[UploadFile] = File(...),
    states: str = Form(default="[]")
):
    """
    Accept multiple uploaded images and states array, process cropping for each image independently,
    and return a single ZIP archive containing all successfully cropped images.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    try:
        states_list = json.loads(states) if states else []
    except Exception:
        states_list = []

    items = []
    temp_paths = []

    try:
        for idx, file in enumerate(files):
            if not file or not file.filename:
                continue
            
            filename = sanitize_filename(file.filename)
            if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
                continue

            input_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)
            temp_paths.append(input_path)

            state_dict = states_list[idx] if idx < len(states_list) else {}
            crop_state = CropRequestState(**state_dict) if isinstance(state_dict, dict) else CropRequestState()

            items.append((input_path, filename, crop_state))

        if not items:
            raise HTTPException(status_code=400, detail="No valid images uploaded for batch ZIP processing.")

        zip_output_path = process_crop_batch_zip(items)

        # Cleanup temporary uploaded files
        for p in temp_paths:
            delete_file(p)

        return FileResponse(
            path=zip_output_path,
            media_type="application/zip",
            filename="cropped_images.zip"
        )

    except HTTPException:
        for p in temp_paths:
            delete_file(p)
        raise
    except Exception as e:
        logger.error(f"Error in crop batch ZIP endpoint: {e}", exc_info=True)
        for p in temp_paths:
            delete_file(p)
        raise HTTPException(status_code=500, detail=f"Failed to create batch ZIP archive: {str(e)}")


# ==============================================================================
# FEATURE: Resize
# ==============================================================================
@router.post("/resize", summary="Process Image Resize Request")
async def resize_image_endpoint(
    file: UploadFile = File(...),
    state: str = Form(default="{}")
):
    """
    Accept an uploaded image file and JSON resize state string ({ width, height }).
    Validates file integrity, enforces size limits, resizes image via Pillow Lanczos, and returns resized image file.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)

    # 1. Validate file extension
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 2. Save upload file to uploads/ directory
    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)

    try:
        # 3. Validate file size
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
            )

        # 4. Validate image integrity with Pillow
        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception:
            delete_file(input_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted or not a valid image.")

        # 5. Parse JSON Resize State
        try:
            state_dict = json.loads(state) if state else {}
            resize_state = ResizeRequestState(**state_dict)
        except Exception as json_err:
            delete_file(input_file_path)
            raise HTTPException(status_code=422, detail=f"Invalid resize state parameters: {str(json_err)}")

        # 6. Execute Resize Processing Engine
        output_file_path = process_resize_image(input_file_path, resize_state)

        # Cleanup input file
        delete_file(input_file_path)

        media_type = "image/png" if output_file_path.suffix.lower() == ".png" else "image/jpeg"
        download_name = f"resized_{filename}"

        return FileResponse(
            path=output_file_path,
            media_type=media_type,
            filename=download_name
        )

    except HTTPException:
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise
    except Exception as e:
        logger.error(f"Unexpected error in resize image route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process image resize request: {str(e)}")


@router.post("/resize-batch", summary="Batch Process & ZIP Multiple Resized Images")
async def resize_batch_endpoint(
    files: list[UploadFile] = File(...),
    states: str = Form(default="[]")
):
    """
    Accept multiple uploaded images and states array, process resizing for each image independently,
    and return a single ZIP archive containing all successfully resized images.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    try:
        states_list = json.loads(states) if states else []
    except Exception:
        states_list = []

    items = []
    temp_paths = []

    try:
        for idx, file in enumerate(files):
            if not file or not file.filename:
                continue
            
            filename = sanitize_filename(file.filename)
            if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
                continue

            input_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)
            temp_paths.append(input_path)

            state_dict = states_list[idx] if idx < len(states_list) else {}
            try:
                resize_state = ResizeRequestState(**state_dict) if isinstance(state_dict, dict) else None
            except Exception:
                resize_state = None

            if resize_state:
                items.append((input_path, filename, resize_state))

        if not items:
            raise HTTPException(status_code=400, detail="No valid images uploaded for batch ZIP processing.")

        zip_output_path = process_resize_batch_zip(items)

        # Cleanup temporary uploaded files
        for p in temp_paths:
            delete_file(p)

        return FileResponse(
            path=zip_output_path,
            media_type="application/zip",
            filename="resized_images.zip"
        )

    except HTTPException:
        for p in temp_paths:
            delete_file(p)
        raise
    except Exception as e:
        logger.error(f"Error in resize batch ZIP endpoint: {e}", exc_info=True)
        for p in temp_paths:
            delete_file(p)
        raise HTTPException(status_code=500, detail=f"Failed to create batch ZIP archive: {str(e)}")


# ==============================================================================
# FEATURE: Rotate
# ==============================================================================
@router.post("/rotate", summary="Process Image Rotation Request")
async def rotate_image_endpoint(
    file: UploadFile = File(...),
    state: str = Form(default="{}")
):
    """
    Accept an uploaded image file and JSON rotate state string ({ angle: int, expand: bool }).
    Validates file integrity, enforces size limits, rotates image via Pillow, and returns the rotated image file.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)

    # 1. Validate file extension
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 2. Save upload file to uploads/ directory
    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)

    try:
        # 3. Validate file size
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
            )

        # 4. Validate image integrity with Pillow
        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception:
            delete_file(input_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted or not a valid image.")

        # 5. Parse JSON Rotate State
        try:
            state_dict = json.loads(state) if state else {}
            rotate_state = RotateRequestState(**state_dict)
        except Exception as json_err:
            delete_file(input_file_path)
            raise HTTPException(status_code=422, detail=f"Invalid rotation state JSON: {str(json_err)}")

        # 6. Execute Rotation Processing Engine
        output_file_path = process_rotate_image(input_file_path, rotate_state)

        # Cleanup temporary input upload file
        delete_file(input_file_path)

        media_type = "image/png" if output_file_path.suffix.lower() == ".png" else "image/jpeg"
        download_name = f"rotated_{filename}"

        return FileResponse(
            path=output_file_path,
            media_type=media_type,
            filename=download_name
        )

    except HTTPException:
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise
    except Exception as e:
        logger.error(f"Unexpected error in rotate image route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process image rotation request: {str(e)}")


@router.post("/rotate-batch", summary="Batch Process & ZIP Multiple Rotated Images")
async def rotate_batch_endpoint(
    files: list[UploadFile] = File(...),
    states: str = Form(default="[]")
):
    """
    Accept multiple uploaded images and states array, process rotation for each image independently,
    and return a single ZIP archive containing all successfully rotated images.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    try:
        states_list = json.loads(states) if states else []
    except Exception:
        states_list = []

    items = []
    temp_paths = []

    try:
        for idx, file in enumerate(files):
            if not file or not file.filename:
                continue
            
            filename = sanitize_filename(file.filename)
            if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
                continue

            input_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)
            temp_paths.append(input_path)

            state_dict = states_list[idx] if idx < len(states_list) else {}
            rotate_state = RotateRequestState(**state_dict) if isinstance(state_dict, dict) else RotateRequestState()

            items.append((input_path, filename, rotate_state))

        if not items:
            raise HTTPException(status_code=400, detail="No valid images uploaded for batch ZIP processing.")

        zip_output_path = process_rotate_batch_zip(items)

        # Cleanup temporary uploaded files
        for p in temp_paths:
            delete_file(p)

        return FileResponse(
            path=zip_output_path,
            media_type="application/zip",
            filename="rotated_images.zip"
        )

    except HTTPException:
        for p in temp_paths:
            delete_file(p)
        raise
    except Exception as e:
        logger.error(f"Error in rotate batch ZIP endpoint: {e}", exc_info=True)
        for p in temp_paths:
            delete_file(p)
        raise HTTPException(status_code=500, detail=f"Failed to create batch ZIP archive: {str(e)}")


# ==============================================================================
# FEATURE: Auto Color Correction
# ==============================================================================
@router.post("/auto-color-correction", summary="Process Auto Color Correction Request")
async def auto_color_correction_endpoint(
    file: UploadFile = File(...),
    state: str = Form(default="{}")
):
    """
    Accept an uploaded image file, perform automatic color analysis,
    execute OpenCV Gray World Auto White Balance & LAB Level Stretching,
    and return the color-corrected image file with analysis metadata headers.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)

    # 1. Validate file extension
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 2. Save upload file to uploads/ directory
    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)

    try:
        # 3. Validate file size
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
            )

        # 4. Validate image integrity with Pillow
        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception:
            delete_file(input_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted or not a valid image.")

        # 5. Parse JSON State if provided
        try:
            state_dict = json.loads(state) if state else {}
            req_state = AutoColorCorrectionRequestState(**state_dict)
        except Exception:
            req_state = AutoColorCorrectionRequestState()

        # 6. Execute Auto Color Correction Processing Engine
        output_file_path, metrics = process_auto_color_correction_image(input_file_path, req_state)

        # Cleanup temporary input upload file
        delete_file(input_file_path)

        media_type = "image/png" if output_file_path.suffix.lower() == ".png" else "image/jpeg"
        download_name = f"auto_color_corrected_{filename}"

        headers = {
            "X-Color-Cast": metrics.color_cast_detected,
            "X-White-Balance": metrics.white_balance_status,
            "X-Brightness-Level": metrics.brightness_level,
            "X-Contrast-Range": metrics.contrast_range,
            "Access-Control-Expose-Headers": "X-Color-Cast, X-White-Balance, X-Brightness-Level, X-Contrast-Range"
        }

        return FileResponse(
            path=output_file_path,
            media_type=media_type,
            filename=download_name,
            headers=headers
        )

    except HTTPException:
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise
    except Exception as e:
        logger.error(f"Unexpected error in auto color correction route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process auto color correction request: {str(e)}")


@router.post("/auto-color-correction-batch", summary="Batch Process & ZIP Multiple Auto Color Corrected Images")
async def auto_color_correction_batch_endpoint(
    files: list[UploadFile] = File(...),
    states: str = Form(default="[]")
):
    """
    Accept multiple uploaded images, process auto color correction for each image independently,
    and return a single ZIP archive containing all successfully corrected images.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    try:
        states_list = json.loads(states) if states else []
    except Exception:
        states_list = []

    items = []
    temp_paths = []

    try:
        for idx, file in enumerate(files):
            if not file or not file.filename:
                continue
            
            filename = sanitize_filename(file.filename)
            if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
                continue

            input_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)
            temp_paths.append(input_path)

            state_dict = states_list[idx] if idx < len(states_list) else {}
            req_state = AutoColorCorrectionRequestState(**state_dict) if isinstance(state_dict, dict) else AutoColorCorrectionRequestState()

            items.append((input_path, filename, req_state))

        if not items:
            raise HTTPException(status_code=400, detail="No valid images uploaded for batch ZIP processing.")

        zip_output_path = process_auto_color_correction_batch_zip(items)

        # Cleanup temporary uploaded files
        for p in temp_paths:
            delete_file(p)

        return FileResponse(
            path=zip_output_path,
            media_type="application/zip",
            filename="auto_color_corrected_images.zip"
        )

    except HTTPException:
        for p in temp_paths:
            delete_file(p)
        raise
    except Exception as e:
        logger.error(f"Error in auto color correction batch ZIP endpoint: {e}", exc_info=True)
        for p in temp_paths:
            delete_file(p)
        raise HTTPException(status_code=500, detail=f"Failed to create batch ZIP archive: {str(e)}")


# ==============================================================================
# FEATURE: White Balance
# ==============================================================================
@router.post("/white-balance", summary="Process White Balance Adjustment Request")
async def white_balance_endpoint(
    file: UploadFile = File(...),
    state: str = Form(default="{}")
):
    """
    Accept an uploaded image file and JSON white balance state string ({ mode: str, temperature: int, tint: int }).
    Validates file integrity, enforces size limits, adjusts white balance via OpenCV/PIL, and returns the processed image file.
    Alpha transparency is preserved automatically by the backend.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)

    # 1. Validate file extension
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 2. Save upload file to uploads/ directory
    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)

    try:
        # 3. Validate file size
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
            )

        # 4. Validate image integrity with Pillow
        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception:
            delete_file(input_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted or not a valid image.")

        # 5. Parse JSON White Balance State
        try:
            state_dict = json.loads(state) if state else {}
            wb_state = WhiteBalanceRequestState(**state_dict)
        except Exception as json_err:
            delete_file(input_file_path)
            raise HTTPException(status_code=422, detail=f"Invalid white balance state JSON: {str(json_err)}")

        # 6. Execute White Balance Engine
        output_file_path = process_white_balance_image(input_file_path, wb_state)

        # Cleanup temporary input upload file
        delete_file(input_file_path)

        media_type = "image/png" if output_file_path.suffix.lower() == ".png" else "image/jpeg"
        download_name = f"white_balanced_{filename}"

        return FileResponse(
            path=output_file_path,
            media_type=media_type,
            filename=download_name
        )

    except HTTPException:
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise
    except Exception as e:
        logger.error(f"Unexpected error in white balance route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process white balance request: {str(e)}")


@router.post("/white-balance-batch", summary="Batch Process & ZIP Multiple White Balanced Images")
async def white_balance_batch_endpoint(
    files: list[UploadFile] = File(...),
    states: str = Form(default="[]")
):
    """
    Accept multiple uploaded images and states array, process white balance for each image independently,
    and return a single ZIP archive containing all successfully processed images with an X-Batch-Summary header.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    try:
        states_list = json.loads(states) if states else []
    except Exception:
        states_list = []

    items = []
    temp_paths = []
    initial_failures = []

    try:
        for idx, file in enumerate(files):
            if not file or not file.filename:
                continue
            
            filename = sanitize_filename(file.filename)
            if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
                initial_failures.append({
                    "filename": file.filename or f"file_{idx}",
                    "reason": f"Unsupported format. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
                })
                continue

            input_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)
            temp_paths.append(input_path)

            state_dict = states_list[idx] if idx < len(states_list) else {}
            wb_state = WhiteBalanceRequestState(**state_dict) if isinstance(state_dict, dict) else WhiteBalanceRequestState()

            items.append((input_path, filename, wb_state))

        if not items:
            for p in temp_paths:
                delete_file(p)
            raise HTTPException(
                status_code=400, 
                detail=f"No valid images for batch ZIP processing. Failures: {json.dumps(initial_failures)}"
            )

        zip_output_path, batch_summary = process_white_balance_batch_zip(items)

        # Merge initial validation failures if any
        if initial_failures:
            batch_summary["failed_count"] += len(initial_failures)
            batch_summary["total"] += len(initial_failures)
            batch_summary["failures"].extend(initial_failures)

        # Cleanup temporary uploaded files
        for p in temp_paths:
            delete_file(p)

        headers = {
            "X-Batch-Summary": json.dumps(batch_summary),
            "Access-Control-Expose-Headers": "X-Batch-Summary"
        }

        return FileResponse(
            path=zip_output_path,
            media_type="application/zip",
            filename="white_balanced_images.zip",
            headers=headers
        )

    except HTTPException:
        for p in temp_paths:
            delete_file(p)
        raise
    except Exception as e:
        logger.error(f"Error in white balance batch ZIP endpoint: {e}", exc_info=True)
        for p in temp_paths:
            delete_file(p)
        raise HTTPException(status_code=500, detail=f"Failed to create batch ZIP archive: {str(e)}")


# ==============================================================================
# FEATURE: Gamma Correction
# ==============================================================================
@router.post("/gamma-correction", summary="Process Gamma Correction Request")
async def gamma_correction_endpoint(
    file: UploadFile = File(...),
    state: str = Form(default="{}")
):
    """
    Accept an uploaded image file and JSON gamma state string ({ gamma: float }).
    Validates file integrity, enforces size limits, adjusts gamma via OpenCV/PIL LUT, and returns the processed image file.
    Alpha transparency is preserved automatically by the backend.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)

    # 1. Validate file extension
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 2. Save upload file to uploads/ directory
    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)

    try:
        # 3. Validate file size
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
            )

        # 4. Validate image integrity with Pillow
        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception:
            delete_file(input_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted or not a valid image.")

        # 5. Parse JSON Gamma State
        try:
            state_dict = json.loads(state) if state else {}
            gamma_state = GammaCorrectionRequestState(**state_dict)
        except Exception as json_err:
            delete_file(input_file_path)
            raise HTTPException(status_code=422, detail=f"Invalid gamma state JSON: {str(json_err)}")

        # 6. Execute Gamma Correction Engine
        output_file_path = process_gamma_correction_image(input_file_path, gamma_state)

        # Cleanup temporary input upload file
        delete_file(input_file_path)

        media_type = "image/png" if output_file_path.suffix.lower() == ".png" else "image/jpeg"
        download_name = f"gamma_corrected_{filename}"

        return FileResponse(
            path=output_file_path,
            media_type=media_type,
            filename=download_name
        )

    except HTTPException:
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise
    except Exception as e:
        logger.error(f"Unexpected error in gamma correction route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process gamma correction request: {str(e)}")


@router.post("/gamma-correction-batch", summary="Batch Process & ZIP Multiple Gamma Corrected Images")
async def gamma_correction_batch_endpoint(
    files: list[UploadFile] = File(...),
    states: str = Form(default="[]")
):
    """
    Accept multiple uploaded images and states array, process gamma correction for each image independently,
    and return a single ZIP archive containing all successfully processed images with an X-Batch-Summary header.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    try:
        states_list = json.loads(states) if states else []
    except Exception:
        states_list = []

    items = []
    temp_paths = []
    initial_failures = []

    try:
        for idx, file in enumerate(files):
            if not file or not file.filename:
                continue
            
            filename = sanitize_filename(file.filename)
            if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
                initial_failures.append({
                    "filename": file.filename or f"file_{idx}",
                    "reason": f"Unsupported format. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
                })
                continue

            input_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)
            temp_paths.append(input_path)

            state_dict = states_list[idx] if idx < len(states_list) else {}
            gamma_state = GammaCorrectionRequestState(**state_dict) if isinstance(state_dict, dict) else GammaCorrectionRequestState()

            items.append((input_path, filename, gamma_state))

        if not items:
            for p in temp_paths:
                delete_file(p)
            raise HTTPException(
                status_code=400, 
                detail=f"No valid images for batch ZIP processing. Failures: {json.dumps(initial_failures)}"
            )

        zip_output_path, batch_summary = process_gamma_correction_batch_zip(items)

        # Merge initial validation failures if any
        if initial_failures:
            batch_summary["failed_count"] += len(initial_failures)
            batch_summary["total"] += len(initial_failures)
            batch_summary["failures"].extend(initial_failures)

        # Cleanup temporary uploaded files
        for p in temp_paths:
            delete_file(p)

        headers = {
            "X-Batch-Summary": json.dumps(batch_summary),
            "Access-Control-Expose-Headers": "X-Batch-Summary"
        }

        return FileResponse(
            path=zip_output_path,
            media_type="application/zip",
            filename="gamma_corrected_images.zip",
            headers=headers
        )

    except HTTPException:
        for p in temp_paths:
            delete_file(p)
        raise
    except Exception as e:
        logger.error(f"Error in gamma correction batch ZIP endpoint: {e}", exc_info=True)
        for p in temp_paths:
            delete_file(p)
        raise HTTPException(status_code=500, detail=f"Failed to create batch ZIP archive: {str(e)}")


# ==============================================================================
# FEATURE: Compress Images
# ==============================================================================
@router.post("/compress", summary="Process Image Compression Request")
async def compress_image_endpoint(
    file: UploadFile = File(...),
    state: str = Form(default="{}")
):
    """
    Accept an uploaded image file and JSON compression state string ({ level: 'low'|'balanced'|'high' }).
    Validates file integrity, enforces size limits, compresses image preserving original format & dimensions,
    and returns the compressed image file along with X-Compress-Stats JSON response header.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)

    # 1. Validate file extension
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 2. Save upload file to uploads/ directory
    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)

    try:
        # 3. Validate file size
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
            )

        # 4. Validate image integrity with Pillow
        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception:
            delete_file(input_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted or not a valid image.")

        # 5. Parse JSON Compression State
        try:
            state_dict = json.loads(state) if state else {}
            compress_state = CompressImagesRequestState(**state_dict)
        except Exception as json_err:
            delete_file(input_file_path)
            raise HTTPException(status_code=422, detail=f"Invalid compression state JSON: {str(json_err)}")

        # 6. Execute Image Compression Engine
        output_file_path, stats = process_compress_image(input_file_path, compress_state)

        # Cleanup temporary input upload file
        delete_file(input_file_path)

        media_type = "image/png" if output_file_path.suffix.lower() == ".png" else "image/jpeg"
        download_name = f"compressed_{filename}"

        headers = {
            "X-Compress-Stats": json.dumps(stats),
            "Access-Control-Expose-Headers": "X-Compress-Stats"
        }

        return FileResponse(
            path=output_file_path,
            media_type=media_type,
            filename=download_name,
            headers=headers
        )

    except HTTPException:
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise
    except Exception as e:
        logger.error(f"Unexpected error in image compression route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process image compression request: {str(e)}")


@router.post("/compress-batch", summary="Batch Compress & ZIP Multiple Images")
async def compress_batch_endpoint(
    files: list[UploadFile] = File(...),
    states: str = Form(default="[]")
):
    """
    Accept multiple uploaded images and states array, compress each image independently preserving original format,
    and return a single ZIP archive containing all successfully compressed images with an X-Batch-Summary header.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    try:
        states_list = json.loads(states) if states else []
    except Exception:
        states_list = []

    items = []
    temp_paths = []
    initial_failures = []

    try:
        for idx, file in enumerate(files):
            if not file or not file.filename:
                continue
            
            filename = sanitize_filename(file.filename)
            if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
                initial_failures.append({
                    "filename": file.filename or f"file_{idx}",
                    "reason": f"Unsupported format. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
                })
                continue

            input_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)
            temp_paths.append(input_path)

            state_dict = states_list[idx] if idx < len(states_list) else {}
            compress_state = CompressImagesRequestState(**state_dict) if isinstance(state_dict, dict) else CompressImagesRequestState()

            items.append((input_path, filename, compress_state))

        if not items:
            for p in temp_paths:
                delete_file(p)
            raise HTTPException(
                status_code=400, 
                detail=f"No valid images for batch ZIP processing. Failures: {json.dumps(initial_failures)}"
            )

        zip_output_path, batch_summary = process_compress_batch_zip(items)

        # Merge initial validation failures if any
        if initial_failures:
            batch_summary["failed_count"] += len(initial_failures)
            batch_summary["total"] += len(initial_failures)
            batch_summary["failures"].extend(initial_failures)

        # Cleanup temporary uploaded files
        for p in temp_paths:
            delete_file(p)

        headers = {
            "X-Batch-Summary": json.dumps(batch_summary),
            "Access-Control-Expose-Headers": "X-Batch-Summary"
        }

        return FileResponse(
            path=zip_output_path,
            media_type="application/zip",
            filename="compressed_images.zip",
            headers=headers
        )

    except HTTPException:
        for p in temp_paths:
            delete_file(p)
        raise
    except Exception as e:
        logger.error(f"Error in image compression batch ZIP endpoint: {e}", exc_info=True)
        for p in temp_paths:
            delete_file(p)
        raise HTTPException(status_code=500, detail=f"Failed to create batch ZIP archive: {str(e)}")


# ==============================================================================
# FEATURE: Upscale
# ==============================================================================
@router.post("/upscale", summary="Upscale Single Image")
async def upscale_image_endpoint(
    file: UploadFile = File(...),
    state: str = Form(default="{}")
):
    """
    Accepts an uploaded image and target upscale settings.
    Upscales the image using Pillow's high-quality Lanczos resampling.
    Returns the upscaled image via direct FileResponse.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = sanitize_filename(file.filename)

    # 1. Validate file extension
    if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 2. Save file temporarily
    input_file_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)

    try:
        # 3. Validate file size
        file_size = input_file_path.stat().st_size
        if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
            delete_file(input_file_path)
            raise HTTPException(
                status_code=413,
                detail=f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
            )

        # 4. Verify image integrity with Pillow
        try:
            with Image.open(input_file_path) as img:
                img.verify()
        except Exception:
            delete_file(input_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is corrupted or not a valid image.")

        # 5. Parse upscale request state
        try:
            state_dict = json.loads(state) if state else {}
            upscale_state = UpscaleRequestState(**state_dict)
        except Exception as json_err:
            delete_file(input_file_path)
            raise HTTPException(status_code=422, detail=f"Invalid upscale state JSON: {str(json_err)}")

        # 6. Run upscale service
        output_file_path = process_upscale_image(input_file_path, upscale_state)

        # Clean up temporary uploaded file
        delete_file(input_file_path)

        media_type = "image/png" if output_file_path.suffix.lower() == ".png" else "image/jpeg"
        download_name = f"upscaled_{filename}"

        return FileResponse(
            path=output_file_path,
            media_type=media_type,
            filename=download_name
        )

    except HTTPException:
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise
    except ValueError as val_err:
        logger.warning(f"Validation error in upscale image route: {val_err}")
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        logger.error(f"Unexpected error in upscale image route: {e}", exc_info=True)
        if 'input_file_path' in locals() and input_file_path.exists():
            delete_file(input_file_path)
        raise HTTPException(status_code=500, detail=f"Failed to upscale image: {str(e)}")


@router.post("/upscale-batch", summary="Batch Process Upscaled Images with Report")
async def upscale_batch_endpoint(
    files: list[UploadFile] = File(...),
    states: str = Form(default="[]")
):
    """
    Accepts multiple uploaded images and a states array.
    Processes each image independently. Successful outputs are bundled into a ZIP.
    Returns a JSON report detailing successful and failed files with reasons, plus a download URL.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    try:
        states_list = json.loads(states) if states else []
    except Exception:
        states_list = []

    items = []
    temp_paths = []
    failures = []

    for idx, file in enumerate(files):
        if not file or not file.filename:
            continue

        filename = sanitize_filename(file.filename)

        # 1. Validate file extension
        if not validate_file_extension(filename, ALLOWED_IMAGE_EXTENSIONS):
            failures.append({
                "filename": filename,
                "reason": f"Unsupported format. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
            })
            continue

        # 2. Save file temporarily
        try:
            input_path = await save_upload_file_tmp(file, directory=UPLOADS_DIR)
            temp_paths.append(input_path)

            # 3. Validate file size
            file_size = input_path.stat().st_size
            if not validate_file_size(file_size, settings.MAX_UPLOAD_SIZE):
                failures.append({
                    "filename": filename,
                    "reason": f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
                })
                continue

            # 4. Verify image integrity with Pillow
            try:
                with Image.open(input_path) as img:
                    img.verify()
            except Exception:
                failures.append({
                    "filename": filename,
                    "reason": "File is corrupted or not a valid image."
                })
                continue

            # Parse corresponding state
            state_dict = states_list[idx] if idx < len(states_list) else {}
            upscale_state = UpscaleRequestState(**state_dict) if isinstance(state_dict, dict) else UpscaleRequestState()

            items.append((input_path, filename, upscale_state))

        except Exception as e:
            failures.append({
                "filename": filename,
                "reason": f"System error setting up file: {str(e)}"
            })

    # Execute Batch ZIP generation
    zip_path = None
    success_report = {}

    if items:
        try:
            zip_path, success_report = process_upscale_batch_zip(items)
        except Exception as zip_err:
            logger.error(f"Error during upscale batch ZIP creation: {zip_err}")
            failures.extend([{"filename": itm[1], "reason": f"Failed during batch compression: {str(zip_err)}"} for itm in items])

    # Clean up temporary uploaded files
    for path in temp_paths:
        delete_file(path)

    # Merge inline failures with batch processor failures
    final_failures = failures + success_report.get("failures", [])
    successful_count = success_report.get("successful_count", 0)

    download_url = f"/api/v1/images/upscale/download/{zip_path.name}" if zip_path else None

    return {
        "success": True,
        "total": len(files),
        "successful_count": successful_count,
        "failed_count": len(final_failures),
        "failures": final_failures,
        "download_url": download_url
    }


@router.get("/upscale/download/{filename}", summary="Download Processed Batch ZIP")
async def download_upscale_zip_endpoint(filename: str):
    """
    Serves a batch ZIP or image file from the downloads/ directory.
    """
    file_path = DOWNLOADS_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found.")

    return FileResponse(
        path=file_path,
        media_type="application/zip",
        filename=filename
    )


# ==============================================================================
# FEATURE: Watermark
# ==============================================================================
FONT_DIR = Path(__file__).parent.parent / "assets" / "fonts"

def hex_to_rgba(hex_color: str, opacity_pct: int) -> tuple:
    """Convert hex color and opacity percentage to RGBA tuple."""
    try:
        rgb = ImageColor.getrgb(hex_color)
        alpha = int((opacity_pct / 100.0) * 255)
        return (rgb[0], rgb[1], rgb[2], alpha)
    except Exception:
        return (255, 255, 255, 255) # default white

def get_font(font_family: str, size: int) -> ImageFont.FreeTypeFont:
    """Load bundled font."""
    font_path = FONT_DIR / f"{font_family}.ttf"
    if not font_path.exists():
        font_path = FONT_DIR / "Roboto-Regular.ttf"
    try:
        if font_path.exists():
            return ImageFont.truetype(str(font_path), size)
        else:
            return ImageFont.load_default()
    except Exception as e:
        logger.warning(f"Failed to load font {font_path}: {e}")
        return ImageFont.load_default()

def process_watermark(image_path: Path, settings: WatermarkSettings, watermark_image_path: Optional[Path] = None) -> Path:
    """Apply watermark to image using Pillow."""
    try:
        with Image.open(image_path) as img:
            img = ImageOps.exif_transpose(img) # Fix rotation
            
            if img.mode != 'RGBA':
                base_img = img.convert('RGBA')
            else:
                base_img = img.copy()
            
            base_width, base_height = base_img.size
            
            watermark_layer = Image.new('RGBA', base_img.size, (0,0,0,0))
            
            wm_img = None
            if settings.watermark_type == "text":
                if not settings.text:
                    raise ValueError("Text content is required")
                    
                target_width = int(base_width * (settings.size / 100.0))
                
                # Accurately size text by measuring at size 100
                font = get_font(settings.font_family, 100)
                dummy_draw = ImageDraw.Draw(Image.new('RGBA', (1,1)))
                bbox = dummy_draw.textbbox((0, 0), settings.text, font=font)
                temp_width = bbox[2] - bbox[0]
                
                if temp_width > 0:
                    final_font_size = max(10, int(100 * (target_width / temp_width)))
                    font = get_font(settings.font_family, final_font_size)
                
                # Get final bounding box
                bbox = dummy_draw.textbbox((0, 0), settings.text, font=font)
                text_width = bbox[2] - bbox[0]
                text_height = bbox[3] - bbox[1]
                
                wm_img = Image.new('RGBA', (text_width, text_height), (0,0,0,0))
                wm_draw = ImageDraw.Draw(wm_img)
                fill_color = hex_to_rgba(settings.color, settings.opacity)
                
                wm_draw.text((-bbox[0], -bbox[1]), settings.text, font=font, fill=fill_color)
                
            elif settings.watermark_type == "image":
                if not watermark_image_path or not watermark_image_path.exists():
                    raise ValueError("Watermark image file is missing")
                
                with Image.open(watermark_image_path) as w_img:
                    w_img = ImageOps.exif_transpose(w_img)
                    if w_img.mode != 'RGBA':
                        wm_img = w_img.convert('RGBA')
                    else:
                        wm_img = w_img.copy()
                
                if settings.opacity < 100:
                    alpha = wm_img.split()[3]
                    alpha = alpha.point(lambda p: p * (settings.opacity / 100.0))
                    wm_img.putalpha(alpha)
                    
                target_width = int(base_width * (settings.size / 100.0))
                ratio = target_width / wm_img.size[0]
                target_height = int(wm_img.size[1] * ratio)
                
                if target_height > base_height:
                    target_height = base_height
                    ratio = target_height / wm_img.size[1]
                    target_width = int(wm_img.size[0] * ratio)
                
                if target_width > 0 and target_height > 0:
                    wm_img = wm_img.resize((target_width, target_height), Image.Resampling.LANCZOS)
            
            if not wm_img:
                raise ValueError("Failed to create watermark image")

            unrotated_w, unrotated_h = wm_img.size
            
            # Calculate (x, y) for the un-rotated box to match frontend clamping
            x, y = 0, 0
            if settings.position_mode == "custom" and settings.custom_x_pct is not None and settings.custom_y_pct is not None:
                x = (settings.custom_x_pct / 100.0) * base_width
                y = (settings.custom_y_pct / 100.0) * base_height
            else:
                pos = settings.grid_position
                if "top" in pos: y = 0
                elif "bottom" in pos: y = base_height - unrotated_h
                else: y = (base_height - unrotated_h) / 2
                    
                if "left" in pos: x = 0
                elif "right" in pos: x = base_width - unrotated_w
                else: x = (base_width - unrotated_w) / 2
            
            # Boundary checks on the un-rotated box
            x = max(0, min(base_width - unrotated_w, x))
            y = max(0, min(base_height - unrotated_h, y))
            
            # Apply rotation
            if settings.rotation != 0:
                wm_img = wm_img.rotate(-settings.rotation, expand=True, resample=Image.Resampling.BICUBIC)
                
            rotated_w, rotated_h = wm_img.size
            
            # Align centers: The rotated image's center should match the un-rotated box's center
            cx = x + unrotated_w / 2
            cy = y + unrotated_h / 2
            
            paste_x = int(cx - rotated_w / 2)
            paste_y = int(cy - rotated_h / 2)
            
            watermark_layer.paste(wm_img, (paste_x, paste_y))
            
            final_img = Image.alpha_composite(base_img, watermark_layer)
            
            if img.mode != 'RGBA':
                background = Image.new("RGB", final_img.size, (255, 255, 255))
                background.paste(final_img, mask=final_img.split()[3])
                final_img = background
                
            output_filename = f"watermarked_{image_path.name}"
            output_path = TEMP_PROCESSING_DIR / output_filename
            os.makedirs(TEMP_PROCESSING_DIR, exist_ok=True)
            
            format_ext = image_path.suffix.lower()
            save_format = "JPEG" if format_ext in ['.jpg', '.jpeg'] else ("PNG" if format_ext == '.png' else "WEBP")
            
            final_img.save(output_path, format=save_format, quality=95)
            return output_path
            
    except Exception as e:
        logger.error(f"Error processing watermark: {e}")
        raise ValueError(f"Watermark processing failed: {e}")


@router.post("/watermark", summary="Add watermark to single image")
async def watermark_single(
    file: UploadFile = File(...),
    watermark_file: Optional[UploadFile] = File(None),
    state: str = Form(...)
):
    try:
        state_data = json.loads(state)
        settings = WatermarkSettings(**state_data)
        
        filename_lower = file.filename.lower() if file.filename else ""
        is_image = file.content_type.startswith("image/") or any(filename_lower.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"])
        if not is_image:
            raise HTTPException(status_code=400, detail="Invalid image file")
            
        input_path = await save_upload_file_tmp(file)
        
        wm_path = None
        if settings.watermark_type == "image":
            if not watermark_file:
                raise HTTPException(status_code=400, detail="Watermark image file is required for image watermark type")
            wm_filename_lower = watermark_file.filename.lower() if watermark_file.filename else ""
            is_wm_image = watermark_file.content_type.startswith("image/") or any(wm_filename_lower.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"])
            if not is_wm_image:
                raise HTTPException(status_code=400, detail="Invalid watermark image file")
            wm_path = await save_upload_file_tmp(watermark_file)
            
        output_path = process_watermark(input_path, settings, wm_path)
        
        delete_file(input_path)
        if wm_path:
            delete_file(wm_path)
            
        return FileResponse(
            path=output_path,
            media_type=file.content_type,
            filename=output_path.name
        )
        
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        logger.error(f"Unexpected error in watermark single route: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/watermark-batch", summary="Add watermark to multiple images")
async def watermark_batch(
    files: list[UploadFile] = File(...),
    watermark_file: Optional[UploadFile] = File(None),
    states: str = Form(...)
):
    try:
        states_data = json.loads(states)
        if not isinstance(states_data, list) or len(states_data) != len(files):
            raise HTTPException(status_code=400, detail="States list must match the number of files.")
        
        # We need to know if any state requires an image
        requires_image = any(s.get("watermark_type") == "image" for s in states_data)
        
        wm_path = None
        if requires_image:
            if not watermark_file:
                raise HTTPException(status_code=400, detail="Watermark image file is required for image watermark type")
            wm_filename_lower = watermark_file.filename.lower() if watermark_file.filename else ""
            is_wm_image = watermark_file.content_type.startswith("image/") or any(wm_filename_lower.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"])
            if not is_wm_image:
                raise HTTPException(status_code=400, detail="Invalid watermark image file")
            wm_path = await save_upload_file_tmp(watermark_file)
            
        os.makedirs(TEMP_PROCESSING_DIR, exist_ok=True)
        zip_filename = f"watermarked_images_{uuid.uuid4().hex[:8]}.zip"
        zip_path = TEMP_PROCESSING_DIR / zip_filename
        
        results = {
            "total": len(files),
            "successful": 0,
            "failed": 0,
            "details": []
        }
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for idx, file in enumerate(files):
                input_path = None
                output_path = None
                try:
                    current_settings = WatermarkSettings(**states_data[idx])
                    
                    file_filename_lower = file.filename.lower() if file.filename else ""
                    is_file_image = file.content_type.startswith("image/") or any(file_filename_lower.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"])
                    if not is_file_image:
                        raise ValueError("Invalid image file format")
                        
                    input_path = await save_upload_file_tmp(file)
                    output_path = process_watermark(input_path, current_settings, wm_path)
                    
                    zipf.write(output_path, arcname=output_path.name)
                    results["successful"] += 1
                    
                except Exception as e:
                    results["failed"] += 1
                    results["details"].append({"filename": file.filename, "reason": str(e)})
                    logger.error(f"Failed to watermark {file.filename}: {e}")
                    
                finally:
                    if input_path and input_path.exists():
                        delete_file(input_path)
                    if output_path and output_path.exists():
                        delete_file(output_path)
                        
        if wm_path:
            delete_file(wm_path)
            
        if results["successful"] == 0:
            delete_file(zip_path)
            raise HTTPException(status_code=400, detail="All images failed to process.")
            
        return FileResponse(
            path=zip_path,
            media_type="application/zip",
            filename=zip_filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in watermark batch route: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ==============================================================================
# FEATURE: Remove Noise
# ==============================================================================
REMOVE_NOISE_WORKSPACE_DIR = TEMP_PROCESSING_DIR / "remove_noise"
REMOVE_NOISE_WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)

def get_remove_noise_job_dir(job_id: str) -> Path:
    return REMOVE_NOISE_WORKSPACE_DIR / job_id

def cleanup_remove_noise_job_dir(job_dir: Path):
    if job_dir.exists():
        shutil.rmtree(job_dir, ignore_errors=True)

@router.post("/remove-noise/upload")
async def upload_image(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
        raise HTTPException(status_code=400, detail="Unsupported file format")

    job_id = str(uuid.uuid4())
    job_dir = get_remove_noise_job_dir(job_id)
    job_dir.mkdir(parents=True, exist_ok=True)
    
    # Secure filename
    ext = os.path.splitext(file.filename)[1]
    filename = f"source{ext}"
    source_path = job_dir / filename
    
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        cleanup_remove_noise_job_dir(job_dir)
        raise HTTPException(status_code=400, detail="File too large. Max 20MB.")
        
    with open(source_path, "wb") as f:
        f.write(content)
        
    return {
        "job_id": job_id,
        "filename": file.filename,
        "preview_url": f"/api/v1/images/remove-noise/preview/{job_id}/source"
    }

@router.post("/remove-noise/apply", response_model=RemoveNoiseApplyResponse)
async def apply_noise_removal_route(request: RemoveNoiseApplyRequest):
    job_dir = get_remove_noise_job_dir(request.job_id)
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Job not found")
        
    source_files = list(job_dir.glob("source.*"))
    if not source_files:
        raise HTTPException(status_code=404, detail="Source image not found")
        
    source_path = source_files[0]
    
    try:
        with open(source_path, "rb") as f:
            content = f.read()
            
        processed_bytes, status = apply_noise_removal(content, request.level)
        
        # Save result
        ext = ".png" if source_path.suffix.lower() == ".png" else ".jpg"
        result_path = job_dir / f"result{ext}"
        
        with open(result_path, "wb") as f:
            f.write(processed_bytes)
            
        return RemoveNoiseApplyResponse(
            success=True,
            job_id=request.job_id,
            preview_url=f"/api/v1/images/remove-noise/preview/{request.job_id}/result?t={int(time.time())}",
            status=status
        )
    except Exception as e:
        logger.error(f"Remove noise apply failed: {str(e)}")
        return RemoveNoiseApplyResponse(success=False, job_id=request.job_id, preview_url="", status="failed")

@router.post("/remove-noise/batch-apply", response_model=RemoveNoiseBatchResponse)
async def batch_apply_noise_removal(request: RemoveNoiseBatchRequest, bg_tasks: BackgroundTasks):
    successful = 0
    failed = 0
    failed_jobs = []
    
    zip_id = str(uuid.uuid4())
    zip_dir = REMOVE_NOISE_WORKSPACE_DIR / "zips"
    zip_dir.mkdir(exist_ok=True)
    zip_path = zip_dir / f"denoised_batch_{zip_id}.zip"
    
    with zipfile.ZipFile(zip_path, 'w') as zf:
        for job in request.jobs:
            job_dir = get_remove_noise_job_dir(job.job_id)
            if not job_dir.exists():
                failed += 1
                failed_jobs.append(job.job_id)
                continue
                
            result_files = list(job_dir.glob("result.*"))
            source_files = list(job_dir.glob("source.*"))
            
            # If the user already generated a result via apply, we can use it.
            # But the user might have changed level.
            # Actually, the requirement says "Process every uploaded image independently" 
            # We should just process them based on job.level here to be safe.
            try:
                if not source_files:
                    raise FileNotFoundError
                
                source_path = source_files[0]
                with open(source_path, "rb") as f:
                    content = f.read()
                    
                processed_bytes, status = apply_noise_removal(content, job.level)
                
                ext = ".png" if source_path.suffix.lower() == ".png" else ".jpg"
                filename = f"denoised_{job.job_id[:8]}{ext}"
                zf.writestr(filename, processed_bytes)
                successful += 1
            except Exception as e:
                logger.error(f"Batch noise removal failed for {job.job_id}: {str(e)}")
                failed += 1
                failed_jobs.append(job.job_id)
                
    if successful == 0:
        if zip_path.exists():
            zip_path.unlink()
        return RemoveNoiseBatchResponse(
            success=False,
            stats=RemoveNoiseBatchStats(total=len(request.jobs), successful=0, failed=failed),
            failed_jobs=failed_jobs
        )
        
    # Schedule zip cleanup after 1 hour
    bg_tasks.add_task(cleanup_remove_noise_zip_later, zip_path)
    
    return RemoveNoiseBatchResponse(
        success=True,
        download_url=f"/api/v1/images/remove-noise/download-zip/denoised_batch_{zip_id}.zip",
        stats=RemoveNoiseBatchStats(total=len(request.jobs), successful=successful, failed=failed),
        failed_jobs=failed_jobs
    )

def cleanup_remove_noise_zip_later(path: Path):
    time.sleep(3600)
    if path.exists():
        path.unlink()

@router.get("/remove-noise/preview/{job_id}/{image_type}")
async def get_preview(job_id: str, image_type: str):
    if image_type not in ["source", "result"]:
        raise HTTPException(status_code=400, detail="Invalid image type")
        
    job_dir = get_remove_noise_job_dir(job_id)
    files = list(job_dir.glob(f"{image_type}.*"))
    if not files:
        raise HTTPException(status_code=404, detail="Image not found")
        
    return FileResponse(files[0])

@router.get("/remove-noise/download-zip/{filename}")
async def download_zip(filename: str):
    zip_path = REMOVE_NOISE_WORKSPACE_DIR / "zips" / filename
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="Batch ZIP not found or expired")
    return FileResponse(zip_path, media_type="application/zip", filename="Denoised_Images.zip")


# ==============================================================================
# FEATURE: Perspective
# ==============================================================================
PERSPECTIVE_WORKSPACE_DIR = TEMP_PROCESSING_DIR / "perspective"
PERSPECTIVE_WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)

def get_perspective_job_dir(job_id: str) -> Path:
    return PERSPECTIVE_WORKSPACE_DIR / job_id

def cleanup_perspective_job_dir(job_dir: Path):
    if job_dir.exists():
        shutil.rmtree(job_dir, ignore_errors=True)

@router.post("/perspective/upload", response_model=PerspectiveDetectResponse)
async def upload_image(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
        raise HTTPException(status_code=400, detail="Unsupported file format")

    job_id = str(uuid.uuid4())
    job_dir = get_perspective_job_dir(job_id)
    job_dir.mkdir(parents=True, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1]
    filename = f"source{ext}"
    source_path = job_dir / filename
    
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        cleanup_perspective_job_dir(job_dir)
        raise HTTPException(status_code=400, detail="File too large. Max 20MB.")
        
    with open(source_path, "wb") as f:
        f.write(content)
        
    try:
        corners, confidence = detect_perspective_corners(content)
        if corners and confidence > 0:
            status_msg = "Perspective detected automatically."
            success = True
        else:
            corners = None
            status_msg = "Perspective could not be detected. Please adjust the corners manually."
            success = False
    except Exception as e:
        logger.error(f"Detection failed: {e}")
        corners = None
        confidence = 0.0
        status_msg = "Detection failed. Please adjust manually."
        success = False
        
    return PerspectiveDetectResponse(
        success=success,
        job_id=job_id,
        preview_url=f"/api/v1/images/perspective/preview/{job_id}/source",
        corners=corners,
        confidence=confidence,
        status_message=status_msg
    )

@router.post("/perspective/apply", response_model=PerspectiveApplyResponse)
async def apply_correction_route(request: PerspectiveApplyRequest):
    job_dir = get_perspective_job_dir(request.job_id)
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Job not found")
        
    source_files = list(job_dir.glob("source.*"))
    if not source_files:
        raise HTTPException(status_code=404, detail="Source image not found")
        
    source_path = source_files[0]
    
    if len(request.corners) != 4:
        raise HTTPException(status_code=400, detail="Exactly 4 corners are required.")
        
    corners_dict = [{"x": c.x, "y": c.y} for c in request.corners]
    
    try:
        with open(source_path, "rb") as f:
            content = f.read()
            
        ext = ".png" if source_path.suffix.lower() == ".png" else ".jpg"
        processed_bytes = apply_perspective_correction(content, corners_dict, ext)
        
        result_path = job_dir / f"result{ext}"
        
        with open(result_path, "wb") as f:
            f.write(processed_bytes)
            
        return PerspectiveApplyResponse(
            success=True,
            job_id=request.job_id,
            preview_url=f"/api/v1/images/perspective/preview/{request.job_id}/result?t={int(time.time())}",
            status_message="Perspective corrected successfully."
        )
    except Exception as e:
        logger.error(f"Perspective apply failed: {str(e)}")
        return PerspectiveApplyResponse(success=False, job_id=request.job_id, preview_url="", status_message=str(e))

@router.post("/perspective/batch-apply", response_model=PerspectiveBatchResponse)
async def batch_apply(request: PerspectiveBatchRequest, bg_tasks: BackgroundTasks):
    successful = 0
    failed = 0
    failed_jobs = []
    
    zip_id = str(uuid.uuid4())
    zip_dir = PERSPECTIVE_WORKSPACE_DIR / "zips"
    zip_dir.mkdir(exist_ok=True)
    zip_path = zip_dir / f"perspective_batch_{zip_id}.zip"
    
    with zipfile.ZipFile(zip_path, 'w') as zf:
        for job in request.jobs:
            job_dir = get_perspective_job_dir(job.job_id)
            if not job_dir.exists():
                failed += 1
                failed_jobs.append(job.job_id)
                continue
                
            source_files = list(job_dir.glob("source.*"))
            if not source_files:
                failed += 1
                failed_jobs.append(job.job_id)
                continue
                
            source_path = source_files[0]
            
            try:
                # If corners not provided, we must use result if it exists
                # But requirement says "For automatic batch processing, use reliable detected corners."
                # The UI should pass the corners it has.
                if not job.corners or len(job.corners) != 4:
                    raise ValueError("Reliable corners not provided for batch processing.")
                    
                with open(source_path, "rb") as f:
                    content = f.read()
                    
                corners_dict = [{"x": c.x, "y": c.y} for c in job.corners]
                ext = ".png" if source_path.suffix.lower() == ".png" else ".jpg"
                processed_bytes = apply_perspective_correction(content, corners_dict, ext)
                
                filename = f"perspective_{job.job_id[:8]}{ext}"
                zf.writestr(filename, processed_bytes)
                successful += 1
            except Exception as e:
                logger.error(f"Batch perspective failed for {job.job_id}: {str(e)}")
                failed += 1
                failed_jobs.append(job.job_id)
                
    if successful == 0:
        if zip_path.exists():
            zip_path.unlink()
        return PerspectiveBatchResponse(
            success=False,
            stats=PerspectiveBatchStats(total=len(request.jobs), successful=0, failed=failed),
            failed_jobs=failed_jobs
        )
        
    bg_tasks.add_task(cleanup_perspective_zip_later, zip_path)
    
    return PerspectiveBatchResponse(
        success=True,
        download_url=f"/api/v1/images/perspective/download-zip/perspective_batch_{zip_id}.zip",
        stats=PerspectiveBatchStats(total=len(request.jobs), successful=successful, failed=failed),
        failed_jobs=failed_jobs
    )

def cleanup_perspective_zip_later(path: Path):
    time.sleep(3600)
    if path.exists():
        path.unlink()

@router.get("/perspective/preview/{job_id}/{image_type}")
async def get_preview(job_id: str, image_type: str):
    if image_type not in ["source", "result"]:
        raise HTTPException(status_code=400, detail="Invalid image type")
        
    job_dir = get_perspective_job_dir(job_id)
    files = list(job_dir.glob(f"{image_type}.*"))
    if not files:
        raise HTTPException(status_code=404, detail="Image not found")
        
    return FileResponse(files[0])

@router.get("/perspective/download-zip/{filename}")
async def download_zip(filename: str):
    zip_path = PERSPECTIVE_WORKSPACE_DIR / "zips" / filename
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="Batch ZIP not found or expired")
    return FileResponse(zip_path, media_type="application/zip", filename="Perspective_Images.zip")


# ==============================================================================
# FEATURE: Lens Correction
# ==============================================================================
LENS_CORRECTION_WORKSPACE_DIR = TEMP_PROCESSING_DIR / "lens_correction"
LENS_CORRECTION_WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)

def get_lens_correction_job_dir(job_id: str) -> Path:
    return LENS_CORRECTION_WORKSPACE_DIR / job_id

def cleanup_lens_correction_job_dir(job_dir: Path):
    if job_dir.exists():
        shutil.rmtree(job_dir, ignore_errors=True)

@router.post("/lens-correction/upload", response_model=LensCorrectionUploadResponse)
async def upload_image(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
        raise HTTPException(status_code=400, detail="Unsupported file format")

    job_id = str(uuid.uuid4())
    job_dir = get_lens_correction_job_dir(job_id)
    job_dir.mkdir(parents=True, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1]
    filename = f"source{ext}"
    source_path = job_dir / filename
    
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        cleanup_lens_correction_job_dir(job_dir)
        raise HTTPException(status_code=400, detail="File too large. Max 20MB.")
        
    with open(source_path, "wb") as f:
        f.write(content)
        
    try:
        detected_mode, confidence = auto_detect_distortion(content)
        if detected_mode:
            status_msg = f"Auto-detected {detected_mode} distortion."
        else:
            status_msg = "Distortion cannot be reliably auto-detected. Please adjust manually."
    except Exception as e:
        logger.error(f"Detection failed: {e}")
        detected_mode = None
        status_msg = "Detection failed. Please adjust manually."
        
    return LensCorrectionUploadResponse(
        success=True,
        job_id=job_id,
        preview_url=f"/api/v1/images/lens-correction/preview/{job_id}/source",
        detected_mode=detected_mode,
        status_message=status_msg
    )

@router.post("/lens-correction/apply", response_model=LensCorrectionApplyResponse)
async def apply_correction_route(request: LensCorrectionApplyRequest):
    job_dir = get_lens_correction_job_dir(request.job_id)
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Job not found")
        
    source_files = list(job_dir.glob("source.*"))
    if not source_files:
        raise HTTPException(status_code=404, detail="Source image not found")
        
    source_path = source_files[0]
    
    if request.strength < 0 or request.strength > 100:
        raise HTTPException(status_code=400, detail="Strength must be between 0 and 100")
    if request.mode not in ["auto", "barrel", "pincushion", "fisheye", "mustache", "wide_angle"]:
        raise HTTPException(status_code=400, detail="Invalid mode")
        
    try:
        with open(source_path, "rb") as f:
            content = f.read()
            
        processed_bytes = apply_lens_correction(content, request.mode, request.strength)
        
        ext = ".png" if source_path.suffix.lower() == ".png" else ".jpg"
        result_path = job_dir / f"result{ext}"
        
        with open(result_path, "wb") as f:
            f.write(processed_bytes)
            
        return LensCorrectionApplyResponse(
            success=True,
            job_id=request.job_id,
            preview_url=f"/api/v1/images/lens-correction/preview/{request.job_id}/result?t={int(time.time())}",
            status_message="Lens correction applied successfully."
        )
    except Exception as e:
        logger.error(f"Lens correction apply failed: {str(e)}")
        return LensCorrectionApplyResponse(success=False, job_id=request.job_id, preview_url="", status_message=str(e))

@router.post("/lens-correction/batch-apply", response_model=LensCorrectionBatchResponse)
async def batch_apply(request: LensCorrectionBatchRequest, bg_tasks: BackgroundTasks):
    successful = 0
    failed = 0
    failed_jobs = []
    
    if request.strength < 0 or request.strength > 100:
        raise HTTPException(status_code=400, detail="Strength must be between 0 and 100")
    if request.mode not in ["auto", "barrel", "pincushion", "fisheye", "mustache", "wide_angle"]:
        raise HTTPException(status_code=400, detail="Invalid mode")
        
    zip_id = str(uuid.uuid4())
    zip_dir = LENS_CORRECTION_WORKSPACE_DIR / "zips"
    zip_dir.mkdir(exist_ok=True)
    zip_path = zip_dir / f"lens_correction_batch_{zip_id}.zip"
    
    with zipfile.ZipFile(zip_path, 'w') as zf:
        for job in request.jobs:
            job_dir = get_lens_correction_job_dir(job.job_id)
            if not job_dir.exists():
                failed += 1
                failed_jobs.append(job.job_id)
                continue
                
            source_files = list(job_dir.glob("source.*"))
            if not source_files:
                failed += 1
                failed_jobs.append(job.job_id)
                continue
                
            source_path = source_files[0]
            
            try:
                with open(source_path, "rb") as f:
                    content = f.read()
                    
                processed_bytes = apply_lens_correction(content, request.mode, request.strength)
                
                ext = ".png" if source_path.suffix.lower() == ".png" else ".jpg"
                filename = f"corrected_{job.job_id[:8]}{ext}"
                zf.writestr(filename, processed_bytes)
                successful += 1
            except Exception as e:
                logger.error(f"Batch lens correction failed for {job.job_id}: {str(e)}")
                failed += 1
                failed_jobs.append(job.job_id)
                
    if successful == 0:
        if zip_path.exists():
            zip_path.unlink()
        return LensCorrectionBatchResponse(
            success=False,
            stats=LensCorrectionBatchStats(total=len(request.jobs), successful=0, failed=failed),
            failed_jobs=failed_jobs
        )
        
    bg_tasks.add_task(cleanup_lens_correction_zip_later, zip_path)
    
    return LensCorrectionBatchResponse(
        success=True,
        download_url=f"/api/v1/images/lens-correction/download-zip/lens_correction_batch_{zip_id}.zip",
        stats=LensCorrectionBatchStats(total=len(request.jobs), successful=successful, failed=failed),
        failed_jobs=failed_jobs
    )

def cleanup_lens_correction_zip_later(path: Path):
    time.sleep(3600)
    if path.exists():
        path.unlink()

@router.get("/lens-correction/preview/{job_id}/{image_type}")
async def get_preview(job_id: str, image_type: str):
    if image_type not in ["source", "result"]:
        raise HTTPException(status_code=400, detail="Invalid image type")
        
    job_dir = get_lens_correction_job_dir(job_id)
    files = list(job_dir.glob(f"{image_type}.*"))
    if not files:
        raise HTTPException(status_code=404, detail="Image not found")
        
    return FileResponse(files[0])

@router.get("/lens-correction/download-zip/{filename}")
async def download_zip(filename: str):
    zip_path = LENS_CORRECTION_WORKSPACE_DIR / "zips" / filename
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="Batch ZIP not found or expired")
    return FileResponse(zip_path, media_type="application/zip", filename="Corrected_Images.zip")


# ==============================================================================
# FEATURE: Deblur
# ==============================================================================
DEBLUR_WORKSPACE_DIR = TEMP_PROCESSING_DIR / "deblur_images"
DEBLUR_WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)

def get_deblur_job_dir(job_id: str) -> Path:
    return DEBLUR_WORKSPACE_DIR / job_id

def cleanup_deblur_job_dir(job_dir: Path):
    if job_dir.exists():
        shutil.rmtree(job_dir, ignore_errors=True)

@router.post("/deblur/upload", response_model=DeblurUploadResponse)
async def upload_image(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
        raise HTTPException(status_code=400, detail="Unsupported file format")

    job_id = str(uuid.uuid4())
    job_dir = get_deblur_job_dir(job_id)
    job_dir.mkdir(parents=True, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1]
    filename = f"source{ext}"
    source_path = job_dir / filename
    
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        cleanup_deblur_job_dir(job_dir)
        raise HTTPException(status_code=400, detail="File too large. Max 20MB.")
        
    with open(source_path, "wb") as f:
        f.write(content)
        
    try:
        status_msg = analyze_blur(content)
    except Exception as e:
        logger.error(f"Detection failed: {e}")
        status_msg = "Ready to process."
        
    return DeblurUploadResponse(
        success=True,
        job_id=job_id,
        preview_url=f"/api/v1/images/deblur/preview/{job_id}/source",
        status_message=status_msg
    )

@router.post("/deblur/apply", response_model=DeblurApplyResponse)
async def apply_correction_route(request: DeblurApplyRequest):
    job_dir = get_deblur_job_dir(request.job_id)
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Job not found")
        
    source_files = list(job_dir.glob("source.*"))
    if not source_files:
        raise HTTPException(status_code=404, detail="Source image not found")
        
    source_path = source_files[0]
    
    if request.level not in ["low", "medium", "high"]:
        raise HTTPException(status_code=400, detail="Invalid level")
        
    try:
        with open(source_path, "rb") as f:
            content = f.read()
            
        processed_bytes = apply_deblur(content, request.level)
        
        ext = ".png" if source_path.suffix.lower() == ".png" else ".jpg"
        result_path = job_dir / f"result{ext}"
        
        with open(result_path, "wb") as f:
            f.write(processed_bytes)
            
        return DeblurApplyResponse(
            success=True,
            job_id=request.job_id,
            preview_url=f"/api/v1/images/deblur/preview/{request.job_id}/result?t={int(time.time())}",
            status_message="Image successfully restored."
        )
    except Exception as e:
        logger.error(f"Deblur apply failed: {str(e)}")
        return DeblurApplyResponse(success=False, job_id=request.job_id, preview_url="", status_message=str(e))

@router.post("/deblur/batch-apply", response_model=DeblurBatchResponse)
async def batch_apply(request: DeblurBatchRequest, bg_tasks: BackgroundTasks):
    successful = 0
    failed = 0
    failed_jobs = []
    
    if request.level not in ["low", "medium", "high"]:
        raise HTTPException(status_code=400, detail="Invalid level")
        
    zip_id = str(uuid.uuid4())
    zip_dir = DEBLUR_WORKSPACE_DIR / "zips"
    zip_dir.mkdir(exist_ok=True)
    zip_path = zip_dir / f"deblur_batch_{zip_id}.zip"
    
    with zipfile.ZipFile(zip_path, 'w') as zf:
        for job in request.jobs:
            job_dir = get_deblur_job_dir(job.job_id)
            if not job_dir.exists():
                failed += 1
                failed_jobs.append(job.job_id)
                continue
                
            source_files = list(job_dir.glob("source.*"))
            if not source_files:
                failed += 1
                failed_jobs.append(job.job_id)
                continue
                
            source_path = source_files[0]
            
            try:
                with open(source_path, "rb") as f:
                    content = f.read()
                    
                processed_bytes = apply_deblur(content, request.level)
                
                ext = ".png" if source_path.suffix.lower() == ".png" else ".jpg"
                filename = f"deblurred_{job.job_id[:8]}{ext}"
                zf.writestr(filename, processed_bytes)
                successful += 1
            except Exception as e:
                logger.error(f"Batch deblur failed for {job.job_id}: {str(e)}")
                failed += 1
                failed_jobs.append(job.job_id)
                
    if successful == 0:
        if zip_path.exists():
            zip_path.unlink()
        return DeblurBatchResponse(
            success=False,
            stats=DeblurBatchStats(total=len(request.jobs), successful=0, failed=failed),
            failed_jobs=failed_jobs
        )
        
    bg_tasks.add_task(cleanup_deblur_zip_later, zip_path)
    
    return DeblurBatchResponse(
        success=True,
        download_url=f"/api/v1/images/deblur/download-zip/deblur_batch_{zip_id}.zip",
        stats=DeblurBatchStats(total=len(request.jobs), successful=successful, failed=failed),
        failed_jobs=failed_jobs
    )

def cleanup_deblur_zip_later(path: Path):
    time.sleep(3600)
    if path.exists():
        path.unlink()

@router.get("/deblur/preview/{job_id}/{image_type}")
async def get_preview(job_id: str, image_type: str):
    if image_type not in ["source", "result"]:
        raise HTTPException(status_code=400, detail="Invalid image type")
        
    job_dir = get_deblur_job_dir(job_id)
    files = list(job_dir.glob(f"{image_type}.*"))
    if not files:
        raise HTTPException(status_code=404, detail="Image not found")
        
    return FileResponse(files[0])

@router.get("/deblur/download-zip/{filename}")
async def download_zip(filename: str):
    zip_path = DEBLUR_WORKSPACE_DIR / "zips" / filename
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="Batch ZIP not found or expired")
    return FileResponse(zip_path, media_type="application/zip", filename="Deblurred_Images.zip")


# ==============================================================================
# FEATURE: Image Denoise
# ==============================================================================
IMAGE_DENOISE_WORKSPACE_DIR = TEMP_PROCESSING_DIR / "image_denoise"
IMAGE_DENOISE_WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)

def get_image_denoise_job_dir(job_id: str) -> Path:
    return IMAGE_DENOISE_WORKSPACE_DIR / job_id

def cleanup_image_denoise_job_dir(job_dir: Path):
    if job_dir.exists():
        shutil.rmtree(job_dir, ignore_errors=True)

@router.post("/image-denoise/upload", response_model=ImageDenoiseUploadResponse)
async def upload_image(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
        raise HTTPException(status_code=400, detail="Unsupported file format")

    job_id = str(uuid.uuid4())
    job_dir = get_image_denoise_job_dir(job_id)
    job_dir.mkdir(parents=True, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1]
    filename = f"source{ext}"
    source_path = job_dir / filename
    
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        cleanup_image_denoise_job_dir(job_dir)
        raise HTTPException(status_code=400, detail="File too large. Max 20MB.")
        
    with open(source_path, "wb") as f:
        f.write(content)
        
    try:
        status_msg = analyze_noise(content)
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        status_msg = "Ready to process."
        
    return ImageDenoiseUploadResponse(
        success=True,
        job_id=job_id,
        preview_url=f"/api/v1/images/image-denoise/preview/{job_id}/source",
        status_message=status_msg
    )

@router.post("/image-denoise/apply", response_model=ImageDenoiseApplyResponse)
async def apply_correction_route(request: ImageDenoiseApplyRequest):
    job_dir = get_image_denoise_job_dir(request.job_id)
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Job not found")
        
    source_files = list(job_dir.glob("source.*"))
    if not source_files:
        raise HTTPException(status_code=404, detail="Source image not found")
        
    source_path = source_files[0]
    
    if request.level not in ["low", "medium", "high"]:
        raise HTTPException(status_code=400, detail="Invalid level")
        
    try:
        with open(source_path, "rb") as f:
            content = f.read()
            
        processed_bytes = apply_image_denoise(content, request.level)
        
        ext = ".png" if source_path.suffix.lower() == ".png" else ".jpg"
        result_path = job_dir / f"result{ext}"
        
        with open(result_path, "wb") as f:
            f.write(processed_bytes)
            
        return ImageDenoiseApplyResponse(
            success=True,
            job_id=request.job_id,
            preview_url=f"/api/v1/images/image-denoise/preview/{request.job_id}/result?t={int(time.time())}",
            status_message="Image denoised successfully."
        )
    except Exception as e:
        logger.error(f"Image denoise apply failed: {str(e)}")
        return ImageDenoiseApplyResponse(success=False, job_id=request.job_id, preview_url="", status_message=str(e))

@router.post("/image-denoise/batch-apply", response_model=ImageDenoiseBatchResponse)
async def batch_apply(request: ImageDenoiseBatchRequest, bg_tasks: BackgroundTasks):
    successful = 0
    failed = 0
    failed_jobs = []
    
    if request.level not in ["low", "medium", "high"]:
        raise HTTPException(status_code=400, detail="Invalid level")
        
    zip_id = str(uuid.uuid4())
    zip_dir = IMAGE_DENOISE_WORKSPACE_DIR / "zips"
    zip_dir.mkdir(exist_ok=True)
    zip_path = zip_dir / f"denoise_batch_{zip_id}.zip"
    
    with zipfile.ZipFile(zip_path, 'w') as zf:
        for job in request.jobs:
            job_dir = get_image_denoise_job_dir(job.job_id)
            if not job_dir.exists():
                failed += 1
                failed_jobs.append(job.job_id)
                continue
                
            source_files = list(job_dir.glob("source.*"))
            if not source_files:
                failed += 1
                failed_jobs.append(job.job_id)
                continue
                
            source_path = source_files[0]
            
            try:
                with open(source_path, "rb") as f:
                    content = f.read()
                    
                processed_bytes = apply_image_denoise(content, request.level)
                
                ext = ".png" if source_path.suffix.lower() == ".png" else ".jpg"
                filename = f"denoised_{job.job_id[:8]}{ext}"
                zf.writestr(filename, processed_bytes)
                successful += 1
            except Exception as e:
                logger.error(f"Batch denoise failed for {job.job_id}: {str(e)}")
                failed += 1
                failed_jobs.append(job.job_id)
                
    if successful == 0:
        if zip_path.exists():
            zip_path.unlink()
        return ImageDenoiseBatchResponse(
            success=False,
            stats=ImageDenoiseBatchStats(total=len(request.jobs), successful=0, failed=failed),
            failed_jobs=failed_jobs
        )
        
    bg_tasks.add_task(cleanup_image_denoise_zip_later, zip_path)
    
    return ImageDenoiseBatchResponse(
        success=True,
        download_url=f"/api/v1/images/image-denoise/download-zip/denoise_batch_{zip_id}.zip",
        stats=ImageDenoiseBatchStats(total=len(request.jobs), successful=successful, failed=failed),
        failed_jobs=failed_jobs
    )

def cleanup_image_denoise_zip_later(path: Path):
    time.sleep(3600)
    if path.exists():
        path.unlink()

@router.get("/image-denoise/preview/{job_id}/{image_type}")
async def get_preview(job_id: str, image_type: str):
    if image_type not in ["source", "result"]:
        raise HTTPException(status_code=400, detail="Invalid image type")
        
    job_dir = get_image_denoise_job_dir(job_id)
    files = list(job_dir.glob(f"{image_type}.*"))
    if not files:
        raise HTTPException(status_code=404, detail="Image not found")
        
    return FileResponse(files[0])

@router.get("/image-denoise/download-zip/{filename}")
async def download_zip(filename: str):
    zip_path = IMAGE_DENOISE_WORKSPACE_DIR / "zips" / filename
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="Batch ZIP not found or expired")
    return FileResponse(zip_path, media_type="application/zip", filename="Denoised_Images.zip")


# ==============================================================================
# FEATURE: Exif
# ==============================================================================
EXIF_WORKSPACE_DIR = TEMP_PROCESSING_DIR / "exif_editor"
EXIF_WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)

def get_exif_job_dir(job_id: str) -> Path:
    return EXIF_WORKSPACE_DIR / job_id

def cleanup_exif_job_dir(job_dir: Path):
    if job_dir.exists():
        shutil.rmtree(job_dir, ignore_errors=True)

@router.post("/exif/upload")
async def upload_image(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif')):
        raise HTTPException(status_code=400, detail="Unsupported file format")

    job_id = str(uuid.uuid4())
    job_dir = get_exif_job_dir(job_id)
    job_dir.mkdir(parents=True, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1]
    filename = f"source{ext}"
    source_path = job_dir / filename
    
    content = await file.read()
    if len(content) > 30 * 1024 * 1024:
        cleanup_exif_job_dir(job_dir)
        raise HTTPException(status_code=400, detail="File too large. Max 30MB.")
        
    with open(source_path, "wb") as f:
        f.write(content)
        
    try:
        preview_url = f"/api/v1/images/exif/preview/{job_id}/source"
        exif_data = extract_exif(content, job_id, preview_url)
        return exif_data
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        cleanup_exif_job_dir(job_dir)
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/exif/apply", response_model=ExifApplyResponse)
async def apply_correction_route(request: ExifEditRequest):
    job_dir = get_exif_job_dir(request.job_id)
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Job not found")
        
    source_files = list(job_dir.glob("source.*"))
    if not source_files:
        raise HTTPException(status_code=404, detail="Source image not found")
        
    source_path = source_files[0]
    
    if request.action not in ["edit", "remove_gps", "remove_all"]:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    try:
        with open(source_path, "rb") as f:
            content = f.read()
            
        edit_data = request.dict(exclude_none=True)
        processed_bytes = process_exif(content, request.action, edit_data)
        
        ext = source_path.suffix.lower()
        result_path = job_dir / f"result{ext}"
        
        with open(result_path, "wb") as f:
            f.write(processed_bytes)
            
        # Verify metadata
        try:
            verified_data = extract_exif(processed_bytes, request.job_id, "")
        except Exception as e:
            logger.error(f"Verification failed: {e}")
            verified_data = None
            
        return ExifApplyResponse(
            success=True,
            job_id=request.job_id,
            preview_url=f"/api/v1/images/exif/preview/{request.job_id}/result?t={int(time.time())}",
            status_message="Metadata updated successfully.",
            verified_metadata=verified_data
        )
    except Exception as e:
        logger.error(f"EXIF apply failed: {str(e)}")
        return ExifApplyResponse(success=False, job_id=request.job_id, preview_url="", status_message=str(e))

@router.post("/exif/batch-apply", response_model=ExifBatchResponse)
async def batch_apply(request: ExifBatchRequest, bg_tasks: BackgroundTasks):
    successful = 0
    failed = 0
    failed_jobs = []
    
    if request.action not in ["edit", "remove_gps", "remove_all"]:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    zip_id = str(uuid.uuid4())
    zip_dir = EXIF_WORKSPACE_DIR / "zips"
    zip_dir.mkdir(exist_ok=True)
    zip_path = zip_dir / f"exif_batch_{zip_id}.zip"
    
    with zipfile.ZipFile(zip_path, 'w') as zf:
        for job in request.jobs:
            job_dir = get_exif_job_dir(job.job_id)
            if not job_dir.exists():
                failed += 1
                failed_jobs.append(job.job_id)
                continue
                
            source_files = list(job_dir.glob("source.*"))
            if not source_files:
                failed += 1
                failed_jobs.append(job.job_id)
                continue
                
            source_path = source_files[0]
            
            try:
                with open(source_path, "rb") as f:
                    content = f.read()
                    
                processed_bytes = process_exif(content, request.action, request.edit_data)
                
                ext = source_path.suffix.lower()
                filename = f"edited_{job.job_id[:8]}{ext}"
                zf.writestr(filename, processed_bytes)
                successful += 1
            except Exception as e:
                logger.error(f"Batch EXIF failed for {job.job_id}: {str(e)}")
                failed += 1
                failed_jobs.append(job.job_id)
                
    if successful == 0:
        if zip_path.exists():
            zip_path.unlink()
        return ExifBatchResponse(
            success=False,
            stats=ExifBatchStats(total=len(request.jobs), successful=0, failed=failed),
            failed_jobs=failed_jobs
        )
        
    bg_tasks.add_task(cleanup_exif_zip_later, zip_path)
    
    return ExifBatchResponse(
        success=True,
        download_url=f"/api/v1/images/exif/download-zip/exif_batch_{zip_id}.zip",
        stats=ExifBatchStats(total=len(request.jobs), successful=successful, failed=failed),
        failed_jobs=failed_jobs
    )

def cleanup_exif_zip_later(path: Path):
    time.sleep(3600)
    if path.exists():
        path.unlink()

@router.get("/exif/preview/{job_id}/{image_type}")
async def get_preview(job_id: str, image_type: str):
    if image_type not in ["source", "result"]:
        raise HTTPException(status_code=400, detail="Invalid image type")
        
    job_dir = get_exif_job_dir(job_id)
    files = list(job_dir.glob(f"{image_type}.*"))
    if not files:
        raise HTTPException(status_code=404, detail="Image not found")
        
    return FileResponse(files[0])

@router.get("/exif/download-zip/{filename}")
async def download_zip(filename: str):
    zip_path = EXIF_WORKSPACE_DIR / "zips" / filename
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="Batch ZIP not found or expired")
    return FileResponse(zip_path, media_type="application/zip", filename="Edited_Metadata.zip")


# ==============================================================================
# FEATURE: Page Border
# ==============================================================================
PAGE_BORDER_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
PAGE_BORDER_MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB

def validate_page_border_image_file(file: UploadFile):
    ext = Path(file.filename).suffix.lower()
    if ext not in PAGE_BORDER_ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Supported types: {', '.join(PAGE_BORDER_ALLOWED_EXTENSIONS)}")

@page_border_router.post("/detect", response_model=DetectResponse, summary="Detect page borders and return confidence")
async def detect_borders_endpoint(file: UploadFile = File(...)):
    validate_page_border_image_file(file)
    
    try:
        image_bytes = await file.read()
        if len(image_bytes) > PAGE_BORDER_MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large.")
            
        corners, confidence, orig_w, orig_h = detect_borders_with_confidence(image_bytes)
        
        job_id = uuid.uuid4().hex
        orig_ext = Path(file.filename).suffix.lower() or ".jpg"
        orig_filename = f"pb_orig_{job_id}{orig_ext}"
        
        # Save original to temp for later apply
        with open(TEMP_PROCESSING_DIR / orig_filename, "wb") as f:
            f.write(image_bytes)
            
        status = "detected" if confidence > 0.6 else "low_confidence"
            
        return DetectResponse(
            success=True,
            job_id=job_id,
            original_width=orig_w,
            original_height=orig_h,
            corners=corners,
            confidence=confidence,
            detection_status=status,
            preview_url=f"/api/v1/images/page-borders/preview/{job_id}/original"
        )
        
    except Exception as e:
        logger.error(f"Error in border detection: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze image: {str(e)}")

@page_border_router.post("/apply", response_model=ApplyResponse, summary="Apply perspective crop based on confirmed corners")
async def apply_crop_endpoint(request: ApplyRequest):
    if not request.job_id.isalnum():
        raise HTTPException(status_code=400, detail="Invalid job ID")
        
    # Find original image
    orig_path = None
    for ext in PAGE_BORDER_ALLOWED_EXTENSIONS:
        path = TEMP_PROCESSING_DIR / f"pb_orig_{request.job_id}{ext}"
        if path.exists():
            orig_path = path
            break
            
    if not orig_path:
        raise HTTPException(status_code=404, detail="Job expired or not found.")
        
    try:
        with open(orig_path, "rb") as f:
            image_bytes = f.read()
            
        processed_bytes = apply_perspective_crop(image_bytes, request.adjusted_corners)
        
        proc_filename = f"pb_proc_{request.job_id}.png" # Save as PNG to support transparency
        proc_path = TEMP_PROCESSING_DIR / proc_filename
        
        with open(proc_path, "wb") as f:
            f.write(processed_bytes)
            
        return ApplyResponse(
            success=True,
            preview_url=f"/api/v1/images/page-borders/preview/{request.job_id}/processed",
            job_id=request.job_id
        )
    except Exception as e:
        logger.error(f"Error applying crop: {e}")
        raise HTTPException(status_code=500, detail="Failed to apply crop.")

@page_border_router.post("/batch-apply", response_model=BatchApplyResponse, summary="Apply multiple crops and generate ZIP")
async def batch_apply_endpoint(request: BatchApplyRequest):
    if not request.jobs:
        raise HTTPException(status_code=400, detail="No jobs provided")
        
    zip_job_id = uuid.uuid4().hex
    zip_filename = f"cropped_pages_{zip_job_id}.zip"
    zip_path = TEMP_PROCESSING_DIR / zip_filename
    
    added_files = 0
    
    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for idx, job in enumerate(request.jobs):
                if not job.job_id.isalnum(): continue
                
                orig_path = None
                for ext in PAGE_BORDER_ALLOWED_EXTENSIONS:
                    path = TEMP_PROCESSING_DIR / f"pb_orig_{job.job_id}{ext}"
                    if path.exists():
                        orig_path = path
                        break
                
                if orig_path:
                    with open(orig_path, "rb") as f:
                        image_bytes = f.read()
                    try:
                        processed_bytes = apply_perspective_crop(image_bytes, job.adjusted_corners)
                        # Save directly into ZIP, no need for temp disk save of processed image
                        zipf.writestr(f"cropped_page_{idx+1}.png", processed_bytes)
                        added_files += 1
                    except Exception as e:
                        logger.error(f"Failed batch crop for {job.job_id}: {e}")
                        
        if added_files == 0:
            raise HTTPException(status_code=400, detail="Failed to crop any images.")
            
        return BatchApplyResponse(download_url=f"/api/v1/images/page-borders/download/{zip_filename}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch zip error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate ZIP.")

@page_border_router.get("/preview/{job_id}/{type}", summary="Securely fetch job images")
async def preview_image_endpoint(job_id: str, type: str):
    if not job_id.isalnum() or type not in ["original", "processed"]:
        raise HTTPException(status_code=400, detail="Invalid request")
        
    if type == "original":
        for ext in PAGE_BORDER_ALLOWED_EXTENSIONS:
            path = TEMP_PROCESSING_DIR / f"pb_orig_{job_id}{ext}"
            if path.exists(): return FileResponse(path)
    else:
        path = TEMP_PROCESSING_DIR / f"pb_proc_{job_id}.png"
        if path.exists(): return FileResponse(path)
        
    raise HTTPException(status_code=404, detail="File not found")

@page_border_router.get("/download/{filename}", summary="Download result ZIP")
async def download_zip_endpoint(filename: str):
    if not filename.endswith(".zip") or ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
        
    path = TEMP_PROCESSING_DIR / filename
    if path.exists():
        return FileResponse(path, filename=filename, media_type="application/zip")
    raise HTTPException(status_code=404, detail="File not found")


# ==============================================================================
# FEATURE: Deskew
# ==============================================================================
DESKEW_TEMP_DIR = Path("temp_processing/deskew")
DESKEW_TEMP_DIR.mkdir(parents=True, exist_ok=True)

DESKEW_DESKEW_MAX_FILE_SIZE_MB = 15

def get_deskew_job_dir(job_id: str) -> Path:
    return DESKEW_TEMP_DIR / job_id

def cleanup_deskew_job(job_id: str):
    job_dir = get_deskew_job_dir(job_id)
    if job_dir.exists():
        shutil.rmtree(job_dir, ignore_errors=True)

@deskew_router.post("/detect", response_model=DeskewDetectResponse)
async def detect_deskew_route(
    request: Request,
    file: UploadFile = File(...)
):
    try:
        content = await file.read()
        
        if len(content) > DESKEW_DESKEW_MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {DESKEW_DESKEW_MAX_FILE_SIZE_MB}MB.")
            
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use JPG, PNG, or WebP.")
            
        # Detect skew
        try:
            angle, confidence, status, w, h = detect_skew(content)
        except Exception as e:
            logger.error(f"Skew detection failed: {str(e)}")
            angle, confidence, status = 0.0, 0.0, "detection_failed"
            
        job_id = str(uuid.uuid4())
        job_dir = get_deskew_job_dir(job_id)
        job_dir.mkdir(parents=True, exist_ok=True)
        
        original_path = job_dir / f"original{ext}"
        with open(original_path, "wb") as f:
            f.write(content)
            
        deskewed_preview_url = None
        if status in ["detected", "low_confidence"]:
            # Generate the preview immediately
            try:
                preview_bytes = apply_deskew(content, angle, file_ext=ext)
                preview_path = job_dir / f"preview{ext}"
                with open(preview_path, "wb") as f:
                    f.write(preview_bytes)
                deskewed_preview_url = f"/api/v1/images/deskew/preview/{job_id}/preview"
            except Exception as e:
                logger.error(f"Preview generation failed: {str(e)}")
                deskewed_preview_url = None
                
        # Also save the original url
        original_url = f"/api/v1/images/deskew/preview/{job_id}/original"
        
        return DeskewDetectResponse(
            success=True,
            job_id=job_id,
            angle=angle,
            confidence=confidence,
            detection_status=status,
            original_url=original_url,
            deskewed_preview_url=deskewed_preview_url
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /detect: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during detection.")

@deskew_router.post("/apply", response_model=DeskewApplyResponse)
async def apply_deskew_route(req: DeskewApplyRequest):
    job_dir = get_deskew_job_dir(req.job_id)
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Job not found or expired.")
        
    original_files = list(job_dir.glob("original.*"))
    if not original_files:
        raise HTTPException(status_code=404, detail="Original image not found.")
        
    original_path = original_files[0]
    ext = original_path.suffix.lower()
    
    with open(original_path, "rb") as f:
        content = f.read()
        
    try:
        processed_bytes = apply_deskew(content, req.angle, file_ext=ext)
        processed_path = job_dir / f"final{ext}"
        with open(processed_path, "wb") as f:
            f.write(processed_bytes)
            
        return DeskewApplyResponse(
            success=True,
            job_id=req.job_id,
            preview_url=f"/api/v1/images/deskew/preview/{req.job_id}/final"
        )
    except Exception as e:
        logger.error(f"Error applying deskew: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to apply deskew.")

@deskew_router.post("/batch-apply", response_model=DeskewBatchResponse)
async def batch_apply_deskew_route(req: DeskewBatchRequest):
    stats = DeskewBatchStats(
        total_files=len(req.jobs),
        successful_count=0,
        no_skew_count=0,
        low_confidence_count=0,
        failed_count=0,
        failures=[]
    )
    
    batch_id = str(uuid.uuid4())
    batch_dir = TEMP_PROCESSING_DIR / f"batch_{batch_id}"
    batch_dir.mkdir(parents=True, exist_ok=True)
    
    for idx, job in enumerate(req.jobs):
        job_dir = get_deskew_job_dir(job.job_id)
        if not job_dir.exists():
            stats.failed_count += 1
            stats.failures.append(f"Job {job.job_id} expired or not found.")
            continue
            
        original_files = list(job_dir.glob("original.*"))
        if not original_files:
            stats.failed_count += 1
            stats.failures.append(f"Image missing for job {job.job_id}.")
            continue
            
        original_path = original_files[0]
        ext = original_path.suffix.lower()
        
        if abs(job.angle) < 0.1:
            stats.no_skew_count += 1
            out_filename = f"image_{idx+1}_original{ext}"
            shutil.copy2(original_path, batch_dir / out_filename)
        else:
            try:
                with open(original_path, "rb") as f:
                    content = f.read()
                processed_bytes = apply_deskew(content, job.angle, file_ext=ext)
                out_filename = f"image_{idx+1}_deskewed{ext}"
                with open(batch_dir / out_filename, "wb") as f:
                    f.write(processed_bytes)
                stats.successful_count += 1
            except Exception as e:
                stats.failed_count += 1
                stats.failures.append(f"Failed to deskew job {job.job_id}: {str(e)}")
                
    # Create ZIP
    zip_filename = f"Deskew_Batch_{int(time.time())}.zip"
    zip_path = TEMP_PROCESSING_DIR / zip_filename
    
    success = False
    download_url = None
    
    if stats.successful_count + stats.no_skew_count > 0:
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for file_path in batch_dir.glob("*"):
                zipf.write(file_path, arcname=file_path.name)
        success = True
        download_url = f"/api/v1/images/deskew/download-zip/{zip_filename}"
        
    # Cleanup batch folder
    shutil.rmtree(batch_dir, ignore_errors=True)
    
    return DeskewBatchResponse(
        success=success,
        download_url=download_url,
        stats=stats
    )

@deskew_router.get("/preview/{job_id}/{image_type}")
async def get_deskew_preview(job_id: str, image_type: str):
    if image_type not in ["original", "preview", "final"]:
        raise HTTPException(status_code=400, detail="Invalid preview type.")
        
    job_dir = get_deskew_job_dir(job_id)
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Job not found.")
        
    files = list(job_dir.glob(f"{image_type}.*"))
    if not files:
        raise HTTPException(status_code=404, detail="Image not found.")
        
    return FileResponse(files[0])

@deskew_router.get("/download-zip/{filename}")
async def download_batch_zip(filename: str, background_tasks: BackgroundTasks):
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")
        
    file_path = TEMP_PROCESSING_DIR / filename
    if not file_path.exists() or not str(file_path).endswith('.zip'):
        raise HTTPException(status_code=404, detail="File not found.")
        
    return FileResponse(
        file_path,
        media_type='application/zip',
        filename=filename
    )


# ==============================================================================
# FEATURE: DPI
# ==============================================================================
DPI_TEMP_DIR = Path("temp_processing/dpi")
DPI_TEMP_DIR.mkdir(parents=True, exist_ok=True)

def cleanup_dpi_temp_file(file_path: Path):
    try:
        if file_path.exists():
            file_path.unlink()
    except Exception as e:
        logger.error(f"Error cleaning up file {file_path}: {e}")

@dpi_router.post("/upload", response_model=DpiDetectionResponse)
async def upload_image(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename:
        return DpiDetectionResponse(success=False, job_id="", width=0, height=0, has_dpi=False, format="", format_supported=False, error="No filename provided")

    job_id = str(uuid.uuid4())
    job_dir = DPI_TEMP_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = job_dir / f"original_{file.filename}"
    
    try:
        content = await file.read()
        
        # Security: reasonable size check (e.g., 50MB)
        if len(content) > 50 * 1024 * 1024:
            return DpiDetectionResponse(success=False, job_id=job_id, width=0, height=0, has_dpi=False, format="", format_supported=False, error="File is too large.")

        with open(file_path, "wb") as f:
            f.write(content)
            
        # Detect DPI
        result = detect_dpi(content, job_id)
        
        # Cleanup original later (keep for convert process)
        # Background task could clean up if not accessed
        
        return DpiDetectionResponse(**result)

    except Exception as e:
        logger.error(f"DPI Upload error: {e}")
        return DpiDetectionResponse(success=False, job_id=job_id, width=0, height=0, has_dpi=False, format="", format_supported=False, error="Error processing image.")

@dpi_router.post("/convert", response_model=DpiConvertResponse)
async def convert_image_dpi(request: DpiConvertRequest, background_tasks: BackgroundTasks):
    job_id = request.job_id
    job_dir = DPI_TEMP_DIR / job_id
    
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Job not found or expired.")
        
    original_files = list(job_dir.glob("original_*"))
    if not original_files:
        raise HTTPException(status_code=404, detail="Original image not found.")
        
    orig_path = original_files[0]
    
    # Safe output name
    ext = orig_path.suffix
    safe_name = orig_path.stem.replace("original_", "")
    result_filename = f"{safe_name}_dpi{int(request.dpi_x)}{ext}"
    result_path = job_dir / result_filename

    try:
        with open(orig_path, "rb") as f:
            image_bytes = f.read()
            
        converted_bytes = convert_dpi(image_bytes, request.dpi_x, request.dpi_y)
        
        with open(result_path, "wb") as f:
            f.write(converted_bytes)
            
        # Verify DPI
        verify_result = detect_dpi(converted_bytes, job_id)
        
        if not verify_result["success"] or verify_result["dpi_x"] is None:
            # Revert or flag as failed
            return DpiConvertResponse(
                success=False, 
                job_id=job_id, 
                preview_url="", 
                status_message="Failed to safely write DPI for this format.",
                verified_dpi_x=None,
                verified_dpi_y=None
            )
            
        return DpiConvertResponse(
            success=True,
            job_id=job_id,
            preview_url=f"/api/v1/images/dpi/preview/{job_id}/{result_filename}?t={int(time.time())}",
            status_message="DPI successfully updated.",
            verified_dpi_x=verify_result["dpi_x"],
            verified_dpi_y=verify_result["dpi_y"]
        )

    except ValueError as ve:
        return DpiConvertResponse(success=False, job_id=job_id, preview_url="", status_message=str(ve))
    except Exception as e:
        logger.error(f"DPI conversion failed: {e}")
        return DpiConvertResponse(success=False, job_id=job_id, preview_url="", status_message="Internal processing error.")

@dpi_router.get("/preview/{job_id}/{filename}")
async def get_preview(job_id: str, filename: str):
    file_path = DPI_TEMP_DIR / job_id / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(file_path)

@dpi_router.post("/batch-convert", response_model=DpiBatchResponse)
async def batch_convert(request: DpiBatchRequest, background_tasks: BackgroundTasks):
    batch_id = str(uuid.uuid4())
    batch_dir = DPI_TEMP_DIR / f"batch_{batch_id}"
    batch_dir.mkdir(parents=True, exist_ok=True)
    
    zip_path = batch_dir / "converted_images.zip"
    failed_jobs = []
    
    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for job in request.jobs:
                job_dir = DPI_TEMP_DIR / job.job_id
                if not job_dir.exists():
                    failed_jobs.append(job.job_id)
                    continue
                    
                orig_files = list(job_dir.glob("original_*"))
                if not orig_files:
                    failed_jobs.append(job.job_id)
                    continue
                    
                orig_path = orig_files[0]
                
                try:
                    with open(orig_path, "rb") as f:
                        image_bytes = f.read()
                    
                    converted_bytes = convert_dpi(image_bytes, job.dpi_x, job.dpi_y)
                    
                    # Verify
                    verify = detect_dpi(converted_bytes, job.job_id)
                    if not verify["success"] or verify["dpi_x"] is None:
                        failed_jobs.append(job.job_id)
                        continue
                        
                    ext = orig_path.suffix
                    safe_name = orig_path.stem.replace("original_", "")
                    arcname = f"{safe_name}_dpi{int(job.dpi_x)}{ext}"
                    
                    zipf.writestr(arcname, converted_bytes)
                    
                except Exception as e:
                    logger.error(f"Batch item failed {job.job_id}: {e}")
                    failed_jobs.append(job.job_id)
                    
        if len(failed_jobs) == len(request.jobs):
             return DpiBatchResponse(success=False, download_url="", status_message="All files failed.", failed_jobs=failed_jobs)
             
        # Background task to clean up after 15 mins
        background_tasks.add_task(cleanup_dpi_batch_dir, batch_dir)
        
        return DpiBatchResponse(
            success=True,
            download_url=f"/api/v1/images/dpi/download-zip/{batch_id}?t={int(time.time())}",
            status_message="Batch processing complete.",
            failed_jobs=failed_jobs
        )
        
    except Exception as e:
        logger.error(f"Batch zip error: {e}")
        return DpiBatchResponse(success=False, download_url="", status_message="Error creating zip.", failed_jobs=[j.job_id for j in request.jobs])

@dpi_router.get("/download-zip/{batch_id}")
async def download_zip(batch_id: str):
    zip_path = DPI_TEMP_DIR / f"batch_{batch_id}" / "converted_images.zip"
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="ZIP file not found or expired.")
    
    return FileResponse(
        zip_path, 
        media_type="application/zip", 
        filename="converted_dpi_images.zip"
    )

def cleanup_dpi_batch_dir(batch_dir: Path):
    time.sleep(900)  # 15 minutes
    try:
        if batch_dir.exists():
            shutil.rmtree(batch_dir)
    except Exception as e:
        logger.error(f"Cleanup error for {batch_dir}: {e}")


# ==============================================================================
# FEATURE: Replace
# ==============================================================================
class ReplaceImageTarget(BaseModel):
    xref: Optional[int] = None
    width: int
    height: int
    
def is_replace_image_supported(img_info: dict) -> bool:
    """Check if the PDF image object is safely replaceable."""
    if img_info.get("has-mask") or img_info.get("has-smask"):
        return False
    cs = img_info.get("colorspace", 0)
    # 1: Gray, 3: RGB, 4: CMYK
    if cs not in (1, 3, 4):
        return False
    return True

@replace_router.post("/detect", summary="Detect images in PDF or validate image")
async def detect_images(file: UploadFile = File(...)):
    """
    Parses a PDF to extract pages and detect replaceable images.
    If the file is an image, it validates it and returns a simple image project context.
    """
    input_path = await save_upload_file_tmp(file, directory=TEMP_PROCESSING_DIR)
    os.makedirs(TEMP_PROCESSING_DIR, exist_ok=True)
    
    try:
        filename_lower = file.filename.lower() if file.filename else ""
        is_image = file.content_type.startswith("image/") or any(filename_lower.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"])
        is_pdf = file.content_type == "application/pdf" or filename_lower.endswith(".pdf")

        if is_image:
            try:
                with Image.open(input_path) as img:
                    img.verify()
                
                project_id = uuid.uuid4().hex[:8]
                preview_filename = f"replace_preview_{project_id}{input_path.suffix}"
                preview_path = TEMP_PROCESSING_DIR / preview_filename

                shutil.copy2(input_path, preview_path)
                
                with Image.open(preview_path) as img:
                    width, height = img.size
                    
                return JSONResponse({
                    "type": "image",
                    "original_filename": file.filename,
                    "preview_url": f"/temp/{preview_filename}",
                    "width": width,
                    "height": height
                })
            except Exception as e:
                raise ValueError(f"Invalid image file: {e}")
                
        elif is_pdf:
            doc = fitz.open(str(input_path))
            
            project_id = uuid.uuid4().hex[:8]
            pages_data = []
            extracted_images = {}
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # Render page to thumbnail for preview
                pix = page.get_pixmap(dpi=150)
                page_filename = f"replace_page_{project_id}_{page_num}.jpg"
                page_path = TEMP_PROCESSING_DIR / page_filename
                pix.save(str(page_path))
                
                images_on_page = page.get_image_info(xrefs=True)
                page_images_data = []
                
                for img_info in images_on_page:
                    xref = img_info.get("xref")
                    if not xref:
                        continue
                        
                    supported = is_replace_image_supported(img_info)
                    bbox = img_info.get("bbox")
                    
                    if xref not in extracted_images:
                        extracted_images[xref] = {
                            "xref": xref,
                            "width": img_info.get("width"),
                            "height": img_info.get("height"),
                            "supported": supported,
                            "pages": [page_num],
                            "bboxes": {page_num: bbox}
                        }
                    else:
                        if page_num not in extracted_images[xref]["pages"]:
                            extracted_images[xref]["pages"].append(page_num)
                        extracted_images[xref]["bboxes"][page_num] = bbox
                        
                    page_images_data.append({
                        "xref": xref,
                        "bbox": bbox,
                        "supported": supported
                    })
                    
                pages_data.append({
                    "page_num": page_num,
                    "page_url": f"/temp/{page_filename}",
                    "width": page.rect.width,
                    "height": page.rect.height,
                    "images": page_images_data
                })
                
            doc.close()
            
            images_list = []
            for xref, data in extracted_images.items():
                images_list.append({
                    "xref": xref,
                    "width": data["width"],
                    "height": data["height"],
                    "supported": data["supported"],
                    "pages": data["pages"],
                    "bboxes": data["bboxes"],
                    "duplicate_count": len(data["pages"])
                })
                
            return JSONResponse({
                "type": "pdf",
                "original_filename": file.filename,
                "pages": pages_data,
                "images": images_list,
                "temp_pdf_name": input_path.name
            })
            
        else:
            raise ValueError("Unsupported file format. Please upload a PDF or an Image.")
            
    except ValueError as ve:
        delete_file(input_path)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        delete_file(input_path)
        logger.error(f"Error detecting images: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@replace_router.post("/apply", summary="Apply image replacement")
async def apply_replacement(
    original_file: Optional[UploadFile] = File(None),
    temp_pdf_name: Optional[str] = Form(None),
    replacement_file: UploadFile = File(...),
    target_data: str = Form(...)
):
    try:
        target = ReplaceImageTarget(**json.loads(target_data))
        
        repl_path = await save_upload_file_tmp(replacement_file, directory=TEMP_PROCESSING_DIR)
        
        try:
            with Image.open(repl_path) as repl_img:
                if repl_img.mode != 'RGB':
                    repl_img = repl_img.convert('RGB')
                
                # Intelligent Fit: Pad to aspect ratio instead of cropping
                # Padding uses white color by default for JPEG insertion in PDF
                fitted_img = ImageOps.pad(repl_img, (target.width, target.height), method=Image.Resampling.LANCZOS, color=(255, 255, 255))
                
                img_byte_arr = io.BytesIO()
                fitted_img.save(img_byte_arr, format='JPEG', quality=95)
                new_image_bytes = img_byte_arr.getvalue()
        except Exception as e:
            delete_file(repl_path)
            raise ValueError(f"Invalid replacement image: {e}")
            
        delete_file(repl_path)
        
        if target.xref is not None and temp_pdf_name:
            # PDF Workflow
            pdf_path = TEMP_PROCESSING_DIR / temp_pdf_name
            if not pdf_path.exists():
                raise ValueError("Original PDF session expired. Please upload again.")
                
            try:
                doc = fitz.open(str(pdf_path))
                
                doc.update_stream(target.xref, new_image_bytes)
                doc.xref_set_key(target.xref, "Width", str(target.width))
                doc.xref_set_key(target.xref, "Height", str(target.height))
                doc.xref_set_key(target.xref, "ColorSpace", "/DeviceRGB")
                doc.xref_set_key(target.xref, "BitsPerComponent", "8")
                doc.xref_set_key(target.xref, "Filter", "/DCTDecode")
                
                try:
                    doc.xref_set_key(target.xref, "SMask", "null")
                except: pass
                try:
                    doc.xref_set_key(target.xref, "Mask", "null")
                except: pass
                
                output_filename = f"replaced_{uuid.uuid4().hex[:8]}.pdf"
                output_path = TEMP_PROCESSING_DIR / output_filename
                
                doc.save(str(output_path), garbage=3, deflate=True)
                doc.close()
                
                # Integrity Check
                try:
                    test_doc = fitz.open(str(output_path))
                    test_doc.close()
                except Exception as e:
                    delete_file(output_path)
                    raise ValueError(f"Generated PDF failed integrity check: {e}")
                
                return FileResponse(
                    path=output_path,
                    media_type="application/pdf",
                    filename=f"updated_document.pdf"
                )
                
            except Exception as e:
                logger.error(f"PDF Replacement failed: {e}")
                raise ValueError(f"Failed to replace PDF image: {e}")
                
        elif original_file:
            orig_path = await save_upload_file_tmp(original_file, directory=TEMP_PROCESSING_DIR)
            output_filename = f"replaced_{original_file.filename}"
            output_path = TEMP_PROCESSING_DIR / output_filename
            
            try:
                with Image.open(io.BytesIO(new_image_bytes)) as final_img:
                    final_img.save(output_path, format="JPEG", quality=95)
                    
                delete_file(orig_path)
                return FileResponse(
                    path=output_path,
                    media_type="image/jpeg",
                    filename=output_filename
                )
            except Exception as e:
                delete_file(orig_path)
                raise ValueError(f"Failed to process image replacement: {e}")
                
        else:
            raise ValueError("Missing original target file data.")
            
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Unexpected error in apply replacement: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ==============================================================================
# FEATURE: Scan
# ==============================================================================
SCAN_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
SCAN_MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB

def validate_scan_image_file(file: UploadFile):
    ext = Path(file.filename).suffix.lower()
    if ext not in SCAN_ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Supported types: {', '.join(SCAN_ALLOWED_EXTENSIONS)}")


@scan_router.post("/process", response_model=ScanProcessResponse, summary="Process a single document scan")
async def process_scan_endpoint(file: UploadFile = File(...), rotation_angle: int = Form(0)):
    validate_scan_image_file(file)
    
    try:
        # Read and process image in memory
        image_bytes = await file.read()
        if len(image_bytes) > SCAN_MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"File too large.")
            
        processed_bytes, is_detected = process_scan(image_bytes, rotation_angle)
        
        # Save both original and processed to temp to allow preview
        job_id = uuid.uuid4().hex
        
        orig_ext = Path(file.filename).suffix.lower() or ".jpg"
        orig_filename = f"scan_orig_{job_id}{orig_ext}"
        processed_filename = f"scan_proc_{job_id}.jpg" # always save as jpg from processor
        
        orig_path = TEMP_PROCESSING_DIR / orig_filename
        proc_path = TEMP_PROCESSING_DIR / processed_filename
        
        with open(orig_path, "wb") as f:
            f.write(image_bytes)
            
        with open(proc_path, "wb") as f:
            f.write(processed_bytes)
            
        return ScanProcessResponse(
            success=True,
            job_id=job_id,
            original_filename=file.filename,
            preview_url=f"/temp/{processed_filename}",
            original_url=f"/temp/{orig_filename}",
            status="success" if is_detected else "warning",
            message="Document detected and enhanced successfully." if is_detected else "Document boundaries not detected clearly. Image enhanced only."
        )
            
    except Exception as e:
        logger.error(f"Error processing scan: {e}")
        raise HTTPException(status_code=500, detail="Failed to process image.")

@scan_router.post("/process-batch", summary="Batch process multiple document scans")
async def process_batch_endpoint(files: List[UploadFile] = File(...)):
    results = []
    
    for file in files:
        try:
            validate_scan_image_file(file)
            image_bytes = await file.read()
            
            if len(image_bytes) > SCAN_MAX_FILE_SIZE:
                results.append({"filename": file.filename, "success": False, "message": "File too large"})
                continue
                
            processed_bytes, is_detected = process_scan(image_bytes)
            
            job_id = uuid.uuid4().hex
            orig_ext = Path(file.filename).suffix.lower() or ".jpg"
            orig_filename = f"scan_orig_{job_id}{orig_ext}"
            processed_filename = f"scan_proc_{job_id}.jpg"
            
            with open(TEMP_PROCESSING_DIR / orig_filename, "wb") as f:
                f.write(image_bytes)
            with open(TEMP_PROCESSING_DIR / processed_filename, "wb") as f:
                f.write(processed_bytes)
                
            results.append({
                "filename": file.filename,
                "success": True,
                "job_id": job_id,
                "preview_url": f"/temp/{processed_filename}",
                "original_url": f"/temp/{orig_filename}",
                "status": "success" if is_detected else "warning",
                "message": "Detected" if is_detected else "Not fully detected"
            })
        except Exception as e:
            logger.error(f"Error processing {file.filename}: {e}")
            results.append({"filename": file.filename, "success": False, "message": str(e)})
            
    return {"results": results}

@scan_router.post("/generate-pdf", summary="Generate multi-page PDF from processed scans")
async def generate_pdf_endpoint(request: GeneratePdfRequest):
    if not request.job_ids:
        raise HTTPException(status_code=400, detail="No job IDs provided.")
        
    image_paths = []
    for job_id in request.job_ids:
        # Secure job ID validation
        if not job_id.isalnum():
            continue
        
        proc_path = TEMP_PROCESSING_DIR / f"scan_proc_{job_id}.jpg"
        if proc_path.exists() and proc_path.is_file():
            image_paths.append(proc_path)
            
    if not image_paths:
        raise HTTPException(status_code=404, detail="No valid processed images found.")
        
    pdf_job_id = uuid.uuid4().hex
    output_pdf_path = TEMP_PROCESSING_DIR / f"scanned_document_{pdf_job_id}.pdf"
    
    try:
        generate_multipage_pdf(image_paths, output_pdf_path)
        return {"download_url": f"/temp/{output_pdf_path.name}"}
    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF.")

@scan_router.post("/generate-zip", summary="Generate ZIP file of processed scans")
async def generate_zip_endpoint(request: GenerateZipRequest):
    if not request.job_ids:
        raise HTTPException(status_code=400, detail="No job IDs provided.")
        
    zip_job_id = uuid.uuid4().hex
    zip_filename = f"scanned_documents_{zip_job_id}.zip"
    zip_path = TEMP_PROCESSING_DIR / zip_filename
    
    added_files = 0
    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for idx, job_id in enumerate(request.job_ids):
                # Secure validation
                if not job_id.isalnum():
                    continue
                    
                proc_path = TEMP_PROCESSING_DIR / f"scan_proc_{job_id}.jpg"
                if proc_path.exists() and proc_path.is_file():
                    # Add to zip with a safe, sequential name
                    zipf.write(proc_path, arcname=f"scanned_page_{idx+1:03d}.jpg")
                    added_files += 1
                    
        if added_files == 0:
            raise HTTPException(status_code=404, detail="No valid processed images found.")
            
        return {"download_url": f"/temp/{zip_filename}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ZIP generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate ZIP.")


# ==============================================================================
# Sub-router Registrations
# ==============================================================================
router.include_router(page_border_router, prefix="/page-borders")
router.include_router(page_border_router, prefix="/auto-detect-borders")
router.include_router(deskew_router, prefix="/deskew")
router.include_router(deskew_router, prefix="/deskew-images")
router.include_router(dpi_router, prefix="/dpi")
router.include_router(dpi_router, prefix="/dpi-converter")