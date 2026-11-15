# SignSpeak AI — WLASL100 Vocabulary Validation & Feature Architecture Report

> **Document Version:** 1.0.0  
> **Date:** November 14, 2026  
> **Target Scope:** Pre-Phase 2 Vocabulary Validation & Architectural Design  
> **Dataset Source:** `backend/ai-service/data/wlasl100/preprocessing/` & `WLASL_v0.3.json`  
> **Status:** Validation Complete — Ready for Phase 2 Approval

---

## Executive Summary

Prior to initiating Phase 2 feature extraction for the new word-level ASL engine, this document performs an empirical validation of the proposed 25-word vocabulary against physical files, metadata, and quality criteria.

### Key Validation Outcomes:
1. **24 of 25 proposed classes PASS all criteria** ($\ge 19$ videos, $\ge 14$ signers, 100% 16-frame file integrity).
2. **1 class FAILS signer diversity criteria:** `CLOTHES` has 25 videos but only **12 unique signers** (criterion: $\ge 14$).
3. **Approved Replacement:** `DEAF` is selected to replace `CLOTHES` (23 videos, **18 unique signers**, 68.8% landmark retention).
4. **Signer-Independent Split Feasibility:** A rigorous zero-leakage signer split was designed and verified:
   * **Train:** 65 signers, 432 videos (74.0%)
   * **Test:** 6 signers, 152 videos (26.0%)
   * **Signer Overlap:** **STRICTLY 0%** (zero signers shared between Train and Test)
   * **Class Coverage:** **100%** (every one of the 25 classes retains $\ge 13$ train and $\ge 3$ test videos).
5. **Feature Architecture:** Established 16-frame dual-hand + pose anchor tensor format: **`[batch_size, 16, 147]`**.

---

## 1. Verified 25-Class Statistics Table

Every entry in the table below has been physically verified by inspecting actual files on disk in `backend/ai-service/data/wlasl100/preprocessing/` and cross-referencing `WLASL_v0.3.json`.

| # | Gloss | Exact Metadata Gloss | Metadata Instances | Valid Video Folders | Train | Val | Test | Unique Signers | 16/16 Frames OK? | Handedness Mode | Validation Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **YES** | `yes` | 22 | **22** | 15 | 4 | 3 | 17 | ✅ 100% | 1-handed (0% 2-h) | **PASS** |
| 2 | **NO** | `no` | 22 | **22** | 15 | 4 | 3 | 18 | ✅ 100% | 1-handed (0% 2-h) | **PASS** |
| 3 | **HELP** | `help` | 22 | **22** | 15 | 4 | 3 | 15 | ✅ 100% | 2-handed (33% 2-h) | **PASS** |
| 4 | **FINE** | `fine` | 22 | **22** | 15 | 4 | 3 | 16 | ✅ 100% | 1-handed (20% 2-h) | **PASS** |
| 5 | **WANT** | `want` | 19 | **19** | 14 | 3 | 2 | 16 | ✅ 100% | 2-handed (52% 2-h) | **PASS** |
| 6 | **LIKE** | `like` | 21 | **21** | 14 | 4 | 3 | 14 | ✅ 100% | 1-handed (0% 2-h) | **PASS** |
| 7 | **FINISH** | `finish` | 21 | **21** | 14 | 4 | 3 | 16 | ✅ 100% | 2-handed (50% 2-h) | **PASS** |
| 8 | **WHO** | `who` | 25 | **25** | 18 | 4 | 3 | 21 | ✅ 100% | 1-handed (0% 2-h) | **PASS** |
| 9 | **WHAT** | `what` | 21 | **21** | 14 | 4 | 3 | 18 | ✅ 100% | 2-handed (41% 2-h) | **PASS** |
| 10 | **BEFORE** | `before` | 25 | **25** | 18 | 3 | 4 | 15 | ✅ 100% | 2-handed (30% 2-h) | **PASS** |
| 11 | **NOW** | `now` | 21 | **21** | 15 | 3 | 3 | 15 | ✅ 100% | 2-handed (70% 2-h) | **PASS** |
| 12 | **YEAR** | `year` | 22 | **22** | 15 | 4 | 3 | 16 | ✅ 100% | 1/2-hand (22% 2-h) | **PASS** |
| 13 | **EAT** | `eat` | 19 | **19** | 14 | 3 | 2 | 16 | ✅ 100% | 1-handed (0% 2-h) | **PASS** |
| 14 | **DRINK** | `drink` | 35 | **35** | 25 | 6 | 4 | 18 | ✅ 100% | 1-handed (0% 2-h) | **PASS** |
| 15 | **GO** | `go` | 26 | **26** | 19 | 4 | 3 | 17 | ✅ 100% | 2-handed (36% 2-h) | **PASS** |
| 16 | **WALK** | `walk` | 22 | **22** | 15 | 4 | 3 | 18 | ✅ 100% | 2-handed (58% 2-h) | **PASS** |
| 17 | **WORK** | `work` | 19 | **19** | 14 | 3 | 2 | 17 | ✅ 100% | 2-handed (48% 2-h) | **PASS** |
| 18 | **SCHOOL** | `school` | 19 | **19** | 14 | 3 | 2 | 18 | ✅ 100% | 1/2-hand (17% 2-h) | **PASS** |
| 19 | *CLOTHES* | `clothes` | 25 | **25** | 18 | 4 | 3 | **12** | ✅ 100% | 2-handed (59% 2-h) | **FAIL (< 14 signers)** |
| 20 | **MOTHER** | `mother` | 21 | **21** | 15 | 3 | 3 | 15 | ✅ 100% | 1-handed (0% 2-h) | **PASS** |
| 21 | **FAMILY** | `family` | 20 | **20** | 15 | 3 | 2 | 16 | ✅ 100% | 2-handed (47% 2-h) | **PASS** |
| 22 | **WOMAN** | `woman` | 21 | **21** | 15 | 3 | 3 | 15 | ✅ 100% | 1-handed (0% 2-h) | **PASS** |
| 23 | **BOOK** | `book` | 40 | **40** | 30 | 6 | 4 | 15 | ✅ 100% | 2-handed (38% 2-h) | **PASS** |
| 24 | **COMPUTER**| `computer` | 30 | **30** | 20 | 5 | 5 | 15 | ✅ 100% | 2-handed (36% 2-h) | **PASS** |
| 25 | **CHAIR** | `chair` | 26 | **26** | 19 | 4 | 3 | 16 | ✅ 100% | 2-handed (53% 2-h) | **PASS** |

---

## 2. Selection Criteria Evaluation & Replacement

### Vocabulary Acceptance Criteria:
* **Video Instance Threshold:** Minimum **19 valid video instances**.
* **Signer Diversity Threshold:** Minimum **14 unique signers**.
* **Integrity:** 100% of video folders must contain exactly 16 readable JPEG frames.
* **Semantic Suitability:** Core everyday conversational English / ASL vocabulary.

### Criteria Results:
* **Passed:** 24 classes meet or exceed all thresholds.
* **Failed:** `CLOTHES` has 25 valid video clips, but only **12 unique signers** (multiple video clips are from the same recurring educational signer). It is rejected to prevent overfitting.

### Recommended Replacement: `DEAF`
To maintain the target 25 classes with strong diversity:
* **Gloss:** `DEAF` (exact metadata: `deaf`)
* **Metadata Instances:** 23
* **Valid Video Folders:** **23** (16 train, 4 val, 3 test)
* **Unique Signers:** **18 unique signers** (significantly above the 14-signer threshold)
* **MediaPipe Landmark Retention:** **68.8%** (among the highest in the dataset)
* **Handedness:** Clean single-handed sign (index touching ear, then mouth/jaw)
* **Semantic Relevance:** Central identity sign in Deaf culture and sign language communication.

---

## 3. Final Validated 25-Word Vocabulary

With `DEAF` replacing `CLOTHES`, all 25 classes strictly pass all validation criteria.

| # | Final Gloss | Primary Category | Videos | Signers | Handedness | Core Gesture Summary |
|---|---|---|---|---|---|---|
| 1 | **YES** | Affirmation | 22 | 17 | 1-handed | S-fist nodding vertically (wrist flexion). |
| 2 | **NO** | Negation | 22 | 18 | 1-handed | Index + middle fingers snapping closed onto thumb. |
| 3 | **HELP** | Request | 22 | 15 | 2-handed | Thumbs-up fist resting on flat palm rising upward. |
| 4 | **FINE** | Social | 22 | 16 | 1-handed | Open 5-hand thumb touching chest. |
| 5 | **WANT** | Modal Verb | 19 | 16 | 2-handed | Both claw hands pulling inwards toward body. |
| 6 | **LIKE** | Preference | 21 | 14 | 1-handed | Thumb & middle finger pinching out from chest. |
| 7 | **FINISH** | Completion | 21 | 16 | 2-handed | Open 5-hands flicking outward from chest. |
| 8 | **WHO** | Interrogative | 25 | 21 | 1-handed | Thumb on chin, index finger wiggling in flexion. |
| 9 | **WHAT** | Interrogative | 21 | 18 | 2-handed | Both open palms upward shaking side-to-side. |
| 10 | **BEFORE** | Temporal | 25 | 15 | 2-handed | Non-dominant palm flat, dominant hand arcing backward. |
| 11 | **NOW** | Temporal | 21 | 15 | 2-handed | Both Y-hands dropping downward synchronously. |
| 12 | **YEAR** | Temporal | 22 | 16 | 2-handed | S-fist orbiting around base S-fist. |
| 13 | **EAT** | Daily Life | 19 | 16 | 1-handed | Squished O-hand tapping mouth repeatedly. |
| 14 | **DRINK** | Daily Life | 35 | 18 | 1-handed | C-hand tilting toward mouth like holding a cup. |
| 15 | **GO** | Directional | 26 | 17 | 2-handed | Both index fingers arcing forward and pointing away. |
| 16 | **WALK** | Action Verb | 22 | 18 | 2-handed | Both palms facing down alternating forward steps. |
| 17 | **WORK** | Activity | 19 | 17 | 2-handed | Dominant S-fist tapping wrist of base S-fist. |
| 18 | **SCHOOL** | Location | 19 | 18 | 2-handed | Dominant flat palm clapping down on base flat palm. |
| 19 | **DEAF** | Cultural/Identity | 23 | 18 | 1-handed | Index finger touching near ear, then near mouth. |
| 20 | **MOTHER** | Person/Family | 21 | 15 | 1-handed | Open 5-hand thumb tapping chin. |
| 21 | **FAMILY** | Social Unit | 20 | 16 | 2-handed | Both F-hands starting together, circling, and touching pinkies. |
| 22 | **WOMAN** | Person | 21 | 15 | 1-handed | Open 5-hand thumb touching chin, then chest. |
| 23 | **BOOK** | Education | 40 | 15 | 2-handed | Both palms together opening outward like a book hinge. |
| 24 | **COMPUTER**| Technology | 30 | 15 | 2-handed | C-hand arcing along top of base forearm. |
| 25 | **CHAIR** | Object | 26 | 16 | 2-handed | Dominant bent U-fingers tapping base bent U-fingers. |

*Total Volume:* **584 video instances** across 25 classes (average: 23.4 videos/class).

---

## 4. Signer-Independent Evaluation Split Design

### The Problem With the Default Kaggle Split
The default WLASL split has **92.9% signer overlap** between training and test sets. Testing on the default split verifies instance generalization, but does not prove the model can recognize an unseen person's signing.

### Dedicated Signer-Independent Partition (Zero-Leakage)
By analyzing the signer bipartite graph across all 584 videos of our 25 classes:
* We identify **6 prolific test signers** who collectively sign every single one of the 25 classes:
  **Test Signers:** `[9, 11, 13, 14, 20, 36]`
* **Train Signers:** Remaining **65 signers** (including primary signers 109, 5, 4, 10, 12, etc.)

### Partition Metrics:

| Metric | Train Partition | Test Partition | Total |
|---|---|---|---|
| **Unique Signers** | **65 signers (91.5%)** | **6 signers (8.5%)** | 71 signers |
| **Video Instances** | **432 videos (74.0%)** | **152 videos (26.0%)** | 584 videos |
| **Signer Overlap** | **0 signers (0.0% overlap)** | **0 signers (0.0% overlap)** | **STRICT ZERO** |
| **Per-Class Coverage** | **13 to 35 videos / class** | **3 to 9 videos / class** | 100% Class Coverage |
| **Zero-Class Dropouts** | **0 classes missing** | **0 classes missing** | All 25 represented |

### Per-Class Distribution Under Signer-Independent Split:
Every class maintains robust representation in both splits:
* `BEFORE`: 16 Train / 9 Test (25 total)
* `BOOK`: 35 Train / 5 Test (40 total)
* `CHAIR`: 23 Train / 3 Test (26 total)
* `COMPUTER`: 22 Train / 8 Test (30 total)
* `DEAF`: 19 Train / 4 Test (23 total)
* `DRINK`: 26 Train / 9 Test (35 total)
* `EAT`: 14 Train / 5 Test (19 total)
* `FAMILY`: 14 Train / 6 Test (20 total)
* `FINE`: 17 Train / 5 Test (22 total)
* `FINISH`: 16 Train / 5 Test (21 total)
* `GO`: 21 Train / 5 Test (26 total)
* `HELP`: 13 Train / 9 Test (22 total)
* `LIKE`: 16 Train / 5 Test (21 total)
* `MOTHER`: 15 Train / 6 Test (21 total)
* `NO`: 17 Train / 5 Test (22 total)
* `NOW`: 15 Train / 6 Test (21 total)
* `SCHOOL`: 14 Train / 5 Test (19 total)
* `WALK`: 16 Train / 6 Test (22 total)
* `WANT`: 13 Train / 6 Test (19 total)
* `WHAT`: 15 Train / 6 Test (21 total)
* `WHO`: 18 Train / 7 Test (25 total)
* `WOMAN`: 13 Train / 8 Test (21 total)
* `WORK`: 13 Train / 6 Test (19 total)
* `YEAR`: 14 Train / 8 Test (22 total)
* `YES`: 17 Train / 5 Test (22 total)

*Conclusion:* A reliable signer-independent evaluation split is **fully mathematically feasible** with zero class dropouts. Both the default split and this independent split will be reported during evaluation.

---

## 5. Landmark Feature Extraction Design (Phase 2 Blueprint)

Word-level ASL features differ substantially from the static 90D alphabet features:
* Alphabet model: 1 hand $\times$ 1 frame = 90 static geometric features.
* Word model: **2 hands + upper body $\times$ 16 temporal frames = spatio-temporal tensor**.

### Component Specifications:

```text
Per-Frame Landmark Representation:
├── 1. Left Hand Landmarks (21 points × [x, y, z])        = 63 values
├── 2. Right Hand Landmarks (21 points × [x, y, z])       = 63 values
├── 3. Hand Presence Flags ([left_present, right_present]) =  2 values
├── 4. Upper-Body Pose Anchors (6 points × [x, y, z])      = 18 values
│      (Nose, L-Shoulder, R-Shoulder, L-Elbow, R-Elbow, Torso-Center)
└── 5. Pose Presence Flag ([pose_present])                 =  1 value
───────────────────────────────────────────────────────────────────────
Total Features Per Frame                                   = 147 values
```

### Complete Sequence Tensor:
$$\mathbf{X} \in \mathbb{R}^{\text{batch\_size} \times 16 \times 147}$$

### Spatial Normalization Strategy:
To make the representation completely invariant to camera distance, tilt, and signer position:
1. **Origin Translation ($C_{torso}$):**
   $$C_{torso} = \frac{P_{\text{shoulder\_left}} + P_{\text{shoulder\_right}}}{2}$$
   Every hand and pose coordinate is translated relative to the midpoint of the shoulders:
   $$P_{\text{centered}} = P - C_{torso}$$
2. **Scale Normalization ($S_{torso}$):**
   $$S_{torso} = \max\left(\|P_{\text{shoulder\_right}} - P_{\text{shoulder\_left}}\|, 0.15\right)$$
   Coordinates are scaled by shoulder width:
   $$\tilde{P} = \frac{P_{\text{centered}}}{S_{torso}}$$
3. **Fallback Normalization:** If pose shoulders are not detected in a frame, the primary hand's palm scale ($S_{\text{palm}} = \max(\|P_9 - P_0\|, 0.04)$) is used as scale factor, with wrist as center.

### Missing Hand Masking:
* When a sign is 1-handed (e.g. `YES`, `NO`, `EAT`, `DRINK`, `MOTHER`, `DEAF`), the inactive hand's 63 coordinates are set to `0.0`.
* The `hand_presence` flag for that hand is set to `0.0` (active hand set to `1.0`).
* This enables the sequence neural network to cleanly distinguish between a hand resting off-camera versus two active hands interacting in space.

---

## 6. Remaining Risks & Architectural Safeguards

1. **Client-Side Live Webcam Latency:**
   * Running MediaPipe Dual Hands + Pose on every webcam frame takes ~15–22ms in the browser.
   * *Safeguard:* During live webcam inference, Pose can be sampled at 10 FPS (shoulders move very slowly compared to fingers), while Hands are tracked at 30 FPS.
2. **Left-Handed vs Right-Handed Signers:**
   * Some signers sign dominant-left, others dominant-right.
   * *Safeguard:* During Phase 2 dataset extraction, horizontal mirroring augmentation will be added to the training set so the model is equally robust to left-handed and right-handed signers.
3. **Zero Regression Guarantee for Alphabet Pipeline:**
   * The word-level engine will live in a separate ONNX model (`word_landmark_model.onnx`) and separate evaluation route.
   * `alphabet_landmark_model.onnx` (A–Z + SPACE + DEL) and the Left-Swipe delete detector will remain completely untouched.

---

*Validation complete. The 25-word vocabulary (`DEAF` replacing `CLOTHES`) is fully verified and ready for Phase 2 implementation.*
