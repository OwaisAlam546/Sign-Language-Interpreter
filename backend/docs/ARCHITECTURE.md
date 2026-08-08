# SignSpeak AI — Backend Architecture (Phase 1)

> Real-Time Sign Language Translator · BCA VI · Ramaiah College
> Authors: Owais Alam (U18MB24S0105) · Niranjan M (U18MB24S0106) · Raman Bharadwaj (U18MB24S0107)

---

## 1. Executive Summary

The backend is a **two-service architecture** (API Gateway + AI Inference Service),
not a single monolith:

```
┌──────────────┐   HTTPS / WSS    ┌──────────────────┐   HTTP / JSON    ┌─────────────────────┐
│  React SPA   │ ───────────────► │   API Gateway    │ ───────────────► │    AI Service       │
│  (frontend)  │ ◄─────────────── │  Express · Node  │ ◄─────────────── │  FastAPI · Python   │
└──────────────┘    JSON + events └──────────────────┘     JSON         └─────────────────────┘
                                        │  ▲                                   │
                                        ▼  │                                   ▼
                                  ┌────────────┐                     ┌──────────────────┐
                                  │  MongoDB   │                     │  LSTM Model (h5) │
                                  └────────────┘                     └──────────────────┘
```

**Why two services instead of one?**

| Concern | Answer |
|---|---|
| TensorFlow/Keras, OpenCV, MediaPipe are Python-native | They physically cannot run inside a Node process |
| API servers handle I/O-heavy concurrent requests | Node's event loop is ideal for REST/WebSocket/DB work |
| ML models are memory/CPU heavy and load slowly | A separate process loads the model **once** and reuses it — no per-request model load |
| Independent scaling | The gateway scales on CPU instances; the AI service can sit on a GPU box |
| Team parallelization | Owais owns `ai-service` + `models`, Niranjan owns `gateway` API, Raman owns CV tests — no merge conflicts |

This is the industry-standard pattern: **"API Gateway + ML Inference Microservice"**
(the same shape Google, Uber, and every AI SaaS uses).

---

## 2. Top-Level Repository Structure

```
Sign-Project/
├── frontend/                    # ✅ DONE — React + Vite (5173)
├── backend/
│   ├── gateway/                 # Express API Gateway — auth, REST, WebSocket, DB
│   └── ai-service/              # FastAPI — MediaPipe + LSTM inference + TTS
├── models/                      # Trained weights (.h5/.keras) + training notebooks
├── docs/                        # This document, API reference, deployment guide
└── package-lock.json            # ⚠️ STRAY FILE — delete (created by an accidental
                                 #    npm install at the root; not part of the project)
```

**Why `backend/` contains two apps:** each app has its own dependencies, its own
lifecycle, and its own Docker image. Mixing `express` and `tensorflow` in one
`package.json`/`requirements.txt` creates a 2 GB install for every developer and
couples completely different failure domains (web I/O vs. GPU compute).

---

## 3. Clean Architecture (Layers)

Both services follow the same 4-layer rule: **routes never touch models,
models never touch routes, everything talks through services.**

```
┌─────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER  (routes / schemas)                 │
│  • parse the request  • validate input  • call service  │
│  • format the response                                   │
├─────────────────────────────────────────────────────────┤
│  APPLICATION LAYER  (controllers / services)            │
│  • business logic  • orchestration  • transactions      │
├─────────────────────────────────────────────────────────┤
│  DOMAIN LAYER  (models / core logic)                    │
│  • data shapes  • invariants  • ML pipeline steps       │
├─────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE LAYER  (db.js, ai.client, config)       │
│  • MongoDB connection  • HTTP client to AI  • env       │
└─────────────────────────────────────────────────────────┘
```

**Why:** each layer can be tested and replaced independently. You can swap
MongoDB for Postgres without touching a controller; you can swap the LSTM for
a transformer without touching a single Express file.

---

## 4. Feature-Based Architecture

Within the gateway, code is grouped by **feature** (auth, user, translation,
gesture, feedback), each feature owning its own route → controller → service → model:

```
Feature = { routes, controllers, services, models }  →  one vertical slice
```

**Why feature-based over layer-based:** when 3 students work in the same repo,
layer-based layout (`/controllers` with 15 files) causes merge conflicts daily.
Feature folders mean each member owns their slices end-to-end, and a feature can
be deleted/added as one unit. This is the modern standard (Vercel, Stripe,
Next.js all organise this way).

---

## 5. Express Gateway — Folder Structure (why every file exists)

```
backend/gateway/
├── src/
│   ├── server.js                  # ENTRY POINT — reads env, connects DB, starts
│   │                              #   HTTP + WebSocket on one port. Nothing else.
│   ├── app.js                     # EXPRESS FACTORY — builds the app, wires
│   │                              #   middleware + routers. Exported separately
│   │                              #   so supertest can test it without a port.
│   ├── config/
│   │   ├── env.js                 # Loads + VALIDATES env vars at boot (fail fast
│   │   │                          #   if PORT/JWT_SECRET/MONGO_URI missing).
│   │   └── db.js                  # Mongoose connection with retry + logging.
│   ├── middleware/
│   │   ├── errorHandler.js        # THE one place every error becomes JSON.
│   │   ├── notFound.js            # 404 JSON for unknown routes.
│   │   ├── auth.js                # JWT verify → attaches req.user (protect).
│   │   ├── validate.js            # Schema validation for req.body/params/query.
│   │   ├── rateLimiter.js         # Per-IP + per-user limits (login: 5/min).
│   │   └── cors.js                # Restricts origins to the frontend.
│   ├── routes/
│   │   ├── index.js               # Mounts every feature router under /api/v1.
│   │   ├── auth.routes.js         # register / login / refresh / logout.
│   │   ├── user.routes.js         # me / update-me.
│   │   ├── gesture.routes.js      # GET dictionary (public: A–Z + words).
│   │   ├── translation.routes.js  # POST save · GET history · GET stats.
│   │   ├── feedback.routes.js     # POST feedback.
│   │   └── health.routes.js       # GET /health (used by load balancers).
│   ├── controllers/               # Thin: validate → call service → respond.
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── gesture.controller.js
│   │   ├── translation.controller.js
│   │   └── feedback.controller.js
│   ├── services/                  # THE business logic lives here.
│   │   ├── auth.service.js        # register/login logic, password hashing rules.
│   │   ├── token.service.js       # access + refresh token issue/verify/rotate.
│   │   ├── user.service.js
│   │   ├── gesture.service.js
│   │   ├── translation.service.js # Orchestrates: save history + call AI client.
│   │   └── ai.client.js           # THE ONLY file that talks to FastAPI.
│   ├── models/                    # Mongoose schemas = domain layer.
│   │   ├── user.model.js
│   │   ├── translation.model.js
│   │   ├── gesture.model.js
│   │   └── refreshToken.model.js
│   ├── sockets/
│   │   ├── index.js               # Socket.IO bootstrap + auth handshake.
│   │   └── translate.handler.js   # Real-time frame stream → AI → predictions.
│   ├── utils/
│   │   ├── ApiError.js            # Error class: {status, code, message, details}.
│   │   ├── ApiResponse.js         # Standard success envelope.
│   │   ├── asyncHandler.js        # Wraps async controllers (one try/catch).
│   │   └── logger.js              # Structured logging (request id, timing).
│   └── constants/
│       └── index.js               # Roles, token TTLs, rate limits, messages.
├── .env.example                   # Documented env template (committed).
├── package.json
└── README.md
```

**Why every file exists (one-liner):** `server.js` boots, `app.js` is testable,
`config/` fails fast, `middleware/` is cross-cutting (auth/validation/errors),
feature folders hold one vertical slice each, `services/` keep controllers thin,
`models/` are the only DB touchpoints, `utils/ApiError` + `asyncHandler` give
**one** error-handling pattern the whole app shares.

---

## 6. FastAPI AI Service — Folder Structure

```
backend/ai-service/
├── app/
│   ├── main.py                   # FastAPI app: CORS, routers, lifespan hook that
│   │                             #   PRE-LOADS the LSTM model once at startup.
│   ├── config.py                 # pydantic-settings: MODEL_PATH, CONFIDENCE_THRESHOLD,
│   │                             #   MAX_SEQ_LEN, TTS_ENGINE — typed env config.
│   ├── api/
│   │   ├── routes/
│   │   │   ├── health.py         # GET /health — model loaded? uptime, version.
│   │   │   ├── predict.py        # POST /predict — the core inference endpoint.
│   │   │   └── model.py          # GET /model/info · POST /model/reload (admin).
│   │   └── deps.py               # Dependency injection: hands detector, predictor.
│   ├── core/
│   │   ├── errors.py             # Custom exceptions + FastAPI exception handlers.
│   │   └── logging.py            # JSON logs with request ids.
│   ├── services/
│   │   ├── hand_detector.py      # MediaPipe Hands wrapper: frame → 21 landmarks
│   │   │                         #   × 2 hands, with visibility filtering.
│   │   ├── landmark_encoder.py   # Normalise + encode landmarks → fixed-size
│   │   │                         #   feature vector (invariant to hand size/position).
│   │   ├── predictor.py          # LSTM wrapper: sliding window of 30 frames →
│   │   │                         #   class + confidence. Model loaded ONCE.
│   │   ├── word_builder.py       # Letter stream state machine: spelling, word
│   │   │                         #   matching, silence → word boundaries.
│   │   └── tts.py                # TTS: pyttsx3 (offline) with gTTS fallback →
│   │                             #   returns audio bytes + duration.
│   ├── schemas/                  # Pydantic models = the CONTRACT of the API.
│   │   ├── predict.py            # FrameIn / LandmarksIn / PredictionOut.
│   │   └── common.py             # Error, Health payloads.
│   └── models/                   # Runtime weights live here (gitignored).
│       └── lstm_asl.h5
├── scripts/
│   ├── prepare_dataset.py        # Kaggle ASL dataset → landmark sequences.
│   └── train_lstm.py             # Keras training + eval + export .h5.
├── tests/                        # pytest: detector, encoder, predictor, api.
├── requirements.txt
├── .env.example
└── Dockerfile                    # python:3.11-slim + opencv/mediapipe layers.
```

**Why:** `services/` isolates each ML stage (detect → encode → predict → build
words → speak) so Raman can unit-test any stage in isolation; `schemas/` are
the API contract; `scripts/` keeps training OUT of the serving app (a model
trainer is not a web server).

---

## 7. MongoDB Collections

| Collection | Key fields | Indexes | Purpose |
|---|---|---|---|
| `users` | name, email, passwordHash, role (`user`/`admin`), isEmailVerified, createdAt | `email` **unique** | Auth + profile |
| `refreshTokens` | userId, tokenHash, expiresAt, revokedAt, createdAt | `userId`, `expiresAt` | Refresh-token rotation (logout/revoke support) |
| `translations` | userId, type (`letter`/`word`/`phrase`), text, confidence, fps, latencyMs, audioUrl?, createdAt | `{userId:1, createdAt:-1}` | Translation history + dashboard stats |
| `gestures` | label (`A`…`Z`), category (`letter`/`word`), description, difficulty, exampleVideo?, createdAt | `label` **unique**, `category` | Seeded dictionary served to the frontend |
| `feedbacks` | userId, message, rating (1–5), createdAt | `userId` | User feedback for the report |

**Why these five and no more:** YAGNI. Sessions live in JWT (stateless), model
weights live on disk, translation history is the only real "big data" and it's
paginated. Adding collections later is cheap; every collection now needs a
schema + service + tests, so we start minimal.

---

## 8. REST API Structure (API Gateway · `/api/v1`)

| Method | Endpoint | Auth | Request body | Success response |
|---|---|---|---|---|
| POST | `/auth/register` | — | `{name, email, password}` | `201 {user}` |
| POST | `/auth/login` | — | `{email, password}` | `{accessToken, refreshToken, user}` |
| POST | `/auth/refresh` | refresh cookie | — | `{accessToken, refreshToken}` (rotation) |
| POST | `/auth/logout` | ✔ | — | `204` (revokes refresh token) |
| GET | `/users/me` | ✔ | — | `{user}` |
| PATCH | `/users/me` | ✔ | `{name?, avatarUrl?}` | `{user}` |
| GET | `/gestures` | — | `?category=&q=` | `{gestures[], meta}` (public) |
| GET | `/gestures/:label` | — | — | `{gesture}` (public) |
| POST | `/translations` | ✔ | `{type, text, confidence, fps, latencyMs}` | `201 {translation}` |
| GET | `/translations` | ✔ | `?page=&limit=` | `{translations[], meta}` |
| GET | `/translations/stats` | ✔ | — | `{total, byType, avgConfidence, last7days}` |
| POST | `/feedback` | ✔ | `{message, rating}` | `201 {feedback}` |
| GET | `/health` | — | — | `{status, uptime, version}` |

**Envelope (every response):**

```
success  → { "success": true,  "data": …, "meta": … }
failure  → { "success": false, "error": { "code": "VALIDATION_ERROR",
                                          "message": "…", "details": […] } }
```

**Auth model:** access token = short-lived JWT (15 min) sent via `Authorization:
Bearer` header; refresh token = long-lived (7 days) in an **httpOnly, SameSite
cookie**, stored hashed in MongoDB for revocation. This is the OWASP-recommended
pattern and the exact thing interviewers probe.

---

## 9. Data Flow Diagram (end-to-end)

```
 Browser                     Gateway (Express)              AI Service (FastAPI)        MongoDB
    │                               │                              │                      │
    │ 1. login (email+password)     │                              │                      │
    │──────────────────────────────►│ 2. verify bcrypt hash        │                      │
    │                               │─────────────────────────────►│                      │
    │ ◄─────────────────────────────│ 3. access+refresh tokens     │                      │
    │ 4. WS connect w/ JWT          │                              │                      │
    │══════════════════════════════►│ 5. verify JWT handshake      │                      │
    │ 6. frame (base64, ~15fps)     │ 7. POST /predict {landmarks} │                      │
    │──────────────────────────────►│─────────────────────────────►│ 8. LSTM predict      │
    │                               │                              │───► 9. letter+conf  │
    │ ◄─────────────────────────────│ 10. emit "prediction" event  │                      │
    │ ◄─────────────────────────────│ 11. emit "speech" event      │                      │
    │ 12. auto-save word (debounced)│                              │                      │
    │──────────────────────────────►│                              │────────────────────►│
    │                               │                              │ 13. insert translation│
```

---

## 10. Critical Flows

### 10.1 API Gateway Flow
Request → CORS → rate limiter → `notFound`/route match → `validate` (schema) →
`auth` (if protected) → controller → service → model/DB or `ai.client` →
`ApiResponse` → `errorHandler` on any throw. One path, every request.

### 10.2 Authentication Flow
Register: validate → hash password (bcrypt, cost 12) → create user → 201.
Login: find by email → compare hash → issue access + refresh → set cookie.
Refresh: verify refresh token (cookie) → check hash in DB, not revoked → rotate
(revoke old, issue new) → 200. Logout: revoke token → 204.

### 10.3 Camera Flow
`getUserMedia` → draw to canvas → `toDataURL('image/jpeg', 0.7)` → downsample to
~15 fps → send over WebSocket → gateway → AI. The client sends **compressed
frames**, never raw video (raw 1080p = ~12 MB/s; compressed 640×480 jpeg ≈
60 KB/s).

### 10.4 AI Prediction Flow
Frame → MediaPipe Hands → 21 × 3 landmarks per hand → visibility filter →
normalise (scale/translate to make it hand-size & position invariant) → append
to a **30-frame sliding window** (LSTM needs temporal context — a single frame
is meaningless) → LSTM forward pass → softmax vector → argmax class +
confidence → **threshold gate** (e.g. < 0.85 → "no prediction") → letter.

### 10.5 Translation Flow
Letter stream → `word_builder` state machine: accumulate letters, match against
the gesture vocabulary, silence/frame gap = word boundary → completed word →
phrase buffer → TTS engine (pyttsx3 offline) → audio bytes → browser also speaks
via Web Speech API for zero-latency feedback.

### 10.6 Database Flow
Service → Mongoose model → connection pool (default 10) → query → lean document
→ serialise (strip `passwordHash`) → JSON envelope. Every collection query is
index-backed; history queries are always paginated (`?page=&limit=`).

### 10.7 Error Handling Flow
Any `throw` → `asyncHandler` catches → next(error) → `errorHandler`:
`ApiError` → its status/code; Mongoose validation → 422; unknown → 500 + full
log (with request id) but generic client message. **No stack traces ever reach
the client.**

---

## 11. Deployment Architecture

```
DEV (now)                      PRODUCTION (target)
┌──────────────────────────┐   ┌─────────────────────────────────────────────┐
│ localhost:5173 frontend  │   │ Vercel/Render — React SPA                    │
│ localhost:5000 gateway   │   │        │                                     │
│ localhost:8000 ai-service│   │        ▼                                     │
│ localhost:27017 MongoDB  │   │ Render/Railway — Express gateway  (2 replicas│
│ (Docker Desktop optional)│   │        │            │                        │
└──────────────────────────┘   │        ▼            ▼                        │
                               │ Railway — FastAPI AI (GPU/CPU)   MongoDB Atlas│
                               └─────────────────────────────────────────────┘
```
- **Dev:** two terminals (`npm run dev` + `uvicorn app.main:app --reload`) +
  MongoDB (local or a free Atlas cluster — zero install).
- **Prod:** gateway behind a load balancer (stateless → scale horizontally),
  AI service on its own instance (model preloaded), MongoDB Atlas (managed,
  backups, indexes), env vars via the host's secret manager.
- **Why scalable:** the gateway holds no in-memory state (JWT stateless +
  DB-backed refresh tokens) so any number of replicas can serve any client;
  the AI service scales independently to GPU; a Redis pub/sub can later fan out
  WebSocket events across gateway replicas — designed for it, not needed yet.

---

## 12. Technology Choices — Why

| Choice | Why (interview-ready answer) |
|---|---|
| Node + Express (gateway) | MERN-native, event-loop I/O ideal for REST/WS/DB, huge ecosystem, your existing skills |
| FastAPI (AI service) | Async, auto OpenAPI docs, Pydantic validation, the Python ML ecosystem |
| MongoDB + Mongoose | Flexible schema (translations grow fields), fast reads, index-backed |
| JWT access + rotating refresh | Stateless scaling + revocable sessions (OWASP) |
| bcrypt (cost 12) | Industry-standard adaptive password hashing |
| MediaPipe Hands | 21 landmarks × 2 hands, ~30 fps on CPU, pre-trained, no GPU needed |
| Keras LSTM (30-frame windows) | Standard sequence model for gesture classification; trains on a laptop |
| WebSocket for frames, REST for CRUD | Real-time needs push; history/profile don't |
| pydantic schemas as API contract | Every endpoint's request/response is documented and validated by default |

---

## 13. Team Ownership Map

| Member | Owns |
|---|---|
| Owais Alam | `ai-service` (predictor, encoder, training scripts) + model weights |
| Niranjan M | `gateway` REST + WebSocket + auth (frontend already done) |
| Raman Bharadwaj | CV pipeline tests, dataset prep, integration tests, latency tuning |

---

*End of Phase 1. No implementation code was written. Awaiting confirmation
before Phase 2 (scaffolding the Express gateway).*
