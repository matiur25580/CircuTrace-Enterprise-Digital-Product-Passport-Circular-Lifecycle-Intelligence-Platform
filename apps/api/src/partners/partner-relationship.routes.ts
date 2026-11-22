import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { AuthError } from '../auth/auth-error.js';
import { authenticate } from '../auth/auth.middleware.js';
import { PARTNER_RELATIONSHIP_STATUSES, PARTNER_RELATIONSHIP_TYPES } from './partner-relationship.model.js';
import { createPartnerRelationship, listPartnerRelationships, updatePartnerRelationshipStatus } from './partner-relationship.service.js';

const router: ExpressRouter = Router({ mergeParams: true });
router.use(authenticate);
const objectId = /^[a-f\\d]{24}$/i;
function organization(request: { params: { organizationId?: string } }) {
  const organizationId = request.params.organizationId ?? '';
  if (!objectId.test(organizationId)) throw new AuthError('ORGANIZATION_NOT_FOUND', 'The organization was not found.', 404);
  return organizationId;
}
function actor(request: { auth?: { userId: string } }) {
  if (!request.auth) throw new AuthError('AUTHENTICATION_REQUIRED', 'A valid access token is required.');
  return request.auth.userId;
}
function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new AuthError('VALIDATION_ERROR', result.error.issues.map((issue) => issue.message).join('; '), 400);
  return result.data;
}
const createSchema = z.object({
  sourcePartnerId: z.string().regex(objectId),
  targetPartnerId: z.string().regex(objectId),
  type: z.enum(PARTNER_RELATIONSHIP_TYPES),
  description: z.string().trim().max(1000).nullable().optional(),
  effectiveFrom: z.string().datetime().nullable().optional(),
  effectiveTo: z.string().datetime().nullable().optional(),
}).strict();
const statusSchema = z.object({ status: z.enum(PARTNER_RELATIONSHIP_STATUSES) }).strict();

router.get('/', async (request, response) => {
  const filters = parse(z.object({
    partnerId: z.string().regex(objectId).optional(),
    type: z.enum(PARTNER_RELATIONSHIP_TYPES).optional(),
    status: z.enum(PARTNER_RELATIONSHIP_STATUSES).optional(),
  }).strict(), request.query);
  response.json({ data: { relationships: await listPartnerRelationships(actor(request), organization(request), filters) } });
});
router.post('/', async (request, response) => {
  const relationship = await createPartnerRelationship(actor(request), organization(request), parse(createSchema, request.body));
  response.status(201).json({ data: { relationship } });
});
router.patch('/:relationshipId/status', async (request, response) => {
  const { status } = parse(statusSchema, request.body);
  response.json({ data: { relationship: await updatePartnerRelationshipStatus(actor(request), organization(request), request.params.relationshipId ?? '', status) } });
});

export { router as partnerRelationshipRouter };
