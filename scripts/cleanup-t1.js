// scripts/cleanup-t1.js
// ESM (package.json: { "type": "module" })
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Delete order tries to respect FKs:
 * - Events & children of shifts/users first
 * - Inventory levels before items
 * - Employees before Users (if employee.userId has FK)
 * - Locations before Tenant if FK exists
 */
async function main() {
  const tenantId = 't1';

  console.log(`🧹 Cleaning tenant "${tenantId}" (and dependents)…`);

  // If you have other tenant-scoped tables, add them here near the top.
  await prisma.attendanceEvent
    .deleteMany({ where: { tenantId } })
    .catch(() => {});
  await prisma.shiftSwap.deleteMany({ where: { tenantId } }).catch(() => {});
  await prisma.shift.deleteMany({ where: { tenantId } }).catch(() => {});
  await prisma.availability.deleteMany({ where: { tenantId } }).catch(() => {});
  await prisma.invitation.deleteMany({ where: { tenantId } }).catch(() => {});

  // Inventory
  await prisma.inventoryLevel
    .deleteMany({ where: { tenantId } })
    .catch(() => {});
  await prisma.inventoryItem
    .deleteMany({ where: { tenantId } })
    .catch(() => {});
  await prisma.lowStockAlert
    .deleteMany({ where: { tenantId } })
    .catch(() => {});

  // Misc / global-but-tenant-scoped
  await prisma.emailVerificationToken
    .deleteMany({ where: { tenantId } })
    .catch(() => {});
  await prisma.auditLog.deleteMany({ where: { tenantId } }).catch(() => {});
  await prisma.featureFlag.deleteMany({ where: { tenantId } }).catch(() => {});

  // Employees before Users (if employee.userId references user)
  await prisma.employee.deleteMany({ where: { tenantId } }).catch(() => {});
  await prisma.user.deleteMany({ where: { tenantId } }).catch(() => {});

  // Location last (if it references tenant)
  await prisma.location.deleteMany({ where: { tenantId } }).catch(() => {});

  // Finally the tenant row
  await prisma.tenant.deleteMany({ where: { id: tenantId } });

  console.log('✅ Removed tenant t1 and related data.');
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
