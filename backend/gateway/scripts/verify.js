// ─────────────────────────────────────────────────────────────
//  scripts/verify.js — END-TO-END API SMOKE TEST (auth complete)
//  Boots the real app against an in-memory MongoDB and exercises
//  every endpoint + failure path, including the full Phase 3
//  authentication flows: register → verify email → login →
//  refresh rotation → logout → forgot/reset password → change
//  password → admin role management.
//  Run: npm run verify   (exit code 0 = all green)
// ─────────────────────────────────────────────────────────────
const http = require('http');

// Test env MUST be set before anything is required — env.js reads these at import time
process.env.NODE_ENV = 'test';
process.env.PORT = '5010';
process.env.JWT_ACCESS_SECRET = 'verify-access-secret-0123456789-abcdef';
process.env.JWT_REFRESH_SECRET = 'verify-refresh-secret-9876543210-fedcba';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.AI_SERVICE_URL = 'http://localhost:59999'; // nothing listens here → AI "down"
process.env.AI_TIMEOUT_MS = '150'; // fast budget: the 504 test must not stall the suite

(async () => {
  const { connectDB, disconnectDB } = require('../src/config/db');
  await connectDB(); // no MONGO_URI → in-memory MongoDB

  const { seedGestures } = require('../src/seed/gestures.seed');
  const { seedAdmin } = require('../src/seed/admin.seed');
  await seedGestures();
  await seedAdmin();

  const emailService = require('../src/services/email.service');

  const app = require('../src/app');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5010, resolve));

  const base = 'http://localhost:5010';
  const results = [];
  const check = (name, ok, extra = '') => results.push({ name, ok, extra });

  async function req(method, path, { body, token, cookie } = {}) {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(base + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch { /* 204/empty */ }
    if (res.status >= 500) {
      console.log(`    → ${method} ${path} ⇒ ${res.status} ${JSON.stringify(data).slice(0, 220)}`);
    }
    return { status: res.status, data, setCookie: res.headers.get('set-cookie') || '' };
  }

  const refreshCookie = (r) => (r.setCookie.match(/refreshToken=([^;]+)/) || [])[1];
  const TOKEN_RE = /token=([A-Za-z0-9._-]+)/;
    const emailToken = (subject) => {
      const mail = [...emailService.getSentEmails()].reverse().find((m) => m.subject.includes(subject));
      if (!mail) return null;
      const m = mail.text.match(TOKEN_RE);
      return m ? m[1] : null;
    };

  // ══ AUTH — Register + email verification ════════════════════
  const reg = await req('POST', '/api/v1/auth/register', {
    body: { name: 'Owais Alam', email: 'owais@signspeak.ai', password: 'secret123' },
  });
  check('POST /auth/register → 201', reg.status === 201 && reg.data?.data?.user?.email === 'owais@signspeak.ai');
  check('register response hides password hash', !JSON.stringify(reg.data).includes('password'));
  check('register auto-sends verification email', emailService.getSentEmails().some((m) => m.subject.includes('verify your email')));

  const dup = await req('POST', '/api/v1/auth/register', {
    body: { name: 'Owais', email: 'owais@signspeak.ai', password: 'secret123' },
  });
  check('duplicate register → 409 EMAIL_TAKEN', dup.status === 409 && dup.data.error.code === 'EMAIL_TAKEN');

  const invalid = await req('POST', '/api/v1/auth/register', {
    body: { name: 'X', email: 'not-an-email', password: '1' },
  });
  check('invalid register body → 422 VALIDATION_ERROR', invalid.status === 422 && invalid.data.error.code === 'VALIDATION_ERROR');

  const verifyToken = emailToken('verify your email');
  check('verification email captured from email', !!verifyToken);
  const verifyBad = await req('GET', '/api/v1/auth/verify-email?token=garbage');
  check('verify-email with garbage token → 400', verifyBad.status === 400);
  const verifyOk = await req('GET', `/api/v1/auth/verify-email?token=${encodeURIComponent(verifyToken)}`);
  check('verify-email with real token → 200', verifyOk.status === 200 && verifyOk.data?.data?.user?.isEmailVerified === true);

  const resend = await req('POST', '/api/v1/auth/resend-verification', { body: { email: 'owais@signspeak.ai' } });
  check('POST /auth/resend-verification → 200', resend.status === 200 && resend.data.success === true);

  // Login works in dev even before verification (policy off in test env)
  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: 'owais@signspeak.ai', password: 'secret123' },
  });
  const access = login.data?.data?.accessToken;
  const cookie1 = refreshCookie(login);
  check('POST /auth/login → 200 + tokens', login.status === 200 && !!access && !!cookie1);

  const badLogin = await req('POST', '/api/v1/auth/login', {
    body: { email: 'owais@signspeak.ai', password: 'wrongpass' },
  });
  check('wrong password → 401', badLogin.status === 401);

  // ═══ PROFILE ═══════════════════════════════════════════════
  const noToken = await req('GET', '/api/v1/users/me');
  check('GET /users/me without token → 401', noToken.status === 401);

  const me1 = await req('GET', '/api/v1/users/me', { token: access });
  check('GET /users/me → 200 + verified flag', me1.status === 200 && me1.data?.data?.user?.isEmailVerified === true);

  const upd = await req('PATCH', '/api/v1/users/me', { token: access, body: { name: 'Owais A.' } });
  check('PATCH /users/me → 200 name updated', upd.status === 200 && upd.data?.data?.user?.name === 'Owais A.');

  // ═══ DICTIONARY ═════════════════════════════════════════════
  const all = await req('GET', '/api/v1/gestures');
  check('GET /gestures → 36 seeded', all.status === 200 && all.data.data.gestures.length === 36);
  const gWord = await req('GET', '/api/v1/gestures?category=word&q=hello');
  check('GET /gestures?category=word&q=hello → 1', gWord.status === 200 && gWord.data.data.gestures.length === 1);
  const gA = await req('GET', '/api/v1/gestures/A');
  check('GET /gestures/A → 200', gA.status === 200 && gA.data.data.gesture.label === 'A');
  const gZZ = await req('GET', '/api/v1/gestures/ZZ');
  check('GET /gestures/ZZ → 404 GESTURE_NOT_FOUND', gZZ.status === 404 && gZZ.data.error.code === 'GESTURE_NOT_FOUND');

  // ═══ TRANSLATIONS + FEEDBACK ════════════════════════════════
  const tr = await req('POST', '/api/v1/translations', {
    token: access,
    body: { type: 'word', text: 'HELLO', confidence: 0.97, fps: 30, latencyMs: 45 },
  });
  check('POST /translations → 201', tr.status === 201);

  const list = await req('GET', '/api/v1/translations?page=1&limit=5', { token: access });
  check('GET /translations → meta pagination', list.status === 200 && list.data.meta.total === 1);

  const stats = await req('GET', '/api/v1/translations/stats', { token: access });
  check('GET /translations/stats → total 1', stats.status === 200 && stats.data.data.stats.total === 1);

  const fb = await req('POST', '/api/v1/feedback', {
    token: access,
    body: { message: 'Love the real-time translation!', rating: 5 },
  });
  check('POST /feedback → 201', fb.status === 201);

  // ═══ PHASE 4 — DATABASE DESIGN (pagination · search · filtering) ═══
  const tr2 = await req('POST', '/api/v1/translations', {
    token: access,
    body: { type: 'letter', text: 'A' },
  });
  const tr3 = await req('POST', '/api/v1/translations', {
    token: access,
    body: { type: 'word', text: 'THANK', confidence: 0.9, engine: 'lstm', status: 'completed' },
  });
  check('POST /translations ×2 → 201 (history grows)', tr2.status === 201 && tr3.status === 201);

  const fSearch = await req('GET', '/api/v1/translations?search=thank', { token: access });
  check('GET /translations?search=thank → 1 match', fSearch.status === 200 && fSearch.data.meta.total === 1 && fSearch.data.data.translations[0].text === 'THANK');
  const fType = await req('GET', '/api/v1/translations?type=letter', { token: access });
  check('GET /translations?type=letter → 1 (filter)', fType.status === 200 && fType.data.meta.total === 1);
  const fSort = await req('GET', '/api/v1/translations?sort=confidence&page=1&limit=5', { token: access });
  check('GET /translations?sort=confidence → highest first', fSort.status === 200 && fSort.data.data.translations[0].confidence === 0.97);

  const fb2 = await req('POST', '/api/v1/feedback', {
    token: access,
    body: { message: 'Letters work well too', rating: 4, category: 'ui' },
  });
  check('POST /feedback with category → 201', fb2.status === 201);
  const fbMine = await req('GET', '/api/v1/feedback?category=ui', { token: access });
  check('GET /feedback?category=ui → my filtered list', fbMine.status === 200 && fbMine.data.meta.total === 1);

  const plUser = await req('GET', '/api/v1/admin/prediction-logs', { token: access });
  check('user role on /admin/prediction-logs → 403', plUser.status === 403);

  // Notifications are created automatically when feedback is submitted
  const unread1 = await req('GET', '/api/v1/notifications/unread-count', { token: access });
  check('GET /notifications/unread-count → 2 (one per feedback)', unread1.status === 200 && unread1.data.data.count === 2);
  const notifList = await req('GET', '/api/v1/notifications?page=1&limit=10', { token: access });
  check('GET /notifications → list of 2 + meta', notifList.status === 200 && notifList.data.data.notifications.length === 2 && notifList.data.meta.total === 2);
  const readOne = await req('PATCH', `/api/v1/notifications/${notifList.data.data.notifications[0]._id}/read`, { token: access });
  check('PATCH /notifications/:id/read → readAt set', readOne.status === 200 && !!readOne.data.data.notification.readAt);
  const unread2 = await req('GET', '/api/v1/notifications/unread-count', { token: access });
  check('unread count drops to 1', unread2.status === 200 && unread2.data.data.count === 1);
  const readAll = await req('PATCH', '/api/v1/notifications/read-all', { token: access });
  check('PATCH /notifications/read-all → 200', readAll.status === 200);
  const unread3 = await req('GET', '/api/v1/notifications/unread-count', { token: access });
  check('unread count → 0 after read-all', unread3.status === 200 && unread3.data.data.count === 0);

  const sys = await req('GET', '/api/v1/settings');
  check('GET /settings (public) → 200 array', sys.status === 200 && Array.isArray(sys.data.data.settings));
  const pref = await req('PATCH', '/api/v1/settings/me', { token: access, body: { key: 'theme', value: 'dark' } });
  check('PATCH /settings/me → 200 saved', pref.status === 200 && pref.data.data.setting.value === 'dark');
  const prefGet = await req('GET', '/api/v1/settings/me', { token: access });
  check('GET /settings/me → theme restores', prefGet.status === 200 && prefGet.data.data.settings.some((s) => s.key === 'theme' && s.value === 'dark'));

  // ═══ PHASE 5 — FULL CRUD (read · update · delete) ════════════
  // History holds 3 records (HELLO 0.97, A, THANK 0.9) — newest first
  const hist = await req('GET', '/api/v1/translations?page=1&limit=10', { token: access });
  const thankyId = hist.data.data.translations[0]._id; // newest = THANK
  const tOne = await req('GET', `/api/v1/translations/${thankyId}`, { token: access });
  check('GET /translations/:id → 200', tOne.status === 200 && tOne.data.data.translation.text === 'THANK');
  const tBad = await req('GET', '/api/v1/translations/not-an-object-id', { token: access });
  check('GET /translations/:id malformed → 400 INVALID_ID', tBad.status === 400 && tBad.data.error.code === 'INVALID_ID');
  const tMiss = await req('GET', '/api/v1/translations/000000000000000000000000', { token: access });
  check('GET /translations/:id missing → 404', tMiss.status === 404);
  const tUpd = await req('PATCH', `/api/v1/translations/${thankyId}`, { token: access, body: { text: 'THANK YOU', confidence: 0.95 } });
  check('PATCH /translations/:id → 200 updated', tUpd.status === 200 && tUpd.data.data.translation.text === 'THANK YOU' && tUpd.data.data.translation.confidence === 0.95);
  const tDel = await req('DELETE', `/api/v1/translations/${thankyId}`, { token: access });
  check('DELETE /translations/:id → 200', tDel.status === 200);
  const tGone = await req('GET', '/api/v1/translations?search=thank', { token: access });
  check('?search=thank → 0 after delete', tGone.status === 200 && tGone.data.meta.total === 0);
  const tClear = await req('DELETE', '/api/v1/translations', { token: access });
  check('DELETE /translations (clear) → 2 removed', tClear.status === 200 && tClear.data.data.deletedCount === 2);
  const tEmpty = await req('GET', '/api/v1/translations', { token: access });
  check('GET /translations → 0 after clear', tEmpty.status === 200 && tEmpty.data.meta.total === 0);

  // Feedback: fb (no category) + fb2 (ui) exist; fb3 exercises CRUD
  const fb3 = await req('POST', '/api/v1/feedback', { token: access, body: { message: 'Needs more word signs', rating: 2, category: 'speed' } });
  check('POST /feedback (category speed) → 201', fb3.status === 201);
  const fb3Id = fb3.data.data.feedback._id;
  const fRead = await req('GET', `/api/v1/feedback/${fb3Id}`, { token: access });
  check('GET /feedback/:id → 200', fRead.status === 200 && fRead.data.data.feedback.category === 'speed');
  const fUpd = await req('PATCH', `/api/v1/feedback/${fb3Id}`, { token: access, body: { rating: 3, message: 'A bit slow but works' } });
  check('PATCH /feedback/:id → 200 rating 3', fUpd.status === 200 && fUpd.data.data.feedback.rating === 3);
  const fDel = await req('DELETE', `/api/v1/feedback/${fb3Id}`, { token: access });
  check('DELETE /feedback/:id → 200', fDel.status === 200);
  const fGone = await req('GET', '/api/v1/feedback?category=speed', { token: access });
  check('GET /feedback?category=speed → 0 after delete', fGone.status === 200 && fGone.data.meta.total === 0);

  // Notifications: one per feedback → 3 total; fb3's ack is the newest
  const noteList = await req('GET', '/api/v1/notifications?page=1&limit=5', { token: access });
  check('notifications → 3 total (one per feedback)', noteList.status === 200 && noteList.data.meta.total === 3);
  const noteId = noteList.data.data.notifications[0]._id;
  const nOne = await req('GET', `/api/v1/notifications/${noteId}`, { token: access });
  check('GET /notifications/:id → 200', nOne.status === 200 && nOne.data.data.notification.type === 'feedback');
  const nDel = await req('DELETE', `/api/v1/notifications/${noteId}`, { token: access });
  check('DELETE /notifications/:id → 200', nDel.status === 200);
  const n404 = await req('DELETE', `/api/v1/notifications/${noteId}`, { token: access });
  check('DELETE same notification twice → 404', n404.status === 404);

  // Settings: set → delete → 404 (theme from Phase 4 stays untouched)
  const lang = await req('PATCH', '/api/v1/settings/me', { token: access, body: { key: 'language', value: 'en' } });
  check('PATCH /settings/me (language) → 200', lang.status === 200);
  const langDel = await req('DELETE', '/api/v1/settings/me/language', { token: access });
  check('DELETE /settings/me/language → 200', langDel.status === 200);
  const lang404 = await req('DELETE', '/api/v1/settings/me/language', { token: access });
  check('DELETE unknown preference → 404', lang404.status === 404);

  // Profile CRUD: self-service account deletion on a throwaway user
  const temp = await req('POST', '/api/v1/auth/register', { body: { name: 'Temp User', email: 'temp@signspeak.ai', password: 'secret123' } });
  check('temp register → 201', temp.status === 201);
  const tempVerify = await req('GET', `/api/v1/auth/verify-email?token=${encodeURIComponent(emailToken('verify your email'))}`, {});
  check('temp email verified → 200', tempVerify.status === 200);
  const tempLogin = await req('POST', '/api/v1/auth/login', { body: { email: 'temp@signspeak.ai', password: 'secret123' } });
  const tempAccess = tempLogin.data?.data?.accessToken;
  check('temp login → 200', tempLogin.status === 200);
  const selfDel = await req('DELETE', '/api/v1/users/me', { token: tempAccess });
  check('DELETE /users/me → 200 (self-delete)', selfDel.status === 200);
  const selfGone = await req('POST', '/api/v1/auth/login', { body: { email: 'temp@signspeak.ai', password: 'secret123' } });
  check('self-deleted account cannot log in → 401', selfGone.status === 401);

  // ═══ REFRESH ROTATION + LOGOUT ══════════════════════════════
  const refresh1 = await req('POST', '/api/v1/auth/refresh', { cookie: `refreshToken=${cookie1}` });
  const cookie2 = refreshCookie(refresh1);
  const refreshAccess = refresh1.data?.data?.accessToken;
  check('POST /auth/refresh → rotated tokens', refresh1.status === 200 && !!refreshAccess && !!cookie2);

  const replay = await req('POST', '/api/v1/auth/refresh', { cookie: `refreshToken=${cookie1}` });
  check('replayed (old) refresh token → 401 (rotation works)', replay.status === 401);

  // ═══ FORGOT + RESET PASSWORD ════════════════════════════════
  const forgot = await req('POST', '/api/v1/auth/forgot-password', { body: { email: 'owais@signspeak.ai' } });
  check('POST /auth/forgot-password → 200', forgot.status === 200);
  const resetToken = emailToken('reset your password');
  check('reset email captured from dev preview', !!resetToken);

  const resetBad = await req('POST', '/api/v1/auth/reset-password', {
    body: { token: 'garbage', password: 'newpass789' },
  });
  check('reset-password with garbage token → 400', resetBad.status === 400);

  const resetOk = await req('POST', '/api/v1/auth/reset-password', {
    body: { token: resetToken, password: 'newpass789' },
  });
  check('reset-password with real token → 200', resetOk.status === 200);

  const oldPwLogin = await req('POST', '/api/v1/auth/login', {
    body: { email: 'owais@signspeak.ai', password: 'secret123' },
  });
  check('old password → 401 after reset', oldPwLogin.status === 401);

  const newPwLogin = await req('POST', '/api/v1/auth/login', {
    body: { email: 'owais@signspeak.ai', password: 'newpass789' },
  });
  const cookie3 = refreshCookie(newPwLogin);
  check('new password login → 200', newPwLogin.status === 200);

  const revokedSession = await req('POST', '/api/v1/auth/refresh', { cookie: `refreshToken=${cookie2}` });
  check('pre-reset refresh token → 401 (sessions revoked)', revokedSession.status === 401);

  // ═══ CHANGE PASSWORD ════════════════════════════════════════
  const cpWrong = await req('PATCH', '/api/v1/users/change-password', {
    token: refreshAccess,
    body: { currentPassword: 'nope', newPassword: 'changed_456' },
  });
  check('change-password wrong current → 401', cpWrong.status === 401);
  const cpOk = await req('PATCH', '/api/v1/users/change-password', {
    token: refreshAccess,
    body: { currentPassword: 'newpass789', newPassword: 'changed456' },
  });
  check('change-password correct → 200', cpOk.status === 200);
  const cpLogin = await req('POST', '/api/v1/auth/login', {
    body: { email: 'owais@signspeak.ai', password: 'changed456' },
  });
  const cookie4 = refreshCookie(cpLogin);
  check('login with changed password → 200', cpLogin.status === 200);
  const cpSession = await req('POST', '/api/v1/auth/refresh', { cookie: `refreshToken=${cookie3}` });
  check('pre-change refresh token → 401 (sessions revoked)', cpSession.status === 401);

  // ═══ ADMIN + ROLE-BASED ACCESS ══════════════════════════════
  const adminLogin = await req('POST', '/api/v1/auth/login', {
    body: { email: 'admin@signspeak.ai', password: 'Admin123456' },
  });
  const adminToken = adminLogin.data?.data?.accessToken;
  check('admin seed + login → 200', adminLogin.status === 200 && !!adminToken);

  const userOnAdmin = await req('GET', '/api/v1/admin/users', { token: refreshAccess });
  check('user role on /admin/users → 403 FORBIDDEN', userOnAdmin.status === 403 && userOnAdmin.data.error.code === 'FORBIDDEN');

  const adminList = await req('GET', '/api/v1/admin/users', { token: adminToken });
  check('admin on /admin/users → 200 list', adminList.status === 200 && adminList.data?.data?.users?.length >= 2);

  const regId = reg.data?.data?.user?._id;
  const adminOne = await req('GET', `/api/v1/admin/users/${regId}`, { token: adminToken });
  check('admin GET user by id → 200', adminOne.status === 200);

  const selfRole = await req('PATCH', `/api/v1/admin/users/${regId}/role`, { token: adminToken, body: { role: 'admin' } });
  check('admin can promote user → 200', selfRole.status === 200 && selfRole.data?.data?.user?.role === 'admin');

  const promoted = await req('POST', '/api/v1/auth/login', {
    body: { email: 'owais@signspeak.ai', password: 'changed456' },
  });
  const promotedAccess = promoted.data?.data?.accessToken;
  check('promoted user login has admin role', promoted.data?.data?.user?.role === 'admin');
  const promotedAdmin = await req('GET', '/api/v1/admin/users', { token: promotedAccess });
  check('promoted user can hit /admin/users → 200', promotedAdmin.status === 200);

  // ═══ PHASE 4 — ADMIN DATABASE VIEWS ═══
  const pl = await req('POST', '/api/v1/admin/prediction-logs', {
    token: adminToken,
    body: { engine: 'lstm', confidence: 0.92, latencyMs: 34, inputFrames: 30 },
  });
  check('POST /admin/prediction-logs → 201', pl.status === 201);
  const plList = await req('GET', '/api/v1/admin/prediction-logs?page=1&limit=10', { token: adminToken });
  check('GET /admin/prediction-logs → 200 + meta', plList.status === 200 && plList.data.meta.total === 1);
  const sysSet = await req('PATCH', '/api/v1/admin/settings', {
    token: adminToken,
    body: { key: 'recognitionEngine', value: 'mediapipe', description: 'Default AI engine' },
  });
  check('PATCH /admin/settings → 200 system key', sysSet.status === 200 && sysSet.data.data.setting.key === 'recognitionEngine');
  const adminFbList = await req('GET', '/api/v1/admin/feedback?category=ui', { token: adminToken });
  check('GET /admin/feedback?category=ui → 200 filtered', adminFbList.status === 200 && adminFbList.data.data.feedback.length >= 1);

  // ═══ PHASE 5 — ADMIN CRUD (stats · moderation · logs · settings) ═══
  const adminStats = await req('GET', '/api/v1/admin/stats', { token: adminToken });
  check('GET /admin/stats → 200 counts', adminStats.status === 200 && adminStats.data.data.stats.users >= 2 && adminStats.data.data.stats.translations === 0 && typeof adminStats.data.data.stats.predictionLogs === 'number');

  const fbTarget = adminFbList.data.data.feedback[0]._id; // the category=ui submission
  const resolveIt = await req('PATCH', `/api/v1/admin/feedback/${fbTarget}/resolve`, { token: adminToken, body: { resolved: true } });
  check('PATCH /admin/feedback/:id/resolve → 200 resolved', resolveIt.status === 200 && resolveIt.data.data.feedback.resolved === true);
  const editLocked = await req('PATCH', `/api/v1/feedback/${fbTarget}`, { token: access, body: { rating: 5 } });
  check('user edit on resolved feedback → 409 FEEDBACK_RESOLVED', editLocked.status === 409 && editLocked.data.error.code === 'FEEDBACK_RESOLVED');
  const admFbDel = await req('DELETE', `/api/v1/admin/feedback/${fbTarget}`, { token: adminToken });
  check('DELETE /admin/feedback/:id → 200', admFbDel.status === 200);
  const admFbEmpty = await req('GET', '/api/v1/admin/feedback?category=ui', { token: adminToken });
  check('admin ?category=ui inbox → 0 after delete', admFbEmpty.status === 200 && admFbEmpty.data.meta.total === 0);

  const plOne = await req('GET', `/api/v1/admin/prediction-logs/${plList.data.data.logs[0]._id}`, { token: adminToken });
  check('GET /admin/prediction-logs/:id → 200', plOne.status === 200 && plOne.data.data.log.engine === 'lstm');
  const plDel = await req('DELETE', `/api/v1/admin/prediction-logs/${plList.data.data.logs[0]._id}`, { token: adminToken });
  check('DELETE /admin/prediction-logs/:id → 200', plDel.status === 200);

  const sysDel = await req('DELETE', '/api/v1/admin/settings/recognitionEngine', { token: adminToken });
  check('DELETE /admin/settings/:key → 200', sysDel.status === 200);
  const sysEmpty = await req('GET', '/api/v1/settings');
  check('public /settings → empty after system key delete', sysEmpty.status === 200 && sysEmpty.data.data.settings.length === 0);

  const del = await req('DELETE', `/api/v1/admin/users/${regId}`, { token: adminToken });
  check('DELETE /admin/users/:id → 200', del.status === 200);
  const delLogin = await req('POST', '/api/v1/auth/login', {
    body: { email: 'owais@signspeak.ai', password: 'changed456' },
  });
  check('deleted user login → 401', delLogin.status === 401);

  // ═══ MISC ═══════════════════════════════════════════════════
  const nf = await req('GET', '/api/v1/nope');
  check('unknown route → 404 NOT_FOUND envelope', nf.status === 404 && nf.data.error.code === 'NOT_FOUND');

  const ai = await req('GET', '/health/ai');
  check('GET /health/ai → 503 when AI down', ai.status === 503);

  // ═══ PHASE 9 — EXPRESS ↔ FASTAPI BRIDGE ═══
  // A fake FastAPI now takes over the EXACT dead port the suite reserved
  // (59999), proving the client's retry/timeout/streaming behavior without
  // needing a real Python process. Existing "AI down" checks ran above.
  let modelStatusCalls = 0;
  const fakeAI = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const path = req.url.split('?')[0];
      const json = (status, obj) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      };
      if (req.method === 'GET' && path === '/health') {
        return json(200, { success: true, data: { status: 'ok', engine: 'fake' } });
      }
      if (req.method === 'GET' && path === '/api/v1/model-status') {
        modelStatusCalls += 1;
        if (modelStatusCalls < 2) {
          return json(503, { success: false, error: { code: 'AI_TRANSIENT', message: 'warming up' } });
        }
        return json(200, { success: true, data: { engine: 'tensorflow', inputMode: 'sequence', warmupMs: 412, labelCount: 5 } });
      }
      if (req.method === 'POST' && path === '/api/v1/predict') {
        const { landmarks } = JSON.parse(body); // real AI contract: landmarks
        if (!Array.isArray(landmarks) || landmarks.length < 3) {
          return json(422, { success: false, error: { code: 'VALIDATION_ERROR', message: 'hand needs ≥3 points' } });
        }
        return json(200, { success: true, data: { gesture: 'B', confidence: 0.97, type: 'letter', engine: 'tensorflow' } });
      }
      if (req.method === 'POST' && path === '/api/v1/predict-sequence') {
        const { frames } = JSON.parse(body);
        return json(200, { success: true, data: { gesture: 'HELLO', confidence: 0.94, type: 'word', frameCount: frames.length } });
      }
      if (req.method === 'POST' && path === '/api/v1/text-to-speech') {
        const { text } = JSON.parse(body);
        if (text === 'slow') return; // never answers → gateway must 504
        res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': 8 });
        return res.end(Buffer.from('RIFFfake1'));
      }
      return json(404, { success: false, error: { code: 'NOT_FOUND', message: 'fake AI: no such route' } });
    });
  });

  await new Promise((resolve) => fakeAI.listen(59999, resolve));

  const ms = await req('GET', '/api/v1/ai/model-status');
  check('GET /ai/model-status → 200 after retry (transient 503 first)', ms.status === 200 && ms.data?.data?.engine === 'tensorflow' && modelStatusCalls >= 2);

  const pr = await req('POST', '/api/v1/ai/predict', { body: { hand: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6] } });
  check('POST /ai/predict → envelope passthrough (B · letter)', pr.status === 200 && pr.data?.data?.gesture === 'B' && pr.data?.data?.type === 'letter');

  const bad = await req('POST', '/api/v1/ai/predict', { body: { hand: [1, 2] } });
  check('AI 422 → gateway 422 with AI code (VALIDATION_ERROR)', bad.status === 422 && bad.data?.error?.code === 'VALIDATION_ERROR');

  const seq = await req('POST', '/api/v1/ai/predict-sequence', { body: { frames: [1, 2, 3] } });
  check('POST /ai/predict-sequence → HELLO word passthrough', seq.status === 200 && seq.data?.data?.gesture === 'HELLO' && seq.data?.data?.frameCount === 3);

  const hw = await req('POST', '/api/v1/ai/tts', { body: { text: 'slow' } });
  check('slow AI → gateway 504 AI_GATEWAY_TIMEOUT', hw.status === 504 && hw.data?.error?.code === 'AI_GATEWAY_TIMEOUT');

  const tts = await fetch(base + '/api/v1/ai/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'hello' }),
  });
  const wav = Buffer.from(await tts.arrayBuffer());
  check('POST /ai/tts → streamed WAV (audio/wav · RIFF bytes)', tts.status === 200 && tts.headers.get('content-type') === 'audio/wav' && wav.slice(0, 4).toString() === 'RIFF');

  const aiUp = await req('GET', '/api/v1/ai/health');
  check('GET /ai/health → deep probe up', aiUp.status === 200 && aiUp.data?.data?.ai === 'up');

  await new Promise((resolve) => fakeAI.close(resolve));
  const down = await req('GET', '/api/v1/ai/model-status');
  check('AI down again → 503 AI_SERVICE_UNAVAILABLE (no fabricated data)', down.status === 503 && down.data?.error?.code === 'AI_SERVICE_UNAVAILABLE');

  // ═══ PHASE 10 — TRANSLATION HISTORY SYSTEM ═════════════════
  // The Phase-5 user was deleted above, so this block spins its own.
  // Full lifecycle: store (prediction + userSpeech), search over the
  // new fields, pagination, filter, stats, CSV/JSON export, delete,
  // and the admin analytics dashboard.
  const p10reg = await req('POST', '/api/v1/auth/register', {
    body: { name: 'Phase 10', email: 'phase10@signspeak.ai', password: 'secret123' },
  });
  const p10verify = await req('GET', `/api/v1/auth/verify-email?token=${encodeURIComponent(emailToken('verify your email'))}`);
  const p10login = await req('POST', '/api/v1/auth/login', {
    body: { email: 'phase10@signspeak.ai', password: 'secret123' },
  });
  const pToken = p10login.data?.data?.accessToken;
  check('Phase 10 user register+verify+login → 200', p10reg.status === 201 && p10verify.status === 200 && p10login.status === 200 && !!pToken);

  const h1 = await req('POST', '/api/v1/translations', {
    token: pToken,
    body: { type: 'word', text: 'HELLO', prediction: 'hello', gesture: 'HELLO', confidence: 0.94, engine: 'lstm', userSpeech: 'Say hello', inputMode: 'audio', latencyMs: 42 },
  });
  const h2 = await req('POST', '/api/v1/translations', { token: pToken, body: { type: 'letter', text: 'A', prediction: 'a', confidence: 0.97, engine: 'mediapipe' } });
  const h3 = await req('POST', '/api/v1/translations', {
    token: pToken,
    body: { type: 'word', text: 'THANK YOU', prediction: 'thank you', gesture: 'THANK', confidence: 0.88, engine: 'lstm', userSpeech: 'Thanks a lot', inputMode: 'audio' },
  });
  const h4 = await req('POST', '/api/v1/translations', { token: pToken, body: { type: 'word', text: 'GOOD MORNING', prediction: 'good morning', gesture: 'GOODMORNING', confidence: 0.91, engine: 'lstm' } });
  const h5 = await req('POST', '/api/v1/translations', { token: pToken, body: { type: 'letter', text: 'B', prediction: 'b', confidence: 0.8 } });
  check('POST /translations ×5 → 201 (prediction + userSpeech stored)',
    h1.status === 201 && h2.status === 201 && h3.status === 201 && h4.status === 201 && h5.status === 201 &&
    h1.data?.data?.translation?.prediction === 'hello' && h1.data?.data?.translation?.userSpeech === 'Say hello');

  const l10 = await req('GET', '/api/v1/translations?page=1&limit=5', { token: pToken });
  check('GET /translations → meta.total 5', l10.status === 200 && l10.data.meta.total === 5);

  const sPred = await req('GET', '/api/v1/translations?search=hello', { token: pToken });
  check('?search=hello → 1 (hits prediction)', sPred.status === 200 && sPred.data.meta.total === 1);
  const sSpeech = await req('GET', '/api/v1/translations?search=thanks', { token: pToken });
  check('?search=thanks → 1 (hits userSpeech)', sSpeech.status === 200 && sSpeech.data.meta.total === 1);
  const fEng = await req('GET', '/api/v1/translations?engine=lstm', { token: pToken });
  check('?engine=lstm filter → 3', fEng.status === 200 && fEng.data.meta.total === 3);
  const sConf = await req('GET', '/api/v1/translations?sort=confidence', { token: pToken });
  check('?sort=confidence → 0.97 first', sConf.status === 200 && sConf.data.data.translations[0].confidence === 0.97);

  const st10 = await req('GET', '/api/v1/translations/stats', { token: pToken });
  check('GET /translations/stats → total 5 · avg 0.9', st10.status === 200 && st10.data.data.stats.total === 5 && st10.data.data.stats.avgConfidence === 0.9);

  const expJson = await fetch(base + '/api/v1/translations/export?format=json', { headers: { Authorization: `Bearer ${pToken}` } });
  const expRows = JSON.parse(await expJson.text());
  check('GET /translations/export?format=json → 5 rows',
    expJson.status === 200 && expJson.headers.get('content-type').includes('application/json') && expRows.length === 5 && expRows.some((r) => r.prediction === 'hello'));
  const expCsv = await fetch(base + '/api/v1/translations/export', { headers: { Authorization: `Bearer ${pToken}` } });
  const csvBytes = Buffer.from(await expCsv.arrayBuffer()); // BOM survives at byte level (fetch().text() strips it)
  const csvText = csvBytes.toString('utf8');
  check('GET /translations/export (csv) → BOM bytes + header + 5 rows',
    expCsv.status === 200 && expCsv.headers.get('content-type').includes('text/csv') &&
    csvBytes.slice(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])) &&
    csvText.replace(/^\uFEFF/, '').startsWith('"id","type"') && csvText.trim().split('\n').length === 6 && csvText.includes('THANK YOU'));

  const an = await req('GET', '/api/v1/admin/analytics', { token: adminToken });
  check('GET /admin/analytics → counts + topGestures + engagement',
    an.status === 200 && an.data?.data?.analytics?.counts?.translations >= 5 &&
    an.data.data.analytics.content.topGestures.length === 3 && an.data.data.analytics.engagement.withUserSpeech === 2);
  const anForbidden = await req('GET', '/api/v1/admin/analytics', { token: pToken });
  check('user on /admin/analytics → 403', anForbidden.status === 403);

  const targetId = l10.data.data.translations[0]._id;
  const up10 = await req('PATCH', `/api/v1/translations/${targetId}`, { token: pToken, body: { prediction: 'howdy', userSpeech: 'Howdy partner' } });
  check('PATCH /translations/:id → prediction + userSpeech updated',
    up10.status === 200 && up10.data.data.translation.prediction === 'howdy' && up10.data.data.translation.userSpeech === 'Howdy partner');
  const dl10 = await req('DELETE', `/api/v1/translations/${targetId}`, { token: pToken });
  check('DELETE /translations/:id → 200', dl10.status === 200);
  const cl10 = await req('DELETE', '/api/v1/translations', { token: pToken });
  check('DELETE /translations (clear) → 4 removed', cl10.status === 200 && cl10.data.data.deletedCount === 4);
  const em10 = await req('GET', '/api/v1/translations', { token: pToken });
  check('GET /translations → 0 after clear', em10.status === 200 && em10.data.meta.total === 0);

  // ═══ PHASE 11 — ANALYTICS DASHBOARD (chart-ready) ═══════════
  // Fresh user with KNOWN rows: 3 today, 1 two weeks ago, 1 forty
  // days ago → exercises today/7d/30d splits, streak (1), daily
  // (sum 4 — the 40-day row is outside the window), weekly (sum 5),
  // monthly (sum 5). Confidence/latency/fps are chosen so every
  // aggregate is assertable EXACTLY: conf avg 0.83 · high ≥0.8 → 0.8
  // · latency avg 187.5 · median 175 · p95 300 · fps avg 26.25.
  const p11reg = await req('POST', '/api/v1/auth/register', { body: { name: 'Phase 11', email: 'phase11@signspeak.ai', password: 'secret123' } });
  await req('GET', `/api/v1/auth/verify-email?token=${encodeURIComponent(emailToken('verify your email'))}`);
  const p11login = await req('POST', '/api/v1/auth/login', { body: { email: 'phase11@signspeak.ai', password: 'secret123' } });
  const dToken = p11login.data?.data?.accessToken;
  check('Phase 11 user register+verify+login → 200', p11reg.status === 201 && p11login.status === 200 && !!dToken);

  const p11row = await req('POST', '/api/v1/translations', { token: dToken, body: { type: 'word', text: 'HELLO', prediction: 'hello', gesture: 'HELLO', confidence: 0.9, latencyMs: 100, fps: 30, engine: 'lstm' } });
  const p11uid = p11row.data?.data?.translation?.userId;
  await req('POST', '/api/v1/translations', { token: dToken, body: { type: 'word', text: 'HELLO', prediction: 'hello', gesture: 'HELLO', confidence: 0.9, latencyMs: 200, fps: 30, engine: 'lstm' } });
  await req('POST', '/api/v1/translations', { token: dToken, body: { type: 'letter', text: 'A', prediction: 'a', confidence: 0.6, latencyMs: 300, fps: 20, engine: 'mediapipe' } });
  // Backdate two rows — history timestamps are audit data, so write them
  // with a raw model save that skips the auto-timestamp.
  const TranslationModel = require('../src/models/translation.model');
  const backdate = async (body, daysAgo) => {
    const doc = new TranslationModel({ ...body, userId: p11uid });
    doc.createdAt = new Date(Date.now() - daysAgo * 86400000);
    await doc.save({ timestamps: false });
    return doc;
  };
  await backdate({ type: 'word', text: 'GOOD MORNING', prediction: 'good morning', gesture: 'GOODMORNING', confidence: 0.8, latencyMs: 150, fps: 25, engine: 'lstm' }, 14);
  await backdate({ type: 'word', text: 'PEACE', prediction: 'peace', gesture: 'PEACE', confidence: 0.95, latencyMs: 80, fps: 30, engine: 'mediapipe' }, 40);
  check('Phase 11 seed → 5 translations (3 today, 2 backdated)', p11row.status === 201 && !!p11uid);

  const dash = await req('GET', '/api/v1/analytics/dashboard', { token: dToken });
  const D = dash.data?.data?.dashboard;
  check('GET /analytics/dashboard → 200 + chart-ready envelope', dash.status === 200 && !!D);
  check('predictionCount → total 5 · today 3 · 7d 3 · 30d 4',
    D.predictionCount.total === 5 && D.predictionCount.today === 3 && D.predictionCount.last7Days === 3 && D.predictionCount.last30Days === 4);
  check('accuracy → avg 0.83 · high(≥0.8) rate 0.8', D.accuracy.avgConfidence === 0.83 && D.accuracy.highConfidenceRate === 0.8);
  check('latency → avg 187.5 · median 175 · p95 300', D.latency.avgMs === 187.5 && D.latency.medianMs === 175 && D.latency.p95Ms === 300);
  check('fps → avg 26.25', D.fps.avg === 26.25);
  check('mostUsedGestures → HELLO top (2) of 3', D.mostUsedGestures.length === 3 && D.mostUsedGestures[0].gesture === 'HELLO' && D.mostUsedGestures[0].count === 2);
  check('dailyUsage → 30 zero-filled buckets, sum 4',
    D.dailyUsage.length === 30 && D.dailyUsage.every((b) => typeof b.count === 'number') && D.dailyUsage.reduce((a, b) => a + b.count, 0) === 4);
  check('weeklyUsage → 8 buckets, sum 5 (40-day row still in 60d window)',
    D.weeklyUsage.length === 8 && D.weeklyUsage.reduce((a, b) => a + b.count, 0) === 5);
  check('monthlyUsage → 12 buckets, sum 5', D.monthlyUsage.length === 12 && D.monthlyUsage.reduce((a, b) => a + b.count, 0) === 5);
  check('userStatistics → total 5 · activeDays 2 · avg/day 2 · streak 1',
    D.userStatistics.totalTranslations === 5 && D.userStatistics.activeDays === 2 && D.userStatistics.avgPerActiveDay === 2 && D.userStatistics.streak === 1);
  const mLstm = D.modelStatistics.find((m) => m.engine === 'lstm');
  const mMp = D.modelStatistics.find((m) => m.engine === 'mediapipe');
  check('modelStatistics → lstm 3 · 0.87 · 150ms · 100%',
    !!mLstm && mLstm.count === 3 && mLstm.avgConfidence === 0.87 && mLstm.avgLatencyMs === 150 && mLstm.successRate === 1);
  check('modelStatistics → mediapipe 2 · 0.77 · 190ms · 100%',
    !!mMp && mMp.count === 2 && mMp.avgConfidence === 0.77 && mMp.avgLatencyMs === 190 && mMp.successRate === 1); // (0.6+0.95)/2 = 0.775 → 0.77 in FP

  const admDash = await req('GET', '/api/v1/admin/analytics/dashboard', { token: adminToken });
  const AD = admDash.data?.data?.dashboard;
  check('GET /admin/analytics/dashboard → platform view (series 30/8/12)',
    admDash.status === 200 && AD.dailyUsage.length === 30 && AD.weeklyUsage.length === 8 && AD.monthlyUsage.length === 12 && AD.modelStatistics.length === 2 && AD.userStatistics.totalUsers >= 3 && AD.userStatistics.topUsers[0].count === 5);
  const admDashForbidden = await req('GET', '/api/v1/admin/analytics/dashboard', { token: dToken });
  check('user on /admin/analytics/dashboard → 403', admDashForbidden.status === 403);

  // ── Report ──────────────────────────────────────────────────
  let failed = 0;
  for (const r of results) {
    console.log(`${r.ok ? '  ✓' : '  ✗ FAIL'}  ${r.name}${r.extra ? `   [${r.extra}]` : ''}`);
    if (!r.ok) failed += 1;
  }
  console.log(`\n${results.length - failed}/${results.length} checks passed`);

  server.close();
  await disconnectDB();
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error('Verify crashed:', err);
  process.exit(1);
});