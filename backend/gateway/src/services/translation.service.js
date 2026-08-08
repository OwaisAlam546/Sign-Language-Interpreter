// ─────────────────────────────────────────────────────────────
//  services/translation.service.js — HISTORY & DASHBOARD LOGIC
//  Full CRUD: create, list (pagination/search/filtering/sorting),
//  read-one, update (whitelist), delete-one, clear-history; plus
//  dashboard aggregates. Every resource op is owner-scoped: the
//  userId is always part of the query, so document ids from other
//  users simply never match — they surface as a plain 404.
// ─────────────────────────────────────────────────────────────
const Translation = require('../models/translation.model');
const { Types: { ObjectId } } = require('mongoose');
const ApiError = require('../utils/ApiError');
const { requireObjectId } = require('../utils/objectId');
const { buildListQuery, paginate } = require('../utils/listQuery');

// Fields a client may EDIT on an existing history record. `type` and
// `userId` are deliberately missing — they define the record's
// identity, so they are append-only (see docs/DATABASE.md §2).
const EDITABLE_FIELDS = ['text', 'prediction', 'gesture', 'userSpeech', 'confidence', 'engine', 'status', 'inputMode'];

async function saveTranslation(userId, data) {
  return Translation.create({ userId, ...data });
}

// Paginated history. Declares what the client may search/filter/sort
// on — everything else in the query string is ignored.
async function listTranslations(userId, query) {
  const opts = buildListQuery(query, {
    searchFields: ['text', 'gesture', 'prediction', 'userSpeech'],
    filterFields: { type: 'type', engine: 'engine', status: 'status' },
    sortMap: {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      confidence: { confidence: -1, createdAt: -1 },
    },
  });
  // A user may only ever see THEIR OWN history — injected after the
  // whitelist, so it can never be overwritten by a query param.
  opts.conditions.userId = userId;
  return paginate(Translation, opts.conditions, opts);
}

// READ one owned record. A valid-but-foreign id behaves identically
// to a missing one (404) — the API never leaks whether a record exists.
async function getTranslationById(userId, id) {
  requireObjectId(id);
  const translation = await Translation.findOne({ _id: id, userId }).lean();
  if (!translation) throw new ApiError(404, 'TRANSLATION_NOT_FOUND', 'Translation not found.');
  return translation;
}

// UPDATE: apply only the whitelisted fields that were actually sent.
async function updateTranslation(userId, id, updates) {
  requireObjectId(id);
  const patch = {};
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) patch[field] = updates[field];
  }
  const translation = await Translation.findOneAndUpdate(
    { _id: id, userId },
    patch,
    { new: true, runValidators: true } // schema enums/min/max apply on update too
  );
  if (!translation) throw new ApiError(404, 'TRANSLATION_NOT_FOUND', 'Translation not found.');
  return translation;
}

// DELETE one record (owner-scoped, 404 on miss).
async function deleteTranslation(userId, id) {
  requireObjectId(id);
  const translation = await Translation.findOneAndDelete({ _id: id, userId });
  if (!translation) throw new ApiError(404, 'TRANSLATION_NOT_FOUND', 'Translation not found.');
  return translation;
}

// DELETE all of the user's history ("clear the dashboard").
async function clearHistory(userId) {
  const { deletedCount } = await Translation.deleteMany({ userId });
  return { deletedCount };
}

// Dashboard aggregates: total, per-typer counts, average confidence,
// and a 7-day activity series for a chart.
async function getStats(userId) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // NOTE: aggregate() does NOT auto-cast $match strings to ObjectId
  // (find() does) — cast explicitly or the query silently matches nothing.
  const uid = new ObjectId(userId);

  const [total, byType, confidence, last7days] = await Promise.all([
    Translation.countDocuments({ userId: uid }),
    Translation.aggregate([
      { $match: { userId: uid } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    Translation.aggregate([
      { $match: { userId: uid, confidence: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$confidence' } } },
    ]),
    Translation.aggregate([
      { $match: { userId: uid, createdAt: { $gte: weekAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return {
    total,
    byType,
    avgConfidence: confidence[0]?.avg ?? null,
    last7days: last7days.map((day) => ({ date: day._id, count: day.count })),
  };
}

// ── EXPORT ─────────────────────────────────────────────────
// Column order is fixed so spreadsheets stay stable across exports.
const CSV_HEADERS = [
  'id', 'type', 'prediction', 'text', 'gesture', 'confidence',
  'engine', 'status', 'userSpeech', 'inputMode', 'latencyMs', 'createdAt',
];

// RFC-4180: every cell quoted, embedded quotes doubled. The BOM makes
// Excel open the CSV with UTF-8 (no mojibake on accented text).
const toCsv = (rows) =>
  '\ufeff' +
  CSV_HEADERS.map((h) => `"${h}"`).join(',') +
  '\n' +
  rows
    .map((r) =>
      CSV_HEADERS.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
    )
    .join('\n');

// Full export of the user's own history (never anyone else's).
async function exportTranslations(userId, format = 'csv') {
  const docs = await Translation.find({ userId }).sort({ createdAt: -1 }).lean();
  const rows = docs.map((d) => ({
    ...d,
    id: String(d._id),
    confidence: d.confidence ?? '',
    latencyMs: d.latencyMs ?? '',
    createdAt: d.createdAt.toISOString(),
  }));
  return {
    format: format === 'json' ? 'json' : 'csv',
    content: format === 'json' ? JSON.stringify(rows, null, 2) : toCsv(rows),
  };
}

module.exports = {
  saveTranslation,
  listTranslations,
  getTranslationById,
  updateTranslation,
  deleteTranslation,
  clearHistory,
  getStats,
  exportTranslations,
};