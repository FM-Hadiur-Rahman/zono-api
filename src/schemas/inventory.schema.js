import { z } from 'zod';

export const CreateItemBody = z.object({
  name: z.string().min(1, 'name required'),
  sku: z.string().trim().optional().nullable(),
  lowStockThreshold: z.coerce.number().int().min(0).default(0),
  locationId: z.string().optional().nullable(),
});

export const ListItemsQuery = z.object({
  take: z.coerce.number().int().min(1).max(200).optional(),
  skip: z.coerce.number().int().min(0).optional(),
  q: z.string().optional(), // future: search by name/sku
});

export const CreateLevelParams = z.object({
  itemId: z.string().min(1),
});

export const CreateLevelBody = z.object({
  qtyOnHand: z.coerce.number().finite(),
});
