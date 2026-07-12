const prisma = require('../../config/db');
const ApiError = require('../../utils/apiError');
const { recordAudit } = require('../audit/audit.service');
const { emitEvent } = require('../../sockets');
const { optimisticUpdate } = require('../../utils/txLock');

async function createVehicle(data, userId) {
  // Unique registration number is enforced at the DB level (unique index);
  // Prisma P2002 is translated into a friendly 409 by the global error handler.
  const vehicle = await prisma.vehicle.create({
    data: {
      registrationNumber: data.registrationNumber,
      make: data.make,
      model: data.model,
      year: data.year,
      maxLoadCapacityKg: data.maxLoadCapacityKg,
      acquisitionCost: data.acquisitionCost || 0,
      currentOdometerKm: data.currentOdometerKm || 0,
      odometerAtLastSvcKm: data.currentOdometerKm || 0,
      serviceIntervalKm: data.serviceIntervalKm || 5000,
      status: 'AVAILABLE',
    },
  });
  await recordAudit(prisma, { userId, action: 'CREATE', entity: 'Vehicle', entityId: vehicle.id, newValue: vehicle });
  emitEvent('vehicle.updated', { vehicle });
  return vehicle;
}

async function listVehicles({ status, dispatchable, page = 1, limit = 20 }) {
  const where = {};
  if (status) where.status = status;
  // Mandatory rule: Retired or In Shop vehicles must never appear in the dispatch pool.
  if (dispatchable === 'true') where.status = 'AVAILABLE';

  const [items, total] = await Promise.all([
    prisma.vehicle.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.vehicle.count({ where }),
  ]);
  return { items, total, page, limit };
}

async function getVehicle(id) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) throw ApiError.notFound('Vehicle not found', { id }, 'VEHICLE_NOT_FOUND');
  return vehicle;
}

async function updateVehicle(id, data, expectedVersion, userId) {
  const before = await getVehicle(id);
  await optimisticUpdate(prisma, 'vehicle', id, expectedVersion, data);
  const after = await getVehicle(id);
  await recordAudit(prisma, { userId, action: 'UPDATE', entity: 'Vehicle', entityId: id, oldValue: before, newValue: after });
  emitEvent('vehicle.updated', { vehicle: after });
  return after;
}

async function retireVehicle(id, userId) {
  const before = await getVehicle(id);
  if (before.status === 'ON_TRIP') {
    throw ApiError.conflict('Cannot retire a vehicle that is currently on a trip', { id }, 'VEHICLE_ON_TRIP');
  }
  const after = await prisma.vehicle.update({ where: { id }, data: { status: 'RETIRED', version: { increment: 1 } } });
  await recordAudit(prisma, { userId, action: 'UPDATE', entity: 'Vehicle', entityId: id, oldValue: before, newValue: after });
  emitEvent('vehicle.updated', { vehicle: after });
  return after;
}

module.exports = { createVehicle, listVehicles, getVehicle, updateVehicle, retireVehicle };
