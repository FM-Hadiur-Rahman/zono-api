// src/controllers/attendanceController.js
import { prisma } from '../services/prisma.js';

/**
 * POST /attendance/clock-in
 * body: { employeeId }
 */
export const clockIn = async (req, res) => {
  const { employeeId } = req.body || {};
  if (!employeeId)
    return res.status(400).json({ error: 'employeeId required' });

  // Ensure employee belongs to the same tenant
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, tenantId: true },
  });
  if (!employee || employee.tenantId !== req.user.tenantId) {
    return res.status(404).json({ error: 'Employee not found in your tenant' });
  }

  // Prevent double clock-in: last event must not be an open clock_in
  const last = await prisma.attendanceEvent.findFirst({
    where: { employeeId, tenantId: req.user.tenantId },
    orderBy: { ts: 'desc' },
  });
  if (last && last.type === 'clock_in') {
    return res.status(409).json({ error: 'Already clocked in' });
  }

  const ev = await prisma.attendanceEvent.create({
    data: { employeeId, type: 'clock_in', tenantId: req.user.tenantId },
  });
  return res.status(201).json(ev);
};

/**
 * POST /attendance/clock-out
 * body: { employeeId }
 */
export const clockOut = async (req, res) => {
  const { employeeId } = req.body || {};
  if (!employeeId)
    return res.status(400).json({ error: 'employeeId required' });

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, tenantId: true },
  });
  if (!employee || employee.tenantId !== req.user.tenantId) {
    return res.status(404).json({ error: 'Employee not found in your tenant' });
  }

  // Must be currently clocked in to clock out
  const last = await prisma.attendanceEvent.findFirst({
    where: { employeeId, tenantId: req.user.tenantId },
    orderBy: { ts: 'desc' },
  });
  if (!last || last.type !== 'clock_in') {
    return res.status(409).json({ error: 'Not currently clocked in' });
  }

  const ev = await prisma.attendanceEvent.create({
    data: { employeeId, type: 'clock_out', tenantId: req.user.tenantId },
  });
  return res.status(201).json(ev);
};

/**
 * GET /attendance/daily?date=YYYY-MM-DD
 */
export const getDaily = async (req, res) => {
  const { date } = req.query;
  const d = date ? new Date(date) : new Date();
  const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const d1 = new Date(d0);
  d1.setDate(d1.getDate() + 1);

  const rows = await prisma.attendanceEvent.findMany({
    where: {
      tenantId: req.user.tenantId,
      ts: { gte: d0, lt: d1 },
    },
    include: { employee: true },
    orderBy: { ts: 'asc' },
  });

  return res.json(rows);
};
