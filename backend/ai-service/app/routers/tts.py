# ─────────────────────────────────────────────────────────────
#  routers/tts.py — POST /api/v1/text-to-speech
#  Text → base64 audio (WAV via the offline tone engine, MP3 via gTTS).
#  The frontend decodes the blob into an <audio> element directly.
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

from fastapi import APIRouter, Request

from app.schemas import TTSRequest
from app.utils.envelope import ok

router = APIRouter()


@router.post('/text-to-speech')
async def text_to_speech(body: TTSRequest, request: Request) -> dict:
    tts = request.app.state.tts
    return ok(tts.synthesize(body.text, body.lang))