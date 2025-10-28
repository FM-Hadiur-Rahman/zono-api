import bcrypt from 'bcryptjs';
import { prisma } from '../services/prisma.js';
import { sendMail } from '../services/mailer.service.js';
import { genToken, addHours } from '../utils/tokens.js';

/** POST /api/invitations/send (owner/admin) */
export async function sendInvite(req, res) {
  const { email, role = 'employee', expiresInHours = 72 } = req.body;

  const token = genToken(24);
  const inv = await prisma.invitation.create({
    data: {
      tenantId: req.user.tenantId,
      email: email.toLowerCase(),
      role: role.toLowerCase(),
      token,
      expiresAt: addHours(new Date(), Number(expiresInHours)),
    },
  });

  const origin = process.env.APP_ORIGIN || 'http://localhost:5173';
  const url = `${origin}/invite/${token}`;

  // inside sendInvite controller
  try {
    await sendMail({
      to: email,
      subject: 'You’re invited to Zono',
      html: `<p>You’ve been invited to join Zono as <b>${role}</b>.</p><p><a href="${url}">Accept invitation</a></p>`,
    });
    return res
      .status(201)
      .json({
        ok: true,
        id: inv.id,
        token,
        link: url,
        expiresAt: inv.expiresAt,
      });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'EMAIL_SEND_FAILED' });
  }
}
/** GET /api/invitations/validate?token=... (public) */
export async function validateInvite(req, res) {
  const token = String(req.query.token || '');
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const inv = await prisma.invitation.findUnique({
    where: { token }, // token must be @unique in Prisma
    include: { tenant: true },
  });
  if (!inv || inv.acceptedAt || (inv.expiresAt && inv.expiresAt < new Date()))
    return res.status(404).json({ error: 'Invalid or expired token' });

  return res.json({
    ok: true,
    email: inv.email,
    role: inv.role,
    tenantName: inv.tenant.name,
    tenantId: inv.tenantId,
  });
}

/** GET /api/invitations/:token (public) */
export async function getInvite(req, res) {
  const inv = await prisma.invitation.findUnique({
    where: { token: req.params.token },
    include: { tenant: true },
  });
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date())
    return res.status(404).json({ error: 'Invalid or expired token' });

  return res.json({
    ok: true,
    email: inv.email,
    role: inv.role,
    tenantName: inv.tenant.name,
  });
}

/** POST /api/invitations/accept (public) */
export async function acceptInvite(req, res) {
  const { token, name, password, phone } = req.body;

  const inv = await prisma.invitation.findUnique({ where: { token } });
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date())
    return res.status(400).json({ error: 'Invalid or expired token' });

  const exists = await prisma.user.findFirst({
    where: { tenantId: inv.tenantId, email: inv.email },
  });
  if (exists) return res.status(409).json({ error: 'User already exists' });

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      tenantId: inv.tenantId,
      email: inv.email,
      passwordHash: hash,
      role: inv.role, // your User has single role
      // optional fields you may have:
      // name,
      // phone,
      emailVerifiedAt: new Date(), // if you want staff verify, set null and send verify email here too
    },
  });

  await prisma.invitation.update({
    where: { token },
    data: { acceptedAt: new Date() },
  });

  return res.json({ ok: true });
}
