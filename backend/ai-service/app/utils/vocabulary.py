# ─────────────────────────────────────────────────────────────
#  utils/vocabulary.py — the class vocabulary (A–Z + words)
#  The model's output layer is one index per vocabulary entry.
#  "Dynamic words": the word list lives in DATA (models/vocabulary.json,
#  checked in) — extend it, retrain, and the service learns new
#  word gestures without a single line of code changing.
#  Default when the JSON is absent: A–Z (26 letters) — the classic
#  finger-spelling model. Words are tagged 'word', letters 'letter',
#  low-confidence 'unknown' — the client renders them differently.
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

import json
from pathlib import Path

_LETTERS = [chr(c) for c in range(ord('A'), ord('Z') + 1)]


class Vocabulary:
    def __init__(self, letters: list[str], words: list[str]):
        self.letters = letters
        self.words = words

    @classmethod
    def load(cls, path: Path | None) -> 'Vocabulary':
        if path and path.exists():
            raw = json.loads(path.read_text(encoding='utf-8'))
            return cls(list(raw.get('letters', _LETTERS)),
                       [w.upper() for w in raw.get('words', [])])
        return cls(_LETTERS, [])       # honest default: pure A–Z

    # ── combined class list: [A..Z, word₁, word₂, …] ──────────
    def labels(self) -> list[str]:
        return self.letters + self.words

    def index(self, label: str) -> int:
        return self.labels().index(label)

    @staticmethod
    def type_of(label: str) -> str:
        if label.startswith('UNKNOWN'):
            return 'unknown'
        return 'word' if len(label) > 1 else 'letter'