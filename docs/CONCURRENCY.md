# Concurrency & Race-Condition Safety Map

Every item below was a named risk. Each is mapped to exactly where it's handled in this codebase.

| # | Problem | Solution used | Where |
|---|---------|----------------|-------|
| 1 | Race condition: double dispatch of same vehicle | `SELECT ... FOR UPDATE` row lock inside one Prisma transaction; second concurrent request blocks then re-reads fresh state and fails validation | `src/utils/txLock.js` (`lockVehicle`), `src/modules/trips/trip.service.js` (`dispatchTrip`) |
| 2 | Double driver assignment | Vehicle+driver locked together in one transaction before any write; check→update→create all inside it | `dispatchTrip` in `trip.service.js` |
| 3 | Vehicle status inconsistency (trip completed but driver not freed) | Single transaction updates Trip, Vehicle, Driver together; rollback on any failure | `completeTrip` in `trip.service.js` |
| 4 | Maintenance vs Dispatch race | Vehicle row locked FOR UPDATE before flipping to `IN_SHOP`; dispatch does the same lock so the two workflows serialize on the vehicle row | `maintenance.service.js` (`openMaintenance`), `trip.service.js` (`dispatchTrip`) |
| 5 | Lost Update Problem (concurrent fuel cost edits) | Optimistic locking via `version` column; update only succeeds if version matches, else 409 | `src/utils/txLock.js` (`optimisticUpdate`), `fuel.service.js` (`updateFuelLog`) |
| 6 | Odometer corruption (goes backward) | Explicit validation `newOdometer >= oldOdometer` inside the same locked transaction as the vehicle update | `trip.service.js` (`completeTrip`), `fuel.service.js` (`createFuelLog`) |
| 7 | Duplicate registration number | DB-level `UNIQUE` constraint on `Vehicle.registrationNumber`; Prisma P2002 translated to clean 409 | `prisma/schema.prisma`, `src/middleware/errorHandler.js` |
| 8 | License expiry checked at page-load time but stale at dispatch | License re-validated against `licenseExpiryDate` inside the dispatch transaction using the freshly locked driver row, never cached UI state | `trip.service.js` (`dispatchTrip`) |
| 9 | Cargo capacity race (capacity changed after page load) | Vehicle capacity re-read from the locked row and compared to cargo weight at dispatch time, not at trip-creation time | `trip.service.js` (`dispatchTrip`) |
| 10 | Duplicate trip completion (double-click) | Domain-level idempotency: status checked first, `COMPLETED` short-circuits as a no-op; plus optional `Idempotency-Key` header cache | `trip.service.js` (`completeTrip`), `src/middleware/idempotency.js` |
| 11 | Dashboard shows stale data | Socket.IO emits `vehicle.updated` / `driver.updated` / `trip.updated` / `maintenance.updated` on every state change | `src/sockets/index.js`, emitted throughout `*.service.js` files |
| 12 | Notification spam | BullMQ delayed jobs coalesced into a digest per `batchKey` within a short window before being persisted/broadcast once | `src/queues/notificationQueue.js`, `src/queues/notificationWorker.js` |
| 13 | CSV export mid-update | Export reads all rows inside one `RepeatableRead` transaction for a consistent snapshot | `analytics.service.js` (`exportTripsSnapshot`) |
| 14 | Deadlocks from inconsistent lock order | Fixed lock order **Vehicle → Driver → Trip** enforced everywhere via the `lockVehicleAndDriver` helper; never locked in the reverse order anywhere in the codebase | `src/utils/txLock.js` |
| 15 | Clock / timezone problems | All `DateTime` columns are `timestamptz` in Postgres (UTC internally via Prisma); no local-time arithmetic performed server-side | `prisma/schema.prisma`, all service files |
| 16 | File upload race (vehicle deleted mid-upload) | Vehicles are only ever soft-retired, never hard-deleted, specifically to avoid this race; upload handler double-checks vehicle existence and cleans up orphan files in the same request if it vanished | `documents/document.controller.js` |
| 17 | Analytics performance / N+1 | Indexes on frequently filtered columns (`status`, `vehicleId`, `driverId`, etc.); dashboard KPIs cached in Redis for 45s (configurable); aggregation done via grouped `$queryRaw` for trends | `prisma/schema.prisma` (`@@index`), `analytics.service.js` |
| 18 | Audit trail | `AuditLog` table records user, action, entity, old/new value, timestamp on every create/update across modules; written inside the same transaction as the business write where applicable | `modules/audit/audit.service.js`, called from every service |
| 19 | Authorization bugs (driver deleting a vehicle) | RBAC middleware (`requireRole`) gates every mutating route; role checked server-side on every request, never trusted from the client | `src/middleware/rbac.js`, applied in every `*.routes.js` |
| 20 | N+1 queries | Prisma `include`/`select` used for eager loading on all list/dashboard endpoints instead of per-row queries | `trip.service.js` (`listTrips`), `analytics.service.js` |

## Lock ordering rule (deadlock prevention)

**Always lock in this order within a single transaction: Vehicle → Driver → Trip.**
Never write code that locks Driver before Vehicle, or Trip before Vehicle/Driver. The
helper `lockVehicleAndDriver(tx, vehicleId, driverId)` in `src/utils/txLock.js` is the
only sanctioned way to lock both, precisely so this invariant can't be violated by
accident in new code.

## Transaction timeouts

`TX_TIMEOUT_MS` / `TX_MAX_WAIT_MS` env vars bound how long a transaction may run and how
long a request may wait to acquire a connection from the pool, so a stuck lock can't hang
the whole API indefinitely — it will surface as a 5xx/409 that the client can retry.

## Testing race conditions

See `tests/dispatch.race.test.js` for an automated test that fires two concurrent
dispatch requests for the same vehicle and asserts exactly one succeeds.
