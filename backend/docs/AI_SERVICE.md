# SignSpeak AI — FastAPI inference microservice (Phase 6)

> `backend/ai-service` — the AI half of the two-service backend.
> Gateway = Express :5000 (auth + CRUD + Mongo), this = FastAPI :8000
> (gesture inference + TTS). The gateway probes `GET /health` here to
> decide whether the AI dependency is up (`/health/ai` on the gateway).

## Run it

```bash
cd backend/ai-service
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt        # Windows (git-bash: .venv/Scripts/pip)
.venv\Scripts\python -m uvicorn app.main:app --port 8000
```

Open http://localhost:8000/api/docs for the interactive Swagger UI,
or hit the endpoints directly (see table below).

Verify: `npm test` (alias for the 15-check in-process smoke suite) or
`python scripts/smoke_test.py` directly.

---

## Endpoints

| Method | Path                    | Purpose                                   |
| ------ | ----------------------- | ----------------------------------------- |
| GET    | `/health`               | liveness + engine info (gateway probe)    |
| POST   | `/api/v1/predict`       | one hand (21 landmarks) → one gesture     |
| POST   | `/api/v1/process-frame` | full hand pipeline: detect → skeleton + bbox + predictions |
| POST   | `/api/v1/predict-sequence` | N frames → one smoothed decision       |
| GET    | `/api/v1/model-status`  | is a trained model loaded, or fallback?   |
| POST   | `/api/v1/text-to-speech`| text → base64 audio (WAV tone / gTTS MP3) |

**Request shapes**

- `POST /predict` — `{"landmarks": [[x,y,z] × 21], "capture": false, "sampleId": "..."}`
  (send `{capture: true}` instead to pull a frame from the server webcam —
  falls back to the mock camera when OpenCV is absent).
- `POST /predict-sequence` — `{"frames": [[[x,y,z] × 21] × 2..120], "strategy": "majority|average"}`
- `POST /text-to-speech` — `{"text": "hello", "lang": "en"}`

Every response uses the same envelope as the gateway:
`{"success": true, "data": …}` / `{"success": false, "error": {"code", "message"}}`.
Error codes: `INVALID_LANDMARKS`, `NO_FRAMES`, `SEQUENCE_TOO_SHORT`,
`EMPTY_TEXT`, `MODEL_LOAD_FAILED`, `VALIDATION_ERROR`, `NOT_FOUND`.

---

## Package layout (each file's job)

```
ai-service/
├─ app/
│  ├─ main.py                 # app factory: middleware, exception handlers,
│  │                          # lifespan (model/camera/TTS singletons), routes
│  ├─ config.py               # Settings from .env (host/port/model dir/TTS mode)
│  ├─ logging.py              # console logging + per-request access log
│  ├─ schemas.py              # Pydantic request models (shape validation)
│  ├─ routers/
│  │  ├─ health.py            # GET /health, GET /
│  │  ├─ predict.py           # POST /api/v1/predict
│  │  ├─ predict_sequence.py  # POST /api/v1/predict-sequence
│  │  ├─ process_frame.py     # POST /api/v1/process-frame (Phase 7)
│  │  ├─ model_status.py      # GET /api/v1/model-status
│  │  └─ tts.py               # POST /api/v1/text-to-speech
│  ├─ services/
│  │  ├─ model_loader.py      # Keras LSTM loader + warm-up, else rule engine
│  │  ├─ prediction_pipeline.py# Phase 8: threshold, unknown, smoothing, buffering
│  │  ├─ prediction_service.py# facade: single-frame + sequence orchestration
│  │  ├─ sequence_buffer.py   # FrameBuffer + SequenceBuffer (windows)
│  │  ├─ camera_manager.py    # OpenCV webcam ⇄ mock camera (same interface)
│  │  └─ tts_service.py       # tone WAV (offline) ⇄ gTTS MP3
│  └─ utils/
│     ├─ envelope.py          # ApiError + {success, error} builders
│     ├─ landmarks.py         # 21-point geometry: classify() + generate_hand()
│     └─ vocabulary.py        # A–Z + dynamic word classes (data-driven)
├─ models/                  # LSTM weights + <model>_labels.json sidecar
├─ scripts/
│  ├─ smoke_test.py            # 24-check in-process endpoint suite
│  └─ train_toy_model.py       # trains the toy LSTM used by the suite
├─ requirements.txt
└─ .env.example
```

**Why FastAPI**: the architecture contract (Phase 1) splits the backend
into gateway + AI service. FastAPI is the natural Python home for
model serving — async by default, Pydantic validation for free, typed
OpenAPI docs at `/api/docs` that the gateway's developers can read
like a contract.

**Graceful degradation everywhere** (same philosophy as the gateway's
in-memory Mongo): no webcam → mock camera, no trained weights →
deterministic rule engine, no gTTS → offline tone synthesis. The
service is demo-able on any machine and upgrades to the real model by
dropping one file into `models/` — no code changes.

## Phase 8 — the TensorFlow inference pipeline

Everything flows through `services/prediction_pipeline.py`
(`InferencePipeline`); its eight components, in order of a request:

```
frames in (21×3 each)
   │
   ▼
FrameBuffer        ring of the last W frames (streaming side)
   ▼
SequenceBuffer     last W frames → (W, 63) window, edge-padded
   ▼
ModelManager       Keras LSTM (load-once) OR rule-engine vote
   ▼
softmax probs      per-class probabilities
   ▼
Prediction Smoothing  EMA (α) over probs — kills flicker (stream mode)
   ▼
Confidence Threshold  max prob < AI_CONFIDENCE_THRESHOLD ?
   ├─ yes → Unknown Gesture Detection → gesture UNKNOWN
   └─ no  → typed label: letter | word | unknown
```

| Component | File | Role |
|---|---|---|
| Model Loader | `services/model_loader.py` | `ModelManager` loads the Keras model once at startup; auto-detects frame vs sequence input; label sidecar (`<model>_labels.json`) |
| Model Warm-up | `model_loader.py` | one dummy inference at load; `warmupMs` reported in `/model-status` |
| Frame Buffer | `services/sequence_buffer.py` | `FrameBuffer` ring (maxlen ×2 window, min frames = W/2) |
| Sequence Buffer | `sequence_buffer.py` | `SequenceBuffer` window builder — 63 features/frame, nearest-frame padding |
| Prediction Pipeline | `services/prediction_pipeline.py` | orchestrates window → inference → decision (`predict_frames` batch, `stream` incremental) |
| Confidence Threshold | `prediction_pipeline.py` | `AI_CONFIDENCE_THRESHOLD` (default 0.55); reported in every decision |
| Unknown Gesture Detection | `prediction_pipeline.py` | below threshold → `UNKNOWN`; also honors the model's own UNKNOWN class |
| Prediction Smoothing | `prediction_pipeline.py` | EMA over class probabilities (`AI_SMOOTHING_ALPHA`), stream mode only |

**A–Z + dynamic words**: the class list is data-driven
(`models/vocabulary.json` letters + words, or a model-specific
`<model>_labels.json` sidecar). Every result is typed
`letter` | `word` | `unknown`, so the frontend renders a finger-spelled
letter differently from a whole-word gesture.

**Try it with real TensorFlow inference** (the toy LSTM ships in this
repo's training script, not as weights — train once, ~30 s CPU):

```bash
unset PYTHONPATH
.venv/Scripts/python scripts/train_toy_model.py   # trains + smoke-parity gates
npm test                                           # 24 checks, TF path included
```

Without weights the same suite passes (20 checks) on the rule engine —
the fallback is a first-class citizen, not a stub.