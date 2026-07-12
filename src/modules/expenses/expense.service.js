const prisma = require('../../config/db');
const ApiError = require('../../utils/apiError');
const { recordAudit } = require('../audit/audit.service');
const { emitEvent } = require('../../sockets');

async function createExpense(data, userId) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) throw ApiError.notFound('Vehicle not found', { vehicleId: data.vehicleId }, 'VEHICLE_NOT_FOUND');

  const expense = await prisma.expense.create({
    data: {
      vehicleId: data.vehicleId,
      type: data.type,
      amount: data.amount,
      date: data.date ? new Date(data.date) : new Date(),
      notes: data.notes,
    },
  });

  await recordAudit(prisma, { userId, action: 'CREATE', entity: 'Expense', entityId: expense.id, newValue: expense });
  emitEvent('expense.updated', { expense });
  return expense;
}

async function listExpenses({ vehicleId, page = 1, limit = 20 }) {
  const where = {};
  if (vehicleId) where.vehicleId = vehicleId;
  const [items, total] = await Promise.all([
    prisma.expense.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { date: 'desc' } }),
    prisma.expense.count({ where }),
  ]);
  return { items, total, page, limit };
}

module.exports = { createExpense, listExpenses };
