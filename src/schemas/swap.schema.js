import { z } from 'zod';

export const CreateSwapBody = z.object({
  toEmployeeId: z.string().min(1),
  reason: z.string().max(300).optional(),
});

export const SwapIdParam = z.object({
  id: z.string().min(1),
});
