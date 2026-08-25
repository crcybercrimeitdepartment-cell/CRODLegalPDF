"""
Global exception handler for unhandled errors.

Catches any exception that bubbles up to FastAPI and returns a
consistent JSON error response instead of a 500 HTML page.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def register_exception_handler(app: FastAPI) -> None:
    """Register the global exception handler on the app."""
    from app.organize_pdf_services.rich_media_service import RichMediaError

    @app.exception_handler(RichMediaError)
    async def rich_media_exception_handler(
        request: Request, exc: RichMediaError
    ) -> JSONResponse:
        request_id: Optional[str] = getattr(
            request.state, "request_id", None
        )
        logger.warning(
            "RichMedia exception [request_id=%s, code=%s]: %s",
            request_id, exc.code, exc
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "status": "error",
                "message": str(exc),
                "code": exc.code,
                "request_id": request_id,
            },
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        request_id: Optional[str] = getattr(
            request.state, "request_id", None
        )

        logger.exception(
            "Unhandled exception [request_id=%s]: %s", request_id, exc
        )

        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": "An internal server error occurred.",
                "error": str(exc),
                "request_id": request_id,
            },
        )
