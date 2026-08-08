// ─────────────────────────────────────────────────────────────
//  models/setting.model.js — SETTINGS (Collection: settings)
//  A single collection for BOTH kinds of configuration:
//    • system scope (userId = null)  → app defaults & feature flags
//    • user scope  (userId = ObjectId) → per-user preferences
//  One unique index { userId, key } guarantees:
//    • system keys cannot be duplicated
//    • each user has each key at most once
//    • the same key can exist per user without clashing
// ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null = system scope
    },
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
      match: [/^[a-zA-Z0-9._-]+$/, 'Key may only contain a-z, 0-9, . _ -'],
    },
    value: { type: mongoose.Schema.Types.Mixed, required: true }, // string|number|bool
    description: { type: String, default: '', maxlength: 200 },
  },
  { timestamps: true }
);

// The uniqueness core of the whole collection (see header comment).
settingSchema.index({ userId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Setting', settingSchema, 'settings');