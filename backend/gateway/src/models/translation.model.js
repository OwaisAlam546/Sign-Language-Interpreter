// ─────────────────────────────────────────────────────────────
//  models/translation.model.js — TRANSLATION HISTORY
//  Collection: translationhistory
//  One document per completed translation (letter/word/phrase).
//  Appends to, never mutates — it is the audit trail that powers
//  the dashboard (history, accuracy, latency) AND the provenance
//  that links feedback/prediction logs back to a real session.
// ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

const translationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['letter', 'word', 'phrase'],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    // Raw AI label straight from the model (e.g. "hello") BEFORE any
    // presentation mapping — text is the user-facing translation.
    prediction: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },
    gesture: {
      type: String,
      default: '', // the ASL gesture name for word/phrase translations
      trim: true,
    },
    // What the user actually SAID (audio input mode) — pairs with the
    // gesture prediction to form a complete speech↔sign translation pair.
    userSpeech: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null, // model confidence (0–1)
    },
    fps: { type: Number, min: 0, default: null },
    latencyMs: { type: Number, min: 0, default: null },
    engine: {
      type: String,
      enum: ['mediapipe', 'lstm'],
      default: 'mediapipe', // which pipeline produced this result
    },
    status: {
      type: String,
      enum: ['completed', 'failed'],
      default: 'completed',
    },
    inputMode: {
      type: String,
      enum: ['webcam', 'upload', 'audio'],
      default: 'webcam',
    },
    errorMessage: { type: String, default: '' }, // populated when status=failed
    audioUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

// History queries are always "user X, newest first" — instant via index.
translationSchema.index({ userId: 1, createdAt: -1 });
// The admin dashboard filters history by pipeline health.
translationSchema.index({ userId: 1, engine: 1, createdAt: -1 });
// Text search (used by the ?search= parameter — $text beats regex at scale).
translationSchema.index({ text: 'text', gesture: 'text', prediction: 'text', userSpeech: 'text' });

// `translationhistory` (not the auto-pluralized "translationhistories").
module.exports = mongoose.model('TranslationHistory', translationSchema, 'translationhistory');