// ─────────────────────────────────────────────────────────────
//  utils/logger.js — STRUCTURED LOGGER
//  Plain console-based logger with levels and timestamps.
//  JSON lines in production (parseable), readable text in dev.
// ─────────────────────────────────────────────────────────────
const env = require('../config/env');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[process.env.LOG_LEVEL || 'info'] || 20;

function write(level, message, meta) {
  if (LEVELS[level] < threshold) return;
  const line = env.isProd
    ? JSON.stringify({ ts: new Date().toISOString(), level, message, ...(meta || {}) })
    : `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}${meta ? ` ${JSON.stringify(meta)}` : ''}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

module.exports = {
  debug: (message, meta) => write('debug', message, meta),
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};
