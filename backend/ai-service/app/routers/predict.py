# ─────────────────────────────────────────────────────────────
#  routers/predict.py — POST /api/v1/predict
#  One hand (21 landmarks) → one classification decision.
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

from fastapi import APIRouter, Request

from app.schemas import PredictRequest
from app.utils.envelope import ok

router = APIRouter()


@router.post('/predict')
async def predict(body: PredictRequest, request: Request) -> dict:
    service = request.app.state.prediction
    result = service.predict(body.landmarks, body.capture, body.sampleId)
    return ok(result)