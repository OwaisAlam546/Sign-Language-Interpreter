# ─────────────────────────────────────────────────────────────
#  logging.py — Logging setup + request logging
#  Console logging only (the process supervisor / Docker captures stdout).
#  A small ASGI middleware logs every request with its latency,
#  mirroring the gateway's morgan-style access log.
#  ─────────────────────────────────────────────────────────────
import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

_REQUEST_LOGGER = logging.getLogger('access')


def setup_logging(level: str = 'INFO') -> None:
    """Idempotent console logging config: ONE handler on the root logger,
    children propagate into it (no double prints)."""
    fmt = logging.Formatter(
        fmt='%(asctime)s %(levelname)-7s %(name)s — %(message)s',
        datefmt='%Y-%m-%dT%H:%M:%S',
    )
    root = logging.getLogger()
    if not root.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(fmt)
        root.addHandler(handler)
    root.setLevel(level)
    for noisy in ('uvicorn.access', 'httpx'):
        logging.getLogger(noisy).setLevel(logging.WARNING)


class RequestLogMiddleware(BaseHTTPMiddleware):
    """Log `METHOD /path → status (duration_ms)` after each request."""

    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        _REQUEST_LOGGER.info(
            '%s %s → %s (%sms)',
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response