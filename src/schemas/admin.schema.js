// src/schemas/admin.schema.js
import { z } from 'zod';

export const GetTenantParams = z.object({
  id: z.string().min(1),
});

export const PatchTenantFeaturesParams = z.object({
  id: z.string().min(1),
});

export const PatchTenantFeaturesBody = z.object({
  features: z.record(z.boolean()).default({}),
});
