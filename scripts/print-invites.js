// ESM
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const rows = await prisma.invitation.findMany({
  orderBy: { id: 'desc' }, // no createdAt in your model
  take: 20,
  select: {
    id: true,
    email: true,
    tenantId: true,
    role: true,
    token: true, // plain token in your schema
    expiresAt: true,
    acceptedAt: true,
  },
});
console.log(rows);
await prisma.$disconnect();
