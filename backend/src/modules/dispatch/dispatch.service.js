const prisma = require('../../config/db');
const ApiError = require('../../utils/apiError');

/**
 * AI DISPATCH RECOMMENDATION
 * ===========================
 * A transparent, explainable weighted-scoring engine (not a black-box ML
 * model) that ranks currently-eligible vehicles and drivers for a proposed
 * trip. This keeps the "AI" auditable and deterministic, which matters for
 * an operations platform where dispatchers need to trust/justify a
 * recommendation. It only ever considers vehicles/drivers that already pass
 * every mandatory business rule (status, license, capacity) - it recommends
 * among *valid* options, it never overrides a hard business rule.
 *
 * Vehicle score factors:
 *  - Capacity fit: prefers vehicles whose maxLoadCapacityKg is closest to
 *    (but >=) the cargo weight, minimizing wasted capacity.
 *  - Maintenance recency: prefers vehicles further from their next predicted
 *    service interval (lower predictive-maintenance risk).
 *  - Utilization balance: prefers less-recently-used vehicles to spread wear
 *    evenly across the fleet.
 *
 * Driver score factors:
 *  - Safety score (highest weight).
 *  - License headroom: prefers drivers whose license isn't expiring soon.
 *  - Idle time: prefers drivers who've been idle longest (fair rotation).
 */

async function recommendDispatch({ cargoWeightKg, source, destination }) {
  const [vehicles, drivers] = await Promise.all([
    prisma.vehicle.findMany({
      where: { status: 'AVAILABLE', maxLoadCapacityKg: { gte: cargoWeightKg } },
    }),
    prisma.driver.findMany({
      where: { status: 'AVAILABLE', licenseExpiryDate: { gt: new Date() } },
    }),
  ]);

  if (vehicles.length === 0) {
    throw ApiError.unprocessable('No available vehicle meets the cargo capacity requirement', { cargoWeightKg }, 'NO_ELIGIBLE_VEHICLE');
  }
  if (drivers.length === 0) {
    throw ApiError.unprocessable('No available, license-valid driver found', null, 'NO_ELIGIBLE_DRIVER');
  }

  // Recent trip end times, to compute idle time / utilization balance without N+1 queries.
  const recentTrips = await prisma.trip.findMany({
    where: { status: 'COMPLETED', OR: [{ vehicleId: { in: vehicles.map((v) => v.id) } }, { driverId: { in: drivers.map((d) => d.id) } }] },
    orderBy: { completedAt: 'desc' },
    select: { vehicleId: true, driverId: true, completedAt: true },
  });
  const lastUsedVehicle = new Map();
  const lastUsedDriver = new Map();
  for (const t of recentTrips) {
    if (!lastUsedVehicle.has(t.vehicleId)) lastUsedVehicle.set(t.vehicleId, t.completedAt);
    if (!lastUsedDriver.has(t.driverId)) lastUsedDriver.set(t.driverId, t.completedAt);
  }

  const now = Date.now();

  const scoredVehicles = vehicles.map((v) => {
    const wastedCapacity = v.maxLoadCapacityKg - cargoWeightKg;
    const capacityFitScore = 100 - Math.min(100, (wastedCapacity / Math.max(v.maxLoadCapacityKg, 1)) * 100);
    const distanceSinceService = v.currentOdometerKm - v.odometerAtLastSvcKm;
    const maintenanceRiskRatio = Math.min(1, distanceSinceService / Math.max(v.serviceIntervalKm, 1));
    const maintenanceScore = (1 - maintenanceRiskRatio) * 100;
    const lastUsed = lastUsedVehicle.get(v.id);
    const idleDays = lastUsed ? (now - new Date(lastUsed).getTime()) / 86400000 : 999;
    const utilizationScore = Math.min(100, idleDays * 5);

    const totalScore = capacityFitScore * 0.5 + maintenanceScore * 0.3 + utilizationScore * 0.2;
    return {
      vehicleId: v.id,
      registrationNumber: v.registrationNumber,
      score: Math.round(totalScore * 100) / 100,
      breakdown: {
        capacityFitScore: round1(capacityFitScore),
        maintenanceScore: round1(maintenanceScore),
        utilizationScore: round1(utilizationScore),
        distanceSinceServiceKm: round1(distanceSinceService),
      },
    };
  }).sort((a, b) => b.score - a.score);

  const scoredDrivers = drivers.map((d) => {
    const daysToExpiry = (new Date(d.licenseExpiryDate).getTime() - now) / 86400000;
    const licenseHeadroomScore = Math.min(100, Math.max(0, (daysToExpiry / 180) * 100));
    const lastUsed = lastUsedDriver.get(d.id);
    const idleDays = lastUsed ? (now - new Date(lastUsed).getTime()) / 86400000 : 999;
    const idleScore = Math.min(100, idleDays * 5);

    const totalScore = d.safetyScore * 0.6 + licenseHeadroomScore * 0.2 + idleScore * 0.2;
    return {
      driverId: d.id,
      name: d.name,
      score: Math.round(totalScore * 100) / 100,
      breakdown: {
        safetyScore: d.safetyScore,
        licenseHeadroomScore: round1(licenseHeadroomScore),
        idleScore: round1(idleScore),
        daysToLicenseExpiry: Math.round(daysToExpiry),
      },
    };
  }).sort((a, b) => b.score - a.score);

  return {
    source, destination, cargoWeightKg,
    recommendedVehicle: scoredVehicles[0],
    recommendedDriver: scoredDrivers[0],
    alternativeVehicles: scoredVehicles.slice(1, 4),
    alternativeDrivers: scoredDrivers.slice(1, 4),
  };
}

function round1(n) { return Math.round(n * 10) / 10; }

module.exports = { recommendDispatch };
