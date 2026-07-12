const prisma = require('../../config/db');
const ApiError = require('../../utils/apiError');
const { recordAudit } = require('../audit/audit.service');
const { optimisticUpdate } = require('../../utils/txLock');
const { emitEvent } = require('../../sockets');

async function createFuelLog(data, userId) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) throw ApiError.notFound('Vehicle not found', { vehicleId: data.vehicleId }, 'VEHICLE_NOT_FOUND');

  if (data.odometerKm != null && data.odometerKm < vehicle.currentOdometerKm) {
    throw ApiError.unprocessable(
      `Odometer reading (${data.odometerKm}) cannot be less than vehicle's current odometer (${vehicle.currentOdometerKm})`,
      { vehicleId: vehicle.id }, 'ODOMETER_REGRESSION'
    );
  }

  const log = await prisma.fuelLog.create({
    data: {
      vehicleId: data.vehicleId,
      liters: data.liters,
      cost: data.cost,
      odometerKm: data.odometerKm,
      date: data.date ? new Date(data.date) : new Date(),
    },
  });

  if (data.odometerKm != null && data.odometerKm > vehicle.currentOdometerKm) {
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { currentOdometerKm: data.odometerKm, version: { increment: 1 } } });
  }

  await recordAudit(prisma, { userId, action: 'CREATE', entity: 'FuelLog', entityId: log.id, newValue: log });
  emitEvent('fuel.updated', { fuelLog: log });
  return log;
}

/**
 * Addresses rule #5 (Lost Update Problem): editing fuel cost requires the
 * caller to supply the `version` they last read. If another manager updated
 * it first, this throws a 409 instead of silently overwriting their change.
 */
async function updateFuelLog(id, data, expectedVersion, userId) {
  const before = await prisma.fuelLog.findUnique({ where: { id } });
  if (!before) throw ApiError.notFound('Fuel log not found', { id }, 'FUEL_LOG_NOT_FOUND');

  await optimisticUpdate(prisma, 'fuelLog', id, expectedVersion, data);
  const after = await prisma.fuelLog.findUnique({ where: { id } });
  await recordAudit(prisma, { userId, action: 'UPDATE', entity: 'FuelLog', entityId: id, oldValue: before, newValue: after });
  emitEvent('fuel.updated', { fuelLog: after });
  return after;
}

async function listFuelLogs({ vehicleId, page = 1, limit = 20 }) {
  const where = {};
  if (vehicleId) where.vehicleId = vehicleId;
  const [items, total] = await Promise.all([
    prisma.fuelLog.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { date: 'desc' } }),
    prisma.fuelLog.count({ where }),
  ]);
  return { items, total, page, limit };
}

module.exports = { createFuelLog, updateFuelLog, listFuelLogs };
