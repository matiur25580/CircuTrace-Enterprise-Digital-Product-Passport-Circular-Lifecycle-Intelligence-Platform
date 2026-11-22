import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { AuthError } from '../auth/auth-error.js';
import { authenticate } from '../auth/auth.middleware.js';
import { PARTNER_STATUSES, PARTNER_TYPES } from './partner.model.js';
import { createPartner, getPartner, listPartners, updatePartner, updatePartnerStatus } from './partner.service.js';

const router: ExpressRouter = Router({ mergeParams: true });
router.use(authenticate);
const objectId = /^[a-f\d]{24}$/i;
const contactSchema = z.object({
  name: z.string().trim().max(120).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  role: z.string().trim().max(120).nullable().optional(),
}).strict();
const partnerSchema = z.object({
  name: z.string().trim().min(2).max(160),
  legalName: z.string().trim().max(200).nullable().optional(),
  type: z.enum(PARTNER_TYPES),
  website: z.string().trim().url().max(2048).nullable().optional(),
  countryCode: z.string().trim().regex(/^[A-Za-z]{2}$/).nullable().optional(),
  contact: contactSchema.optional(),
  externalReference: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
}).strict();
const updateSchema = partnerSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');
const statusSchema = z.object({ status: z.enum(PARTNER_STATUSES) }).strict();

function actor(request: { auth?: { userId: string } }) {
  if (!request.auth) throw new AuthError('AUTHENTICATION_REQUIRED', 'A valid access token is required.');
  return request.auth.userId;
}
function ids(request: { params: { organizationId?: string; partnerId?: string } }) {
  const organizationId = request.params.organizationId ?? '';
  if (!objectId.test(organizationId)) throw new AuthError('ORGANIZATION_NOT_FOUND', 'The organization was not found.', 404);
  return { organizationId, partnerId: request.params.partnerId };
}
function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new AuthError('VALIDATION_ERROR', result.error.issues.map((issue) => issue.message).join('; '), 400);
  return result.data;
}

router.get('/', async (request, response) => {
  const { organizationId } = ids(request);
  const filters = parse(z.object({
    type: z.enum(PARTNER_TYPES).optional(),
    status: z.enum(PARTNER_STATUSES).optional(),
    search: z.string().trim().min(1).max(100).optional(),
  }).strict(), request.query);
  response.json({ data: { partners: await listPartners(actor(request), organizationId, filters) } });
});
router.post('/', async (request, response) => {
  const { organizationId } = ids(request);
  const partner = await createPartner(actor(request), organizationId, parse(partnerSchema, request.body));
  response.status(201).json({ data: { partner } });
});
router.get('/:partnerId', async (request, response) => {
  const { organizationId, partnerId } = ids(request);
  response.json({ data: { partner: await getPartner(actor(request), organizationId, partnerId ?? '') } });
});
router.patch('/:partnerId', async (request, response) => {
  const { organizationId, partnerId } = ids(request);
  response.json({ data: { partner: await updatePartner(actor(request), organizationId, partnerId ?? '', parse(updateSchema, request.body)) } });
});
router.patch('/:partnerId/status', async (request, response) => {
  const { organizationId, partnerId } = ids(request);
  const { status } = parse(statusSchema, request.body);
  response.json({ data: { partner: await updatePartnerStatus(actor(request), organizationId, partnerId ?? '', status) } });
});

export { router as partnerRouter };
