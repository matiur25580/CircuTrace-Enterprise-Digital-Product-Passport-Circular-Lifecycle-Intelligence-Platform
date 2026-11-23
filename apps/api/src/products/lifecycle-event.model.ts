import { Schema, model } from 'mongoose';

export const LIFECYCLE_EVENT_TYPES = ['manufactured', 'sold', 'transferred', 'repaired', 'refurbished', 'reused', 'recycled', 'disposed'] as const;
export type LifecycleEventType = typeof LIFECYCLE_EVENT_TYPES[number];
const lifecycleEventSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, immutable: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, immutable: true },
  eventType: { type: String, enum: LIFECYCLE_EVENT_TYPES, required: true, immutable: true },
  occurredAt: { type: Date, required: true, immutable: true },
  condition: { type: String, enum: ['new', 'good', 'fair', 'poor', 'end_of_life'], default: null, immutable: true },
  notes: { type: String, trim: true, maxlength: 2000, default: '', immutable: true },
  recoveredMass: { type: Number, min: 0, max: 1000000000, default: 0, immutable: true },
  massUnit: { type: String, enum: ['g', 'kg'], default: 'kg', immutable: true },
  evidenceReference: { type: String, trim: true, maxlength: 500, default: null, immutable: true },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
}, { timestamps: true, versionKey: false });
lifecycleEventSchema.index({ organizationId: 1, productId: 1, occurredAt: -1 });
lifecycleEventSchema.index({ organizationId: 1, eventType: 1, occurredAt: -1 });
export const LifecycleEventModel = model('ProductLifecycleEvent', lifecycleEventSchema);
