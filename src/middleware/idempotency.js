const prisma = require('../config/db');
const logger = require('../config/logger');

/**
 * Optional idempotency layer driven by an `Idempotency-Key` header.
 * If the same key is replayed, the previously stored response is returned
 * instead of re-executing the handler (protects against double-submits from
 * flaky networks / double clicks, on top of the domain-level idempotency
 * already enforced by status checks in the service layer).
 */
function idempotent() {
  return async (req, res, next) => {
    const key = req.headers['idempotency-key'];
    if (!key) return next();

    try {
      const existing = await prisma.idempotencyKey.findUnique({ where: { key } });
      if (existing) {
        return res.status(existing.statusCode || 200).json(existing.responseBody);
      }
    } catch (err) {
      logger.warn({ err: err.message }, 'idempotency lookup failed, proceeding without cache');
      return next();
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      prisma.idempotencyKey
        .create({ data: { key, responseBody: body, statusCode: res.statusCode } })
        .catch((err) => logger.warn({ err: err.message }, 'failed to persist idempotency key'));
      return originalJson(body);
    };
    next();
  };
}

module.exports = idempotent;
