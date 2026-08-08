// ─────────────────────────────────────────────────────────────
//  utils/ApiError.js — THE ONE ERROR TYPE
//  Every place that "throws" throws this. The central error
//  handler (middleware/errorHandler.js) understands it and turns
//  it into a consistent JSON response: { success:false, error:{...} }
// ─────────────────────────────────────────────────────────────
class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.status = status; // HTTP status code
    this.code = code; // machine-readable error code (e.g. EMAIL_TAKEN)
    this.details = details; // optional structured details (validation fields)
    Error.captureStackTrace(this, ApiError);
  }

  // Named factories make call sites read like prose
  static badRequest(message) { return new ApiError(400, 'BAD_REQUEST', message); }
  static unauthorized(message) { return new ApiError(401, 'UNAUTHORIZED', message); }
  static forbidden(message) { return new ApiError(403, 'FORBIDDEN', message); }
  static notFound(message) { return new ApiError(404, 'NOT_FOUND', message); }
  static conflict(message) { return new ApiError(409, 'CONFLICT', message); }
  static validation(message, details) { return new ApiError(422, 'VALIDATION_ERROR', message, details); }
  static serviceUnavailable(message) { return new ApiError(503, 'SERVICE_UNAVAILABLE', message); }
}

module.exports = ApiError;
