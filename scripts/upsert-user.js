// scripts/upsert-user.mjs
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const p = new PrismaClient();

// simple arg parser: --email=..., --password=..., --role=..., --tenant=...
const args = Object.fromEntries(
  process.argv.slice(2).map((kv) => {
    const [k, ...rest] = kv.replace(/^--/, '').split('=');
    return [k, rest.join('=')];
  }),
);

const email = String(args.email || '')
  .trim()
  .toLowerCase();
const password = args.password || 'demo';
const role = args.role || 'employee';
const tenantId = args.tenant || 't1';

if (!email) {
  console.error(
    'Usage: node scripts/upsert-user.mjs --email=user@example.com [--password=demo] [--role=owner] [--tenant=t1]',
  );
  process.exit(1);
}

try {
  const hash = await bcrypt.hash(password, 12);
  const existing = await p.user.findUnique({ where: { email } });

  if (existing) {
    await p.user.update({
      where: { email },
      data: {
        passwordHash: hash,
        emailVerifiedAt: new Date(),
        tenantId,
        role,
      },
    });
    console.log('✅ updated existing user:', email);
  } else {
    await p.user.create({
      data: {
        email,
        passwordHash: hash,
        emailVerifiedAt: new Date(),
        tenantId,
        role,
      },
    });
    console.log('✅ created user:', email);
  }
} catch (e) {
  console.error('❌ error:', e.message);
  process.exit(1);
} finally {
  await p.$disconnect();
}
