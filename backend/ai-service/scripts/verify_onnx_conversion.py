#!/usr/bin/env python
"""
verify_onnx_conversion.py — Verification suite comparing Keras vs ONNX inference.

Loads:
  • backend/ai-service/models/alphabet_landmark_model.keras
  • backend/ai-service/models/alphabet_landmark_model.onnx

Evaluates on the exact 1,762 held-out test samples and computes:
  1. Prediction agreement percentage
  2. Maximum absolute probability difference
  3. Mean absolute probability difference
  4. Per-class agreement and verification for critical classes:
     A, M, N, S, T, Q, P, G, X
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import numpy as np
import onnx
import onnxruntime as ort
import tensorflow as tf
from scripts.prepare_alphabet_landmark_dataset import (
    CLASSES,
    FEATURE_DIM,
    prepare_dataset,
)

KERAS_PATH = ROOT / 'models' / 'alphabet_landmark_model.keras'
ONNX_PATH = ROOT / 'models' / 'alphabet_landmark_model.onnx'


def main():
    print('======================================================================')
    print('PHASE 5 STEP 1: ONNX CONVERSION AND NUMERICAL VERIFICATION')
    print('======================================================================')

    if not KERAS_PATH.exists():
        print(f'ERROR: Keras model not found at {KERAS_PATH}')
        return 1
    if not ONNX_PATH.exists():
        print(f'ERROR: ONNX model not found at {ONNX_PATH}')
        return 1

    # 1. Inspect ONNX model structure
    onnx_proto = onnx.load(str(ONNX_PATH))
    onnx.checker.check_model(onnx_proto)
    print('ONNX model integrity check: VALID')

    session = ort.InferenceSession(str(ONNX_PATH), providers=['CPUExecutionProvider'])
    input_info = session.get_inputs()[0]
    output_info = session.get_outputs()[0]

    print(f'\nONNX Tensor Specifications:')
    print(f'  Input Name:   {input_info.name}')
    print(f'  Input Shape:  {input_info.shape}')
    print(f'  Input Type:   {input_info.type}')
    print(f'  Output Name:  {output_info.name}')
    print(f'  Output Shape: {output_info.shape}')
    print(f'  Output Type:  {output_info.type}')

    # 2. Load Keras Model
    keras_model = tf.keras.models.load_model(str(KERAS_PATH))

    # 3. Load held-out test split (1,762 samples, seed=42)
    print('\nLoading held-out test dataset...')
    data = prepare_dataset(balance_train=False, seed=42)
    test_x = data['test_x']
    test_y = data['test_y']
    print(f'Test samples: {len(test_x)}, features: {test_x.shape[1]}')

    # 4. Run inference on both models
    print('Running inference on Keras model...')
    keras_probs = keras_model.predict(test_x, verbose=0)
    keras_preds = np.argmax(keras_probs, axis=1)

    print('Running inference on ONNX Runtime session...')
    onnx_probs = session.run([output_info.name], {input_info.name: test_x.astype(np.float32)})[0]
    onnx_preds = np.argmax(onnx_probs, axis=1)

    # 5. Numerical Agreement Metrics
    total_samples = len(test_y)
    agreements = np.sum(keras_preds == onnx_preds)
    agreement_pct = (agreements / total_samples) * 100.0

    abs_diff = np.abs(keras_probs - onnx_probs)
    max_diff = float(np.max(abs_diff))
    mean_diff = float(np.mean(abs_diff))

    keras_acc = (np.sum(keras_preds == test_y) / total_samples) * 100.0
    onnx_acc = (np.sum(onnx_preds == test_y) / total_samples) * 100.0

    print('\n======================================================================')
    print('PARITY COMPARISON RESULTS')
    print('======================================================================')
    print(f'Total Test Samples:             {total_samples}')
    print(f'Prediction Agreement:           {agreements}/{total_samples} ({agreement_pct:.4f}%)')
    print(f'Keras Test Accuracy:            {keras_acc:.2f}%')
    print(f'ONNX Test Accuracy:             {onnx_acc:.2f}%')
    print(f'Max Absolute Probability Diff:  {max_diff:.8f}')
    print(f'Mean Absolute Probability Diff: {mean_diff:.8f}')

    # 6. Critical Classes Verification
    critical_classes = ['A', 'M', 'N', 'S', 'T', 'Q', 'P', 'G', 'X']
    print('\n----------------------------------------------------------------------')
    print('CRITICAL CLASS VERIFICATION (A, M, N, S, T, Q, P, G, X)')
    print('----------------------------------------------------------------------')
    print(f'{"Class":<6} {"Count":<6} {"Keras Acc":<12} {"ONNX Acc":<12} {"Agreement":<12} {"Max Diff":<10}')
    print('-' * 60)

    critical_passed = True
    for cls_name in critical_classes:
        cls_idx = CLASSES.index(cls_name)
        mask = (test_y == cls_idx)
        n_samples = np.sum(mask)

        cls_k_preds = keras_preds[mask]
        cls_o_preds = onnx_preds[mask]
        cls_agreed = np.sum(cls_k_preds == cls_o_preds)
        cls_agree_pct = (cls_agreed / max(n_samples, 1)) * 100.0

        cls_k_correct = np.sum(cls_k_preds == cls_idx)
        cls_o_correct = np.sum(cls_o_preds == cls_idx)
        k_acc = (cls_k_correct / max(n_samples, 1)) * 100.0
        o_acc = (cls_o_correct / max(n_samples, 1)) * 100.0

        cls_max_diff = float(np.max(abs_diff[mask]))

        print(f'{cls_name:<6} {n_samples:<6} {k_acc:6.2f}% ({cls_k_correct}/{n_samples}) {o_acc:6.2f}% ({cls_o_correct}/{n_samples}) {cls_agree_pct:6.2f}%       {cls_max_diff:.6f}')

        if cls_agree_pct < 99.0:
            critical_passed = False

    print('----------------------------------------------------------------------')
    if agreement_pct >= 99.9 and critical_passed:
        print('STATUS: ONNX model verified with near-perfect numerical fidelity.')
        print('Ready for browser WASM integration in Step 2.')
        return 0
    else:
        print('WARNING: Material difference observed between Keras and ONNX predictions.')
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
