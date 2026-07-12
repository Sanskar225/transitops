const prisma = require('../../config/db');
const ApiError = require('../../utils/apiError');
const { recordAudit } = require('../audit/audit.service');
const { emitEvent } = require('../../sockets');
const { optimisticUpdate } = require('../../utils/txLock');

async function createDriver(data, userId) {
  const driver = await prisma.driver.create({
    data: {
      name: data.name,
      licenseNumber: data.licenseNumber,
      licenseCategory: data.licenseCategory,
      licenseExpiryDate: new Date(data.licenseExpiryDate),
      contactNumber: data.contactNumber,
      safetyScore: data.safetyScore ?? 80,
      status: 'AVAILABLE',
    },
  });
  await recordAudit(prisma, { userId, action: 'CREATE', entity: 'Driver', entityId: driver.id, newValue: driver });
  emitEvent('driver.updated', { driver });
  return driver;
}

async function listDrivers({ status, assignable, page = 1, limit = 20 }) {
  const where = {};
  if (status) where.status = status;
  if (assignable === 'true') {
    // Mandatory rule: expired-license or Suspended drivers cannot be assigned.
    where.status = 'AVAILABLE';
    where.licenseExpiryDate = { gt: new Date() };
  }
  const [items, total] = await Promise.all([
    prisma.driver.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.driver.count({ where }),
  ]);
  return { items, total, page, limit };
}

async function getDriver(id) {
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) throw ApiError.notFound('Driver not found', { id }, 'DRIVER_NOT_FOUND');
  return driver;
}

async function updateDriver(id, data, expectedVersion, userId) {
  const before = await getDriver(id);
  const patch = { ...data };
  if (patch.licenseExpiryDate) patch.licenseExpiryDate = new Date(patch.licenseExpiryDate);
  await optimisticUpdate(prisma, 'driver', id, expectedVersion, patch);
  const after = await getDriver(id);
  await recordAudit(prisma, { userId, action: 'UPDATE', entity: 'Driver', entityId: id, oldValue: before, newValue: after });
  emitEvent('driver.updated', { driver: after });
  return after;
}

async function setSuspended(id, suspended, userId) {
  const before = await getDriver(id);
  if (before.status === 'ON_TRIP' && suspended) {
    throw ApiError.conflict('Cannot suspend a driver currently on a trip', { id }, 'DRIVER_ON_TRIP');
  }
  const after = await prisma.driver.update({
    where: { id },
    data: { status: suspended ? 'SUSPENDED' : 'AVAILABLE', version: { increment: 1 } },
  });
  await recordAudit(prisma, { userId, action: 'UPDATE', entity: 'Driver', entityId: id, oldValue: before, newValue: after });
  emitEvent('driver.updated', { driver: after });
  return after;
}

module.exports = { createDriver, listDrivers, getDriver, updateDriver, setSuspended };
