import { Router } from 'express';
import {
  listAttendance,
  clockIn,
  clockOut,
  editAttendance,
  markAbsent,
  exportCSV,
} from '../controllers/attendance.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const r = Router();
r.use(authMiddleware);

r.get('/', listAttendance);
r.get('/export', exportCSV);
r.post('/clock-in', clockIn);
r.post('/clock-out', clockOut);
r.patch('/:id', editAttendance);
r.post('/mark-absent', markAbsent);

export const attendanceRouter = r;
