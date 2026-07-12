class ApiError extends Error {
  constructor(statusCode, message, details = null, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.code = code; // machine-readable error code, e.g. 'VEHICLE_NOT_AVAILABLE'
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg, details, code) { return new ApiError(400, msg, details, code); }
  static unauthorized(msg = 'Unauthorized', details, code) { return new ApiError(401, msg, details, code); }
  static forbidden(msg = 'Forbidden', details, code) { return new ApiError(403, msg, details, code); }
  static notFound(msg = 'Resource not found', details, code) { return new ApiError(404, msg, details, code); }
  static conflict(msg = 'Conflict', details, code) { return new ApiError(409, msg, details, code); }
  static unprocessable(msg = 'Unprocessable entity', details, code) { return new ApiError(422, msg, details, code); }
  static tooMany(msg = 'Too many requests', details, code) { return new ApiError(429, msg, details, code); }
  static internal(msg = 'Internal server error', details, code) { return new ApiError(500, msg, details, code); }
}

module.exports = ApiError;
