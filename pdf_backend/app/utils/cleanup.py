import time
import asyncio
import shutil
import logging
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger("pdf_backend")

# --- Standard PDF Cleanup Utilities ---

def clean_old_temp_files(max_age_seconds: int = 3600 * 24):
    """Purge temporary files older than max_age_seconds."""
    now = time.time()
    dirs = [settings.UPLOAD_DIR, settings.OUTPUT_DIR, settings.ANNOTATION_DIR]
    for directory in dirs:
        # Convert config setting path strings to Path objects
        dir_path = Path(directory)
        if not dir_path.exists():
            continue
        for item in dir_path.iterdir():
            if item.is_file():
                try:
                    if now - item.stat().st_mtime > max_age_seconds:
                        item.unlink()
                        logger.info(f"Cleaned old temp file: {item.name}")
                except Exception as e:
                    logger.warning(f"Failed to delete temp file {item}: {e}")

async def cleanup_loop() -> None:
    """Async background task that runs clean_old_temp_files periodically."""
    while True:
        try:
            clean_old_temp_files()
        except Exception as e:
            logger.warning(f"Error in cleanup loop: {e}")
        await asyncio.sleep(settings.CLEANUP_INTERVAL_SECONDS if hasattr(settings, 'CLEANUP_INTERVAL_SECONDS') else 3600)


# --- Image Processing Cleanup Utilities ---

def delete_file(file_path: str | Path) -> bool:
    """Safely delete a single file."""
    try:
        path = Path(file_path)
        if path.exists() and path.is_file():
            path.unlink()
            logger.debug(f"Deleted file: {path}")
            return True
    except Exception as e:
        logger.error(f"Failed to delete file {file_path}: {e}")
    return False

def cleanup_directory(directory_path: str | Path, delete_root: bool = False) -> bool:
    """
    Clean up contents of a directory.
    If delete_root is True, the directory itself is also removed.
    """
    try:
        path = Path(directory_path)
        if path.exists() and path.is_dir():
            for item in path.iterdir():
                if item.is_file() or item.is_symlink():
                    item.unlink()
                elif item.is_dir():
                    shutil.rmtree(item)
                    
            if delete_root:
                path.rmdir()
                
            logger.debug(f"Cleaned up directory: {path}")
            return True
    except Exception as e:
        logger.error(f"Failed to clean up directory {directory_path}: {e}")
    return False
