#!/usr/bin/env python
"""
extract_more_mn.py — Extract additional genuine MediaPipe landmarks for M and N
from Kaggle archive (images 500..3000) to balance dataset and eliminate M/N confusion.
"""
from __future__ import annotations

import json
import os
import zipfile
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / 'data'
MODEL_PATH = ROOT / 'models' / 'hand_landmarker.task'
ZIP_PATH = Path(os.environ['USERPROFILE']) / '.cache' / 'kagglehub' / 'datasets' / 'grassknoted' / 'asl-alphabet' / '1.archive'


def main():
    assert ZIP_PATH.exists(), f"Kaggle ZIP not found at {ZIP_PATH}"
    assert MODEL_PATH.exists(), f"MediaPipe model not found at {MODEL_PATH}"

    X_old = np.load(DATA_DIR / 'asl_X.npy')
    y_old = np.load(DATA_DIR / 'asl_y.npy')
    print(f"Loaded existing data: X={X_old.shape}, y={y_old.shape}")

    m_count_old = int(np.sum(y_old == 12))
    n_count_old = int(np.sum(y_old == 13))
    print(f"Current counts: M={m_count_old}, N={n_count_old}")

    TARGET_COUNT = 480
    needed_m = max(0, TARGET_COUNT - m_count_old)
    needed_n = max(0, TARGET_COUNT - n_count_old)
    print(f"Target count is {TARGET_COUNT}. Need {needed_m} more M, {needed_n} more N.")

    base_options = mp_python.BaseOptions(model_asset_path=str(MODEL_PATH))
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=1,
        running_mode=vision.RunningMode.IMAGE,
    )
    detector = vision.HandLandmarker.create_from_options(options)

    zf = zipfile.ZipFile(ZIP_PATH)
    WINDOW = 12

    new_X = []
    new_y = []

    for cls, class_idx, needed in [('N', 13, needed_n), ('M', 12, needed_m)]:
        if needed <= 0:
            continue
        prefix = f'asl_alphabet_train/asl_alphabet_train/{cls}/'
        all_imgs = sorted([
            n for n in zf.namelist()
            if n.startswith(prefix) and n.endswith(('.jpg', '.jpeg', '.png'))
        ])
        # Start searching from index 500 onwards (images 0..500 were already used)
        candidates = all_imgs[500:]
        print(f"Extracting additional {cls} from {len(candidates)} remaining archive images...")

        kept = 0
        for img_name in candidates:
            if kept >= needed:
                break
            data = zf.read(img_name)
            img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
            if img is None:
                continue
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            res = detector.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
            if res.hand_landmarks:
                lm = res.hand_landmarks[0]
                coords = []
                for i in range(21):
                    coords.extend([float(lm[i].x), float(lm[i].y), float(lm[i].z)])
                frame = np.array(coords, dtype=np.float32)
                seq = np.tile(frame, (WINDOW, 1))
                new_X.append(seq)
                new_y.append(class_idx)
                kept += 1

        print(f"  {cls}: Successfully extracted {kept} new genuine samples (target was {needed})")

    if new_X:
        new_X = np.stack(new_X).astype(np.float32)
        new_y = np.array(new_y, dtype=np.int32)
        merged_X = np.concatenate([X_old, new_X], axis=0)
        merged_y = np.concatenate([y_old, new_y], axis=0)
        print(f"\nMerged dataset: X={merged_X.shape}, y={merged_y.shape}")

        np.save(DATA_DIR / 'asl_X.npy', merged_X)
        np.save(DATA_DIR / 'asl_y.npy', merged_y)

        # Update dataset_info.json
        info_path = DATA_DIR / 'dataset_info.json'
        if info_path.exists():
            with open(info_path) as f:
                info = json.load(f)
            info['total_samples'] = int(len(merged_X))
            info['samples_per_class']['M'] = int(np.sum(merged_y == 12))
            info['samples_per_class']['N'] = int(np.sum(merged_y == 13))
            with open(info_path, 'w') as f:
                json.dump(info, f, indent=2)

        print(f"New M count: {np.sum(merged_y == 12)}")
        print(f"New N count: {np.sum(merged_y == 13)}")
        print("Updated asl_X.npy, asl_y.npy, and dataset_info.json successfully.")


if __name__ == '__main__':
    main()
