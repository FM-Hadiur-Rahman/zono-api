// ESM
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function normName(n) {
  return (n || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function main() {
  const tenantId = 't_burgerme'; // change if needed

  const rows = await prisma.employee.findMany({
    where: { tenantId },
    select: {
      id: true,
      tenantId: true,
      userId: true,
      name: true,
      createdAt: true,
      user: { select: { email: true, createdAt: true, id: true } },
    },
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
  });

  // group by user.email (best) and by normalized name (secondary)
  const byEmail = new Map();
  const byName = new Map();

  for (const r of rows) {
    const kEmail = r.user?.email || 'NO_EMAIL';
    const kName = normName(r.name);
    if (!byEmail.has(kEmail)) byEmail.set(kEmail, []);
    if (!byName.has(kName)) byName.set(kName, []);
    byEmail.get(kEmail).push(r);
    byName.get(kName).push(r);
  }

  console.log(`\n🔎 Duplicates by EMAIL for tenant ${tenantId}`);
  for (const [email, list] of byEmail.entries()) {
    if (email === 'NO_EMAIL') continue;
    if (list.length > 1) {
      console.log(
        `• ${email} -> ${list.length} employees:`,
        list.map((l) => l.id),
      );
    }
  }

  console.log(`\n🔎 Duplicates by NAME for tenant ${tenantId}`);
  for (const [name, list] of byName.entries()) {
    if (!name) continue;
    if (list.length > 1) {
      const emails = list.map((l) => l.user?.email || 'NO_EMAIL');
      // Only interesting if they resolve to different users/emails
      const uniqEmails = [...new Set(emails)];
      if (uniqEmails.length > 1) {
        console.log(`• "${name}" -> ${list.length} employees:`, {
          employeeIds: list.map((l) => l.id),
          userIds: list.map((l) => l.userId),
          emails: uniqEmails,
        });
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
