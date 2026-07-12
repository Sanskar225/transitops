const router = require('express').Router();
const { body, param } = require('express-validator');
const prisma = require('../../config/db');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const { sanitizeUser } = require('../auth/auth.service');
const { recordAudit } = require('../audit/audit.service');

router.use(authenticate, requireRole('ADMIN'));

router.get('/', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  ok(res, users.map(sanitizeUser));
}));

router.patch(
  '/:id/role',
  [param('id').isUUID(), body('role').isIn(['ADMIN', 'FLEET_MANAGER', 'DRIVER', 'VIEWER'])],
  validate,
  asyncHandler(async (req, res) => {
    const before = await prisma.user.findUnique({ where: { id: req.params.id } });
    const after = await prisma.user.update({ where: { id: req.params.id }, data: { role: req.body.role } });
    await recordAudit(prisma, { userId: req.user.id, action: 'UPDATE', entity: 'User', entityId: after.id, oldValue: { role: before.role }, newValue: { role: after.role } });
    ok(res, sanitizeUser(after));
  })
);

router.patch(
  '/:id/active',
  [param('id').isUUID(), body('isActive').isBoolean()],
  validate,
  asyncHandler(async (req, res) => {
    const after = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: req.body.isActive } });
    // Revoke all refresh tokens on deactivation so access is cut immediately.
    if (!req.body.isActive) await prisma.refreshToken.updateMany({ where: { userId: after.id }, data: { revoked: true } });
    ok(res, sanitizeUser(after));
  })
);

module.exports = router;
