import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { AuthError } from '../auth/auth-error.js';
import { authenticate } from '../auth/auth.middleware.js';
import { acceptPartnerInvitation, createPartnerInvitation, listPartnerInvitations, revokePartnerInvitation } from './partner-invitation.service.js';

const router: ExpressRouter = Router({ mergeParams: true });
router.use(authenticate);
const objectId = /^[a-f\d]{24}$/i;
function actor(request: { auth?: { userId: string } }) {
  if (!request.auth) throw new AuthError('AUTHENTICATION_REQUIRED', 'A valid access token is required.');
  return request.auth.userId;
}
function scope(organizationParam?: string, partnerParam?: string) {
  const organizationId = organizationParam ?? '';
  const partnerId = partnerParam ?? '';
  if (!objectId.test(organizationId)) throw new AuthError('ORGANIZATION_NOT_FOUND', 'The organization was not found.', 404);
  if (!objectId.test(partnerId)) throw new AuthError('PARTNER_NOT_FOUND', 'The partner was not found.', 404);
  return { organizationId, partnerId };
}

router.get('/', async (request, response) => {
  const { organizationId, partnerId } = scope((request.params as { organizationId?: string; partnerId?: string }).organizationId, (request.params as { organizationId?: string; partnerId?: string }).partnerId);
  response.json({ data: { invitations: await listPartnerInvitations(actor(request), organizationId, partnerId) } });
});
router.post('/', async (request, response) => {
  if (Object.keys(request.body ?? {}).length) throw new AuthError('VALIDATION_ERROR', 'This endpoint does not accept a request body.', 400);
  const { organizationId, partnerId } = scope((request.params as { organizationId?: string; partnerId?: string }).organizationId, (request.params as { organizationId?: string; partnerId?: string }).partnerId);
  response.status(201).json({ data: await createPartnerInvitation(actor(request), organizationId, partnerId) });
});
router.delete('/:invitationId', async (request, response) => {
  const { organizationId, partnerId } = scope((request.params as { organizationId?: string; partnerId?: string }).organizationId, (request.params as { organizationId?: string; partnerId?: string }).partnerId);
  await revokePartnerInvitation(actor(request), organizationId, partnerId, request.params.invitationId ?? '');
  response.status(204).send();
});

export { router as partnerInvitationRouter };

export const partnerInvitationAcceptanceRouter: ExpressRouter = Router();
partnerInvitationAcceptanceRouter.use(authenticate);
partnerInvitationAcceptanceRouter.post('/accept', async (request, response) => {
  const parsed = z.object({ token: z.string().min(40).max(64) }).strict().safeParse(request.body);
  if (!parsed.success) throw new AuthError('VALIDATION_ERROR', 'A valid invitation token is required.', 400);
  response.json({ data: await acceptPartnerInvitation(actor(request), parsed.data.token) });
});
