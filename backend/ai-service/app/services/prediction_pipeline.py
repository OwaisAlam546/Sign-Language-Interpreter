# ─────────────────────────────────────────────────────────────
#  services/prediction_pipeline.py — the Inference Pipeline
#  The eight Phase-8 components in one class:
#    Model Loader        → ModelManager (loads once, warms up)
#    Frame Buffer        → FrameBuffer ring (streaming side)
#    Sequence Buffer     → SequenceBuffer window builder
#    Prediction          → ModelManager.predict_window (LSTM) or rule vote
#    Confidence Threshold→ decide(): max-prob below threshold = UNKNOWN
#    Unknown Detection   → below threshold, or the model's own UNKNOWN
#    Prediction Smoothing→ EMA over class probabilities (stream mode)
#    Model Warm-up       → KerasEngine.warm_up() at load (see model_loader)
#  One-shot (predict_frames) is the /predict-sequence path; stream()
#  is the incremental path the future WebSocket demo will feed.
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

import time
from collections import Counter, deque
from typing import Any, Optional

from app.services.model_loader import ModelManager
from app.services.sequence_buffer import FrameBuffer, SequenceBuffer


class InferencePipeline:
    def __init__(self, model: ModelManager, window: int = 12,
                 threshold: float = 0.55, alpha: float = 0.6,
                 display_threshold: float = 0.75,
                 stable_window: int = 8, stable_min: int = 5):
        self._model = model
        self.window = window
        self.threshold = threshold
        self.alpha = alpha
        self.display_threshold = display_threshold
        self._stable_min = stable_min
        self._buf = FrameBuffer(maxlen=max(window * 2, 24),
                                min_frames=max(2, window // 2))
        self._seq = SequenceBuffer(window)
        self._smooth: Optional[dict[str, float]] = None
        self._stable: deque[str] = deque(maxlen=stable_window)

    # ── helpers ───────────────────────────────────────────────
    @staticmethod
    def _normalize(probs: dict[str, float]) -> dict[str, float]:
        total = sum(probs.values()) or 1.0
        return {k: v / total for k, v in probs.items()}

    def _smooth_probs(self, probs: dict[str, float]) -> dict[str, float]:
        """EMA over class probabilities — a gesture that flickers for one
        frame barely moves the smoothed curve; a real change wins slowly."""
        if self._smooth is None:
            self._smooth = probs
            return dict(probs)
        keys = set(probs) | set(self._smooth)
        merged: dict[str, float] = {}
        for k in keys:
            p = probs.get(k, 0.0)
            merged[k] = self.alpha * self._smooth.get(k, 0.0) + (1 - self.alpha) * p
        self._smooth = merged
        return merged

    def _decide(self, probs: dict[str, float]) -> dict[str, Any]:
        """Confidence Threshold + Unknown Gesture Detection."""
        top = sorted(self._normalize(probs).items(), key=lambda kv: -kv[1])[:3]
        gesture, confidence = top[0]
        below = confidence < self.threshold
        if gesture == 'UNKNOWN' or below:
            kind = 'unknown'
            if gesture != 'UNKNOWN':
                gesture = 'UNKNOWN'          # low confidence → unknown
        else:
            kind = self._model.vocabulary.type_of(gesture)
        return {
            'gesture': gesture,
            'confidence': round(confidence, 4),
            'type': kind,
            'threshold': self.threshold,
            'belowThreshold': below,
            'scoresTop3': [{'label': g, 'score': round(c, 4)} for g, c in top],
        }

    def _apply_gates(self, decision: dict[str, Any], temporal: bool) -> dict[str, Any]:
        """Confidence display gate + (stream) temporal majority vote.

        A gesture is shown only when its softmax confidence clears
        display_threshold AND (in stream mode) it is the majority label in
        the last `stable_window` predictions — otherwise the UI gets 'NONE'
        (no gesture detected). This kills single-frame flicker and low-
        confidence noise without touching the model."""
        if temporal:
            self._stable.append(decision['gesture'])
            counts = Counter(self._stable)
            _, agree = counts.most_common(1)[0]
        else:
            agree = 1
        displayed = decision['confidence'] >= self.display_threshold
        stable = (not temporal) or (agree >= self._stable_min)
        if displayed and stable:
            return {**decision, 'displayed': True, 'stable': bool(stable),
                    'recentAgreement': agree}
        return {**decision, 'gesture': 'NONE', 'type': 'none',
                'displayed': False, 'stable': bool(stable),
                'recentAgreement': agree}

    # ── one-shot (offline sequence) ───────────────────────────
    def predict_frames(self, frames: list[list[list[float]]]) -> dict[str, Any]:
        """Full window → one decision. Used by /predict-sequence."""
        window = self._seq.from_frames(frames)
        start = time.perf_counter()
        result = self._model.predict_window(window)
        latency_ms = round((time.perf_counter() - start) * 1000, 2)

        probs = result.get('probs')
        if probs is None:                     # rule engine → derive probs
            probs = {result['gesture']: result['confidence']}
        decision = self._decide(probs)
        gated = self._apply_gates(decision, temporal=False)
        engine_id = result.get('engine', self._model.engine.id)
        return {
            'gesture': gated['gesture'],
            'confidence': gated['confidence'],
            'type': gated['type'],
            'threshold': decision['threshold'],
            'belowThreshold': decision['belowThreshold'],
            'scoresTop3': decision['scoresTop3'],
            'windowSize': len(window),
            'smoothed': False,
            'displayed': gated['displayed'],
            'stable': gated['stable'],
            'recentAgreement': gated['recentAgreement'],
            'engine': engine_id,
            'fallbackUsed': engine_id == 'rule',
            'latencyMs': latency_ms,
        }

    # ── streaming (per-frame, live demo) ──────────────────────
    def stream(self, hand: list[list[float]]) -> dict[str, Any]:
        """Push one hand; reply when the buffer has a real window."""
        self._buf.push(hand)
        if not self._buf.ready():
            return {'pending': True, 'buffered': len(self._buf),
                    'needed': self._buf.min_frames}
        window = self._seq.build(self._buf)
        start = time.perf_counter()
        result = self._model.predict_window(window)
        latency_ms = round((time.perf_counter() - start) * 1000, 2)

        probs = result.get('probs')
        if probs is None:
            probs = {result['gesture']: result['confidence']}
        decision = self._decide(self._smooth_probs(probs))
        gated = self._apply_gates(decision, temporal=True)
        engine_id = result.get('engine', self._model.engine.id)
        return {
            'pending': False,
            'gesture': gated['gesture'],
            'confidence': gated['confidence'],
            'type': gated['type'],
            'threshold': decision['threshold'],
            'belowThreshold': decision['belowThreshold'],
            'scoresTop3': decision['scoresTop3'],
            'windowSize': self.window,
            'buffered': len(self._buf),
            'smoothed': True,
            'displayed': gated['displayed'],
            'stable': gated['stable'],
            'recentAgreement': gated['recentAgreement'],
            'engine': engine_id,
            'latencyMs': latency_ms,
        }

    def reset(self) -> None:
        self._buf.reset()
        self._smooth = None
        self._stable.clear()