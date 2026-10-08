#!/usr/bin/env python
"""
export_alphabet_landmark_to_onnx.py — Export trained Keras landmark model to ONNX.

Converts:
  backend/ai-service/models/alphabet_landmark_model.keras
to:
  backend/ai-service/models/alphabet_landmark_model.onnx
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import tensorflow as tf
import tf2onnx

KERAS_PATH = ROOT / 'models' / 'alphabet_landmark_model.keras'
ONNX_PATH = ROOT / 'models' / 'alphabet_landmark_model.onnx'


def main():
    if not KERAS_PATH.exists():
        print(f'ERROR: Keras model not found at {KERAS_PATH}')
        return 1

    print(f'Loading Keras model from {KERAS_PATH}...')
    model = tf.keras.models.load_model(str(KERAS_PATH))

    @tf.function
    def serve(landmark_features):
        return model(landmark_features, training=False)

    print(f'Converting to ONNX (opset=17)...')
    onnx_model, _ = tf2onnx.convert.from_function(
        serve,
        input_signature=[tf.TensorSpec(shape=[None, 90], dtype=tf.float32, name='landmark_features')],
        opset=17,
        output_path=str(ONNX_PATH),
    )

    print(f'Successfully exported ONNX model to: {ONNX_PATH}')
    print(f'ONNX file size: {ONNX_PATH.stat().st_size:,} bytes')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
