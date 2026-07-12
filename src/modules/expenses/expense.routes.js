const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const controller = require('./expense.controller');

router.use(authenticate);

router.get('/', controller.list);

router.post(
  '/',
  requireRole('ADMIN', 'FLEET_MANAGER'),
  [body('vehicleId').isUUID(), body('type').isString().notEmpty(), body('amount').isFloat({ gt: 0 })],
  validate,
  controller.create
);

module.exports = router;
