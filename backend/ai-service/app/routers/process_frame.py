# ─────────────────────────────────────────────────────────────
#  routers/process_frame.py — POST /api/v1/process-frame
#  One frame → the complete hand pipeline result: landmarks,
#  connections, bounding boxes, handedness, gesture predictions,
#  confidence, FPS, mirror state. See services/pipeline.py.
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

from fastapi import APIRouter, Request

from app.schemas import ProcessFrameRequest
from app.utils.envelope import ok

router = APIRouter()


@router.post('/process-frame')
async def process_frame(body: ProcessFrameRequest, request: Request) -> dict:
    pipeline = request.app.state.pipeline
    result = pipeline.process_frame(body.image, body.hands, body.mirror)
    return ok(result)