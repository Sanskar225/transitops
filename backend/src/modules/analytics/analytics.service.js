const prisma = require('../../config/db');
const redis = require('../../config/redis');
const logger = require('../../config/logger');

const CACHE_TTL_SECONDS = parseInt(process.env.DASHBOARD_CACHE_TTL || '45', 10);

async function cached(key, fn) {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit);
  } catch (err) {
    logger.warn({ err: err.message }, 'analytics cache read failed, computing fresh');
  }
  const value = await fn();
  try {
    await redis.set(key, JSON.stringify(value), 'EX', CACHE_TTL_SECONDS);
  } catch (err) {
    logger.warn({ err: err.message }, 'analytics cache write failed');
  }
  return value;
}

/** Fleet Utilization = vehicles currently On Trip / total non-retired vehicles. */
async function fleetUtilization() {
  return cached('analytics:fleet-utilization', async () => {
    const [onTrip, totalActive] = await Promise.all([
      prisma.vehicle.count({ where: { status: 'ON_TRIP' } }),
      prisma.vehicle.count({ where: { status: { not: 'RETIRED' } } }),
    ]);
    return {
      onTrip,
      totalActive,
      utilizationPct: totalActive > 0 ? round2((onTrip / totalActive) * 100) : 0,
    };
  });
}

/** Fuel Efficiency per vehicle = total distance / total fuel liters (km/L). */
async function fuelEfficiencyByVehicle() {
  return cached('analytics:fuel-efficiency', async () => {
    // Single aggregation query per metric - avoids N+1 (rule #20).
    const vehicles = await prisma.vehicle.findMany({
      where: { status: { not: 'RETIRED' } },
      select: {
        id: true, registrationNumber: true,
        trips: { where: { status: 'COMPLETED' }, select: { actualDistanceKm: true } },
        fuelLogs: { select: { liters: true } },
      },
    });
    return vehicles.map((v) => {
      const totalDistance = v.trips.reduce((s, t) => s + (t.actualDistanceKm || 0), 0);
      const totalFuel = v.fuelLogs.reduce((s, f) => s + (f.liters || 0), 0);
      return {
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        totalDistanceKm: round2(totalDistance),
        totalFuelL: round2(totalFuel),
        kmPerLiter: totalFuel > 0 ? round2(totalDistance / totalFuel) : null,
      };
    });
  });
}

/** Operational Cost per vehicle = sum(fuel cost) + sum(maintenance cost) + sum(expenses). */
async function operationalCostByVehicle() {
  return cached('analytics:operational-cost', async () => {
    const vehicles = await prisma.vehicle.findMany({
      where: { status: { not: 'RETIRED' } },
      select: {
        id: true, registrationNumber: true, acquisitionCost: true,
        fuelLogs: { select: { cost: true } },
        maintenanceLogs: { select: { cost: true } },
        expenses: { select: { amount: true } },
        trips: { where: { status: 'COMPLETED' }, select: { id: true } },
      },
    });
    return vehicles.map((v) => {
      const fuelCost = v.fuelLogs.reduce((s, f) => s + (f.cost || 0), 0);
      const maintenanceCost = v.maintenanceLogs.reduce((s, m) => s + (m.cost || 0), 0);
      const otherExpenses = v.expenses.reduce((s, e) => s + (e.amount || 0), 0);
      return {
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        fuelCost: round2(fuelCost),
        maintenanceCost: round2(maintenanceCost),
        otherExpenses: round2(otherExpenses),
        totalOperationalCost: round2(fuelCost + maintenanceCost + otherExpenses),
        completedTrips: v.trips.length,
      };
    });
  });
}

/** Vehicle ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost. Revenue must be supplied per vehicle (not tracked elsewhere in the spec), defaults to 0. */
async function vehicleROI(revenueByVehicleId = {}) {
  const costs = await operationalCostByVehicle();
  const vehicles = await prisma.vehicle.findMany({ where: { status: { not: 'RETIRED' } }, select: { id: true, acquisitionCost: true } });
  const acqMap = new Map(vehicles.map((v) => [v.id, v.acquisitionCost]));

  return costs.map((c) => {
    const revenue = revenueByVehicleId[c.vehicleId] || 0;
    const acquisitionCost = acqMap.get(c.vehicleId) || 0;
    const roi = acquisitionCost > 0
      ? round2(((revenue - (c.maintenanceCost + c.fuelCost)) / acquisitionCost) * 100)
      : null;
    return { vehicleId: c.vehicleId, registrationNumber: c.registrationNumber, revenue, acquisitionCost, roiPct: roi };
  });
}

/** Idle vehicles: Available status but not used in the last N days. */
async function idleVehicles(days = 7) {
  const threshold = new Date(Date.now() - days * 86400000);
  const vehicles = await prisma.vehicle.findMany({
    where: { status: 'AVAILABLE' },
    select: {
      id: true, registrationNumber: true,
      trips: { where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' }, take: 1, select: { completedAt: true } },
    },
  });
  return vehicles
    .filter((v) => !v.trips[0] || v.trips[0].completedAt < threshold)
    .map((v) => ({ vehicleId: v.id, registrationNumber: v.registrationNumber, lastUsedAt: v.trips[0] ? v.trips[0].completedAt : null }));
}

/** Monthly cost trend across fuel + maintenance + expenses for the last N months. */
async function costTrends(months = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const [fuel, maintenance, expenses] = await Promise.all([
    prisma.$queryRaw`SELECT to_char(date_trunc('month', "date"), 'YYYY-MM') AS month, SUM(cost) AS total FROM "FuelLog" WHERE "date" >= ${since} GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw`SELECT to_char(date_trunc('month', "openedAt"), 'YYYY-MM') AS month, SUM(cost) AS total FROM "MaintenanceLog" WHERE "openedAt" >= ${since} GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw`SELECT to_char(date_trunc('month', "date"), 'YYYY-MM') AS month, SUM(amount) AS total FROM "Expense" WHERE "date" >= ${since} GROUP BY 1 ORDER BY 1`,
  ]);

  const merged = new Map();
  for (const row of fuel) merged.set(row.month, { month: row.month, fuel: Number(row.total), maintenance: 0, expenses: 0 });
  for (const row of maintenance) {
    const e = merged.get(row.month) || { month: row.month, fuel: 0, maintenance: 0, expenses: 0 };
    e.maintenance = Number(row.total);
    merged.set(row.month, e);
  }
  for (const row of expenses) {
    const e = merged.get(row.month) || { month: row.month, fuel: 0, maintenance: 0, expenses: 0 };
    e.expenses = Number(row.total);
    merged.set(row.month, e);
  }
  return Array.from(merged.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((e) => ({ ...e, total: round2(e.fuel + e.maintenance + e.expenses) }));
}

/**
 * CSV export addresses rule #13 (CSV Export During Updates): reads all data
 * for the export inside a single Prisma transaction so the snapshot is
 * consistent even if trips complete/dispatch mid-export.
 */
async function exportTripsSnapshot() {
  return prisma.$transaction(async (tx) => {
    const trips = await tx.trip.findMany({
      include: { vehicle: { select: { registrationNumber: true } }, driver: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return trips.map((t) => ({
      id: t.id,
      status: t.status,
      source: t.source,
      destination: t.destination,
      vehicle: t.vehicle.registrationNumber,
      driver: t.driver.name,
      cargoWeightKg: t.cargoWeightKg,
      plannedDistanceKm: t.plannedDistanceKm,
      actualDistanceKm: t.actualDistanceKm,
      dispatchedAt: t.dispatchedAt,
      completedAt: t.completedAt,
    }));
  }, { isolationLevel: 'RepeatableRead' });
}

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

module.exports = {
  fleetUtilization,
  fuelEfficiencyByVehicle,
  operationalCostByVehicle,
  vehicleROI,
  idleVehicles,
  costTrends,
  exportTripsSnapshot,
};
