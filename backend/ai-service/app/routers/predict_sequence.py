# ─────────────────────────────────────────────────────────────
#  routers/predict_sequence.py — POST /api/v1/predict-sequence
#  Body: N hand frames → ONE smoothed decision (majority vote or
#  confidence-averaged) + the per-frame breakdown the UI renders.
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

from fastapi import APIRouter, Request

from app.schemas import PredictSequenceRequest
from app.utils.envelope import ok

router = APIRouter()


@router.post('/predict-sequence')
async def predict_sequence(body: PredictSequenceRequest, request: Request) -> dict:
    service = request.app.state.prediction
    result = service.predict_sequence(body.frames, body.strategy)
    return ok(result)