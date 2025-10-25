import { z } from 'zod';

export const ListEmployeesQuerySchema = z.object({
  tenantId: z.string().optional(), // required for zono_admin (no req.user.tenantId)
});

export const CreateEmployeeSchema = z.object({
  tenantId: z.string().optional(), // taken from req.user for tenant users
  name: z.string().min(1),
  role: z.string().min(1),
  status: z.string().default('Available'),
  locationId: z.string().optional().nullable(),
});
