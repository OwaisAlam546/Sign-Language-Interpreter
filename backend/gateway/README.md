# SignSpeak AI — API Gateway (Express)

The orchestration layer of SignSpeak AI: authentication, REST API, and the
future real-time bridge to the FastAPI AI service. It never runs the ML model —
that lives in `../ai-service`.

## Quickstart (zero setup)

```bash
npm install      # install dependencies
npm run seed     # load the A–Z + words gesture dictionary into MongoDB
npm run dev      # start the server on http://localhost:5000
```

No MongoDB installation needed: when `MONGO_URI` is empty (see `.env`), the
server boots an in-memory MongoDB automatically — perfect for demos and
interviews. Point `MONGO_URI` at MongoDB Atlas for persistent data.

## Verify every endpoint works

```bash
npm run verify   # boots the app + in-memory DB and exercises all 100 checks
```

## Folder map

```
src/
├── server.js          # entry point: DB → app → listen → graceful shutdown
├── app.js             # express factory (middleware + routes), testable without a port
├── config/            # env validation (fail fast) + mongoose connection
├── middleware/        # auth (identity), authorize (RBAC), validation, rate limiting, CORS, error handler, 404
├── routes/            # feature routers (auth, user, admin, gesture, translation, feedback, notification, setting, health)
├── controllers/       # thin: call service → shape response
├── services/          # auth, token, password, email, user, admin, gesture, translation, feedback, notification, setting + AI client
├── models/            # Mongoose schemas (User, RefreshToken, Gesture, TranslationHistory, Feedback, PredictionLog, Notification, Setting)
├── seed/              # gesture dictionary + default admin account seeds
├── constants/         # shared enums + limits
└── utils/             # ApiError, ApiResponse, asyncHandler, logger
```

## REST API (all under `/api/v1`)

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | — | create account (auto-sends verification email) |
| GET | `/auth/verify-email?token=` | — | click the link from the email → verifies account |
| POST | `/auth/resend-verification` | — | resend the verification link |
| POST | `/auth/login` | — | login → access token + refresh cookie |
| POST | `/auth/refresh` | cookie | rotate refresh token |
| POST | `/auth/logout` | cookie | revoke refresh token |
| POST | `/auth/forgot-password` | — | email a reset link (enumeration-safe) |
| POST | `/auth/reset-password` | — | set new password, revoke all sessions |
| GET / PATCH | `/users/me` | ✔ | profile read / update |
| DELETE | `/users/me` | ✔ | self-delete account + all data (cascade) |
| PATCH | `/users/change-password` | ✔ | change password (revokes other sessions) |
| GET / PATCH | `/admin/users` · `/:id` · `/:id/role` | ✔ admin | directory (`?search=` `?role=`), get, promote |
| DELETE | `/admin/users/:id` | ✔ admin | delete user + their data (cascade) |
| GET | `/admin/stats` | ✔ admin | dashboard counts (6 counters) |
| GET | `/admin/feedback` | ✔ admin | moderation inbox (`?category=` `?rating=` `?resolved=`) |
| PATCH | `/admin/feedback/:id/resolve` | ✔ admin | resolve / reopen (locks user edits) |
| DELETE | `/admin/feedback/:id` | ✔ admin | remove a submission |
| GET / POST | `/admin/prediction-logs` · `/:id` | ✔ admin | pipeline analytics (logs immutable; DELETE for cleanup) |
| GET / PATCH / DELETE | `/admin/settings` · `/:key` | ✔ admin | system settings (upsert / delete → default) |
| GET | `/gestures` | — | dictionary (A–Z + words), `?category=` `?q=` |
| GET | `/gestures/:label` | — | one gesture |
| POST / GET | `/translations` | ✔ | save / paginated history — `?search=` `?type=` `?status=` `?sort=` `?page=` `?limit=` |
| GET / PATCH / DELETE | `/translations/:id` | ✔ | read / edit / delete one record |
| DELETE | `/translations` | ✔ | clear all of my history |
| GET | `/translations/stats` | ✔ | dashboard aggregates |
| POST / GET | `/feedback` | ✔ | submit / my submissions — filter `?category=` |
| GET / PATCH / DELETE | `/feedback/:id` | ✔ | read / edit / delete mine (edit locked once admin resolves → 409) |
| GET | `/notifications` | ✔ | my inbox (`?read=unread` / `?read=read`) |
| GET | `/notifications/unread-count` | ✔ | unread badge number |
| GET / PATCH | `/notifications/:id` | ✔ | read one — `.../:id/read` marks read |
| PATCH | `/notifications/read-all` | ✔ | mark all unread as read |
| DELETE | `/notifications/:id` | ✔ | dismiss one |
| GET | `/settings` | — | public system defaults |
| GET / PATCH / DELETE | `/settings/me` · `/me/:key` | ✔ | my preferences (upsert; delete key → default) |
| GET | `/health` · `/health/ai` | — | liveness + AI-service dependency check |

Every response uses `{ success, data, meta? }` or `{ success, error }`.
Design docs: `docs/DATABASE.md` (collections · indexes · relationships) and `docs/API_REFERENCE.md` (full CRUD contract).
