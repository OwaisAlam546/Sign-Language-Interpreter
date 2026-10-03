"""Evaluate labeled MediaPipe landmark JSONL samples.

Each line must be: {"label":"A", "frames":[[[x,y,z], ...]]}
This reports accuracy, per-label precision/recall, and a confusion matrix.
It intentionally evaluates the active rule engine; when trained weights are
available, use the API smoke suite for model-backed sequence evaluation.
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

from app.utils.landmarks import classify


def main() -> int:
    if len(sys.argv) != 2:
        print('usage: python scripts/evaluate_landmarks.py path/to/labeled.jsonl')
        return 2
    path = Path(sys.argv[1])
    if not path.exists():
        print(f'file not found: {path}')
        return 2
    rows = [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]
    if not rows:
        print('no labeled samples found')
        return 2
    matrix = defaultdict(Counter)
    correct = 0
    for row in rows:
        expected = str(row['label']).upper()
        frames = row.get('frames') or [row.get('landmarks')]
        predictions = [classify(frame)['gesture'] for frame in frames if frame]
        predicted = Counter(predictions).most_common(1)[0][0] if predictions else 'UNKNOWN'
        matrix[expected][predicted] += 1
        correct += predicted == expected
    labels = sorted(set(matrix) | {p for values in matrix.values() for p in values})
    print(f'samples: {len(rows)}')
    print(f'accuracy: {correct / len(rows):.4f}')
    print('label precision recall support')
    for label in labels:
        tp = matrix[label][label]
        predicted_total = sum(values[label] for values in matrix.values())
        support = sum(matrix[label].values())
        precision = tp / predicted_total if predicted_total else 0
        recall = tp / support if support else 0
        print(f'{label:>5} {precision:9.4f} {recall:6.4f} {support:7}')
    print('confusion matrix: expected -> predicted')
    for expected in labels:
        errors = ', '.join(f'{pred}:{count}' for pred, count in matrix[expected].items() if pred != expected)
        if errors:
            print(f'{expected}: {errors}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
