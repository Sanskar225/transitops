const logger = require('../config/logger');
const ApiError = require('../utils/apiError');
const { Prisma } = require('@prisma/client');

function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  // Translate known Prisma errors into clean ApiErrors instead of leaking internals.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta && err.meta.target) || [];
      error = ApiError.conflict(`Duplicate value for unique field(s): ${target.join(', ')}`, null, 'UNIQUE_CONSTRAINT');
    } else if (err.code === 'P2025') {
      error = ApiError.notFound('Record not found', null, 'NOT_FOUND');
    } else if (err.code === 'P2034' || err.code === 'P2028') {
      // Transaction write conflict / deadlock detected by Postgres -> safe to retry.
      error = ApiError.conflict('Concurrent update conflict, please retry', null, 'WRITE_CONFLICT');
    } else {
      error = ApiError.badRequest('Database request error', { code: err.code });
    }
  } else if (!(err instanceof ApiError)) {
    logger.error({ err }, 'Unhandled error');
    error = ApiError.internal(process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message);
  }

  if (error.statusCode >= 500) {
    logger.error({ err: error, path: req.originalUrl }, 'Server error');
  } else {
    logger.warn({ msg: error.message, code: error.code, path: req.originalUrl }, 'Handled error');
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message,
      code: error.code || undefined,
      details: error.details || undefined,
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
