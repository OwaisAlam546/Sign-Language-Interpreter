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
              and ms['labelCount'] == 5)
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
    frames = [landmarks.generate_hand('open', seed=i) for i in range(3)]
    s = client.post('/api/v1/predict-sequence', json={'frames': frames})
    sd = s.json()['data']
    check('POST /predict-sequence (3 open) → B + votes', s.status_code == 200
          and sd['gesture'] == 'B' and sd['frameCount'] == 3 and sd['votes']['B'] == 3)

    mixed = [landmarks.generate_hand('fist', seed=i) for i in range(3)]
    s2 = client.post('/api/v1/predict-sequence', json={'frames': mixed})
    check('majority vote over split clip → A', s2.json()['data']['gesture'] == 'A')

    s3 = client.post('/api/v1/predict-sequence', json={'frames': [open_hand]})
    check('sequence < 2 frames → 400 SEQUENCE_TOO_SHORT', s3.status_code == 400
          and s3.json()['error']['code'] == 'SEQUENCE_TOO_SHORT')

    # ── Phase 8: TensorFlow inference (real LSTM weights) ──────
    if TOY_MODEL:
        seq_open = [landmarks.generate_hand('open', seed=i) for i in range(12)]
        tf = client.post('/api/v1/predict-sequence', json={'frames': seq_open}).json()['data']
        check('LSTM 12-frame window → B (letter)', tf['gesture'] == 'B'
              and tf['type'] == 'letter' and tf['engine'] == 'tensorflow'
              and tf['windowSize'] == 12 and tf['smoothed'] is False)

        seq_hello = [landmarks.generate_hand('open' if (i // 3) % 2 == 0 else 'fist', seed=i)
                     for i in range(12)]
        th = client.post('/api/v1/predict-sequence', json={'frames': seq_hello}).json()['data']
        check('LSTM dynamic word sequence → word (HELLO)', th['gesture'] == 'HELLO'
              and th['type'] == 'word')

        # Unknown Gesture Detection + threshold gate, proven on the
        # REAL model: a 1.0 threshold can never be met by softmax →
        # the very sequence that scored B at 0.55 becomes UNKNOWN.
        from app.services.prediction_pipeline import InferencePipeline  # noqa: E402
        strict = InferencePipeline(app.state.model, window=12, threshold=1.0)
        df = strict.predict_frames([landmarks.generate_hand('open')] * 12)
        check('threshold gate → confident sequence degrades to UNKNOWN',
              df['gesture'] == 'UNKNOWN' and df['belowThreshold'] is True
              and df['scoresTop3'][0]['label'] == 'B')

        # Streaming: FrameBuffer holds frames → pending until window,
        # then EMA-smoothed letters (no flicker across 20 frames).
        stream = InferencePipeline(app.state.model, window=12, threshold=0.55)
        seen: list[str] = []
        for i in range(20):
            r = stream.stream(landmarks.generate_hand('open', seed=i))
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