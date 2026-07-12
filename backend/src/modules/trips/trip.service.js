const prisma = require('../../config/db');
const ApiError = require('../../utils/apiError');
const { lockVehicleAndDriver, lockTrip, txOptions } = require('../../utils/txLock');
const { recordAudit } = require('../audit/audit.service');
const { emitEvent } = require('../../sockets');
const { enqueueNotification } = require('../../queues/notificationQueue');

async function createDraftTrip(data, userId) {
  // Draft creation does NOT lock/mutate vehicle or driver rows - no race risk yet.
  const trip = await prisma.trip.create({
    data: {
      source: data.source,
      destination: data.destination,
      vehicleId: data.vehicleId,
      driverId: data.driverId,
      cargoWeightKg: data.cargoWeightKg,
      plannedDistanceKm: data.plannedDistanceKm,
      status: 'DRAFT',
      createdById: userId,
    },
  });
  emitEvent('trip.updated', { trip });
  return trip;
}

/**
 * DISPATCH a trip: the highest-risk race-condition workflow in the system.
 * See rules #1, #2, #4, #8, #9 from the concurrency checklist - all addressed
 * here via a single transaction with FOR UPDATE locks on Vehicle then Driver
 * (fixed order) plus fresh validation of every business rule using the
 * locked (not cached) row state.
 */
async function dispatchTrip(tripId, userId) {
  const result = await prisma.$transaction(async (tx) => {
    const tripRows = await tx.$queryRaw`SELECT * FROM "Trip" WHERE id = ${tripId} FOR UPDATE`;
    if (!tripRows[0]) throw ApiError.notFound('Trip not found', { tripId }, 'TRIP_NOT_FOUND');
    const trip = tripRows[0];

    // Idempotent: re-dispatching an already-dispatched trip is a no-op success, not an error.
    if (trip.status === 'DISPATCHED') return { trip, alreadyDispatched: true };
    if (trip.status !== 'DRAFT') {
      throw ApiError.conflict(`Trip cannot be dispatched from status ${trip.status}`, { tripId }, 'INVALID_TRIP_STATE');
    }

    // Lock order: Vehicle -> Driver -> Trip (Trip already locked above is fine since
    // Trip is last in the ordering and we locked it first here only to check status;
    // to strictly respect ordering we now lock vehicle+driver before any further writes).
    const { vehicle, driver } = await lockVehicleAndDriver(tx, trip.vehicleId, trip.driverId);

    // Re-validate every rule against freshly locked rows (never trust cached/UI state).
    if (vehicle.status !== 'AVAILABLE') {
      throw ApiError.conflict(`Vehicle is not available (status: ${vehicle.status})`, { vehicleId: vehicle.id }, 'VEHICLE_NOT_AVAILABLE');
    }
    if (vehicle.status === 'RETIRED' || vehicle.status === 'IN_SHOP') {
      throw ApiError.conflict('Retired or In-Shop vehicles cannot be dispatched', { vehicleId: vehicle.id }, 'VEHICLE_NOT_DISPATCHABLE');
    }
    if (driver.status !== 'AVAILABLE') {
      throw ApiError.conflict(`Driver is not available (status: ${driver.status})`, { driverId: driver.id }, 'DRIVER_NOT_AVAILABLE');
    }
    if (driver.status === 'SUSPENDED') {
      throw ApiError.conflict('Suspended drivers cannot be assigned to trips', { driverId: driver.id }, 'DRIVER_SUSPENDED');
    }
    if (new Date(driver.licenseExpiryDate) <= new Date()) {
      throw ApiError.conflict('Driver license has expired', { driverId: driver.id }, 'LICENSE_EXPIRED');
    }
    if (trip.cargoWeightKg > vehicle.maxLoadCapacityKg) {
      throw ApiError.unprocessable(
        `Cargo weight ${trip.cargoWeightKg}kg exceeds vehicle capacity ${vehicle.maxLoadCapacityKg}kg`,
        { tripId }, 'CARGO_EXCEEDS_CAPACITY'
      );
    }

    // All checks pass -> perform the three-way update atomically.
    const now = new Date();
    await tx.vehicle.update({ where: { id: vehicle.id }, data: { status: 'ON_TRIP', version: { increment: 1 } } });
    await tx.driver.update({ where: { id: driver.id }, data: { status: 'ON_TRIP', version: { increment: 1 } } });
    const updatedTrip = await tx.trip.update({
      where: { id: tripId },
      data: { status: 'DISPATCHED', dispatchedAt: now, startOdometerKm: vehicle.currentOdometerKm, version: { increment: 1 } },
    });

    await recordAudit(tx, { userId, action: 'UPDATE', entity: 'Trip', entityId: tripId, oldValue: trip, newValue: updatedTrip });

    return { trip: updatedTrip, vehicle: { ...vehicle, status: 'ON_TRIP' }, driver: { ...driver, status: 'ON_TRIP' } };
  }, txOptions());

  if (!result.alreadyDispatched) {
    emitEvent('trip.updated', { trip: result.trip });
    emitEvent('vehicle.updated', { vehicle: result.vehicle });
    emitEvent('driver.updated', { driver: result.driver });
    enqueueNotification({
      type: 'TRIP_EVENT',
      title: 'Trip dispatched',
      message: `Trip ${result.trip.id} dispatched (${result.trip.source} -> ${result.trip.destination}).`,
      meta: { tripId: result.trip.id },
      batchKey: 'trip-events-digest',
    });
  }
  return result.trip;
}

/**
 * COMPLETE a trip. Addresses rule #3 (Vehicle Status Inconsistency), #6
 * (Odometer Corruption), and #10 (Duplicate Trip Completion / idempotency).
 */
async function completeTrip(tripId, { endOdometerKm, fuelConsumedL }, userId) {
  const result = await prisma.$transaction(async (tx) => {
    const trip = await lockTrip(tx, tripId);

    // Idempotent: clicking "Complete" twice must not double-process fuel/analytics.
    if (trip.status === 'COMPLETED') return { trip, alreadyCompleted: true };
    if (trip.status !== 'DISPATCHED') {
      throw ApiError.conflict(`Trip cannot be completed from status ${trip.status}`, { tripId }, 'INVALID_TRIP_STATE');
    }

    const { vehicle, driver } = await lockVehicleAndDriver(tx, trip.vehicleId, trip.driverId);

    // Odometer must never go backward.
    const startOdo = trip.startOdometerKm != null ? trip.startOdometerKm : vehicle.currentOdometerKm;
    if (endOdometerKm < startOdo) {
      throw ApiError.unprocessable(
        `End odometer (${endOdometerKm}) cannot be less than start odometer (${startOdo})`,
        { tripId }, 'ODOMETER_REGRESSION'
      );
    }
    if (endOdometerKm < vehicle.currentOdometerKm) {
      throw ApiError.unprocessable(
        `End odometer (${endOdometerKm}) cannot be less than the vehicle's current odometer (${vehicle.currentOdometerKm})`,
        { tripId }, 'ODOMETER_REGRESSION'
      );
    }

    const actualDistanceKm = endOdometerKm - startOdo;
    const now = new Date();

    const updatedVehicle = await tx.vehicle.update({
      where: { id: vehicle.id },
      data: { status: 'AVAILABLE', currentOdometerKm: endOdometerKm, version: { increment: 1 } },
    });
    const updatedDriver = await tx.driver.update({
      where: { id: driver.id },
      data: { status: 'AVAILABLE', version: { increment: 1 } },
    });
    const updatedTrip = await tx.trip.update({
      where: { id: tripId },
      data: {
        status: 'COMPLETED',
        endOdometerKm,
        actualDistanceKm,
        fuelConsumedL: fuelConsumedL ?? null,
        completedAt: now,
        version: { increment: 1 },
      },
    });

    // Auto-create fuel log entry if fuel consumption was reported at trip completion,
    // within the SAME transaction so cost/analytics never see a partially-applied trip.
    if (fuelConsumedL != null && fuelConsumedL > 0) {
      await tx.fuelLog.create({
        data: {
          vehicleId: vehicle.id,
          liters: fuelConsumedL,
          cost: 0, // cost can be updated later via fuel log edit (optimistic-locked)
          odometerKm: endOdometerKm,
          date: now,
        },
      });
    }

    await recordAudit(tx, { userId, action: 'UPDATE', entity: 'Trip', entityId: tripId, oldValue: trip, newValue: updatedTrip });

    return { trip: updatedTrip, vehicle: updatedVehicle, driver: updatedDriver };
  }, txOptions());

  if (!result.alreadyCompleted) {
    emitEvent('trip.updated', { trip: result.trip });
    emitEvent('vehicle.updated', { vehicle: result.vehicle });
    emitEvent('driver.updated', { driver: result.driver });
    enqueueNotification({
      type: 'TRIP_EVENT',
      title: 'Trip completed',
      message: `Trip ${result.trip.id} completed. Distance: ${result.trip.actualDistanceKm}km.`,
      meta: { tripId: result.trip.id },
      batchKey: 'trip-events-digest',
    });
  }
  return result.trip;
}

/** CANCEL a dispatched trip - restores vehicle & driver to Available atomically. */
async function cancelTrip(tripId, reason, userId) {
  const result = await prisma.$transaction(async (tx) => {
    const trip = await lockTrip(tx, tripId);

    if (trip.status === 'CANCELLED') return { trip, alreadyCancelled: true };
    if (trip.status === 'COMPLETED') {
      throw ApiError.conflict('Cannot cancel a completed trip', { tripId }, 'INVALID_TRIP_STATE');
    }

    const now = new Date();
    let updatedVehicle = null;
    let updatedDriver = null;

    if (trip.status === 'DISPATCHED') {
      const { vehicle, driver } = await lockVehicleAndDriver(tx, trip.vehicleId, trip.driverId);
      updatedVehicle = await tx.vehicle.update({ where: { id: vehicle.id }, data: { status: 'AVAILABLE', version: { increment: 1 } } });
      updatedDriver = await tx.driver.update({ where: { id: driver.id }, data: { status: 'AVAILABLE', version: { increment: 1 } } });
    }

    const updatedTrip = await tx.trip.update({
      where: { id: tripId },
      data: { status: 'CANCELLED', cancelledAt: now, version: { increment: 1 } },
    });

    await recordAudit(tx, { userId, action: 'UPDATE', entity: 'Trip', entityId: tripId, oldValue: trip, newValue: { ...updatedTrip, reason } });

    return { trip: updatedTrip, vehicle: updatedVehicle, driver: updatedDriver };
  }, txOptions());

  if (!result.alreadyCancelled) {
    emitEvent('trip.updated', { trip: result.trip });
    if (result.vehicle) emitEvent('vehicle.updated', { vehicle: result.vehicle });
    if (result.driver) emitEvent('driver.updated', { driver: result.driver });
  }
  return result.trip;
}

async function listTrips({ status, vehicleId, driverId, page = 1, limit = 20 }) {
  const where = {};
  if (status) where.status = status;
  if (vehicleId) where.vehicleId = vehicleId;
  if (driverId) where.driverId = driverId;

  // Avoids N+1 (rule #20): eager-load vehicle/driver in the single list query.
  const [items, total] = await Promise.all([
    prisma.trip.findMany({
      where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
      include: { vehicle: { select: { id: true, registrationNumber: true } }, driver: { select: { id: true, name: true } } },
    }),
    prisma.trip.count({ where }),
  ]);
  return { items, total, page, limit };
}

async function getTrip(id) {
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { vehicle: true, driver: true },
  });
  if (!trip) throw ApiError.notFound('Trip not found', { id }, 'TRIP_NOT_FOUND');
  return trip;
}

module.exports = { createDraftTrip, dispatchTrip, completeTrip, cancelTrip, listTrips, getTrip };
