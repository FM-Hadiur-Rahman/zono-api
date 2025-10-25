import { prisma } from '../services/prisma.js';

// GET /inventory/items
export const listItems = async (req, res) => {
  const { take = 100, skip = 0, q } = req.validated;
  const where = { tenantId: req.user.tenantId };

  if (q?.trim()) {
    // optional simple search on name/sku
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
    ];
  }

  const rows = await prisma.inventoryItem.findMany({
    where,
    take,
    skip,
    orderBy: { createdAt: 'desc' },
  });

  res.json(rows);
};

// POST /inventory/items
export const createItem = async (req, res) => {
  const { name, sku, lowStockThreshold = 0, locationId } = req.validated;

  const row = await prisma.inventoryItem.create({
    data: {
      name,
      sku: sku ?? null,
      lowStockThreshold,
      locationId: locationId ?? null,
      tenantId: req.user.tenantId,
    },
  });

  res.status(201).json(row);
};

// POST /inventory/levels/:itemId
export const createLevel = async (req, res) => {
  const { itemId } = req.validatedParts.params;
  const { qtyOnHand } = req.validatedParts.body;

  // ensure item belongs to tenant
  const item = await prisma.inventoryItem.findFirst({
    where: { id: itemId, tenantId: req.user.tenantId },
    select: { id: true },
  });
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const level = await prisma.inventoryLevel.create({
    data: {
      itemId,
      qtyOnHand,
      tenantId: req.user.tenantId,
    },
  });

  res.status(201).json(level);
};

// GET /inventory/alerts/low-stock
export const listLowStockAlerts = async (req, res) => {
  const rows = await prisma.lowStockAlert.findMany({
    where: { tenantId: req.user.tenantId, resolvedAt: null },
    include: { item: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(rows);
};
