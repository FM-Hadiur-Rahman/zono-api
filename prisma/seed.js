// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── config ─────────────────────────────────────────────────────────────────────
const DEMO_PASSWORD = 'demo';
const HASH_ROUNDS = 10;

// Tenants to create
const TENANTS = [
  {
    id: 't_burgerme',
    name: 'BurgerMe',
    subdomain: 'burgerme-mh',
    owner: { name: 'Ara', email: 'ara@burgerme.local' }, // tenant_admin
    riders: [
      'F M Hadiur Rahman',
      'Mehedi Emon',
      'Tanvir Anik',
      'Alex',
      'Salie Miaz',
      'Piyush',
      'Sunny Satter',
      'Wasim',
    ],
    kitchen: [
      'Nihal Nallari',
      'Vijeta Saini',
      'Phylo',
      'Bishant',
      'Mahmud',
      'Hamja',
    ],
    // optional core team for this tenant (manager/employee demo)
    extras: [
      {
        name: 'Manager BurgerMe',
        email: 'manager@burgerme.local',
        role: 'manager',
        makeEmployee: true,
      },
      {
        name: 'Employee BurgerMe',
        email: 'employee@burgerme.local',
        role: 'employee',
        makeEmployee: true,
      },
    ],
  },
  {
    id: 't_mrbacker',
    name: 'MrBacker',
    subdomain: 'mrbacker',
    owner: { name: 'Rasan', email: 'rasan@mrbacker.local' }, // tenant_admin
    riders: ['Rahman', 'Alex', 'Tanvir', 'Mehedi'], // keep it shorter or duplicate from above if you want
    kitchen: ['Vijeta', 'Mahmud', 'Nihal', 'Hamja'],
    extras: [
      {
        name: 'Manager MrBacker',
        email: 'manager@mrbacker.local',
        role: 'manager',
        makeEmployee: true,
      },
      {
        name: 'Employee MrBacker',
        email: 'employee@mrbacker.local',
        role: 'employee',
        makeEmployee: true,
      },
    ],
  },
];

// Global user (outside the “list per tenant”)
const GLOBAL_USERS = [
  {
    name: 'Zono Admin',
    email: 'admin@zonoapp.com',
    role: 'zono_admin',
    // Optional: attach to a default tenant so your user table’s tenantId isn’t null.
    // If you prefer null/optional, adjust the model or this code accordingly.
    attachToTenantId: 't_burgerme',
    makeEmployee: false,
  },
];

// ── helpers ───────────────────────────────────────────────────────────────────
const emailFromName = (name, tenantId) =>
  `${name.toLowerCase().replace(/\s+/g, '')}@${tenantId}.local`;

async function upsertTenant({ id, name, subdomain }) {
  return prisma.tenant.upsert({
    where: { id },
    update: {},
    create: {
      id,
      name,
      plan: 'Standard',
      status: 'active',
      subdomain,
    },
  });
}

async function upsertUser({ email, role, tenantId, passwordHash }) {
  return prisma.user.upsert({
    where: { email }, // email is unique across all tenants; keep addresses unique
    update: {
      role,
      tenantId,
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    create: {
      email,
      role,
      tenantId,
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    select: { id: true, email: true },
  });
}

async function ensureEmployee({ tenantId, userId, name, role }) {
  const exists = await prisma.employee.findFirst({
    where: { tenantId, userId },
    select: { id: true },
  });
  if (!exists) {
    await prisma.employee.create({
      data: {
        tenantId,
        userId,
        name,
        role,
        status: 'Available',
      },
    });
  }
}

async function seedTenant(tenantCfg, passwordHash) {
  const tenant = await upsertTenant(tenantCfg);

  // Owner (tenant_admin) – usually not an employee
  const ownerUser = await upsertUser({
    email: tenantCfg.owner.email,
    role: 'tenant_admin',
    tenantId: tenant.id,
    passwordHash,
  });
  console.log(
    `  ✅ Owner/Admin: ${tenantCfg.owner.name} <${tenantCfg.owner.email}> (${tenant.id})`,
  );

  // Extras (e.g., manager/employee demo accounts)
  for (const ex of tenantCfg.extras ?? []) {
    const u = await upsertUser({
      email: ex.email,
      role: ex.role,
      tenantId: tenant.id,
      passwordHash,
    });
    if (ex.makeEmployee) {
      await ensureEmployee({
        tenantId: tenant.id,
        userId: u.id,
        name: ex.name,
        role: ex.role,
      });
    }
    console.log(`  👤 ${ex.role}: ${ex.name} (${ex.email})`);
  }

  // Riders
  for (const name of tenantCfg.riders ?? []) {
    const email = emailFromName(name, tenant.id);
    const u = await upsertUser({
      email,
      role: 'rider',
      tenantId: tenant.id,
      passwordHash,
    });
    await ensureEmployee({
      tenantId: tenant.id,
      userId: u.id,
      name,
      role: 'rider',
    });
    console.log(`  🛵 Rider: ${name} (${email})`);
  }

  // Kitchen
  for (const name of tenantCfg.kitchen ?? []) {
    const email = emailFromName(name, tenant.id);
    const u = await upsertUser({
      email,
      role: 'kitchen',
      tenantId: tenant.id,
      passwordHash,
    });
    await ensureEmployee({
      tenantId: tenant.id,
      userId: u.id,
      name,
      role: 'kitchen',
    });
    console.log(`  👨‍🍳 Kitchen: ${name} (${email})`);
  }
}

async function seedGlobalUsers(passwordHash) {
  for (const gu of GLOBAL_USERS) {
    const tenantId = gu.attachToTenantId ?? TENANTS[0]?.id; // attach somewhere valid
    const u = await upsertUser({
      email: gu.email,
      role: gu.role,
      tenantId,
      passwordHash,
    });
    if (gu.makeEmployee) {
      await ensureEmployee({
        tenantId,
        userId: u.id,
        name: gu.name,
        role: gu.role,
      });
    }
    console.log(`  🌐 ${gu.role}: ${gu.name} (${gu.email})`);
  }
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding tenants, users, and employees…');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, HASH_ROUNDS);

  // Seed each tenant atomically (per-tenant)
  for (const t of TENANTS) {
    await prisma.$transaction(async (tx) => {
      // We still call the same prisma instance inside to keep code simple;
      // if you want strict tx usage, you can thread tx through all helpers.
      await seedTenant(t, passwordHash);
    });
  }

  // Global user(s)
  await seedGlobalUsers(passwordHash);

  console.log('✅ Done! You can now log in with password:', DEMO_PASSWORD);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
