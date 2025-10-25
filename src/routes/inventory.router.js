import { Router } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  CreateItemBody,
  ListItemsQuery,
  CreateLevelParams,
  CreateLevelBody,
} from '../schemas/inventory.schema.js';
import {
  listItems,
  createItem,
  createLevel,
  listLowStockAlerts,
} from '../controllers/inventory.controller.js';

export const inventoryRouter = Router();

inventoryRouter.get(
  '/items',
  validate(ListItemsQuery, ['query']),
  catchAsync(listItems),
);

inventoryRouter.post(
  '/items',
  validate({ body: CreateItemBody }),
  catchAsync(createItem),
);

inventoryRouter.post(
  '/levels/:itemId',
  validate({ params: CreateLevelParams, body: CreateLevelBody }),
  catchAsync(createLevel),
);

inventoryRouter.get('/alerts/low-stock', catchAsync(listLowStockAlerts));
