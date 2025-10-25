// scripts/cleanup-duplicates.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔎 Finding duplicate employees for the same tenant + user…');

  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      tenantId: true,
      userId: true,
      name: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // group by tenantId+userId
  const groups = {};
  for (const e of employees) {
    const key = `${e.tenantId}:${e.userId}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }

  let totalDeleted = 0;
  for (const [key, list] of Object.entries(groups)) {
    if (list.length <= 1) continue; // no dupes
    const [keep, ...dupes] = list; // keep the first (oldest)
    const idsToDelete = dupes.map((d) => d.id);
    await prisma.employee.deleteMany({ where: { id: { in: idsToDelete } } });
    console.log(`🧹 Deleted ${idsToDelete.length} duplicates for ${key}`);
    totalDeleted += idsToDelete.length;
  }

  console.log(
    `✅ Cleanup complete. Deleted ${totalDeleted} duplicate employees.`,
  );
}

main()
  .catch((err) => {
    console.error('❌ Error cleaning up duplicates:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
