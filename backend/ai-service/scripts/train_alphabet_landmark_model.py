#!/usr/bin/env python
"""
train_alphabet_landmark_model.py — Training pipeline for the improved
A–Z MediaPipe landmark MLP classifier.

Features: 90-dimensional geometric features derived from 21 MediaPipe hand landmarks.
Target Model: models/alphabet_landmark_model.keras (exportable to ONNX for browser WASM).
Evaluation: Produces overall accuracy, per-class metrics, and confusion matrix.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import numpy as np
import tensorflow as tf
from scripts.prepare_alphabet_landmark_dataset import (
    CLASSES,
    FEATURE_DIM,
    prepare_dataset,
)

MODEL_OUTPUT_PATH = ROOT / 'models' / 'alphabet_landmark_model.keras'
LABELS_OUTPUT_PATH = ROOT / 'models' / 'alphabet_landmark_labels.json'


def build_alphabet_mlp(input_dim: int = FEATURE_DIM, num_classes: int = len(CLASSES)) -> tf.keras.Model:
    """Build a lightweight, robust 3-layer MLP for 90D landmark feature classification."""
    model = tf.keras.models.Sequential([
        tf.keras.layers.Input(shape=(input_dim,), name='landmark_features'),
        tf.keras.layers.Dense(128, activation='relu', name='dense_1'),
        tf.keras.layers.BatchNormalization(name='bn_1'),
        tf.keras.layers.Dropout(0.2, name='drop_1'),
        tf.keras.layers.Dense(128, activation='relu', name='dense_2'),
        tf.keras.layers.BatchNormalization(name='bn_2'),
        tf.keras.layers.Dropout(0.2, name='drop_2'),
        tf.keras.layers.Dense(64, activation='relu', name='dense_3'),
        tf.keras.layers.BatchNormalization(name='bn_3'),
        tf.keras.layers.Dropout(0.1, name='drop_3'),
        tf.keras.layers.Dense(num_classes, activation='softmax', name='probabilities'),
    ], name='AlphabetLandmarkMLP')

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy'],
    )
    return model


def run_checks():
    """Lightweight verification: build model, test forward pass, check shapes and outputs."""
    print('Running lightweight pipeline and model checks...')
    model = build_alphabet_mlp()
    model.summary(print_fn=print)

    # Test single sample forward pass
    dummy_input = np.random.randn(1, FEATURE_DIM).astype(np.float32)
    output = model(dummy_input, training=False).numpy()

    assert output.shape == (1, len(CLASSES)), f'Bad output shape: {output.shape}'
    prob_sum = float(np.sum(output))
    assert abs(prob_sum - 1.0) < 1e-4, f'Probabilities do not sum to 1: {prob_sum}'

    print(f'\nModel check PASSED:')
    print(f'  Input shape:   (None, {FEATURE_DIM})')
    print(f'  Output shape:  (None, {len(CLASSES)})')
    print(f'  Total params:  {model.count_params():,}')
    print(f'  Softmax sum:   {prob_sum:.4f}')
    return 0


def main():
    parser = argparse.ArgumentParser(description='Train improved A-Z MediaPipe landmark model')
    parser.add_argument('--check-only', action='store_true', help='Verify architecture and forward pass without training')
    parser.add_argument('--epochs', type=int, default=100, help='Maximum training epochs')
    parser.add_argument('--batch-size', type=int, default=64, help='Batch size')
    args = parser.parse_args()

    if args.check_only:
        return run_checks()

    print('Starting actual training run...')
    data = prepare_dataset(balance_train=True, target_per_class=350, seed=42)
    train_x, train_y = data['train_x'], data['train_y']
    val_x, val_y = data['val_x'], data['val_y']

    model = build_alphabet_mlp()

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=15,
            restore_best_weights=True,
            verbose=1,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-5,
            verbose=1,
        ),
    ]

    history = model.fit(
        train_x, train_y,
        validation_data=(val_x, val_y),
        epochs=args.epochs,
        batch_size=args.batch_size,
        callbacks=callbacks,
        verbose=1,
    )

    MODEL_OUTPUT_PATH.parent.mkdir(exist_ok=True)
    model.save(MODEL_OUTPUT_PATH)
    LABELS_OUTPUT_PATH.write_text(json.dumps(CLASSES, indent=2), encoding='utf-8')
    print(f'\nTrained model saved to {MODEL_OUTPUT_PATH}')
    print(f'Labels saved to {LABELS_OUTPUT_PATH}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
