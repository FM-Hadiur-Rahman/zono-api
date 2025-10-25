// src/controllers/adminController.js
import { prisma } from '../services/prisma.js';

/** GET /admin/tenants */
export const listTenants = async (req, res) => {
  // optional pagination (defaults)
  const take = Math.min(Number(req.query.take) || 50, 200);
  const skip = Number(req.query.skip) || 0;

  const rows = await prisma.tenant.findMany({
    include: { locations: true },
    take,
    skip,
    orderBy: { createdAt: 'desc' },
  });

  res.json(rows);
};

/** GET /admin/tenants/:id */
export const getTenant = async (req, res) => {
  const t = await prisma.tenant.findUnique({
    where: { id: req.params.id },
    include: { features: true, locations: true },
  });
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
};

/** PATCH /admin/tenants/:id/features */
export const patchTenantFeatures = async (req, res) => {
  const { features = {} } = req.body || {};
  const tenantId = req.params.id;

  // Upsert all flags atomically
  const ops = Object.entries(features).map(([key, enabled]) =>
    prisma.featureFlag.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: { enabled: !!enabled },
      create: { tenantId, key, enabled: !!enabled },
    }),
  );
  await prisma.$transaction(ops);

  res.json({ ok: true });
};
