# SignSpeak AI — MongoDB Database Design (Phase 4)

> Scope: `backend/gateway` — the six core collections, their schemas,
> indexes, relationships, validation rules, and the pagination / search /
> filtering contract every list endpoint follows.

---

## 1. Collections at a glance

| Collection | Model file | Purpose | Write pattern | Retention |
|---|---|---|---|---|
| `users` | `user.model.js` | Identities, credentials, roles | rare | forever |
| `translationhistory` | `translation.model.js` | Every translation a user did | append-only | forever |
| `predictionlogs` | `predictionLog.model.js` | Raw AI-pipeline output | append-only | **6-month TTL** |
| `feedback` | `feedback.model.js` | Ratings + comments | occasional | forever |
| `notifications` | `notification.model.js` | Per-user inbox | frequent | forever |
| `settings` | `setting.model.js` | System defaults + per-user prefs | rare | forever |

*(The `refreshToken` collection from Phase 3 also exists; it stores only
SHA-256 hashes and is intentionally not part of the app's data model here.)*

## 2. Why each collection exists

**`users`**
The only collection that writes/updates its own rules. It holds security
fields (`password` hidden behind `select: false`), the RBAC `role`, and the
`isEmailVerified` flag gatekeeping the registration funnel. Every other
collection references it by `userId`.

**`translationhistory`**
Each row is *one completed translation*: what the user signed, the engine
that recognized it, the confidence, the latency. Two properties make it the
heart of the system:
- **Append-only** — history must never be edited; the dashboard (
  history / accuracy / per-day charts) depends on that truth.
- **Provenance** — feedback and prediction logs link back to a row here,
  so "why did the app fail for this user" is answerable.

`gestures` (Phase 2) is separate from `translationhistory`: it is the
static dictionary (36 entries) that the translation text is validated
against — a lookup table, not an event log.

```js
const translationSchema = ... // full schema
```

*Indexes:*
- `{ userId: 1, createdAt: -1 }` — dashboard history "ws user, newest first"
- `{ userId: 1, engine: 1, createdAt: -1 }` — per-user engine breakdown
- `{ text: 'text', gesture: 'text' }` — text-search index backing `?search=`

**`predictionlogs`**
Raw output of the AI pipeline **before** it becomes user-facing history:
engine used, frames analysed, model score, latency, whether the
rule-based fallback kicked in.

Why a *separate* collection instead of one big `translationhistory`?
1. **Different lifecycle**: logs are debugging/analytics data; they are
   auto-purged after 6 months by a MongoDB TTL index (`expireAfterSeconds`
   runs every 60s server-side — no app code needed). User history must
   never be deleted by that purge.
2. **Different cardinality**: every video frame batch can produce a log;
   writing them into the history collection would bloat every dashboard
   query. Logs carry a `translationId` (nullable) so they can be joined
   when needed.

**`feedback`**
Ratings + comments for the project report. Three fields make it
triage-able: `category` (`accuracy | speed | language | ui | other`),
`translationId` (optional link to the exact translation being reviewed),
and `resolved` (admin flag). Indexes serve the moderator inbox and the
user profile list.

**`notifications`**
A per-user inbox, read-optimised. The deliberate design choice:
`readAt: null` means unread. That turns "unread badge" into an
**equality query on an index** (`countDocuments({ userId, readAt: null })`)
instead of a Boolean-scan. `readAt` doubles as the timestamp for
"read at".

**`settings`**
One collection, two scopes, enforced by a single unique index
`{ userId: 1, key: 1 }`:
- **system** (`userId = null`): app defaults and feature flags, exposed
  publicly via `GET /api/v1/settings`
- **user** (`userId = ObjectId`): per-user preferences (`theme`,
  `camera…`), private from `GET/PATCH /api/v1/settings/me`

The unique index means: system keys can never clash, a user can hold
each key exactly once, and upserts (idempotent) update in place instead of
duplicating.

## 3. Relationships (reference-only)

```
User 1 ──── N  TranslationHistory        (userId)
User 1 ──── N  PredictionLog             (userId)
User 1 ──── N  Feedback                  (userId)
User 1 ──── N  Notification              (userId)
Feedback N ─── 0..1 TranslationHistory   (translationId, optional)
PredictionLog N ─── 0..1 TranslationHistory (translationId, optional)
```

- **No embedded documents** — every relationship is a `ref` ObjectId.
  Embedding would duplicate data (two users would each hold the
  translation) and make aggregation/migration painful.
- **No cascade rules in Mongo** — deletions are handled explicitly in
  `admin.service.deleteUser()`: it cleans refresh tokens, translations,
  feedback, notifications and settings in parallel before removing the
  user, so the database stays orphan-free. (Documented trade-off: two
  extra deletes per user-block vs. the effort of something like a
  MongoDB Realm trigger.)
- **Nullable ObjectIds are a feature**: `predictionlogs.translationId`
  can be null when the model made a prediction that never became a
  translation (failed/vetoed) — exactly the analytics signal we want.

## 4. Validation

| Layer | What it guarantees | Where |
|---|---|---|
| **Schema** | required, enum, min/max, length, pattern | each model file |
| **Unique indexes** | duplicates become **E11000 → 409** | `email`, `{userId, key}` |
| **Enum strings** | `type`, `engine`, `status`, `category`, `scope` | schema |
| **Joi (route)** | request-shape validation → 422 details | `routes/*.routes.js` |
| **Sanitisation** | `.trim()`, `.lowercase()` on email | schema |
| **Secrets** | `select: false` on password; toJSON strips it | user model |

Example: `translationhistory.status ∈ { completed, failed }`, fails a
random string at the model layer; a `?status=zzz` query param fails at
the **query-whitelist** layer (never reaches Mongo).

## 5. Pagination · Search · Filtering (the contract)

Every list endpoint runs through the shared engine
`src/utils/listQuery.js` — two functions:

```js
buildListQuery(query, { searchFields, filterFields, sortMap })
paginate(model, conditions, { sort, page, limit, skip })
```

One engine, N endpoints. A service declares **whitelists**; the engine
never trusts raw query params:

| Concept | Example | Mechanism |
|---|---|---|
| Pagination | `?page=2&limit=10` | clamped (1 ≤ page; limit ≤ 50), `skip + limit` |
| Search | `?search=thank` | case-insensitive regex over **only** `searchFields`, regex-escaped |
| Filter | `?type=letter&engine=lstm` | exact equality, only keys in `filterFields` |
| Sort | `?sort=confidence` | only named keys in `sortMap` (defaults to newest) |
| Scope | — | `condition.userId = req.user.id` injected AFTER the whitelist — a user can never read another user's rows, no matter what the query string says |

Example translation request:

```
GET /api/v1/translations?page=1&limit=10&search=hello&type=word&sort=confidence
→ { success, data: { translations: [...] },
    meta: { page, limit, total, totalPages, hasNextPage } }
```

`meta` is identical everywhere, so the frontend can render one pagination
component. `search` + `filter` predicate as `$and`-ed conditions with the
`{userId}` — Mongo satisfies the equality  predicate via the compound
index and throws the tiny filtered set.

## 6. Data flow — a user signing a sign

```
Frontend (Vite)
   │  POST /api/v1/translations  (auth: Bearer)
   ▼
gateway ── routes/translation.routes.js (Joi)
   │
   ├─ services/translation.service.saveTranslation()
   │      └─ INSERT INTO translationhistory  (user, text, confidence, …)
   │
   ├─ [AI service - Phase 5]  POST /prediction → FastAPI (MediaPipe+LSTM)
   │      └─ PredictionLog.create()  → predictionlogs (auto TTL purged)
   │
   ▼
Dashboard GET /api/v1/translations?page=1&search=…&type=…
   └── index-backed find() + countDocuments() + meta

Feedback loop
   POST /api/v1/feedback
   ├─ INSERT feedback (rating, category)
   └─ INSERT notification (type=feedback)      ← cross-collection flow
   PATCH /api/v1/notifications/:id/read → readAt set → unread badge drops

Settings
   GET /api/v1/settings            → system defaults (public)
   GET /api/v1/settings/me         → user prefs (Bearer)
   PATCH /api/v1/admin/settings    → system flag change (admin)
```

- **Schema/reference choice vs collection split**: `predictionlogs` TTL
  auto-purge + `translationhistory` eternal retention = the two are kept
  as separate collections for exactly that reason (see §2).

## 7. Scale guardrails (when this goes to Atlas)

- Adds a read `$or` for search → switch to the already-declared `$text`
  index + `score` sort for >100K rows.
- `skip` pagination costs O(offset). At large offsets use keyset
  pagination (`WHERE createdAt < lastCursor`).
- The `refreshToken` collection is a perfect candidate for a separate
  database/replica — session data should never co-locate with user data.
- Add `allowDiskUse: true` only to the one-time analytics aggregates;
  the hot paths (dashboard + history) are all covered by indexes above.

---
*Phase 4 complete — next: FastAPI AI service (Phase 5), Jest suite, WebSocket realtime.*