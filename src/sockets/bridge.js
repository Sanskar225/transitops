const Redis = require('ioredis');
const { emitEvent } = require('./index');
const logger = require('../config/logger');
const { PUBLISH_CHANNEL } = require('../queues/notificationWorker');

/**
 * Subscribes to the Redis channel the notification worker publishes to, so
 * that even if the worker runs as a separate process/container, its events
 * still reach browser clients connected to this API instance's Socket.IO.
 */
function startSocketBridge() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const sub = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: null });

  sub.connect()
    .then(() => sub.subscribe(PUBLISH_CHANNEL))
    .then(() => logger.info('socket bridge subscribed to redis pub/sub'))
    .catch((err) => logger.warn({ err: err.message }, 'socket bridge failed to connect - real-time notification broadcast degraded'));

  sub.on('message', (channel, raw) => {
    try {
      const { event, payload } = JSON.parse(raw);
      emitEvent(event, payload);
    } catch (err) {
      logger.warn({ err: err.message }, 'failed to parse socket bridge message');
    }
  });

  sub.on('error', (err) => logger.warn({ err: err.message }, 'socket bridge redis error'));

  return sub;
}

module.exports = startSocketBridge;
