const { Queue } = require('bullmq');
const connection = require('../config/redis');
const logger = require('../config/logger');

const QUEUE_NAME = 'notifications';

const notificationQueue = new Queue(QUEUE_NAME, { connection });

/**
 * Enqueue a notification job. Jobs are grouped by `batchKey` (e.g. a topic or
 * recipient) and delayed briefly so the worker can coalesce bursts (rule #12:
 * "Notification Spam" - e.g. maintenance+trip+fuel+expense firing together)
 * into a single digest instead of N separate emails/pushes.
 */
async function enqueueNotification({ type, title, message, meta = {}, batchKey = 'general', delayMs = 5000 }) {
  try {
    await notificationQueue.add(
      'notify',
      { type, title, message, meta, batchKey },
      {
        delay: delayMs,
        removeOnComplete: 500,
        removeOnFail: 500,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      }
    );
  } catch (err) {
    // Redis being down should never break the primary business transaction.
    logger.warn({ err: err.message }, 'failed to enqueue notification - degraded (redis unavailable?)');
  }
}

module.exports = { notificationQueue, enqueueNotification };
