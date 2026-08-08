# ─────────────────────────────────────────────────────────────
#  services/tts_service.py — Text-to-speech service
#  Two engines, one interface:
#    tone  (default, offline) — nothing extra to install: synthesizes a
#           deterministic monophonic WAV whose note melody is derived
#           from the message text (pure math, no external deps).
#           Identical text → identical audio, anywhere, air-gapped.
#    gtts  — high-quality neural voices (pip install gTTS, internet).
#  Response is engine-agnostic { audioBase64, format, durationMs,
#  engine, latencyMs } — the frontend plays the blob either way.
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

import base64
import io
import logging
import math
import struct
import time as _time

from app.utils.envelope import ApiError

log = logging.getLogger('app')

SAMPLE_RATE = 22050
_NOTE_MS = 150.0           # duration of one letter's note
_FADE_MS = 40.0            # attack/release ramp per note


def _note_freq(char: str, index: int) -> float:
    """Deterministic pitch: character → semitone over two octaves."""
    step = (ord(char.upper()) - 65) % 12            # wrap into a 12-note scale
    octave = (index * 7) % 2                        # bounce between two octaves
    return 220.0 * (2 ** ((step + 12 * octave) / 12.0))


def _render_tone_wav(text: str, sample_rate: int = SAMPLE_RATE) -> tuple[bytes, float]:
    """Text → mono 16-bit WAV. Letters become sine notes (fundamental +
    soft second harmonic) with short fades; the message is the melody,
    so different messages produce audibly different tones."""
    segments: list[list[float]] = []
    for i, ch in enumerate(text.replace(' ', '')):
        count = int(sample_rate * _NOTE_MS / 1000.0)
        freq = _note_freq(ch, i)
        seg = [
            0.5 * math.sin(2 * math.pi * freq * (j / sample_rate))
            + 0.15 * math.sin(4 * math.pi * freq * (j / sample_rate))
            for j in range(count)
        ]
        fade = min(int(sample_rate * _FADE_MS / 1000.0), count // 4)
        for k in range(fade):
            seg[k] *= k / fade
            seg[-1 - k] *= k / fade
        segments.append(seg)

    audio = [sample for seg in segments for sample in seg] or [0.0]
    pcm = b''.join(
        int(max(-1.0, min(1.0, s)) * 32767).to_bytes(2, 'little', signed=True)
        for s in audio
    )
    header = struct.pack(
        '<4sI4s4sIHHIIHH4sI',
        b'RIFF', 36 + len(pcm), b'WAVE',
        b'fmt ', 16, 1, 1, sample_rate, sample_rate * 2, 2, 16,
        b'data', len(pcm),
    )
    return header + pcm, len(audio) / sample_rate


class TTSManager:
    """Engine-agnostic entry point (singleton, built at startup)."""

    def __init__(self, engine: str = 'tone'):
        self.engine = engine

    def synthesize(self, text: str, lang: str = 'en') -> dict:
        if not text or not text.strip():
            raise ApiError(400, 'EMPTY_TEXT', 'text must not be empty')
        if self.engine == 'gtts':
            return self._gtts(text, lang)
        return self._tone(text)

    # ── offline tone engine ────────────────────────────────────
    def _tone(self, text: str) -> dict:
        start = _time.perf_counter()
        wav, duration_s = _render_tone_wav(text)
        return {
            'audioBase64': base64.b64encode(wav).decode('ascii'),
            'format': 'wav',
            'sampleRate': SAMPLE_RATE,
            'durationMs': round(duration_s * 1000),
            'engine': 'tone',
            'latencyMs': round((_time.perf_counter() - start) * 1000, 2),
        }

    # ── gTTS engine (optional extra) ───────────────────────────
    def _gtts(self, text: str, lang: str) -> dict:
        try:
            from gtts import gTTS
        except ImportError as exc:
            raise ApiError(503, 'TTS_RUNTIME_MISSING',
                           'pip install gTTS to use the gtts engine') from exc
        start = _time.perf_counter()
        buffer = io.BytesIO()
        gTTS(text=text, lang=lang).write_to_fp(buffer)
        return {
            'audioBase64': base64.b64encode(buffer.getvalue()).decode('ascii'),
            'format': 'mp3',
            'engine': 'gtts',
            'latencyMs': round((_time.perf_counter() - start) * 1000, 2),
        }