// ─────────────────────────────────────────────────────────────
//  services/predictionLog.service.js — AI PIPELINE TELEMETRY
//  Written by the AI service (through the gateway) for analytics;
//  read by admins. Logs are append-only: creating is the only write
//  path — the 6-month TTL index retires old rows automatically.
// ─────────────────────────────────────────────────────────────
const PredictionLog = require('../models/predictionLog.model');
const ApiError = require('../utils/ApiError');
const { requireObjectId } = require('../utils/objectId');
const { buildListQuery, paginate } = require('../utils/listQuery');

async function createLog(data) {
  return PredictionLog.create(data);
}

// Paginated analytics feed — search by gesture, filter by engine /
// input mode, sort by recency, confidence or latency. All whitelisted.
async function listLogs(query) {
  const opts = buildListQuery(query, {
    searchFields: ['gesture'],
    filterFields: { engine: 'engine', inputMode: 'inputMode' },
    sortMap: {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      confidence: { confidence: -1, createdAt: -1 },
      latency: { latencyMs: -1, createdAt: -1 },
    },
  });
  return paginate(PredictionLog, opts.conditions, opts);
}

// READ one raw log.
async function getLog(id) {
  requireObjectId(id);
  const log = await PredictionLog.findById(id).lean();
  if (!log) throw new ApiError(404, 'PREDICTION_LOG_NOT_FOUND', 'Prediction log does not exist.');
  return log;
}

// DELETE one log. There is deliberately NO update: logs are immutable
// pipeline telemetry — the TTL index already retires them (see
// docs/DATABASE.md §2), DELETE exists only for manual cleanup.
async function removeLog(id) {
  requireObjectId(id);
  const log = await PredictionLog.findByIdAndDelete(id);
  if (!log) throw new ApiError(404, 'PREDICTION_LOG_NOT_FOUND', 'Prediction log does not exist.');
  return log;
}

module.exports = { createLog, listLogs, getLog, removeLog };