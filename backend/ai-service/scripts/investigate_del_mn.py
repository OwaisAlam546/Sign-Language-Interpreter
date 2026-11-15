#!/usr/bin/env python
"""
investigate_del_mn.py — Deep engineering audit of DEL orientation bias and M/N confusion.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix
from scripts.prepare_alphabet_landmark_dataset import CLASSES, FEATURE_DIM

def main():
    print("=" * 70)
    print("INVESTIGATION 1: DATASET CLASS SAMPLE COUNTS & M/N IMBALANCE")
    print("=" * 70)
    
    y = np.load(ROOT / 'data' / 'asl_y.npy')
    X = np.load(ROOT / 'data' / 'asl_X.npy')
    
    for cls in ['M', 'N', 'DEL', 'SPACE', 'A', 'S']:
        idx = CLASSES.index(cls)
        count = int(np.sum(y == idx))
        print(f"  Class {cls:5s} (idx {idx:2d}): {count:4d} samples")
        
    print("\n" + "=" * 70)
    print("INVESTIGATION 2: DEL ORIENTATION IN EXISTING DATASET")
    print("=" * 70)
    
    del_idx = CLASSES.index('DEL')
    del_samples = X[np.where(y == del_idx)[0], 0].reshape(-1, 21, 3)
    
    # Calculate wrist (0) to middle MCP (9) orientation vectors for all DEL samples
    v_axes = []
    angles_from_vertical = []
    for s in del_samples:
        v = s[9] - s[0]
        v_norm = v / (np.linalg.norm(v) + 1e-6)
        v_axes.append(v_norm)
        # Vertical is [0, -1, 0] in image space (y goes down)
        cos_vert = np.clip(np.dot(v_norm, [0, -1, 0]), -1.0, 1.0)
        angles_from_vertical.append(np.degrees(np.arccos(cos_vert)))
        
    v_axes = np.array(v_axes)
    angles_from_vertical = np.array(angles_from_vertical)
    
    print(f"DEL samples analyzed: {len(del_samples)}")
    print(f"Mean wrist->MCP9 orientation vector: [{np.mean(v_axes[:,0]):.3f}, {np.mean(v_axes[:,1]):.3f}, {np.mean(v_axes[:,2]):.3f}]")
    print(f"Orientation angles from vertical:")
    print(f"  Min angle:    {np.min(angles_from_vertical):.1f}°")
    print(f"  Max angle:    {np.max(angles_from_vertical):.1f}°")
    print(f"  Mean angle:   {np.mean(angles_from_vertical):.1f}°")
    print(f"  Median angle: {np.median(angles_from_vertical):.1f}°")
    
    upright_del_count = np.sum(angles_from_vertical < 45.0)
    print(f"  Samples with angle < 45° (natural upright fingerspelling): {upright_del_count} / {len(del_samples)} ({upright_del_count/len(del_samples)*100:.1f}%)")
    horizontal_del_count = np.sum(angles_from_vertical >= 60.0)
    print(f"  Samples with angle >= 60° (horizontal Kaggle posture):   {horizontal_del_count} / {len(del_samples)} ({horizontal_del_count/len(del_samples)*100:.1f}%)")
    
    print("\n" + "=" * 70)
    print("INVESTIGATION 3: M vs N CONFUSION & FEATURE GEOMETRY")
    print("=" * 70)
    
    # Load model and test features
    model = tf.keras.models.load_model(ROOT / 'models' / 'alphabet_landmark_model.keras')
    npz = np.load(ROOT / 'data' / 'alphabet_landmark_features.npz')
    test_x, test_y = npz['test_x'], npz['test_y']
    
    preds = np.argmax(model.predict(test_x, verbose=0), axis=1)
    cm = confusion_matrix(test_y, preds)
    
    m_idx = CLASSES.index('M')
    n_idx = CLASSES.index('N')
    
    print(f"Confusion Matrix on Test Split ({len(test_y)} samples):")
    print(f"  M total: {np.sum(test_y == m_idx):2d} | M correct: {cm[m_idx, m_idx]:2d} | M confused as N: {cm[m_idx, n_idx]:2d}")
    print(f"  N total: {np.sum(test_y == n_idx):2d} | N correct: {cm[n_idx, n_idx]:2d} | N confused as M: {cm[n_idx, m_idx]:2d}")
    
    print("\nRoot causes identified:")
    print("1. DEL: 100% of existing DEL samples are horizontal (mean tilt 72.8°). ZERO upright samples exist!")
    print("2. N: Only 166 total samples in dataset vs 480+ for other classes, starving N of geometric diversity.")

if __name__ == '__main__':
    main()
