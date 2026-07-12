const prisma = require('../../config/db');
const ApiError = require('../../utils/apiError');
const { lockVehicle, txOptions } = require('../../utils/txLock');
const { recordAudit } = require('../audit/audit.service');
const { emitEvent } = require('../../sockets');
const { enqueueNotification } = require('../../queues/notificationQueue');

/**
 * Opening a maintenance record addresses rule #4 (Maintenance vs Dispatch
 * race): the vehicle row is locked FOR UPDATE and its status re-checked
 * before flipping it to IN_SHOP, so a concurrent dispatch attempting to lock
 * the same row will simply wait, then see IN_SHOP and correctly fail.
 */
async function openMaintenance(data, userId) {
  const result = await prisma.$transaction(async (tx) => {
    const vehicle = await lockVehicle(tx, data.vehicleId);

    if (vehicle.status === 'ON_TRIP') {
      throw ApiError.conflict('Cannot open maintenance while vehicle is on a trip', { vehicleId: vehicle.id }, 'VEHICLE_ON_TRIP');
    }
    if (vehicle.status === 'RETIRED') {
      throw ApiError.conflict('Cannot open maintenance on a retired vehicle', { vehicleId: vehicle.id }, 'VEHICLE_RETIRED');
    }
    if (vehicle.status === 'IN_SHOP') {
      throw ApiError.conflict('Vehicle already has an active maintenance record', { vehicleId: vehicle.id }, 'VEHICLE_ALREADY_IN_SHOP');
    }

    const log = await tx.maintenanceLog.create({
      data: {
        vehicleId: vehicle.id,
        description: data.description,
        cost: data.cost || 0,
        status: 'OPEN',
        odometerAtServiceKm: vehicle.currentOdometerKm,
      },
    });

    const updatedVehicle = await tx.vehicle.update({
      where: { id: vehicle.id },
      data: { status: 'IN_SHOP', odometerAtLastSvcKm: vehicle.currentOdometerKm, version: { increment: 1 } },
    });

    await recordAudit(tx, { userId, action: 'CREATE', entity: 'MaintenanceLog', entityId: log.id, newValue: log });

    return { log, vehicle: updatedVehicle };
  }, txOptions());

  emitEvent('vehicle.updated', { vehicle: result.vehicle });
  emitEvent('maintenance.updated', { maintenance: result.log });
  return result.log;
}

/** Closing maintenance restores vehicle to Available UNLESS it has been retired meanwhile. */
async function closeMaintenance(id, userId) {
  const result = await prisma.$transaction(async (tx) => {
    const logRows = await tx.$queryRaw`SELECT * FROM "MaintenanceLog" WHERE id = ${id} FOR UPDATE`;
    const log = logRows[0];
    if (!log) throw ApiError.notFound('Maintenance record not found', { id }, 'MAINTENANCE_NOT_FOUND');
    if (log.status === 'CLOSED') return { log, vehicle: null, alreadyClosed: true };

    const vehicle = await lockVehicle(tx, log.vehicleId);
    const now = new Date();

    const updatedLog = await tx.maintenanceLog.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: now, version: { increment: 1 } },
    });

    let updatedVehicle = vehicle;
    if (vehicle.status !== 'RETIRED') {
      updatedVehicle = await tx.vehicle.update({
        where: { id: vehicle.id },
        data: { status: 'AVAILABLE', version: { increment: 1 } },
      });
    }

    await recordAudit(tx, { userId, action: 'UPDATE', entity: 'MaintenanceLog', entityId: id, oldValue: log, newValue: updatedLog });

    return { log: updatedLog, vehicle: updatedVehicle };
  }, txOptions());

  if (!result.alreadyClosed) {
    emitEvent('vehicle.updated', { vehicle: result.vehicle });
    emitEvent('maintenance.updated', { maintenance: result.log });
    enqueueNotification({
      type: 'SYSTEM',
      title: 'Maintenance closed',
      message: `Maintenance record ${result.log.id} closed for vehicle ${result.vehicle ? result.vehicle.registrationNumber : ''}.`,
      batchKey: 'maintenance-events-digest',
    });
  }
  return result.log;
}

async function listMaintenance({ vehicleId, status, page = 1, limit = 20 }) {
  const where = {};
  if (vehicleId) where.vehicleId = vehicleId;
  if (status) where.status = status;
  const [items, total] = await Promise.all([
    prisma.maintenanceLog.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.maintenanceLog.count({ where }),
  ]);
  return { items, total, page, limit };
}

module.exports = { openMaintenance, closeMaintenance, listMaintenance };
