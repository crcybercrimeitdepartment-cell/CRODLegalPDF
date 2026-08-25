"""
Input validation helpers for uploaded PDF files and request parameters.
"""

from __future__ import annotations

from pathlib import Path

from app.core.constants import (
    ALLOWED_CONTENT_TYPES,
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE_BYTES,
)


def validate_pdf_extension(filename: str) -> bool:
    """Return True if filename has a allowed extension."""
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def validate_pdf_content_type(content_type: str) -> bool:
    """Return True if content type is allowed."""
    return content_type in ALLOWED_CONTENT_TYPES


def validate_file_size(file_size: int, max_size_bytes: int | None = None) -> bool:
    """Return True if file size is within limit."""
    limit = max_size_bytes if max_size_bytes is not None else MAX_FILE_SIZE_BYTES
    return 0 < file_size <= limit


def validate_safe_url(url: str) -> bool:
    """
    Validates a URL to prevent SSRF vulnerabilities.
    Only allows http/https schemes.
    Blocks localhost, 127.0.0.x, and private IP ranges.
    """
    import urllib.parse
    import ipaddress
    import socket

    if not url:
        return False

    try:
        parsed = urllib.parse.urlparse(url)
        
        # Scheme check
        if parsed.scheme not in ("http", "https"):
            return False

        hostname = parsed.hostname
        if not hostname:
            return False

        # Basic string checks for localhost
        if hostname.lower() in ("localhost", "local", "broadcasthost"):
            return False

        # Resolve IP to check for internal/private addresses
        try:
            ip = socket.gethostbyname(hostname)
            ip_obj = ipaddress.ip_address(ip)
            
            # Block private, loopback, link-local, multicast, etc.
            if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_multicast:
                return False
                
        except (socket.gaierror, ValueError):
            # If we can't resolve it, we can still allow it, the browser engine will fail gracefully
            # Or we can choose to reject. Let's allow unresolved hostnames to pass to playwright,
            # as long as they don't look like internal IPs.
            pass

        return True

    except Exception:
        return False


def validate_pdf_upload(file) -> None:
    from fastapi import HTTPException
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")
    
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    if file.content_type and file.content_type.lower() not in ["application/pdf", "application/x-pdf", "application/acrobat"]:
        raise HTTPException(status_code=400, detail="Invalid MIME type. Must be a valid PDF.")


# Compatibility utilities for Image Processing services
from typing import List

def validate_file_extension(filename: str, allowed_extensions: List[str]) -> bool:
    """
    Validate if the filename has an allowed extension.
    allowed_extensions should include the dot, e.g., ['.jpg', '.png']
    """
    if not filename:
        return False
        
    # Convert to lowercase for case-insensitive comparison
    allowed = [ext.lower() for ext in allowed_extensions]
    
    for ext in allowed:
        if filename.lower().endswith(ext):
            return True
            
    return False


