# ─────────────────────────────────────────────────────────────
#  routers/health.py — Liveness + service info
#  The gateway probes GET {AI_SERVICE_URL}/health to decide whether the
#  AI dependency is up (its /health/ai endpoint checks this) — so this
#  route must stay at the root, outside the /api/v1 prefix.
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

import time as _time

from fastapi import APIRouter, Request

from app.utils.envelope import ok

router = APIRouter()
_STARTED = _time.time()


@router.get('/health')
async def health(request: Request) -> dict:
    manager = request.app.state.model
    return ok({
        'status': 'ok',
        'service': 'signspeak-ai',
        'version': '0.1.0',
        'engine': manager.engine.id,
        'uptimeS': round(_time.time() - _STARTED, 1),
        'timestamp': _time.strftime('%Y-%m-%dT%H:%M:%SZ', _time.gmtime()),
    })


@router.get('/')
async def root() -> dict:
    return ok({
        'service': 'signspeak-ai',
        'message': 'SignSpeak AI inference microservice',
        'endpoints': ['/health', '/api/v1/predict',
                      '/api/v1/predict-sequence', '/api/v1/model-status',
                      '/api/v1/text-to-speech'],
    })