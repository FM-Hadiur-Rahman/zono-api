// src/routes/availability.router.js
import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { catchAsync } from '../utils/catchAsync.js';
import { requireRole } from '../middlewares/require-role.middleware.js';
import {
  UpsertAvailabilityBody,
  AvailabilityRangeQuery,
  AvailabilityIdParam,
} from '../schemas/availability.schema.js';
import {
  upsertMyAvailability,
  deleteMyAvailability,
  listMyAvailability,
  listAvailability,
} from '../controllers/availability.controller.js';

export const availabilityRouter = Router();

// employees manage their availability
availabilityRouter.get(
  '/me',
  requireRole(['employee', 'rider', 'manager', 'tenant_admin', 'zono_admin']),
  validate({ query: AvailabilityRangeQuery }),
  catchAsync(listMyAvailability),
);

availabilityRouter.post(
  '/',
  requireRole(['employee', 'rider', 'manager', 'tenant_admin', 'zono_admin']),
  validate({ body: UpsertAvailabilityBody }),
  catchAsync(upsertMyAvailability),
);

availabilityRouter.delete(
  '/:id',
  requireRole(['employee', 'rider', 'manager', 'tenant_admin', 'zono_admin']),
  validate({ params: AvailabilityIdParam }),
  catchAsync(deleteMyAvailability),
);

// managers can view team availability
availabilityRouter.get(
  '/',
  requireRole(['manager', 'tenant_admin', 'zono_admin']),
  validate({ query: AvailabilityRangeQuery }),
  catchAsync(listAvailability),
);
