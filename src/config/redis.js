const IORedis = require('ioredis');
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// BullMQ requires maxRetriesPerRequest: null on the connection it manages.
const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false,
});

connection.on('error', (err) => {
  logger.warn({ err: err.message }, 'redis connection error - notifications/queues degraded');
});

connection.on('connect', () => logger.info('redis connected'));

module.exports = connection;
