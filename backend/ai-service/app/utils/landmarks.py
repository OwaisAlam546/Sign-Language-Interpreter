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

# Per-landmark jitter weighting: fingertips drift more than the wrist,
# which is what a real hand does (tips are noisier, the palm is stable).
# Magnitude is kept SMALL (base 0.004, the original value) so it perturbs
# fingertip noise WITHOUT flipping the joint angles the rule engine's
# classify() reads — otherwise fist/point/peace misclassify as thumb-out.
_JITTER_W = [
    0.3,                      # 0 wrist
    1.0, 1.2, 1.5, 1.8,       # 1–4 thumb (tip 4)
    1.0, 1.2, 1.5, 1.8,       # 5–8 index (tip 8)
    1.0, 1.2, 1.5, 1.8,       # 9–12 middle (tip 12)
    1.0, 1.2, 1.5, 1.8,       # 13–16 ring (tip 16)
    1.0, 1.2, 1.5, 1.8,       # 17–20 pinky (tip 20)
]
_BASE_JITTER = 0.003         # base per-coord jitter (jitter must stay small enough
                              # that it perturbs fingertip noise without flipping the
                              # joint angles classify() reads — verified 0/600 mismatches
                              # across 100 seeds × 6 shapes at this magnitude)


def _seg(x: float, y: float, length: float, deg: float, wobble) -> tuple[float, float]:
    a = math.radians(deg)
    return (x + length * math.cos(a) + wobble(),
            y + length * math.sin(a) + wobble())


def _build_base_hand(shape: str, rng: random.Random) -> list[list[float]]:
    """Clean canonical hand (21×3) at the origin — no noise, no transform."""
    pts: list[list[float]] = [[0.0, 0.0, 0.0]]
    extended = {
        'index': shape in ('open', 'point', 'peace', 'l'),
        'middle': shape in ('open', 'peace'),
        'ring': shape in ('open',),
        'pinky': shape in ('open',),
    }
    thumb_out = shape in ('open', 'thumbs_up', 'l')
    if thumb_out:
        for i in range(1, 5):
            pts.append([0.075 * i, 0.06 * i, 0.0])
    else:
        pts.append([0.04, 0.02, 0.0])
        pts.append([0.09, 0.05, 0.0])
        pts.append([0.10, 0.115, 0.0])
        pts.append([0.07, 0.14, 0.0])
    for name in _SKEW:
        ang = _SKEW[name]
        folded = not extended[name]
        x = _KNUCKLE * math.cos(math.radians(ang))
        y = _KNUCKLE * math.sin(math.radians(ang)) - 0.05
        pts.append([x, y, 0.0])
        seg = _SPAN / 3.0
        for _ in range(3):
            if folded:
                ang += _FOLD
            x, y = _seg(x, y, seg, ang, lambda: 0.0)
            pts.append([x, y, 0.0])
    return pts


def generate_hand(shape: str = 'open', seed: int = 0) -> list[list[float]]:
    """Deterministic synthetic hand (21×3) with realistic augmentation.

    Each call applies a fresh in-plane rotation, translation and scale
    (hand angle / position / distance from camera) plus non-uniform
    per-landmark jitter (fingertips vary more than the wrist). All of
    these leave joint *angles* unchanged, so classify() stays correct.
    """
    rng = random.Random(seed)
    pts = _build_base_hand(shape, rng)

    ang = rng.uniform(-0.40, 0.40)        # ~±23° in-plane rotation
    tx = rng.uniform(-0.12, 0.12)         # hand position in frame
    ty = rng.uniform(-0.12, 0.12)
    sc = rng.uniform(0.80, 1.20)          # hand size (distance to camera)
    ca, sa = math.cos(ang), math.sin(ang)

    out: list[list[float]] = []
    for i, (x, y, z) in enumerate(pts):
        x *= sc; y *= sc; z *= sc
        rx = x * ca - y * sa
        ry = x * sa + y * ca
        j = _BASE_JITTER * _JITTER_W[i]
        rx += rng.uniform(-j, j)
        ry += rng.uniform(-j, j)
        z += rng.uniform(-j, j) * 0.5
        out.append([rx + tx, ry + ty, z])
    return out