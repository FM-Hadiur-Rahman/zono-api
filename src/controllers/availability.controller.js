// src/controllers/availability.controller.js
import { prisma } from '../services/prisma.js';

const startOfDayUTC = (d) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

// GET /availability/me?from=YYYY-MM-DD&to=YYYY-MM-DD
export const listMyAvailability = async (req, res) => {
  if (!req.user?.id || !req.user?.tenantId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const employee = await prisma.employee.findFirst({
    where: { userId: req.user.id, tenantId: req.user.tenantId },
    select: { id: true },
  });
  if (!employee)
    return res.status(404).json({ error: 'No employee profile found' });

  const from = startOfDayUTC(req.query.from);
  // Treat "to" as exclusive if the client passes Monday→next Monday
  const toExclusive = startOfDayUTC(new Date(req.query.to));

  const availability = await prisma.availability.findMany({
    where: {
      tenantId: req.user.tenantId,
      employeeId: employee.id,
      date: { gte: from, lt: toExclusive },
    },
    orderBy: { date: 'asc' },
  });

  res.json({ availability });
};

// POST /availability  { date:'YYYY-MM-DD', start:'HH:mm', end:'HH:mm', note? }
export const upsertMyAvailability = async (req, res) => {
  if (!req.user?.id || !req.user?.tenantId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const employee = await prisma.employee.findFirst({
    where: { userId: req.user.id, tenantId: req.user.tenantId },
    select: { id: true },
  });
  if (!employee)
    return res.status(404).json({ error: 'No employee profile found' });

  const date = startOfDayUTC(req.body.date);

  // If you have a unique constraint (tenantId, employeeId, date), you can do upsert.
  // If not, just create().
  const created = await prisma.availability.create({
    data: {
      tenantId: req.user.tenantId,
      employeeId: employee.id,
      date,
      start: req.body.start,
      end: req.body.end,
      note: req.body.note || null,
    },
  });

  res.status(201).json(created);
};

// DELETE /availability/:id
export const deleteMyAvailability = async (req, res) => {
  if (!req.user?.id || !req.user?.tenantId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const employee = await prisma.employee.findFirst({
    where: { userId: req.user.id, tenantId: req.user.tenantId },
    select: { id: true },
  });
  if (!employee)
    return res.status(404).json({ error: 'No employee profile found' });

  const target = await prisma.availability.findUnique({
    where: { id: req.params.id },
  });
  if (
    !target ||
    target.tenantId !== req.user.tenantId ||
    target.employeeId !== employee.id
  ) {
    return res.status(404).json({ error: 'Availability not found' });
  }

  await prisma.availability.delete({ where: { id: req.params.id } });
  res.status(204).end();
};

// (Managers) GET /availability?from=...&to=...&employeeId?=...
export const listAvailability = async (req, res) => {
  if (!req.user?.tenantId)
    return res.status(401).json({ error: 'Unauthorized' });

  const from = startOfDayUTC(req.query.from);
  const toExclusive = startOfDayUTC(new Date(req.query.to));

  const where = {
    tenantId: req.user.tenantId,
    date: { gte: from, lt: toExclusive },
  };
  if (req.query.employeeId) where.employeeId = req.query.employeeId;

  const availability = await prisma.availability.findMany({
    where,
    orderBy: [{ employeeId: 'asc' }, { date: 'asc' }],
  });

  res.json({ availability });
};
