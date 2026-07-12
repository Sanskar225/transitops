const asyncHandler = require('../../utils/asyncHandler');
const { ok, created } = require('../../utils/apiResponse');
const service = require('./expense.service');

const create = asyncHandler(async (req, res) => {
  const expense = await service.createExpense(req.body, req.user.id);
  created(res, expense);
});

const list = asyncHandler(async (req, res) => {
  const { vehicleId, page, limit } = req.query;
  const result = await service.listExpenses({ vehicleId, page: parseInt(page || '1', 10), limit: parseInt(limit || '20', 10) });
  ok(res, result.items, { page: result.page, limit: result.limit, total: result.total, totalPages: Math.ceil(result.total / result.limit) });
});

module.exports = { create, list };
