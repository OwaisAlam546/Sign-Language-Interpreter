# ─────────────────────────────────────────────────────────────
#  scripts/train_toy_model.py — trains a REAL TensorFlow LSTM so
#  the Phase-8 inference pipeline has weights to load.
#  This is the model the service would normally receive from the
#  research notebooks; the toy is a stand-in trained on synthetic
#  MediaPipe-style landmark sequences (jittered static poses for
#  letters, a temporal pattern for the word). Same contract:
#  window of (12, 63) features → softmax over [A, B, D, PEACE,
#  HELLO]. Deterministic (seed 7) and fast (~30 s on CPU).
#  Artifacts written:
#    models/signspeak_toy.keras        — loadable by KerasEngine
#    models/signspeak_toy_labels.json  — class list sidecar
#  Run:  .venv/Scripts/python scripts/train_toy_model.py
#  ─────────────────────────────────────────────────────────────
import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import numpy as np
from app.utils.landmarks import generate_hand

random.seed(7)
np.random.seed(7)

WINDOW = 12
CLASSES = ['A', 'B', 'D', 'PEACE', 'HELLO']
SHAPE_OF = {'A': 'fist', 'B': 'open', 'D': 'point', 'PEACE': 'peace'}
SAMPLES = 420


def sequence_for(label, base_seed):
    """Generate EXACTLY like the smoke suite does (generate_hand with a
    per-frame seed) — training distribution ≡ test distribution, so the
    LSTM cannot latch onto noise patterns that never occur at inference.
    HELLO is a dynamic word: B→A→B→A alternation (a real sequence)."""
    if label == 'HELLO':
        base = ['open', 'fist']
        return [generate_hand(base[(i // 3) % 2], seed=base_seed * 100 + i)
                for i in range(WINDOW)]
    return [generate_hand(SHAPE_OF[label], seed=base_seed * 100 + i)
            for i in range(WINDOW)]


X, y = [], []
for label_idx, label in enumerate(CLASSES):
    for s in range(SAMPLES):
        X.append(sequence_for(label, s))
        y.append(label_idx)
X = np.asarray(X, dtype=np.float32).reshape(-1, WINDOW, 63)
y = np.asarray(y, dtype=np.int32)

# Shuffle BEFORE the split — the split must be class-balanced, so the
# validation slice isn't a single unlearned class (naive split = 0.0 acc)
shuffled = np.random.default_rng(7).permutation(len(X))
X, y = X[shuffled], y[shuffled]

# 80/20 split — the 20% is unseen during training
cut = int(len(X) * 0.8)
X_tr, y_tr, X_te, y_te = X[:cut], y[:cut], X[cut:], y[cut:]

import tensorflow as tf
from tensorflow.keras import layers, models

tf.keras.utils.set_random_seed(7)
model = models.Sequential([
    layers.Input(shape=(WINDOW, 63)),
    layers.LSTM(32, return_sequences=False),
    layers.Dropout(0.2),
    layers.Dense(len(CLASSES), activation='softmax'),
])
model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
model.fit(X_tr, y_tr, epochs=60, batch_size=32, validation_data=(X_te, y_te), verbose=0)

loss, acc = model.evaluate(X_te, y_te, verbose=0)
print(f'validation accuracy: {acc:.3f}')

out = ROOT / 'models'
out.mkdir(exist_ok=True)
model.save(out / 'signspeak_toy.keras')
(out / 'signspeak_toy_labels.json').write_text(json.dumps(CLASSES), encoding='utf-8')
print('saved models/signspeak_toy.keras + models/signspeak_toy_labels.json')

# ── smoke-parity gate: the EXACT sequences scripts/smoke_test.py posts
# must classify right, or the retrained weights will fail CI. This is the
# anti-drift contract between training and verification.
from app.services.sequence_buffer import SequenceBuffer  # noqa: E402

SEQ = SequenceBuffer(WINDOW)


def probe_expect(shape_or_word, expect):
    frames = sequence_for(expect, base_seed=0)          # identical generator
    p = model.predict(np.asarray([SEQ.from_frames(frames)], dtype=np.float32), verbose=0)[0]
    got = CLASSES[int(p.argmax())]
    status = 'OK' if got == expect else 'MISMATCH'
    print(f'smoke-parity {status}: {expect:>6} → {got}')
    return got == expect


parity = all([
    probe_expect('open', 'B'),
    probe_expect('fist', 'A'),
    probe_expect('point', 'D'),
    probe_expect('HELLO', 'HELLO'),
])
if not parity:
    print('training distribution drifted from the smoke suite — retrain!')
    sys.exit(1)
