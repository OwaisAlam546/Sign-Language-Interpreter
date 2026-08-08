# SignSpeak AI — FastAPI inference microservice (Phase 6)

> `backend/ai-service` — the AI half of the two-service backend
> (gateway = Express :5000, this = FastAPI :8000). See
> `backend/docs/ARCHITECTURE.md` for the big picture.

## Why a separate Python service?

TensorFlow / OpenCV / MediaPipe are Python-native, models are heavy and
slow to load, and the gateway must never do linear algebra per request.
A dedicated process loads the model **once** and reuses it.

## Run

```bash
cd backend/ai-service
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Health gate first: `curl http://localhost:8000/health` → `{"success":true,...}`.

## Endpoints (all under `/api/v1` except health)

| Method | Route | Body | Returns |
|---|---|---|---|
| GET | `/health` | — | liveness, engine, uptime |
| GET | `/api/v1/model-status` | — | engine, loaded, fallback, modelPath |
| POST | `/api/v1/predict` | `{landmarks: [[x,y,z]×21], sampleId?}` or `{capture: true}` | gesture, confidence, latencyMs |
| POST | `/api/v1/predict-sequence` | `{frames: [[21×3], …≥2], strategy?: majority\|average}` | smoothed gesture + perFrame votes |
| POST | `/api/v1/text-to-speech` | `{text, lang?}` | base64 WAV/MP3 blob |

## Design notes

- **Graceful degradation everywhere** — no model file → rule engine;
  no OpenCV → simulated camera; no gTTS → deterministic tone WAV. The
  demo always runs; every optional extra upgrades a single capability.
- **Load once** — model, camera and TTS are singletons built in the
  FastAPI lifespan, not per request.
- **Response envelope** — identical `{success, data}` /
  `{success, error: {code, message}}` contract as the gateway.
- **Camera** — primary capture is client-side browser MediaPipe (WebSocket
  phase); `CameraManager` is the optional server-side fallback.

## Verified with

```bash
python scripts/smoke_test.py   # boots the app in-process, 100% stdlib
```