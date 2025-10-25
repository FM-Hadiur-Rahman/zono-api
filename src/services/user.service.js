import bcrypt from 'bcryptjs';
import { prisma } from '../services/prisma.js';

export const findUserByEmail = (email) =>
  prisma.user.findUnique({ where: { email } });

export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

export const seedDemoData = async () => {
  const pw = await bcrypt.hash('password', 10);

  const tenant = await prisma.tenant.upsert({
    where: { id: 't1' },
    update: {},
    create: { id: 't1', name: 'BurgerMe – Mülheim', plan: 'Standard' },
  });

  const users = await prisma.$transaction([
    prisma.user.upsert({
      where: { email: 'admin@zonoapp.com' },
      update: {},
      create: {
        email: 'admin@zonoapp.com',
        passwordHash: pw,
        role: 'zono_admin',
      },
    }),
    prisma.user.upsert({
      where: { email: 'owner@burgerme.local' },
      update: {},
      create: {
        email: 'owner@burgerme.local',
        passwordHash: pw,
        role: 'tenant_admin',
        tenantId: tenant.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'manager@burgerme.local' },
      update: {},
      create: {
        email: 'manager@burgerme.local',
        passwordHash: pw,
        role: 'manager',
        tenantId: tenant.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'employee@burgerme.local' },
      update: {},
      create: {
        email: 'employee@burgerme.local',
        passwordHash: pw,
        role: 'employee',
        tenantId: tenant.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'rider@burgerme.local' },
      update: {},
      create: {
        email: 'rider@burgerme.local',
        passwordHash: pw,
        role: 'rider',
        tenantId: tenant.id,
      },
    }),
  ]);

  return { tenant, users };
};
