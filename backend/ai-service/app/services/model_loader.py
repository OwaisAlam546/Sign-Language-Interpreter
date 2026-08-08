# ─────────────────────────────────────────────────────────────
#  services/model_loader.py — the Model Loader (Phase 8)
#  Production path:
#    drop trained weights into models/ + optional <model>_labels.json
#    (class list), have tensorflow installed → ModelManager loads the
#    Keras model ONCE at startup (load-once is why the AI service is a
#    long-lived process), runs a WARM-UP inference so the first real
#    request never pays the one-time graph-init cost, and classifies.
#  Two model shapes are auto-detected from the input layer:
#    • 'frame'    — 1 hand → 1 label      (input (None, 21, 3) / (None, 63))
#    • 'sequence' — a WINDOW of hands → 1 label (LSTM; input (None, W, 63))
#      Sequence models can't judge a single frame, so classify() routes
#      single hands to the deterministic rule engine and predict_window()
#      runs the LSTM on the buffer's window — honest at every layer.
#  Fallback path (dev / demo / interview, zero deps):
#    no weights or no ML runtime → RuleEngine (utils/landmarks.py).
#    Identical hands → identical scores; a truthful, explainable stand-in.
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import numpy as np

from app.utils import landmarks
from app.utils.envelope import ApiError
from app.utils.vocabulary import Vocabulary

log = logging.getLogger('app')

_DEFAULT_LETTERS = [chr(c) for c in range(ord('A'), ord('Z') + 1)]


class BaseEngine:
    """Interface every engine implements: classify a hand, self-describe."""

    id = 'base'

    def classify(self, hand: list[list[float]]) -> dict[str, Any]:
        raise NotImplementedError

    def predict_window(self, window: list[list[float]]) -> dict[str, Any]:
        raise NotImplementedError

    def status(self) -> dict[str, Any]:
        raise NotImplementedError


class RuleEngine(BaseEngine):
    """Zero-dependency recognizer over MediaPipe hand landmarks."""

    id = 'rule'

    def classify(self, hand: list[list[float]]) -> dict[str, Any]:
        return {**landmarks.classify(hand), 'engine': 'rule'}

    def predict_window(self, window: list[list[float]]) -> dict[str, Any]:
        # The window arrives as W rows of 63 flat features (LSTM layout).
        # Unflatten each row to a 21×3 hand and vote per frame:
        # no temporal model → weighted-ensemble over the window.
        hands = [
            [row[j * 3:(j + 1) * 3] for j in range(21)]
            for row in window
        ]
        votes = [self.classify(h) for h in hands]
        by_label: dict[str, float] = {}
        for v in votes:
            by_label[v['gesture']] = by_label.get(v['gesture'], 0.0) + v['confidence']
        winner = max(by_label, key=by_label.get)
        return {'gesture': winner,
                'confidence': round(by_label[winner] / len(votes), 4),
                'probs': by_label}

    def status(self) -> dict[str, Any]:
        return {
            'engine': 'rule',
            'loaded': False,
            'modelPath': None,
            'inputMode': 'frame',
            'warmupMs': None,
            'labelCount': len(_DEFAULT_LETTERS),
            'fallback': True,
            'fallbackReason': 'no trained weights in models/ (or ML runtime absent)',
        }


class KerasEngine(BaseEngine):
    """TensorFlow/Keras inference — used only when a weights file exists
    AND the runtime is importable. Inference-only: no training here."""

    id = 'tensorflow'

    def __init__(self, path: Path, labels: list[str]):
        self._path = path
        self._labels = labels
        self._input_mode: str = 'frame'
        self._warmup_ms: Optional[float] = None
        try:
            from keras.models import load_model
            self._model = load_model(path)          # one load, at startup
        except ImportError as exc:
            raise ApiError(503, 'MODEL_RUNTIME_MISSING',
                           'tensorflow not installed — pip install tensorflow') from exc
        self._detect_input_mode()
        self.warm_up()                              # the Model Warm-up

    # ── introspection ─────────────────────────────────────────
    def _detect_input_mode(self) -> None:
        shape = self._model.inputs[0].shape
        self._input_mode = 'sequence' if len(shape) == 3 else 'frame'

    def warm_up(self) -> None:
        """One dummy inference at load time: TensorFlow lazily builds
        graphs / allocates buffers on first predict; paying that once at
        startup keeps every real request fast and flat."""
        shape = self._model.inputs[0].shape
        dummy = np.zeros((1,) + tuple(shape[1:]), dtype=np.float32)
        start = time.perf_counter()
        self._model.predict(dummy, verbose=0)
        self._warmup_ms = round((time.perf_counter() - start) * 1000, 1)

    # ── inference ─────────────────────────────────────────────
    def classify(self, hand: list[list[float]]) -> dict[str, Any]:
        """Single hand → label. Sequence models route to the rule engine
        (an LSTM literally cannot reason about one isolated frame)."""
        if self._input_mode == 'sequence':
            return {**landmarks.classify(hand), 'engine': 'rule'}
        frame = np.asarray(hand, dtype=np.float32)[np.newaxis, ...]
        pred = self._model.predict(frame, verbose=0)[0]
        label = self._labels[int(pred.argmax())]
        return {'gesture': label, 'confidence': float(pred.max()),
                'engine': 'tensorflow'}

    def predict_window(self, window: list[list[float]]) -> dict[str, Any]:
        """A (W, 63) window → softmax probabilities → label."""
        batch = np.asarray(window, dtype=np.float32)[np.newaxis, ...]
        probs = self._model.predict(batch, verbose=0)[0]
        idx = int(probs.argmax())
        return {'gesture': self._labels[idx],
                'confidence': float(probs[idx]),
                'probs': {self._labels[i]: float(p) for i, p in enumerate(probs)}}

    def status(self) -> dict[str, Any]:
        return {'engine': 'tensorflow', 'loaded': True,
                'modelPath': str(self._path), 'inputMode': self._input_mode,
                'warmupMs': self._warmup_ms, 'labelCount': len(self._labels),
                'fallback': False}


class ModelManager:
    """Holds the engine. One instance, created at startup, shared by all
    requests — the load-once design point from ARCHITECTURE.md §2."""

    def __init__(self, model_dir: Path, vocabulary: Vocabulary | None = None):
        self.model_dir = model_dir
        self.vocabulary = vocabulary or Vocabulary.load(model_dir / 'vocabulary.json')
        self.engine: Optional[BaseEngine] = None
        self.loaded_at: Optional[str] = None
        self._load()
        log.info('model engine: %s (fallback=%s)',
                 self.engine.id, self.engine.status()['fallback'])

    # ── resolution ─────────────────────────────────────────────
    def _load(self) -> None:
        for path, labels in self._candidates():
            try:
                self.engine = KerasEngine(path, labels)
            except ApiError as exc:
                log.warning('weights %s exist but unloadable: %s — using rule engine',
                            path.name, exc.message)
            except Exception as exc:                # pragma: no cover (env-dependent)
                log.warning('weights %s failed to load: %s — using rule engine',
                            path.name, exc)
                continue
            self.loaded_at = datetime.now(timezone.utc).isoformat()
            return
        self.engine = RuleEngine()                  # the honest default

    def _candidates(self) -> list[tuple[Path, list[str]]]:
        """Weight files + the class list that matches each one."""
        if not self.model_dir.exists():
            return []
        vocab_labels = self.vocabulary.labels()
        pairs: list[tuple[Path, list[str]]] = []
        for p in sorted(self.model_dir.iterdir()):
            if p.suffix.lower() not in ('.h5', '.keras', '.tflite', '.onnx', '.pkl'):
                continue
            sidecar = p.with_name(p.stem + '_labels.json')
            if sidecar.exists():
                labels = json.loads(sidecar.read_text(encoding='utf-8'))
            elif len(vocab_labels) >= 26:           # full A–Z + words available
                labels = vocab_labels
            else:
                labels = list(_DEFAULT_LETTERS)
            pairs.append((p, labels))
        return pairs

    # ── public API ─────────────────────────────────────────────
    def classify(self, hand: list[list[float]]) -> dict[str, Any]:
        return self.engine.classify(hand)

    def predict_window(self, window: list[list[float]]) -> dict[str, Any]:
        result = self.engine.predict_window(window)
        if self.engine.id == 'tensorflow':
            result['type'] = self.vocabulary.type_of(result['gesture'])
        return result

    def status(self) -> dict[str, Any]:
        s = self.engine.status()
        s['loadedAt'] = self.loaded_at
        s['vocabulary'] = {'letters': len(self.vocabulary.letters),
                           'words': self.vocabulary.words}
        return s