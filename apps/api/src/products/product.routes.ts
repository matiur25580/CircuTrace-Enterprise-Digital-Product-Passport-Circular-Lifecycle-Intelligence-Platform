import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { AuthError } from '../auth/auth-error.js';
import { authenticate } from '../auth/auth.middleware.js';
import { PRODUCT_STATUSES } from './product.model.js';
import { MATERIAL_CATEGORIES } from './material.model.js';
import { createComponent, createMaterial, createProduct, createVariant, getProduct, listComponents, listMaterials, listProducts, listVariants, updateProduct } from './product.service.js';

const router: ExpressRouter = Router({ mergeParams: true });
router.use(authenticate);
const objectId = /^[a-f\d]{24}$/i;
function actor(request: { auth?: { userId: string } }) {
  if (!request.auth) throw new AuthError('AUTHENTICATION_REQUIRED', 'A valid access token is required.');
  return request.auth.userId;
}
function organizationId(value?: string) {
  value = value ?? '';
  if (!objectId.test(value)) throw new AuthError('ORGANIZATION_NOT_FOUND', 'The organization was not found.', 404);
  return value;
}
function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new AuthError('VALIDATION_ERROR', result.error.issues.map((issue) => issue.message).join('; '), 400);
  return result.data;
}
const productSchema = z.object({
  sku: z.string().trim().min(2).max(80), name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(4000).nullable().optional(), category: z.string().trim().max(120).nullable().optional(),
  brandPartnerId: z.string().regex(objectId).nullable().optional(),
}).strict();
const updateSchema = productSchema.partial().refine((value) => Object.keys(value).length > 0);
const componentSchema = z.object({
  code: z.string().trim().min(2).max(80), name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).nullable().optional(), quantity: z.number().positive().max(1000000000),
  unit: z.string().trim().min(1).max(24), supplierPartnerId: z.string().regex(objectId).nullable().optional(),
}).strict();
function validGtin(value: string) {
  if (!/^(?:[0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})$/.test(value)) return false;
  const digits = value.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits.reduce((total, digit, index) => total + digit * ((digits.length - index) % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
const variantSchema = z.object({
  sku: z.string().trim().min(2).max(80),
  gtin: z.string().trim().refine(validGtin, 'GTIN must have a valid length and check digit.').nullable().optional(),
  name: z.string().trim().max(160).nullable().optional(),
  attributes: z.record(z.string().trim().min(1).max(80)).refine((value) => Object.keys(value).length <= 30, 'A variant can have at most 30 attributes.').optional(),
}).strict();
const materialSchema = z.object({
  name: z.string().trim().min(2).max(160), category: z.enum(MATERIAL_CATEGORIES),
  mass: z.number().positive().max(1000000000), massUnit: z.enum(['g', 'kg', 'mg']).default('g'),
  recycledContentPct: z.number().min(0).max(100).nullable().optional(),
  originCountryCode: z.string().regex(/^[A-Za-z]{2}$/).nullable().optional(),
  supplierPartnerId: z.string().regex(objectId).nullable().optional(),
}).strict();

router.get('/', async (req, res) => {
  const filters = parse(z.object({ status: z.enum(PRODUCT_STATUSES).optional(), search: z.string().trim().min(1).max(100).optional() }).strict(), req.query);
  res.json({ data: { products: await listProducts(actor(req), organizationId((req.params as { organizationId?: string }).organizationId), filters) } });
});
router.post('/', async (req, res) => {
  res.status(201).json({ data: { product: await createProduct(actor(req), organizationId((req.params as { organizationId?: string }).organizationId), parse(productSchema, req.body)) } });
});
router.get('/:productId', async (req, res) => {
  res.json({ data: { product: await getProduct(actor(req), organizationId((req.params as { organizationId?: string }).organizationId), req.params.productId ?? '') } });
});
router.patch('/:productId', async (req, res) => {
  res.json({ data: { product: await updateProduct(actor(req), organizationId((req.params as { organizationId?: string }).organizationId), req.params.productId ?? '', parse(updateSchema, req.body)) } });
});
router.get('/:productId/variants', async (req, res) => {
  res.json({ data: { variants: await listVariants(actor(req), organizationId((req.params as { organizationId?: string }).organizationId), req.params.productId ?? '') } });
});
router.post('/:productId/variants', async (req, res) => {
  res.status(201).json({ data: { variant: await createVariant(actor(req), organizationId((req.params as { organizationId?: string }).organizationId), req.params.productId ?? '', parse(variantSchema, req.body)) } });
});
router.get('/:productId/components', async (req, res) => {
  res.json({ data: { components: await listComponents(actor(req), organizationId((req.params as { organizationId?: string }).organizationId), req.params.productId ?? '') } });
});
router.post('/:productId/components', async (req, res) => {
  res.status(201).json({ data: { component: await createComponent(actor(req), organizationId((req.params as { organizationId?: string }).organizationId), req.params.productId ?? '', parse(componentSchema, req.body)) } });
});
router.get('/:productId/components/:componentId/materials', async (req, res) => {
  res.json({ data: { materials: await listMaterials(actor(req), organizationId((req.params as { organizationId?: string }).organizationId), req.params.productId ?? '', req.params.componentId ?? '') } });
});
router.post('/:productId/components/:componentId/materials', async (req, res) => {
  res.status(201).json({ data: { material: await createMaterial(actor(req), organizationId((req.params as { organizationId?: string }).organizationId), req.params.productId ?? '', req.params.componentId ?? '', parse(materialSchema, req.body)) } });
});

export { router as productRouter };
