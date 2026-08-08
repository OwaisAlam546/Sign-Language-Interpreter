# ─────────────────────────────────────────────────────────────
#  schemas.py — Pydantic request/response models
#  FastAPI's validation layer. Shape rules (21×3 landmarks, min-length
#  sequences, text bounds) live here so the routers stay declarative;
#  structural deep-checks that need custom messages (e.g. INVALID_
#  LANDMARKS) live in the prediction service.
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class PredictRequest(BaseModel):
    """POST /predict — one hand, either from the client or the server
    camera."""

    landmarks: Optional[list[list[float]]] = None   # 21 × [x, y, z]
    capture: bool = False                           # pull a camera frame instead
    sampleId: Optional[str] = Field(default=None, max_length=80)


class PredictSequenceRequest(BaseModel):
    """≥2 hand frames → one smoothed decision. Length is a DOMAIN rule
    (prediction service), shape is a schema rule."""
    frames: list[list[list[float]]] = Field(max_length=120)
    strategy: Literal['majority', 'average'] = 'majority'

    @field_validator('frames')
    @classmethod
    def _frame_shape(cls, frames: list[list[list[float]]]) -> list[list[list[float]]]:
        if any(len(f) != 21 or any(len(p) != 3 for p in f) for f in frames):
            raise ValueError('every frame must be 21 points of [x, y, z]')
        return frames


class ProcessFrameRequest(BaseModel):
    """One pipeline frame → every hand in it. Two input modes:

    • image   — base64 JPEG/PNG → server-side MediaPipe Hands
                (needs the optional mediapipe + opencv deps)
    • hands   — client-sent 21×3 landmark sets (e.g. from the
                browser MediaPipe HandLandmarker) — always works.

    mirror=True flips the horizontal axis (selfie-style preview).
    """
    image: Optional[str] = None
    hands: Optional[list[list[list[float]]]] = Field(default=None, max_length=4)
    mirror: bool = False


class TTSRequest(BaseModel):
    """POST /text-to-speech — message → audio blob (base64)."""

    text: str = Field(min_length=1, max_length=500)
    lang: str = Field(default='en', max_length=8)