require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@transitops.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: 'System Admin', email: adminEmail, passwordHash, role: 'ADMIN' },
  });
  console.log(`Admin user ready: ${admin.email} (password: ${adminPassword} - change immediately)`);

  const van = await prisma.vehicle.upsert({
    where: { registrationNumber: 'VAN-05' },
    update: {},
    create: {
      registrationNumber: 'VAN-05',
      make: 'Tata', model: 'Ace', year: 2022,
      maxLoadCapacityKg: 500,
      acquisitionCost: 800000,
      currentOdometerKm: 12000,
      odometerAtLastSvcKm: 10000,
      serviceIntervalKm: 5000,
      status: 'AVAILABLE',
    },
  });

  const driver = await prisma.driver.upsert({
    where: { licenseNumber: 'DL-ALEX-001' },
    update: {},
    create: {
      name: 'Alex',
      licenseNumber: 'DL-ALEX-001',
      licenseCategory: 'LMV',
      licenseExpiryDate: new Date(Date.now() + 365 * 86400000),
      contactNumber: '+91-9000000000',
      safetyScore: 92,
      status: 'AVAILABLE',
    },
  });

  console.log(`Sample vehicle: ${van.registrationNumber}, sample driver: ${driver.name}`);
  console.log('Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
