import { prisma } from '../services/prisma.js';
import { audit } from '../utils/audit.js';

const dayBounds = (yyyyMmDd) => {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const d0 = new Date(y, m - 1, d);
  const d1 = new Date(y, m - 1, d + 1);
  return { d0, d1 };
};

// helper: check if a time range overlaps existing shifts for employee on date
const hasOverlap = async ({
  tenantId,
  employeeId,
  date,
  start,
  end,
  excludeShiftId,
}) => {
  const overlap = await prisma.shift.findFirst({
    where: {
      tenantId,
      employeeId,
      date,
      id: excludeShiftId ? { not: excludeShiftId } : undefined,
      OR: [{ AND: [{ start: { lt: end } }, { end: { gt: start } }] }],
    },
    select: { id: true },
  });
  return !!overlap;
};

// create a swap request (from current assignee -> target employee)
export const createSwap = async (req, res) => {
  const { toEmployeeId, reason } = req.validated;
  const { id: shiftId } = req.validatedParts.params;
  const tenantId = req.user.tenantId;

  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, tenantId },
  });
  if (!shift) return res.status(404).json({ error: 'Shift not found' });

  // only current assignee or manager can initiate
  const isOwner = shift.employeeId === req.user.id;
  const isManager = ['manager', 'tenant_admin', 'zono_admin'].includes(
    req.user.role,
  );
  if (!isOwner && !isManager)
    return res.status(403).json({ error: 'Forbidden' });

  // target employee must be in tenant and not overlapping
  const targetEmp = await prisma.employee.findFirst({
    where: { id: toEmployeeId, tenantId },
    select: { id: true },
  });
  if (!targetEmp)
    return res.status(404).json({ error: 'Target employee not found' });

  const dateKey = shift.date; // already normalized
  const overlap = await hasOverlap({
    tenantId,
    employeeId: toEmployeeId,
    date: dateKey,
    start: shift.start,
    end: shift.end,
    excludeShiftId: shift.id,
  });
  if (overlap)
    return res.status(409).json({ error: 'Target has overlapping shift' });

  const reqRow = await prisma.shiftSwap.create({
    data: {
      tenantId,
      shiftId,
      fromEmployeeId: shift.employeeId,
      toEmployeeId,
      status: 'pending_target',
      reason: reason ?? null,
    },
  });

  res.status(201).json(reqRow);
};

// target employee accepts → goes to manager approval (or auto-approve if you prefer)
export const acceptSwap = async (req, res) => {
  const { id } = req.validatedParts.params;
  const swap = await prisma.shiftSwap.findFirst({
    where: { id, tenantId: req.user.tenantId },
    include: { shift: true },
  });
  if (!swap) return res.status(404).json({ error: 'Swap not found' });
  if (swap.status !== 'pending_target')
    return res.status(409).json({ error: 'Not in pending_target' });

  if (swap.toEmployeeId !== req.user.id)
    return res.status(403).json({ error: 'Only target employee can accept' });

  // Recheck overlap just in case
  const overlap = await hasOverlap({
    tenantId: swap.tenantId,
    employeeId: swap.toEmployeeId,
    date: swap.shift.date,
    start: swap.shift.start,
    end: swap.shift.end,
    excludeShiftId: swap.shiftId,
  });
  if (overlap) return res.status(409).json({ error: 'Overlapping shift' });

  const updated = await prisma.shiftSwap.update({
    where: { id },
    data: { status: 'pending_manager' },
  });

  res.json(updated);
};

// manager approves → reassign shift and close request
export const approveSwap = async (req, res) => {
  const { id } = req.validatedParts.params;
  const isManager = ['manager', 'tenant_admin', 'zono_admin'].includes(
    req.user.role,
  );
  if (!isManager) return res.status(403).json({ error: 'Forbidden' });

  const result = await prisma
    .$transaction(async (tx) => {
      const swap = await tx.shiftSwap.findFirst({
        where: { id, tenantId: req.user.tenantId },
        include: { shift: true },
      });
      if (!swap) throw new Error('404');
      if (swap.status !== 'pending_manager') throw new Error('409');

      // final overlap check
      const overlap = await tx.shift.findFirst({
        where: {
          tenantId: swap.tenantId,
          employeeId: swap.toEmployeeId,
          date: swap.shift.date,
          id: { not: swap.shiftId },
          OR: [
            {
              AND: [
                { start: { lt: swap.shift.end } },
                { end: { gt: swap.shift.start } },
              ],
            },
          ],
        },
        select: { id: true },
      });
      if (overlap) throw new Error('OVERLAP');

      const updatedShift = await tx.shift.update({
        where: { id: swap.shiftId },
        data: { employeeId: swap.toEmployeeId },
      });

      const updatedSwap = await tx.shiftSwap.update({
        where: { id: swap.id },
        data: {
          status: 'approved',
          decidedAt: new Date(),
          decidedByUserId: req.user.id,
        },
      });

      await audit({
        tenantId: swap.tenantId,
        userId: req.user.id,
        action: 'swap_approve',
        entity: 'shift',
        entityId: updatedShift.id,
        before: { employeeId: swap.fromEmployeeId },
        after: { employeeId: swap.toEmployeeId },
      });

      return { updatedShift, updatedSwap };
    })
    .catch((e) => e);

  if (result instanceof Error) {
    if (result.message === '404')
      return res.status(404).json({ error: 'Swap not found' });
    if (result.message === '409')
      return res.status(409).json({ error: 'Invalid swap state' });
    if (result.message === 'OVERLAP')
      return res.status(409).json({ error: 'Overlapping shift' });
    throw result;
  }

  res.json(result);
};

export const declineSwap = async (req, res) => {
  const { id } = req.validatedParts.params;
  const swap = await prisma.shiftSwap.findFirst({
    where: { id, tenantId: req.user.tenantId },
  });
  if (!swap) return res.status(404).json({ error: 'Swap not found' });

  // target can decline at pending_target; manager can decline at pending_manager
  const isTarget =
    swap.toEmployeeId === req.user.id && swap.status === 'pending_target';
  const isManager =
    ['manager', 'tenant_admin', 'zono_admin'].includes(req.user.role) &&
    swap.status === 'pending_manager';
  if (!isTarget && !isManager)
    return res.status(403).json({ error: 'Forbidden' });

  const updated = await prisma.shiftSwap.update({
    where: { id },
    data: {
      status: 'declined',
      decidedAt: new Date(),
      decidedByUserId: isManager ? req.user.id : null,
    },
  });

  res.json(updated);
};

export const cancelSwap = async (req, res) => {
  const { id } = req.validatedParts.params;
  const swap = await prisma.shiftSwap.findFirst({
    where: { id, tenantId: req.user.tenantId },
  });
  if (!swap) return res.status(404).json({ error: 'Swap not found' });
  if (swap.fromEmployeeId !== req.user.id)
    return res.status(403).json({ error: 'Only requester can cancel' });
  if (['approved', 'declined', 'cancelled'].includes(swap.status))
    return res.status(409).json({ error: 'Cannot cancel finalized swap' });

  const updated = await prisma.shiftSwap.update({
    where: { id },
    data: { status: 'cancelled', decidedAt: new Date() },
  });
  res.json(updated);
};

// optional: list my swaps or team swaps
export const listMySwaps = async (req, res) => {
  const rows = await prisma.shiftSwap.findMany({
    where: {
      tenantId: req.user.tenantId,
      OR: [{ fromEmployeeId: req.user.id }, { toEmployeeId: req.user.id }],
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(rows);
};
