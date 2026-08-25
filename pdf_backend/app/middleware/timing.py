"""
Middleware to measure and expose request processing time.

Adds ``X-Process-Time`` header to every response.
"""

from __future__ import annotations

import time

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.constants import PROCESS_TIME_HEADER


class TimingMiddleware(BaseHTTPMiddleware):
    """Measure and expose request processing time."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = time.perf_counter() - start
        response.headers[PROCESS_TIME_HEADER] = f"{elapsed:.4f}"
        return response
