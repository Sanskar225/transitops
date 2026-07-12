const { validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

// Run after an array of express-validator chains; collects and throws a 400 with details.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(ApiError.badRequest('Validation failed', details, 'VALIDATION_ERROR'));
  }
  next();
}

module.exports = validate;
