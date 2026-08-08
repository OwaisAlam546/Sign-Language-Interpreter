// ─────────────────────────────────────────────────────────────
//  services/gesture.service.js — DICTIONARY BUSINESS LOGIC
//  Public read-only queries with optional category + search filters.
// ─────────────────────────────────────────────────────────────
const Gesture = require('../models/gesture.model');
const ApiError = require('../utils/ApiError');

// ?category=letter|word   ?q=search term (label or description)
async function listGestures({ category, q } = {}) {
  const filter = {};
  if (category) filter.category = category;
  if (q) {
    filter.$or = [
      { label: new RegExp(q, 'i') },
      { description: new RegExp(q, 'i') },
    ];
  }
  return Gesture.find(filter).sort({ category: 1, label: 1 }).lean();
}

async function getGestureByLabel(label) {
  const gesture = await Gesture.findOne({ label: String(label).toUpperCase() }).lean();
  if (!gesture) {
    throw new ApiError(404, 'GESTURE_NOT_FOUND', `No gesture "${label}" in the dictionary.`);
  }
  return gesture;
}

module.exports = { listGestures, getGestureByLabel };
