import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { catchAsync } from '../utils/catchAsync.js';
import { requireRole } from '../middlewares/require-role.middleware.js';
import { CreateSwapBody, SwapIdParam } from '../schemas/swap.schema.js';
import {
  createSwap,
  acceptSwap,
  approveSwap,
  declineSwap,
  cancelSwap,
  listMySwaps,
} from '../controllers/swaps.controller.js';

export const swapsRouter = Router();

// request a swap (owner or manager)
swapsRouter.post(
  '/:id', // :id = shiftId
  requireRole(['employee', 'rider', 'manager', 'tenant_admin', 'zono_admin']),
  validate({ params: SwapIdParam, body: CreateSwapBody }),
  catchAsync(createSwap),
);

// target employee accepts
swapsRouter.patch(
  '/:id/accept',
  requireRole(['employee', 'rider', 'manager', 'tenant_admin', 'zono_admin']),
  validate({ params: SwapIdParam }),
  catchAsync(acceptSwap),
);

// manager approves
swapsRouter.patch(
  '/:id/approve',
  requireRole(['manager', 'tenant_admin', 'zono_admin']),
  validate({ params: SwapIdParam }),
  catchAsync(approveSwap),
);

// decline (target at pending_target, or manager at pending_manager)
swapsRouter.patch(
  '/:id/decline',
  requireRole(['employee', 'rider', 'manager', 'tenant_admin', 'zono_admin']),
  validate({ params: SwapIdParam }),
  catchAsync(declineSwap),
);

// requester cancels
swapsRouter.patch(
  '/:id/cancel',
  requireRole(['employee', 'rider', 'manager', 'tenant_admin', 'zono_admin']),
  validate({ params: SwapIdParam }),
  catchAsync(cancelSwap),
);

// list my swaps
swapsRouter.get(
  '/me',
  requireRole(['employee', 'rider', 'manager', 'tenant_admin', 'zono_admin']),
  catchAsync(listMySwaps),
);
