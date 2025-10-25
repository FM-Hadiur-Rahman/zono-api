// src/routes/admin.router.js
import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { catchAsync } from '../utils/catchAsync.js';
import {
  GetTenantParams,
  PatchTenantFeaturesParams,
  PatchTenantFeaturesBody,
} from '../schemas/admin.schema.js';
import {
  listTenants,
  getTenant,
  patchTenantFeatures,
} from '../controllers/admin.controller.js';

export const adminRouter = Router();

adminRouter.get('/tenants', catchAsync(listTenants));

adminRouter.get(
  '/tenants/:id',
  validate({ params: GetTenantParams }),
  catchAsync(getTenant),
);

adminRouter.patch(
  '/tenants/:id/features',
  validate({
    params: PatchTenantFeaturesParams,
    body: PatchTenantFeaturesBody,
  }),
  catchAsync(patchTenantFeatures),
);
