// src/controllers/notification.controller.js
import { prisma } from '../services/prisma.js';

/** GET /api/notifications?take=20 */
export async function listNotifications(req, res) {
  try {
    const raw = req.query.take ?? 20;
    const take = Math.max(1, Math.min(100, Number(raw) || 20)); // clamp 1..100

    const rows = await prisma.notification.findMany({
      where: { tenantId: req.user.tenantId, userId: req.user.id },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      take,
    });

    res.json(rows);
  } catch (err) {
    console.error('listNotifications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/** PATCH /api/notifications/:id/read */
export async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;

    const n = await prisma.notification.findFirst({
      where: { id, tenantId: req.user.tenantId, userId: req.user.id },
    });
    if (!n) return res.status(404).json({ error: 'Not found' });

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('markNotificationRead error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/** PATCH /api/notifications/read-all (optional) */
export async function markAllNotificationsRead(req, res) {
  try {
    await prisma.notification.updateMany({
      where: {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('markAllNotificationsRead error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
