# ─────────────────────────────────────────────────────────────
#  services/pipeline.py — the Phase 7 MediaPipe hand pipeline
#  One object, two detection sources, one output contract:
#
#    • image   → REAL MediaPipe Hands (optional: needs `mediapipe`
#                + an image decoder such as opencv-python-headless)
#    • hands   → client-sent 21×3 landmark sets (browser MediaPipe)
#                — always works, even without any ML dependency.
#
#  Every hand comes back with: 21 normalized landmarks (x, y, z),
#  a handedness label + score, the gesture prediction (the SAME
#  classifier as /predict), a normalized bounding box, and the
#  response carries the official 21-pair HAND_CONNECTIONS topology
#  plus a mirrored flag and a rolling FPS. Browser and server draw
#  the exact same skeleton from this one shape.
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

import base64
import time
from typing import Any, Optional

from app.utils.envelope import ApiError

# Official MediaPipe hand topology — 21 landmarks, 21 connections.
# (thumb chain, four finger chains, palm cross-links, wrist seam.)
HAND_CONNECTIONS: list[list[int]] = [
    [0, 1], [1, 2], [2, 3], [3, 4],            # thumb
    [0, 5], [5, 6], [6, 7], [7, 8],            # index
    [5, 9], [9, 10], [10, 11], [11, 12],       # middle
    [9, 13], [13, 14], [14, 15], [15, 16],     # ring
    [13, 17], [17, 18], [18, 19], [19, 20],    # pinky
    [0, 17],                                   # palm seam
]

_HAND_POINTS = 21
_POINT_N = 3


def _normalize_hand(hand: Any) -> list[list[float]]:
    """Structural guard identical to prediction_service: 21×3 floats."""
    ok = (
        isinstance(hand, list)
        and len(hand) == _HAND_POINTS
        and all(isinstance(p, list) and len(p) == _POINT_N for p in hand)
    )
    if not ok:
        raise ApiError(400, 'INVALID_LANDMARKS',
                       'each hand must be 21 points of [x, y, z]')
    return hand


def _bbox(landmarks: list[list[float]]) -> dict:
    """Tight normalized bounding box around the 21 landmarks."""
    xs = [p[0] for p in landmarks]
    ys = [p[1] for p in landmarks]
    x, y = min(xs), min(ys)
    return {
        'x': round(x, 4),
        'y': round(y, 4),
        'w': round(max(xs) - x, 4),
        'h': round(max(ys) - y, 4),
    }


def _mirror(landmarks: list[list[float]]) -> list[list[float]]:
    """Mirror Mode: flip the horizontal axis (x → 1 − x) so the
    overlay matches a mirrored selfie preview."""
    return [[round(1.0 - p[0], 4), p[1], p[2]] for p in landmarks]


class HandPipeline:
    def __init__(self, model) -> None:
        self._model = model
        self._mp_hands = None
        try:
            import mediapipe as mp  # type: ignore  (optional dependency)

            self._mp_hands = mp.solutions.hands.Hands(
                static_image_mode=False,
                max_num_hands=2,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            self._mp = mp
        except Exception:
            self._mp_hands = None  # real tracking unavailable → client mode

        self._last_t = time.perf_counter()
        self._fps = 0.0
        self._fps_alpha = 0.2  # exponential moving average weight

    # ── telemetry ──────────────────────────────────────────────
    @property
    def fps(self) -> float:
        return round(self._fps, 1)

    def _tick_fps(self) -> None:
        now = time.perf_counter()
        dt = max(now - self._last_t, 1e-4)
        self._last_t = now
        instant = 1.0 / dt
        self._fps = self._fps_alpha * instant + (1 - self._fps_alpha) * self._fps

    @property
    def tracker(self) -> str:
        return 'mediapipe' if self._mp_hands is not None else 'rule'

    # ── classification + shape helpers ────────────────────────
    def _predict(self, hand: list[list[float]]) -> dict:
        result = self._model.classify(hand)
        return {
            'label': result['gesture'],
            'confidence': result['confidence'],
        }

    # ── server-side (image) detection ─────────────────────────
    def _detect_image(self, image_b64: str) -> list[dict]:
        if self._mp_hands is None:
            raise ApiError(501, 'MEDIAPIPE_UNAVAILABLE',
                           'install mediapipe + opencv-python-headless to '
                           'enable server-side frame detection')
        try:
            import cv2  # type: ignore  (optional dependency)
        except Exception:
            raise ApiError(501, 'IMAGE_DECODE_UNAVAILABLE',
                           'install opencv-python-headless to decode image frames')

        raw = base64.b64decode(image_b64)
        frame = cv2.imdecode(__import__('numpy').frombuffer(raw, 'u1'), cv2.IMREAD_COLOR)
        if frame is None:
            raise ApiError(400, 'INVALID_IMAGE', 'image bytes did not decode')

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self._mp_hands.process(rgb)

        hands: list[dict] = []
        for i, hand_lms in enumerate(results.multi_hand_landmarks or []):
            points = [[lm.x, lm.y, lm.z] for lm in hand_lms.landmark]
            handedness = (results.multi_handedness[i].classification[0]
                          if results.multi_handedness else None)
            prediction = self._predict(points)
            hands.append({
                'landmarks': points,
                'handedness': handedness.label if handedness else 'Unknown',
                'handednessScore': round(handedness.score, 4) if handedness else None,
                'label': prediction['label'],
                'confidence': prediction['confidence'],
                'bbox': _bbox(points),
            })
        return hands

    # ── public entry ───────────────────────────────────────────
    def process_frame(self, image: Optional[str],
                      hands: Optional[list], mirror: bool) -> dict:
        self._tick_fps()

        if image:
            detected = self._detect_image(image)
            engine = 'mediapipe'
        elif hands:
            detected = []
            for hand in hands:
                points = _normalize_hand(hand)
                prediction = self._predict(points)
                detected.append({
                    'landmarks': points,
                    'handedness': 'Client',
                    'handednessScore': None,
                    'label': prediction['label'],
                    'confidence': prediction['confidence'],
                    'bbox': _bbox(points),
                })
            engine = self._model.engine.id
        else:
            raise ApiError(400, 'NO_INPUT',
                           'send an image (base64) or a hands landmark set')

        if mirror:
            for hand in detected:
                hand['landmarks'] = _mirror(hand['landmarks'])
                hand['bbox'] = _bbox(hand['landmarks'])

        return {
            'hands': detected,
            'connections': HAND_CONNECTIONS,
            'count': len(detected),
            'engine': engine,
            'tracker': self.tracker,
            'fallbackUsed': self._model.engine.status()['fallback'],
            'mirrored': mirror,
            'fps': self.fps,
        }