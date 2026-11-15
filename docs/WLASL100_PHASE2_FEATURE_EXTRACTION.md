# SignSpeak AI — Phase 2: WLASL100 Landmark Feature Extraction & Dataset Specification

> **Document Version:** 1.0.0  
> **Date:** November 14, 2026  
> **Phase:** Phase 2 Complete (Feature Extraction & Dataset Generation)  
> **Target Models:** Temporal Sequence Classifier (16 Frames × 147 Features)  
> **Output Artifacts:** `data/wlasl100_features_25class.npz` & `data/wlasl100_features_25class_metadata.json`

---

## 1. Executive Summary

Phase 2 transitions SignSpeak AI from raw video frame preprocessing to structured spatio-temporal landmark feature extraction.

Using Google MediaPipe Hands and MediaPipe Pose, 16-frame image sequences for the 25 approved vocabulary classes (`BEFORE`, `BOOK`, `CHAIR`, `COMPUTER`, `DEAF`, `DRINK`, `EAT`, `FAMILY`, `FINE`, `FINISH`, `GO`, `HELP`, `LIKE`, `MOTHER`, `NO`, `NOW`, `SCHOOL`, `WALK`, `WANT`, `WHAT`, `WHO`, `WOMAN`, `WORK`, `YEAR`, `YES`) were converted into compact, scale-normalized 147-dimensional sequence vectors.

### Zero Regression Guarantee
* The existing alphabet recognition system (`alphabet_landmark_model.onnx`, A–Z, SPACE, DEL, and the Left-Swipe delete detector) remains 100% operational and isolated.
* No changes were made to `LiveDemo.jsx` or the active 90D alphabet pipeline.

---

## 2. 147-Dimensional Feature Vector Architecture

Each video clip is represented as a tensor of shape:
$$\mathbf{X} \in \mathbb{R}^{16 \times 147}$$

### Per-Frame Feature Decomposition

```text
Frame Feature Vector (147 dimensions):
├── [000:063] Left Hand Landmarks (21 points × 3 coords [x, y, z])
├── [063:126] Right Hand Landmarks (21 points × 3 coords [x, y, z])
├── [126:128] Hand Presence Masks ([left_present, right_present])
├── [128:146] Upper-Body Pose Anchors (6 points × 3 coords [x, y, z])
│             (0: Nose, 1: L-Shoulder, 2: R-Shoulder, 3: L-Elbow, 4: R-Elbow, 5: Mid-Shoulder)
└── [146:147] Pose Presence Mask ([pose_present])
```

### Detailed Component Layout:

| Slice Index | Component Name | Count | Representation | Mask / Indicator |
|---|---|---|---|---|
| `0:63` | **Left Hand Landmarks** | 63 floats | 21 points $\times$ $(x, y, z)$ | `0.0` if left hand missing |
| `63:126` | **Right Hand Landmarks** | 63 floats | 21 points $\times$ $(x, y, z)$ | `0.0` if right hand missing |
| `126` | **Left Hand Present** | 1 float | `1.0` if detected, `0.0` if absent | Explicit binary mask |
| `127` | **Right Hand Present** | 1 float | `1.0` if detected, `0.0` if absent | Explicit binary mask |
| `128:146` | **Pose Anchors** | 18 floats | 6 points $\times$ $(x, y, z)$ | `0.0` if pose missing |
| `146` | **Pose Present** | 1 float | `1.0` if detected, `0.0` if absent | Explicit binary mask |

---

## 3. Spatial Normalization Reference & Invariance Safeguards

### Normalization Mathematics
To ensure scale and translation invariance across different camera distances, heights, and video aspect ratios:

1. **Torso Center Origin ($C_{torso}$):**
   $$C_{torso} = \left(\frac{x_{\text{ls}} + x_{\text{rs}}}{2}, \frac{y_{\text{ls}} + y_{\text{rs}}}{2}, \frac{z_{\text{ls}} + z_{\text{rs}}}{2}\right)$$
   Where $x_{\text{ls}}$ is the left shoulder and $x_{\text{rs}}$ is the right shoulder.
2. **Scale Factor ($S_{torso}$):**
   $$S_{torso} = \max\left(\sqrt{(x_{\text{rs}} - x_{\text{ls}})^2 + (y_{\text{rs}} - y_{\text{ls}})^2}, 0.15\right)$$
   Coordinates are normalized by shoulder width:
   $$\tilde{P} = \frac{P - C_{torso}}{S_{torso}}$$
3. **Fallback Normalization:** If pose shoulders are not detected with confidence $> 0.35$, the system falls back to centering on the primary hand's wrist with scale $S_{\text{palm}} \times 2.5$.

### Documented Benefits & Limitations:
* **Benefits:**
  * Complete translation invariance: Moving left, right, up, or down in the camera frame does not change the feature representation.
  * Distance invariance: Sitting 40cm vs. 2m away produces normalized coordinates proportional to body anatomy.
  * Preserves relative height: Explicitly captures whether a hand is touching the mouth (`EAT`), chin (`MOTHER`, `WHO`), chest (`FINE`, `WANT`), or resting on the other arm (`WORK`, `COMPUTER`).
* **Limitations:**
  * **Out-of-Plane Rotation:** Does not correct for extreme camera angles ($> 30^\circ$ yaw/pitch tilt relative to signer).
  * **Leaning/Foreshortening:** When signers lean sharply toward the camera, shoulder-width changes in perspective, which can introduce subtle non-linear scaling across frames.
  * **Arm Visibility:** If a signer wears clothing that completely matches the background, elbow detection confidence may drop slightly.

---

## 4. Missing-Landmark Handling & Hand Masking

Unlike alphabet recognition (which assumes a single hand is always visible), word-level ASL features dynamic one-handed and two-handed signs, and natural movement phases:

1. **One-Handed Signs (e.g. `YES`, `NO`, `EAT`, `DRINK`, `MOTHER`, `DEAF`):**
   * The inactive hand's 63 coordinate values are set to strictly `0.0`.
   * The corresponding presence mask (`left_present` or `right_present`) is set to `0.0`.
   * The neural network learns through backpropagation that an input vector with mask `0.0` represents an inactive limb, without producing `NaN` or gradient explosions.
2. **Phasic Hand Disappearance:**
   * During early preparation frames (frames 0–2) or retraction frames (frames 14–15), hands may enter or exit the active signing bounding box.
   * Presence masks provide continuous time-dependent visibility signals.
3. **Severe Corruption Rejection:**
   * Clips with **0 hand frames detected across all 16 frames** are flagged in `is_corrupted = True` and excluded from training loss calculations.

---

## 5. Dataset Splits & Isolation Architecture

The dataset is packaged with two separate, fully documented evaluation splits:

### 1. Original Benchmark Split (`split_original`):
* Follows the official WLASL instance-level random partitioning:
  * **Train:** 413 videos
  * **Validation:** 96 videos
  * **Test:** 75 videos
  * *(Evaluates video instance generalization across common signers)*

### 2. Zero-Leakage Signer-Independent Split (`split_signer_independent`):
* Strict signer partition:
  * **Held-out Test Signers:** `[9, 11, 13, 14, 20, 36]` (6 signers, 152 videos = 26.0%)
  * **Training Signers:** Remaining 65 signers (432 videos = 74.0%)
  * **Signer Overlap:** **STRICTLY 0.0%** (zero signers shared between train and test)
  * **Class Coverage:** **100%** (every one of the 25 classes has $\ge 13$ train videos and $\ge 3$ test videos).
* Completely isolates the test signers from training decisions.

---

## 6. Output Dataset Files & Reproducibility

| File Path | Format | Size | Description |
|---|---|---|---|
| `backend/ai-service/data/wlasl100_features_25class.npz` | Compressed NumPy archive | 2.39 MB | Tensors: `X` [584, 16, 147], `y` [584], `video_ids`, `glosses`, `signer_ids`, splits, retention metrics, and corruption flags. |
| `backend/ai-service/data/wlasl100_features_25class_metadata.json` | JSON | ~12 KB | Full schema metadata, class index mappings, per-class sample counts, quality statistics, and documentation. |
| `backend/ai-service/scripts/extract_wlasl100_features.py` | Python Script | ~11 KB | Deterministic, standalone extraction script using MediaPipe. |

---

## 7. Next Steps: Phase 3 Model Training Blueprint

With the 16-frame 147D feature dataset packaged, **Phase 3** will train a lightweight temporal sequence model:
1. **Model Architecture:** Bidirectional GRU (or 1D Temporal CNN + BiLSTM) with temporal attention, taking input `(batch_size, 16, 147)` and outputting 25 class logits.
2. **Dual-Split Evaluation:** Report Top-1 and Top-5 accuracy on:
   - Original Test Split (75 videos).
   - Zero-Leakage Signer-Independent Test Split (152 videos).
3. **Export to ONNX:** Export as `word_landmark_model.onnx` (~1.5–3.0 MB) ready for browser WASM deployment.
