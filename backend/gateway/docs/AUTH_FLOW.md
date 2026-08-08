# SignSpeak AI — Authentication Flow (Phase 3)

Complete JWT-based authentication for the API Gateway: register, email
verification, login, refresh-token rotation, logout, forgot/reset password,
change-password, and admin role management.

---

## 1. Files & responsibilities

| Layer | File | Why it exists |
|---|---|---|
| Model | `models/user.model.js` | User data + invariants. Password is **hashed here** (pre-save hook) so no service can forget to hash. |
| Model | `models/refreshToken.model.js` | Stores a **SHA-256 hash** of every refresh token (never the token itself) + expiry; TTL index auto-cleans old rows. |
| Service | `services/password.service.js` | The only file that touches bcrypt (cost 12) — hash + compare wrappers. |
| Service | `services/token.service.js` | All JWT work: access (15 min, stateless), refresh (7 days, rotating + revocable), email-verify & password-reset tokens (purpose claim), session revocation. |
| Service | `services/auth.service.js` | The whole authentication state machine: register, verifyEmail, resendVerification, loginUser, refreshTokens, logoutUser, forgotPassword, resetPassword. |
| Service | `services/email.service.js` | Delivery. **SMTP configured → real mail; otherwise dev-preview mode** (messages print to the console — nothing is sent). Captured messages are inspectable by tests. |
| Service | `services/emailTemplates.js` | HTML + plain-text builders for the two emails. |
| Service | `services/user.service.js` | Profile reads/updates + change-password (revokes all sessions). |
| Service | `services/admin.service.js` | Admin user management: paginated list, get, role change (protected from self-demotion), delete-with-cleanup. |
| Middleware | `middleware/auth.js` | Identity: verifies the Bearer access token → `req.user = { id, role }`. |
| Middleware | `middleware/authorize.js` | Authorization (RBAC): `authorize('admin')` → 403 for other roles. |
| Middleware | `middleware/validate.js` | Joi schema validation of body/query/params → 422 with field-level details. |
| Middleware | `middleware/rateLimiter.js` | `auth` limiter (10 req/15 min/IP) on every credential endpoint. |
| Controller | `controllers/auth.controller.js` | Thin HTTP glue: reads req, calls service, writes the refresh **httpOnly cookie** and the response envelope. |
| Controller | `controllers/user.controller.js` | `GET/PATCH /me` + change-password. |
| Controller | `controllers/admin.controller.js` | Admin handlers. |
| Route | `routes/auth.routes.js` | `/api/v1/auth/*` — validation schemas live here (= the request contract). |
| Route | `routes/user.routes.js` | `/api/v1/users/*` (auth-guarded). |
| Route | `routes/admin.routes.js` | `/api/v1/admin/*` (auth + `authorize('admin')`). |

---

## 2. The flows

### A. Registration → email verification

```
POST /api/v1/auth/register {name, email, password}
  │  1. 409 EMAIL_TAKEN if email exists
  │  2. bcrypt-hash password (model pre-save, cost 12)
  │  3. sign email-verify JWT {sub, purp:'email_verify'} (1 h)
  │  4. send "verify your email" link: {CLIENT_URL}/verify-email?token=…
  ▼           (SMTP or dev-preview console)
201 { user }                     ← password hash never leaves the service

GET /api/v1/auth/verify-email?token=…
  │  1. verify signature + purpose claim + expiry
  │  2. set isEmailVerified = true  (idempotent)
  ▼
200 { user, message }

(resend) POST /api/v1/auth/resend-verification {email}
  → ALWAYS 200 — identical response whether the account exists/verified or
    not, so the endpoint cannot be used to probe registered emails.
```

### ─ Login + refresh rotation

```
POST /api/v1/auth/login {email, password}
  │  1. find user WITH password (select:'+password'), compare bcrypt
  │  2. (prod) 403 EMAIL_NOT_VERIFIED if policy requires verification
  │  3. sign access token  (15 min, stateless, carries role)
  │  4. sign refresh token (7 d) + store SHA-256 hash in DB (revocable)
  ▼
200 { accessToken, user }  +  Set-Cookie: refreshToken=… (httpOnly, SameSite=Lax)

POST /api/v1/auth/refresh        ← cookie sent automatically
  │  1. verify refresh JWT signature
  │  2. DB lookup by hash; must exist & not be revoked/expired
  │  3. ROTATE: revoke old row, store new hash, sign new refresh
  ▼
200 { accessToken, user }  +  fresh refresh cookie

  → Replaying an already-used token returns 401: rotation makes stolen
    tokens useless after first use (OWASP guidance).

POST /api/v1/auth/logout  →  revoke the refresh hash, clear the cookie, 204
```

### ── Forgot / reset password

```
POST /api/v1/auth/forgot-password {email}
  │  Always 200: "if that email is registered, a link is on its way"
  │  (prevents account enumeration). When the user exists → sign
  │  reset token {purp:'password_reset', 15 min} → email link.
  ▼
200 { message }

POST /api/v1/auth/reset-password {token, password}
  │  1. verify token signature + purpose + expiry  → 400 otherwise
  │  2. set new password (pre-save re-hashes with bcrypt)
  │  3. revoke ALL refresh tokens for that user — every old session
  │     dies immediately, even on stolen devices
  ▼
200 { message }
```

### ── Change password (logged in)

```
PATCH /api/v1/users/change-password {currentPassword, newPassword}
  1. verify current password → 401 WRONG_PASSWORD otherwise
  2. hash + save the new password
  3. revoke ALL refresh tokens
```

### ── Role-based access

| Route | Guards | Allowed |
|---|---|---|
| `GET/PATCH /api/v1/users/me` | `auth` | any logged-in user |
| `PATCH /api/v1/users/change-password` | `auth` | any logged-in user |
| `GET /api/v1/admin/users` | `auth` + `authorize('admin')` | admin only |
| `GET /api/v1/admin/users/:id` | … | admin only |
| `PATCH /api/v1/admin/users/:id/role` | … | admin only — **cannot change your own role** (prevents lockout) |
| `DELETE /api/v1/admin/users/:id` | … | admin only — also deletes their sessions, translations, feedback |

Default admin (idempotent seed, `npm run seed`): `admin@signspeak.ai` / `Admin123456`
**→ change it before anything public.**

---

## 3. Security properties (why each choice)

- **bcrypt 12**: slow by design → offline brute-force cost ~2⁶⁰ guesses.
- **Access vs refresh split**: short-lived stateless access tokens (replicas
  need no session store) + long-lived sessions that CAN be revoked via the DB
  hash record.
- **Refresh tokens stored hashed**: a DB dump is not a session dump.
- **Rotation**: a stolen refresh token becomes unusable after being used once.
- **Every refresh token is unique (`jti`)**: JWT `iat` has 1-second resolution, so
  two tokens signed in the same second would be byte-identical — and after
  SHA-256 hashing they would collide with the unique `tokenHash` index. A
  random `jti` claim makes each issuance unique. (Caught in verification.)
- **Purpose-scoped tokens**: the verify link can never reset a password —
  the JWT carries `purp` and every verifier checks it.
- **Enumeration hardening**: forgot-password, resend-verification, and
  register all answer identically whether or not the email is registered.
- **Session-wide logout on password change/reset**: compromise of one device
  doesn't survive the password change.
- **httpOnly + SameSite=Lax refresh cookie**: XSS can't read it; CSRF can't
  craft it cross-origin; CORS locked to the frontend origin only.

## 4. Request / response contract

- Success: `{ success: true, data, meta? }`
- Errors: `{ success: false, error: { code, message, details? } }` — single
  JSON formatter (`middleware/errorHandler.js`); codes like `EMAIL_TAKEN`,
  `INVALID_TOKEN`, `WRONG_PASSWORD`, `FORBIDDEN`, `VALIDATION_ERROR`.
- New password rule everywhere: 8–72 chars (bcrypt limit), must contain a
  letter and a digit.

## 5. Dev-preview email mode

`SMTP_USER`/`SMTP_PASS` empty → emails are printed to the gateway console and
kept in an in-memory ring buffer (`email.service.getSentEmails()`), which is
exactly what the verify script uses to drive the real flow end-to-end:

```bash
npm run verify   # 46 checks: register → verify → login → refresh → reset → admin
```