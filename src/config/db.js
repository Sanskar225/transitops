const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

// Single shared Prisma client instance (recommended by Prisma docs to avoid
// exhausting DB connections in dev with hot-reload, and for consistent pooling
// in production).
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

if (process.env.LOG_QUERIES === 'true') {
  prisma.$on('query', (e) => {
    logger.debug({ query: e.query, params: e.params, duration: e.duration }, 'prisma:query');
  });
}
prisma.$on('error', (e) => logger.error(e, 'prisma:error'));
prisma.$on('warn', (e) => logger.warn(e, 'prisma:warn'));

module.exports = prisma;
