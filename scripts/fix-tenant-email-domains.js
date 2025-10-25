// scripts/fix-tenant-email-domains.js (ESM)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function fixDomain(email) {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  // replace underscores with hyphens in the domain part
  const fixed = domain.replace(/_/g, '-');
  return `${local}@${fixed}`;
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });
  let changed = 0;
  for (const u of users) {
    const next = fixDomain(u.email);
    if (next !== u.email) {
      await prisma.user.update({ where: { id: u.id }, data: { email: next } });
      changed++;
      console.log(`Updated: ${u.email} -> ${next}`);
    }
  }
  console.log(`Done. Updated ${changed} users.`);
}
main().finally(() => prisma.$disconnect());
