#!/usr/bin/env python
"""
verify_wlasl100_parity.py — Numerical parity verification between Keras best_model
and exported ONNX Runtime model for all 584 WLASL100 sequences.
"""

import os
import sys
import json
from pathlib import Path
import numpy as np

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
import tensorflow as tf
import keras
import onnxruntime as ort

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
KERAS_PATH = ROOT_DIR / "backend" / "ai-service" / "models" / "wlasl100_gru" / "best_model.keras"
ONNX_PATH = ROOT_DIR / "frontend" / "public" / "models" / "wlasl100_gru_25class.onnx"
DATA_PATH = ROOT_DIR / "backend" / "ai-service" / "data" / "wlasl100_features_25class.npz"
PARITY_REPORT_PATH = ROOT_DIR / "backend" / "ai-service" / "models" / "wlasl100_gru" / "parity_verification_report.json"

def main():
    print("=" * 80)
    print("SIGNSPEAK AI — PHASE 5: KERAS VS ONNX RUNTIME NUMERICAL PARITY")
    print("=" * 80)

    # 1. Load Data
    print(f"\n[1] Loading dataset from {DATA_PATH}...")
    data = np.load(DATA_PATH, allow_pickle=True)
    X = data["X"].astype(np.float32) # (584, 16, 147)
    y = data["y"].astype(np.int64)
    glosses = data["glosses"]
    N = len(X)
    print(f"Loaded {N} feature sequences.")

    # 2. Load Models
    print(f"\n[2] Loading Keras model from {KERAS_PATH}...")
    keras_model = keras.models.load_model(str(KERAS_PATH))

    print(f"\n[3] Loading ONNX model from {ONNX_PATH}...")
    sess_opts = ort.SessionOptions()
    sess_opts.intra_op_num_threads = 1
    sess_opts.inter_op_num_threads = 1
    ort_session = ort.InferenceSession(str(ONNX_PATH), sess_opts, providers=["CPUExecutionProvider"])
    
    input_name = ort_session.get_inputs()[0].name
    output_name = ort_session.get_outputs()[0].name
    print(f"ONNX Input: {input_name} (shape: {ort_session.get_inputs()[0].shape})")
    print(f"ONNX Output: {output_name} (shape: {ort_session.get_outputs()[0].shape})")

    # 4. Batch Inference Parity
    print(f"\n[4] Running Batch Inference across all {N} sequences...")
    keras_batch_probs = keras_model.predict(X, batch_size=32, verbose=0)
    ort_batch_out = ort_session.run([output_name], {input_name: X})[0]

    abs_diff = np.abs(keras_batch_probs - ort_batch_out)
    max_abs_diff = float(np.max(abs_diff))
    mean_abs_diff = float(np.mean(abs_diff))

    keras_preds = np.argmax(keras_batch_probs, axis=1)
    ort_preds = np.argmax(ort_batch_out, axis=1)
    top1_agreement = float(np.mean(keras_preds == ort_preds))

    # Top-5 agreement
    top5_agreements = 0
    for k_row, o_row in zip(keras_batch_probs, ort_batch_out):
        k_top5 = set(np.argsort(k_row)[-5:])
        o_top5 = set(np.argsort(o_row)[-5:])
        if k_top5 == o_top5:
            top5_agreements += 1
    top5_agreement_rate = float(top5_agreements / N)

    # 5. Single-Sequence Inference Parity (to test dynamic batch=1)
    print(f"\n[5] Running Single-Sequence Inference (batch=1) for all {N} sequences...")
    single_diffs = []
    single_top1_agreements = 0
    for i in range(N):
        seq = X[i:i+1] # (1, 16, 147)
        k_prob = keras_model(seq, training=False).numpy()
        o_prob = ort_session.run([output_name], {input_name: seq})[0]
        single_diffs.append(np.max(np.abs(k_prob - o_prob)))
        if np.argmax(k_prob) == np.argmax(o_prob):
            single_top1_agreements += 1

    max_single_diff = float(np.max(single_diffs))
    mean_single_diff = float(np.mean(single_diffs))
    single_top1_rate = float(single_top1_agreements / N)

    # 6. Report
    print("\n" + "=" * 80)
    print("PARITY VERIFICATION METRICS")
    print("=" * 80)
    print(f"Total Sequences Tested:               {N}")
    print(f"Max Absolute Probability Difference:  {max_abs_diff:.8e}")
    print(f"Mean Absolute Probability Difference: {mean_abs_diff:.8e}")
    print(f"Top-1 Class Agreement:                {top1_agreement * 100:.4f}% ({np.sum(keras_preds == ort_preds)}/{N})")
    print(f"Top-5 Class Agreement:                {top5_agreement_rate * 100:.4f}% ({top5_agreements}/{N})")
    print(f"Single-Sequence (Batch=1) Top-1 Agr:  {single_top1_rate * 100:.4f}% ({single_top1_agreements}/{N})")
    print(f"Single-Sequence Max Abs Difference:   {max_single_diff:.8e}")
    print("=" * 80)

    # Threshold checks: max diff < 1e-4, Top-1 agreement = 100%
    parity_passed = bool(max_abs_diff < 1e-4 and top1_agreement == 1.0)
    print(f"\nOverall Numerical Parity Status: {'PASSED' if parity_passed else 'FAILED'}")

    report = {
        "timestamp": "2026-11-14T10:15:00Z",
        "total_sequences": N,
        "max_absolute_probability_difference": max_abs_diff,
        "mean_absolute_probability_difference": mean_abs_diff,
        "top1_agreement_rate": top1_agreement,
        "top5_agreement_rate": top5_agreement_rate,
        "single_sequence_top1_rate": single_top1_rate,
        "single_sequence_max_abs_difference": max_single_diff,
        "single_sequence_mean_abs_difference": mean_single_diff,
        "parity_passed": parity_passed,
        "keras_model_path": str(KERAS_PATH),
        "onnx_model_path": str(ONNX_PATH),
        "onnx_opset": 17,
        "tolerance_threshold": 1e-4,
    }

    with open(PARITY_REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Saved parity report to: {PARITY_REPORT_PATH}")

    if not parity_passed:
        sys.exit(1)

if __name__ == "__main__":
    main()
