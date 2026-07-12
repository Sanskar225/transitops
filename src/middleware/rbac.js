const ApiError = require('../utils/apiError');

/**
 * Usage: requireRole('ADMIN', 'FLEET_MANAGER')
 * Must run after `authenticate` middleware (needs req.user.role).
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Role '${req.user.role}' is not permitted to perform this action`, null, 'FORBIDDEN_ROLE'));
    }
    next();
  };
}

module.exports = requireRole;
