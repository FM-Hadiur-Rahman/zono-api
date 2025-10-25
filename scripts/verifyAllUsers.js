// scripts/verifyAllUsers.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const { count } = await prisma.user.updateMany({
    data: { emailVerifiedAt: new Date() },
  });
  console.log(`✅ Marked ${count} users as verified`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
