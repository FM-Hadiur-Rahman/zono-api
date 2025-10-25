// ESM
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const rawToken = process.argv[2];
const tenantId = process.argv[3]; // e.g. t_burgerme

if (!rawToken) {
  console.error(
    'Usage: node scripts/test-invite-token.js <RAW_TOKEN> [tenantId]',
  );
  process.exit(1);
}

function now() {
  return new Date();
}

async function main() {
  const where = tenantId ? { tenantId } : {};
  // token is stored plaintext in your model
  const inv = await prisma.invitation.findFirst({
    where: { ...where, token: rawToken },
    select: {
      id: true,
      email: true,
      tenantId: true,
      expiresAt: true,
      acceptedAt: true,
    },
  });

  if (!inv) {
    console.log('❌ No invitation matched this token (wrong DB/tenant/token).');
    return;
  }
  if (inv.acceptedAt) {
    console.log(
      `⚠️ Matched but already accepted at ${inv.acceptedAt.toISOString()} for ${inv.email} (${inv.tenantId}).`,
    );
    return;
  }
  if (inv.expiresAt && inv.expiresAt < now()) {
    console.log(
      `⚠️ Matched but expired at ${inv.expiresAt.toISOString()} for ${inv.email} (${inv.tenantId}).`,
    );
    return;
  }
  console.log(`✅ Matched & valid for ${inv.email} (tenant ${inv.tenantId}).`);
}

main().finally(() => prisma.$disconnect());
