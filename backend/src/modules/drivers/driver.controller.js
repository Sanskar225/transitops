const asyncHandler = require('../../utils/asyncHandler');
const { ok, created } = require('../../utils/apiResponse');
const service = require('./driver.service');

const create = asyncHandler(async (req, res) => {
  const driver = await service.createDriver(req.body, req.user.id);
  created(res, driver);
});

const list = asyncHandler(async (req, res) => {
  const { status, assignable, page, limit } = req.query;
  const result = await service.listDrivers({ status, assignable, page: parseInt(page || '1', 10), limit: parseInt(limit || '20', 10) });
  ok(res, result.items, { page: result.page, limit: result.limit, total: result.total, totalPages: Math.ceil(result.total / result.limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const driver = await service.getDriver(req.params.id);
  ok(res, driver);
});

const update = asyncHandler(async (req, res) => {
  const { version, ...data } = req.body;
  const driver = await service.updateDriver(req.params.id, data, version, req.user.id);
  ok(res, driver);
});

const suspend = asyncHandler(async (req, res) => {
  const driver = await service.setSuspended(req.params.id, true, req.user.id);
  ok(res, driver);
});

const reinstate = asyncHandler(async (req, res) => {
  const driver = await service.setSuspended(req.params.id, false, req.user.id);
  ok(res, driver);
});

module.exports = { create, list, getOne, update, suspend, reinstate };
