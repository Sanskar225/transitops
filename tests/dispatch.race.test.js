/**
 * Race-condition regression test.
 * Requires DATABASE_URL pointing at a real (migrated) Postgres instance -
 * run `docker-compose up -d postgres && npx prisma migrate deploy` first,
 * or point DATABASE_URL at your dev DB. Run with: npm test
 */
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');

let adminToken;
let vehicleId;
let driverAId;
let driverBId;

beforeAll(async () => {
  await request(app).post('/api/auth/register').send({
    name: 'Test Admin', email: `race-admin-${Date.now()}@test.local`, password: 'Password123', role: 'ADMIN',
  });
  const login = await request(app).post('/api/auth/login').send({
    email: (await prisma.user.findFirst({ orderBy: { createdAt: 'desc' } })).email,
    password: 'Password123',
  });
  adminToken = login.body.data.accessToken;

  const vehicle = await prisma.vehicle.create({
    data: { registrationNumber: `RACE-${Date.now()}`, maxLoadCapacityKg: 1000, status: 'AVAILABLE' },
  });
  vehicleId = vehicle.id;

  const driverA = await prisma.driver.create({
    data: { name: 'Driver A', licenseNumber: `LIC-A-${Date.now()}`, licenseExpiryDate: new Date(Date.now() + 86400000 * 365), status: 'AVAILABLE' },
  });
  driverAId = driverA.id;
  const driverB = await prisma.driver.create({
    data: { name: 'Driver B', licenseNumber: `LIC-B-${Date.now()}`, licenseExpiryDate: new Date(Date.now() + 86400000 * 365), status: 'AVAILABLE' },
  });
  driverBId = driverB.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('only one of two concurrent dispatch requests for the same vehicle succeeds', async () => {
  const auth = (r) => r.set('Authorization', `Bearer ${adminToken}`);

  const tripA = await auth(request(app).post('/api/trips')).send({
    source: 'A', destination: 'B', vehicleId, driverId: driverAId, cargoWeightKg: 100, plannedDistanceKm: 50,
  });
  const tripB = await auth(request(app).post('/api/trips')).send({
    source: 'A', destination: 'B', vehicleId, driverId: driverBId, cargoWeightKg: 100, plannedDistanceKm: 50,
  });

  const [resA, resB] = await Promise.all([
    auth(request(app).post(`/api/trips/${tripA.body.data.id}/dispatch`)),
    auth(request(app).post(`/api/trips/${tripB.body.data.id}/dispatch`)),
  ]);

  const statuses = [resA.status, resB.status].sort();
  // Exactly one dispatch should succeed (200), the other must be rejected (409) -
  // never both 200, which would be the "impossible state" race condition.
  expect(statuses).toEqual([200, 409]);

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  expect(vehicle.status).toBe('ON_TRIP');
});
