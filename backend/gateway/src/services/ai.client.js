// ─────────────────────────────────────────────────────────────
//  services/ai.client.js — THE ONLY BRIDGE TO THE AI SERVICE
//  Every call to FastAPI goes through this file. Swapping the
//  transport (HTTP → gRPC → message queue) touches one file only.
//
//  Phase 9 upgrades: timeout handling (504, not hang), retry with
//  backoff for transient failures, envelope error mapping, and
//  response streaming (audio/SSE) instead of buffering.
//
//  Failures are honest: a down service → 503, a slow one → 504,
//  a remote envelope error → its own code. Never fabricated data.
// ─────────────────────────────────────────────────────────────
const axios = require('axios');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const http = axios.create({
  baseURL: env.aiServiceUrl,
  timeout: env.aiTimeoutMs, // per-request budget — slow inference is flagged, not hung on
});

const MAX_RETRIES = 2;
const BACKOFF_MS = 25;

// Transient = network gotcha or 5xx — safe to retry. 4xx = contract violation → never retried.
const NETWORK_CODES = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EPIPE'];
const isRetryable = (err) =>
  NETWORK_CODES.includes(err.code) || (err.response && err.response.status >= 500);

// Map any axios failure to the canonical ApiError. AI envelope errors keep
// their own status + code (422 VALIDATION_ERROR passes through untouched).
function fail(err) {
  const status = err.response && err.response.status;
  const body = (err.response && err.response.data) || {};
  if (body && body.success === false) {
    return new ApiError(status || 400, body.error.code || 'AI_ERROR', body.error.message || 'AI rejected the request', body.error.details || null);
  }
  if (err.code === 'ECONNABORTED') {
    return new ApiError(504, 'AI_GATEWAY_TIMEOUT', `AI service did not answer within ${env.aiTimeoutMs}ms`);
  }
  if (status >= 500) {
    return new ApiError(502, 'AI_BAD_GATEWAY', `AI service error (${status})`);
  }
  return new ApiError(503, 'AI_SERVICE_UNAVAILABLE', `AI service unreachable: ${err.message}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// call — JSON round-trip with retry + envelope mapping.
// stream=false is the normal path; the data field is the AI envelope.
async function call(method, path, body = {}, { stream = false } = {}) {
  let retries = MAX_RETRIES;
  for (;;) {
    try {
      const { data, headers } = await http.request({ method, url: path, data: body, responseType: stream ? 'stream' : 'json' });
      if (!stream) return data; // envelope passes through untouched
      // Streaming: hand the raw response back — the router pipes it to the
      // client. Never buffer audio/SSE in gateway memory.
      return { stream: data, headers };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (isRetryable(err) && retries > 0) {
        retries -= 1;
        await sleep(BACKOFF_MS * (MAX_RETRIES - retries)); // 25ms, 50ms
        continue;
      }
      throw fail(err);
    }
  }
}

module.exports = { call };