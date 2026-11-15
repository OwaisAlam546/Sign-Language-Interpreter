# ─────────────────────────────────────────────────────────────
#  routers/predict_sequence.py — POST /api/v1/predict-sequence
#  Body: N hand frames → ONE smoothed decision (majority vote or
#  confidence-averaged) + the per-frame breakdown the UI renders.
#  Supports optional session-isolated recognition state and reset.
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

from fastapi import APIRouter, Request

from app.schemas import PredictSequenceRequest
from app.utils.envelope import ok

router = APIRouter()


@router.post('/predict-sequence')
async def predict_sequence(body: PredictSequenceRequest, request: Request) -> dict:
    service = request.app.state.prediction
    if body.reset:
        service.reset_session(body.sessionId)
        if not body.frames or len(body.frames) == 0:
            return ok({'reset': True, 'sessionId': body.sessionId})
    result = service.predict_sequence(body.frames, body.strategy, session_id=body.sessionId)
    return ok(result)
