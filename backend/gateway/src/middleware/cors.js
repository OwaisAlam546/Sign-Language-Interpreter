// ─────────────────────────────────────────────────────────────
//  middleware/cors.js — CROSS-ORIGIN POLICY
//  Only the configured frontend origin(s) may call this API.
//  credentials:true is required so the browser stores the
//  httpOnly refresh-token cookie.
// ─────────────────────────────────────────────────────────────
const cors = require('cors');
const env = require('../config/env');

const allowedOrigins = env.clientUrl.split(',').map((origin) => origin.trim());

module.exports = cors({
  origin: allowedOrigins,
  credentials: true,
});
