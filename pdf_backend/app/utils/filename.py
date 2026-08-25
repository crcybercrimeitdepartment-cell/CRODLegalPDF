"""
Safe filename generation utilities.

All output filenames pass through these helpers to guarantee
filesystem safety and consistent naming.
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone

from app.core.constants import (
    DEFAULT_OUTPUT_NAME,
    SAFE_FILENAME_CHARACTERS,
)


def generate_request_id() -> str:
    """Generate a unique request identifier."""
    return uuid.uuid4().hex[:16]


def sanitise_filename(name: str) -> str:
    """
    Strip unsafe characters from a filename.

    Only allows alphanumeric, dot, underscore, hyphen, and space.
    """
    pattern = f"[^{re.escape(SAFE_FILENAME_CHARACTERS)}]"
    cleaned = re.sub(pattern, "", name).strip()
    return cleaned if cleaned else DEFAULT_OUTPUT_NAME


def unique_filename(extension: str = ".pdf", prefix: str = "") -> str:
    """
    Generate a unique filename with given extension and optional prefix.

    Format: {prefix}_{timestamp}_{uuid8}.{ext}
    """
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    uid = uuid.uuid4().hex[:8]
    ext = extension if extension.startswith(".") else f".{extension}"

    if prefix:
        return f"{sanitise_filename(prefix)}_{ts}_{uid}{ext}"
    return f"{ts}_{uid}{ext}"


def output_filename(
    operation: str = "",
    extension: str = ".pdf",
    prefix: str = "",
) -> str:
    """Generate a filename suitable for a specific PDF operation."""
    label = prefix or operation
    return unique_filename(extension=extension, prefix=label)


def sanitize_filename(filename: str) -> str:
    # Remove path traversal characters and unsafe symbols
    import os
    clean_name = os.path.basename(filename)
    clean_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', clean_name)
    if not clean_name:
        import uuid
        clean_name = f"document_{uuid.uuid4().hex[:8]}.pdf"
    return clean_name


def generate_document_id() -> str:
    import uuid
    return f"doc_{uuid.uuid4().hex[:12]}"
