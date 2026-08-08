# ─────────────────────────────────────────────────────────────
#  services/sequence_buffer.py — Frame Buffer + Sequence Buffer
#  Two rings, one job: turn a stream of hands into a window the
#  LSTM can eat.
#    • FrameBuffer  — raw landmark frames (21×3 each) as they
#      arrive, newest last, capped at maxlen. The streaming side
#      of the pipeline (WebSocket / feed-frame).
#    • SequenceBuffer — the MODEL-READY window derived from the
#      frame buffer: the last `window` frames flattened to
#      (window, 63) features (x,y,z × 21), nearest-frame padded
#      so a short stream still fills the window. Tells you when
#      it has enough real frames to trust (`ready`).
#  Padding matters: LSTMs need fixed-length inputs; mirroring the
#  last frame is more truthful than zero-padding (a held pose is
#  the same pose, not "hand vanished").
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

from collections import deque
from typing import Any, Optional


def flatten(hand: list[list[float]]) -> list[float]:
    """21×3 → 63 flat features (the LSTM input layout)."""
    return [float(v) for point in hand for v in point]


class FrameBuffer:
    def __init__(self, maxlen: int, min_frames: int):
        self.maxlen = maxlen
        self.min_frames = min_frames
        self._frames: deque[list[list[float]]] = deque(maxlen=maxlen)
        self._ts: deque[float] = deque(maxlen=maxlen)

    def push(self, hand: list[list[float]], ts: Optional[float] = None) -> None:
        self._frames.append(hand)
        self._ts.append(ts if ts is not None else 0.0)

    def ready(self) -> bool:
        return len(self._frames) >= self.min_frames

    def reset(self) -> None:
        self._frames.clear()
        self._ts.clear()

    def __len__(self) -> int:
        return len(self._frames)


class SequenceBuffer:
    """(window, 63) tensor built from a FrameBuffer — the model input."""

    def __init__(self, window: int):
        self.window = window

    def build(self, frames: FrameBuffer) -> list[list[float]]:
        """Last `window` frames, newest last, edge-repeated to fill."""
        latest = list(frames._frames)          # oldest → newest
        out = latest[-self.window:]
        while len(out) < self.window:
            out.insert(0, list(out[0]))        # repeat the first frame
        return [flatten(h) for h in out]

    def from_frames(self, frames: list[list[list[float]]]) -> list[list[float]]:
        """One-shot builder for offline sequences (predict-sequence)."""
        out = list(frames)[-self.window:]
        while len(out) < self.window:
            out.insert(0, list(out[0]))
        return [flatten(h) for h in out]


# Re-export for convenience
__all__ = ['FrameBuffer', 'SequenceBuffer', 'flatten']