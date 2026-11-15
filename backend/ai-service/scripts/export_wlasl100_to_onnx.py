#!/usr/bin/env python
"""
export_wlasl100_to_onnx.py — Export SignSpeak AI Phase 4 Keras GRU Word Recognition Model
to ONNX for browser deployment.

Input:
  backend/ai-service/models/wlasl100_gru/best_model.keras

Output:
  frontend/public/models/wlasl100_gru_25class.onnx
  frontend/public/models/wlasl100_gru_labels.json
  backend/ai-service/models/wlasl100_gru/wlasl100_gru_25class.onnx
"""

from __future__ import annotations

import os
import sys
import json
import shutil
import types
from pathlib import Path

# Protobuf compatibility shim
import google.protobuf
if not hasattr(google.protobuf, "runtime_version"):
    rv = types.ModuleType("google.protobuf.runtime_version")
    rv.ValidateProtobufRuntimeVersion = lambda *args, **kwargs: None
    rv.Domain = types.SimpleNamespace(PUBLIC=1)
    google.protobuf.runtime_version = rv
    sys.modules["google.protobuf.runtime_version"] = rv

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
import tensorflow as tf
import keras
import tf2onnx

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
KERAS_PATH = ROOT_DIR / "backend" / "ai-service" / "models" / "wlasl100_gru" / "best_model.keras"
LABELS_SRC = ROOT_DIR / "backend" / "ai-service" / "models" / "wlasl100_gru" / "class_labels.json"

ONNX_BACKEND_PATH = ROOT_DIR / "backend" / "ai-service" / "models" / "wlasl100_gru" / "wlasl100_gru_25class.onnx"
ONNX_FRONTEND_PATH = ROOT_DIR / "frontend" / "public" / "models" / "wlasl100_gru_25class.onnx"
LABELS_FRONTEND_PATH = ROOT_DIR / "frontend" / "public" / "models" / "wlasl100_gru_labels.json"

def main():
    print("=" * 80)
    print("SIGNSPEAK AI — PHASE 5: WLASL100 GRU ONNX CONVERSION")
    print("=" * 80)

    if not KERAS_PATH.exists():
        print(f"ERROR: Keras checkpoint not found at: {KERAS_PATH}")
        sys.exit(1)

    print(f"\n[1] Loading Keras model from {KERAS_PATH}...")
    model = keras.models.load_model(str(KERAS_PATH))
    model.summary()
    total_params = model.count_params()
    print(f"Model parameters: {total_params:,}")

    # Build serving function
    @tf.function
    def serve(sequence_input):
        return model(sequence_input, training=False)

    print("\n[2] Converting to ONNX (opset=17, dynamic batch size)...")
    input_signature = [
        tf.TensorSpec(shape=[None, 16, 147], dtype=tf.float32, name="sequence_input")
    ]

    ONNX_FRONTEND_PATH.parent.mkdir(parents=True, exist_ok=True)

    onnx_model, _ = tf2onnx.convert.from_function(
        serve,
        input_signature=input_signature,
        opset=17,
        output_path=str(ONNX_FRONTEND_PATH)
    )

    # Copy to backend model dir as well for backend archive
    shutil.copyfile(str(ONNX_FRONTEND_PATH), str(ONNX_BACKEND_PATH))
    print(f"\n[3] Saved ONNX models to:")
    print(f"  Frontend: {ONNX_FRONTEND_PATH} ({ONNX_FRONTEND_PATH.stat().st_size:,} bytes)")
    print(f"  Backend:  {ONNX_BACKEND_PATH} ({ONNX_BACKEND_PATH.stat().st_size:,} bytes)")

    # Copy class labels
    if LABELS_SRC.exists():
        shutil.copyfile(str(LABELS_SRC), str(LABELS_FRONTEND_PATH))
        print(f"  Labels:   {LABELS_FRONTEND_PATH}")
    else:
        print(f"WARNING: Source labels not found at {LABELS_SRC}")

    print("\nONNX conversion completed successfully.")

if __name__ == "__main__":
    main()
