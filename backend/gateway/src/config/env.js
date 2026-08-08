// ─────────────────────────────────────────────────────────────
//  config/env.js — ENVIRONMENT CONFIGURATION
//  Loads .env once, exposes typed values, and FAILS FAST at boot
//  if a production-critical secret is missing. Never touch
//  process.env directly anywhere else in the app.
// ─────────────────────────────────────────────────────────────
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const REQUIRED = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'CLIENT_URL'];
const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required env vars: ${missing.join(', ')} — copy .env.example to .env`
  );
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: parseInt(process.env.PORT || '5000', 10),

  // Empty MONGO_URI → db.js spins up an in-memory MongoDB (development/demo convenience)
  mongoUri: process.env.MONGO_URI || '',

  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10),
  verifyTokenTtl: process.env.VERIFY_TOKEN_TTL || '1h', // email verification link
  resetTokenTtl: process.env.RESET_TOKEN_TTL || '15m', // password reset link
  // Require a verified email before login: on in production by default.
  // Set REQUIRE_EMAIL_VERIFICATION=true to force it in development too.
  requireEmailVerification:
    process.env.REQUIRE_EMAIL_VERIFICATION === 'true' || process.env.NODE_ENV === 'production',
  clientUrl: process.env.CLIENT_URL,
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  // Per-request budget for AI calls — a slow model is a 504, not a hang.
  aiTimeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '8000', 10),
  // SMTP — leave SMTP_USER/SMTP_PASS empty to use dev preview mode
  // (emails are printed to the console instead of sent).
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  emailFrom: process.env.EMAIL_FROM || '"SignSpeak AI" <no-reply@signspeak.ai>',
};
