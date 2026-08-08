# SignSpeak AI — Audit Report

**Date:** 2026-08-08 · **Result: PASS (production-ready with 7 fixes applied)**

> Method: three parallel read-only audits (gateway/auth/db/deployment · FastAPI/TensorFlow/
> MediaPipe · frontend/docs/repo hygiene), every high/critical cite then verified by hand
> against the real file before a **minimal-diff** fix was applied. No over-engineering;
> fixes preserve the beginner-readable style of the project.

## Verdict per area

| Area | Verdict | Evidence |
|---|---|---|
| Folder structure | ✅ Clean | 3 services, explicit `docs/`, no stray files after cleanup (`_*.json` capture junk removed) |
| Security | ✅ Strong | bcrypt-12 pre-save, `select:false`, hash stripped at `toJSON`; rotating refresh tokens (`jti`, SHA-256 at rest, TTL purge, revoke-all on password change); purpose-scoped email tokens; fail-fast `env.js` (no fallback secrets); helmet, `x-powered-by` off, 2 MB body cap, CORS allowlist, global + auth rate limits; error handler maps CastError→400 / dup-key→409 / JWT→401 / Mongoose→422 / else→500, **no stack traces to clients**; zero hardcoded secrets, zero `console.log` outside the logger |
| Database | ✅ | Correct compound indexes `(userId, createdAt)` / `(userId, engine, createdAt)`, `$text` index on history, 6-month TTL on prediction logs, explicit collection names |
| REST APIs | ✅ | Route surface == doc surface (`API_REFERENCE.md`); envelope `{success,data}` / `{success:false,error:{code,message}}` everywhere; Joi 422 / Pydantic 422 parity |
| FastAPI + TensorFlow | ✅ | 24/24 smoke (TF + rule), train≡test parity gate, load-once + warm-up, graceful rule fallback, honest engine reporting after fix |
| MediaPipe | ✅ (by design) | Client-side (`@mediapipe/tasks-vision`); server-side solutions removed in mediapipe 1.x → logged, image path returns honest 501, hands mode fully works |
| Deployment | ✅ | 12 artifacts syntax-validated; CI, PM2, nginx, compose, deploy.sh fixed to run on first real server (see findings 1–7) |
| Repo hygiene | ✅ | `git` initialized, 168→171 tracked files, 0 secrets staged, root + frontend `.gitignore`, `.gitattributes` `eol=lf` for shell/python/yaml/conf |

## Findings & disposition

| # | Sev | Area | Finding (file) | Disposition |
|---|---|---|---|---|
| 1 | **HIGH** | CI | Gateway CI job ran `npm ci --omit=dev`, but `verify.js` needs `mongodb-memory-server` (devDep) → first GitHub run would die importing it | Fixed — `npm ci` + comment why dev deps are intentional |
| 2 | **HIGH** | Deploy | PM2 ai app ran `uvicorn` with system `python3` — production VPS has no uvicorn outside the venv | Fixed: `deploy/ecosystem.config.js` → `./.venv/bin/uvicorn`, `interpreter: none` |
| 3 | **HIGH** | Deploy | Empty `MONGO_URI` in prod boots an in-memory store that can't exist (`--omit=dev` has no memory server) → confusing crash | Fixed: `src/config/db.js` fails fast in `NODE_ENV=production` with a clear message |
| 4 | **MED** | Deploy | Default admin (`admin@signspeak.ai`) auto-seeded on every prod boot | Fixed: `src/seed/admin.seed.js` gated behind `SEED_ADMIN=true` (prod); template documents it |
| 5 | **MED** | Deploy | Compose exposed 443 with nothing listening; `signalspeak` typo in env fallback | Fixed: `deploy/compose.yaml` → HTTP-only `80:80` (TLS via certbot on bare metal) + typo |
| 6 | **MED** | AI | `POST /predict {capture:true}` dead-on-arrival wherever cv2 is installed — `OpenCVCamera.read_frame()` is a documented stub, and the simulated camera (the graceful demo path) never engaged → guaranteed 503 on every modern box | Fixed: `camera_manager.py` — when OpenCV yields nothing, the manager hot-swaps to the simulated camera (real webcam path preserved for future server-side CV) |
| 7 | **MED** | AI | Sequence-request `engine`/`fallbackUsed` always reflected the loaded model, even when the rule engine actually produced the answer (misreporting in pipeline, frame-model windows crashed instead of degrading) | Fixed: engines now report what ACTUALLY classified (`result.get('engine', …)`); `predict_window()` on a frame-model mirrors `classify()` → rule vote; rule engine tags `engine:'rule'` |
| 8 | **LOW** | AI | `strategy: 'average'` was a no-op (echoed, never applied) | Fixed: real soft-vote — votes weighted by confidence; `majority` unchanged (suite-identical) |
| 9 | **LOW** | AI | `latencyMs` on sequence timed only the ML call, not the votes that followed (understated end-to-end cost the facade comment promised) | Fixed: timer wraps the whole facade path |
| 10 | **LOW** | AI | mediapipe 1.x removed `mp.solutions` → exception swallowed silently; `/health` later blamed "camera" | Fixed: logged at boot with the real reason |
| 11 | **LOW** | AI | `npm test` hardcoded `\.venv\Scripts\python.exe` — Windows-only | Fixed: `scripts/run_smoke.js` launcher (venv on Windows, `python3` on Linux/CI) |
| 12 | **LOW** | AI | Doc-read claim: Dockerfile "also mounted at runtime" (no volume in the image) | Fixed: comment now says baked + compose `ai_models` volume behavior |
| 13 | **LOW** | AI/Docs | engine/README hygiene: stale README claims, junk `_*.json` capture payloads committed in the baseline | Fixed/removed: README corrections, `git rm`, `_*.json` ignored |
| 14 | INFO | Repo | No git repository existed for the CI/deploy story | Already fixed pre-audit: `git init -b main`, commit `7002fb2`, secrets-scanned |
| 15 | INFO | AI | `TestClient` deprecation & private `FrameBuffer` access in the suite | Cosmetic only — left as-is |
| 16 | INFO | Deploy | Cloudinary env seam unwired (no upload endpoint yet) | Documented seam — intentionally dormant |
| 17 | INFO | Docs | Image mode 501 reports "mediapipe unavailable" though mediapipe is installed (its solutions API was removed in 1.x) | Honest 501 by design — hands mode + rule/TF carry the app |

## Verification after fixes (fresh runs, same box)

- Gateway: `npm test` → **140/140 checks, EXIT 0**
- AI-service: `npm test` → **24/24 (TF) + rule suite, EXIT 0**
- Frontend: `npm run build` → **green** (~8 s; the >500 kB MediaPipe chunk warning is the known, harmless one)
- `node --check` (ecosystem, run_smoke), `bash -n` (deploy.sh), YAML parse (compose, CI) — clean
- **Not locally verifiable:** `docker compose up --build`, `nginx -t`, real webcam capture (no Docker/nginx/webcam on this box) — these are the first-server gate, configs follow standard patterns

## Deferred by design (explicit user decisions, see §Known limitations in DEPLOYMENT.md)

Frontend marketing copy (Hero "LSTM v2 · Model Loaded" chip, homepage accuracy numbers) currently
describes the **server-side** LSTM while the static demo runs the browser rule engine — flagged to
the user; aligned only on request. No frontend test framework / lint runner; no Jest layer on the
gateway (the `scripts/verify.js` suite is the canonical gate); real webcam tests impossible in CI
safely — covered by browser-grade parity with the rule engine.

— SignSpeak AI · audit closure