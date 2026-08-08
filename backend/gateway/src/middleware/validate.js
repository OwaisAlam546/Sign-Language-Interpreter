// ─────────────────────────────────────────────────────────────
//  middleware/validate.js — REQUEST VALIDATION
//  validate(schema, source) returns middleware that runs a Joi
//  schema against req.body / req.query / req.params.
//  On failure → 422 VALIDATION_ERROR with per-field details.
//  On success → replaces the source with Joi's sanitized value
//  (extra keys stripped, types coerced).
// ─────────────────────────────────────────────────────────────
const ApiError = require('../utils/ApiError');

const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false, // report ALL field errors, not just the first
    stripUnknown: true, // drop keys that are not in the schema
  });

  if (error) {
    const details = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    return next(new ApiError(422, 'VALIDATION_ERROR', 'Invalid request data.', details));
  }

  req[source] = value;
  next();
};

module.exports = validate;
