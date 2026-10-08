#!/usr/bin/env python
"""
prepare_alphabet_landmark_dataset.py — Feature engineering and dataset preparation
for the improved A–Z MediaPipe landmark model.

Extracts a rich 90-dimensional geometric feature representation directly from 21 MediaPipe
(x, y, z) hand landmarks, preserving 3D depth and computing explicit finger joint angles,
curl ratios, thumb relationships, and palm orientation vectors.

Stratified split: 70% train, 15% validation, 15% test (seed=42).
Augmentation/balancing applied strictly to the training split only.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import numpy as np
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / 'data'

FEATURE_DIM = 90
CLASSES = [chr(c) for c in range(ord('A'), ord('Z') + 1)]


def extract_features(raw_landmarks: np.ndarray) -> np.ndarray:
    """Extract a 90-dimensional geometric feature vector from 21 hand landmarks.

    Args:
        raw_landmarks: shape (21, 3) or (63,) array of [x, y, z] coordinates.

    Returns:
        np.ndarray of shape (90,) with float32 values.
    """
    pts = np.asarray(raw_landmarks, dtype=np.float32).reshape(21, 3)

    # 1. Translation Invariance: center hand at wrist (landmark 0)
    wrist = pts[0]
    rel = pts - wrist

    # 2. Scale Invariance: normalize by palm extent (wrist to middle MCP, landmark 9)
    # or maximum radius from wrist
    palm_dist = float(np.linalg.norm(rel[9]))
    max_dist = float(np.max(np.linalg.norm(rel, axis=1)))
    scale = max(palm_dist, max_dist, 1e-6)
    norm_pts = rel / scale  # (21, 3)

    # Base normalized coordinates: 21 * 3 = 63 features
    coords = norm_pts.flatten()

    # 3. Finger Curl Ratios & Joint Angles (5 + 5 = 10 features)
    finger_indices = [
        (1, 2, 3, 4),     # Thumb: CMC, MCP, IP, Tip
        (5, 6, 7, 8),     # Index: MCP, PIP, DIP, Tip
        (9, 10, 11, 12),  # Middle: MCP, PIP, DIP, Tip
        (13, 14, 15, 16), # Ring: MCP, PIP, DIP, Tip
        (17, 18, 19, 20), # Pinky: MCP, PIP, DIP, Tip
    ]

    curls = []
    angles = []
    for mcp, pip, dip, tip in finger_indices:
        bone1 = np.linalg.norm(norm_pts[pip] - norm_pts[mcp])
        bone2 = np.linalg.norm(norm_pts[dip] - norm_pts[pip])
        bone3 = np.linalg.norm(norm_pts[tip] - norm_pts[dip])
        total_bone_len = max(float(bone1 + bone2 + bone3), 1e-6)
        tip_span = float(np.linalg.norm(norm_pts[tip] - norm_pts[mcp]))
        curls.append(tip_span / total_bone_len)

        # Joint angle at PIP: vector MCP->PIP vs PIP->DIP
        v1 = norm_pts[pip] - norm_pts[mcp]
        v2 = norm_pts[dip] - norm_pts[pip]
        norm_product = float(np.linalg.norm(v1) * np.linalg.norm(v2)) + 1e-6
        cos_ang = float(np.dot(v1, v2)) / norm_product
        angles.append(np.clip(cos_ang, -1.0, 1.0))

    curls = np.array(curls, dtype=np.float32)
    angles = np.array(angles, dtype=np.float32)

    # 4. Thumb Relationships (9 distances + 1 relative depth = 10 features)
    # Distinguishes A vs M vs N vs S vs T
    thumb_tip = norm_pts[4]
    thumb_dists = [
        float(np.linalg.norm(thumb_tip - norm_pts[5])),   # Thumb tip -> Index MCP
        float(np.linalg.norm(thumb_tip - norm_pts[6])),   # Thumb tip -> Index PIP
        float(np.linalg.norm(thumb_tip - norm_pts[8])),   # Thumb tip -> Index Tip
        float(np.linalg.norm(thumb_tip - norm_pts[10])),  # Thumb tip -> Middle PIP (separates T vs N)
        float(np.linalg.norm(thumb_tip - norm_pts[12])),  # Thumb tip -> Middle Tip
        float(np.linalg.norm(thumb_tip - norm_pts[14])),  # Thumb tip -> Ring PIP (separates N vs M)
        float(np.linalg.norm(thumb_tip - norm_pts[16])),  # Thumb tip -> Ring Tip
        float(np.linalg.norm(thumb_tip - norm_pts[18])),  # Thumb tip -> Pinky PIP
        float(np.linalg.norm(thumb_tip - norm_pts[20])),  # Thumb tip -> Pinky Tip
    ]

    # Thumb z-depth relative to average finger z-depth (positive = behind, negative = in front)
    finger_mean_z = float(np.mean([norm_pts[8, 2], norm_pts[12, 2], norm_pts[16, 2], norm_pts[20, 2]]))
    thumb_rel_z = np.array([thumb_tip[2] - finger_mean_z], dtype=np.float32)

    # 5. Inter-fingertip Distances (4 features)
    inter_tips = [
        float(np.linalg.norm(norm_pts[8] - norm_pts[12])),   # Index Tip -> Middle Tip
        float(np.linalg.norm(norm_pts[12] - norm_pts[16])),  # Middle Tip -> Ring Tip
        float(np.linalg.norm(norm_pts[16] - norm_pts[20])),  # Ring Tip -> Pinky Tip
        float(np.linalg.norm(norm_pts[4] - norm_pts[20])),   # Thumb Tip -> Pinky Tip
    ]

    # 6. Hand Orientation Unit Vector (Wrist -> Middle MCP) (3 features)
    # Preserves pointing orientation: separates G (horizontal) vs Q (downward) vs P (angled)
    v_axis = norm_pts[9]
    u_axis = v_axis / max(float(np.linalg.norm(v_axis)), 1e-6)

    features = np.concatenate([
        coords,                                   # 63
        curls,                                    # 5
        angles,                                   # 5
        np.array(thumb_dists, dtype=np.float32),  # 9
        thumb_rel_z,                              # 1
        np.array(inter_tips, dtype=np.float32),   # 4
        u_axis.astype(np.float32),                # 3
    ])

    assert len(features) == FEATURE_DIM, f'Expected {FEATURE_DIM} features, got {len(features)}'
    return features.astype(np.float32)


def augment_landmarks(landmarks_21x3: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """Apply mild, physically realistic 3D jitter to landmarks for minority class balancing."""
    pts = landmarks_21x3.copy()
    # 1. Subtle scaling (+/- 3%)
    scale = rng.uniform(0.97, 1.03)
    pts = pts * scale

    # 2. Subtle 3D noise (standard deviation 0.004)
    noise = rng.normal(0, 0.004, size=pts.shape).astype(np.float32)
    pts = pts + noise
    return pts


def prepare_dataset(balance_train: bool = True, target_per_class: int = 400, seed: int = 42):
    """Load raw dataset, perform 70/15/15 stratified split, and extract 90D features."""
    x_path = DATA_DIR / 'asl_X.npy'
    y_path = DATA_DIR / 'asl_y.npy'

    if not (x_path.exists() and y_path.exists()):
        raise FileNotFoundError(f'Raw dataset files not found at {DATA_DIR}')

    x_raw = np.load(x_path).astype(np.float32)
    y_raw = np.load(y_path).astype(np.int32)

    # Take first frame of repeated sequences: (N, 21, 3)
    raw_samples = x_raw[:, 0, :].reshape(-1, 21, 3)
    total_samples = len(raw_samples)

    # 1. Stratified Train / Val / Test Split: 70% / 15% / 15%
    indices = np.arange(total_samples)
    train_idx, temp_idx = train_test_split(
        indices, test_size=0.30, stratify=y_raw, random_state=seed
    )
    val_idx, test_idx = train_test_split(
        temp_idx, test_size=0.50, stratify=y_raw[temp_idx], random_state=seed
    )

    # 2. Extract features for Validation and Test (NEVER augmented, pure ground truth)
    val_features = np.stack([extract_features(raw_samples[i]) for i in val_idx])
    val_labels = y_raw[val_idx]

    test_features = np.stack([extract_features(raw_samples[i]) for i in test_idx])
    test_labels = y_raw[test_idx]

    # 3. Process Training Set with Controlled Minority Balancing
    rng = np.random.default_rng(seed)
    train_samples_list = []
    train_labels_list = []

    for class_idx in range(len(CLASSES)):
        class_mask = (y_raw[train_idx] == class_idx)
        class_sample_indices = train_idx[class_mask]
        current_count = len(class_sample_indices)

        for idx in class_sample_indices:
            train_samples_list.append(extract_features(raw_samples[idx]))
            train_labels_list.append(class_idx)

        # Augment minority classes in training set up to target_per_class
        if balance_train and current_count < target_per_class:
            needed = target_per_class - current_count
            picks = rng.choice(class_sample_indices, size=needed, replace=True)
            for idx in picks:
                aug_pts = augment_landmarks(raw_samples[idx], rng)
                train_samples_list.append(extract_features(aug_pts))
                train_labels_list.append(class_idx)

    train_features = np.stack(train_samples_list).astype(np.float32)
    train_labels = np.array(train_labels_list, dtype=np.int32)

    # Shuffle training set
    perm = rng.permutation(len(train_features))
    train_features = train_features[perm]
    train_labels = train_labels[perm]

    return {
        'train_x': train_features,
        'train_y': train_labels,
        'val_x': val_features,
        'val_y': val_labels,
        'test_x': test_features,
        'test_y': test_labels,
    }


def main():
    parser = argparse.ArgumentParser(description='Prepare A-Z MediaPipe landmark feature dataset')
    parser.add_argument('--verify-only', action='store_true', help='Perform verification checks without saving files')
    parser.add_argument('--save', action='store_true', help='Save prepared datasets to data/ directory')
    args = parser.parse_args()

    print(f'Checking dataset files in {DATA_DIR}...')
    x_path = DATA_DIR / 'asl_X.npy'
    y_path = DATA_DIR / 'asl_y.npy'
    if not (x_path.exists() and y_path.exists()):
        print(f'ERROR: dataset files missing in {DATA_DIR}')
        return 1

    x_raw = np.load(x_path, mmap_mode='r')
    y_raw = np.load(y_path)
    print(f'Loaded raw data: X shape={x_raw.shape}, y shape={y_raw.shape}')

    # Verify sample transformation across all 26 classes
    print('\nVerifying feature extraction on sample for each class (A–Z):')
    for label_idx, letter in enumerate(CLASSES):
        matches = np.where(y_raw == label_idx)[0]
        if len(matches) == 0:
            print(f'  Class {letter}: NO SAMPLES FOUND!')
            continue
        first_idx = matches[0]
        sample = x_raw[first_idx, 0].reshape(21, 3)
        feat = extract_features(sample)
        assert feat.shape == (FEATURE_DIM,), f'Class {letter} bad shape: {feat.shape}'
        assert not np.isnan(feat).any(), f'Class {letter} contains NaN!'
        print(f'  Class {letter} (sample #{first_idx}): features={feat.shape}, min={feat.min():.3f}, max={feat.max():.3f} [PASS]')

    print(f'\nAll 26 classes successfully transformed into {FEATURE_DIM}-dimensional feature vectors.')

    if args.save:
        print('\nProcessing and splitting full dataset...')
        data = prepare_dataset(balance_train=True, target_per_class=350, seed=42)
        out_file = DATA_DIR / 'alphabet_landmark_features.npz'
        np.savez_compressed(
            out_file,
            train_x=data['train_x'],
            train_y=data['train_y'],
            val_x=data['val_x'],
            val_y=data['val_y'],
            test_x=data['test_x'],
            test_y=data['test_y'],
            classes=CLASSES,
        )
        print(f'Saved prepared features to {out_file}:')
        print(f'  Train: {data["train_x"].shape}, labels: {data["train_y"].shape}')
        print(f'  Val:   {data["val_x"].shape}, labels: {data["val_y"].shape}')
        print(f'  Test:  {data["test_x"].shape}, labels: {data["test_y"].shape}')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
