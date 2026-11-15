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
    result = service.predict(
        landmarks=body.landmarks,
        capture=body.capture,
        sample_id=body.sampleId,
        is_left_hand=body.isLeftHand,
    )
    return ok(result)