const logger = require('../../config/logger');

/**
 * Writes an audit trail row. Accepts either the shared `prisma` client or a
 * transaction handle `tx` so it can participate in the same transaction as
 * the business write it's auditing (keeps audit + data change atomic).
 */
async function recordAudit(dbClient, { userId, action, entity, entityId, oldValue, newValue }) {
  try {
    await dbClient.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId: String(entityId),
        oldValue: oldValue === undefined ? null : oldValue,
        newValue: newValue === undefined ? null : newValue,
      },
    });
  } catch (err) {
    // Audit logging must never break the primary business transaction from the
    // caller's perspective when called outside a tx; log and continue.
    logger.error({ err: err.message, entity, entityId }, 'failed to write audit log');
  }
}

module.exports = { recordAudit };
