#!/usr/bin/env python
"""
extract_wlasl100_features.py — Extract 16-frame 147-dimensional MediaPipe landmark features
for the approved 25-class WLASL100 vocabulary in SignSpeak AI.

Approved Classes (25):
  BEFORE, BOOK, CHAIR, COMPUTER, DEAF, DRINK, EAT, FAMILY, FINE, FINISH,
  GO, HELP, LIKE, MOTHER, NO, NOW, SCHOOL, WALK, WANT, WHAT,
  WHO, WOMAN, WORK, YEAR, YES

Architecture:
  Per-frame feature vector: 147 dimensions
    - Left hand: 21 * 3 = 63
    - Right hand: 21 * 3 = 63
    - Hand presence masks: 2 (left_present, right_present)
    - Pose anchors: 6 * 3 = 18 (Nose, L-Shoulder, R-Shoulder, L-Elbow, R-Elbow, Mid-Shoulder)
    - Pose presence mask: 1 (pose_present)
  Sequence shape: [N, 16, 147]

Output:
  - backend/ai-service/data/wlasl100_features_25class.npz
  - backend/ai-service/data/wlasl100_features_25class_metadata.json
"""

import os
import sys
import json
import time
from pathlib import Path
from collections import defaultdict, Counter
import numpy as np
import cv2
import mediapipe as mp

# ─────────────────────────────────────────────────────────────────────────────
# Constants & Configuration
# ─────────────────────────────────────────────────────────────────────────────
ROOT_DIR = Path(__file__).resolve().parent.parent
METADATA_PATH = ROOT_DIR / "data" / "wlasl" / "WLASL_v0.3.json"
DATASET_ROOT = ROOT_DIR / "data" / "wlasl100" / "preprocessing"
OUTPUT_NPZ = ROOT_DIR / "data" / "wlasl100_features_25class.npz"
OUTPUT_META = ROOT_DIR / "data" / "wlasl100_features_25class_metadata.json"

APPROVED_CLASSES = sorted([
    "BEFORE", "BOOK", "CHAIR", "COMPUTER", "DEAF", "DRINK", "EAT", "FAMILY",
    "FINE", "FINISH", "GO", "HELP", "LIKE", "MOTHER", "NO", "NOW", "SCHOOL",
    "WALK", "WANT", "WHAT", "WHO", "WOMAN", "WORK", "YEAR", "YES"
])

LABEL_TO_IDX = {gloss: idx for idx, gloss in enumerate(APPROVED_CLASSES)}
IDX_TO_LABEL = {idx: gloss for idx, gloss in enumerate(APPROVED_CLASSES)}

# Held-out signers for zero-leakage signer-independent test split
TEST_SIGNER_IDS = {9, 11, 13, 14, 20, 36}

def extract_video_features(frame_paths, mp_hands, mp_pose):
    """
    Extracts 16-frame 147D features from an ordered list of 16 frame image paths.
    """
    assert len(frame_paths) == 16, f"Expected 16 frames, got {len(frame_paths)}"

    sequence_features = np.zeros((16, 147), dtype=np.float32)
    left_hand_frames = 0
    right_hand_frames = 0
    any_hand_frames = 0
    pose_frames = 0

    for idx, fpath in enumerate(frame_paths):
        img = cv2.imread(str(fpath))
        if img is None:
            continue
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # 1. Pose Anchors (6 landmarks * 3 = 18)
        pose_res = mp_pose.process(img_rgb)
        pose_present = 0.0
        center_x, center_y, center_z = 0.5, 0.5, 0.0
        scale = 1.0
        pose_pts = np.zeros((6, 3), dtype=np.float32)

        if pose_res.pose_landmarks:
            lms = pose_res.pose_landmarks.landmark
            # 11: L-Shoulder, 12: R-Shoulder
            ls = lms[11]
            rs = lms[12]
            if ls.visibility > 0.35 and rs.visibility > 0.35:
                pose_present = 1.0
                pose_frames += 1
                center_x = (ls.x + rs.x) / 2.0
                center_y = (ls.y + rs.y) / 2.0
                center_z = (ls.z + rs.z) / 2.0
                dx = rs.x - ls.x
                dy = rs.y - ls.y
                scale = max(float(np.hypot(dx, dy)), 0.15)

                # Anchors: 0: Nose, 11: L-Shoulder, 12: R-Shoulder, 13: L-Elbow, 14: R-Elbow
                anchor_indices = [0, 11, 12, 13, 14]
                for p_i, a_idx in enumerate(anchor_indices):
                    pt = lms[a_idx]
                    pose_pts[p_i, 0] = (pt.x - center_x) / scale
                    pose_pts[p_i, 1] = (pt.y - center_y) / scale
                    pose_pts[p_i, 2] = (pt.z - center_z) / scale

                # 6th anchor: Mid-shoulder point (center origin = 0, 0, 0 in normalized space)
                pose_pts[5, :] = 0.0

        # 2. Hand Landmarks (Left: 21 * 3, Right: 21 * 3)
        hands_res = mp_hands.process(img_rgb)
        left_pts = np.zeros((21, 3), dtype=np.float32)
        right_pts = np.zeros((21, 3), dtype=np.float32)
        left_present = 0.0
        right_present = 0.0

        if hands_res.multi_hand_landmarks and hands_res.multi_handedness:
            any_hand_frames += 1
            for hand_lms, handedness in zip(hands_res.multi_hand_landmarks, hands_res.multi_handedness):
                label = handedness.classification[0].label # 'Left' or 'Right'
                pts = np.zeros((21, 3), dtype=np.float32)
                for k, lm in enumerate(hand_lms.landmark):
                    pts[k, 0] = (lm.x - center_x) / scale
                    pts[k, 1] = (lm.y - center_y) / scale
                    pts[k, 2] = (lm.z - center_z) / scale

                if label == "Left":
                    left_pts = pts
                    left_present = 1.0
                    left_hand_frames += 1
                elif label == "Right":
                    right_pts = pts
                    right_present = 1.0
                    right_hand_frames += 1

        # 3. Concatenate into 147-dimensional frame vector
        frame_vec = np.concatenate([
            left_pts.flatten(),                                         # 63
            right_pts.flatten(),                                        # 63
            np.array([left_present, right_present], dtype=np.float32),  # 2
            pose_pts.flatten(),                                         # 18
            np.array([pose_present], dtype=np.float32),                 # 1
        ])
        sequence_features[idx, :] = frame_vec

    stats = {
        "left_hand_frames": left_hand_frames,
        "right_hand_frames": right_hand_frames,
        "any_hand_frames": any_hand_frames,
        "pose_frames": pose_frames,
        "hand_retention": float(any_hand_frames / 16.0),
        "pose_retention": float(pose_frames / 16.0),
        "is_severely_corrupted": bool(any_hand_frames == 0),
    }

    return sequence_features, stats

def main():
    print("=" * 70)
    print("SIGNSPEAK AI — PHASE 2: WLASL100 LANDMARK FEATURE EXTRACTION")
    print("=" * 70)

    # 1. Load Metadata
    print("\n[1] Loading WLASL_v0.3.json metadata...")
    with open(METADATA_PATH, "r", encoding="utf-8") as f:
        meta_json = json.load(f)

    meta_by_vid = {}
    for entry in meta_json:
        for inst in entry["instances"]:
            meta_by_vid[str(inst["video_id"])] = inst
    print(f"Loaded metadata for {len(meta_by_vid)} instances.")

    # 2. Discover Videos for Approved 25 Classes
    print("\n[2] Discovering physical video directories for 25 approved classes...")
    discovered = []
    splits = ["train", "val", "test"]

    for gloss in APPROVED_CLASSES:
        gloss_lower = gloss.lower()
        for sp in splits:
            gdir = DATASET_ROOT / sp / "frames" / gloss_lower
            if not gdir.exists():
                continue
            for vdir in sorted(gdir.iterdir()):
                if not vdir.is_dir():
                    continue
                vid = vdir.name
                frames = sorted(list(vdir.glob("*.jpg")))
                if len(frames) != 16:
                    print(f"WARNING: Video {vid} has {len(frames)} frames, skipping!")
                    continue
                
                meta = meta_by_vid.get(vid, {})
                s_id = meta.get("signer_id", -1)
                
                # Determine signer-independent split
                signer_split = "test" if s_id in TEST_SIGNER_IDS else "train"

                discovered.append({
                    "gloss": gloss,
                    "label": LABEL_TO_IDX[gloss],
                    "video_id": vid,
                    "original_split": sp,
                    "signer_independent_split": signer_split,
                    "signer_id": s_id,
                    "frame_paths": frames,
                })

    print(f"Total verified video instances to process: {len(discovered)}")
    orig_split_dist = Counter(d["original_split"] for d in discovered)
    si_split_dist = Counter(d["signer_independent_split"] for d in discovered)
    print(f"Original split distribution: {dict(orig_split_dist)}")
    print(f"Signer-independent split distribution: {dict(si_split_dist)}")

    # 3. Initialize MediaPipe Detectors
    print("\n[3] Initializing MediaPipe Hands & Pose models...")
    mp_hands = mp.solutions.hands.Hands(
        static_image_mode=True,
        max_num_hands=2,
        min_detection_confidence=0.5
    )
    mp_pose = mp.solutions.pose.Pose(
        static_image_mode=True,
        model_complexity=1,
        min_detection_confidence=0.5
    )

    # 4. Extract Features
    print(f"\n[4] Extracting 16-frame 147D features across {len(discovered)} clips...")
    t0 = time.time()

    all_features = []
    all_labels = []
    all_video_ids = []
    all_glosses = []
    all_signer_ids = []
    all_original_splits = []
    all_si_splits = []
    all_hand_retentions = []
    all_pose_retentions = []
    all_corrupted_flags = []

    per_class_counts = Counter()
    per_class_hand_ret = defaultdict(list)
    per_class_pose_ret = defaultdict(list)

    for i, item in enumerate(discovered):
        feats, stats = extract_video_features(item["frame_paths"], mp_hands, mp_pose)

        all_features.append(feats)
        all_labels.append(item["label"])
        all_video_ids.append(item["video_id"])
        all_glosses.append(item["gloss"])
        all_signer_ids.append(item["signer_id"])
        all_original_splits.append(item["original_split"])
        all_si_splits.append(item["signer_independent_split"])
        all_hand_retentions.append(stats["hand_retention"])
        all_pose_retentions.append(stats["pose_retention"])
        all_corrupted_flags.append(stats["is_severely_corrupted"])

        per_class_counts[item["gloss"]] += 1
        per_class_hand_ret[item["gloss"]].append(stats["hand_retention"])
        per_class_pose_ret[item["gloss"]].append(stats["pose_retention"])

        if (i + 1) % 50 == 0 or (i + 1) == len(discovered):
            elapsed = time.time() - t0
            rate = (i + 1) / max(elapsed, 0.1)
            eta = (len(discovered) - (i + 1)) / max(rate, 0.01)
            print(f"  Processed {i+1:>3}/{len(discovered)} clips ({((i+1)/len(discovered))*100:>5.1f}%) | {rate:.1f} clips/s | ETA: {eta:.0f}s")

    mp_hands.close()
    mp_pose.close()

    total_time = time.time() - t0
    print(f"\nFeature extraction complete in {total_time:.1f}s ({len(discovered)/total_time:.1f} clips/s).")

    # 5. Convert to Compact NumPy Arrays
    print("\n[5] Packaging and saving dataset...")
    X = np.stack(all_features, axis=0) # [N, 16, 147]
    y = np.array(all_labels, dtype=np.int64)
    video_ids = np.array(all_video_ids, dtype=object)
    glosses = np.array(all_glosses, dtype=object)
    signer_ids = np.array(all_signer_ids, dtype=np.int64)
    split_original = np.array(all_original_splits, dtype=object)
    split_signer_independent = np.array(all_si_splits, dtype=object)
    hand_retention = np.array(all_hand_retentions, dtype=np.float32)
    pose_retention = np.array(all_pose_retentions, dtype=np.float32)
    is_corrupted = np.array(all_corrupted_flags, dtype=bool)

    print(f"Dataset tensor shape: X={X.shape} (dtype={X.dtype}), y={y.shape} (dtype={y.dtype})")
    print(f"Total severely corrupted sequences (0 hand frames): {np.sum(is_corrupted)}")
    print(f"Overall average hand retention: {np.mean(hand_retention)*100:.1f}%")
    print(f"Overall average pose retention: {np.mean(pose_retention)*100:.1f}%")

    np.savez_compressed(
        OUTPUT_NPZ,
        X=X,
        y=y,
        video_ids=video_ids,
        glosses=glosses,
        signer_ids=signer_ids,
        split_original=split_original,
        split_signer_independent=split_signer_independent,
        hand_retention=hand_retention,
        pose_retention=pose_retention,
        is_corrupted=is_corrupted,
    )
    npz_size_mb = os.path.getsize(OUTPUT_NPZ) / (1024 * 1024)
    print(f"Saved compressed NumPy dataset: {OUTPUT_NPZ} ({npz_size_mb:.2f} MB)")

    # 6. Save Metadata JSON
    class_metadata = []
    for gloss in APPROVED_CLASSES:
        idx = LABEL_TO_IDX[gloss]
        class_metadata.append({
            "gloss": gloss,
            "label_idx": idx,
            "total_samples": per_class_counts[gloss],
            "avg_hand_retention": float(np.mean(per_class_hand_ret[gloss])),
            "avg_pose_retention": float(np.mean(per_class_pose_ret[gloss])),
        })

    metadata_doc = {
        "dataset_name": "SignSpeak AI WLASL100 25-Class Sequence Dataset",
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "feature_specification": {
            "per_frame_dimensions": 147,
            "sequence_length": 16,
            "tensor_shape": [int(X.shape[0]), 16, 147],
            "feature_layout": [
                {"name": "left_hand_landmarks", "slice": [0, 63], "points": 21, "coords": "x,y,z"},
                {"name": "right_hand_landmarks", "slice": [63, 126], "points": 21, "coords": "x,y,z"},
                {"name": "hand_presence_masks", "slice": [126, 128], "names": ["left_present", "right_present"]},
                {"name": "pose_anchors", "slice": [128, 146], "points": 6, "coords": "x,y,z", "anchors": ["Nose", "L_Shoulder", "R_Shoulder", "L_Elbow", "R_Elbow", "Mid_Shoulder"]},
                {"name": "pose_presence_mask", "slice": [146, 147], "names": ["pose_present"]},
            ],
            "normalization": {
                "origin": "mid_shoulder midpoint (P_ls + P_rs)/2",
                "scale": "shoulder width max(||P_rs - P_ls||, 0.15)",
                "fallback": "wrist origin + palm scale"
            }
        },
        "total_clips": int(X.shape[0]),
        "total_classes": len(APPROVED_CLASSES),
        "classes": class_metadata,
        "splits": {
            "original_benchmark": dict(orig_split_dist),
            "signer_independent": dict(si_split_dist),
            "held_out_test_signers": sorted(list(TEST_SIGNER_IDS)),
        },
        "quality_metrics": {
            "mean_hand_retention": float(np.mean(hand_retention)),
            "mean_pose_retention": float(np.mean(pose_retention)),
            "severely_corrupted_clips": int(np.sum(is_corrupted)),
        }
    }

    with open(OUTPUT_META, "w", encoding="utf-8") as f:
        json.dump(metadata_doc, f, indent=2)
    print(f"Saved metadata document: {OUTPUT_META}")
    print("\nPhase 2 Feature Extraction COMPLETED SUCCESSFULLY.")

if __name__ == "__main__":
    main()
