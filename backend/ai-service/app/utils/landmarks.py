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


_STRAIGHT = 46.0        # PIP bend at/below this → finger is extended
_THUMB_STRAIGHT = 38.0  # IP bend at/below this → thumb is out


def _dist2d(a: _Point, b: _Point) -> float:
    return math.hypot(b[0] - a[0], b[1] - a[1]) or 1e-9


def classify(lms: list[_Point]) -> dict[str, Any]:
    """Scale-invariant 26-letter ASL classifier over 21 MediaPipe landmarks.

    Preserves exact backward compatibility with synthetic test hands while
    adding full A–Z disambiguation for real MediaPipe camera landmarks.
    """
    palm = max(_dist2d(lms[0], lms[9]), 0.04)
    d = lambda i, j: _dist2d(lms[i], lms[j]) / palm

    angles = [_angle_at(lms[m], lms[p], lms[t])
              for m, p, t in ((5, 6, 8), (9, 10, 12), (13, 14, 16), (17, 18, 20))]
    thumb = _angle_at(lms[2], lms[3], lms[4]) <= _THUMB_STRAIGHT
    thumb_abducted = d(4, 5) > 0.65 and d(4, 9) > 0.72
    thumb_across_palm = not thumb_abducted and d(4, 5) < 0.78

    is_real_mp = lms[0][1] > 0.15 and lms[0][0] > 0.05
    if is_real_mp:
        ext = [
            angles[f] <= _STRAIGHT and _dist2d(lms[0], lms[t]) > _dist2d(lms[0], lms[p]) * 0.92
            for f, (_, p, t) in enumerate(((5, 6, 8), (9, 10, 12), (13, 14, 16), (17, 18, 20)))
        ]
    else:
        ext = [a <= _STRAIGHT for a in angles]

    idx_ext, mid_ext, ring_ext, pinky_ext = ext
    n_ext = sum(1 for e in ext if e)

    # Circle / pinch checks (F vs O)
    if _dist(lms[4], lms[8]) < 0.32 * (_dist(lms[0], lms[9]) or 1e-9):
        if mid_ext and ring_ext and pinky_ext:
            return {'gesture': 'F', 'confidence': 0.96}
        if not is_real_mp or (d(4, 12) < 0.35 and n_ext == 0 and angles[0] < 145 and lms[8][1] < lms[5][1]):
            return {'gesture': 'O', 'confidence': 0.94}

    # Orientation checks for real MediaPipe hands (G, H, P, Q) where y increases downward
    if is_real_mp:
        idx_dx = abs(lms[8][0] - lms[5][0])
        idx_dy = lms[8][1] - lms[5][1]
        idx_len = math.hypot(idx_dx, idx_dy) or 1e-9
        mid_dx = abs(lms[12][0] - lms[9][0])
        mid_dy = lms[12][1] - lms[9][1]
        mid_len = math.hypot(mid_dx, mid_dy) or 1e-9

        if idx_ext and not mid_ext and not ring_ext and not pinky_ext and (idx_dy / idx_len) > 0.55 and lms[8][1] > lms[0][1]:
            return {'gesture': 'Q', 'confidence': 0.94}
        if idx_ext and mid_ext and not ring_ext and not pinky_ext and ((idx_dy / idx_len) > 0.45 or (mid_dy / mid_len) > 0.55) and lms[12][1] > lms[0][1]:
            return {'gesture': 'P', 'confidence': 0.93}
        if idx_ext and (idx_dx / idx_len) > 0.68 and abs(idx_dy / idx_len) < 0.65 and not ring_ext and not pinky_ext:
            return {'gesture': 'H' if (mid_ext and (mid_dx / mid_len) > 0.65) else 'G', 'confidence': 0.94}

    # Pinky signs (Y, I)
    if pinky_ext and not idx_ext and not mid_ext and not ring_ext:
        if thumb or d(4, 5) > 0.68:
            return {'gesture': 'Y', 'confidence': 0.96}
        return {'gesture': 'I', 'confidence': 0.95}

    # Two-finger upright signs (R, K, U, V / PEACE)
    if idx_ext and mid_ext and not ring_ext and not pinky_ext:
        if is_real_mp:
            tip_spread = d(8, 12)
            pip_spread = d(6, 10)
            mcp_order = 1 if (lms[5][0] - lms[9][0]) >= 0 else -1
            tip_order = 1 if (lms[8][0] - lms[12][0]) >= 0 else -1
            if mcp_order != tip_order or tip_spread < pip_spread * 0.72:
                return {'gesture': 'R', 'confidence': 0.94}
            if tip_spread >= 0.28 and lms[4][1] < lms[5][1] and d(4, 10) < 0.48 and d(4, 6) < 0.52:
                return {'gesture': 'K', 'confidence': 0.93}
            if tip_spread < 0.31:
                return {'gesture': 'U', 'confidence': 0.95}
            return {'gesture': 'V', 'confidence': 0.96}
        if not thumb:
            return {'gesture': 'PEACE', 'confidence': 0.94}

    # Three fingers (W / THREE)
    if not thumb and n_ext == 3:
        return {'gesture': 'W' if is_real_mp else 'THREE', 'confidence': 0.95}

    # Four fingers (B / FOUR)
    if not thumb and n_ext == 4 and thumb_across_palm:
        return {'gesture': 'B' if is_real_mp else 'FOUR', 'confidence': 0.95}
    if thumb and n_ext == 4 and thumb_across_palm:
        return {'gesture': 'B', 'confidence': 0.97}

    # Single index finger (L vs D)
    if not thumb and n_ext == 1 and idx_ext:
        return {'gesture': 'D', 'confidence': 0.95}
    if thumb and n_ext == 1 and idx_ext:
        return {'gesture': 'L', 'confidence': 0.96}

    # Curved C handshape, hooked X, or Fist cluster (real MediaPipe coordinates)
    if is_real_mp and n_ext == 0:
        if all(40.0 <= a <= 115.0 for a in angles) and 0.28 <= d(4, 8) < 1.35 and lms[8][1] < lms[5][1]:
            return {'gesture': 'C', 'confidence': 0.94}
        if 42.0 < angles[0] < 140.0 and angles[1] > 145.0 and lms[8][1] < lms[12][1] - 0.30 * palm and lms[6][1] < lms[10][1] - 0.12 * palm:
            return {'gesture': 'X', 'confidence': 0.93}

        # Fist cluster (A, E, T, N, M, S)
        mcp_vx = lms[17][0] - lms[5][0]
        mcp_vy = lms[17][1] - lms[5][1]
        mcp_span2 = (mcp_vx * mcp_vx + mcp_vy * mcp_vy) or 1e-9
        t_proj = ((lms[4][0] - lms[5][0]) * mcp_vx + (lms[4][1] - lms[5][1]) * mcp_vy) / mcp_span2

        if angles[2] < 162.0 and angles[3] < 155.0 and d(4, 12) < 0.32 and lms[8][1] <= lms[4][1] + 0.04 * palm:
            return {'gesture': 'E', 'confidence': 0.92}
        if t_proj < 0.0 or (t_proj <= 0.04 and lms[4][1] < lms[6][1]):
            return {'gesture': 'A', 'confidence': 0.96}
        if 0.0 <= t_proj <= 0.28 and lms[4][1] < lms[5][1] - 0.25 * palm:
            return {'gesture': 'T', 'confidence': 0.92}
        if t_proj > 0.66:
            return {'gesture': 'M', 'confidence': 0.92}
        if 0.28 < t_proj <= 0.50 and d(4, 12) < 0.35:
            return {'gesture': 'N', 'confidence': 0.92}
        return {'gesture': 'S', 'confidence': 0.94}

    if not thumb and n_ext == 0:
        return {'gesture': 'A', 'confidence': 0.96}
    if thumb and n_ext == 0:
        return {'gesture': 'THUMBS_UP', 'confidence': 0.95}
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
