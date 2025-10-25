// ESM
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// SETTINGS
const TENANT_ID = 't_burgerme';
const PREFER_DOMAIN = '@t_burgerme.local';
const DRY_RUN = false; // set true to preview only
const DELETE_ORPHAN_USERS = false; // set true to delete users who end up with 0 employees

function normName(n) {
  return (n || '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function sortOldestFirst(a, b) {
  if (a.createdAt && b.createdAt) return a.createdAt - b.createdAt;
  return String(a.id).localeCompare(String(b.id));
}

async function main() {
  console.log(
    `🔧 Merge employee dupes for ${TENANT_ID} (prefer ${PREFER_DOMAIN}) DRY_RUN=${DRY_RUN}`,
  );

  // pull employees + their users for the tenant
  const emps = await prisma.employee.findMany({
    where: { tenantId: TENANT_ID },
    select: {
      id: true,
      tenantId: true,
      userId: true,
      name: true,
      createdAt: true,
      user: { select: { id: true, email: true, createdAt: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // group by normalized name
  const byName = new Map();
  for (const e of emps) {
    const key = normName(e.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(e);
  }

  const toDeleteEmpIds = [];
  const maybeDeleteUserIds = new Set();

  for (const [nameKey, list] of byName.entries()) {
    if (list.length <= 1) continue;

    // choose canonical "keeper" employee by email preference, else oldest
    const withPreferred = list.filter((e) =>
      e.user?.email?.endsWith(PREFER_DOMAIN),
    );
    let keep =
      withPreferred.sort(sortOldestFirst)[0] ||
      list.slice().sort(sortOldestFirst)[0];
    const del = list.filter((e) => e.id !== keep.id);

    if (del.length) {
      console.log(
        `• "${nameKey}" keep EMP ${keep.id} (${keep.user?.email}), delete EMPs ${del.map((d) => `${d.id}(${d.user?.email})`).join(', ')}`,
      );
      toDeleteEmpIds.push(...del.map((d) => d.id));
      // users tied to the deleted employees become candidates for orphan removal
      del.forEach((d) => maybeDeleteUserIds.add(d.userId));
    }
  }

  // Apply employee deletes
  if (toDeleteEmpIds.length === 0) {
    console.log('✅ No duplicate Employees to delete.');
  } else if (DRY_RUN) {
    console.log(
      `🧾 DRY RUN: would delete ${toDeleteEmpIds.length} Employee rows.`,
    );
  } else {
    await prisma.employee.deleteMany({ where: { id: { in: toDeleteEmpIds } } });
    console.log(`🧹 Deleted ${toDeleteEmpIds.length} Employee rows.`);
  }

  // Optionally delete orphan Users (those now with zero employees)
  if (!DRY_RUN && DELETE_ORPHAN_USERS && maybeDeleteUserIds.size) {
    // keep only those truly orphaned (no Employee rows left)
    const orphanIds = [];
    for (const uid of maybeDeleteUserIds) {
      const c = await prisma.employee.count({
        where: { tenantId: TENANT_ID, userId: uid },
      });
      if (c === 0) orphanIds.push(uid);
    }
    if (orphanIds.length) {
      // ⚠️ If other tables reference userId, add checks before deleting!
      await prisma.user.deleteMany({ where: { id: { in: orphanIds } } });
      console.log(`🗑️ Deleted ${orphanIds.length} orphan User(s).`);
    }
  }

  console.log('✅ Merge complete.');
}

main()
  .catch((e) => {
    console.error('❌ Merge failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
