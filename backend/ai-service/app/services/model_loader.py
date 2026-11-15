# ─────────────────────────────────────────────────────────────
#  services/model_loader.py — Strict Model Loader & Manager (Phase 3)
#  Explicit model selection, strict dimension/label validation,
#  deterministic fallback, and comprehensive status introspection.
# ─────────────────────────────────────────────────────────────
from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import numpy as np

from app.services.feature_extractor import extract_alphabet_features
from app.utils import landmarks
from app.utils.envelope import ApiError
from app.utils.vocabulary import Vocabulary

log = logging.getLogger('app')

_DEFAULT_LETTERS = [chr(c) for c in range(ord('A'), ord('Z') + 1)]
_SUPPORTED_KERAS_EXTENSIONS = ('.keras', '.h5')


class BaseEngine:
    """Interface every engine implements: classify a hand, predict sequence, self-describe."""

    id = 'base'

    def classify(self, hand: list[list[float]]) -> dict[str, Any]:
        raise NotImplementedError

    def predict_window(self, window: list[list[float]]) -> dict[str, Any]:
        raise NotImplementedError

    @property
    def is_frame_model(self) -> bool:
        return True

    def status(self) -> dict[str, Any]:
        raise NotImplementedError


class RuleEngine(BaseEngine):
    """Deterministic, zero-dependency recognizer over MediaPipe hand landmarks."""

    id = 'rule'

    def __init__(self, fallback_reason: str = 'No trained weights configured (or ML runtime absent)'):
        self.fallback_reason = fallback_reason

    def classify(self, hand: list[list[float]], is_left_hand: bool = False) -> dict[str, Any]:
        return {**landmarks.classify(hand), 'engine': 'rule'}

    def predict_window(self, window: list[list[float]]) -> dict[str, Any]:
        if not window:
            return {
                'gesture': 'UNKNOWN',
                'confidence': 0.0,
                'probs': {'UNKNOWN': 0.0},
                'engine': 'rule',
            }
        # The window arrives as W rows of 63 flat features (LSTM layout).
        # Unflatten each row to a 21x3 hand and vote per frame.
        hands = [
            [row[j * 3:(j + 1) * 3] for j in range(21)]
            for row in window
            if len(row) >= 63
        ]
        if not hands:
            return {
                'gesture': 'UNKNOWN',
                'confidence': 0.0,
                'probs': {'UNKNOWN': 0.0},
                'engine': 'rule',
            }
        votes = [self.classify(h) for h in hands]
        by_label: dict[str, float] = {}
        for v in votes:
            by_label[v['gesture']] = by_label.get(v['gesture'], 0.0) + v['confidence']
        winner = max(by_label, key=by_label.get)
        confidence = round(by_label[winner] / len(votes), 4)
        if winner != 'UNKNOWN':
            by_label['UNKNOWN'] = max(0.0, 1.0 - confidence)
        return {
            'gesture': winner,
            'confidence': confidence,
            'probs': by_label,
            'engine': 'rule',
        }

    @property
    def is_frame_model(self) -> bool:
        return True

    def status(self) -> dict[str, Any]:
        return {
            'engine': 'rule',
            'loaded': False,
            'modelName': None,
            'modelPath': None,
            'inputMode': 'frame',
            'isFrameModel': True,
            'inputShape': None,
            'outputShape': None,
            'featureDim': 63,
            'windowSize': 1,
            'labelCount': len(_DEFAULT_LETTERS),
            'outputClasses': len(_DEFAULT_LETTERS),
            'labels': list(_DEFAULT_LETTERS),
            'warmupMs': None,
            'fallback': True,
            'fallbackReason': self.fallback_reason,
        }


_RULE_ENGINE = RuleEngine()  # shared singleton for frame models handling sequence calls


class KerasEngine(BaseEngine):
    """TensorFlow/Keras inference engine with strict input/output dimension contracts."""

    id = 'tensorflow'

    def __init__(self, path: Path, labels: list[str]):
        self._path = path
        self._labels = labels
        self._input_mode: str = 'frame'
        self._window_size: int = 1
        self._feature_dim: int = 63
        self._warmup_ms: Optional[float] = None

        if path.suffix.lower() not in _SUPPORTED_KERAS_EXTENSIONS:
            raise ApiError(500, 'UNSUPPORTED_MODEL_FORMAT',
                           f'KerasEngine only supports .keras and .h5 files, received {path.suffix}')

        try:
            from keras.models import load_model
            self._model = load_model(path)
        except ImportError as exc:
            raise ApiError(503, 'MODEL_RUNTIME_MISSING',
                           'tensorflow not installed — pip install tensorflow') from exc
        except Exception as exc:
            raise ApiError(500, 'MODEL_LOAD_FAILED',
                           f'Failed to load model {path.name}: {exc}') from exc

        self._validate_contract()
        self.warm_up()

    # ── contract validation ───────────────────────────────────
    def _validate_contract(self) -> None:
        if not self._model.inputs:
            raise ApiError(500, 'INVALID_MODEL_INPUT', f'Model {self._path.name} defines no input tensor')
        in_shape = tuple(self._model.inputs[0].shape)

        if len(in_shape) == 3:
            # Sequence model: (batch, window, features)
            self._input_mode = 'sequence'
            self._window_size = int(in_shape[1]) if in_shape[1] is not None else 12
            self._feature_dim = int(in_shape[2]) if in_shape[2] is not None else 63
            if self._feature_dim not in (63, 90):
                raise ApiError(500, 'INVALID_INPUT_DIMENSION',
                               f'Sequence model expects 63 or 90 features per frame, got {self._feature_dim}')
        elif len(in_shape) == 2:
            # Frame model: (batch, features)
            self._input_mode = 'frame'
            self._window_size = 1
            self._feature_dim = int(in_shape[1]) if in_shape[1] is not None else 63
            if self._feature_dim not in (21, 63, 90):
                raise ApiError(500, 'INVALID_INPUT_DIMENSION',
                               f'Frame model expects 21, 63, or 90 features, got {self._feature_dim}')
        else:
            raise ApiError(500, 'INVALID_MODEL_RANK',
                           f'Unsupported input tensor rank {len(in_shape)} for model {self._path.name}')

        if not self._model.outputs:
            raise ApiError(500, 'INVALID_MODEL_OUTPUT', f'Model {self._path.name} defines no output tensor')
        out_shape = tuple(self._model.outputs[0].shape)
        output_classes = int(out_shape[-1])

        if len(self._labels) != output_classes:
            raise ApiError(500, 'MODEL_LABEL_MISMATCH',
                           f'Model output dimension ({output_classes}) does not match label count ({len(self._labels)}) for {self._path.name}')

        if len(set(self._labels)) != len(self._labels):
            raise ApiError(500, 'DUPLICATE_LABELS',
                           f'Class list contains duplicate labels for {self._path.name}')

        if any(not isinstance(lbl, str) or not lbl.strip() for lbl in self._labels):
            raise ApiError(500, 'INVALID_LABELS',
                           f'Labels must be non-empty strings for {self._path.name}')

    def warm_up(self) -> None:
        """One dummy inference at load time to initialize graph & memory buffers."""
        shape = self._model.inputs[0].shape
        batch_shape = (1,) + tuple(int(d) if d is not None else 1 for d in shape[1:])
        dummy = np.zeros(batch_shape, dtype=np.float32)
        start = time.perf_counter()
        self._model.predict(dummy, verbose=0)
        self._warmup_ms = round((time.perf_counter() - start) * 1000, 1)

    # ── inference ─────────────────────────────────────────────
    def classify(self, hand: list[list[float]], is_left_hand: bool = False) -> dict[str, Any]:
        """Single hand -> label."""
        if self._input_mode == 'sequence':
            # Sequence models (like LSTM) cannot evaluate one isolated frame without temporal context
            return {**landmarks.classify(hand), 'engine': 'rule'}

        if self._feature_dim == 90:
            # 90D Dense frame model: extract engineered features
            features = extract_alphabet_features(hand, is_left_hand=is_left_hand)
            frame = features[np.newaxis, :]  # shape: (1, 90)
        else:
            frame = np.asarray(hand, dtype=np.float32)
            if frame.ndim == 2 and self._feature_dim == 63:
                frame = frame.flatten()
            frame = frame[np.newaxis, ...]

        pred = self._model.predict(frame, verbose=0)[0]
        idx = int(pred.argmax())
        label = self._labels[idx]
        return {
            'gesture': label,
            'confidence': float(pred.max()),
            'probs': {self._labels[i]: float(p) for i, p in enumerate(pred)},
            'engine': 'tensorflow',
        }

    def predict_window(self, window: list[list[float]]) -> dict[str, Any]:
        """A (W, features) window -> softmax probabilities -> label."""
        if self._input_mode == 'frame':
            # Frame models judge single frames; soft-vote over window frames
            probs_list = []
            for row in window:
                h = [row[j * 3:(j + 1) * 3] for j in range(21)] if len(row) == 63 else row
                res = self.classify(h)
                probs = res.get('probs') or {res['gesture']: res['confidence']}
                probs_list.append(probs)

            by_label: dict[str, float] = {}
            for p in probs_list:
                for k, v in p.items():
                    by_label[k] = by_label.get(k, 0.0) + v
            winner = max(by_label, key=by_label.get)
            confidence = round(by_label[winner] / len(probs_list), 4)
            return {
                'gesture': winner,
                'confidence': confidence,
                'probs': {k: v / len(probs_list) for k, v in by_label.items()},
                'engine': 'tensorflow',
            }

        batch = np.asarray(window, dtype=np.float32)
        if batch.ndim == 3 and batch.shape[1] == 21 and batch.shape[2] == 3:
            batch = batch.reshape((batch.shape[0], 63))
        if batch.ndim == 2:
            batch = batch[np.newaxis, ...]
        if batch.ndim != 3:
            raise ApiError(400, 'INVALID_TENSOR_SHAPE', f'Expected rank 3 tensor (batch, window, features), got rank {batch.ndim}')

        # Defensively ensure window size matches exact model requirement (e.g. 12)
        if batch.shape[1] != self._window_size:
            if batch.shape[1] < self._window_size:
                pad_count = self._window_size - batch.shape[1]
                pad_frames = np.repeat(batch[:, :1, :], pad_count, axis=1)
                batch = np.concatenate([pad_frames, batch], axis=1)
            else:
                batch = batch[:, -self._window_size:, :]

        if batch.shape[2] != self._feature_dim:
            raise ApiError(400, 'INVALID_FEATURE_DIM', f'Expected feature dimension {self._feature_dim}, got {batch.shape[2]}')

        np.nan_to_num(batch, copy=False, nan=0.0, posinf=0.0, neginf=0.0)
        probs = self._model.predict(batch, verbose=0)[0]
        idx = int(probs.argmax())
        return {
            'gesture': self._labels[idx],
            'confidence': float(probs[idx]),
            'probs': {self._labels[i]: float(p) for i, p in enumerate(probs)},
            'engine': 'tensorflow',
        }

    @property
    def is_frame_model(self) -> bool:
        return self._input_mode == 'frame'

    def status(self) -> dict[str, Any]:
        return {
            'engine': 'tensorflow',
            'loaded': True,
            'modelName': self._path.name,
            'modelPath': str(self._path),
            'inputMode': self._input_mode,
            'isFrameModel': self.is_frame_model,
            'inputShape': [int(d) if d is not None else None for d in self._model.inputs[0].shape],
            'outputShape': [int(d) if d is not None else None for d in self._model.outputs[0].shape],
            'featureDim': self._feature_dim,
            'windowSize': self._window_size,
            'labelCount': len(self._labels),
            'outputClasses': len(self._labels),
            'labels': self._labels,
            'warmupMs': self._warmup_ms,
            'fallback': False,
            'fallbackReason': None,
        }


class ModelManager:
    """Manages active recognition engine. Explicit configuration, strict validation, zero partial state."""

    def __init__(
        self,
        model_dir: Path,
        vocabulary: Vocabulary | None = None,
        model_name: str | None = None,
        model_path: Path | None = None,
    ):
        self.model_dir = model_dir
        self.configured_model_name = model_name
        self.configured_model_path = model_path
        self.vocabulary = vocabulary or Vocabulary.load(model_dir / 'vocabulary.json')
        self.engine: BaseEngine = RuleEngine()  # guaranteed initialized: never None
        self.loaded_at: Optional[str] = None
        self._load()
        log.info(
            'model engine: %s (loaded=%s, fallback=%s)',
            self.engine.id,
            self.engine.status()['loaded'],
            self.engine.status()['fallback'],
        )

    # ── explicit resolution & loading ─────────────────────────
    def _resolve_target_model(self) -> tuple[Path, list[str]] | None:
        """Resolves target model based on explicit configuration hierarchy:
        1. Exact configured path (model_path)
        2. Configured model filename in model_dir (model_name)
        3. Designated default model (alphabet_landmark_model.keras)
        4. First valid non-LSTM candidate in model_dir
        """
        if self.configured_model_path:
            p = Path(self.configured_model_path)
            if not p.is_absolute():
                p = self.model_dir / p
            if not p.exists():
                log.error('Configured model path does not exist: %s', p)
                return None
            return p, self._resolve_labels(p)

        if self.configured_model_name:
            p = self.model_dir / self.configured_model_name
            if not p.exists():
                log.error('Configured model name does not exist in %s: %s', self.model_dir, self.configured_model_name)
                return None
            return p, self._resolve_labels(p)

        # Designated active default: alphabet_landmark_model.keras
        default_model = self.model_dir / 'alphabet_landmark_model.keras'
        if default_model.exists():
            return default_model, self._resolve_labels(default_model)

        # Candidate scan strictly for .keras and .h5 (filtering out archived LSTM models)
        candidates = [c for c in self._candidates() if 'toy' not in c[0].name.lower() and 'lstm' not in c[0].name.lower()]
        return candidates[0] if candidates else None

    def _resolve_labels(self, path: Path) -> list[str]:
        sidecar = path.with_name(path.stem + '_labels.json')
        if not sidecar.exists():
            alt = path.parent / f"{path.stem.replace('_model', '')}_labels.json"
            if alt.exists():
                sidecar = alt
        if sidecar.exists():
            try:
                loaded = json.loads(sidecar.read_text(encoding='utf-8'))
                if isinstance(loaded, list) and loaded:
                    return [str(lbl).strip() for lbl in loaded]
            except Exception as e:
                log.warning('Malformed sidecar label file %s: %s', sidecar.name, e)
        vocab_labels = self.vocabulary.labels()
        if len(vocab_labels) >= 26:
            return vocab_labels
        return list(_DEFAULT_LETTERS)

    def _candidates(self) -> list[tuple[Path, list[str]]]:
        if not self.model_dir.exists():
            return []
        pairs: list[tuple[Path, list[str]]] = []
        for p in sorted(self.model_dir.iterdir()):
            if p.suffix.lower() not in _SUPPORTED_KERAS_EXTENSIONS:
                continue
            pairs.append((p, self._resolve_labels(p)))
        return pairs

    def _load(self) -> None:
        target = self._resolve_target_model()
        if target is None:
            self.engine = RuleEngine(
                fallback_reason=f'No valid model found in {self.model_dir}'
                + (f' (requested: {self.configured_model_name})' if self.configured_model_name else '')
            )
            return

        path, labels = target
        try:
            self.engine = KerasEngine(path, labels)
            self.loaded_at = datetime.now(timezone.utc).isoformat()
            log.info('Successfully loaded Keras model: %s (%d classes)', path.name, len(labels))
        except ApiError as exc:
            log.warning('Model %s failed validation: %s — falling back to rule engine', path.name, exc.message)
            self.engine = RuleEngine(fallback_reason=f'{path.name}: {exc.message}')
            self.loaded_at = None
        except Exception as exc:
            log.warning('Model %s failed to load: %s — falling back to rule engine', path.name, exc)
            self.engine = RuleEngine(fallback_reason=f'{path.name}: {exc}')
            self.loaded_at = None

    # ── public facade ─────────────────────────────────────────
    def classify(self, hand: list[list[float]], is_left_hand: bool = False) -> dict[str, Any]:
        return self.engine.classify(hand, is_left_hand=is_left_hand)

    def predict_window(self, window: list[list[float]]) -> dict[str, Any]:
        result = self.engine.predict_window(window)
        if self.engine.id == 'tensorflow':
            result['type'] = self.vocabulary.type_of(result['gesture'])
        return result

    @property
    def is_frame_model(self) -> bool:
        return self.engine.is_frame_model

    def status(self) -> dict[str, Any]:
        s = self.engine.status()
        s['loadedAt'] = self.loaded_at
        s['vocabulary'] = {
            'letters': len(self.vocabulary.letters),
            'words': self.vocabulary.words,
        }
        return s
