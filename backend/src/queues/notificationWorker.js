const { Worker } = require('bullmq');
const connection = require('../config/redis');
const prisma = require('../config/db');
const logger = require('../config/logger');

const QUEUE_NAME = 'notifications';
const PUBLISH_CHANNEL = 'transitops:socket-events';

// In-memory batching window: jobs sharing a batchKey that arrive within
// BATCH_WINDOW_MS of each other are coalesced into a single digest
// notification, addressing "Notification Spam" (rule #12).
const BATCH_WINDOW_MS = parseInt(process.env.NOTIFICATION_BATCH_WINDOW_MS || '4000', 10);
const pendingBatches = new Map(); // batchKey -> { items: [], timer }

async function flushBatch(batchKey) {
  const batch = pendingBatches.get(batchKey);
  if (!batch) return;
  pendingBatches.delete(batchKey);

  const { items } = batch;
  const isDigest = items.length > 1;
  const title = isDigest ? `${items.length} updates: ${batchKey}` : items[0].title;
  const message = isDigest
    ? items.map((i) => `- ${i.title}: ${i.message}`).join('\n')
    : items[0].message;

  const notification = await prisma.notification.create({
    data: {
      type: items[0].type,
      channel: 'SOCKET',
      title,
      message,
      meta: { batchKey, count: items.length, items },
    },
  });

  await connection.publish(PUBLISH_CHANNEL, JSON.stringify({
    event: 'notification.new',
    payload: notification,
  }));

  logger.info({ batchKey, count: items.length }, 'notification batch flushed');
}

function scheduleFlush(batchKey) {
  const batch = pendingBatches.get(batchKey);
  if (batch.timer) clearTimeout(batch.timer);
  batch.timer = setTimeout(() => flushBatch(batchKey).catch((e) => logger.error(e, 'flush failed')), BATCH_WINDOW_MS);
}

function startNotificationWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { type, title, message, meta, batchKey } = job.data;
      if (!pendingBatches.has(batchKey)) pendingBatches.set(batchKey, { items: [], timer: null });
      pendingBatches.get(batchKey).items.push({ type, title, message, meta });
      scheduleFlush(batchKey);
    },
    { connection, concurrency: 5 }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job && job.id, err: err.message }, 'notification job failed');
  });

  logger.info('notification worker started');
  return worker;
}

module.exports = { startNotificationWorker, PUBLISH_CHANNEL };

// Allow running as standalone process: `npm run worker`
if (require.main === module) {
  startNotificationWorker();
}
