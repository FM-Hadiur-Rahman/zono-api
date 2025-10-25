import { Router } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  ListEmployeesQuerySchema,
  CreateEmployeeSchema,
} from '../schemas/employee.schema.js';
import {
  listEmployees,
  createEmployee,
} from '../controllers/employees.controller.js';

export const employeesRouter = Router();

// LIST
employeesRouter.get(
  '/',
  validate(ListEmployeesQuerySchema, ['query']),
  catchAsync(listEmployees),
);

// CREATE
employeesRouter.post(
  '/',
  validate(CreateEmployeeSchema, ['body']),
  catchAsync(createEmployee),
);
