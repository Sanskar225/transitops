const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const controller = require('./driver.controller');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', param('id').isUUID(), validate, controller.getOne);

router.post(
  '/',
  requireRole('ADMIN', 'FLEET_MANAGER'),
  [
    body('name').isString().trim().notEmpty(),
    body('licenseNumber').isString().trim().notEmpty(),
    body('licenseExpiryDate').isISO8601(),
    body('safetyScore').optional().isFloat({ min: 0, max: 100 }),
  ],
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

router.post('/:id/suspend', requireRole('ADMIN', 'FLEET_MANAGER'), param('id').isUUID(), validate, controller.suspend);
router.post('/:id/reinstate', requireRole('ADMIN', 'FLEET_MANAGER'), param('id').isUUID(), validate, controller.reinstate);

module.exports = router;
