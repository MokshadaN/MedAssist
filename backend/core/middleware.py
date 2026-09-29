"""
Custom FastAPI middleware for production observability.

Provides:
  - RequestIDMiddleware:  Assigns a unique X-Request-ID to every request,
                          injects it into log context, and echoes it in the response.
  - RequestTimingMiddleware: Logs request method, path, status, and duration in ms.
"""

import logging
import time
import uuid

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

logger = logging.getLogger("medassist.http")


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Assigns a unique request ID to each incoming request.

    Priority:
      1. Use the X-Request-ID header if the client/proxy sends one.
      2. Otherwise, generate a new UUID4.

    The ID is:
      - Added to the request state (accessible in route handlers)
      - Echoed back in the X-Request-ID response header
      - Used to correlate log lines for a single request
    """

    def __init__(self, app: ASGIApp, header_name: str = "X-Request-ID") -> None:
        super().__init__(app)
        self.header_name = header_name

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Reuse incoming ID (from reverse proxy / client) or mint a new one
        request_id = request.headers.get(self.header_name) or str(uuid.uuid4())
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers[self.header_name] = request_id
        return response


class RequestTimingMiddleware(BaseHTTPMiddleware):
    """
    Logs every HTTP request with: method, path, status code, duration (ms),
    and request ID. Skips health check and metrics endpoints to reduce log spam.

    Example log line (JSON in production):
      {"level": "INFO", "method": "POST", "path": "/api/v1/chat/sessions",
       "status": 200, "duration_ms": 142, "request_id": "abc-123"}
    """

    _SKIP_PATHS = {"/health", "/health/detailed", "/", "/favicon.ico"}

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.path in self._SKIP_PATHS:
            return await call_next(request)

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)

        request_id = getattr(request.state, "request_id", "-")

        # Choose log level based on status code
        status = response.status_code
        if status >= 500:
            log_fn = logger.error
        elif status >= 400:
            log_fn = logger.warning
        else:
            log_fn = logger.info

        log_fn(
            "%s %s → %d  %.1fms  [%s]",
            request.method,
            request.url.path,
            status,
            duration_ms,
            request_id,
            extra={
                "http_method": request.method,
                "http_path": request.url.path,
                "http_status": status,
                "duration_ms": duration_ms,
                "request_id": request_id,
            },
        )

        return response
