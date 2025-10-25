import { z } from 'zod';

export const SendInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['employee', 'manager', 'rider', 'cook']).default('employee'),
  expiresInHours: z
    .number()
    .int()
    .positive()
    .max(24 * 14)
    .default(72),
});

export const AcceptInviteSchema = z.object({
  token: z.string().min(8),
  name: z.string().min(2),
  password: z.string().min(8),
  phone: z.string().optional(),
});
