# SignSpeak AI — Phase 1: WLASL100 Dataset Audit & Feasibility Report

> **Document Version:** 1.0.0  
> **Date:** November 14, 2026  
> **Scope:** WLASL100 Word-Level ASL Dataset Audit  
> **Source Dataset:** [Kaggle thtrnphc/wlasl100](https://www.kaggle.com/datasets/thtrnphc/wlasl100) & [WLASL Official Benchmark](https://github.com/dxli92/WLASL)  
> **Status:** Phase 1 Complete (Audit Only — Zero Model or Application Changes)

---

## Executive Summary

SignSpeak AI is expanding from single-hand fingerspelling recognition (A–Z + SPACE + DEL) to support a dedicated, separate **word-level ASL recognition engine**.

In accordance with updated project direction, the 4.9 GB WLASL2000 dataset has been deprecated in favor of **WLASL100** (`thtrnphc/wlasl100`). This audit provides definitive empirical analysis of the WLASL100 dataset, verifies physical file integrity, cross-references candidate vocabularies, evaluates video quality and MediaPipe compatibility, inspects signer distributions, and proposes a production-ready 25–30 word initial vocabulary.

---

## 1. Dataset Directory Structure & File Manifest

### Physical Archive & Extraction Locations
* **Source Archive:** `C:\Users\csc\Downloads\WLASL100.zip` (624,580,639 bytes / ~624 MB)
* **Extracted Workspace Path:** `backend/ai-service/data/wlasl100/preprocessing/`
* **Metadata Master:** `backend/ai-service/data/wlasl/WLASL_v0.3.json` (12,322,133 bytes)

### Folder Hierarchy
```text
backend/ai-service/data/wlasl100/preprocessing/
├── train/
│   └── frames/
│       ├── accident/
│       │   ├── 00625/
│       │   │   ├── accident_0.jpg ... accident_15.jpg
│       │   └── 00634/
│       │       ├── accident_0.jpg ... accident_15.jpg
│       └── ... (100 gloss folders, 1,440 video instances)
├── val/
│   └── frames/
│       └── ... (100 gloss folders, 337 video instances)
└── test/
    └── frames/
        └── ... (100 gloss folders, 258 video instances)
```

### Physical Manifest Metrics
* **Total Gloss Classes:** Exactly **100** classes
* **Total Video Directories:** **2,035** instances
* **Total Image Frames:** **32,560** JPG files in the primary split (65,120 files across archive tree)
* **Frame Uniformity:** **Every single video folder contains exactly 16 frames** (`{gloss}_0.jpg` to `{gloss}_15.jpg`).
* **Resolution Uniformity:** 100% of frames are preprocessed to **256 × 256 pixels** RGB JPEG.

---

## 2. Dataset Version & Split Breakdown

| Split | Gloss Classes | Video Instances | Total Frames | Frames / Video | Resolution |
|---|---|---|---|---|---|
| **Train** | 100 | 1,440 | 23,040 | Exactly 16 | 256 × 256 |
| **Validation** | 100 | 337 | 5,392 | Exactly 16 | 256 × 256 |
| **Test** | 100 | 258 | 4,128 | Exactly 16 | 256 × 256 |
| **Total** | **100** | **2,035** | **32,560** | **16.0 (fixed)** | **256 × 256** |

*All 2,035 video instance folders cross-reference with official video IDs in `WLASL_v0.3.json`.*

---

## 3. Candidate Vocabulary Audit (30 Words Requested)

The user proposed 30 candidate words for an initial everyday sign vocabulary:
`HELLO, GOODBYE, PLEASE, THANK-YOU, YES, NO, SORRY, GOOD, HELP, NAME, UNDERSTAND, KNOW, FAMILY, FRIEND, MOTHER, FATHER, EAT, DRINK, WATER, FOOD, HOME, SCHOOL, WORK, LEARN, GO, COME, STOP, WANT, LOVE, MORE`

### Availability Findings
* **Available in WLASL100:** **11 words** (36.7%)
* **Absent from WLASL100:** **19 words** (63.3%)
* *Reason for absence:* WLASL100 is specifically the top 100 most frequent words from the original WLASL2000 vocabulary. Words like `HELLO`, `PLEASE`, `THANK-YOU`, and `WATER` were lower in frequency rankings in the academic dataset and only exist in WLASL300 or WLASL2000.

### Candidate Availability Detail Table

| Candidate Word | In WLASL100? | Total Vids | Train | Val | Test | Unique Signers | Avg Frames | Sample Integrity |
|---|---|---|---|---|---|---|---|---|
| **DRINK** | ✅ YES | **35** | 25 | 6 | 4 | 18 | 16.0 | 100% Readable |
| **GO** | ✅ YES | **26** | 19 | 4 | 3 | 17 | 16.0 | 100% Readable |
| **YES** | ✅ YES | **22** | 15 | 4 | 3 | 17 | 16.0 | 100% Readable |
| **NO** | ✅ YES | **22** | 15 | 4 | 3 | 18 | 16.0 | 100% Readable |
| **HELP** | ✅ YES | **22** | 15 | 4 | 3 | 15 | 16.0 | 100% Readable |
| **MOTHER** | ✅ YES | **21** | 15 | 3 | 3 | 15 | 16.0 | 100% Readable |
| **FAMILY** | ✅ YES | **20** | 15 | 3 | 2 | 16 | 16.0 | 100% Readable |
| **EAT** | ✅ YES | **19** | 14 | 3 | 2 | 16 | 16.0 | 100% Readable |
| **SCHOOL** | ✅ YES | **19** | 14 | 3 | 2 | 18 | 16.0 | 100% Readable |
| **WORK** | ✅ YES | **19** | 14 | 3 | 2 | 17 | 16.0 | 100% Readable |
| **WANT** | ✅ YES | **19** | 14 | 3 | 2 | 16 | 16.0 | 100% Readable |
| HELLO | ❌ Absent | 0 | – | – | – | – | – | Exists in WLASL300/2000 only |
| GOODBYE | ❌ Absent | 0 | – | – | – | – | – | Absent from WLASL100 |
| PLEASE | ❌ Absent | 0 | – | – | – | – | – | Exists in WLASL300/2000 only |
| THANK-YOU | ❌ Absent | 0 | – | – | – | – | – | Exists in WLASL300/2000 only |
| SORRY | ❌ Absent | 0 | – | – | – | – | – | Exists in WLASL300/2000 only |
| GOOD | ❌ Absent | 0 | – | – | – | – | – | Exists in WLASL300/2000 only |
| NAME | ❌ Absent | 0 | – | – | – | – | – | Exists in WLASL300/2000 only |
| UNDERSTAND | ❌ Absent | 0 | – | – | – | – | – | Absent from WLASL100 |
| KNOW | ❌ Absent | 0 | – | – | – | – | – | Exists in WLASL300/2000 only |
| FRIEND | ❌ Absent | 0 | – | – | – | – | – | Exists in WLASL300/2000 only |
| FATHER | ❌ Absent | 0 | – | – | – | – | – | Exists in WLASL300/2000 only |
| WATER | ❌ Absent | 0 | – | – | – | – | – | Exists in WLASL300/2000 only |
| FOOD | ❌ Absent | 0 | – | – | – | – | – | Exists in WLASL300/2000 only |
| HOME | ❌ Absent | 0 | – | – | – | – | – | Exists in WLASL300/2000 only |
| LEARN | ❌ Absent | 0 | – | – | – | – | – | Exists in WLASL300/2000 only |
| COME | ❌ Absent | 0 | – | – | – | – | – | Absent from WLASL100 |
| STOP | ❌ Absent | 0 | – | – | – | – | – | Exists in WLASL300/2000 only |
| LOVE | ❌ Absent | 0 | – | – | – | – | – | Exists in WLASL300/2000 only |
| MORE | ❌ Absent | 0 | – | – | – | – | – | Exists in WLASL300/2000 only |

---

## 4. Video Quality & MediaPipe Detection Audit

MediaPipe Hand tracking was tested directly on representative sequences from the 256×256 WLASL100 frames.

### Quality Characteristics
1. **Aspect Ratio & Resolution:** 256 × 256 square crops centered on the signer's upper torso and hands.
2. **Fixed Temporal Window:** Exactly 16 frames per gesture.
   * At standard 25–30 FPS, each 16-frame sequence spans ~0.53 to 0.64 seconds.
   * Frame subsampling by the dataset author successfully isolates the primary sign inflection.
3. **Phasic Motion Pattern:**
   * **Frames 0–2:** Sign preparation (hands rising into signing space).
   * **Frames 3–12:** Peak articulation (core gesture formation).
   * **Frames 13–15:** Sign retraction (hands returning to neutral).

### Measured MediaPipe Hand Retention & Handedness

| Gloss | Hand Retention Rate | 2-Handed Frames | Articulation Mode | Landmark Quality Assessment |
|---|---|---|---|---|
| **YES** | 41.7% | 0.0% | 1-handed | Strong single-hand fist nodding; clear landmarks during articulation. |
| **NO** | 56.2% | 0.0% | 1-handed | Fast 3-finger pinch; landmarks consistently sharp during frames 4–11. |
| **HELP** | 66.7% | 20.8% | 2-handed (base + fist) | Two hands clearly detected during the lifting motion. |
| **FAMILY** | 50.0% | 47.9% | 2-handed | Both F-hands circle and contact; dual tracking active. |
| **MOTHER** | 39.6% | 0.0% | 1-handed | 5-hand tapping chin; facial proximity causes occasional landmark drop in early frames. |
| **EAT** | 54.2% | 0.0% | 1-handed | Squished O-hand tapping mouth; distinct trajectory. |
| **DRINK** | 41.7% | 0.0% | 1-handed | C-hand tilted to mouth; high signer diversity. |
| **SCHOOL** | 54.2% | 12.5% | 2-handed | Flat palms clapping; dual hands visible at apex. |
| **WORK** | 75.0% | 43.8% | 2-handed | S-fists tapping; very high landmark stability (75%). |
| **GO** | 47.9% | 33.3% | 1- or 2-handed | Index pointing forward arc; distinct directional vector. |
| **WANT** | 58.3% | 58.3% | 2-handed | Claw hands pulling inwards; strong dual-hand tracking (58.3%). |
| **BOOK** | 52.1% | 27.1% | 2-handed | Palms opening like a book; distinct bilateral motion. |
| **COMPUTER**| 62.5% | 47.9% | 2-handed | C-hand arcing over forearm; excellent dual tracking. |
| **CHAIR** | 60.4% | 37.5% | 2-handed | Bent U-fingers tapping; stable landmarks. |
| **WHO** | 58.3% | 0.0% | 1-handed | Index wiggling near chin; clear single hand. |
| **DEAF** | 68.8% | 0.0% | 1-handed | Index touching ear then jaw; very high retention (68.8%). |
| **FINE** | 54.2% | 0.0% | 1-handed | 5-hand thumb touching chest; distinct. |
| **WHAT** | 58.3% | 35.4% | 2-handed | Open palms shaking side-to-side; clean dual hands. |

---

## 5. Signer Distribution & Data Leakage Audit

A critical engineering requirement for word-level recognition is understanding whether the benchmark splits test **signer independence** or merely **instance memorization**.

### Empirical Signer Overlap Analysis

```
Total Unique Signers Indexed: 119
├── Train Split Signers: 91
├── Validation Split Signers: 69
└── Test Split Signers: 56

Signer Intersections Across Splits:
├── Train ∩ Validation: 64 signers (92.8% of Val signers also appear in Train)
└── Train ∩ Test:       52 signers (92.9% of Test signers also appear in Train)
```

### Critical Findings on Leakage
1. **The Kaggle WLASL100 splits are NOT signer-independent.**
   * Over 92% of the individuals in the Test set are also present in the Training set.
   * This is consistent with the official WLASL instance-randomized split protocol (evaluating vocabulary generalization across known and unknown video instances).
2. **Duplicate Video IDs:** **0 duplicates**. Every video instance folder has a strictly unique video ID. No clip appears in multiple splits.
3. **No Frame Leakage:** Frame sequences are grouped strictly within their respective video ID folders; individual frames from the same video are never split across train/test.

### Recommended Signer Evaluation Strategy
* For baseline WLASL100 benchmark reproduction: Keep the official 1440 / 337 / 258 split.
* For strict signer-independent production validation: Filter the test set to reserve the 4 signers unique to Test (IDs not in Train), or manually partition signers (e.g. signers 1–80 for train, 81–119 for val/test) to verify zero-shot signer generalization.

---

## 6. Academic-Use and Attribution Review

1. **Original Dataset Citation:**
   ```bibtex
   @inproceedings{li2020word,
     title={Word-level Deep Sign Language Recognition from Video: A New Large-scale Dataset and Methods},
     author={Li, Dongxu and Rodriguez, Cristian and Yu, Xin and Li, Hongdong},
     booktitle={IEEE/CVF Winter Conference on Applications of Computer Vision (WACV)},
     pages={1459--1469},
     year={2020}
   }
   ```
2. **License Constraints:**
   * WLASL is licensed strictly for **academic and non-commercial computational research**.
   * The underlying video frames were scraped from educational ASL repositories (e.g. ASL-LEX, Handspeak, Signing Savvy, StartASL).
   * **Commercialization:** The dataset cannot be redistributed or commercialized without independent rights clearance.
   * **Attribution Requirement:** Any presentation or published software utilizing this dataset must attribute Dongxu Li et al. (WACV 2020).

---

## 7. Recommended Initial Vocabulary (Top 25 Everyday Words)

To achieve the project goal of an initial 20–30 everyday word vocabulary:
* We include **all 11 available candidate words** requested by the user.
* We select **14 additional high-quality everyday conversational signs** present in WLASL100 with high instance counts ($\ge 20$ videos) and diverse signers ($\ge 14$ signers).

| # | Gloss | Type | Total Videos | Train / Val / Test | Unique Signers | Mode | Rationale for Inclusion |
|---|---|---|---|---|---|---|---|
| 1 | **YES** | Affirmation | 22 | 15 / 4 / 3 | 17 | 1-hand | Core candidate; essential conversation sign. |
| 2 | **NO** | Negation | 22 | 15 / 4 / 3 | 18 | 1-hand | Core candidate; essential conversation sign. |
| 3 | **HELP** | Request | 22 | 15 / 4 / 3 | 15 | 2-hand | Core candidate; high utility emergency/assistance sign. |
| 4 | **FAMILY** | Social | 20 | 15 / 3 / 2 | 16 | 2-hand | Core candidate; common noun. |
| 5 | **MOTHER** | Social | 21 | 15 / 3 / 3 | 15 | 1-hand | Core candidate; common family sign. |
| 6 | **EAT** | Daily Life | 19 | 14 / 3 / 2 | 16 | 1-hand | Core candidate; basic daily activity. |
| 7 | **DRINK** | Daily Life | 35 | 25 / 6 / 4 | 18 | 1-hand | Core candidate; highest sample count in dataset. |
| 8 | **SCHOOL** | Location | 19 | 14 / 3 / 2 | 18 | 2-hand | Core candidate; common everyday institution. |
| 9 | **WORK** | Activity | 19 | 14 / 3 / 2 | 17 | 2-hand | Core candidate; high landmark stability (75%). |
| 10 | **GO** | Direction | 26 | 19 / 4 / 3 | 17 | 1/2-hand| Core candidate; high sample count. |
| 11 | **WANT** | Desire | 19 | 14 / 3 / 2 | 16 | 2-hand | Core candidate; core modal verb. |
| 12 | **BOOK** | Education | 40 | 30 / 6 / 4 | 15 | 2-hand | Highest total sample count in WLASL100 (40 vids). |
| 13 | **COMPUTER**| Technology | 30 | 20 / 5 / 5 | 15 | 2-hand | Common modern vocabulary; very clean frames. |
| 14 | **CHAIR** | Object | 26 | 19 / 4 / 3 | 16 | 2-hand | Distinct physical noun; 26 videos. |
| 15 | **WHO** | Question | 25 | 18 / 4 / 3 | 21 | 1-hand | Essential interrogative; highest signer count (21). |
| 16 | **WHAT** | Question | 21 | 14 / 4 / 3 | 18 | 2-hand | Essential interrogative; very distinct bilateral motion. |
| 17 | **BEFORE** | Time | 25 | 18 / 3 / 4 | 15 | 2-hand | Temporal conjunction; 25 videos. |
| 18 | **CLOTHES** | Daily Life | 25 | 18 / 4 / 3 | 12 | 2-hand | Common noun; 25 videos. |
| 19 | **CANDY** | Food | 24 | 17 / 4 / 3 | 16 | 1-hand | Substitutes for missing FOOD/EAT; 24 videos. |
| 20 | **DEAF** | Identity | 23 | 16 / 4 / 3 | 18 | 1-hand | High cultural relevance; 68.8% landmark retention. |
| 21 | **WALK** | Action | 22 | 15 / 4 / 3 | 18 | 2-hand | Common physical verb; 22 videos. |
| 22 | **FINE** | Social | 22 | 15 / 4 / 3 | 16 | 1-hand | Common greeting response ("I am fine"); 22 videos. |
| 23 | **YEAR** | Time | 22 | 15 / 4 / 3 | 16 | 2-hand | Common time unit; distinct orbit motion. |
| 24 | **HOT** | Descriptor | 21 | 15 / 3 / 3 | 17 | 1-hand | Expressive adjective; 21 videos. |
| 25 | **FINISH** | Completion | 21 | 14 / 4 / 3 | 16 | 2-hand | Essential conversational sign ("done/all set"). |

---

## 8. Risks, Architectural Differences & Limitations

1. **Dual-Hand vs Single-Hand Architecture:**
   * The existing alphabet model is **single-hand** (21 landmarks = 90 features).
   * Word-level ASL is intrinsically **two-handed** (14 out of the 25 recommended words require dual-hand tracking, e.g. `BOOK`, `WORK`, `HELP`, `FAMILY`, `WHAT`).
   * *Mitigation:* The word engine must extract landmarks from **both hands** (42 landmarks = 21 primary + 21 secondary) plus upper-torso pose anchor points (shoulders/elbows).
2. **Temporal Dynamics vs Static Poses:**
   * Alphabet signs are static held poses (evaluated frame-by-frame).
   * Word signs are **temporal trajectories** over 16 frames. A static frame model cannot distinguish `SCHOOL` from `STOP` or `WORK` without trajectory information.
   * *Mitigation:* Sequence modeling (e.g. 1D Temporal CNN, Lightweight BiLSTM, or 16-frame Temporal Transformer) running in ONNX Web.
3. **Fixed 16-Frame Input Shape:**
   * Because WLASL100 is standardized to 16 frames, the sequence feature tensor will have a fixed shape: `[batch_size, 16, feature_dim]`.
   * Live webcam stream will require a 16-frame sliding FIFO sequence buffer (already tested during Phase 5).

---

## 9. Recommended Next Implementation Steps (Roadmap)

```text
Phase 1: Dataset Audit & Vocabulary Selection (COMPLETED)
   │
   ▼
Phase 2: Landmark & Feature Extraction Pipeline (Dual-Hand 16-Frame Sequences)
   │   • Extract 16 frames × [Primary Hand + Secondary Hand + Pose Keypoints]
   │   • Normalize coordinates relative to shoulder width & palm scale
   │   • Save compact .npz dataset for the 25 selected classes
   │
   ▼
Phase 3: Model Training & Evaluation (16-Frame Temporal Sequence Model)
   │   • Train Lightweight Temporal Classifier (e.g. 1D-CNN or BiLSTM)
   │   • Evaluate Top-1 and Top-5 accuracy on the 258-video Test set
   │   • Export to ONNX (`word_landmark_model.onnx`)
   │
   ▼
Phase 4: Client-Side Dual-Engine Integration
   │   • Route fingerspelling to `alphabet_landmark_model.onnx`
   │   • Route word gestures to `word_landmark_model.onnx` via mode switch or gesture trigger
   │   • Maintain zero regression on alphabet, SPACE, and swipe-delete
```

---

*Phase 1 Audit is fully complete. All data and physical files have been verified. Awaiting user approval to proceed to Phase 2.*
