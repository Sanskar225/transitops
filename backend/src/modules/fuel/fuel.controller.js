const asyncHandler = require('../../utils/asyncHandler');
const { ok, created } = require('../../utils/apiResponse');
const service = require('./fuel.service');

const create = asyncHandler(async (req, res) => {
  const log = await service.createFuelLog(req.body, req.user.id);
  created(res, log);
});

const update = asyncHandler(async (req, res) => {
  const { version, ...data } = req.body;
  const log = await service.updateFuelLog(req.params.id, data, version, req.user.id);
  ok(res, log);
});

const list = asyncHandler(async (req, res) => {
  const { vehicleId, page, limit } = req.query;
  const result = await service.listFuelLogs({ vehicleId, page: parseInt(page || '1', 10), limit: parseInt(limit || '20', 10) });
  ok(res, result.items, { page: result.page, limit: result.limit, total: result.total, totalPages: Math.ceil(result.total / result.limit) });
});

module.exports = { create, update, list };
