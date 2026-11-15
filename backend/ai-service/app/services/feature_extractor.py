# ─────────────────────────────────────────────────────────────
#  services/feature_extractor.py — 90D Geometric Feature Extractor
#  Implements exact mathematical parity with:
#    frontend/src/lib/alphabetLandmarkFeatures.js
#    backend/ai-service/scripts/prepare_alphabet_landmark_dataset.py
# ─────────────────────────────────────────────────────────────
from __future__ import annotations

import math
from typing import Any, Sequence
import numpy as np

from app.utils.envelope import ApiError

FEATURE_DIM = 90
FINGER_INDICES = [
    (1, 2, 3, 4),      # Thumb: CMC, MCP, IP, Tip
    (5, 6, 7, 8),      # Index: MCP, PIP, DIP, Tip
    (9, 10, 11, 12),   # Middle: MCP, PIP, DIP, Tip
    (13, 14, 15, 16),  # Ring: MCP, PIP, DIP, Tip
    (17, 18, 19, 20),  # Pinky: MCP, PIP, DIP, Tip
]
THUMB_JOINTS = [5, 6, 8, 10, 12, 14, 16, 18, 20]


def _clean_val(v: Any) -> float:
    try:
        f = float(v)
        return f if math.isfinite(f) else 0.0
    except (TypeError, ValueError):
        return 0.0


def parse_landmarks(landmarks: Any) -> np.ndarray:
    """Parse raw landmarks into a (21, 3) float32 numpy array.
    Supports:
      - (21, 3) nested list or ndarray
      - (63,) flat list or ndarray
      - list of 21 objects with .x, .y, .z or dicts {'x':..,'y':..,'z':..}
    Sanitizes non-finite values (NaN, +inf, -inf) to 0.0.
    """
    if landmarks is None:
        raise ApiError(400, 'INVALID_LANDMARKS', 'Landmarks cannot be None')

    # Case 1: numpy array
    if isinstance(landmarks, np.ndarray):
        if landmarks.size == 63:
            pts = np.nan_to_num(landmarks.astype(np.float32).reshape(21, 3), nan=0.0, posinf=0.0, neginf=0.0)
            return pts
        elif landmarks.ndim == 2 and landmarks.shape == (21, 3):
            pts = np.nan_to_num(landmarks.astype(np.float32), nan=0.0, posinf=0.0, neginf=0.0)
            return pts
        else:
            raise ApiError(400, 'INVALID_LANDMARKS', f'Expected 21x3 or 63 landmarks, got shape {landmarks.shape}')

    # Case 2: flat sequence of 63 numbers
    if isinstance(landmarks, Sequence) and len(landmarks) == 63 and not isinstance(landmarks[0], (list, dict, tuple)):
        pts = np.zeros((21, 3), dtype=np.float32)
        for i in range(21):
            pts[i, 0] = _clean_val(landmarks[i * 3])
            pts[i, 1] = _clean_val(landmarks[i * 3 + 1])
            pts[i, 2] = _clean_val(landmarks[i * 3 + 2])
        return pts

    # Case 3: sequence of 21 points
    if isinstance(landmarks, Sequence):
        if len(landmarks) < 21:
            raise ApiError(400, 'INVALID_LANDMARKS', f'Expected at least 21 landmarks, received {len(landmarks)}')
        pts = np.zeros((21, 3), dtype=np.float32)
        for i in range(21):
            item = landmarks[i]
            if isinstance(item, (list, tuple)) and len(item) >= 2:
                pts[i, 0] = _clean_val(item[0])
                pts[i, 1] = _clean_val(item[1])
                pts[i, 2] = _clean_val(item[2]) if len(item) > 2 else 0.0
            elif isinstance(item, dict):
                pts[i, 0] = _clean_val(item.get('x', 0.0))
                pts[i, 1] = _clean_val(item.get('y', 0.0))
                pts[i, 2] = _clean_val(item.get('z', 0.0))
            elif hasattr(item, 'x') and hasattr(item, 'y'):
                pts[i, 0] = _clean_val(getattr(item, 'x', 0.0))
                pts[i, 1] = _clean_val(getattr(item, 'y', 0.0))
                pts[i, 2] = _clean_val(getattr(item, 'z', 0.0))
            else:
                pts[i] = [0.0, 0.0, 0.0]
        return pts

    raise ApiError(400, 'INVALID_LANDMARKS', f'Unrecognized landmarks format: {type(landmarks)}')


def extract_alphabet_features(raw_landmarks: Any, is_left_hand: bool = False) -> np.ndarray:
    """Extracts the 90-dimensional geometric feature vector from 21 hand landmarks.

    Matches exact mathematical parity with:
      frontend/src/lib/alphabetLandmarkFeatures.js

    Args:
        raw_landmarks: 21x3 landmarks, 63 flat coordinates, or pre-extracted 90D vector.
        is_left_hand: if True, mirrors X coordinates about wrist to match right-hand distribution.

    Returns:
        np.ndarray: shape (90,) with float32 values.
    """
    # Passthrough if already 90D feature vector
    if isinstance(raw_landmarks, (list, tuple, np.ndarray)) and len(raw_landmarks) == FEATURE_DIM:
        if isinstance(raw_landmarks, np.ndarray) and raw_landmarks.ndim == 1:
            return np.nan_to_num(raw_landmarks.astype(np.float32), nan=0.0, posinf=0.0, neginf=0.0)
        clean = np.zeros(FEATURE_DIM, dtype=np.float32)
        for i in range(FEATURE_DIM):
            clean[i] = _clean_val(raw_landmarks[i])
        return clean

    pts = parse_landmarks(raw_landmarks)

    # 1. Translation Invariance: center at wrist (landmark 0)
    wx, wy, wz = pts[0, 0], pts[0, 1], pts[0, 2]
    rel = np.zeros((21, 3), dtype=np.float32)
    for i in range(21):
        rx = pts[i, 0] - wx
        rel[i, 0] = -rx if is_left_hand else rx
        rel[i, 1] = pts[i, 1] - wy
        rel[i, 2] = pts[i, 2] - wz

    # 2. Scale Invariance: normalize by palm extent (wrist to middle MCP, index 9) or max radius
    palm_dist = float(math.hypot(rel[9, 0], rel[9, 1], rel[9, 2]))
    max_dist = 0.0
    for i in range(21):
        d = float(math.hypot(rel[i, 0], rel[i, 1], rel[i, 2]))
        if d > max_dist:
            max_dist = d
    scale = max(palm_dist, max_dist, 1e-6)

    norm_pts = rel / scale  # (21, 3)

    out = np.zeros(FEATURE_DIM, dtype=np.float32)
    idx = 0

    # 1. Normalized 3D Coordinates: 63 features
    for i in range(21):
        out[idx] = norm_pts[i, 0]
        out[idx + 1] = norm_pts[i, 1]
        out[idx + 2] = norm_pts[i, 2]
        idx += 3

    # 2. Finger Curl Ratios & Joint Angles: 5 + 5 = 10 features
    for mcp, pip, dip, tip in FINGER_INDICES:
        # Bone lengths
        b1 = float(math.hypot(norm_pts[pip, 0] - norm_pts[mcp, 0], norm_pts[pip, 1] - norm_pts[mcp, 1], norm_pts[pip, 2] - norm_pts[mcp, 2]))
        b2 = float(math.hypot(norm_pts[dip, 0] - norm_pts[pip, 0], norm_pts[dip, 1] - norm_pts[pip, 1], norm_pts[dip, 2] - norm_pts[pip, 2]))
        b3 = float(math.hypot(norm_pts[tip, 0] - norm_pts[dip, 0], norm_pts[tip, 1] - norm_pts[dip, 1], norm_pts[tip, 2] - norm_pts[dip, 2]))
        total_bone_len = max(b1 + b2 + b3, 1e-6)
        tip_span = float(math.hypot(norm_pts[tip, 0] - norm_pts[mcp, 0], norm_pts[tip, 1] - norm_pts[mcp, 1], norm_pts[tip, 2] - norm_pts[mcp, 2]))
        out[idx] = tip_span / total_bone_len
        idx += 1

    for mcp, pip, dip, tip in FINGER_INDICES:
        # Joint angle at PIP
        v1x = norm_pts[pip, 0] - norm_pts[mcp, 0]
        v1y = norm_pts[pip, 1] - norm_pts[mcp, 1]
        v1z = norm_pts[pip, 2] - norm_pts[mcp, 2]

        v2x = norm_pts[dip, 0] - norm_pts[pip, 0]
        v2y = norm_pts[dip, 1] - norm_pts[pip, 1]
        v2z = norm_pts[dip, 2] - norm_pts[pip, 2]

        dot = v1x * v2x + v1y * v2y + v1z * v2z
        mag1 = math.hypot(v1x, v1y, v1z)
        mag2 = math.hypot(v2x, v2y, v2z)
        cos_ang = dot / (mag1 * mag2 + 1e-6)
        out[idx] = max(-1.0, min(1.0, cos_ang))
        idx += 1

    # 3. Thumb Relationships: 9 distances + 1 relative depth = 10 features
    for j in THUMB_JOINTS:
        out[idx] = float(math.hypot(norm_pts[4, 0] - norm_pts[j, 0], norm_pts[4, 1] - norm_pts[j, 1], norm_pts[4, 2] - norm_pts[j, 2]))
        idx += 1

    finger_mean_z = (norm_pts[8, 2] + norm_pts[12, 2] + norm_pts[16, 2] + norm_pts[20, 2]) / 4.0
    out[idx] = norm_pts[4, 2] - finger_mean_z
    idx += 1

    # 4. Inter-fingertip Spans: 4 features
    out[idx] = float(math.hypot(norm_pts[8, 0] - norm_pts[12, 0], norm_pts[8, 1] - norm_pts[12, 1], norm_pts[8, 2] - norm_pts[12, 2]))
    out[idx + 1] = float(math.hypot(norm_pts[12, 0] - norm_pts[16, 0], norm_pts[12, 1] - norm_pts[16, 1], norm_pts[12, 2] - norm_pts[16, 2]))
    out[idx + 2] = float(math.hypot(norm_pts[16, 0] - norm_pts[20, 0], norm_pts[16, 1] - norm_pts[20, 1], norm_pts[16, 2] - norm_pts[20, 2]))
    out[idx + 3] = float(math.hypot(norm_pts[4, 0] - norm_pts[20, 0], norm_pts[4, 1] - norm_pts[20, 1], norm_pts[4, 2] - norm_pts[20, 2]))
    idx += 4

    # 5. Hand Orientation Unit Vector: 3 features (wrist -> middle MCP, index 9)
    v_axis_x = norm_pts[9, 0]
    v_axis_y = norm_pts[9, 1]
    v_axis_z = norm_pts[9, 2]
    axis_mag = max(math.hypot(v_axis_x, v_axis_y, v_axis_z), 1e-6)

    out[idx] = v_axis_x / axis_mag
    out[idx + 1] = v_axis_y / axis_mag
    out[idx + 2] = v_axis_z / axis_mag
    idx += 3

    assert idx == FEATURE_DIM, f'Expected {FEATURE_DIM} features, calculated {idx}'
    return out
