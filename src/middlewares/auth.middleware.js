import { verifyJwt } from '../utils/jwt.js';
import { prisma } from '../services/prisma.js';

export async function authMiddleware(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    const [, token] = hdr.split(' ');
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const payload = verifyJwt(token); // { id, tenantId, roles, primaryRole, iat, exp }
    if (!payload?.id) return res.status(401).json({ error: 'Invalid token' });

    // load user (so /me can return email/role/etc.)
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        emailVerifiedAt: true,
      },
    });
    if (!user) return res.status(401).json({ error: 'User not found' });

    // attach to req
    req.user = {
      ...user,
      roles: payload.roles || [user.role],
      primaryRole: payload.primaryRole || user.role,
    };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
