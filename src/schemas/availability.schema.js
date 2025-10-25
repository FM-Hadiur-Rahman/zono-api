import { z } from 'zod';

export const UpsertAvailabilityBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  note: z.string().max(300).optional(),
});

export const AvailabilityRangeQuery = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employeeId: z.string().optional(), // managers can filter specific employee
});

export const AvailabilityIdParam = z.object({
  id: z.string().min(1),
});
