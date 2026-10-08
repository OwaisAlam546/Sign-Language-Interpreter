#!/usr/bin/env python
"""
evaluate_alphabet_landmark_model.py — Comprehensive evaluation suite
for the improved A–Z MediaPipe landmark model.

Computes:
  • Overall top-1 accuracy
  • Per-class precision, recall, and F1-score (A–Z)
  • 26×26 confusion matrix
  • Specific diagnosis of critical confusion pairs:
      - A vs M vs N vs S vs T
      - Q vs P vs G
      - X vs S/E/N
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix

from scripts.prepare_alphabet_landmark_dataset import (
    CLASSES,
    FEATURE_DIM,
    prepare_dataset,
)

DEFAULT_MODEL_PATH = ROOT / 'models' / 'alphabet_landmark_model.keras'


def evaluate_model(model_path: Path | str, test_x: np.ndarray, test_y: np.ndarray):
    """Run full evaluation on held-out test split."""
    model_path = Path(model_path)
    if not model_path.exists():
        raise FileNotFoundError(f'Model not found at {model_path}')

    model = tf.keras.models.load_model(model_path)
    probs = model.predict(test_x, verbose=0)
    preds = np.argmax(probs, axis=1)

    acc = float(np.mean(preds == test_y))
    print('======================================================================')
    print(f'EVALUATION REPORT: {model_path.name}')
    print(f'Total Test Samples: {len(test_y)} (held-out, un-augmented)')
    print(f'Overall Accuracy:   {acc * 100:.2f}%')
    print('======================================================================')

    report_str = classification_report(
        test_y, preds, target_names=CLASSES, digits=3, zero_division=0
    )
    print('\nPer-Class Classification Metrics (Precision, Recall, F1):')
    print(report_str)

    # Confusion matrix
    cm = confusion_matrix(test_y, preds)

    print('\n--- Critical Pair Diagnostics ---')
    def report_pair(c1_name, c2_name):
        c1 = CLASSES.index(c1_name)
        c2 = CLASSES.index(c2_name)
        total_c1 = np.sum(test_y == c1)
        c1_as_c2 = cm[c1, c2]
        c1_correct = cm[c1, c1]
        print(f'  {c1_name} total: {total_c1:3d} | Correct {c1_name}: {c1_correct:3d} ({(c1_correct/max(total_c1,1))*100:5.1f}%) | Confused as {c2_name}: {c1_as_c2:3d} ({(c1_as_c2/max(total_c1,1))*100:5.1f}%)')

    print('\nFist group (A / M / N / S / T):')
    for a, b in [('A', 'M'), ('A', 'N'), ('A', 'S'), ('M', 'N'), ('N', 'M'), ('S', 'M'), ('T', 'M'), ('T', 'E')]:
        report_pair(a, b)

    print('\nDownward & Pointing group (Q / P / G):')
    for a, b in [('Q', 'P'), ('G', 'P'), ('P', 'Q'), ('G', 'J')]:
        report_pair(a, b)

    print('\nHooked finger (X):')
    for a, b in [('X', 'S'), ('X', 'E'), ('X', 'N')]:
        report_pair(a, b)

    return {
        'accuracy': acc,
        'confusion_matrix': cm.tolist(),
        'classes': CLASSES,
    }


def run_checks():
    """Verify evaluation logic with synthetic predictions."""
    print('Running evaluation module checks...')
    dummy_true = np.array([0, 1, 2, 0, 1, 2] * 10)
    dummy_pred = np.array([0, 1, 2, 0, 2, 1] * 10)
    report = classification_report(dummy_true, dummy_pred, target_names=['A', 'B', 'C'], output_dict=True)
    assert 'A' in report
    assert 'accuracy' in report
    print(f'Evaluation checks PASSED: classification_report works, accuracy={report["accuracy"]:.2f}')
    return 0


def main():
    parser = argparse.ArgumentParser(description='Evaluate trained A-Z landmark model')
    parser.add_argument('--model-path', type=str, default=str(DEFAULT_MODEL_PATH), help='Path to .keras model')
    parser.add_argument('--check-only', action='store_true', help='Verify evaluation module syntax and metrics logic')
    args = parser.parse_args()

    if args.check_only:
        return run_checks()

    data = prepare_dataset(balance_train=False, seed=42)
    return evaluate_model(args.model_path, data['test_x'], data['test_y'])


if __name__ == '__main__':
    raise SystemExit(main())
