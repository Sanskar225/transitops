const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const idempotent = require('../../middleware/idempotency');
const controller = require('./maintenance.controller');

router.use(authenticate);

router.get('/', controller.list);

router.post(
  '/',
  requireRole('ADMIN', 'FLEET_MANAGER'),
  idempotent(),
  [body('vehicleId').isUUID(), body('description').isString().notEmpty(), body('cost').optional().isFloat({ min: 0 })],
  validate,
  controller.open
);

router.post('/:id/close', requireRole('ADMIN', 'FLEET_MANAGER'), idempotent(), param('id').isUUID(), validate, controller.close);

module.exports = router;
