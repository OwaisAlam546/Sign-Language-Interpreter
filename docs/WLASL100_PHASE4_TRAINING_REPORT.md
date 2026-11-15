# SignSpeak AI — Phase 4: WLASL100 GRU Word Recognition Training Report

> **Document Version:** 1.0.0  
> **Date:** November 14, 2026  
> **Status:** Phase 4 Sequence Model Training & Evaluation Complete — Awaiting Approval for Phase 5  
> **Target:** 25-Class Word-Level ASL Recognition Engine  
> **Model Checkpoint:** `backend/ai-service/models/wlasl100_gru/best_model.keras` (52,793 parameters)  
> **Configuration & Metrics:** `backend/ai-service/models/wlasl100_gru/`  

---

## 1. Executive Summary

Phase 4 of the word-level ASL roadmap implements temporal sequence model training for the approved 25-class WLASL100 vocabulary using the reviewed 147-dimensional, 16-frame feature dataset.

Training was performed under strict signer-independent constraints with a dedicated 3-way disjoint partition. A compact, highly regularized Bidirectional GRU was trained with label-preserving data augmentations and early stopping.

### Key Headline Results:
* **Architecture:** Compact Bidirectional GRU with dual temporal pooling (Average + Max), exactly **52,793 parameters (~206 KB)**.
* **Training & Convergence:** Converged in 87 epochs (~33.8 seconds on CPU). Early stopping restored the best checkpoint from **Epoch 67** (minimum validation loss: `0.9819`, validation accuracy: `64.29%`).
* **Original Benchmark Test ($N=75$):** **73.33% Top-1 Accuracy**, **94.67% Top-5 Accuracy**, **71.18% Macro F1**.
* **Zero-Leakage Signer-Independent Test ($N=152$):** **50.00% Top-1 Accuracy**, **88.82% Top-5 Accuracy**, **47.60% Macro F1** (evaluated on 6 completely unseen signers).
* **Generalization Reality:** Evaluated against 25 classes (where random chance is 4.0%), the model demonstrates solid learned dynamics, with the correct sign appearing in the Top-5 predictions **88.82% of the time** on unseen signers and **94.67% of the time** on familiar signers.
* **System Isolation Guarantee:** The existing alphabet recognition system (`alphabet_landmark_model.onnx`, 28 classes, swipe delete detector) and `LiveDemo.jsx` were not modified. No ONNX models were exported in this phase.

---

## 2. Model Architecture & Exact Parameter Count

The model implements the approved compact Bidirectional GRU baseline designed in Phase 3. It combines spatial feature compression, temporal bidirectional recurrent context, dual temporal pooling, and progressive dropout regularization:

```text
Sequence Input: (Batch, 16 frames, 147 features)
  │
  ├─► [1] Spatial Projection: Dense(64, ReLU) + SpatialDropout1D(0.2) ──► 9,472 params
  │
  ├─► [2] Bidirectional GRU: Bidirectional(GRU(48, return_sequences=True)) ──► 32,832 params
  │         Output: (Batch, 16, 96) [48 forward + 48 backward]
  │         ├── GlobalAveragePooling1D (posture trajectory envelope) ──► (Batch, 96) ─┐
  │         └── GlobalMaxPooling1D    (peak gesture articulation)    ──► (Batch, 96) ─┴─► Concatenate (Batch, 192)
  │
  ├─► [3] Temporal Regularization: Dropout(0.3)
  │
  ├─► [4] Classification Head: Dense(48, ReLU) + Dropout(0.2) ──► 9,264 params
  │
  └─► [5] Output Probabilities: Dense(25, Softmax) ──► 1,225 params
```

### Detailed Layer Breakdown:

| Layer (Type) | Input Shape | Output Shape | Parameters | Operational Purpose |
|---|---|---|---|---|
| `sequence_input` (InputLayer) | `(None, 16, 147)` | `(None, 16, 147)` | 0 | 16-frame 147D sequence input |
| `spatial_projection` (Dense) | `(None, 16, 147)` | `(None, 16, 64)` | 9,472 | Linear projection from 147D to 64D manifold |
| `spatial_dropout` (SpatialDropout1D) | `(None, 16, 64)` | `(None, 16, 64)` | 0 | Drops full 1D channels across time (rate 0.2) |
| `bidirectional_gru` (Bidirectional) | `(None, 16, 64)` | `(None, 16, 96)` | 32,832 | Recurrent temporal modeling (48 fwd + 48 bwd) |
| `temporal_avg_pool` (GlobalAvgPool1D) | `(None, 16, 96)` | `(None, 96)` | 0 | Summarizes full posture trajectory evolution |
| `temporal_max_pool` (GlobalMaxPool1D) | `(None, 16, 96)` | `(None, 96)` | 0 | Captures peak articulation and gesture apex |
| `temporal_concat` (Concatenate) | `[(None, 96), (None, 96)]` | `(None, 192)` | 0 | Combines trajectory summary with apex signal |
| `temporal_dropout` (Dropout) | `(None, 192)` | `(None, 192)` | 0 | Regularizes pooled sequence embeddings (rate 0.3) |
| `dense_head` (Dense) | `(None, 192)` | `(None, 48)` | 9,264 | Latent categorical decision layer |
| `head_dropout` (Dropout) | `(None, 48)` | `(None, 48)` | 0 | Prevents dense layer co-adaptation (rate 0.2) |
| `class_probabilities` (Dense) | `(None, 48)` | `(None, 25)` | 1,225 | Posterior Softmax probabilities over 25 classes |
| **Total Parameters** | — | — | **52,793** | **~206.22 KB** in float32 weights |

---

## 3. Dataset Partitioning & Signer Isolation Protocol

Partitioning followed the approved 3-way disjoint protocol established in Phase 3. Signers were segregated to ensure zero information leakage:

```mermaid
flowchart TD
    Dataset["WLASL100 Dataset (584 Clips, 71 Unique Signers)"]
    Dataset --> Train["Train Partition (62 Signers)<br>362 Clips (62.0%)<br>Coverage: 25/25 Classes (Min: 10)"]
    Dataset --> Val["Validation Partition (3 Signers: {109, 12, 41})<br>70 Clips (12.0%)<br>Coverage: 25/25 Classes (2–5 each)"]
    Dataset --> TestSI["Held-Out Test Partition (6 Signers)<br>152 Clips (26.0%)<br>Coverage: 25/25 Classes (Min: 3)"]
    Dataset --> TestOrig["Original Benchmark Test Partition<br>75 Clips (Reference Comparison)"]
```

### Partition Distribution:
* **Train Set:** **362 clips**, 62 signers (62.0% of data).
* **Validation Set:** **70 clips**, 3 signers (`{109, 12, 41}`, 12.0% of data).
* **Signer-Independent Test Set:** **152 clips**, 6 held-out signers (`{9, 11, 13, 14, 20, 36}`, 26.0% of data).
* **Original Benchmark Test Set:** **75 clips** (standard instance-level test split used for baseline comparison).
* **Strict Disjointness Verification:**
  $$\text{Signers}_{\text{Train}} \cap \text{Signers}_{\text{Val}} = \emptyset, \quad \text{Signers}_{\text{Train}} \cap \text{Signers}_{\text{Test}} = \emptyset, \quad \text{Signers}_{\text{Val}} \cap \text{Signers}_{\text{Test}} = \emptyset$$
  *(0 signers are shared across training, validation, and test partitions).*

---

## 4. Training-Only Augmentation Implementation

To prevent the 52k parameter network from memorizing the 362 training samples, training-only augmentations were applied dynamically during batch generation via a custom `AugmentedDataGenerator`:

### Documented Transformations:
1. **Spatial Scale Jitter:** Scale coordinates by $s \sim \text{Uniform}(0.96, 1.04)$ ($p=0.5$). Simulates signers sitting slightly closer or farther from the camera.
2. **Spatial Translation Jitter:** Translate active landmarks by $(\Delta x, \Delta y) \sim \mathcal{N}(0, 0.012)$ ($p=0.5$). Simulates small postural shifts relative to shoulders.
3. **Landmark Sensor Noise:** Gaussian noise $\mathcal{N}(0, 0.003)$ added to detected hand landmarks ($p=0.5$). Simulates high-frequency MediaPipe tracking noise.
4. **Temporal Index Jitter:** Shift frame sample indices by $\pm 1$ frame ($p=0.3$). Perturbs signing velocity and stroke timing.
5. **Strict Mask Consistency:** Missing landmarks ($mask = 0.0$) were strictly re-zeroed after transformations.

### Secondary-Hand Dropout Inspection & Decision:
* **Inspection Finding:** In two-handed ASL signs (e.g. `BOOK`, `COMPUTER`, `WORK`, `FAMILY`, `NOW`, `YEAR`, `WALK`, `CHAIR`), both hands are phonemically essential. Removing the secondary hand transforms two-handed gestures into completely different or invalid signs (for instance, dropping the non-dominant arm from `WORK` leaves a solitary tapping fist identical to `YES`).
* **Implementation Decision:** Limb deletion was **strictly omitted**. Only continuous geometric and temporal perturbations that 100% preserve the sign label were applied.
* **Evaluation Data:** The validation ($N=70$) and test sets ($N=152$, $N=75$) were **never augmented, duplicated, or modified**.

---

## 5. Training History & Convergence Dynamics

### Hyperparameters:
* **Optimizer:** Adam ($\beta_1=0.9, \beta_2=0.999$, $\epsilon=10^{-7}$).
* **Initial Learning Rate:** $1.0 \times 10^{-3}$.
* **LR Scheduler:** `ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=7, min_lr=1e-5)`.
* **Early Stopping:** `EarlyStopping(monitor='val_loss', patience=20, restore_best_weights=True)`.
* **Batch Size:** 16 (23 gradient updates per epoch).
* **Max Epochs:** 120 (stopped at epoch 87).

### Epoch Progression Milestones:

| Epoch | Train Loss | Train Acc | Val Loss | Val Acc | Learning Rate | Event Description |
|---|---|---|---|---|---|---|
| **1** | 3.2386 | 5.25% | 3.2001 | 7.14% | $1.0 \times 10^{-3}$ | Initial random weights |
| **8** | 2.3222 | 28.18% | 2.2479 | 27.14% | $1.0 \times 10^{-3}$ | Val loss breaks below 2.50 |
| **16** | 1.7603 | 41.44% | 1.7178 | 38.57% | $1.0 \times 10^{-3}$ | Model captures primary trajectories |
| **27** | 1.2799 | 53.31% | 1.3403 | 51.43% | $1.0 \times 10^{-3}$ | Val accuracy crosses 50% |
| **38** | 1.0295 | 64.64% | 1.1738 | 61.43% | $1.0 \times 10^{-3}$ | Val accuracy crosses 60% |
| **53** | 0.7115 | 75.41% | 1.0675 | 70.00% | $1.0 \times 10^{-3}$ | Val accuracy reaches 70.0% |
| **63** | 0.5385 | 80.11% | 1.0193 | 65.71% | $5.0 \times 10^{-4}$ | Learning rate halved |
| **67** | **0.5401** | **81.49%** | **0.9819** | **64.29%** | **$5.0 \times 10^{-4}$** | **BEST CHECKPOINT (Minimum Val Loss)** |
| **74** | 0.4497 | 85.91% | 1.0270 | 67.14% | $2.5 \times 10^{-4}$ | Learning rate halved |
| **87** | 0.4484 | 85.64% | 1.0247 | 67.14% | $1.25 \times 10^{-4}$ | **Early Stopping Triggered** (Weights restored to Epoch 67) |

---

## 6. Comprehensive Evaluation Results

The restored best model was evaluated across all dataset partitions using Top-1 accuracy, Top-5 accuracy, Cross-Entropy Loss, Macro Precision, Macro Recall, and Macro F1:

### 6.1 Multi-Split Benchmark Summary:

| Evaluation Partition | Sample Count ($N$) | Cross-Entropy Loss | Top-1 Accuracy | Top-5 Accuracy | Macro Precision | Macro Recall | Macro F1-Score |
|---|---|---|---|---|---|---|---|
| **Train Set** (Augmented Context) | 362 | 0.2029 | 95.30% | 100.00% | 95.55% | 95.04% | 94.96% |
| **Validation Set** (3 Signers) | 70 | 0.9819 | 64.29% | 97.14% | 69.00% | 66.67% | 63.52% |
| **Signer-Independent Test** (6 Signers) | 152 | 1.9450 | **50.00%** | **88.82%** | **50.22%** | **49.86%** | **47.60%** |
| **Original Benchmark Test** (Instance Reference) | 75 | 1.2350 | **73.33%** | **94.67%** | **83.20%** | **71.00%** | **71.18%** |

---

### 6.2 Per-Class Evaluation: Signer-Independent Test Set ($N=152$, 6 Held-Out Signers)

| Class Index | Gloss | Test Samples | Precision | Recall | F1-Score | Primary Confused Class |
|---|---|---|---|---|---|---|
| `0` | **BEFORE** | 9 | 33.3% | 33.3% | 33.3% | `GO` (4 clips) |
| `1` | **BOOK** | 5 | 57.1% | 80.0% | 66.7% | `FAMILY` (1 clip) |
| `2` | **CHAIR** | 3 | 33.3% | 33.3% | 33.3% | `GO` (2 clips) |
| `3` | **COMPUTER** | 8 | 66.7% | 75.0% | 70.6% | `SCHOOL` (2 clips) |
| `4` | **DEAF** | 4 | 36.4% | **100.0%** | 53.3% | *(Zero false negatives)* |
| `5` | **DRINK** | 9 | 53.8% | 77.8% | 63.6% | `BEFORE` (2 clips) |
| `6` | **EAT** | 5 | **100.0%** | 80.0% | **88.9%** | `FINE` (1 clip) |
| `7` | **FAMILY** | 6 | 75.0% | 50.0% | 60.0% | `BOOK` (2 clips) |
| `8` | **FINE** | 5 | 33.3% | 20.0% | 25.0% | `BEFORE` (2 clips) |
| `9` | **FINISH** | 5 | 42.9% | 60.0% | 50.0% | `NOW` (1 clip) |
| `10` | **GO** | 5 | 25.0% | 60.0% | 35.3% | `WALK` (1 clip) |
| `11` | **HELP** | 9 | 75.0% | 66.7% | 70.6% | `DRINK` (2 clips) |
| `12` | **LIKE** | 5 | 40.0% | 40.0% | 40.0% | `NOW` (2 clips) |
| `13` | **MOTHER** | 6 | 0.0% | 0.0% | 0.0% | `DRINK` (6 clips) |
| `14` | **NO** | 5 | 33.3% | 40.0% | 36.4% | `BEFORE` (1 clip) |
| `15` | **NOW** | 6 | 66.7% | 33.3% | 44.4% | `WHAT` (3 clips) |
| `16` | **SCHOOL** | 5 | 20.0% | 20.0% | 20.0% | `CHAIR` (1 clip) |
| `17` | **WALK** | 6 | 80.0% | 66.7% | 72.7% | `YEAR` (1 clip) |
| `18` | **WANT** | 6 | 75.0% | 50.0% | 60.0% | `FAMILY` (1 clip) |
| `19` | **WHAT** | 6 | 20.0% | 16.7% | 18.2% | `BEFORE` (3 clips) |
| `20` | **WHO** | 7 | 42.9% | 42.9% | 42.9% | `DEAF` (4 clips) |
| `21` | **WOMAN** | 8 | 66.7% | 25.0% | 36.4% | `WHO` (3 clips) |
| `22` | **WORK** | 6 | 66.7% | 33.3% | 44.4% | `COMPUTER` (2 clips) |
| `23` | **YEAR** | 8 | 62.5% | 62.5% | 62.5% | `WALK` (1 clip) |
| `24` | **YES** | 5 | 50.0% | 80.0% | 61.5% | `WHO` (1 clip) |
| **Macro Avg** | **ALL 25** | **152** | **50.22%** | **49.86%** | **47.60%** | — |

---

### 6.3 Per-Class Evaluation: Original Benchmark Test Set ($N=75$)

| Class Index | Gloss | Test Samples | Precision | Recall | F1-Score |
|---|---|---|---|---|---|
| `0` | **BEFORE** | 4 | 100.0% | 50.0% | 66.7% |
| `1` | **BOOK** | 4 | 66.7% | **100.0%** | 80.0% |
| `2` | **CHAIR** | 3 | 60.0% | **100.0%** | 75.0% |
| `3` | **COMPUTER** | 5 | 83.3% | **100.0%** | **90.9%** |
| `4` | **DEAF** | 3 | 60.0% | **100.0%** | 75.0% |
| `5` | **DRINK** | 4 | 60.0% | 75.0% | 66.7% |
| `6` | **EAT** | 2 | 100.0% | 50.0% | 66.7% |
| `7` | **FAMILY** | 2 | 100.0% | 50.0% | 66.7% |
| `8` | **FINE** | 3 | 100.0% | **100.0%** | **100.0%** |
| `9` | **FINISH** | 3 | 50.0% | **100.0%** | 66.7% |
| `10` | **GO** | 3 | 50.0% | 66.7% | 57.1% |
| `11` | **HELP** | 3 | 75.0% | **100.0%** | 85.7% |
| `12` | **LIKE** | 3 | 100.0% | 66.7% | 80.0% |
| `13` | **MOTHER** | 3 | 100.0% | 33.3% | 50.0% |
| `14` | **NO** | 3 | 100.0% | 33.3% | 50.0% |
| `15` | **NOW** | 3 | 100.0% | **100.0%** | **100.0%** |
| `16` | **SCHOOL** | 2 | 100.0% | 50.0% | 66.7% |
| `17` | **WALK** | 3 | 100.0% | 33.3% | 50.0% |
| `18` | **WANT** | 2 | 100.0% | 50.0% | 66.7% |
| `19` | **WHAT** | 3 | 100.0% | 66.7% | 80.0% |
| `20` | **WHO** | 3 | 50.0% | 33.3% | 40.0% |
| `21` | **WOMAN** | 3 | 100.0% | 66.7% | 80.0% |
| `22` | **WORK** | 2 | 100.0% | 50.0% | 66.7% |
| `23` | **YEAR** | 3 | 75.0% | **100.0%** | 85.7% |
| `24` | **YES** | 3 | 50.0% | **100.0%** | 66.7% |
| **Macro Avg** | **ALL 25** | **75** | **83.20%** | **71.00%** | **71.18%** |

---

## 7. Sign Confusion Analysis

Examining the top off-diagonal confusion pairs in the $25 \times 25$ confusion matrix reveals the structural and phonetic factors causing recognition errors:

### Top Confused Pairs on Unseen Signers ($N=152$):

| Rank | True Gloss | Predicted Gloss | Error Count | ASL Phonetic / Biomechanical Cause |
|---|---|---|---|---|
| **1** | `MOTHER` | `DRINK` | **6 clips** | **Anatomical Co-Location:** In ASL, `MOTHER` is signed by tapping the thumb of an open 5-hand to the chin. `DRINK` brings a curved C-hand to the mouth. On unseen signers with slight downward camera angles, the hand height and trajectory at the mouth/chin boundary overlap significantly. |
| **2** | `BEFORE` | `GO` | **4 clips** | **Planar Trajectory Confusion:** `BEFORE` sweeps back over the shoulder; `GO` moves outward away from the body. Because $z$-depth estimation from monocular 2D video has higher variance than $(x, y)$, depth-dominant transitions are occasionally inverted. |
| **3** | `WHO` | `DEAF` | **4 clips** | **Facial Index-Finger Articulation:** `DEAF` touches the index finger to the ear then jaw. `WHO` circles the index finger near the mouth/chin. Both involve single-digit articulation within the exact same lower-facial bounding box. |
| **4** | `NOW` | `WHAT` | **3 clips** | **Two-Handed Posture Match:** Both signs are two-handed, executed at waist/chest height, with palms facing upward and hands moving downward/outward. |
| **5** | `WHAT` | `BEFORE` | **3 clips** | **Transitional Occlusion:** Low hand detection in early frames creates brief velocity ambiguity before stroke stabilization. |
| **6** | `WOMAN` | `WHO` | **3 clips** | **Phonemic Overlap:** `WOMAN` traces from the chin down to the chest. If the stroke finishes early or signer is seated close, the lower stroke is truncated, resembling the chin-point of `WHO`. |
| **7** | `CHAIR` | `GO` | **2 clips** | Rapid downward tap misclassified as outward stroke. |
| **8** | `COMPUTER` | `SCHOOL` | **2 clips** | Both involve dominant hand tapping on top of the non-dominant forearm/palm. |
| **9** | `FAMILY` | `BOOK` | **2 clips** | Two-handed circular stroke resembling the opening palms of `BOOK`. |
| **10** | `FINE` | `BEFORE` | **2 clips** | Open 5-hand at the chest mistaken for early backward movement of `BEFORE`. |

---

## 8. Generalization Gap & Sample-Size Limitations

### 8.1 The Generalization Gap (Common vs. Unseen Signers)
A primary objective of this phase was to measure the true generalization gap between:
* **Common Signers (Benchmark Split):** **73.33% Top-1 / 94.67% Top-5**.
* **Completely Unseen Signers (Signer-Independent Split):** **50.00% Top-1 / 88.82% Top-5**.

This **23.33 percentage-point gap** mirrors findings in sign language recognition literature (such as the original WLASL paper, where signer-independent splits drop by 20–30% compared to instance splits). Unseen signers bring:
1. Different body aspect ratios and arm lengths.
2. Signer-specific dialectical variations (e.g. signing larger vs. signing smaller).
3. Different resting baseline heights (chest vs. lap).

### 8.2 Top-5 Accuracy Resilience (88.82%)
Despite the 50.0% Top-1 score on unseen signers, the model achieves **88.82% Top-5 accuracy**. In practical user interfaces:
* The true word is in the top 5 hypotheses in **almost 9 out of 10 cases**.
* In a smart autocomplete or candidate selection UX (similar to modern mobile keyboards), presenting the top 3–5 word candidates enables fast, highly reliable communication even when Top-1 certainty is challenged by a new user's signing style.

### 8.3 Limitations of Sample Sizes:
* **Validation Set ($N=70$, 3 Signers):** Containing only three signers (`{109, 12, 41}`), the validation loss can be influenced by the specific signing habits of Signer 109 (who contributed 41 clips). However, Candidate F provided exactly 2 to 5 samples per class, avoiding mono-class validation skew.
* **Signer-Independent Test Set ($N=152$):** With an average of only 6.08 clips per class (and as few as 3 clips for `CHAIR`), individual per-class metrics have wide confidence intervals (as established in Phase 3, a single misclassification changes class accuracy by up to 33.3%).
* **Realistic Engineering Assessment:** While the model provides a strong sequence baseline, deploying to unconstrained webcam users will require real-time temporal thresholding, candidate ranking, and potentially user-specific calibration in later phases.

---

## 9. Deliverables Manifest

All trained models, evaluation metrics, confusion matrices, and configurations are saved in the dedicated model directory:

| File Path | Format | Size | Description |
|---|---|---|---|
| `backend/ai-service/models/wlasl100_gru/best_model.keras` | Keras HDF5/Zip | 695 KB | Best checkpoint restored from Epoch 67 (`val_loss = 0.9819`). |
| `backend/ai-service/models/wlasl100_gru/final_model.keras` | Keras HDF5/Zip | 695 KB | Final model saved at epoch 87 before weight restoration. |
| `backend/ai-service/models/wlasl100_gru/training_history.json` | JSON | 11 KB | Complete 87-epoch history: loss, val_loss, accuracy, val_accuracy, lr. |
| `backend/ai-service/models/wlasl100_gru/class_labels.json` | JSON | 287 B | Ordered array of 25 approved vocabulary glosses. |
| `backend/ai-service/models/wlasl100_gru/evaluation_metrics.json` | JSON | 52 KB | Full multi-split metrics, per-class tables, and top confusions. |
| `backend/ai-service/models/wlasl100_gru/confusion_matrix.json` | JSON | 7 KB | Raw $25 \times 25$ categorical confusion matrix. |
| `backend/ai-service/models/wlasl100_gru/confusion_matrix.csv` | CSV | 1.5 KB | Human-readable CSV confusion matrix with row/col gloss headers. |
| `backend/ai-service/models/wlasl100_gru/training_config.json` | JSON | 3 KB | Full training configuration, seeds, hyperparams, and environment info. |
| `backend/ai-service/scripts/train_wlasl100_gru.py` | Python Script | 17 KB | Standalone, reproducible training script. |

---

## 10. System Isolation Verification

* **Alphabet System Isolation:**
  * `frontend/public/models/alphabet_landmark_model.onnx` — **Untouched**
  * `frontend/src/sections/LiveDemo.jsx` — **Untouched**
  * `frontend/src/lib/swipeDeleteDetector.js` — **Untouched**
  * Existing alphabet recognition, sentence builder, and TTS pipelines — **100% Operational**
* **Original Dataset Isolation:**
  * `data/wlasl/WLASL_v0.3.json` and all preprocessed frames — **Untouched**
  * `data/wlasl100_features_25class.npz` — **Intact and unchanged**
* **No Premature Exports:** No ONNX files were generated.

---

## 11. Roadmap Progression & Readiness for Phase 5

Phase 4 is **completed**.

When approved, we can proceed to **Phase 5: Browser ONNX Conversion, Model Optimization, and Inference Pipeline**:
1. Resolve the protobuf environment requirement for `tf2onnx` in the virtual environment.
2. Export `best_model.keras` to `word_landmark_model.onnx` (input shape `[1, 16, 147]`, output `[1, 25]`).
3. Verify numeric parity between Keras and ONNX Runtime ($L_\infty < 10^{-5}$).
4. Design the dual-mode recognition policy in the frontend (Alphabet Mode vs. Word Mode) without regressing active alphabet recognition.
