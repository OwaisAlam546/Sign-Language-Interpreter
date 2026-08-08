// ─────────────────────────────────────────────────────────────
//  utils/asyncHandler.js — ASYNC CONTROLLER WRAPPER
//  Express 4 does not catch rejected promises from async handlers.
//  This wrapper forwards any rejection to the central error
//  handler, so controllers NEVER contain try/catch blocks.
// ─────────────────────────────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
