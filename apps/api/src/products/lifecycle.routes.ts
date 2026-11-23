import { Router, type Router as ExpressRouter } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AuthError } from '../auth/auth-error.js';
import { authenticate } from '../auth/auth.middleware.js';
import { requirePermission } from '../organizations/organization.service.js';
import { ProductModel } from './product.model.js';
import { ComponentModel } from './component.model.js';
import { MaterialModel } from './material.model.js';
import { LifecycleEventModel, LIFECYCLE_EVENT_TYPES } from './lifecycle-event.model.js';
import { PassportEvidenceModel, EVIDENCE_CLAIM_TYPES } from './passport-evidence.model.js';
import { hashEvidenceRecord, verifyEvidenceChain, type EvidenceHashInput } from './passport-evidence.js';

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
const evidenceSchema = z.object({
  lifecycleEventId: z.string().regex(objectId).nullable().optional(),
  claimType: z.enum(EVIDENCE_CLAIM_TYPES),
  claimDescription: z.string().trim().min(5).max(1000),
  evidenceUri: z.string().url().max(1000).refine((value) => value.startsWith('https://'), 'Evidence URI must use HTTPS.'),
  evidenceSha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
  issuer: z.string().trim().min(2).max(200),
  issuedAt: z.string().datetime(),
}).strict();
function ids(request: { params: Record<string, string | undefined> }) {
  const organizationId = request.params.organizationId ?? '';
  const productId = request.params.productId ?? '';
  if (!objectId.test(organizationId) || !objectId.test(productId)) throw new AuthError('PRODUCT_NOT_FOUND', 'The product was not found.', 404);
  return { organizationId: organizationId.toLowerCase(), productId: productId.toLowerCase() };
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
router.post('/evidence', async (request, response, next) => {
  const session = await mongoose.startSession();
  try {
    const { organizationId, productId } = ids(request);
    await scopedProduct(request.auth!.userId, organizationId, productId, 'products:manage');
    const parsed = evidenceSchema.safeParse(request.body);
    if (!parsed.success) throw new AuthError('VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join('; '), 400);
    if (parsed.data.lifecycleEventId) {
      const eventExists = await LifecycleEventModel.exists({
        _id: parsed.data.lifecycleEventId, organizationId, productId
      });
      if (!eventExists) throw new AuthError('LIFECYCLE_EVENT_NOT_FOUND', 'The lifecycle event was not found.', 404);
    }
    let created: InstanceType<typeof PassportEvidenceModel> | undefined;
    await session.withTransaction(async () => {
      const product = await ProductModel.findOne({ _id: productId, organizationId }).session(session).lean().exec();
      if (!product) throw new AuthError('PRODUCT_NOT_FOUND', 'The product was not found.', 404);
      const sequence = (product.evidenceSequence ?? 0) + 1;
      const previousRecordHash = product.latestEvidenceHash ?? null;
      const input: EvidenceHashInput = {
        organizationId, productId,
        lifecycleEventId: parsed.data.lifecycleEventId?.toLowerCase() ?? null,
        sequence,
        claimType: parsed.data.claimType,
        claimDescription: parsed.data.claimDescription,
        evidenceUri: parsed.data.evidenceUri,
        evidenceSha256: parsed.data.evidenceSha256.toLowerCase(),
        issuer: parsed.data.issuer,
        issuedAt: new Date(parsed.data.issuedAt).toISOString(),
        recordedBy: request.auth!.userId.toLowerCase(),
        previousRecordHash
      };
      const recordHash = hashEvidenceRecord(input);
      const updated = await ProductModel.findOneAndUpdate({
        _id: productId, organizationId,
        evidenceSequence: product.evidenceSequence ?? 0,
        latestEvidenceHash: product.latestEvidenceHash ?? null
      }, {
        $set: { evidenceSequence: sequence, latestEvidenceHash: recordHash }
      }, { new: true, session }).exec();
      if (!updated) throw new AuthError('EVIDENCE_CONFLICT', 'The evidence ledger changed concurrently. Retry the request.', 409);
      const records = await PassportEvidenceModel.create([{
        ...input,
        issuedAt: new Date(input.issuedAt),
        recordedBy: request.auth!.userId.toLowerCase(),
        recordHash,
        verificationStatus: 'digest_recorded_unverified'
      }], { session });
      created = records[0];
    });
    response.status(201).json({ data: { evidence: created, verification: {
      status: 'digest_recorded_unverified',
      note: 'The evidence metadata and supplied SHA-256 digest are recorded in the tamper-evident ledger. The referenced file bytes and issuer signature have not been independently verified.'
    } } });
  } catch (error) { next(error); }
  finally { await session.endSession(); }
});
router.get('/evidence', async (request, response, next) => {
  try {
    const { organizationId, productId } = ids(request);
    await scopedProduct(request.auth!.userId, organizationId, productId, 'products:read');
    const evidence = await PassportEvidenceModel.find({ organizationId, productId })
      .select('lifecycleEventId sequence claimType claimDescription evidenceUri evidenceSha256 issuer issuedAt previousRecordHash recordHash verificationStatus createdAt')
      .sort({ sequence: 1 }).limit(1001).lean().exec();
    response.json({ data: { evidence: evidence.slice(0, 1000), meta: { truncated: evidence.length > 1000, returned: Math.min(evidence.length, 1000) } } });
  } catch (error) { next(error); }
});
router.get('/evidence/verify', async (request, response, next) => {
  try {
    const { organizationId, productId } = ids(request);
    const product = await scopedProduct(request.auth!.userId, organizationId, productId, 'products:read');
    const records = await PassportEvidenceModel.find({ organizationId, productId })
      .sort({ sequence: 1 }).limit(1001).lean().exec();
    const truncated = records.length > 1000;
    const checked = records.slice(0, 1000).map((record) => ({
      organizationId: String(record.organizationId),
      productId: String(record.productId),
      lifecycleEventId: record.lifecycleEventId ? String(record.lifecycleEventId) : null,
      sequence: record.sequence,
      claimType: record.claimType,
      claimDescription: record.claimDescription,
      evidenceUri: record.evidenceUri,
      evidenceSha256: record.evidenceSha256,
      issuer: record.issuer,
      issuedAt: record.issuedAt.toISOString(),
      recordedBy: String(record.recordedBy),
      previousRecordHash: record.previousRecordHash ?? null,
      recordHash: record.recordHash
    }));
    const verification = verifyEvidenceChain(checked);
    const productHeadMatches = checked.length === (product.evidenceSequence ?? 0)
      && verification.headHash === (product.latestEvidenceHash ?? null);
    response.json({ data: { verification: {
      ...verification,
      productHeadMatches,
      valid: verification.valid && productHeadMatches && !truncated,
      truncated,
      scope: 'ledger_integrity_only',
      note: 'This check verifies sequence continuity, the product-stored ledger head, and server-generated record hashes. It does not verify external file bytes, issuer identity, certificates, or digital signatures.'
    } } });
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
    const [components, materials, events, evidenceRecords] = await Promise.all([
      ComponentModel.find({ organizationId, productId })
        .select('_id code name description quantity unit')
        .sort({ code: 1 }).lean().exec(),
      MaterialModel.find({ organizationId, productId })
        .select('_id componentId name category mass massUnit recycledContentPct originCountryCode')
        .sort({ name: 1 }).lean().exec(),
      LifecycleEventModel.find({ organizationId, productId })
        .select('_id eventType occurredAt condition notes recoveredMass massUnit evidenceReference')
        .sort({ occurredAt: 1, _id: 1 }).lean().exec(),
      PassportEvidenceModel.find({ organizationId, productId })
        .select('lifecycleEventId sequence claimType claimDescription evidenceUri evidenceSha256 issuer issuedAt previousRecordHash recordHash verificationStatus createdAt recordedBy')
        .sort({ sequence: 1 }).limit(1001).lean().exec(),
    ]);
    const evidenceTruncated = evidenceRecords.length > 1000;
    const evidenceVerification = verifyEvidenceChain(evidenceRecords.slice(0, 1000).map((record) => ({
      organizationId: String(record.organizationId),
      productId: String(record.productId),
      lifecycleEventId: record.lifecycleEventId ? String(record.lifecycleEventId) : null,
      sequence: record.sequence,
      claimType: record.claimType,
      claimDescription: record.claimDescription,
      evidenceUri: record.evidenceUri,
      evidenceSha256: record.evidenceSha256,
      issuer: record.issuer,
      issuedAt: record.issuedAt.toISOString(),
      recordedBy: String(record.recordedBy),
      previousRecordHash: record.previousRecordHash ?? null,
      recordHash: record.recordHash
    })));
    const productHeadMatches = evidenceVerification.recordsChecked === (product.evidenceSequence ?? 0)
      && evidenceVerification.headHash === (product.latestEvidenceHash ?? null);
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
      evidence: evidenceRecords.slice(0, 1000).map((record) => ({
        sequence: record.sequence,
        lifecycleEventId: record.lifecycleEventId,
        claimType: record.claimType,
        claimDescription: record.claimDescription,
        evidenceUri: record.evidenceUri,
        evidenceSha256: record.evidenceSha256,
        issuer: record.issuer,
        issuedAt: record.issuedAt,
        previousRecordHash: record.previousRecordHash,
        recordHash: record.recordHash,
        verificationStatus: record.verificationStatus
      })),
      evidenceLedger: {
        ...evidenceVerification,
        valid: evidenceVerification.valid && productHeadMatches && !evidenceTruncated,
        productHeadMatches,
        truncated: evidenceTruncated,
        scope: 'ledger_integrity_only',
        note: 'Record hashes protect ledger metadata integrity. Referenced file bytes, issuer identity, and signatures are not independently verified.'
      },
    });
  } catch (error) { next(error); }
});
export { router as lifecycleRouter };
