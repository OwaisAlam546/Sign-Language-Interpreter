#!/usr/bin/env python
"""
extract_del_space_and_merge.py
Extract MediaPipe landmarks for DEL and SPACE from Kaggle archive,
merge with existing 26-class asl_X.npy and asl_y.npy to produce 28-class dataset.
"""
from __future__ import annotations

import json
import os
import shutil
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

    # Backup existing data
    backup_dir = DATA_DIR / 'backup_26class'
    backup_dir.mkdir(exist_ok=True)
    for fname in ['asl_X.npy', 'asl_y.npy', 'labels.json', 'dataset_info.json']:
        src = DATA_DIR / fname
        if src.exists():
            shutil.copy2(src, backup_dir / fname)
    print(f"Backed up 26-class dataset files to {backup_dir}")

    # Load existing 26-class data
    old_X = np.load(DATA_DIR / 'asl_X.npy')
    old_y = np.load(DATA_DIR / 'asl_y.npy')
    print(f"Existing dataset: X shape={old_X.shape}, y shape={old_y.shape}")

    # Set up MediaPipe detector
    base_options = mp_python.BaseOptions(model_asset_path=str(MODEL_PATH))
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=1,
        running_mode=vision.RunningMode.IMAGE,
    )
    detector = vision.HandLandmarker.create_from_options(options)

    zf = zipfile.ZipFile(ZIP_PATH)
    TARGET_PER_CLASS = 480
    WINDOW = 12

    new_X = []
    new_y = []
    del_space_counts = {}

    classes_to_extract = [('DEL', 'del', 26), ('SPACE', 'space', 27)]

    for class_name, folder_name, class_idx in classes_to_extract:
        prefix = f'asl_alphabet_train/asl_alphabet_train/{folder_name}/'
        image_names = sorted([
            n for n in zf.namelist()
            if n.startswith(prefix) and n.endswith(('.jpg', '.jpeg', '.png'))
        ])
        print(f"Extracting {class_name} (found {len(image_names)} images in archive)...")
        kept = 0
        failed = 0

        for img_name in image_names:
            if kept >= TARGET_PER_CLASS:
                break
            data = zf.read(img_name)
            img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
            if img is None:
                continue
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = detector.detect(mp_image)

            if result.hand_landmarks:
                lm = result.hand_landmarks[0]
                coords = []
                for i in range(21):
                    coords.extend([float(lm[i].x), float(lm[i].y), float(lm[i].z)])
                frame = np.array(coords, dtype=np.float32)
                seq = np.tile(frame, (WINDOW, 1))
                new_X.append(seq)
                new_y.append(class_idx)
                kept += 1
            else:
                failed += 1

        del_space_counts[class_name] = kept
        print(f"  {class_name}: kept={kept}, failed={failed}, total processed={kept + failed}")

    new_X = np.stack(new_X).astype(np.float32)
    new_y = np.array(new_y, dtype=np.int32)

    merged_X = np.concatenate([old_X, new_X], axis=0)
    merged_y = np.concatenate([old_y, new_y], axis=0)

    print(f"\nMerged dataset: X shape={merged_X.shape}, y shape={merged_y.shape}")

    # Save merged data
    np.save(DATA_DIR / 'asl_X.npy', merged_X)
    np.save(DATA_DIR / 'asl_y.npy', merged_y)

    # Update labels.json
    classes_28 = [chr(c) for c in range(ord('A'), ord('Z') + 1)] + ['DEL', 'SPACE']
    with open(DATA_DIR / 'labels.json', 'w') as f:
        json.dump(classes_28, f, indent=2)

    # Update dataset_info.json
    with open(backup_dir / 'dataset_info.json') as f:
        info = json.load(f)

    info['total_samples'] = int(len(merged_X))
    info['classes'] = classes_28
    info['samples_per_class']['DEL'] = del_space_counts['DEL']
    info['samples_per_class']['SPACE'] = del_space_counts['SPACE']
    info['note'] = 'Static letter images (A-Z + DEL + SPACE) repeated WINDOW=12 times to form sequences.'

    with open(DATA_DIR / 'dataset_info.json', 'w') as f:
        json.dump(info, f, indent=2)

    print(f"Updated {DATA_DIR / 'labels.json'} and {DATA_DIR / 'dataset_info.json'}")
    print("\nClass sample counts across all 28 classes:")
    for cls in classes_28:
        count = int(np.sum(merged_y == classes_28.index(cls)))
        print(f"  {cls:5s} (idx {classes_28.index(cls):2d}): {count:4d} samples")


if __name__ == '__main__':
    main()
