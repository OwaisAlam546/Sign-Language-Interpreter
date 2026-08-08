// ─────────────────────────────────────────────────────────────
//  models/gesture.model.js — SIGN LANGUAGE DICTIONARY
//  A–Z letters + core words, seeded from src/seed/gestures.seed.js.
//  Served publicly so the frontend can render the gesture grid
//  without any hardcoded data.
// ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

const gestureSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      unique: true, // one entry per sign ("A", "HELLO", ...)
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['letter', 'word'],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    exampleVideoUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Gesture', gestureSchema);
