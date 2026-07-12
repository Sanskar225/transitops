const cron = require('node-cron');
const prisma = require('../config/db');
const logger = require('../config/logger');
const { enqueueNotification } = require('../queues/notificationQueue');

const WARN_DAYS = parseInt(process.env.LICENSE_EXPIRY_WARN_DAYS || '14', 10);

async function checkExpiringLicenses() {
  const now = new Date();
  const threshold = new Date(now.getTime() + WARN_DAYS * 24 * 60 * 60 * 1000);

  const expiring = await prisma.driver.findMany({
    where: {
      licenseExpiryDate: { lte: threshold },
      status: { not: 'SUSPENDED' },
    },
    select: { id: true, name: true, licenseNumber: true, licenseExpiryDate: true },
  });

  for (const driver of expiring) {
    const daysLeft = Math.ceil((driver.licenseExpiryDate.getTime() - now.getTime()) / 86400000);
    const status = daysLeft < 0 ? 'EXPIRED' : `expires in ${daysLeft} day(s)`;
    await enqueueNotification({
      type: 'LICENSE_EXPIRY',
      title: `Driver license ${status}`,
      message: `${driver.name} (License ${driver.licenseNumber}) license ${status}.`,
      meta: { driverId: driver.id },
      batchKey: 'license-expiry-digest',
    });
  }

  logger.info({ count: expiring.length }, 'license expiry check completed');
  return expiring;
}

function scheduleLicenseExpiryCron() {
  // Runs daily at 07:00 server time.
  const schedule = process.env.LICENSE_EXPIRY_CRON || '0 7 * * *';
  cron.schedule(schedule, () => {
    checkExpiringLicenses().catch((err) => logger.error({ err }, 'license expiry cron failed'));
  });
  logger.info({ schedule }, 'license expiry cron scheduled');
}

module.exports = { scheduleLicenseExpiryCron, checkExpiringLicenses };
