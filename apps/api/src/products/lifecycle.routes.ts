import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { AuthError } from '../auth/auth-error.js';
import { authenticate } from '../auth/auth.middleware.js';
import { requirePermission } from '../organizations/organization.service.js';
import { ProductModel } from './product.model.js';
import { ComponentModel } from './component.model.js';
import { MaterialModel } from './material.model.js';
import { LifecycleEventModel, LIFECYCLE_EVENT_TYPES } from './lifecycle-event.model.js';

const router: ExpressRouter = Router({ mergeParams: true });
router.use(authenticate);
const objectId = /^[a-f\d]{24}$/i;
const eventSchema = z.object({
  eventType: z.enum(LIFECYCLE_EVENT_TYPES),
  occurredAt: z.string().datetime().optional(),
  condition: z.enum(['new', 'good', 'fair', 'poor', 'end_of_life']).nullable().optional(),
  notes: z.string().trim().max(2000).default(''),
  recoveredMass: z.number().min(0).max(1_000_000_000).default(0),
  massUnit: z.enum(['g', 'kg']).default('kg'),
  evidenceReference: z.string().trim().max(500).nullable().optional(),
}).strict();
function ids(request: { params: Record<string, string | undefined> }) {
  const organizationId = request.params.organizationId ?? '';
  const productId = request.params.productId ?? '';
  if (!objectId.test(organizationId) || !objectId.test(productId)) throw new AuthError('PRODUCT_NOT_FOUND', 'The product was not found.', 404);
  return { organizationId, productId };
}
async function scopedProduct(userId: string, organizationId: string, productId: string, permission: 'products:read' | 'products:manage') {
  await requirePermission(userId, organizationId, permission);
  const product = await ProductModel.findOne({ _id: productId, organizationId }).lean().exec();
  if (!product) throw new AuthError('PRODUCT_NOT_FOUND', 'The product was not found.', 404);
  return product;
}
router.get('/events', async (request, response, next) => {
  try {
    const { organizationId, productId } = ids(request);
    await scopedProduct(request.auth!.userId, organizationId, productId, 'products:read');
    const events = await LifecycleEventModel.find({ organizationId, productId }).sort({ occurredAt: -1, _id: -1 }).limit(250).lean().exec();
    response.json({ data: { events } });
  } catch (error) { next(error); }
});
router.post('/events', async (request, response, next) => {
  try {
    const { organizationId, productId } = ids(request);
    await scopedProduct(request.auth!.userId, organizationId, productId, 'products:manage');
    const parsed = eventSchema.safeParse(request.body);
    if (!parsed.success) throw new AuthError('VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join('; '), 400);
    const event = await LifecycleEventModel.create({
      ...parsed.data, organizationId, productId,
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
      recordedBy: request.auth!.userId,
    });
    response.status(201).json({ data: { event } });
  } catch (error) { next(error); }
});
router.get('/circularity', async (request, response, next) => {
  try {
    const { organizationId, productId } = ids(request);
    const product = await scopedProduct(request.auth!.userId, organizationId, productId, 'products:read');
    const [materials, events] = await Promise.all([
      MaterialModel.find({ organizationId, productId }).select('mass massUnit recycledContentPct').lean().exec(),
      LifecycleEventModel.find({ organizationId, productId }).select('eventType recoveredMass massUnit').lean().exec(),
    ]);
    const toKg = (mass: number, unit: string) => unit === 'g' ? mass / 1000 : unit === 'mg' ? mass / 1_000_000 : mass;
    const totalMaterialMassKg = materials.reduce((sum, item) => sum + toKg(item.mass, item.massUnit), 0);
    const recycledInputMassKg = materials.reduce((sum, item) => sum + toKg(item.mass, item.massUnit) * ((item.recycledContentPct ?? 0) / 100), 0);
    const recoveredOutputMassKg = events.filter((event) => ['recycled', 'reused', 'refurbished'].includes(event.eventType))
      .reduce((sum, event) => sum + toKg(event.recoveredMass, event.massUnit), 0);
    response.json({ data: {
      product: { id: product._id, sku: product.sku, name: product.name },
      metrics: {
        totalMaterialMassKg: Number(totalMaterialMassKg.toFixed(6)),
        recycledInputMassKg: Number(recycledInputMassKg.toFixed(6)),
        recycledInputContentPct: totalMaterialMassKg ? Number((recycledInputMassKg / totalMaterialMassKg * 100).toFixed(2)) : null,
        recoveredOutputMassKg: Number(recoveredOutputMassKg.toFixed(6)),
        lifecycleEventCount: events.length,
        eventsByType: events.reduce<Record<string, number>>((counts, event) => { counts[event.eventType] = (counts[event.eventType] ?? 0) + 1; return counts; }, {}),
      },
      methodology: 'Masses are normalized to kilograms. Recycled input content uses registered material mass and declared recycledContentPct. Recovered output sums declared recovered mass for reuse, refurbishment, and recycling events; it is not a verified environmental-impact claim.',
    } });
  } catch (error) { next(error); }
});
router.get('/passport', async (request, response, next) => {
  try {
    const { organizationId, productId } = ids(request);
    const product = await scopedProduct(request.auth!.userId, organizationId, productId, 'products:read');
    // Export only passport fields. Never serialize raw Mongoose documents: they may
    // gain internal fields (tenant metadata, user references, or operational data).
    const [components, materials, events] = await Promise.all([
      ComponentModel.find({ organizationId, productId })
        .select('_id code name description quantity unit')
        .sort({ code: 1 }).lean().exec(),
      MaterialModel.find({ organizationId, productId })
        .select('_id componentId name category mass massUnit recycledContentPct originCountryCode')
        .sort({ name: 1 }).lean().exec(),
      LifecycleEventModel.find({ organizationId, productId })
        .select('_id eventType occurredAt condition notes recoveredMass massUnit evidenceReference')
        .sort({ occurredAt: 1, _id: 1 }).lean().exec(),
    ]);
    const passportProduct = {
      id: product._id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      status: product.status,
    };
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.setHeader('content-disposition', `attachment; filename="product-passport-${String(product.sku).replace(/[^A-Z0-9_-]/gi, '_')}.json"`);
    response.setHeader('cache-control', 'private, no-store');
    response.json({
      passportSchema: 'circutrace.product-passport.v1',
      generatedAt: new Date().toISOString(),
      dataClassification: 'organization-confidential',
      verification: { status: 'self-reported', note: 'This export packages organization-recorded data; it is not independently certified or cryptographically verified.' },
      product: passportProduct, components, materials, lifecycleEvents: events,
    });
  } catch (error) { next(error); }
});
export { router as lifecycleRouter };
