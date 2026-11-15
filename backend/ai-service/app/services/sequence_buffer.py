# ─────────────────────────────────────────────────────────────
#  services/sequence_buffer.py — Frame Buffer + Sequence Buffer + Session Manager
#  Phase 5: Sequence Buffer & Stream Synchronization
#
#  Responsibilities:
#    • validate_and_convert_frame(): Strict shape, numerical sanity, NaN/Inf sanitization
#    • FrameBuffer: Thread-safe rolling ring of landmarks with timestamp guard
#    • SequenceBuffer: Deterministic window builder (exactly 12 frames, 63 float32 each)
#    • SessionBuffer: Isolated sequence recognition state container
#    • SequenceSessionManager: Multi-session isolation, concurrency safety, LRU/TTL cleanup
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

import logging
import math
import threading
import time
import uuid
from collections import deque
from numbers import Real
from typing import Any, Optional

import numpy as np

from app.utils.envelope import ApiError

log = logging.getLogger('app')

_HAND_POINTS = 21
_POINT_N = 3
_FRAME_FEATURES = 63  # 21 landmarks * 3 coordinates
_DEFAULT_WINDOW = 12


def validate_and_convert_frame(hand: Any) -> tuple[list[float], list[list[float]]]:
    """Validates and converts a single hand landmark frame into:
      1. flat_63: exactly 63 finite float32 values
      2. raw_21x3: exactly 21 points of [x, y, z] finite float32 values

    Rejects malformed input with ApiError(400, 'INVALID_LANDMARKS').
    Sanitizes non-finite values (NaN, +Inf, -Inf -> 0.0) safely.
    Guarantees defensive copies (caller mutation cannot alter stored data).
    """
    # 1. NumPy array input
    if isinstance(hand, np.ndarray):
        arr = hand.astype(np.float32)
        if arr.shape == (21, 3):
            flat = arr.flatten()
            np.nan_to_num(flat, copy=False, nan=0.0, posinf=0.0, neginf=0.0)
            raw = [[float(v) for v in row] for row in flat.reshape((21, 3))]
            return [float(v) for v in flat], raw
        if arr.ndim == 1 and arr.size == _FRAME_FEATURES:
            np.nan_to_num(arr, copy=False, nan=0.0, posinf=0.0, neginf=0.0)
            raw = [[float(v) for v in arr[i * 3:(i + 1) * 3]] for i in range(21)]
            return [float(v) for v in arr], raw
        raise ApiError(400, 'INVALID_LANDMARKS',
                       f'NumPy landmark array must be (21, 3) or (63,), got {arr.shape}')

    # 2. List input
    if not isinstance(hand, list):
        raise ApiError(400, 'INVALID_LANDMARKS',
                       'hand landmarks must be a list of 21 points or 63 flat coordinates')

    # Flat 63 list
    if len(hand) == _FRAME_FEATURES and all(isinstance(v, Real) for v in hand):
        flat_63: list[float] = []
        for v in hand:
            vf = float(v)
            flat_63.append(0.0 if not math.isfinite(vf) else vf)
        raw_21x3 = [
            flat_63[i * _POINT_N:(i + 1) * _POINT_N]
            for i in range(_HAND_POINTS)
        ]
        return flat_63, raw_21x3

    # Nested 21-point list
    if len(hand) == _HAND_POINTS:
        flat_63 = []
        raw_21x3 = []
        for p in hand:
            if isinstance(p, (list, tuple)) and len(p) >= _POINT_N:
                coords = []
                for v in p[:_POINT_N]:
                    if not isinstance(v, Real):
                        raise ApiError(400, 'INVALID_LANDMARKS', 'landmark coordinates must be numeric')
                    vf = float(v)
                    c = 0.0 if not math.isfinite(vf) else vf
                    coords.append(c)
                    flat_63.append(c)
                raw_21x3.append(coords)
            elif isinstance(p, dict) and 'x' in p and 'y' in p:
                coords = []
                for k in ('x', 'y', 'z'):
                    v = p.get(k, 0.0)
                    if not isinstance(v, Real):
                        raise ApiError(400, 'INVALID_LANDMARKS', 'dict landmark coordinates must be numeric')
                    vf = float(v)
                    c = 0.0 if not math.isfinite(vf) else vf
                    coords.append(c)
                    flat_63.append(c)
                raw_21x3.append(coords)
            else:
                raise ApiError(400, 'INVALID_LANDMARKS',
                               'each point must be [x, y, z] of 3 coordinates or dict with x, y, z')
        return flat_63, raw_21x3

    raise ApiError(400, 'INVALID_LANDMARKS',
                   f'hand must contain exactly 21 points or 63 values, got {len(hand)}')


def flatten(hand: Any) -> list[float]:
    """21x3 -> 63 flat float values. Preserves exact legacy signature."""
    flat, _ = validate_and_convert_frame(hand)
    return flat


class FrameBuffer:
    """Thread-safe rolling ring buffer of hand landmark frames with timestamp guards."""

    def __init__(self, maxlen: int = 24, min_frames: int = 2):
        self.maxlen = maxlen
        self.min_frames = min_frames
        self._frames: deque[list[float]] = deque(maxlen=maxlen)
        self._raw_frames: deque[list[list[float]]] = deque(maxlen=maxlen)
        self._ts: deque[float] = deque(maxlen=maxlen)
        self._lock = threading.RLock()

    def push(self, hand: Any, ts: Optional[float] = None) -> bool:
        """Pushes a hand frame into the buffer. Thread-safe.
        Validates before mutating state (failed frame does not corrupt buffer).
        Rejects stale frames if timestamps arrive strictly backwards.
        """
        # Validate before acquiring lock
        flat, raw = validate_and_convert_frame(hand)

        with self._lock:
            if ts is not None:
                ts_val = float(ts)
                if len(self._ts) > 0:
                    if ts_val < self._ts[-1]:
                        log.warning('Dropping stale frame (ts=%.4f < last_ts=%.4f)', ts_val, self._ts[-1])
                        return False
                    if ts_val == self._ts[-1]:
                        # Duplicate timestamp: if content identical, skip
                        if len(self._frames) > 0 and self._frames[-1] == flat:
                            log.debug('Dropping identical duplicate frame at ts=%.4f', ts_val)
                            return False
                self._ts.append(ts_val)
            else:
                self._ts.append(time.time())

            self._frames.append(list(flat))
            self._raw_frames.append([list(p) for p in raw])
            return True

    def ready(self) -> bool:
        with self._lock:
            return len(self._frames) >= self.min_frames

    def reset(self) -> None:
        with self._lock:
            self._frames.clear()
            self._raw_frames.clear()
            self._ts.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._frames)

    def snapshot(self) -> list[list[float]]:
        """Returns an immutable defensive copy of the current 63-element frames."""
        with self._lock:
            return [list(f) for f in self._frames]

    def snapshot_raw(self) -> list[list[list[float]]]:
        """Returns an immutable defensive copy of the current 21x3 frames."""
        with self._lock:
            return [[[v for v in p] for p in f] for f in self._raw_frames]


class SequenceBuffer:
    """Deterministic (window, 63) tensor window builder.

    Invariants:
      • Output is ALWAYS exactly `window` frames (default: 12).
      • Each frame has ALWAYS exactly 63 finite float32 values.
      • Chronological order: oldest frame at index 0, newest frame at index (window - 1).
      • Short sequences (< window) are edge-padded (earliest frame repeated at the start).
      • Long sequences (> window) retain the most recent `window` frames.
    """

    def __init__(self, window: int = _DEFAULT_WINDOW):
        self.window = window

    def build(self, frames: FrameBuffer) -> list[list[float]]:
        """Builds a model-ready 12-frame window snapshot from a FrameBuffer."""
        with frames._lock:
            latest = list(frames._frames)
            if len(latest) == 0:
                raise ApiError(400, 'BUFFER_EMPTY', 'cannot build window from empty frame buffer')
            out = [list(f) for f in latest[-self.window:]]

        # Edge-padding for short sequences (< window)
        first_frame = list(out[0])
        while len(out) < self.window:
            out.insert(0, list(first_frame))
        return out

    def from_frames(self, frames: list[Any]) -> list[list[float]]:
        """One-shot builder for offline sequences (predict-sequence)."""
        if not isinstance(frames, list) or len(frames) == 0:
            raise ApiError(400, 'NO_FRAMES', 'send at least 1 frame to build a sequence window')

        validated = [validate_and_convert_frame(f)[0] for f in frames]
        out = [list(f) for f in validated[-self.window:]]

        first_frame = list(out[0])
        while len(out) < self.window:
            out.insert(0, list(first_frame))
        return out

    def from_frames_raw(self, frames: list[Any]) -> list[list[list[float]]]:
        """One-shot builder returning raw 21x3 frames for 90D feature extraction."""
        if not isinstance(frames, list) or len(frames) == 0:
            raise ApiError(400, 'NO_FRAMES', 'send at least 1 frame to build a sequence window')

        validated = [validate_and_convert_frame(f)[1] for f in frames]
        out = [[[v for v in p] for p in f] for f in validated[-self.window:]]

        first_frame = [[v for v in p] for p in out[0]]
        while len(out) < self.window:
            out.insert(0, [[v for v in p] for p in first_frame])
        return out


class SessionBuffer:
    """Encapsulates sequence recognition state for one isolated client session."""

    def __init__(
        self,
        session_id: str,
        model: Any,
        window: int = _DEFAULT_WINDOW,
        threshold: float = 0.55,
        alpha: float = 0.6,
        display_threshold: float = 0.75,
        stable_window: int = 8,
        stable_min: int = 5,
        margin_threshold: float = 0.12,
    ):
        self.session_id = session_id
        self.window = window
        self.lock = threading.RLock()
        self.frame_buffer = FrameBuffer(maxlen=max(window * 2, 24), min_frames=max(2, window // 2))
        self.sequence_buffer = SequenceBuffer(window=window)

        # Lazy import of InferencePipeline to prevent circular dependencies
        from app.services.prediction_pipeline import InferencePipeline

        self.pipeline = InferencePipeline(
            model=model,
            window=window,
            threshold=threshold,
            alpha=alpha,
            display_threshold=display_threshold,
            stable_window=stable_window,
            stable_min=stable_min,
            margin_threshold=margin_threshold,
        )
        # Bind session buffers to the pipeline
        self.pipeline._buf = self.frame_buffer
        self.pipeline._seq = self.sequence_buffer

        self.created_at = time.time()
        self.last_active = time.time()

    def touch(self) -> None:
        self.last_active = time.time()

    def reset(self) -> None:
        with self.lock:
            self.frame_buffer.reset()
            self.pipeline.reset()
            self.touch()


class SequenceSessionManager:
    """Thread-safe manager for concurrent sequence recognition sessions.
    Guarantees session isolation, automatic TTL expiration, and LRU capacity bounds.
    """

    def __init__(
        self,
        model: Any,
        window: int = _DEFAULT_WINDOW,
        threshold: float = 0.55,
        alpha: float = 0.6,
        display_threshold: float = 0.75,
        stable_window: int = 8,
        stable_min: int = 5,
        margin_threshold: float = 0.12,
        ttl_seconds: float = 600.0,
        max_sessions: int = 1000,
    ):
        self._model = model
        self.window = window
        self.threshold = threshold
        self.alpha = alpha
        self.display_threshold = display_threshold
        self.stable_window = stable_window
        self.stable_min = stable_min
        self.margin_threshold = margin_threshold
        self.ttl_seconds = ttl_seconds
        self.max_sessions = max_sessions

        self._sessions: dict[str, SessionBuffer] = {}
        self._lock = threading.RLock()

        # Always initialize default session for backward-compatible/single-client usage
        self._sessions['default'] = self._create_session_instance('default')

    def _create_session_instance(self, session_id: str) -> SessionBuffer:
        return SessionBuffer(
            session_id=session_id,
            model=self._model,
            window=self.window,
            threshold=self.threshold,
            alpha=self.alpha,
            display_threshold=self.display_threshold,
            stable_window=self.stable_window,
            stable_min=self.stable_min,
            margin_threshold=self.margin_threshold,
        )

    def get_or_create(self, session_id: Optional[str] = None) -> SessionBuffer:
        sid = (session_id or 'default').strip() or 'default'
        with self._lock:
            self._cleanup_expired_locked()
            session = self._sessions.get(sid)
            if session is None:
                if len(self._sessions) >= self.max_sessions:
                    self._evict_lru_locked()
                session = self._create_session_instance(sid)
                self._sessions[sid] = session
            session.touch()
            return session

    def create_ephemeral(self) -> SessionBuffer:
        """Creates an isolated ephemeral session for one-shot offline calls."""
        sid = f'ephemeral-{uuid.uuid4().hex[:12]}'
        return self._create_session_instance(sid)

    def reset(self, session_id: str) -> bool:
        with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session.reset()
                return True
            return False

    def remove(self, session_id: str) -> bool:
        if session_id == 'default':
            self.reset('default')
            return True
        with self._lock:
            return self._sessions.pop(session_id, None) is not None

    def active_sessions(self) -> list[str]:
        with self._lock:
            return list(self._sessions.keys())

    def __len__(self) -> int:
        with self._lock:
            return len(self._sessions)

    def _cleanup_expired_locked(self) -> int:
        now = time.time()
        expired = [
            sid for sid, s in self._sessions.items()
            if sid != 'default' and (now - s.last_active) > self.ttl_seconds
        ]
        for sid in expired:
            del self._sessions[sid]
        return len(expired)

    def _evict_lru_locked(self) -> None:
        candidates = [s for sid, s in self._sessions.items() if sid != 'default']
        if candidates:
            lru = min(candidates, key=lambda s: s.last_active)
            del self._sessions[lru.session_id]


__all__ = [
    'FrameBuffer',
    'SequenceBuffer',
    'SessionBuffer',
    'SequenceSessionManager',
    'flatten',
    'validate_and_convert_frame',
]
