#!/usr/bin/env python
"""
expand_del_orientations.py — Expand DEL dataset with realistic hand orientations.
Enables robust DEL recognition across natural upright fingerspelling and angled postures.
"""
from __future__ import annotations

import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / 'data'


def rotation_matrix_3d(roll_deg: float, pitch_deg: float = 0.0, yaw_deg: float = 0.0) -> np.ndarray:
    """Generate 3D rotation matrix for roll (z-axis), pitch (x-axis), and yaw (y-axis)."""
    rz = np.radians(roll_deg)
    rx = np.radians(pitch_deg)
    ry = np.radians(yaw_deg)

    R_z = np.array([
        [np.cos(rz), -np.sin(rz), 0],
        [np.sin(rz),  np.cos(rz), 0],
        [0,           0,          1]
    ])
    R_x = np.array([
        [1, 0,           0],
        [0, np.cos(rx), -np.sin(rx)],
        [0, np.sin(rx),  np.cos(rx)]
    ])
    R_y = np.array([
        [ np.cos(ry), 0, np.sin(ry)],
        [ 0,          1, 0],
        [-np.sin(ry), 0, np.cos(ry)]
    ])
    return R_z @ R_y @ R_x


def main():
    X = np.load(DATA_DIR / 'asl_X.npy')
    y = np.load(DATA_DIR / 'asl_y.npy')
    print(f"Loaded existing data: X={X.shape}, y={y.shape}")

    del_indices = np.where(y == 26)[0]
    del_samples = X[del_indices, 0].reshape(-1, 21, 3)
    existing_del_count = len(del_samples)
    print(f"Existing DEL sample count: {existing_del_count}")

    # For each DEL sample, the original vector is ~70-75 degrees from vertical.
    # To bring it towards natural upright (angle ~0-20 from vertical), we rotate by +50 to +80 degrees.
    # To bring it towards intermediate angles (~30-50 from vertical), we rotate by +25 to +50 degrees.
    # To add pitch/yaw (3D camera perspective variation), we add +/- 10-15 degrees in pitch and yaw.

    rng = np.random.default_rng(seed=42)
    new_del_frames = []
    orientation_bins = {
        'upright (< 30 deg)': 0,
        'moderate tilt (30-60 deg)': 0,
        'horizontal (> 60 deg)': existing_del_count,
    }

    # Group 1: Natural Upright Orientation (target angle ~5° to 30° from vertical)
    # Rotation delta: ~+50° to +75°
    upright_targets = 240
    picks_1 = rng.choice(len(del_samples), size=upright_targets, replace=True)
    for idx in picks_1:
        pts = del_samples[idx].copy()
        wrist = pts[0].copy()
        rel = pts - wrist
        roll = rng.uniform(55.0, 75.0)
        pitch = rng.uniform(-10.0, 10.0)
        yaw = rng.uniform(-10.0, 10.0)
        R = rotation_matrix_3d(roll, pitch, yaw)
        rot_pts = (rel @ R.T) + wrist
        # Subtly scale (+/- 3%)
        rot_pts = rot_pts * rng.uniform(0.97, 1.03)
        new_del_frames.append(rot_pts)
        orientation_bins['upright (< 30 deg)'] += 1

    # Group 2: Relaxed Angled Orientation (target angle ~30° to 55° from vertical)
    # Rotation delta: ~+25° to +45°
    angled_targets = 180
    picks_2 = rng.choice(len(del_samples), size=angled_targets, replace=True)
    for idx in picks_2:
        pts = del_samples[idx].copy()
        wrist = pts[0].copy()
        rel = pts - wrist
        roll = rng.uniform(25.0, 48.0)
        pitch = rng.uniform(-12.0, 12.0)
        yaw = rng.uniform(-12.0, 12.0)
        R = rotation_matrix_3d(roll, pitch, yaw)
        rot_pts = (rel @ R.T) + wrist
        rot_pts = rot_pts * rng.uniform(0.97, 1.03)
        new_del_frames.append(rot_pts)
        orientation_bins['moderate tilt (30-60 deg)'] += 1

    # Group 3: Perspective & Camera Distance Variants (pitch/yaw variations of natural angles)
    persp_targets = 100
    picks_3 = rng.choice(len(del_samples), size=persp_targets, replace=True)
    for idx in picks_3:
        pts = del_samples[idx].copy()
        wrist = pts[0].copy()
        rel = pts - wrist
        roll = rng.uniform(35.0, 65.0)
        pitch = rng.uniform(-18.0, 18.0)
        yaw = rng.uniform(-18.0, 18.0)
        R = rotation_matrix_3d(roll, pitch, yaw)
        rot_pts = (rel @ R.T) + wrist
        rot_pts = rot_pts * rng.uniform(0.95, 1.05)
        new_del_frames.append(rot_pts)
        # Check angle
        v = rot_pts[9] - rot_pts[0]
        v /= (np.linalg.norm(v) + 1e-6)
        ang = np.degrees(np.arccos(np.clip(np.dot(v, [0, -1, 0]), -1, 1)))
        if ang < 30:
            orientation_bins['upright (< 30 deg)'] += 1
        elif ang < 60:
            orientation_bins['moderate tilt (30-60 deg)'] += 1
        else:
            orientation_bins['horizontal (> 60 deg)'] += 1

    new_del_samples = np.stack(new_del_frames).astype(np.float32)
    # Tile across WINDOW=12
    WINDOW = 12
    new_del_seqs = np.repeat(new_del_samples[:, np.newaxis, :, :], WINDOW, axis=1).reshape(-1, WINDOW, 63)
    new_del_y = np.full(len(new_del_samples), 26, dtype=np.int32)

    total_new_del = len(new_del_samples)
    print(f"Generated {total_new_del} new orientation-diverse DEL samples.")
    print("DEL Samples by Orientation:")
    for b_name, b_count in orientation_bins.items():
        print(f"  {b_name:30s}: {b_count:4d} samples")

    merged_X = np.concatenate([X, new_del_seqs], axis=0)
    merged_y = np.concatenate([y, new_del_y], axis=0)
    print(f"\nFinal dataset shape: X={merged_X.shape}, y={merged_y.shape}")

    np.save(DATA_DIR / 'asl_X.npy', merged_X)
    np.save(DATA_DIR / 'asl_y.npy', merged_y)

    # Update dataset_info.json
    info_path = DATA_DIR / 'dataset_info.json'
    if info_path.exists():
        with open(info_path) as f:
            info = json.load(f)
        info['total_samples'] = int(len(merged_X))
        info['samples_per_class']['DEL'] = int(np.sum(merged_y == 26))
        with open(info_path, 'w') as f:
            json.dump(info, f, indent=2)

    print(f"Updated DEL count in dataset: {np.sum(merged_y == 26)}")
    print("Dataset updated successfully.")


if __name__ == '__main__':
    main()
