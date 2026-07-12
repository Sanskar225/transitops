const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwt');
const logger = require('../config/logger');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN || '*', credentials: true },
  });

  // Auth handshake: client passes access token via `auth: { token }`.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(); // allow anonymous read-only viewers of public dashboard if desired
      const payload = verifyAccessToken(token);
      socket.user = payload;
      next();
    } catch (err) {
      next(); // invalid token -> connect as anonymous rather than hard-fail
    }
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id, user: socket.user && socket.user.sub }, 'socket connected');
    socket.join('dashboard');

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id }, 'socket disconnected');
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    logger.warn('Socket.IO requested before initialization - emit skipped');
    return null;
  }
  return io;
}

/** Emit a real-time event to all dashboard subscribers. */
function emitEvent(eventName, payload) {
  const inst = getIO();
  if (!inst) return;
  inst.to('dashboard').emit(eventName, { ...payload, ts: new Date().toISOString() });
}

module.exports = { initSocket, getIO, emitEvent };
