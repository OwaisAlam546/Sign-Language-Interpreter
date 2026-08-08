// ─────────────────────────────────────────────────────────────
//  middleware/authorize.js — ROLE-BASED ACCESS CONTROL
//  Complements `auth.js` (identity). authorize() checks role:
//    router.use(auth, authorize('admin'));          → admins only
//    router.use(auth, authorize('admin', 'user'));  → any logged-in
//  Users hitting a role they don't have get a clean 403.
// ─────────────────────────────────────────────────────────────
const ApiError = require('../utils/ApiError');

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(
      new ApiError(403, 'FORBIDDEN', 'You do not have permission to access this resource.')
    );
  }
  next();
};

module.exports = authorize;