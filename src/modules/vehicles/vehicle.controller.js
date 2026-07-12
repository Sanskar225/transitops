const asyncHandler = require('../../utils/asyncHandler');
const { ok, created } = require('../../utils/apiResponse');
const service = require('./vehicle.service');

const create = asyncHandler(async (req, res) => {
  const vehicle = await service.createVehicle(req.body, req.user.id);
  created(res, vehicle);
});

const list = asyncHandler(async (req, res) => {
  const { status, dispatchable, page, limit } = req.query;
  const result = await service.listVehicles({
    status, dispatchable, page: parseInt(page || '1', 10), limit: parseInt(limit || '20', 10),
  });
  ok(res, result.items, { page: result.page, limit: result.limit, total: result.total, totalPages: Math.ceil(result.total / result.limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const vehicle = await service.getVehicle(req.params.id);
  ok(res, vehicle);
});

const update = asyncHandler(async (req, res) => {
  const { version, ...data } = req.body;
  const vehicle = await service.updateVehicle(req.params.id, data, version, req.user.id);
  ok(res, vehicle);
});

const retire = asyncHandler(async (req, res) => {
  const vehicle = await service.retireVehicle(req.params.id, req.user.id);
  ok(res, vehicle);
});

module.exports = { create, list, getOne, update, retire };
