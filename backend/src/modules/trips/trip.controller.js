const asyncHandler = require('../../utils/asyncHandler');
const { ok, created } = require('../../utils/apiResponse');
const service = require('./trip.service');

const create = asyncHandler(async (req, res) => {
  const trip = await service.createDraftTrip(req.body, req.user.id);
  created(res, trip);
});

const list = asyncHandler(async (req, res) => {
  const { status, vehicleId, driverId, page, limit } = req.query;
  const result = await service.listTrips({ status, vehicleId, driverId, page: parseInt(page || '1', 10), limit: parseInt(limit || '20', 10) });
  ok(res, result.items, { page: result.page, limit: result.limit, total: result.total, totalPages: Math.ceil(result.total / result.limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const trip = await service.getTrip(req.params.id);
  ok(res, trip);
});

const dispatch = asyncHandler(async (req, res) => {
  const trip = await service.dispatchTrip(req.params.id, req.user.id);
  ok(res, trip);
});

const complete = asyncHandler(async (req, res) => {
  const trip = await service.completeTrip(req.params.id, req.body, req.user.id);
  ok(res, trip);
});

const cancel = asyncHandler(async (req, res) => {
  const trip = await service.cancelTrip(req.params.id, req.body.reason, req.user.id);
  ok(res, trip);
});

module.exports = { create, list, getOne, dispatch, complete, cancel };
