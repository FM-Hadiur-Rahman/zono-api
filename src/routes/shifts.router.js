import { Router } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  ListShiftsQuery,
  CreateShiftBody,
  RangeQuery,
  IdParam,
  UpdateShiftBody,
  EmployeeRangeParams,
  EmployeeRangeQuery,
} from '../schemas/shift.schema.js';
import {
  listShifts,
  createShift,
  listShiftsInRange,
  listEmployeeShifts,
  updateShift,
  deleteShift,
  listMyShiftsInRange,
} from '../controllers/shifts.controller.js';

export const shiftsRouter = Router();

// list single day (or paginated)
shiftsRouter.get(
  '/',
  validate(ListShiftsQuery, ['query']),
  catchAsync(listShifts),
);
shiftsRouter.get(
  '/me',
  validate({ query: RangeQuery }),
  catchAsync(listMyShiftsInRange),
);
// list a range (weekly/monthly views)
shiftsRouter.get(
  '/range',
  validate({ query: RangeQuery }),
  catchAsync(listShiftsInRange),
);

// list for a specific employee in a range
shiftsRouter.get(
  '/employee/:employeeId',
  validate({ params: EmployeeRangeParams, query: EmployeeRangeQuery }),
  catchAsync(listEmployeeShifts),
);

// create
shiftsRouter.post(
  '/',
  validate({ body: CreateShiftBody }),
  catchAsync(createShift),
);

// update
shiftsRouter.patch(
  '/:id',
  validate({ params: IdParam, body: UpdateShiftBody }),
  catchAsync(updateShift),
);

// delete
shiftsRouter.delete(
  '/:id',
  validate({ params: IdParam }),
  catchAsync(deleteShift),
);
