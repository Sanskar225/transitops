const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const controller = require('./fuel.controller');

router.use(authenticate);

router.get('/', controller.list);

router.post(
  '/',
  requireRole('ADMIN', 'FLEET_MANAGER'),
  [body('vehicleId').isUUID(), body('liters').isFloat({ gt: 0 }), body('cost').isFloat({ min: 0 })],
  validate,
  controller.create
);

router.patch(
  '/:id',
  requireRole('ADMIN', 'FLEET_MANAGER'),
  [param('id').isUUID(), body('version').isInt({ min: 0 })],
  validate,
  controller.update
);

module.exports = router;
