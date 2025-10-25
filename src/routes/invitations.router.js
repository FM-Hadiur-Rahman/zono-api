import { Router } from 'express';
import {
  sendInvite,
  getInvite,
  acceptInvite,
  validateInvite,
} from '../controllers/invitations.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  SendInviteSchema,
  AcceptInviteSchema,
} from '../schemas/invitation.schema.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/require-role.middleware.js';

const invitationRouter = Router();

// owner/admin only
invitationRouter.post(
  '/send',
  authMiddleware,
  requireRole(['owner', 'tenant_admin', 'admin', 'manager']),
  validate(SendInviteSchema),
  sendInvite,
);

// public
invitationRouter.get('/validate', validateInvite);
invitationRouter.get('/:token', getInvite);
invitationRouter.post('/accept', validate(AcceptInviteSchema), acceptInvite);

export default invitationRouter;
