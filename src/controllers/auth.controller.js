import bcrypt from 'bcryptjs';
import { prisma } from '../services/prisma.js';
import { sendMail } from '../services/mailer.service.js';
import { genToken, addHours } from '../utils/tokens.js';
import { signJwt } from '../utils/jwt.js';

export async function registerTenant(req, res) {
  if (process.env.ALLOW_OWNER_SELF_SIGNUP !== 'true')
    return res.status(403).json({ error: 'Owner self-signup is disabled' });

  const {
    company,
    subdomain,
    name,
    email,
    password,
    phone,
    country,
    timezone = 'Europe/Berlin',
  } = req.body;

  const sub = (subdomain || company)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
  if (!sub) return res.status(400).json({ error: 'Invalid subdomain' });

  const exists = await prisma.tenant.findUnique({ where: { subdomain: sub } });
  if (exists)
    return res.status(409).json({ error: 'Subdomain already in use' });

  const hash = await bcrypt.hash(password, 12);

  // Tenant + default location + owner user
  const tenant = await prisma.tenant.create({
    data: {
      name: company,
      subdomain: sub,
      locations: {
        create: [{ name: 'Main', timezone }],
      },
      users: {
        create: [
          {
            email,
            passwordHash: hash,
            role: 'owner', // your User has single role
            phone,
            country,
          },
        ],
      },
    },
    include: { users: true },
  });

  const owner = tenant.users[0];

  const token = genToken(24);
  await prisma.emailVerificationToken.create({
    data: { userId: owner.id, token, expiresAt: addHours(new Date(), 24) },
  });

  const verifyUrl = `${process.env.APP_ORIGIN}/verify-email?token=${token}`;
  await sendMail({
    to: email,
    subject: 'Verify your email — Zono',
    html: `<p>Hi ${name || ''},</p><p>Please verify your email to activate your Zono workspace.</p><p><a href="${verifyUrl}">Verify email</a></p>`,
  });

  return res.json({
    ok: true,
    tenant: { id: tenant.id, subdomain: tenant.subdomain },
    message: 'Verify email to activate your account',
  });
}

export async function verifyEmail(req, res) {
  const { token } = req.body;
  const row = await prisma.emailVerificationToken.findUnique({
    where: { token },
  });
  if (!row || row.usedAt || row.expiresAt < new Date())
    return res.status(400).json({ error: 'Invalid or expired token' });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ]);

  return res.json({ ok: true });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user)
    return res.status(401).json({ error: 'Invalid email or password' });
  if (!user.emailVerifiedAt)
    return res.status(403).json({ error: 'Email not verified' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  const token = signJwt({
    id: user.id,
    tenantId: user.tenantId || null,
    roles: [user.role],
    primaryRole: user.role,
    role: user.primaryRole || user.role,
  });
  return res.json({ token });
}
