const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../../config/db');
const ApiError = require('../../utils/apiError');
const { signAccessToken, signRefreshToken, verifyRefreshToken, refreshExpiryDate } = require('../../utils/jwt');
const { recordAudit } = require('../audit/audit.service');

const SALT_ROUNDS = 10;

async function register({ name, email, password, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('Email already registered', null, 'EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: role || 'VIEWER' },
  });

  await recordAudit(prisma, { userId: user.id, action: 'CREATE', entity: 'User', entityId: user.id, newValue: { email, role: user.role } });

  return sanitizeUser(user);
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid credentials');

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw ApiError.unauthorized('Invalid credentials');

  const tokens = await issueTokens(user);
  return { user: sanitizeUser(user), ...tokens };
}

async function issueTokens(user) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const refreshTokenValue = signRefreshToken({ sub: user.id });
  const tokenHash = hashToken(refreshTokenValue);

  await prisma.refreshToken.create({
    data: { token: tokenHash, userId: user.id, expiresAt: refreshExpiryDate() },
  });

  return { accessToken, refreshToken: refreshTokenValue };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function refresh(refreshTokenValue) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshTokenValue);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const tokenHash = hashToken(refreshTokenValue);
  const stored = await prisma.refreshToken.findUnique({ where: { token: tokenHash } });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token revoked or expired');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw ApiError.unauthorized('User not active');

  // Rotate: revoke old, issue new (prevents replay of stolen refresh tokens).
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
  const tokens = await issueTokens(user);
  return { user: sanitizeUser(user), ...tokens };
}

async function logout(refreshTokenValue) {
  if (!refreshTokenValue) return;
  const tokenHash = hashToken(refreshTokenValue);
  await prisma.refreshToken.updateMany({ where: { token: tokenHash }, data: { revoked: true } });
}

function sanitizeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

module.exports = { register, login, refresh, logout, issueTokens, sanitizeUser };
