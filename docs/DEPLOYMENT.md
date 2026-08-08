# SignSpeak AI — Production Deployment Guide

Everything needed to run the stack (React frontend · Express gateway ·
FastAPI inference) in production. One repo, two deployment paths —
**bare metal (PM2 + nginx)** and **Docker** — both behind nginx with
HTTPS, Atlas for data, GitHub Actions for CI/CD.

---

## 1. Architecture at a glance

```
                        ┌──────────────────────────────┐
   Browser ──HTTPS──▶  │  nginx  (VPS)                 │
                        │  · serves ./frontend/dist    │
                        │  · /api/*   → gateway :5000  │
                        │  · /realtime→ gateway :5000  │
                        └──────────┬───────────────────┘
                                   │
                          ┌────────▼─────────┐     ┌──────────────────┐
                          │  Express gateway │────▶│ MongoDB Atlas    │
                          │  (PM2 cluster)   │     │ (auth, history,  │
                          └────────┬─────────┘     │  analytics)      │
                                   │ HTTP :8000    └──────────────────┘
                          ┌────────▼─────────┐
                          │  FastAPI ai     │  TensorFlow LSTM
                          │  (1 process)     │  mediapipe + TTS
                          └──────────────────┘
```

- **nginx** is the only thing exposed to the internet. The gateway and
  the AI service listen on localhost/private network only.
- The **frontend is a static build** (Vite) — the API is same-origin
  through nginx (`/api`), so there is no CORS in production.

## 2. Production folder structure

```
signspeak/                      # /opt/signspeak on the server
├── .env                        # production secrets — NEVER committed
├── deploy/
│   ├── compose.yaml            # Docker path (3 services)
│   ├── ecosystem.config.js     # PM2 process file (bare-metal path)
│   ├── deploy.sh               # server bootstrap (idempotent)
│   ├── .env.production         # safe env template → copy to .env
│   └── nginx/
│       ├── nginx.conf          # container nginx config
│       ├── nginx.baremetal.conf# VPS site config
│       └── Dockerfile.web      # multi-stage frontend → nginx image
├── .github/workflows/ci.yml    # 3 test jobs + deploy job
├── backend/
│   ├── gateway/                # Express — src/server.js starts it
│   │   └── Dockerfile
│   └── ai-service/             # FastAPI — uvicorn app.main:app
│       ├── Dockerfile
│       ├── app/  models/  scripts/
│       └── .venv/              # bare-metal virtualenv
└── frontend/
    └── dist/                   # `npm run build` output (nginx root)
```

## 3. Step-by-step deployment (bare metal — the default path)

### Step 1 — Buy a VPS and lock it down
1. Provision an Ubuntu 22.04/24.04 VPS (2 vCPU, 4 GB RAM — TensorFlow
   needs ~2 GB).
2. `ssh root@<vps-ip>`
3. Update everything: `apt update && apt upgrade -y`
4. `ufw allow OpenSSH && ufw enable` — nothing else open yet.

### Step 2 — Generate secrets (on your laptop)
```bash
openssl rand -hex 32   # run twice → JWT_ACCESS_SECRET + JWT_REFRESH_SECRET
openssl rand -hex 32   # optional: MONGO password
```
Never reuse dev secrets. If a secret ever leaks — rotate it and redeploy.

### Step 3 — MongoDB Atlas
1. Sign up at [mongodb.com](https://mongodb.com) → **Create Cluster**
   (M0 free tier is fine to start).
2. **Database Access** → Add new DB user (read/write on the database,
   not a strong admin password).
3. **Network Access** → allow `0.0.0.0/0` (public) *or* the VPS public
   IP for a tighter scope. Start with the VPS IP; the app's own auth
   (JWT + email verification) is the real gate.
4. **Connect → Drivers** → copy the `mongodb+srv://…` URI into
   `MONGO_URI` in the server's `.env`.

### Step 4 — Cloudinary (optional)
The gateway has **no upload endpoint yet** (frontend is fully
client-side MediaPipe). Cloudinary is where avatar / gesture-video
uploads will live when that feature ships. Until then, leave the three
`CLOUDINARY_*` variables empty — nothing reads them. When you add
uploads, install `cloudinary` + `multer-storage-cloudinary` in the
gateway and mount a middleware on the upload route; the env contract is
already wired in the compose + template files.

```js
// future src/services/upload.service.js — the seam is ready
const { v2: cloudinary } = require('cloudinary');
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
```

### Step 5 — Environment variables
Copy `deploy/.env.production` to `/opt/signspeak/.env` and fill it.
Three services, three env surfaces:

| Service | File | Important variables |
|---|---|---|
| Gateway | `.env` (server) | `MONGO_URI`, `JWT_*`, `CLIENT_URL`, `SMTP_*`, `AI_SERVICE_URL` |
| AI | `backend/ai-service/.env` | `AI_MODEL_WINDOW`, `AI_CONFIDENCE_THRESHOLD`, `AI_SMOOTHING_ALPHA`, `TTS_ENGINE` |
| Frontend | built once, Vite inlines | `VITE_API_BASE_URL` (build arg, see Dockerfile.web) |

Vite **inlines** env at build time — that is why api base URL is a
build arg, not a server env.

### Step 6 — Deploy the code
```bash
cd /opt/signspeak && git clone <repo-url> .
bash deploy/deploy.sh
```
`deploy.sh` is idempotent: system deps → Node 20 → clone → `.env`
check → gateway `npm ci --omit=dev` + `npm run seed` → AI venv +
requirements → frontend build → PM2 start/save/startup → nginx site
→ ufw → certbot HTTPS. Script exits cleanly at the `.env` step on
first run so you can fill secrets, then re-run.

### Step 7 — Verify the services
```bash
pm2 status                    # both processes online
curl -s http://localhost:8000/health                      # AI
curl -s http://localhost:5000/health                      # gateway
curl -s http://localhost:5000/health/ai                   # deep probe
curl -s https://youdomain.com/api/v1/translations?page=1  # via nginx
```
Smoke test the real flows: register → verify email → login → create
translation → `GET /api/v1/analytics/dashboard` → admin login.

---

## 4. Docker path (optional)

```bash
cd deploy
cp .env.production .env          # paste real values
docker compose up -d --build     # gateway + ai + web(nginx)
docker compose ps                # all healthy
```
- `ai` has a `HEALTHCHECK`; `gateway` waits for it via
  `depends_on: condition: service_healthy` — no race on first boot.
- Model updates without rebuild: the `ai_models` volume is mounted at
  `/app/models`; drop a new `signspeak_toy.keras` and restart `ai`.
- The TF image is ~2 GB — build once, push to a registry, pull on
  the server.

## 5. PM2 (bare metal only)

| Command | Purpose |
|---|---|
| `pm2 start deploy/ecosystem.config.js --update-env` | start both apps |
| `pm2 save && pm2 startup` | survive server reboot |
| `pm2 logs signspeak-gateway --lines 100` | tail logs |
| `pm2 reload signspeak-gateway` | zero-downtime restart (cluster) |

Design notes baked into the file: gateway runs **cluster mode**
(`instances: max`) because auth is stateless JWT — every CPU handles
requests. The AI service runs **exactly one process** — TensorFlow
holds the streaming FrameBuffer state; scaling it needs sticky
sessions, which is future work.

## 6. Nginx — what it does

```bash
nginx -t && systemctl reload nginx   # after any edit
```
- Serves `frontend/dist` (hashed `assets/` cached `immutable` 1y, html
  `no-cache`).
- Proxies `/api` → gateway, `/realtime` → gateway (WebSocket upgrade
  headers already in place for the realtime phase).
- Adds security headers; gzip on text/json; `try_files` SPA fallback.

## 7. GitHub Actions — the pipeline

Workflow `.github/workflows/ci.yml`:
```
gateway test → ai-service test → frontend build   (on every push/PR)
        └─────────── deploy (main only, needs ↑) ─────────── SSH → deploy.sh
```
Repo secrets to set (Settings → Secrets → Actions):
`DEPLOY_HOST` · `DEPLOY_USER` · `DEPLOY_SSH_KEY` · `APP_DIR` and the
`production` **environment** for the deploy job (with a manual approve
gate if you want one).

## 8. Security checklist

- [ ] `NODE_ENV=production` — never test mode in prod
- [ ] `REQUIRE_EMAIL_VERIFICATION=true` (auto-true in prod)
- [ ] REAL JWT secrets (`openssl rand -hex 32`), rotated on leak
- [ ] Atlas: least-privilege DB user, network allowed = VPS IP only
- [ ] Atlas **backups**: M0 free tier lacks PITR — schedule `mongodump`
      cron, verify restore once
- [ ] `.env` gitignored; `.env.production` is a placeholder only
- [ ] helmet + express-rate-limit already on the gateway — confirm
      rate limits are tuned after launch traffic
- [ ] SMTP App Passwords, MFA on the email account
- [ ] ufw: only 22 + 80/443; Fail2ban on 22 if you keep password SSH
- [ ] certbot auto-renew cron (`systemctl list-timers certbot`)
- [ ] PM2 `max_memory_restart` caps runaway processes
- [ ] No secrets in GitHub Actions logs (review output after first run)

## 9. Performance checklist

- [ ] nginx gzip on; `assets/` cache immutable 1y
- [ ] `instances: max` gateway cluster — scale by CPU
- [ ] AI single instance — one TF model resident in RAM
- [ ] Atlas indexes from Phase 1–11 are live: `(userId, createdAt)`,
      `(userId, engine, createdAt)`, `$text` index on
      text/gesture/prediction/userSpeech
- [ ] `allowDiskUse` not needed — every dashboard aggregate is index
      backed and window-bounded
- [ ] Ground truth: `curl -w "%{time_total}"` on `/api/v1/health`, the
      gateway roundtrip should be < 20 ms; AI predict < 150 ms p95
- [ ] Monitor: `pm2 monit`, `df -h`, `free -h`; add uptime watch v0

## 10. Testing checklist — run AFTER deployment, before opening to users

- [ ] Gateway suite: `cd backend/gateway && npm test` → **140/140**
- [ ] AI suite: `cd backend/ai-service && .venv/bin/python
      scripts/smoke_test.py` → 24/24 TF
- [ ] Frontend build: `npm run build` exit 0
- [ ] Live e2e on the VPS: register → verify → login → translate →
      history → dashboard → admin analytics
- [ ] Deep probe: `GET /health/ai` returns `ai: up` (real TF boot)
- [ ] Email: real SMTP send (dev preview prints to console — prod must
      send via SMTP)
- [ ] HTTPS: certbot redirect 80→443, no mixed content
- [ ] SPA refresh on a deep route returns the app (try_files), not 404
- [ ] Rate limit: repeated bad logins → 429
- [ ] Rollback drill: `git checkout <old-tag>` + `pm2 reload` + nginx
      cache invalidate

## 11. Notes & honest limits

- TF image ~2 GB; first compose build is slow — cache layers.
- Cloudinary is a documented seam, not a feature yet (no uploads in
  the codebase).
- WebSocket realtime (Phase 9's `ai.client` stream seam) is proxied
  ready in nginx but has no endpoint yet.
- The frontend currently calls no API (MediaPipe client-side); the
  moment the dashboard lands, set `VITE_API_BASE_URL` at build.