// ─────────────────────────────────────────────────────────────
//  middleware/rateLimiter.js — RATE LIMITING
//  Two limiters:
//    api  — global 120 req / 15 min per IP
//    auth — 10 req / 15 min per IP on credential endpoints
//  Skipped in tests so the verify script never trips them.
// ─────────────────────────────────────────────────────────────
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { RATE_LIMITS } = require('../constants');

const envelope = (message) => ({
  success: false,
  error: { code: 'RATE_LIMITED', message },
});

const api = rateLimit({
  windowMs: RATE_LIMITS.API_WINDOW_MS,
  limit: RATE_LIMITS.API_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: envelope('Too many requests — please slow down.'),
});

const auth = rateLimit({
  windowMs: RATE_LIMITS.API_WINDOW_MS,
  limit: RATE_LIMITS.AUTH_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: envelope('Too many login attempts — please try again later.'),
});

module.exports = { api, auth };
