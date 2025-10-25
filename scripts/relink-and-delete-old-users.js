// ESM
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TENANT_ID = 't_burgerme';
const OLD_DOMAIN = '@burgerme.local';
const NEW_DOMAIN = '@t_burgerme.local';
const DRY_RUN = false;

// Extend this list to include any models that have a userId you want to relink.
const RELINK_MODELS = [
  { name: 'attendanceEvent', field: 'userId' },
  { name: 'shiftSwap', field: 'userId' },
  { name: 'auditLog', field: 'userId' },
  { name: 'availability', field: 'userId' },
];

async function safeUpdateMany(model, where, data) {
  const d = prisma[model];
  if (!d?.updateMany) return { count: 0 };
  try {
    return await d.updateMany({ where, data });
  } catch {
    return { count: 0 };
  }
}

async function findCanonicalUserByName(name) {
  // find the @t_burgerme.local user by normalized local-part
  const local = name.toLowerCase().replace(/\s+/g, '');
  const email = `${local}${NEW_DOMAIN}`;
  return prisma.user.findFirst({ where: { tenantId: TENANT_ID, email } });
}

function localPart(email) {
  return email
    .split('@')[0]
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '');
}

async function main() {
  console.log(
    `🔗 Relink related rows to canonical users and delete old *@${OLD_DOMAIN.replace('@', '')} (DRY_RUN=${DRY_RUN})`,
  );

  const oldUsers = await prisma.user.findMany({
    where: { tenantId: TENANT_ID, email: { endsWith: OLD_DOMAIN } },
    select: { id: true, email: true },
  });

  let relinked = 0,
    deleted = 0,
    skipped = 0;

  for (const oldU of oldUsers) {
    // figure out canonical (new domain) match by local-part
    const lp = localPart(oldU.email);
    const candidateEmail = `${lp}${NEW_DOMAIN}`;
    const newU = await prisma.user.findFirst({
      where: { tenantId: TENANT_ID, email: candidateEmail },
      select: { id: true, email: true },
    });

    if (!newU) {
      console.log(
        `⏭️  Skip ${oldU.email} — no canonical user (${candidateEmail}) found`,
      );
      skipped++;
      continue;
    }

    // Relink related tables
    let totalRelinkedForUser = 0;
    for (const { name, field } of RELINK_MODELS) {
      const where = { tenantId: TENANT_ID, [field]: oldU.id };
      const data = { [field]: newU.id };
      if (DRY_RUN) {
        // Count only
        const d = prisma[name];
        const count = d?.count ? await d.count({ where }) : 0;
        if (count)
          console.log(
            `🧾 DRY RUN: would relink ${count} ${name} → ${newU.email}`,
          );
        totalRelinkedForUser += count;
      } else {
        const { count } = await safeUpdateMany(name, where, data);
        if (count) console.log(`🔄 Relinked ${count} ${name} → ${newU.email}`);
        totalRelinkedForUser += count;
      }
    }

    // After relink, if there is still an Employee row, remove it (should already be removed)
    const empCount = await prisma.employee.count({
      where: { tenantId: TENANT_ID, userId: oldU.id },
    });
    if (empCount > 0 && !DRY_RUN) {
      await prisma.employee.deleteMany({
        where: { tenantId: TENANT_ID, userId: oldU.id },
      });
    }

    // Try deleting old user
    if (DRY_RUN) {
      console.log(`🧾 DRY RUN: would delete user ${oldU.email}`);
    } else {
      try {
        await prisma.user.delete({ where: { id: oldU.id } });
        console.log(`🗑️  Deleted old user ${oldU.email}`);
        deleted++;
      } catch (e) {
        console.log(
          `⚠️  Couldn’t delete ${oldU.email}: ${e.code || e.message}`,
        );
        skipped++;
        continue;
      }
    }

    relinked += totalRelinkedForUser;
  }

  console.log(
    `✅ Done. Relinked rows: ${relinked}, Users deleted: ${deleted}, Skipped: ${skipped}`,
  );
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
