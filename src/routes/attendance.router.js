// src/routes/attendance.router.js
import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { catchAsync } from '../utils/catchAsync.js';
import {
  clockIn,
  clockOut,
  getDaily,
} from '../controllers/attendance.controller.js';
import { ClockBody, DailyQuery } from '../schemas/attendance.schema.js';
export const attendanceRouter = Router();
attendanceRouter.post(
  '/clock-in',
  validate({ body: ClockBody }),
  catchAsync(clockIn),
);

attendanceRouter.post(
  '/clock-out',
  validate({ body: ClockBody }),
  catchAsync(clockOut),
);

attendanceRouter.get(
  '/daily',
  validate({ query: DailyQuery }),
  catchAsync(getDaily),
);
