const router = require('express').Router();
const prisma = require('../../config/db');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');

router.use(authenticate, requireRole('ADMIN', 'FLEET_MANAGER'));

// GET /api/audit-logs?entity=Vehicle&entityId=...&page=1&limit=20
router.get('/', asyncHandler(async (req, res) => {
  const { entity, entityId } = req.query;
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);

  const where = {};
  if (entity) where.entity = entity;
  if (entityId) where.entityId = entityId;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  ok(res, items, { page, limit, total, totalPages: Math.ceil(total / limit) });
}));

module.exports = router;
