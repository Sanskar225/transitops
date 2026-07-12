const ApiError = require('./apiError');

/**
 * CONCURRENCY STRATEGY
 * ====================
 * 1. Pessimistic row locks (`SELECT ... FOR UPDATE`) are used inside a single
 *    Prisma interactive transaction for every state-changing workflow that
 *    touches Vehicle/Driver/Trip (dispatch, complete, cancel, maintenance
 *    open/close). This guarantees only one transaction can read+modify a
 *    given row at a time; competing transactions block until the first commits
 *    or rolls back, then re-read fresh state.
 * 2. Lock ordering is ALWAYS Vehicle -> Driver -> Trip, never the reverse, in
 *    every code path in this project. This prevents circular-wait deadlocks
 *    (see docs/CONCURRENCY.md, rule #14).
 * 3. Optimistic locking (`version` column) additionally guards simple field
 *    edits (e.g. editing a fuel log cost, updating vehicle capacity) that
 *    aren't part of a multi-row workflow, so "last write wins" silent data
 *    loss (the "Lost Update" problem) becomes a detectable 409 conflict.
 * 4. All multi-table writes for one business event (dispatch, complete a
 *    trip, close maintenance) happen in ONE transaction, so a failure rolls
 *    back everything instead of leaving Vehicle/Driver/Trip inconsistent.
 * 5. Transactions use isolation level `Serializable` is overkill here given
 *    explicit row locks are used; we use the default `ReadCommitted` combined
 *    with FOR UPDATE, which Postgres handles efficiently for this workload.
 */

const TX_TIMEOUT_MS = parseInt(process.env.TX_TIMEOUT_MS || '10000', 10);
const TX_MAX_WAIT_MS = parseInt(process.env.TX_MAX_WAIT_MS || '5000', 10);

function txOptions(overrides = {}) {
  return { timeout: TX_TIMEOUT_MS, maxWait: TX_MAX_WAIT_MS, ...overrides };
}

/** Lock and return a single Vehicle row for update. Throws 404 if missing. */
async function lockVehicle(tx, vehicleId) {
  const rows = await tx.$queryRaw`SELECT * FROM "Vehicle" WHERE id = ${vehicleId} FOR UPDATE`;
  if (!rows || rows.length === 0) throw ApiError.notFound('Vehicle not found', { vehicleId }, 'VEHICLE_NOT_FOUND');
  return rows[0];
}

/** Lock and return a single Driver row for update. Throws 404 if missing. */
async function lockDriver(tx, driverId) {
  const rows = await tx.$queryRaw`SELECT * FROM "Driver" WHERE id = ${driverId} FOR UPDATE`;
  if (!rows || rows.length === 0) throw ApiError.notFound('Driver not found', { driverId }, 'DRIVER_NOT_FOUND');
  return rows[0];
}

/** Lock and return a single Trip row for update. Throws 404 if missing. */
async function lockTrip(tx, tripId) {
  const rows = await tx.$queryRaw`SELECT * FROM "Trip" WHERE id = ${tripId} FOR UPDATE`;
  if (!rows || rows.length === 0) throw ApiError.notFound('Trip not found', { tripId }, 'TRIP_NOT_FOUND');
  return rows[0];
}

/**
 * Locks Vehicle then Driver in that fixed order (see rule #14) and returns both.
 * Always use this helper (rather than locking them separately) for any workflow
 * needing both, so the ordering invariant can never accidentally be violated.
 */
async function lockVehicleAndDriver(tx, vehicleId, driverId) {
  const vehicle = await lockVehicle(tx, vehicleId);
  const driver = await lockDriver(tx, driverId);
  return { vehicle, driver };
}

/**
 * Optimistic-locking update helper: updates a row only if `version` still
 * matches what the caller last read, atomically bumping version. Returns the
 * number of rows affected; caller should treat 0 as a 409 conflict.
 */
async function optimisticUpdate(tx, model, id, expectedVersion, data) {
  const result = await tx[model].updateMany({
    where: { id, version: expectedVersion },
    data: { ...data, version: { increment: 1 } },
  });
  if (result.count === 0) {
    throw ApiError.conflict(
      `${model} was modified by another request. Please refresh and retry.`,
      { id, expectedVersion },
      'OPTIMISTIC_LOCK_CONFLICT'
    );
  }
  return result;
}

module.exports = {
  txOptions,
  lockVehicle,
  lockDriver,
  lockTrip,
  lockVehicleAndDriver,
  optimisticUpdate,
};
