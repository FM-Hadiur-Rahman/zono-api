import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middlewares/validate.middleware.js';
import { catchAsync } from '../utils/catchAsync.js';
import {
  LoginSchema,
  RegisterTenantSchema,
  VerifyEmailSchema,
} from '../schemas/auth.schema.js';
import {
  registerTenant,
  verifyEmail,
  login,
} from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

export const authRouter = Router();

// basic rate limit on auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
authRouter.use(authLimiter);

authRouter.post(
  '/register-tenant',
  validate(RegisterTenantSchema),
  registerTenant,
);
authRouter.post('/verify-email', validate(VerifyEmailSchema), verifyEmail);

authRouter.post('/login', validate(LoginSchema, ['body']), catchAsync(login));
// authRouter.get('/seed-demo', catchAsync(seedDemo));
authRouter.get('/me', authMiddleware, (req, res) => {
  // You can tailor the shape returned to the frontend
  const u = req.user;
  res.json({
    id: u.id,
    email: u.email,
    role: u.primaryRole || u.role,
    roles: u.roles || [u.role],
    tenantId: u.tenantId || null,
    emailVerified: !!u.emailVerifiedAt,
  });
});
