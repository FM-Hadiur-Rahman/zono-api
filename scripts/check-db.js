// scripts/check-db.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const [tenants, users, employees] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.employee.count(),
  ]);
  console.log({ tenants, users, employees });

  const sampleTenants = await prisma.tenant.findMany({
    take: 5,
    orderBy: { id: 'asc' },
  });
  console.log(
    'Tenants:',
    sampleTenants.map((t) => t.id),
  );
}
main().finally(() => prisma.$disconnect());
