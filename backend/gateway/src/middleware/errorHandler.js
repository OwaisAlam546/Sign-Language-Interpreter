// ─────────────────────────────────────────────────────────────
//  middleware/errorHandler.js — CENTRAL ERROR HANDLER
//  THE only place errors become HTTP responses. Classifies every
//  possible error into a consistent { success:false, error } shape:
//    ApiError            → its own status/code
//    Mongoose validation → 422
//    Bad ObjectId        → 400
//    Duplicate key       → 409
//    JWT failures        → 401
//    anything unknown    → 500 (logged, generic message to client)
//  Stack traces NEVER reach the client.
// ─────────────────────────────────────────────────────────────
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature
function errorHandler(err, req, res, next) {
  let apiErr;

  if (err instanceof ApiError) {
    apiErr = err;
  } else if (err.name === 'ValidationError') {
    // Mongoose schema-level validation (e.g. required field, enum mismatch)
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    apiErr = new ApiError(422, 'VALIDATION_ERROR', 'Invalid data.', details);
  } else if (err.name === 'CastError') {
    // e.g. /gestures/not-an-object-id
    apiErr = new ApiError(400, 'INVALID_ID', 'Invalid identifier in the request.');
  } else if (err.code === 11000) {
    // Unique index violation
    apiErr = new ApiError(409, 'DUPLICATE_ENTRY', 'This record already exists.');
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    apiErr = new ApiError(401, 'INVALID_TOKEN', 'Your session is invalid or has expired.');
  } else {
    logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, err);
    apiErr = new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong on our side.');
  }

  if (apiErr.status >= 500) {
    logger.error(`Request failed: ${req.method} ${req.originalUrl} → ${apiErr.code}`);
  }

  const body = { success: false, error: { code: apiErr.code, message: apiErr.message } };
  if (apiErr.details) body.error.details = apiErr.details;
  res.status(apiErr.status).json(body);
}

module.exports = errorHandler;
