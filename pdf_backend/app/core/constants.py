"""
Application-wide immutable constants.

These values are intentionally centralized to avoid hardcoded literals
throughout the codebase.

Environment-specific configuration belongs in config.py.
"""

from __future__ import annotations

from typing import Final

# ==========================================================
# API INFORMATION
# ==========================================================

API_TITLE: Final[str] = "PDF Backend API"
API_VERSION: Final[str] = "1.0.0"
API_DESCRIPTION: Final[str] = (
    "Production-ready FastAPI backend for PDF processing."
)

# ==========================================================
# APPLICATION
# ==========================================================

# ==========================================================
# FILE LIMITS
# ==========================================================

MAX_UPLOAD_FILES: Final[int] = 20

MAX_FILE_SIZE_MB: Final[int] = 100

BYTES_IN_MB: Final[int] = 1024 * 1024

MAX_FILE_SIZE_BYTES: Final[int] = (
    MAX_FILE_SIZE_MB * BYTES_IN_MB
)

# ==========================================================
# PDF LIMITS
# ==========================================================

MIN_PAGE_NUMBER: Final[int] = 1

MAX_PAGE_LIMIT: Final[int] = 10000

# ==========================================================
# BUFFER
# ==========================================================

FILE_STREAM_CHUNK_SIZE: Final[int] = 1024 * 1024

# ==========================================================
# CLEANUP
# ==========================================================

# ==========================================================
# FILENAME
# ==========================================================

DEFAULT_OUTPUT_NAME: Final[str] = "document"

MERGED_OUTPUT_NAME: Final[str] = "merged.pdf"

SPLIT_OUTPUT_PREFIX: Final[str] = "page"

EXTRACT_OUTPUT_PREFIX: Final[str] = "extract"

COMPRESSED_OUTPUT_PREFIX: Final[str] = "compressed"

REMOVED_OUTPUT_PREFIX: Final[str] = "removed"

FLATTEN_OUTPUT_PREFIX: Final[str] = "flattened"

# ==========================================================
# CONTENT TYPES
# ==========================================================

PDF_CONTENT_TYPE: Final[str] = "application/pdf"

ALLOWED_CONTENT_TYPES: Final[set[str]] = {
    "application/pdf",
}

# ==========================================================
# EXTENSIONS
# ==========================================================

PDF_EXTENSION: Final[str] = ".pdf"

ALLOWED_EXTENSIONS: Final[set[str]] = {
    ".pdf",
}

# ==========================================================
# RESPONSE STATUS
# ==========================================================

STATUS_SUCCESS: Final[str] = "success"

STATUS_ERROR: Final[str] = "error"

# ==========================================================
# HTTP HEADERS
# ==========================================================

REQUEST_ID_HEADER: Final[str] = "X-Request-ID"

PROCESS_TIME_HEADER: Final[str] = "X-Process-Time"

# ==========================================================
# PDF WRITER
# ==========================================================

PDF_METADATA_CREATOR: Final[str] = "FastAPI"

# ==========================================================
# DEFAULT ZIP NAME
# ==========================================================

DEFAULT_ZIP_NAME: Final[str] = "pdf_output.zip"

# ==========================================================
# PAGE RANGE
# ==========================================================

PAGE_RANGE_SEPARATOR: Final[str] = "-"

PAGE_LIST_SEPARATOR: Final[str] = ","

# ==========================================================
# SAFE CHARACTERS
# ==========================================================

SAFE_FILENAME_CHARACTERS: Final[str] = (
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "0123456789"
    "._- "
)