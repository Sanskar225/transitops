const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const idempotent = require('../../middleware/idempotency');
const controller = require('./trip.controller');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', param('id').isUUID(), validate, controller.getOne);

router.post(
  '/',
  requireRole('ADMIN', 'FLEET_MANAGER'),
  [
    body('source').isString().notEmpty(),
    body('destination').isString().notEmpty(),
    body('vehicleId').isUUID(),
    body('driverId').isUUID(),
    body('cargoWeightKg').isFloat({ gt: 0 }),
    body('plannedDistanceKm').isFloat({ gt: 0 }),
  ],
  validate,
  controller.create
);

// Idempotency-Key header supported (double-click / flaky network safe) on top
// of the domain-level idempotency already enforced in trip.service.js.
router.post('/:id/dispatch', requireRole('ADMIN', 'FLEET_MANAGER'), idempotent(), param('id').isUUID(), validate, controller.dispatch);

router.post(
  '/:id/complete',
  requireRole('ADMIN', 'FLEET_MANAGER'),
  idempotent(),
  [param('id').isUUID(), body('endOdometerKm').isFloat({ gt: 0 }), body('fuelConsumedL').optional().isFloat({ min: 0 })],
  validate,
  controller.complete
);

router.post('/:id/cancel', requireRole('ADMIN', 'FLEET_MANAGER'), param('id').isUUID(), validate, controller.cancel);

module.exports = router;
