// ─────────────────────────────────────────────────────────────
//  utils/objectId.js — SHARED ID GUARD
//  URL ids like /translations/:id arrive as strings. A malformed
//  id must never reach Mongo as a query — it would cast-error.
//  One guard → one consistent 400 INVALID_ID across every :id route.
// ─────────────────────────────────────────────────────────────
const { Types } = require('mongoose');
const ApiError = require('./ApiError');

function requireObjectId(id) {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'INVALID_ID', 'The id in the URL is not a valid ObjectId.');
  }
  return id;
}

module.exports = { requireObjectId };