// ─────────────────────────────────────────────────────────────
//  constants/index.js — SHARED ENUMS & LIMITS
//  Single source of truth so values never drift between files.
// ─────────────────────────────────────────────────────────────
module.exports = {
  ROLES: { USER: 'user', ADMIN: 'admin' },

  COOKIE: {
    REFRESH: 'refreshToken',
    MAX_AGE_DAYS: 7,
    PATH: '/',
  },

  TRANSLATION_TYPES: ['letter', 'word', 'phrase'],
  GESTURE_CATEGORIES: ['letter', 'word'],
  DIFFICULTY_LEVELS: ['easy', 'medium', 'hard'],

  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 50,
  },

  RATE_LIMITS: {
    API_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    API_MAX: 120, // 120 requests per window per IP
    AUTH_MAX: 10, // stricter for credential endpoints (brute force)
  },
};
