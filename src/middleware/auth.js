const ApiError = require('../utils/apiError');
const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../config/db');

/**
 * Verifies the Bearer access token and attaches `req.user = { id, role, email }`.
 * Also re-checks the user is still active (covers instant revocation on deactivation).
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('Missing access token');

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      throw ApiError.unauthorized('Invalid or expired access token');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User no longer active');
    }

    req.user = { id: user.id, role: user.role, email: user.email, driverId: user.driverId };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticate;
