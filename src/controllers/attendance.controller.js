import { prisma } from '../services/prisma.js';

/* ---- time helpers ---- */
const TZ = process.env.BUSINESS_TZ || 'Europe/Berlin';
const LATE_GRACE_MIN = Number(process.env.LATE_GRACE_MIN || 5);
const EARLY_GRACE_MIN = Number(process.env.EARLY_GRACE_MIN || 5);

function normalizeDay(d = new Date(), tz = TZ) {
  // returns UTC Date for local 00:00 in tz (safe for unique constraint)
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  return new Date(`${s}T00:00:00Z`);
}
const minutesBetween = (a, b) => Math.max(0, Math.round((b - a) / 60000));

/* ---- GET /api/attendance?date=YYYY-MM-DD&search= ---- */
export async function listAttendance(req, res) {
  const tenantId = req.user.tenantId;
  const dateStr = req.query.date;
  const day = normalizeDay(dateStr ? new Date(dateStr) : new Date());
  const search = String(req.query.search || '').trim();

  const where = { tenantId, date: day };
  const rows = await prisma.attendanceEvent.findMany({
    where: search
      ? {
          ...where,
          employee: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { role: { contains: search, mode: 'insensitive' } },
            ],
          },
        }
      : where,
    include: { employee: true, shift: true },
    orderBy: { employee: { name: 'asc' } },
  });

  res.json({ ok: true, data: rows });
}

/* ---- POST /api/attendance/clock-in ----
   body: { employeeId, shiftId?, lat?, lng?, source? }
--------------------------------------------------- */
export async function clockIn(req, res) {
  const tenantId = req.user.tenantId;
  const { employeeId, shiftId, lat, lng, source = 'web' } = req.body;

  // employee can only clock themselves; admins can clock anyone
  const isAdmin =
    req.user.role === 'tenant_admin' || req.user.role === 'manager';
  if (!isAdmin && req.user.employeeId !== employeeId) {
    return res.status(403).json({ error: 'Not allowed' });
  }

  const now = new Date();
  const day = normalizeDay(now);

  // calc status (late?) if shift provided
  let status = 'working';
  if (shiftId) {
    const sh = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (sh?.start) {
      const lateBy = minutesBetween(new Date(sh.start), now);
      if (lateBy > LATE_GRACE_MIN) status = 'late';
    }
  }

  const row = await prisma.attendanceEvent.upsert({
    where: { tenantId_employeeId_date: { tenantId, employeeId, date: day } },
    update: {
      shiftId: shiftId ?? undefined,
      clockInAt: now,
      clockInSrc: source,
      clockInLat: lat ?? undefined,
      clockInLng: lng ?? undefined,
      status,
    },
    create: {
      tenantId,
      employeeId,
      shiftId: shiftId ?? undefined,
      date: day,
      clockInAt: now,
      clockInSrc: source,
      clockInLat: lat ?? undefined,
      clockInLng: lng ?? undefined,
      status,
    },
  });

  res.json({ ok: true, data: row });
}

/* ---- POST /api/attendance/clock-out ----
   body: { employeeId, lat?, lng?, source? }
------------------------------------------- */
export async function clockOut(req, res) {
  const tenantId = req.user.tenantId;
  const { employeeId, lat, lng, source = 'web' } = req.body;

  const isAdmin =
    req.user.role === 'tenant_admin' || req.user.role === 'manager';
  if (!isAdmin && req.user.employeeId !== employeeId) {
    return res.status(403).json({ error: 'Not allowed' });
  }

  const now = new Date();
  const day = normalizeDay(now);

  const rec = await prisma.attendanceEvent.findUnique({
    where: { tenantId_employeeId_date: { tenantId, employeeId, date: day } },
    include: { shift: true },
  });

  if (!rec?.clockInAt) return res.status(409).json({ error: 'Not clocked in' });
  if (rec.clockOutAt)
    return res.status(409).json({ error: 'Already clocked out' });

  let status = 'present';
  const mins = minutesBetween(new Date(rec.clockInAt), now);

  if (rec.shift?.end) {
    const early = minutesBetween(now, new Date(rec.shift.end)) * -1; // positive if early
    if (early > EARLY_GRACE_MIN) status = 'left_early';
  }

  const updated = await prisma.attendanceEvent.update({
    where: { id: rec.id },
    data: {
      clockOutAt: now,
      clockOutSrc: source,
      clockOutLat: lat ?? undefined,
      clockOutLng: lng ?? undefined,
      minutes: mins,
      status,
    },
  });

  res.json({ ok: true, data: updated });
}

/* ---- PATCH /api/attendance/:id  (admin fix) ---- */
export async function editAttendance(req, res) {
  const can = req.user.role === 'tenant_admin' || req.user.role === 'manager';
  if (!can) return res.status(403).json({ error: 'Forbidden' });

  const { id } = req.params;
  const { clockInAt, clockOutAt, minutes, status, notes, shiftId } = req.body;

  const row = await prisma.attendanceEvent.update({
    where: { id },
    data: {
      clockInAt: clockInAt ? new Date(clockInAt) : undefined,
      clockOutAt: clockOutAt ? new Date(clockOutAt) : undefined,
      minutes: minutes ?? undefined,
      status: status ?? undefined,
      notes: notes ?? undefined,
      shiftId: shiftId ?? undefined,
    },
  });

  res.json({ ok: true, data: row });
}

/* ---- POST /api/attendance/mark-absent ----
   body: { date, employeeIds[] }
--------------------------------------------- */
export async function markAbsent(req, res) {
  const can = req.user.role === 'tenant_admin' || req.user.role === 'manager';
  if (!can) return res.status(403).json({ error: 'Forbidden' });

  const tenantId = req.user.tenantId;
  const day = normalizeDay(
    req.body.date ? new Date(req.body.date) : new Date(),
  );
  const ids = Array.isArray(req.body.employeeIds) ? req.body.employeeIds : [];

  await prisma.$transaction(
    ids.map((employeeId) =>
      prisma.attendanceEvent.upsert({
        where: {
          tenantId_employeeId_date: { tenantId, employeeId, date: day },
        },
        update: { status: 'absent' },
        create: { tenantId, employeeId, date: day, status: 'absent' },
      }),
    ),
  );

  res.json({ ok: true });
}

/* ---- GET /api/attendance/export?date=YYYY-MM-DD ---- */
export async function exportCSV(req, res) {
  const tenantId = req.user.tenantId;
  const day = normalizeDay(
    req.query.date ? new Date(req.query.date) : new Date(),
  );

  const rows = await prisma.attendanceEvent.findMany({
    where: { tenantId, date: day },
    include: { employee: true, shift: true },
    orderBy: { employee: { name: 'asc' } },
  });

  const lines = [
    [
      'Employee',
      'Role',
      'Date',
      'Clock In',
      'Clock Out',
      'Minutes',
      'Status',
    ].join(','),
  ];
  for (const r of rows) {
    const d = day.toISOString().slice(0, 10);
    const ci = r.clockInAt ? new Date(r.clockInAt).toISOString() : '';
    const co = r.clockOutAt ? new Date(r.clockOutAt).toISOString() : '';
    lines.push(
      [
        `"${r.employee.name}"`,
        r.employee.role,
        d,
        ci,
        co,
        r.minutes ?? '',
        r.status,
      ].join(','),
    );
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="attendance-${day.toISOString().slice(0, 10)}.csv"`,
  );
  res.send(lines.join('\n'));
}
