import bcrypt from 'bcryptjs';
import { prisma } from '../services/prisma.js';
import { sendMail } from '../services/mailer.service.js';
import { genToken, addHours } from '../utils/tokens.js';

/** POST /api/invitations/send (owner/admin) */
export async function sendInvite(req, res) {
  const { email, role = 'employee', expiresInHours = 72 } = req.body;
  const to = String(email || '').toLowerCase();
  const r = String(role || '').toLowerCase();

  // optional: avoid duplicate pending invites for same tenant+email
  const existing = await prisma.invitation.findFirst({
    where: {
      tenantId: req.user.tenantId,
      email: to,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (existing) {
    const origin = process.env.APP_ORIGIN || 'http://localhost:5173';
    const link = `${origin}/invite/${existing.token}`;
    return res.status(200).json({
      ok: true,
      reused: true,
      id: existing.id,
      link,
      token: existing.token,
      expiresAt: existing.expiresAt.toISOString(),
      note: 'Existing pending invite reused.',
    });
  }

  const token = genToken(24);
  const inv = await prisma.invitation.create({
    data: {
      tenantId: req.user.tenantId,
      email: to,
      role: r,
      token,
      expiresAt: addHours(new Date(), Number(expiresInHours)),
    },
  });

  const origin = process.env.APP_ORIGIN || 'http://localhost:5173';
  const url = `${origin}/invite/${token}`;
  const from =
    process.env.EMAIL_FROM ||
    `Zono <${process.env.EMAIL_USER || 'no-reply@zono.works'}>`;

  try {
    await sendMail({
      to,
      subject: 'You’re invited to Zono',
      html: `
        <p>You’ve been invited to join Zono as <b>${r}</b>.</p>
        <p><a href="${url}">Accept invitation</a></p>
        <p style="color:#667085;font-size:12px">If the button doesn’t work, paste this link into your browser: ${url}</p>
      `,
      text: `You’ve been invited to join Zono as ${r}.\nAccept invitation: ${url}\n`,
      from, // supported by your Resend/Gmail sender
    });

    return res.status(201).json({
      ok: true,
      id: inv.id,
      token,
      link: url,
      expiresAt: inv.expiresAt.toISOString(),
    });
  } catch (e) {
    // CHOOSE ONE:

    // A) Soft-fail: keep invite and let the UI show "Copy link"
    return res.status(201).json({
      ok: true,
      id: inv.id,
      token,
      link: url,
      expiresAt: inv.expiresAt.toISOString(),
      emailWarning: e.message || 'EMAIL_SEND_FAILED',
    });

    // B) Hard-fail: delete invite so you don’t leave a dangling token
    // await prisma.invitation.delete({ where: { id: inv.id } });
    // return res.status(502).json({ ok: false, error: e.message, code: e.code });
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

  const dup = await prisma.user.findFirst({
    where: { tenantId: inv.tenantId, email: inv.email },
  });
  if (dup) return res.status(409).json({ error: 'User already exists' });

  const hash = await bcrypt.hash(password, 12);

  // If your employee roles differ from user roles, map them here:
  const roleMap = {
    rider: 'rider',
    kitchen: 'kitchen',
    manager: 'manager',
    employee: 'employee',
  };
  const employeeRole = roleMap[inv.role] ?? 'employee';

  const displayName = name?.trim() || inv.email.split('@')[0];

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        tenantId: inv.tenantId,
        email: inv.email,
        passwordHash: hash,
        role: inv.role, // single role on User
        name: displayName,
        phone: phone || null,
        emailVerifiedAt: new Date(),
      },
      select: { id: true },
    });

    // Ensure there is an Employee row linked to this user
    await tx.employee.upsert({
      where: { tenantId_userId: { tenantId: inv.tenantId, userId: user.id } }, // uses @@unique
      update: {}, // nothing to update if it already exists
      create: {
        tenantId: inv.tenantId,
        userId: user.id,
        name: displayName,
        role: employeeRole, // Employee.role is String in your model
        status: 'Available', // matches your default casing
      },
    });

    await tx.invitation.update({
      where: { token },
      data: { acceptedAt: new Date() },
    });
  });

  return res.json({ ok: true });
}
