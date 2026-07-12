const cron = require('node-cron');
const prisma = require('../config/db');
const logger = require('../config/logger');
const { enqueueNotification } = require('../queues/notificationQueue');

/**
 * Predictive maintenance: flags vehicles whose distance travelled since their
 * last recorded service (currentOdometerKm - odometerAtLastSvcKm) is at or
 * above their configured serviceIntervalKm (default 5000km). Runs periodically
 * and also can be invoked ad-hoc via analytics service for on-demand checks.
 */
async function checkPredictiveMaintenance() {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: { not: 'RETIRED' } },
    select: {
      id: true, registrationNumber: true, currentOdometerKm: true,
      odometerAtLastSvcKm: true, serviceIntervalKm: true, status: true,
    },
  });

  const due = [];
  for (const v of vehicles) {
    const distanceSinceService = v.currentOdometerKm - v.odometerAtLastSvcKm;
    if (distanceSinceService >= v.serviceIntervalKm) {
      due.push({ ...v, distanceSinceService });
      await enqueueNotification({
        type: 'MAINTENANCE_DUE',
        title: `Service due: ${v.registrationNumber}`,
        message: `${v.registrationNumber} has travelled ${distanceSinceService.toFixed(0)}km since last service (interval ${v.serviceIntervalKm}km).`,
        meta: { vehicleId: v.id, distanceSinceService },
        batchKey: 'maintenance-due-digest',
      });
    }
  }

  logger.info({ count: due.length }, 'predictive maintenance check completed');
  return due;
}

function scheduleMaintenanceAlertCron() {
  // Runs every 6 hours by default.
  const schedule = process.env.MAINTENANCE_ALERT_CRON || '0 */6 * * *';
  cron.schedule(schedule, () => {
    checkPredictiveMaintenance().catch((err) => logger.error({ err }, 'maintenance alert cron failed'));
  });
  logger.info({ schedule }, 'predictive maintenance cron scheduled');
}

module.exports = { scheduleMaintenanceAlertCron, checkPredictiveMaintenance };
