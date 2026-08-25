import os
import json
import uuid
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import UploadFile

from app.core.paths import get_upload_path, get_output_path, get_annotation_path, TEMP_PROCESSING_DIR

logger = logging.getLogger(__name__)

# --- Review & Annotation Utilities ---

async def save_uploaded_file(file: UploadFile, destination: Path) -> int:
    """Save an UploadFile object (which has async read)."""
    size = 0
    with open(destination, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            buffer.write(chunk)
    return size

def read_annotations_file(document_id: str) -> List[Dict[str, Any]]:
    """Read annotations from JSON file."""
    path = get_annotation_path(document_id)
    if not path.exists():
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def write_annotations_file(document_id: str, annotations: List[Dict[str, Any]]) -> bool:
    """Write annotations to JSON file."""
    path = get_annotation_path(document_id)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(annotations, f, indent=2)
        return True
    except Exception:
        return False


# --- Standard Upload Utility ---

async def save_upload(file_obj, destination: Path) -> None:
    """Save a synchronous file-like object (like UploadFile.file) to destination."""
    with open(destination, "wb") as buffer:
        while chunk := file_obj.read(1024 * 1024):
            buffer.write(chunk)


# --- Image Processing Utilities ---

async def save_upload_file_tmp(upload_file: UploadFile, directory: Path = TEMP_PROCESSING_DIR) -> Path:
    """
    Save an uploaded file to a temporary directory with a unique safe name.
    """
    try:
        ext = Path(upload_file.filename).suffix if upload_file.filename else ""
        safe_filename = f"{uuid.uuid4()}{ext}"
        
        file_path = directory / safe_filename
        
        # Ensure the directory exists
        os.makedirs(directory, exist_ok=True)
        
        with open(file_path, "wb") as buffer:
            while chunk := await upload_file.read(1024 * 1024):  # 1MB chunks
                buffer.write(chunk)
                
        logger.debug(f"Saved uploaded file to {file_path}")
        return file_path
        
    except Exception as e:
        logger.error(f"Error saving upload file: {e}")
        raise
    finally:
        await upload_file.seek(0)


# --- File Size Utility ---

def file_size(file_path: str | Path) -> int:
    """
    Get size of a file in bytes.
    """
    return Path(file_path).stat().st_size
