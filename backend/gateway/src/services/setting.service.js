// ─────────────────────────────────────────────────────────────
//  services/setting.service.js — SETTINGS BUSINESS LOGIC
//  Two scopes share one collection:
//    • system (userId = null) → public GET /settings
//    • user   (userId = ObjectId) → private /settings/me
//  One {userId, key} unique index keeps both scopes clash-free and
//  never duplicates a key (see docs/DATABASE.md §2).
// ─────────────────────────────────────────────────────────────
const Setting = require('../models/setting.model');
const ApiError = require('../utils/ApiError');

// Public system defaults (app features every client needs).
async function listSystem() {
  return Setting.find({ userId: null }).sort({ key: 1 }).lean();
}

// My preferences (private).
async function listMine(userId) {
  return Setting.find({ userId }).sort({ key: 1 }).lean();
}

// Upsert: same (userId, key) pair can never duplicate (unique index)
// — setting a key twice just overwrites the stored value.
async function setKey(userId, { key, value, description }) {
  return Setting.findOneAndUpdate(
    { userId, key },
    { $set: { value, description: description || '' } },
    { new: true, upsert: true, runValidators: true }
  );
}

// DELETE a stored key → the app falls back to its hard-coded default.
// Works for BOTH scopes: user keys (userId = ObjectId) and system
// keys (userId = null) — that is the whole point of the design.
async function removeKey(userId, key) {
  const setting = await Setting.findOneAndDelete({ userId, key });
  if (!setting) throw new ApiError(404, 'SETTING_NOT_FOUND', `Setting "${key}" is not set.`);
  return setting;
}

module.exports = { listSystem, listMine, setKey, removeKey };