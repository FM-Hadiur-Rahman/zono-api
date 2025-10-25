// scripts/backfill-employee-userId.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Example strategy:
  // For each user that has a tenantId, attach them to the first employee in that tenant
  // or create one if none exists. Adjust to your real mapping (email, name, etc.).
  const users = await prisma.user.findMany({
    where: { tenantId: { not: null } },
  });

  for (const u of users) {
    // try to find an existing employee for this tenant with NULL userId
    let emp = await prisma.employee.findFirst({
      where: { tenantId: u.tenantId, userId: null },
      orderBy: { createdAt: 'asc' }, // if you have createdAt; otherwise remove
    });

    if (!emp) {
      // create a minimal employee row (customize fields!)
      emp = await prisma.employee.create({
        data: {
          tenantId: u.tenantId,
          name: u.email, // placeholder; change as needed
          role: 'employee', // or derive from u.role
          status: 'Available',
          user: { connect: { id: u.id } },
        },
      });
      console.log('Created employee for user', u.email, '->', emp.id);
    } else {
      // link existing employee to user
      await prisma.employee.update({
        where: { id: emp.id },
        data: { userId: u.id },
      });
      console.log('Linked employee', emp.id, 'to user', u.email);
    }
  }
}

main().finally(async () => prisma.$disconnect());
