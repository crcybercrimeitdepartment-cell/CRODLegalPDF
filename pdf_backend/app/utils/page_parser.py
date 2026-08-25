"""
Page range string parser.

Converts user-supplied page strings like "1,3,5-8" into
validated integer lists (1-indexed).
"""

from __future__ import annotations

from typing import List, Set, Tuple, Dict

from app.core.constants import (
    MAX_PAGE_LIMIT,
    PAGE_LIST_SEPARATOR,
    PAGE_RANGE_SEPARATOR,
)


def parse_page_range(
    page_string: str,
    total_pages: int,
) -> List[int]:
    """
    Parse a page string into sorted unique 1-indexed page numbers.

    Supported formats:
        "1,3,5"      -> [1, 3, 5]
        "1-5"        -> [1, 2, 3, 4, 5]
        "1,3,5-8,10" -> [1, 3, 5, 6, 7, 8, 10]

    Raises:
        ValueError: If any page is out of range or format is invalid.
    """
    if not page_string or not page_string.strip():
        raise ValueError("Page string cannot be empty.")

    selected: Set[int] = set()
    tokens = page_string.split(PAGE_LIST_SEPARATOR)

    for token in tokens:
        token = token.strip()
        if not token:
            continue

        if PAGE_RANGE_SEPARATOR in token:
            parts = token.split(PAGE_RANGE_SEPARATOR)
            if len(parts) != 2:
                raise ValueError(f"Invalid page range: {token}")

            try:
                start = int(parts[0].strip())
                end = int(parts[1].strip())
            except ValueError:
                raise ValueError(f"Non-numeric page range: {token}")

            if start > end:
                raise ValueError(
                    f"Invalid range: start ({start}) > end ({end})."
                )

            if start < 1 or end > total_pages:
                raise ValueError(
                    f"Range {token} is outside bounds (1-{total_pages})."
                )

            for page in range(start, end + 1):
                selected.add(page)
        else:
            try:
                page = int(token)
            except ValueError:
                raise ValueError(f"Non-numeric page: {token}")

            if page < 1 or page > total_pages:
                raise ValueError(
                    f"Page {page} is outside bounds (1-{total_pages})."
                )

            selected.add(page)

    if not selected:
        raise ValueError("No valid pages specified.")

    result = sorted(selected)

    if len(result) > MAX_PAGE_LIMIT:
        raise ValueError(
            f"Too many pages requested ({len(result)}). Limit: {MAX_PAGE_LIMIT}."
        )

    return result


def pages_to_remove(
    page_string: str,
    total_pages: int,
) -> Tuple[List[int], List[int]]:
    """
    Parse pages to remove and return (remove_indexes, keep_indexes).

    Returns 0-indexed lists for direct use with PdfReader.
    """
    pages_1indexed = parse_page_range(page_string, total_pages)
    remove_indexes = [p - 1 for p in pages_1indexed]
    keep_indexes = [
        i for i in range(total_pages) if i not in set(remove_indexes)
    ]
    return remove_indexes, keep_indexes


def pages_to_extract(
    page_string: str,
    total_pages: int,
) -> List[int]:
    """
    Parse pages to extract and return 0-indexed list.
    """
    pages_1indexed = parse_page_range(page_string, total_pages)
    return [p - 1 for p in pages_1indexed]


def extract_pdf_metadata(pdf_path: Path) -> List[Dict[str, float]]:
    """Extract page count and point dimensions for each page in the PDF using PyMuPDF."""
    import fitz  # PyMuPDF
    from pathlib import Path
    pages_info = []
    doc = fitz.open(str(pdf_path))
    try:
        if doc.is_encrypted:
            raise ValueError("The PDF file is encrypted/password-protected. Please upload an unencrypted PDF.")
        for page in doc:
            rect = page.rect
            pages_info.append({
                "page": page.number + 1,
                "width": float(rect.width),
                "height": float(rect.height),
                "rotation": int(page.rotation)
            })
    finally:
        doc.close()
    return pages_info
