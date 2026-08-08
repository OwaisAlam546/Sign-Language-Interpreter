# SignSpeak AI — Complete CRUD API Reference (Phase 5)

> Every endpoint, request shape, error rule and design decision for the
> gateway REST API. Companion to `docs/DATABASE.md` (collections) and
> `docs/AUTH_FLOW.md` (sessions).

## 1. The envelope (every response)

```
200/201 → { success: true,  data, meta? }
  4xx/5xx → { success: false, error: { code, message, details? } }
```

- `meta` appears on every **list** endpoint: `{ page, limit, total, totalPages, hasNextPage }`
- 204 is never used — deletes return the deleted document + a message
- Joi validation failures → **422** with `details[]` per bad field

## 2. The list contract (pagination · search · filtering · sorting)

Every list endpoint runs the same engine (`src/utils/listQuery.js`) and
accepts the same query params — **whitelisted per resource**:

| Param | Meaning | Guard |
|---|---|---|
| `page` | 1-based page | clamped ≥ 1 |
| `limit` | rows per page | clamped 1…50 |
| `search` | case-insensitive text match | only over declared `searchFields`; regex-escaped |
| `<filter>` | exact equality (e.g. `type=word`, `engine=lstm`, `category=ui`) | only declared `filterFields` |
| `sort` | named sort (e.g. `newest`, `oldest`, `confidence`, `latency`) | only declared `sortMap` |

`{userId}` is injected into the query **after** the whitelist — a client
can never read another user's rows, no matter what the query string says.

## 3. Full endpoint map

### Auth (`/auth`) — Phase 3
`POST register` · `GET verify-email?token=` · `POST resend-verification` ·
`POST login` · `POST refresh` (cookie) · `POST logout` (cookie) ·
`POST forgot-password` · `POST reset-password` — see `docs/AUTH_FLOW.md`.

### Profile (`/users`, auth required)

| Method | Path | Purpose | Errors |
|---|---|---|---|
| GET | `/users/me` | my profile | 401 |
| PATCH | `/users/me` | update name / avatar | 401, 422 |
| DELETE | `/users/me` | **self-delete account** — purge cascade (sessions, history, feedback, notifications, settings) | 401 |
| PATCH | `/users/change-password` | change password (revokes all other sessions) | 401, 422, 401 WRONG_PASSWORD |

### Translation History (`/translations`, auth required)

| Method | Path | Purpose |
|---|---|---|
| POST | `/translations` | save a completed translation (fields: type, text, gesture, confidence, fps, latencyMs, engine, status, inputMode, errorMessage, audioUrl) |
| GET | `/translations` | my history — `?search=&type=&engine=&status=&sort=&page=&limit=` |
| GET | `/translations/stats` | dashboard aggregates (total, byType, avgConfidence, last7days) |
| GET | `/translations/:id` | read one record |
| PATCH | `/translations/:id` | edit **whitelist** (text, gesture, confidence, engine, status, inputMode — never `type`/`userId`) |
| DELETE | `/translations/:id` | delete one record |
| DELETE | `/translations` | clear all of my history (`{ deletedCount }`) |

Design: `type` is immutable (it defines the record's identity); `userId`
is always part of the query so foreign ids surface as 404, never as data.

### Feedback (`/feedback`, auth required)

| Method | Path | Purpose |
|---|---|---|
| POST | `/feedback` | submit rating 1–5 + message + optional category/translationId — **auto-creates a notification** |
| GET | `/feedback` | my submissions — `?category=&page=&limit=` |
| GET | `/feedback/:id` | read one of mine |
| PATCH | `/feedback/:id` | edit mine — **409 FEEDBACK_RESOLVED** once an admin resolves it |
| DELETE | `/feedback/:id` | delete mine (the ack notification stays — permanent record) |

### Notifications (`/notifications`, auth required)

| Method | Path | Purpose |
|---|---|---|
| GET | `/notifications` | my inbox — `?read=unread\|read&page=&limit=` |
| GET | `/notifications/unread-count` | unread badge (indexed count) |
| GET | `/notifications/:id` | read one |
| PATCH | `/notifications/:id/read` | mark read (`readAt` set — idempotent) |
| PATCH | `/notifications/read-all` | mark every unread as read |
| DELETE | `/notifications/:id` | dismiss one |

### Settings

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/settings` | — | public system defaults |
| GET | `/settings/me` | ✔ | my preferences |
| PATCH | `/settings/me` | ✔ | upsert one preference (`{key, value}`) — idempotent |
| DELETE | `/settings/me/:key` | ✔ | drop one preference → default applies |

### Admin (`/admin`, auth + role=admin)

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/stats` | dashboard counts: users, translations, predictionLogs, feedback, pendingFeedback, unreadNotifications |
| GET | `/admin/users` | user directory — `?search=&role=&sort=&page=&limit=` |
| GET | `/admin/users/:id` | one user |
| PATCH | `/admin/users/:id/role` | promote/demote (never yourself → 400) |
| DELETE | `/admin/users/:id` | delete user + cascade (same purge as self-delete) |
| GET | `/admin/feedback` | moderation inbox — `?category=&rating=&resolved=&page=&limit=` |
| PATCH | `/admin/feedback/:id/resolve` | resolve/reopen (`{resolved: bool}`) — freezes user edits |
| DELETE | `/admin/feedback/:id` | moderator delete (any submission) |
| GET | `/admin/prediction-logs` | pipeline analytics — `?engine=&inputMode=&sort=&page=&limit=` |
| GET | `/admin/prediction-logs/:id` | one raw log |
| POST | `/admin/prediction-logs` | AI service write-path (fields: engine, confidence, latencyMs, inputFrames, inputMode, fallbackUsed, gesture, userId, translationId) |
| DELETE | `/admin/prediction-logs/:id` | manual cleanup (TTL auto-purges at 6 months) |
| GET | `/admin/settings` | all system settings |
| PATCH | `/admin/settings` | upsert a system key (`{key, value, description}`) |
| DELETE | `/admin/settings/:key` | remove a system key → app default applies |

**Deliberately absent:** `PATCH /admin/prediction-logs/:id` and
`PATCH /admin/settings/:key`-style updates beyond upsert. Prediction logs
are **immutable telemetry** (append-only, TTL-retired); settings use
upsert semantics which already *are* the update.

## 4. Error handling rules (the interview sheet)

| Rule | Mechanism |
|---|---|
| Malformed ObjectId | `utils/objectId.js` → **400 INVALID_ID** (never a Mongo cast error) |
| Missing/foreign resource | owner-scoped `findOne` → **404** — foreign ids are indistinguishable from missing ids (no existence leak) |
| Business conflicts | explicit statuses: **409** (duplicate email, resolved feedback), **403** (role), **401** (credentials/tokens) |
| Invalid body | Joi at the route → **422** with per-field `details` |
| Unknown routes | 404 `NOT_FOUND` envelope (last middleware) |
| Unexpected errors | central `errorHandler` → 500 `INTERNAL_ERROR` + server-side log — never a stack leak |

## 5. Cross-collection flows to quote

1. **Feedback → Notification** — POST /feedback writes `feedback` AND
   creates the ack notification in one service call. Deleting the
   feedback never deletes the notification: it is the user's permanent
   receipt.
2. **Account deletion** — `DELETE /users/me` and
   `DELETE /admin/users/:id` share `purge.service.purgeUserData()`: one
   util, two callers, zero chance of an orphan. PredictionLogs are
   deliberately excluded (pipeline telemetry, TTL-purged).
3. **History lifecycle** — POST → immutable audit trail → PATCH only the
   whitelist → DELETE one / clear all. The stats aggregate re-reads the
   same collection, so the dashboard can never disagree with history.
4. **Settings two-scope trick** — one collection, `userId: null` = system,
   `userId` = personal; one `{userId, key}` unique index keeps both
   clash-free; `removeKey(null, key)` deletes a system key with the same
   code as a user key.

## 6. AI proxy (`/ai`) — Phase 9

The gateway is the ONLY thing the frontend talks to; these routes proxy
FastAPI (`:8000`) verbatim. The AI envelope — `{success, data}` or
`{success, error:{code, message}}` — passes through untouched, so the
frontend has one contract to learn.

| Method | Path | What happens |
|---|---|---|
| GET | `/ai/health` | deep probe — `{ai:'up', …}` only when the AI really answers |
| GET | `/ai/model-status` | loaded engine, warmupMs, labels, input mode |
| POST | `/ai/predict` | one hand (`{hand: landmarks21}`) → letter |
| POST | `/ai/predict-sequence` | `{frames: [hands…]}` → letter/word with window semantics |
| POST | `/ai/process-frame` | full MediaPipe pipeline payload passthrough |
| POST | `/ai/tts` | text → audio envelope, **streamed** (never buffered in gateway memory) |

Failure mapping (see `src/services/ai.client.js`):
- AI unreachable → **503 `AI_SERVICE_UNAVAILABLE`** — honest, no fabricated data
- AI silent past `AI_TIMEOUT_MS` → **504 `AI_GATEWAY_TIMEOUT`**
- AI envelope error → its own status+code (e.g. 422 `VALIDATION_ERROR`) passthrough
- Transient (network / 5xx) → **2 retries with 25/50 ms backoff**

## 7. Translation history — Phase 10 additions

The history feature from Phase 4/5 gains two stored fields and two new
endpoints:

| Field | Meaning |
|---|---|
| `prediction` | raw AI label from the model (e.g. `hello`) **before** presentation — searchable via `?search=` |
| `userSpeech` | what the user actually said (audio input mode), pairs with the gesture → full speech↔sign record — searchable |

| Method | Path | What happens |
|---|---|---|
| GET | `/translations/export` | own history as **CSV** (UTF-8 BOM, RFC-4180 quoted cells) — `?format=json` for JSON |
| GET | `/admin/analytics` | platform dashboard: counts, activity (today/7d/30d), quality (avg/max confidence, avg latency), content mix (byType/byEngine/failed/top 10 gestures), engagement (active users, rows with user speech) |

Both exports are owner-scoped — the CSV/JSON file can never leak another
user's rows. `/admin/analytics` requires the admin role (403 for users).

## 8. Analytics dashboard — Phase 11 (chart-ready)

One call returns every series the dashboard plots — zero-filled (gaps are
`0`, labels are present oldest→newest) so charts need no client padding:

| Method | Path | Scope |
|---|---|---|
| GET | `/analytics/dashboard` | the signed-in user's own view |
| GET | `/admin/analytics/dashboard` | platform-wide view (admin role) |

Sections of `data.dashboard`:

| Section | Contents |
|---|---|
| `predictionCount` | `total` / `today` / `last7Days` / `last30Days` |
| `accuracy` | `avgConfidence` + `highConfidenceRate` (share ≥ 0.8) |
| `latency` | `avgMs` / `medianMs` / `p95Ms` (30-day window) |
| `fps` | `avg` / `median` (30-day window) |
| `mostUsedGestures` | top 10 named gestures `[{gesture, count}]` |
| `dailyUsage` / `weeklyUsage` / `monthlyUsage` | 30 days / 8 ISO weeks / 12 months of `[{label, count}]` |
| `userStatistics` | user: `totalTranslations` / `activeDays` / `avgPerActiveDay` / `streak` · admin: `totalUsers` / `activeUsers30d` / `newUsers30d` / `topUsers` |
| `modelStatistics` | per engine: `count` / `avgConfidence` / `avgLatencyMs` / `successRate` |

The admin and user endpoints share one service — only the `$match` filter
differs (platform vs. `userId`), so the two dashboards can never disagree.

---
*Phase 5 complete — next: FastAPI AI service, Jest test layer, WebSocket realtime, deployment.*