#!/usr/bin/env python
"""
verify_keras_onnx_parity.py
Strict numerical and shape verification between Keras and ONNX models.
"""
from __future__ import annotations

import json
from pathlib import Path
import numpy as np
import tensorflow as tf
import onnxruntime as ort

ROOT = Path(__file__).resolve().parent.parent
KERAS_PATH = ROOT / 'models' / 'alphabet_landmark_model.keras'
ONNX_PATH = ROOT / 'models' / 'alphabet_landmark_model.onnx'
LABELS_PATH = ROOT / 'models' / 'alphabet_landmark_labels.json'
NPZ_PATH = ROOT / 'data' / 'alphabet_landmark_features.npz'


def main():
    print("======================================================================")
    print("KERAS vs ONNX NUMERICAL & SHAPE PARITY VERIFICATION (28 CLASSES)")
    print("======================================================================")

    # 1. Load labels
    labels = json.loads(LABELS_PATH.read_text(encoding='utf-8'))
    print(f"Loaded {len(labels)} labels from {LABELS_PATH.name}:")
    print(f"  First 5: {labels[:5]}")
    print(f"  Last 5:  {labels[-5:]}")
    assert len(labels) == 28, f"Expected 28 labels, got {len(labels)}"
    assert labels[26] == 'DEL', f"Expected labels[26] to be DEL, got {labels[26]}"
    assert labels[27] == 'SPACE', f"Expected labels[27] to be SPACE, got {labels[27]}"
    print("  [PASS] Labels vocabulary strictly matches 28 classes (A–Z, DEL, SPACE)")

    # 2. Check ONNX session shapes
    session = ort.InferenceSession(str(ONNX_PATH))
    input_info = session.get_inputs()[0]
    output_info = session.get_outputs()[0]
    print(f"\nONNX Model IO:")
    print(f"  Input:  name='{input_info.name}', shape={input_info.shape}, type={input_info.type}")
    print(f"  Output: name='{output_info.name}', shape={output_info.shape}, type={output_info.type}")
    assert input_info.shape[1] == 90, f"Expected input dim 90, got {input_info.shape[1]}"
    assert output_info.shape[1] == 28, f"Expected output dim 28, got {output_info.shape[1]}"
    print("  [PASS] ONNX tensor signature strictly matches [batch, 90] -> [batch, 28]")

    # 3. Load Keras model
    keras_model = tf.keras.models.load_model(str(KERAS_PATH))
    print(f"\nKeras Model:")
    print(f"  Input shape:  {keras_model.input_shape}")
    print(f"  Output shape: {keras_model.output_shape}")
    assert keras_model.input_shape[-1] == 90
    assert keras_model.output_shape[-1] == 28
    print("  [PASS] Keras tensor signature strictly matches (None, 90) -> (None, 28)")

    # 4. Parity test on held-out test split
    npz = np.load(NPZ_PATH)
    test_x = npz['test_x'].astype(np.float32)
    test_y = npz['test_y'].astype(np.int32)
    print(f"\nRunning parity evaluation over all {len(test_x)} held-out test samples...")

    keras_preds = keras_model.predict(test_x, verbose=0)
    onnx_preds = session.run([output_info.name], {input_info.name: test_x})[0]

    assert not np.isnan(keras_preds).any(), "NaN found in Keras outputs!"
    assert not np.isnan(onnx_preds).any(), "NaN found in ONNX outputs!"
    assert not np.isinf(keras_preds).any(), "Inf found in Keras outputs!"
    assert not np.isinf(onnx_preds).any(), "Inf found in ONNX outputs!"

    max_diff = float(np.max(np.abs(keras_preds - onnx_preds)))
    mean_diff = float(np.mean(np.abs(keras_preds - onnx_preds)))

    keras_classes = np.argmax(keras_preds, axis=1)
    onnx_classes = np.argmax(onnx_preds, axis=1)
    class_matches = int(np.sum(keras_classes == onnx_classes))
    agreement_rate = (class_matches / len(test_x)) * 100.0

    print(f"  Max absolute difference:  {max_diff:.6e}")
    print(f"  Mean absolute difference: {mean_diff:.6e}")
    print(f"  Class agreement rate:     {class_matches}/{len(test_x)} ({agreement_rate:.2f}%)")

    assert max_diff < 1e-4, f"Max difference {max_diff} exceeded tolerance 1e-4!"
    assert agreement_rate == 100.0, f"Agreement rate {agreement_rate}% is not 100%!"
    print("  [PASS] Mathematical and decision parity between Keras and ONNX is PERFECT")

    # 5. Targeted test for DEL and SPACE
    del_indices = np.where(test_y == 26)[0]
    space_indices = np.where(test_y == 27)[0]

    print(f"\nTargeted verification for new classes:")
    print(f"  Test samples for DEL:   {len(del_indices)}")
    print(f"  Test samples for SPACE: {len(space_indices)}")

    del_preds = onnx_classes[del_indices]
    space_preds = onnx_classes[space_indices]

    del_acc = (np.sum(del_preds == 26) / len(del_indices)) * 100.0
    space_acc = (np.sum(space_preds == 27) / len(space_indices)) * 100.0

    print(f"  ONNX DEL accuracy:   {np.sum(del_preds == 26)}/{len(del_indices)} ({del_acc:.2f}%)")
    print(f"  ONNX SPACE accuracy: {np.sum(space_preds == 27)}/{len(space_indices)} ({space_acc:.2f}%)")
    assert del_acc >= 95.0, f"DEL accuracy {del_acc}% is below threshold!"
    assert space_acc >= 95.0, f"SPACE accuracy {space_acc}% is below threshold!"

    print("\nALL VERIFICATIONS PASSED SUCCESSFULLY.")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
