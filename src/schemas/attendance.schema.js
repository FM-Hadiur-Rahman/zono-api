// src/schemas/attendance.schema.js
import { z } from 'zod';

export const ClockBody = z.object({
  employeeId: z.string().min(1, 'employeeId required'),
});

export const DailyQuery = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD
});
