require('dotenv').config();
const http = require('http');
const app = require('./app');
const logger = require('./config/logger');
const { initSocket } = require('./sockets');
const startSocketBridge = require('./sockets/bridge');
const { scheduleLicenseExpiryCron } = require('./jobs/licenseExpiryCron');
const { scheduleMaintenanceAlertCron } = require('./jobs/maintenanceAlertCron');
const { startNotificationWorker } = require('./queues/notificationWorker');

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);
initSocket(server);
startSocketBridge();

// Cron jobs (license expiry, predictive maintenance).
scheduleLicenseExpiryCron();
scheduleMaintenanceAlertCron();

// The notification worker can run in-process (simplest for a single-instance
// deployment) or as its own container/process via `npm run worker` for
// horizontal scaling - see docker-compose.yml which runs it separately.
if (process.env.RUN_WORKER_IN_PROCESS !== 'false') {
  startNotificationWorker();
}

server.listen(PORT, () => {
  logger.info(`TransitOps backend listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => process.exit(0));
});
