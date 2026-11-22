import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { AuthError } from '../auth/auth-error.js';
import { authenticate } from '../auth/auth.middleware.js';
import { ORGANIZATION_ROLES } from './membership.model.js';
import { acceptInvitation, archiveOrganization, changeMemberRole, createInvitation, createOrganization, getMembership, listMembers, listOrganizations, removeMember, revokeInvitation, updateOrganization } from './organization.service.js';

const router: ExpressRouter = Router();
router.use(authenticate);
const objectId = /^[a-f\d]{24}$/i;
const createSchema = z.object({ name: z.string().trim().min(2).max(160), slug: z.string().trim().min(2).max(80).optional(), legalName: z.string().trim().max(200).optional(), registrationNumber: z.string().trim().max(100).optional() }).strict();
const updateSchema = z.object({ name: z.string().trim().min(2).max(160).optional(), legalName: z.string().trim().max(200).nullable().optional(), registrationNumber: z.string().trim().max(100).nullable().optional() }).strict();
const inviteSchema = z.object({ email: z.string().trim().email().max(254), role: z.enum(['admin', 'member', 'viewer']) }).strict();

function actor(request: { auth?: { userId: string } }) {
  if (!request.auth) throw new AuthError('AUTHENTICATION_REQUIRED', 'A valid access token is required.');
  return request.auth.userId;
}
function orgId(value: string) {
  if (!objectId.test(value)) throw new AuthError('ORGANIZATION_NOT_FOUND', 'The organization was not found.', 404);
  return value;
}
function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new AuthError('VALIDATION_ERROR', result.error.issues.map((issue) => issue.message).join('; '), 400);
  return result.data;
}

router.post('/', async (request, response) => {
  const organization = await createOrganization(actor(request), parse(createSchema, request.body));
  response.status(201).json({ data: { organization, role: 'owner' } });
});
router.get('/', async (request, response) => {
  response.json({ data: { organizations: await listOrganizations(actor(request)) } });
});
router.post('/invitations/accept', async (request, response) => {
  const body = z.object({ token: z.string().min(32).max(256) }).strict();
  response.json({ data: await acceptInvitation(actor(request), parse(body, request.body).token) });
});
router.get('/:organizationId', async (request, response) => {
  const id = orgId(request.params.organizationId!);
  const result = await getMembership(actor(request), id);
  response.json({ data: { organization: result.organization, role: result.membership.role } });
});
router.patch('/:organizationId', async (request, response) => {
  response.json({ data: { organization: await updateOrganization(actor(request), orgId(request.params.organizationId!), parse(updateSchema, request.body)) } });
});
router.post('/:organizationId/archive', async (request, response) => {
  await archiveOrganization(actor(request), orgId(request.params.organizationId!));
  response.status(204).send();
});
router.get('/:organizationId/members', async (request, response) => {
  response.json({ data: { members: await listMembers(actor(request), orgId(request.params.organizationId!)) } });
});
router.patch('/:organizationId/members/:membershipId', async (request, response) => {
  const body = z.object({ role: z.enum(ORGANIZATION_ROLES) }).strict();
  const membershipId = request.params.membershipId!;
  if (!objectId.test(membershipId)) throw new AuthError('MEMBERSHIP_NOT_FOUND', 'The membership was not found.', 404);
  const result = await changeMemberRole(actor(request), orgId(request.params.organizationId!), membershipId, parse(body, request.body).role);
  response.json({ data: { membership: result } });
});
router.delete('/:organizationId/members/:membershipId', async (request, response) => {
  const membershipId = request.params.membershipId!;
  if (!objectId.test(membershipId)) throw new AuthError('MEMBERSHIP_NOT_FOUND', 'The membership was not found.', 404);
  await removeMember(actor(request), orgId(request.params.organizationId!), membershipId);
  response.status(204).send();
});
router.post('/:organizationId/invitations', async (request, response) => {
  const result = await createInvitation(actor(request), orgId(request.params.organizationId!), parse(inviteSchema, request.body));
  response.status(201).json({ data: result });
});
router.delete('/:organizationId/invitations/:invitationId', async (request, response) => {
  const invitationId = request.params.invitationId!;
  if (!objectId.test(invitationId)) throw new AuthError('INVITATION_NOT_FOUND', 'The invitation was not found.', 404);
  await revokeInvitation(actor(request), orgId(request.params.organizationId!), invitationId);
  response.status(204).send();
});

export { router as organizationRouter };
