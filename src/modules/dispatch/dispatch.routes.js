const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const service = require('./dispatch.service');

router.use(authenticate);

// POST /api/dispatch/recommend
router.post(
  '/recommend',
  requireRole('ADMIN', 'FLEET_MANAGER'),
  [
    body('cargoWeightKg').isFloat({ gt: 0 }),
    body('source').isString().notEmpty(),
    body('destination').isString().notEmpty(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await service.recommendDispatch(req.body);
    ok(res, result);
  })
);

module.exports = router;
