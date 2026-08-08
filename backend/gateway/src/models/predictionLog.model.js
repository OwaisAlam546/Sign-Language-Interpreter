// ─────────────────────────────────────────────────────────────
//  models/predictionLog.model.js — PREDICTION LOG (Collection: predictionlogs)
//  Raw output of the AI pipeline: which engine ran, on how many
//  frames, with what score and latency, and whether it fell back.
//  WHY A SEPARATE COLLECTION: these are append-only, high-volume,
//  machine-generated rows kept only for analytics/debugging. They
//  are TTL-purged after 6 months — user history in
//  `translationhistory` is never deleted by that purge.
// ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

const predictionLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null = anonymous pre-login sessions
    },
    translationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TranslationHistory',
      default: null, // null = the prediction never became a translation
    },
    engine: {
      type: String,
      enum: ['mediapipe', 'lstm'],
      default: 'mediapipe',
    },
    gesture: { type: String, default: '' }, // what the model predicted
    confidence: { type: Number, min: 0, max: 1, default: null },
    inputFrames: { type: Number, min: 0, default: 0 }, // frames analysed
    latencyMs: { type: Number, min: 0, default: null },
    inputMode: {
      type: String,
      enum: ['webcam', 'upload', 'audio'],
      default: 'webcam',
    },
    fallbackUsed: { type: Boolean, default: false }, // rule-based fallback?
  },
  { timestamps: true }
);

// "Analytics over time" is the ONLY hot query on this collection.
predictionLogSchema.index({ createdAt: -1 });
predictionLogSchema.index({ engine: 1, createdAt: -1 });
// Per-user debugging: why did MY session misbehave yesterday?
predictionLogSchema.index({ userId: 1, createdAt: -1 });
// Retention: rows auto-delete when older than 6 months — Mongo runs
// this delete every 60s, at near-zero cost, without application code.
predictionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

module.exports = mongoose.model(
  'PredictionLog',
  predictionLogSchema,
  'predictionlogs'
);