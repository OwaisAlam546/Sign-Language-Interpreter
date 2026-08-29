#!/usr/bin/env python
"""
extract_asl_landmarks.py — Extract MediaPipe Hands landmarks from the Kaggle
asl-alphabet dataset (grassknoted) and build a (N, 12, 63) landmark dataset
for all 26 letters A-Z.

Pipeline:
  1. Read a subset of images per letter from the Kaggle ZIP archive.
  2. Run MediaPipe HandLandmarker (static-image mode) on each image.
  3. If a hand is detected, extract 21×3 = 63 landmarks.
  4. Repeat the single landmark frame 12× to build a (12, 63) sequence
     (matching the existing WINDOW=12 format in train_toy_model.py).
  5. Save (X, y) as .npy and a labels.json sidecar.

Usage:
  .venv/Scripts/python scripts/extract_asl_landmarks.py [--images-per-class 200]
"""
import argparse
import json
import os
import sys
import zipfile

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'hand_landmarker.task')


def get_landmark_vector(hand_landmarks) -> list[float]:
    """Flatten 21 MediaPipe landmarks into a 63-element list [x,y,z, ...]."""
    lm = hand_landmarks
    out = []
    for i in range(21):
        out.extend([float(lm[i].x), float(lm[i].y), float(lm[i].z)])
    return out


def detect_hand_from_image(detector, img_bytes: bytes) -> list[float] | None:
    """Decode image bytes, run MediaPipe, return 63 landmarks or None."""
    img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return None
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
    result = detector.detect(mp_image)
    if not result.hand_landmarks:
        return None
    # Take the first detected hand
    return get_landmark_vector(result.hand_landmarks[0])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--images-per-class', type=int, default=200,
                        help='Number of images to process per letter (default 200)')
    parser.add_argument('--window', type=int, default=12,
                        help='Sequence length — repeat each frame this many times (default 12)')
    args = parser.parse_args()

    # ── Locate the Kaggle dataset ZIP ─────────────────────────────
    zip_path = os.path.join(
        os.environ['USERPROFILE'],
        '.cache', 'kagglehub', 'datasets', 'grassknoted', 'asl-alphabet', '1.archive'
    )
    if not os.path.exists(zip_path):
        print(f'ERROR: Kaggle dataset not found at {zip_path}')
        sys.exit(1)

    if not os.path.exists(MODEL_PATH):
        print(f'ERROR: MediaPipe hand_landmarker model not found at {MODEL_PATH}')
        print('Download it from:')
        print('https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task')
        sys.exit(1)

    # ── Build detector ───────────────────────────────────────────
    base_options = mp_python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=1,
        running_mode=vision.RunningMode.IMAGE,
    )
    detector = vision.HandLandmarker.create_from_options(options)

    letters = [chr(c) for c in range(ord('A'), ord('Z') + 1)]
    WINDOW = args.window

    X_list = []   # list of (WINDOW, 63) arrays
    y_list = []   # list of class indices
    class_counts = {}  # actual kept count per letter

    zf = zipfile.ZipFile(zip_path)

    for label_idx, letter in enumerate(letters):
        prefix = f'asl_alphabet_train/asl_alphabet_train/{letter}/'
        # Collect all image paths for this letter
        image_names = sorted([
            n for n in zf.namelist()
            if n.startswith(prefix) and n.endswith(('.jpg', '.jpeg', '.png'))
        ])

        # Take a subset
        n_take = min(args.images_per_class, len(image_names))
        image_names = image_names[:n_take]
        kept = 0

        for img_name in image_names:
            data = zf.read(img_name)
            landmarks = detect_hand_from_image(detector, data)
            if landmarks is None:
                continue  # skip: no hand detected

            # Repeat the single frame WINDOW times → (WINDOW, 63)
            frame = np.array(landmarks, dtype=np.float32)
            sequence = np.tile(frame, (WINDOW, 1))  # shape (WINDOW, 63)

            X_list.append(sequence)
            y_list.append(label_idx)
            kept += 1

        class_counts[letter] = kept
        print(f'  {letter}: processed {n_take} images, kept {kept} with hand detected')

    # ── Save dataset ─────────────────────────────────────────────
    X = np.stack(X_list).astype(np.float32)  # (N, WINDOW, 63)
    y = np.array(y_list, dtype=np.int32)     # (N,)

    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
    os.makedirs(out_dir, exist_ok=True)

    np.save(os.path.join(out_dir, 'asl_X.npy'), X)
    np.save(os.path.join(out_dir, 'asl_y.npy'), y)

    # labels.json: just the class names (A-Z)
    with open(os.path.join(out_dir, 'labels.json'), 'w') as f:
        json.dump(letters, f)

    # Also save a metadata file with class counts
    with open(os.path.join(out_dir, 'dataset_info.json'), 'w') as f:
        json.dump({
            'total_samples': int(len(X)),
            'classes': letters,
            'samples_per_class': class_counts,
            'window_size': WINDOW,
            'landmark_dims': 63,
            'source': 'kaggle grassknoted/asl-alphabet',
            'note': 'Static letter images repeated WINDOW=12 times to form sequences. '
                    'No word-sign data (hello, sorry, yes, etc.) included.',
        }, f, indent=2)

    print(f'\nDataset saved: {len(X)} samples, X.shape={X.shape}, y.shape={y.shape}')
    print(f'Classes: {letters}')
    print(f'Saved to: {out_dir}/asl_X.npy, {out_dir}/asl_y.npy, {out_dir}/labels.json')


if __name__ == '__main__':
    main()
