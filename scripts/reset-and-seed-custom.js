import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'demo';
const HASH_ROUNDS = 12;

// Tenants to create
const tenants = [
  { id: 't_burgerme', name: 'BurgerMe', subdomain: 'burgerme' },
  { id: 't_mrbacker', name: 'Mr. Backer', subdomain: 'mrbacker' },
];

// Owners/Admins (role = tenant_admin)
const owners = [
  // email, name, tenantId
  { email: 'ara@burgerme.local', name: 'Ara', tenantId: 't_burgerme' },
  { email: 'rasan@mrbacker.local', name: 'Rasan', tenantId: 't_mrbacker' },
];

// BurgerMe employees
const riders = [
  'F M Hadiur Rahman',
  'Mehedi Emon',
  'Tanvir Anik',
  'Alex',
  'Salie Miaz',
  'Piyush',
  'Sunny Satter',
  'Wasim',
];

const kitchen = [
  'Nihal Nallari',
  'Vijeta Saini',
  'Phylo',
  'Bishant',
  'Mahmud',
  'Hamja',
];

async function main() {
  console.log(
    '⚠️  Resetting users/employees for target tenants and reseeding…',
  );

  // 0) Make sure tenants exist (create or update)
  for (const t of tenants) {
    await prisma.tenant.upsert({
      where: { id: t.id },
      update: {
        name: t.name,
        subdomain: t.subdomain,
        status: 'active',
        plan: 'Standard',
      },
      create: {
        id: t.id, // String id is fine in your schema
        name: t.name,
        subdomain: t.subdomain,
        status: 'active',
        plan: 'Standard',
        locations: { create: [{ name: 'Main', timezone: 'Europe/Berlin' }] },
      },
    });
  }

  // 1) Delete employees first (FKs), then users for these tenants
  await prisma.employee.deleteMany({
    where: { tenantId: { in: tenants.map((t) => t.id) } },
  });

  // keep zono_admin if you have one (it usually has tenantId null or t1)
  await prisma.user.deleteMany({
    where: {
      tenantId: { in: tenants.map((t) => t.id) },
      NOT: { role: 'zono_admin' },
    },
  });

  // Also clear invitations for these tenants
  await prisma.invitation.deleteMany({
    where: { tenantId: { in: tenants.map((t) => t.id) } },
  });

  const passwordHash = await bcrypt.hash(PASSWORD, HASH_ROUNDS);

  // 2) Create owners/admins (tenant_admin role)
  for (const o of owners) {
    await prisma.user.create({
      data: {
        email: o.email.toLowerCase(),
        passwordHash,
        role: 'tenant_admin',
        tenantId: o.tenantId,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`✅ Owner/Admin: ${o.name} <${o.email}> (${o.tenantId})`);
  }

  // 3) Seed BurgerMe team (riders + kitchen)
  const burgerTenantId = 't_burgerme';

  // Riders
  for (const name of riders) {
    // create a user (role 'rider') + employee record
    const email = name.toLowerCase().replace(/\s+/g, '.') + '@burgerme.local';
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'rider',
        tenantId: burgerTenantId,
        emailVerifiedAt: new Date(),
      },
      select: { id: true },
    });

    await prisma.employee.create({
      data: {
        tenantId: burgerTenantId,
        userId: user.id,
        name,
        role: 'rider',
        status: 'Available',
      },
    });
    console.log(`👤 Rider: ${name}`);
  }

  // Kitchen (use role 'cook' in Employee + User 'employee' or 'cook'—we’ll use 'employee' for User, 'cook' for Employee)
  for (const name of kitchen) {
    const email = name.toLowerCase().replace(/\s+/g, '.') + '@burgerme.local';
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'employee', // app-level role
        tenantId: burgerTenantId,
        emailVerifiedAt: new Date(),
      },
      select: { id: true },
    });

    await prisma.employee.create({
      data: {
        tenantId: burgerTenantId,
        userId: user.id,
        name,
        role: 'cook', // on-floor function
        status: 'Available',
      },
    });
    console.log(`👨‍🍳 Kitchen: ${name}`);
  }

  console.log('🎉 Done. All passwords:', PASSWORD);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
