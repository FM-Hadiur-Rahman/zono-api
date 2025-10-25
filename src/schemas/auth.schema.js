import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

export const RegisterTenantSchema = z.object({
  company: z.string().min(2),
  subdomain: z.string().trim().optional(),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(8),
});

export const SeedSchema = z.object({});
