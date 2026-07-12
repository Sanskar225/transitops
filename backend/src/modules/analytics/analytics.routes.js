const router = require('express').Router();
const { Parser } = require('json2csv');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const service = require('./analytics.service');
const { checkPredictiveMaintenance } = require('../../jobs/maintenanceAlertCron');

router.use(authenticate);

router.get('/dashboard', asyncHandler(async (req, res) => {
  const [utilization, fuelEfficiency, operationalCost, idle] = await Promise.all([
    service.fleetUtilization(),
    service.fuelEfficiencyByVehicle(),
    service.operationalCostByVehicle(),
    service.idleVehicles(),
  ]);
  ok(res, { utilization, fuelEfficiency, operationalCost, idleVehicles: idle });
}));

router.get('/fleet-utilization', asyncHandler(async (req, res) => ok(res, await service.fleetUtilization())));
router.get('/fuel-efficiency', asyncHandler(async (req, res) => ok(res, await service.fuelEfficiencyByVehicle())));
router.get('/operational-cost', asyncHandler(async (req, res) => ok(res, await service.operationalCostByVehicle())));
router.get('/roi', asyncHandler(async (req, res) => ok(res, await service.vehicleROI(req.query.revenue ? JSON.parse(req.query.revenue) : {}))));
router.get('/idle-vehicles', asyncHandler(async (req, res) => ok(res, await service.idleVehicles(parseInt(req.query.days || '7', 10)))));
router.get('/cost-trends', asyncHandler(async (req, res) => ok(res, await service.costTrends(parseInt(req.query.months || '6', 10)))));
router.get('/predictive-maintenance', requireRole('ADMIN', 'FLEET_MANAGER'), asyncHandler(async (req, res) => ok(res, await checkPredictiveMaintenance())));

// CSV export of trips (consistent snapshot - rule #13)
router.get('/export/trips.csv', asyncHandler(async (req, res) => {
  const rows = await service.exportTripsSnapshot();
  const parser = new Parser({
    fields: ['id', 'status', 'source', 'destination', 'vehicle', 'driver', 'cargoWeightKg', 'plannedDistanceKm', 'actualDistanceKm', 'dispatchedAt', 'completedAt'],
  });
  const csv = parser.parse(rows);
  res.header('Content-Type', 'text/csv');
  res.attachment('trips-export.csv');
  res.send(csv);
}));

module.exports = router;
