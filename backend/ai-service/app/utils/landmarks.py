# ─────────────────────────────────────────────────────────────
#  utils/landmarks.py — hands-landmarks math + synthetic generator
#  Two jobs:
#   1. classify()   — the FALLBACK recognizer: reads the 21 MediaPipe
#      hand landmarks and decides the gesture from finger-extension
#      geometry. Deterministic, explainable, zero ML — it runs until a
#      trained LSTM is dropped into models/ (model_loader then swaps in
#      the real engine).
#   2. generate_hand() — synthetic landmark frames for the mock camera,
#      the smoke test, and webcam-less demos.
#  MediaPipe layout: 0 wrist · 1–4 thumb · 5–8 index · 9–12 middle ·
#  13–16 ring · 17–20 pinky. Each point is [x, y, z], normalized space.
#  ─────────────────────────────────────────────────────────────
import math
import random
from typing import Any

_Point = tuple[float, float, float]


def _vec(a: _Point, b: _Point) -> tuple[float, float, float]:
    return (b[0] - a[0], b[1] - a[1], b[2] - a[2])


def _norm(v: tuple[float, float, float]) -> float:
    return math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) or 1e-9


def _angle_at(a: _Point, b: _Point, c: _Point) -> float:
    """Bend (degrees) at joint b between segments a→b and b→c.
    0° = straight ahead, 90° = right angle, ~180° = doubled back."""
    u = _vec(a, b)
    v = _vec(b, c)
    cos = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (_norm(u) * _norm(v))
    return math.degrees(math.acos(max(-1.0, min(1.0, cos))))


def _dist(a: _Point, b: _Point) -> float:
    return _norm(_vec(a, b))


_STRAIGHT = 45.0        # PIP bend at/below this → finger is extended
_THUMB_STRAIGHT = 35.0  # IP bend at/below this → thumb is out


def classify(lms: list[_Point]) -> dict[str, Any]:
    """Rules over the four PIP joints + the thumb-IP joint.

    Confidence is a per-rule constant: identical hands score identically
    (reproducible demos, easy to reason about in a viva).
    """
    angles = [_angle_at(lms[m], lms[p], lms[t])
              for m, p, t in ((5, 6, 8), (9, 10, 12), (13, 14, 16), (17, 18, 20))]
    n_ext = sum(1 for a in angles if a <= _STRAIGHT)
    thumb = _angle_at(lms[2], lms[3], lms[4]) <= _THUMB_STRAIGHT

    # made-a-circle (O) before the extension rules: tips almost touch
    if _dist(lms[4], lms[8]) < 0.28 * (_dist(lms[0], lms[9]) or 1e-9):
        return {'gesture': 'O', 'confidence': 0.94}

    if not thumb and n_ext == 0:
        return {'gesture': 'A', 'confidence': 0.96}            # fist
    if not thumb and n_ext == 1 and angles[0] <= _STRAIGHT:
        return {'gesture': 'D', 'confidence': 0.93}            # index only
    if not thumb and n_ext == 2 and angles[0] <= _STRAIGHT and angles[1] <= _STRAIGHT:
        return {'gesture': 'PEACE', 'confidence': 0.94}        # index + middle
    if not thumb and n_ext == 3:
        return {'gesture': 'THREE', 'confidence': 0.93}
    if not thumb and n_ext == 4:
        return {'gesture': 'FOUR', 'confidence': 0.94}
    if thumb and n_ext == 4:
        return {'gesture': 'B', 'confidence': 0.97}            # open palm
    if thumb and n_ext == 0:
        return {'gesture': 'THUMBS_UP', 'confidence': 0.95}
    if thumb and n_ext == 1 and angles[0] <= _STRAIGHT:
        return {'gesture': 'L', 'confidence': 0.94}            # thumb + index
    return {'gesture': 'UNKNOWN', 'confidence': 0.5}


# ── Synthetic landmark generator (mock camera / tests) ─────────
_SKEW = {'index': -30, 'middle': 0, 'ring': 30, 'pinky': 60}
_KNUCKLE = 0.095        # mcp ring radius around the wrist
_FOLD = 55.0            # degrees a curled finger folds at each joint
_SPAN = 0.24            # mcp→tip distance for an extended finger


def _seg(x: float, y: float, length: float, deg: float, wobble) -> tuple[float, float]:
    a = math.radians(deg)
    return (x + length * math.cos(a) + wobble(),
            y + length * math.sin(a) + wobble())


def generate_hand(shape: str = 'open', seed: int = 0) -> list[list[float]]:
    """Deterministic synthetic hand (21×3). Extended fingers stay ~straight;
    curled fingers fold _FOLD° at every joint, starting at the PIP."""
    rng = random.Random(seed)
    pts: list[list[float]] = [[0.0, 0.0, 0.0]]                # wrist

    def wobble() -> float:
        return rng.uniform(-0.004, 0.004)

    extended = {
        'index': shape in ('open', 'point', 'peace', 'l'),
        'middle': shape in ('open', 'peace'),
        'ring': shape in ('open',),
        'pinky': shape in ('open',),
    }
    thumb_out = shape in ('open', 'thumbs_up', 'l')

    # thumb chain (1–4)
    if thumb_out:
        for i in range(1, 5):
            pts.append([0.075 * i + wobble(), 0.06 * i + wobble(), wobble()])
    else:
        pts.append([0.04 + wobble(), 0.02 + wobble(), wobble()])
        pts.append([0.09 + wobble(), 0.05 + wobble(), wobble()])
        pts.append([0.10 + wobble(), 0.115 + wobble(), wobble()])   # tip folded
        pts.append([0.07 + wobble(), 0.14 + wobble(), wobble()])    # …curled back

    # fingers (5–20)
    for name in _SKEW:
        ang = _SKEW[name]
        folded = not extended[name]
        x = _KNUCKLE * math.cos(math.radians(ang))
        y = _KNUCKLE * math.sin(math.radians(ang)) - 0.05
        pts.append([x + wobble(), y + wobble(), wobble()])          # mcp
        seg = _SPAN / 3.0
        for _ in range(3):                                          # pip dip tip
            if folded:
                ang += _FOLD
            x, y = _seg(x, y, seg, ang, wobble)
            pts.append([x, y, wobble()])
    return pts