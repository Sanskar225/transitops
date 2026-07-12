const asyncHandler = require('../../utils/asyncHandler');
const { ok, created } = require('../../utils/apiResponse');
const service = require('./maintenance.service');

const open = asyncHandler(async (req, res) => {
  const log = await service.openMaintenance(req.body, req.user.id);
  created(res, log);
});

const close = asyncHandler(async (req, res) => {
  const log = await service.closeMaintenance(req.params.id, req.user.id);
  ok(res, log);
});

const list = asyncHandler(async (req, res) => {
  const { vehicleId, status, page, limit } = req.query;
  const result = await service.listMaintenance({ vehicleId, status, page: parseInt(page || '1', 10), limit: parseInt(limit || '20', 10) });
  ok(res, result.items, { page: result.page, limit: result.limit, total: result.total, totalPages: Math.ceil(result.total / result.limit) });
});

module.exports = { open, close, list };
