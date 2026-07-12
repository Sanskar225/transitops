const router = require('express').Router();

router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/users', require('../modules/users/user.routes'));
router.use('/vehicles', require('../modules/vehicles/vehicle.routes'));
router.use('/drivers', require('../modules/drivers/driver.routes'));
router.use('/trips', require('../modules/trips/trip.routes'));
router.use('/maintenance', require('../modules/maintenance/maintenance.routes'));
router.use('/fuel-logs', require('../modules/fuel/fuel.routes'));
router.use('/expenses', require('../modules/expenses/expense.routes'));
router.use('/dispatch', require('../modules/dispatch/dispatch.routes'));
router.use('/analytics', require('../modules/analytics/analytics.routes'));
router.use('/audit-logs', require('../modules/audit/audit.routes'));

router.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok', ts: new Date().toISOString() } }));

module.exports = router;
