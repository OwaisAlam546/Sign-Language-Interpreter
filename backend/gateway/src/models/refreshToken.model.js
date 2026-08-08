// ─────────────────────────────────────────────────────────────
//  models/refreshToken.model.js — REVOCABLE SESSIONS
//  Stores a SHA-256 HASH of every refresh token (never the token
//  itself), so a database leak cannot be replayed as sessions.
//  A TTL index auto-deletes expired records.
// ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // NOTE: no `index: true` here — the TTL index below covers it
    },
    revokedAt: {
      type: Date,
      default: null, // set when the token is rotated or logged out
    },
  },
  { timestamps: true }
);

// MongoDB TTL index: expired records are purged automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
