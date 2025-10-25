import { sendMail } from '../services/mailer.service.js';
import { prisma } from '../services/prisma.js';
import { audit } from '../utils/audit.js';
import { buildShiftIcs } from '../utils/ics.js';
import { emitToUser } from '../realtime/socket.js';

// Utility: build [d0, d1) for a given YYYY-MM-DD (server local TZ)
const dayBounds = (yyyyMmDd) => {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const d0 = new Date(y, m - 1, d, 0, 0, 0, 0);
  const d1 = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { d0, d1 };
};

// GET /shifts?date=YYYY-MM-DD&take=&skip=
export const listShifts = async (req, res) => {
  const { date, take = 100, skip = 0 } = req.validated;
  const where = { tenantId: req.user.tenantId };

  if (date) {
    const { d0, d1 } = dayBounds(date);
    where.date = { gte: d0, lt: d1 };
  }

  const rows = await prisma.shift.findMany({
    where,
    include: { employee: true },
    take,
    skip,
    orderBy: [{ date: 'desc' }, { start: 'asc' }],
  });

  res.json(rows);
};

// POST /shifts
export const createShift = async (req, res) => {
  const { employeeId, date, start, end, role = 'Staff' } = req.validated;

  // 1) tenant guard
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId: req.user.tenantId },
    select: { id: true },
  });
  if (!employee)
    return res.status(404).json({ error: 'Employee not found in your tenant' });

  // 2) normalize day + useful strings
  const { d0 } = dayBounds(date);
  const dateISO = d0.toISOString().slice(0, 10); // YYYY-MM-DD

  // 3) time sanity
  if (start >= end)
    return res.status(400).json({ error: 'end must be after start' });

  // 4) overlap check
  const overlap = await prisma.shift.findFirst({
    where: {
      tenantId: req.user.tenantId,
      employeeId,
      date: d0,
      OR: [{ AND: [{ start: { lt: end } }, { end: { gt: start } }] }],
    },
    select: { id: true },
  });
  if (overlap)
    return res.status(409).json({ error: 'Overlapping shift exists' });

  // 5) create shift
  const row = await prisma.shift.create({
    data: {
      employeeId,
      date: d0,
      start,
      end,
      role,
      tenantId: req.user.tenantId,
    },
  });

  // 6) load employee -> user to notify/email
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      userId: true, // needed for in-app notification
      name: true,
      role: true,
      user: { select: { email: true } },
    },
  });

  // 7) in-app notification (DB + realtime)
  if (emp?.userId) {
    const notif = await prisma.notification.create({
      data: {
        tenantId: req.user.tenantId,
        userId: emp.userId,
        type: 'shift.created',
        title: 'New shift assigned',
        body: `${dateISO} ${start}–${end} (${row.role})`,
      },
    });
    emitToUser(emp.userId, 'notification', notif);
  }

  // 8) optional email (+ .ics)
  if (emp?.user?.email) {
    const pretty = new Date(d0).toLocaleDateString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const subject = `New shift assigned • ${pretty} ${start}–${end}`;
    const html = `
      <p>Hi ${emp.name || 'there'},</p>
      <p>You’ve been assigned a new shift:</p>
      <ul>
        <li><b>Date:</b> ${pretty}</li>
        <li><b>Time:</b> ${start}–${end}</li>
        <li><b>Role:</b> ${row.role}</li>
        <li><b>Tenant:</b> ${req.user.tenantId}</li>
      </ul>
      <p>Open: <a href="${process.env.APP_ORIGIN || 'http://localhost:5173'}/me">My Shifts</a></p>
    `;
    const ics = buildShiftIcs({
      title: `Shift • ${row.role}`,
      date: dateISO,
      start,
      end,
      description: `Shift assigned in Zono (${req.user.tenantId})`,
    });
    await sendMail({
      to: emp.user.email,
      subject,
      html,
      attachments: [
        {
          filename: `shift-${dateISO}-${start}-${end}.ics`,
          content: ics,
          contentType: 'text/calendar; charset=utf-8',
        },
      ],
    });
  }

  await audit({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    action: 'create',
    entity: 'shift',
    entityId: row.id,
    after: row,
  });

  res.status(201).json(row);
};

// list within date range: [from, to)
export const listShiftsInRange = async (req, res) => {
  const { from, to } = req.validated;
  const { d0 } = dayBounds(from);
  const { d1 } = dayBounds(to);

  const rows = await prisma.shift.findMany({
    where: { tenantId: req.user.tenantId, date: { gte: d0, lt: d1 } },
    include: { employee: true },
    orderBy: [{ date: 'asc' }, { start: 'asc' }],
  });
  res.json(rows);
};

// list for one employee within a range
export const listEmployeeShifts = async (req, res) => {
  const { employeeId } = req.validatedParts.params;
  const { from, to } =
    req.validatedParts.body ?? req.validatedParts.query ?? req.validated; // defensive
  const { d0 } = dayBounds(from);
  const { d1 } = dayBounds(to);

  // tenant guard on employee
  const okEmp = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId: req.user.tenantId },
    select: { id: true },
  });
  if (!okEmp)
    return res.status(404).json({ error: 'Employee not found in your tenant' });

  const rows = await prisma.shift.findMany({
    where: {
      tenantId: req.user.tenantId,
      employeeId,
      date: { gte: d0, lt: d1 },
    },
    include: { employee: true },
    orderBy: [{ date: 'asc' }, { start: 'asc' }],
  });
  res.json(rows);
};

// PATCH /shifts/:id
export const updateShift = async (req, res) => {
  const { id } = req.validatedParts.params;
  const { employeeId, date, start, end, role } = req.validatedParts.body;

  const existing = await prisma.shift.findFirst({
    where: { id, tenantId: req.user.tenantId },
  });
  if (!existing) return res.status(404).json({ error: 'Shift not found' });

  // optional tenant guard if employeeId changed
  if (employeeId) {
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId: req.user.tenantId },
      select: { id: true },
    });
    if (!emp)
      return res
        .status(404)
        .json({ error: 'Employee not found in your tenant' });
  }

  // normalize date if provided
  let normalizedDate = undefined;
  if (date) normalizedDate = dayBounds(date).d0;

  // if times provided, ensure start<end
  const _start = start ?? existing.start;
  const _end = end ?? existing.end;
  if (_start >= _end)
    return res.status(400).json({ error: 'end must be after start' });

  // overlap check if employeeId/date/start/end changed
  const targetEmployeeId = employeeId ?? existing.employeeId;
  const targetDate = normalizedDate ?? existing.date;
  const overlap = await prisma.shift.findFirst({
    where: {
      tenantId: req.user.tenantId,
      employeeId: targetEmployeeId,
      date: targetDate,
      id: { not: id },
      OR: [{ AND: [{ start: { lt: _end } }, { end: { gt: _start } }] }],
    },
    select: { id: true },
  });
  if (overlap)
    return res.status(409).json({ error: 'Overlapping shift exists' });

  const row = await prisma.shift.update({
    where: { id },
    data: {
      ...(employeeId && { employeeId }),
      ...(normalizedDate && { date: normalizedDate }),
      ...(start && { start }),
      ...(end && { end }),
      ...(role && { role }),
    },
  });

  await audit({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    action: 'update',
    entity: 'shift',
    entityId: id,
    after: row,
  });

  res.json(row);
};

// DELETE /shifts/:id
export const deleteShift = async (req, res) => {
  const { id } = req.validatedParts.params;

  const row = await prisma.shift.findFirst({
    where: { id, tenantId: req.user.tenantId },
  });
  if (!row) return res.status(404).json({ error: 'Shift not found' });

  await prisma.shift.delete({ where: { id } });

  await audit({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    action: 'delete',
    entity: 'shift',
    entityId: id,
    before: row,
  });

  res.json({ ok: true });
};

export const listMyShiftsInRange = async (req, res) => {
  const { from, to } = req.validated; // RangeQuery
  const { d0 } = dayBounds(from);
  const { d1 } = dayBounds(to);

  // 1) resolve the employee record for this logged-in user in this tenant
  const employee = await prisma.employee.findFirst({
    where: { userId: req.user.id, tenantId: req.user.tenantId },
    select: { id: true },
  });

  if (!employee) {
    // user has no Employee record in this tenant
    return res.json([]);
  }

  // 2) fetch shifts by employeeId (NOT userId)
  const rows = await prisma.shift.findMany({
    where: {
      tenantId: req.user.tenantId,
      employeeId: employee.id,
      date: { gte: d0, lt: d1 }, // 'to' is exclusive (next Monday)
    },
    orderBy: [{ date: 'asc' }, { start: 'asc' }],
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          role: true,
          user: { select: { email: true } }, // <- get email via relation
        },
      },
    },
  });

  // (optional) flatten employee.email for the frontend
  const result = rows.map((r) => ({
    ...r,
    employee: r.employee
      ? {
          id: r.employee.id,
          name: r.employee.name,
          role: r.employee.role,
          email: r.employee.user?.email ?? null,
        }
      : null,
  }));

  res.json(result);
};
