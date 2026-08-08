# ─────────────────────────────────────────────────────────────
#  services/prediction_service.py — Prediction service (facade)
#  Orchestrates model → result for one frame and for sequences:
#    • predict()          : single-frame classification
#    • predict_sequence() : many frames → one decision
#  Sequence requests now flow through the Phase-8 InferencePipeline
#  (window buffer → LSTM / rule vote → threshold → unknown →
#  smoothing), which keeps the old response keys (votes, perFrame,
#  strategy) for client parity and adds the pipeline fields
#  (type, windowSize, threshold, smoothed, scoresTop3).
#  Latency is measured here, outside the engine, so the client sees
#  true end-to-end cost.
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

import time
from collections import Counter
from typing import Any, Optional

from app.services.camera_manager import CameraManager
from app.services.model_loader import ModelManager
from app.services.prediction_pipeline import InferencePipeline
from app.utils.envelope import ApiError

_HAND_POINTS = 21
_POINT_N = 3  # x, y, z


def _validate_hand(hand: Any) -> list[list[float]]:
    """Structural guard: a hand is exactly 21 points × 3 floats."""
    ok = (
        isinstance(hand, list)
        and len(hand) == _HAND_POINTS
        and all(isinstance(p, list) and len(p) == _POINT_N for p in hand)
    )
    if not ok:
        raise ApiError(400, 'INVALID_LANDMARKS',
                       'hand landmarks must be 21 points of [x, y, z]')
    return hand


class PredictionService:
    def __init__(self, model: ModelManager, camera: CameraManager,
                 window: int = 12, threshold: float = 0.55,
                 alpha: float = 0.6):
        self._model = model
        self._camera = camera
        self.pipeline = InferencePipeline(model, window, threshold, alpha)

    # ── single frame ───────────────────────────────────────────
    def predict(self, landmarks: Optional[list], capture: bool,
                sample_id: Optional[str]) -> dict:
        source = 'client'
        if landmarks is None:
            if not capture:
                raise ApiError(400, 'NO_FRAMES',
                               'send "landmarks" or set capture=true')
            landmarks = self._camera.read_frame()
            source = 'camera'
            if landmarks is None:
                raise ApiError(503, 'CAMERA_UNAVAILABLE',
                               'camera produced no frame')
        hand = _validate_hand(landmarks)

        start = time.perf_counter()
        result = self._model.classify(hand)      # frame path (rule fallback for LSTMs)
        latency_ms = round((time.perf_counter() - start) * 1000, 2)

        engine_id = result.get('engine', self._model.engine.id)
        return {
            'gesture': result['gesture'],
            'confidence': result['confidence'],
            'type': self._model.vocabulary.type_of(result['gesture']),
            'engine': engine_id,                 # what ACTUALLY classified this frame
            'loadedModel': self._model.engine.id,  # what the service is running
            'fallbackUsed': engine_id == 'rule',
            'latencyMs': latency_ms,
            'source': source,
            'sampleId': sample_id,
        }

    # ── sequence (Phase-8 pipeline) ────────────────────────────
    def predict_sequence(self, frames: list, strategy: str = 'majority') -> dict:
        if not isinstance(frames, list) or len(frames) < 2:
            raise ApiError(400, 'SEQUENCE_TOO_SHORT',
                           'send at least 2 frames for a sequence prediction')
        hands = [_validate_hand(f) for f in frames]

        result = self.pipeline.predict_frames(hands)
        # legacy keys the frontend already consumes
        votes = [self._model.classify(h) for h in hands]
        counter = Counter(v['gesture'] for v in votes)
        result['strategy'] = strategy
        result['frameCount'] = len(frames)
        result['votes'] = dict(counter)
        result['perFrame'] = [
            {'frame': i, 'gesture': v['gesture'], 'confidence': v['confidence']}
            for i, v in enumerate(votes)
        ]
        return result