// ─────────────────────────────────────────────────────────────
//  middleware/auth.js — AUTHENTICATION GUARD
//  Reads "Authorization: Bearer <accessToken>", verifies it,
//  and attaches req.user = { id, role } for controllers/services.
//  Applied to any route that needs a logged-in user.
// ─────────────────────────────────────────────────────────────
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../services/token.service');

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new ApiError(401, 'AUTH_REQUIRED', 'Please log in to access this resource.'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new ApiError(401, 'INVALID_TOKEN', 'Your session is invalid or has expired.'));
  }
}

module.exports = auth;
