# ─────────────────────────────────────────────────────────────
#  routers/model_status.py — GET /api/v1/model-status
#  Tells the gateway whether the AI service is running real inference
#  or the fallback recognizer — the gateway could surface this to an
#  admin dashboard. Never a heavy call (no disk I/O at request time).
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

from fastapi import APIRouter, Request

from app.utils.envelope import ok

router = APIRouter()


@router.get('/model-status')
async def model_status(request: Request) -> dict:
    return ok(request.app.state.model.status())