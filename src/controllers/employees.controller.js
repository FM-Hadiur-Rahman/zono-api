import { prisma } from '../services/prisma.js';
import { audit } from '../utils/audit.js';

// helper: resolve tenant for current user
const resolveTenantId = (req, explicitTenantId) => {
  // tenant-bound users have req.user.tenantId; zono_admin must pass ?tenantId or body.tenantId
  return req.user?.tenantId || explicitTenantId || null;
};

/** GET /employees */
export const listEmployees = async (req, res) => {
  // req.validated contains { tenantId? } from ListEmployeesQuerySchema
  const tenantId = resolveTenantId(req, req.validated?.tenantId);
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

  // Optional: pagination (defaults)
  const take = Math.min(Number(req.query.take) || 100, 500);
  const skip = Number(req.query.skip) || 0;

  const rows = await prisma.employee.findMany({
    where: { tenantId },
    take,
    skip,
    orderBy: { createdAt: 'desc' },
  });
  res.json(rows);
};

/** POST /employees */
export const createEmployee = async (req, res) => {
  const { name, role, status = 'Available', locationId } = req.validated;
  const tenantId = resolveTenantId(req, req.validated?.tenantId);
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

  const row = await prisma.employee.create({
    data: { name, role, status, locationId, tenantId },
  });

  // fire-and-forget audit (await to keep it simple/consistent; wrap in try/catch if you want it non-blocking)
  await audit({
    tenantId,
    userId: req.user.id,
    action: 'create',
    entity: 'employee',
    entityId: row.id,
    after: row,
  });

  res.status(201).json(row);
};
