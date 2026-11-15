#!/usr/bin/env python
"""
train_wlasl100_gru.py — Train SignSpeak AI Phase 4 Compact Bidirectional GRU
for 25-Class Word-Level ASL Recognition.

Dataset:
  backend/ai-service/data/wlasl100_features_25class.npz (584 clips)

Partitions:
  - Signer-Independent Train: 362 clips (62 signers)
  - Signer-Independent Val:   70 clips (3 signers: {109, 12, 41})
  - Signer-Independent Test:  152 clips (6 held-out signers: {9, 11, 13, 14, 20, 36})
  - Original Benchmark Test:  75 clips (for comparison)

Architecture:
  Input (16, 147)
  -> Dense(64, ReLU) + SpatialDropout1D(0.2)
  -> Bidirectional(GRU(48, return_sequences=True))
  -> [GlobalAvgPool1D, GlobalMaxPool1D] -> Concatenate (192)
  -> Dropout(0.3)
  -> Dense(48, ReLU) + Dropout(0.2)
  -> Dense(25, Softmax)
  Total params: 52,793
"""

import os
import sys
import json
import time
from pathlib import Path
from collections import Counter, defaultdict

# Set reproducibility flags before importing TF
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_DETERMINISTIC_OPS"] = "1"
os.environ["PYTHONHASHSEED"] = "42"

import random
random.seed(42)

import numpy as np
np.random.seed(42)

import tensorflow as tf
tf.random.set_seed(42)

import keras
from keras import layers, models
from sklearn.metrics import precision_recall_fscore_support, confusion_matrix

# ─────────────────────────────────────────────────────────────────────────────
# Paths and Configuration
# ─────────────────────────────────────────────────────────────────────────────
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT_DIR / "data" / "wlasl100_features_25class.npz"
MODELS_DIR = ROOT_DIR / "models" / "wlasl100_gru"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

BEST_MODEL_PATH = MODELS_DIR / "best_model.keras"
FINAL_MODEL_PATH = MODELS_DIR / "final_model.keras"
HISTORY_PATH = MODELS_DIR / "training_history.json"
LABELS_PATH = MODELS_DIR / "class_labels.json"
METRICS_PATH = MODELS_DIR / "evaluation_metrics.json"
CONFUSION_JSON = MODELS_DIR / "confusion_matrix.json"
CONFUSION_CSV = MODELS_DIR / "confusion_matrix.csv"
CONFIG_PATH = MODELS_DIR / "training_config.json"

TEST_SIGNERS = {9, 11, 13, 14, 20, 36}
VAL_SIGNERS = {109, 12, 41}

BATCH_SIZE = 16
MAX_EPOCHS = 120
PATIENCE = 20
INITIAL_LR = 1e-3
MIN_LR = 1e-5
LR_REDUCE_FACTOR = 0.5
LR_REDUCE_PATIENCE = 7

# ─────────────────────────────────────────────────────────────────────────────
# Data Augmentation (Training-Only, Label-Preserving)
# ─────────────────────────────────────────────────────────────────────────────
def augment_sample(x, p_scale=0.5, p_trans=0.5, p_noise=0.5, p_jitter=0.3):
    """
    Applies label-preserving spatial and temporal jitter to a single 16-frame 147D sequence.
    Limb deletion is strictly omitted to preserve two-handed signs.
    """
    x_aug = x.copy()
    left_mask = x_aug[:, 126]
    right_mask = x_aug[:, 127]
    pose_mask = x_aug[:, 146]

    # 1. Temporal index jitter: slight speed/offset perturbation (+/- 1 frame)
    if np.random.rand() < p_jitter:
        base_indices = np.arange(16)
        shift = np.random.randint(-1, 2, size=16)
        jittered = np.clip(base_indices + shift, 0, 15)
        x_aug = x_aug[jittered]
        left_mask = x_aug[:, 126]
        right_mask = x_aug[:, 127]
        pose_mask = x_aug[:, 146]

    # 2. Spatial scale jitter: s in [0.96, 1.04]
    if np.random.rand() < p_scale:
        s = np.random.uniform(0.96, 1.04)
        x_aug[:, 0:63] *= s
        x_aug[:, 63:126] *= s
        x_aug[:, 128:146] *= s

    # 3. Spatial translation jitter: small shift (dx, dy) ~ N(0, 0.012)
    if np.random.rand() < p_trans:
        dx = np.random.normal(0.0, 0.012)
        dy = np.random.normal(0.0, 0.012)
        for i in range(21):
            x_aug[:, i * 3] += dx * left_mask
            x_aug[:, i * 3 + 1] += dy * left_mask
            x_aug[:, 63 + i * 3] += dx * right_mask
            x_aug[:, 63 + i * 3 + 1] += dy * right_mask
        for i in range(6):
            x_aug[:, 128 + i * 3] += dx * pose_mask
            x_aug[:, 128 + i * 3 + 1] += dy * pose_mask

    # 4. Landmark Gaussian sensor noise: sigma = 0.003
    if np.random.rand() < p_noise:
        noise_l = np.random.normal(0.0, 0.003, size=(16, 63))
        noise_r = np.random.normal(0.0, 0.003, size=(16, 63))
        x_aug[:, 0:63] += noise_l * left_mask[:, None]
        x_aug[:, 63:126] += noise_r * right_mask[:, None]

    # Enforce zero-coordinate mask consistency
    x_aug[:, 0:63] *= left_mask[:, None]
    x_aug[:, 63:126] *= right_mask[:, None]
    x_aug[:, 128:146] *= pose_mask[:, None]

    return x_aug.astype(np.float32)

class AugmentedDataGenerator(keras.utils.PyDataset):
    """
    Thread-safe Keras 3 dataset generator with training-only on-the-fly augmentation.
    """
    def __init__(self, X, y, batch_size=16, augment=True, shuffle=True, **kwargs):
        super().__init__(**kwargs)
        self.X = X
        self.y = y
        self.batch_size = batch_size
        self.augment = augment
        self.shuffle = shuffle
        self.indices = np.arange(len(self.X))
        if self.shuffle:
            np.random.shuffle(self.indices)

    def __len__(self):
        return int(np.ceil(len(self.X) / self.batch_size))

    def __getitem__(self, idx):
        batch_idx = self.indices[idx * self.batch_size : (idx + 1) * self.batch_size]
        batch_X = self.X[batch_idx].copy()
        batch_y = self.y[batch_idx]

        if self.augment:
            for i in range(len(batch_X)):
                batch_X[i] = augment_sample(batch_X[i])

        return batch_X, batch_y

    def on_epoch_end(self):
        if self.shuffle:
            np.random.shuffle(self.indices)

# ─────────────────────────────────────────────────────────────────────────────
# Model Definition
# ─────────────────────────────────────────────────────────────────────────────
def build_compact_gru(input_shape=(16, 147), num_classes=25):
    """
    Builds the reviewed 52,793-parameter compact Bidirectional GRU baseline.
    """
    inp = layers.Input(shape=input_shape, name="sequence_input")
    
    # 1. Spatial Projection & Spatial Dropout
    x = layers.Dense(64, activation="relu", name="spatial_projection")(inp)
    x = layers.SpatialDropout1D(0.2, name="spatial_dropout")(x)
    
    # 2. Bidirectional GRU
    x = layers.Bidirectional(
        layers.GRU(48, return_sequences=True),
        name="bidirectional_gru"
    )(x) # (None, 16, 96)
    
    # 3. Dual Temporal Pooling (Average for trajectory + Max for gesture apex)
    avg_p = layers.GlobalAveragePooling1D(name="temporal_avg_pool")(x)
    max_p = layers.GlobalMaxPooling1D(name="temporal_max_pool")(x)
    x = layers.Concatenate(name="temporal_concat")([avg_p, max_p]) # (None, 192)
    x = layers.Dropout(0.3, name="temporal_dropout")(x)
    
    # 4. Dense Head & Output Softmax
    x = layers.Dense(48, activation="relu", name="dense_head")(x)
    x = layers.Dropout(0.2, name="head_dropout")(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="class_probabilities")(x)
    
    model = models.Model(inputs=inp, outputs=outputs, name="wlasl100_compact_gru")
    return model

# ─────────────────────────────────────────────────────────────────────────────
# Evaluation Helpers
# ─────────────────────────────────────────────────────────────────────────────
def compute_split_metrics(model, X, y, class_names):
    """
    Computes Top-1, Top-5, macro precision, recall, F1, per-class metrics, and confusion matrix.
    """
    probs = model.predict(X, batch_size=32, verbose=0)
    preds = np.argmax(probs, axis=1)
    
    # Top-1 Accuracy
    top1_acc = float(np.mean(preds == y))
    
    # Top-5 Accuracy
    top5_correct = 0
    top5_preds = np.argsort(probs, axis=1)[:, -5:]
    for true_label, top5_row in zip(y, top5_preds):
        if true_label in top5_row:
            top5_correct += 1
    top5_acc = float(top5_correct / len(y)) if len(y) > 0 else 0.0
    
    # Macro metrics
    p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(
        y, preds, average="macro", zero_division=0
    )
    
    # Per-class metrics
    p_class, r_class, f1_class, support_class = precision_recall_fscore_support(
        y, preds, labels=list(range(len(class_names))), average=None, zero_division=0
    )
    
    per_class = {}
    for idx, cname in enumerate(class_names):
        per_class[cname] = {
            "label_idx": idx,
            "precision": float(p_class[idx]),
            "recall": float(r_class[idx]),
            "f1_score": float(f1_class[idx]),
            "support": int(support_class[idx]),
        }
    
    # Confusion Matrix
    cm = confusion_matrix(y, preds, labels=list(range(len(class_names))))
    
    # Cross-entropy loss
    eps = 1e-12
    probs_clipped = np.clip(probs, eps, 1.0 - eps)
    ce_loss = float(-np.mean(np.log(probs_clipped[np.arange(len(y)), y])))
    
    return {
        "sample_count": int(len(y)),
        "loss": ce_loss,
        "top1_accuracy": top1_acc,
        "top5_accuracy": top5_acc,
        "macro_precision": float(p_macro),
        "macro_recall": float(r_macro),
        "macro_f1": float(f1_macro),
        "per_class": per_class,
        "confusion_matrix": cm.tolist(),
        "probabilities": probs,
        "predictions": preds,
    }

def find_top_confusions(cm, class_names, top_k=10):
    """
    Finds the most frequent off-diagonal misclassifications.
    """
    confusions = []
    for i in range(len(class_names)):
        for j in range(len(class_names)):
            if i != j and cm[i][j] > 0:
                confusions.append({
                    "true_class": class_names[i],
                    "pred_class": class_names[j],
                    "count": int(cm[i][j]),
                })
    confusions.sort(key=lambda x: x["count"], reverse=True)
    return confusions[:top_k]

# ─────────────────────────────────────────────────────────────────────────────
# Main Training Routine
# ─────────────────────────────────────────────────────────────────────────────
def main():
    print("=" * 80)
    print("SIGNSPEAK AI — PHASE 4: WLASL100 COMPACT GRU WORD RECOGNITION TRAINING")
    print("=" * 80)
    
    t0 = time.time()
    
    # 1. Load Feature Archive
    print(f"\n[1] Loading feature dataset from {DATA_PATH}...")
    npz_data = np.load(DATA_PATH, allow_pickle=True)
    X_all = npz_data["X"] # (584, 16, 147)
    y_all = npz_data["y"] # (584,)
    signer_ids = npz_data["signer_ids"]
    glosses = npz_data["glosses"]
    split_orig = npz_data["split_original"]
    
    # Class mapping
    unique_glosses = sorted(list(set(glosses)))
    num_classes = len(unique_glosses)
    class_names = unique_glosses
    label_to_idx = {g: i for i, g in enumerate(class_names)}
    print(f"Loaded {len(X_all)} sequences across {num_classes} classes.")
    
    # 2. Partition 3-Way Signer-Independent Split
    print("\n[2] Applying 3-way disjoint signer-independent partition...")
    is_test = np.isin(signer_ids, list(TEST_SIGNERS))
    is_val = np.isin(signer_ids, list(VAL_SIGNERS))
    is_train = (~is_test) & (~is_val)
    
    # Verify strict disjointness
    train_signers = set(signer_ids[is_train])
    val_signers = set(signer_ids[is_val])
    test_signers = set(signer_ids[is_test])
    
    assert len(train_signers.intersection(val_signers)) == 0, "Train-Val signer overlap!"
    assert len(train_signers.intersection(test_signers)) == 0, "Train-Test signer overlap!"
    assert len(val_signers.intersection(test_signers)) == 0, "Val-Test signer overlap!"
    
    X_train, y_train = X_all[is_train], y_all[is_train]
    X_val, y_val = X_all[is_val], y_all[is_val]
    X_test_si, y_test_si = X_all[is_test], y_all[is_test]
    
    # Original benchmark test split (for comparison)
    is_orig_test = (split_orig == "test")
    X_test_orig, y_test_orig = X_all[is_orig_test], y_all[is_orig_test]
    
    print(f"  Train:      {len(X_train)} clips ({len(train_signers)} signers)")
    print(f"  Val:        {len(X_val)} clips ({len(val_signers)} signers: {sorted(list(VAL_SIGNERS))})")
    print(f"  Test (SI):  {len(X_test_si)} clips ({len(test_signers)} signers: {sorted(list(TEST_SIGNERS))})")
    print(f"  Test (Orig):{len(X_test_orig)} clips (instance benchmark reference)")
    
    assert len(X_train) == 362
    assert len(X_val) == 70
    assert len(X_test_si) == 152
    assert len(X_test_orig) == 75
    
    # 3. Build Model
    print("\n[3] Building compact Bidirectional GRU model...")
    model = build_compact_gru(input_shape=(16, 147), num_classes=num_classes)
    model.summary()
    total_params = model.count_params()
    print(f"\nExact parameter count: {total_params:,}")
    assert total_params == 52793, f"Unexpected parameter count: {total_params}"
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=INITIAL_LR),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )
    
    # 4. Training Callbacks & Generators
    print("\n[4] Configuring training callbacks and augmentation...")
    train_generator = AugmentedDataGenerator(
        X_train, y_train, batch_size=BATCH_SIZE, augment=True, shuffle=True
    )
    
    callbacks = [
        keras.callbacks.ModelCheckpoint(
            filepath=str(BEST_MODEL_PATH),
            monitor="val_loss",
            mode="min",
            save_best_only=True,
            verbose=1
        ),
        keras.callbacks.EarlyStopping(
            monitor="val_loss",
            mode="min",
            patience=PATIENCE,
            restore_best_weights=True,
            verbose=1
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=LR_REDUCE_FACTOR,
            patience=LR_REDUCE_PATIENCE,
            min_lr=MIN_LR,
            verbose=1
        )
    ]
    
    # 5. Model Training Execution
    print(f"\n[5] Executing training loop (Max {MAX_EPOCHS} epochs, Patience {PATIENCE})...")
    train_t0 = time.time()
    
    history = model.fit(
        train_generator,
        validation_data=(X_val, y_val),
        epochs=MAX_EPOCHS,
        callbacks=callbacks,
        verbose=1
    )
    
    train_duration = time.time() - train_t0
    print(f"\nTraining completed in {train_duration:.1f}s across {len(history.history['loss'])} epochs.")
    
    # Save final model
    model.save(str(FINAL_MODEL_PATH))
    print(f"Saved final model to {FINAL_MODEL_PATH}")
    
    # 6. Load Best Checkpoint for Evaluation
    print(f"\n[6] Loading best validation checkpoint from {BEST_MODEL_PATH} for evaluation...")
    best_model = keras.models.load_model(str(BEST_MODEL_PATH))
    
    # 7. Evaluate on all splits
    print("\n[7] Computing comprehensive metrics across evaluation partitions...")
    metrics_train = compute_split_metrics(best_model, X_train, y_train, class_names)
    metrics_val = compute_split_metrics(best_model, X_val, y_val, class_names)
    metrics_test_si = compute_split_metrics(best_model, X_test_si, y_test_si, class_names)
    metrics_test_orig = compute_split_metrics(best_model, X_test_orig, y_test_orig, class_names)
    
    # Top confused pairs on Signer-Independent Test set
    top_confusions_si = find_top_confusions(metrics_test_si["confusion_matrix"], class_names, top_k=10)
    top_confusions_val = find_top_confusions(metrics_val["confusion_matrix"], class_names, top_k=10)
    
    print("\n" + "=" * 80)
    print("EVALUATION RESULTS SUMMARY")
    print("=" * 80)
    print(f"Split                     | Samples | Loss   | Top-1 Acc | Top-5 Acc | Macro Prec | Macro Rec | Macro F1")
    print("-" * 85)
    print(f"Train (Augmented Context) | {metrics_train['sample_count']:>7} | {metrics_train['loss']:>6.4f} | {metrics_train['top1_accuracy']*100:>8.2f}% | {metrics_train['top5_accuracy']*100:>8.2f}% | {metrics_train['macro_precision']*100:>9.2f}% | {metrics_train['macro_recall']*100:>8.2f}% | {metrics_train['macro_f1']*100:>7.2f}%")
    print(f"Validation (3 Signers)    | {metrics_val['sample_count']:>7} | {metrics_val['loss']:>6.4f} | {metrics_val['top1_accuracy']*100:>8.2f}% | {metrics_val['top5_accuracy']*100:>8.2f}% | {metrics_val['macro_precision']*100:>9.2f}% | {metrics_val['macro_recall']*100:>8.2f}% | {metrics_val['macro_f1']*100:>7.2f}%")
    print(f"Test (Signer-Independent) | {metrics_test_si['sample_count']:>7} | {metrics_test_si['loss']:>6.4f} | {metrics_test_si['top1_accuracy']*100:>8.2f}% | {metrics_test_si['top5_accuracy']*100:>8.2f}% | {metrics_test_si['macro_precision']*100:>9.2f}% | {metrics_test_si['macro_recall']*100:>8.2f}% | {metrics_test_si['macro_f1']*100:>7.2f}%")
    print(f"Test (Orig Benchmark)     | {metrics_test_orig['sample_count']:>7} | {metrics_test_orig['loss']:>6.4f} | {metrics_test_orig['top1_accuracy']*100:>8.2f}% | {metrics_test_orig['top5_accuracy']*100:>8.2f}% | {metrics_test_orig['macro_precision']*100:>9.2f}% | {metrics_test_orig['macro_recall']*100:>8.2f}% | {metrics_test_orig['macro_f1']*100:>7.2f}%")
    print("-" * 85)
    
    print("\nTop 10 Confused Pairs on Signer-Independent Test Set (N=152):")
    for rank, c in enumerate(top_confusions_si, 1):
        print(f"  {rank:>2}. True: {c['true_class']:<10} -> Pred: {c['pred_class']:<10} (Count: {c['count']})")
        
    # 8. Save Deliverables
    print("\n[8] Saving all artifacts to deliverables directory...")
    
    # 8.1 Class Labels
    with open(LABELS_PATH, "w", encoding="utf-8") as f:
        json.dump(class_names, f, indent=2)
    print(f"  Saved class labels: {LABELS_PATH}")
    
    # 8.2 Training History
    hist_serializable = {k: [float(v) for v in vals] for k, vals in history.history.items()}
    with open(HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump(hist_serializable, f, indent=2)
    print(f"  Saved training history: {HISTORY_PATH}")
    
    # 8.3 Evaluation Metrics
    clean_metrics = {
        "train": {k: v for k, v in metrics_train.items() if k not in ["probabilities", "predictions"]},
        "validation": {k: v for k, v in metrics_val.items() if k not in ["probabilities", "predictions"]},
        "test_signer_independent": {k: v for k, v in metrics_test_si.items() if k not in ["probabilities", "predictions"]},
        "test_original_benchmark": {k: v for k, v in metrics_test_orig.items() if k not in ["probabilities", "predictions"]},
        "top_confusions_test_si": top_confusions_si,
        "top_confusions_val": top_confusions_val,
    }
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(clean_metrics, f, indent=2)
    print(f"  Saved evaluation metrics: {METRICS_PATH}")
    
    # 8.4 Confusion Matrix (JSON & CSV)
    with open(CONFUSION_JSON, "w", encoding="utf-8") as f:
        json.dump({
            "classes": class_names,
            "confusion_matrix": metrics_test_si["confusion_matrix"]
        }, f, indent=2)
        
    with open(CONFUSION_CSV, "w", encoding="utf-8") as f:
        f.write("," + ",".join(class_names) + "\n")
        for i, row in enumerate(metrics_test_si["confusion_matrix"]):
            f.write(class_names[i] + "," + ",".join(map(str, row)) + "\n")
    print(f"  Saved confusion matrix: {CONFUSION_JSON} and {CONFUSION_CSV}")
    
    # 8.5 Training Configuration & Reproducibility
    config_doc = {
        "task": "WLASL100 25-Class Word-Level Recognition",
        "phase": "Phase 4 - Temporal Sequence Training",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_clips": len(X_all),
        "total_classes": num_classes,
        "classes": class_names,
        "splits": {
            "train": {"clips": len(X_train), "signers_count": len(train_signers)},
            "validation": {"clips": len(X_val), "signers": sorted(list(VAL_SIGNERS))},
            "test_signer_independent": {"clips": len(X_test_si), "signers": sorted(list(TEST_SIGNERS))},
            "test_original_benchmark": {"clips": len(X_test_orig)},
        },
        "hyperparameters": {
            "seed": 42,
            "batch_size": BATCH_SIZE,
            "max_epochs": MAX_EPOCHS,
            "actual_epochs": len(history.history["loss"]),
            "early_stopping_patience": PATIENCE,
            "initial_learning_rate": INITIAL_LR,
            "min_learning_rate": MIN_LR,
            "lr_reduce_factor": LR_REDUCE_FACTOR,
            "lr_reduce_patience": LR_REDUCE_PATIENCE,
            "optimizer": "Adam",
            "loss": "sparse_categorical_crossentropy",
        },
        "model_architecture": {
            "name": "wlasl100_compact_gru",
            "total_parameters": int(total_params),
            "layers": [
                {"name": "sequence_input", "shape": [None, 16, 147]},
                {"name": "spatial_projection", "units": 64, "activation": "relu"},
                {"name": "spatial_dropout", "rate": 0.2},
                {"name": "bidirectional_gru", "units_per_dir": 48, "return_sequences": True},
                {"name": "temporal_avg_pool"},
                {"name": "temporal_max_pool"},
                {"name": "temporal_concat", "units": 192},
                {"name": "temporal_dropout", "rate": 0.3},
                {"name": "dense_head", "units": 48, "activation": "relu"},
                {"name": "head_dropout", "rate": 0.2},
                {"name": "class_probabilities", "units": 25, "activation": "softmax"}
            ]
        },
        "augmentation_policy": {
            "training_only": True,
            "spatial_scale_jitter": "Uniform(0.96, 1.04), p=0.5",
            "spatial_translation_jitter": "Normal(0, 0.012), p=0.5",
            "landmark_sensor_noise": "Normal(0, 0.003), p=0.5",
            "temporal_index_jitter": "+/- 1 frame, p=0.3",
            "secondary_hand_deletion": "Omitted to strictly preserve two-handed sign validity",
            "validation_and_test_augmented": False
        },
        "execution_duration_seconds": round(time.time() - t0, 2),
        "keras_version": keras.__version__,
        "tensorflow_version": tf.__version__,
    }
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config_doc, f, indent=2)
    print(f"  Saved training configuration: {CONFIG_PATH}")
    
    print("\nPhase 4 Model Training and Evaluation COMPLETED SUCCESSFULLY.")

if __name__ == "__main__":
    main()
