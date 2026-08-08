// ─────────────────────────────────────────────────────────────
//  middleware/notFound.js — 404 FOR UNKNOWN ROUTES
//  Runs after every route and turns unmatched requests into a
//  consistent JSON 404 instead of the default HTML page.
// ─────────────────────────────────────────────────────────────
const ApiError = require('../utils/ApiError');

module.exports = (req, res, next) => {
  next(new ApiError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} does not exist.`));
};
