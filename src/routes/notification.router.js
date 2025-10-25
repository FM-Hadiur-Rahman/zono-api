// src/routes/notification.routes.js
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js'; // adjust path to your auth middleware
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead, // optional
} from '../controllers/notification.controller.js';

const router = Router();

router.get('/', authMiddleware, listNotifications);
router.patch('/:id/read', authMiddleware, markNotificationRead);

// optional bulk action
router.patch('/read-all', authMiddleware, markAllNotificationsRead);

export default router;
