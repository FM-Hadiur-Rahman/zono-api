// src/schemas/shift.schema.js
import { z } from 'zod';

export const ListShiftsQuery = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export const CreateShiftBody = z.object({
  employeeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^\d{2}:\d{2}$/), // HH:mm
  end: z.string().regex(/^\d{2}:\d{2}$/), // HH:mm
  role: z.string().optional().default('Staff'),
});

export const RangeQuery = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const IdParam = z.object({
  id: z.string().min(1),
});

export const UpdateShiftBody = z.object({
  employeeId: z.string().min(1).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  start: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  end: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  role: z.string().optional(),
});

export const EmployeeRangeParams = z.object({
  employeeId: z.string().min(1),
});
export const EmployeeRangeQuery = RangeQuery; // reuse the same shape
