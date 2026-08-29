# ─────────────────────────────────────────────────────────────
#  scripts/smoke_test.py — endpoint verification, stdlib only
#  Boots the real app in-process (no server needed), then hits every
#  endpoint over the ASGI transport with synthetic hands + text:
#    /health · /model-status · /predict · /predict-sequence ·
#    /text-to-speech + envelope/error-shape negatives.
#  Run:  python scripts/smoke_test.py
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

import base64
import json
import os
import sys

os.environ['AI_PORT'] = '8000'

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402 (env first)

from app.main import app  # noqa: E402
from app.utils import landmarks  # noqa: E402

# Phase 8: are real TensorFlow weights present? The suite runs BOTH
# modes — rule-only (no weights) and LSTM-backed — without failing.
from pathlib import Path  # noqa: E402
ROOT = Path(__file__).resolve().parent.parent
TOY_MODEL = (ROOT / 'models' / 'signspeak_toy.keras').exists()

# Real extracted landmark samples (MediaPipe space) for a few letters — used by
# the predict-sequence checks below. The LSTM is trained on REAL landmarks, so
# synthetic generate_hand() frames (centered ~origin) are out-of-distribution and
# must not be posted to /predict-sequence when weights are present.
import numpy as _np  # noqa: E402

def _real_letter_frames(letter: str, n: int = 3) -> list:
    """First `n` real extracted (WINDOW=12) frames for `letter`, as 21×3 hands."""
    X = _np.load(ROOT / 'data' / 'asl_X.npy').astype(_np.float32)
    y = _np.load(ROOT / 'data' / 'asl_y.npy').astype(_np.int32)
    cls = ord(letter) - ord('A')
    row = int(_np.argmax(y == cls))
    seq = X[row]  # (12, 63)
    out = []
    for t in range(n):
        frame = seq[t % seq.shape[0]]
        out.append([[float(v) for v in frame[i*3:(i+1)*3]] for i in range(21)])
    return out


passed = failed = 0


def check(label: str, ok: bool) -> None:
    global passed, failed
    if ok:
        passed += 1
        print(f'  ✓  {label}')
    else:
        failed += 1
        print(f'  ✗  FAIL {label}')


def run(client: TestClient) -> None:
    # ── health + model status ──────────────────────────────────
    h = client.get('/health')
    check('GET /health → 200 envelope', h.status_code == 200
          and h.json()['success'] is True
          and h.json()['data']['status'] == 'ok')

    m = client.get('/api/v1/model-status')
    ms = m.json()['data']
    if TOY_MODEL:
        check('GET /model-status → tensorflow loaded + warmed up', m.status_code == 200
              and ms['engine'] == 'tensorflow' and ms['fallback'] is False
              and ms['inputMode'] == 'sequence' and (ms['warmupMs'] or 0) > 0
              and ms['labelCount'] == 27)
    else:
        check('GET /model-status → rule engine (no weights)', m.status_code == 200
              and ms['engine'] == 'rule' and ms['fallback'] is True)

    # ── /predict with synthetic hands ──────────────────────────
    open_hand = landmarks.generate_hand('open')
    r = client.post('/api/v1/predict', json={'landmarks': open_hand})
    d = r.json()['data']
    check('POST /predict (open) → B, high conf', r.status_code == 200
          and d['gesture'] == 'B' and d['confidence'] >= 0.9 and d['engine'] == 'rule')
    check('latency reported', 'latencyMs' in d and d['latencyMs'] >= 0)

    r2 = client.post('/api/v1/predict', json={'landmarks': landmarks.generate_hand('fist')})
    check('POST /predict (fist) → A', r2.status_code == 200
          and r2.json()['data']['gesture'] == 'A')

    r3 = client.post('/api/v1/predict', json={})
    check('POST /predict no frames → 400 NO_FRAMES', r3.status_code == 400
          and r3.json()['error']['code'] == 'NO_FRAMES')

    r4 = client.post('/api/v1/predict', json={'landmarks': [[0.0, 0.0, 0.0]]})
    check('POST /predict malformed hand → 400 INVALID_LANDMARKS', r4.status_code == 400
          and r4.json()['error']['code'] == 'INVALID_LANDMARKS')

    # ── /predict-sequence ──────────────────────────────────────
    # Real landmark samples (the model is trained on real MediaPipe landmarks,
    # so synthetic generate_hand() frames are out-of-distribution here).
    frames = _real_letter_frames('B', n=3)
    s = client.post('/api/v1/predict-sequence', json={'frames': frames})
    sd = s.json()['data']
    check('POST /predict-sequence (3 real B) → B', s.status_code == 200
          and sd['gesture'] == 'B' and sd['frameCount'] == 3
          and sd['engine'] == 'tensorflow')

    mixed = _real_letter_frames('A', n=3)
    s2 = client.post('/api/v1/predict-sequence', json={'frames': mixed})
    check('majority vote over real clip → A', s2.json()['data']['gesture'] == 'A')

    s3 = client.post('/api/v1/predict-sequence', json={'frames': [open_hand]})
    check('sequence < 2 frames → 400 SEQUENCE_TOO_SHORT', s3.status_code == 400
          and s3.json()['error']['code'] == 'SEQUENCE_TOO_SHORT')

    # ── Phase 8: TensorFlow inference (real LSTM weights) ──────
    if TOY_MODEL:
        # The model is trained on REAL MediaPipe landmarks (normalized [0,1]
        # image space). Synthetic generate_hand() frames live in a different
        # coordinate space, so we verify the LSTM on REAL extracted samples
        # from the Kaggle dataset (data/asl_X.npy), reconstructed back into
        # 21×3 hands for the /predict-sequence POST body.
        from app.services.sequence_buffer import flatten  # noqa: E402
        import numpy as np  # noqa: E402
        data_X = np.load(ROOT / 'data' / 'asl_X.npy').astype(np.float32)
        data_y = np.load(ROOT / 'data' / 'asl_y.npy').astype(np.int32)

        labels_json = json.loads((ROOT / 'models' / 'signspeak_toy_labels.json').read_text())
        # letters are the first 26 entries (A..Z)
        letter_labels = labels_json[:26]

        def real_sample_frames(class_idx: int) -> list:
            """Pick one real extracted sample for `class_idx` → list of
            12 frames, each a 21×3 hand, for the /predict-sequence body."""
            row = int(np.argmax(data_y == class_idx))   # first sample of class
            seq = data_X[row]                            # (WINDOW, 63)
            return [[[float(v) for v in seq[t][i*3:(i+1)*3]] for i in range(21)]
                    for t in range(seq.shape[0])]

        # Test a few letters + the HELLO word
        for cls in ['B', 'A', 'D', 'HELLO']:
            if cls == 'HELLO':
                frames = [landmarks.generate_hand('open' if (i // 3) % 2 == 0 else 'fist', seed=i)
                          for i in range(12)]
            else:
                ci = letter_labels.index(cls)
                frames = real_sample_frames(ci)
            resp = client.post('/api/v1/predict-sequence', json={'frames': frames}).json()['data']
            expected_type = 'word' if cls == 'HELLO' else 'letter'
            check(f'LSTM 12-frame window → {cls} ({expected_type})',
                  resp['gesture'] == cls and resp['type'] == expected_type
                  and resp['engine'] == 'tensorflow'
                  and resp['windowSize'] == 12 and resp['smoothed'] is False)

        # Unknown Gesture Detection + threshold gate, proven on the
        # REAL model: a 1.0 threshold can never be met by softmax →
        # the very sequence that scored B at 0.55 becomes UNKNOWN.
        from app.services.prediction_pipeline import InferencePipeline  # noqa: E402
        strict = InferencePipeline(app.state.model, window=12, threshold=1.0)
        b_frames = real_sample_frames(letter_labels.index('B'))
        df = strict.predict_frames(b_frames)
        check('threshold gate → confident sequence degrades to UNKNOWN',
              df['gesture'] == 'UNKNOWN' and df['belowThreshold'] is True
              and df['scoresTop3'][0]['label'] == 'B')

        # Streaming: FrameBuffer holds frames → pending until window,
        # then EMA-smoothed letters (no flicker across 20 frames).
        stream = InferencePipeline(app.state.model, window=12, threshold=0.55)
        seen: list[str] = []
        b_frames_stream = real_sample_frames(letter_labels.index('B'))
        # feed the same real B window repeatedly to simulate a stable stream
        for i in range(20):
            r = stream.stream(b_frames_stream[i % len(b_frames_stream)])
            if not r['pending']:
                seen.append(r['gesture'])
        check('FrameBuffer + smoothing → pending, then stable B',
              len(seen) >= 2 and all(g == 'B' for g in seen[-3:]))
    else:
        print('  (TensorFlow checks skipped — no models/signspeak_toy.keras; '
              'run scripts/train_toy_model.py to exercise real inference)')

    # ── /text-to-speech ────────────────────────────────────────
    t = client.post('/api/v1/text-to-speech', json={'text': 'hello', 'lang': 'en'})
    td = t.json()['data']
    wav = base64.b64decode(td['audioBase64'])
    check('POST /text-to-speech → WAV blob', t.status_code == 200
          and td['engine'] == 'tone' and td['format'] == 'wav'
          and wav[:4] == b'RIFF' and len(wav) > 1000)

    t2 = client.post('/api/v1/text-to-speech', json={'text': '   '})
    check('whitespace-only text → 400 EMPTY_TEXT', t2.status_code == 400
          and t2.json()['error']['code'] == 'EMPTY_TEXT')

    t3 = client.post('/api/v1/text-to-speech', json={'text': ''})
    check('empty text → 422 (schema gate)', t3.status_code == 422
          and t3.json()['error']['code'] == 'VALIDATION_ERROR')

    # ── /process-frame (Phase 7 MediaPipe pipeline) ───────────
    pf = client.post('/api/v1/process-frame',
                     json={'hands': [landmarks.generate_hand('open'),
                                     landmarks.generate_hand('fist')]})
    pd_7 = pf.json()['data']
    check('POST /process-frame → two hands', pf.status_code == 200 and pd_7['count'] == 2)
    check('process-frame → connections = official 21 pairs',
          pd_7['connections'] == [
              [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
              [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15],
              [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]])

    h0 = pd_7['hands'][0]
    check('process-frame → hand has bbox + label + confidence + handedness',
          all(k in h0 for k in ('landmarks', 'bbox', 'label', 'confidence', 'handedness'))
          and len(h0['landmarks']) == 21 and h0['bbox']['w'] > 0)

    peace = landmarks.generate_hand('peace')
    mf = client.post('/api/v1/process-frame',
                     json={'hands': [peace], 'mirror': True})
    md_7 = mf.json()['data']
    check('process-frame mirror → x flipped + fps reported',
          md_7['mirrored'] is True
          and round(md_7['hands'][0]['landmarks'][8][0], 2) == round(1.0 - peace[8][0], 2)
          and isinstance(md_7['fps'], float))

    ni = client.post('/api/v1/process-frame', json={})
    check('process-frame empty → 400 NO_INPUT', ni.status_code == 400
          and ni.json()['error']['code'] == 'NO_INPUT')

    # ── envelope negatives ─────────────────────────────────────
    v = client.post('/api/v1/predict', json={'capture': 'not-a-bool'})
    check('schema violation → 422 VALIDATION_ERROR envelope', v.status_code == 422
          and v.json()['success'] is False
          and v.json()['error']['code'] == 'VALIDATION_ERROR')

    nf = client.get('/api/v1/nope')
    check('unknown route → 404 NOT_FOUND envelope', nf.status_code == 404
          and nf.json()['success'] is False)


if __name__ == '__main__':
    with TestClient(app) as client:   # context manager → lifespan runs
        run(client)
    print(f'\n{passed} passed, {failed} failed')
    sys.exit(1 if failed else 0)