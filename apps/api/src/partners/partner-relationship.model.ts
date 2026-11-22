import { Schema, model } from 'mongoose';

export const PARTNER_RELATIONSHIP_TYPES = [
  'supplies_to', 'manufactures_for', 'distributes_to', 'transports_for',
  'services', 'repairs_for', 'refurbishes_for', 'recycles_for',
] as const;
export type PartnerRelationshipType = typeof PARTNER_RELATIONSHIP_TYPES[number];
export const PARTNER_RELATIONSHIP_STATUSES = ['active', 'inactive'] as const;
export type PartnerRelationshipStatus = typeof PARTNER_RELATIONSHIP_STATUSES[number];

const partnerRelationshipSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  sourcePartnerId: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  targetPartnerId: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  type: { type: String, enum: PARTNER_RELATIONSHIP_TYPES, required: true },
  description: { type: String, trim: true, maxlength: 1000, default: null },
  status: { type: String, enum: PARTNER_RELATIONSHIP_STATUSES, default: 'active', required: true },
  effectiveFrom: { type: Date, default: null },
  effectiveTo: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

partnerRelationshipSchema.index(
  { organizationId: 1, sourcePartnerId: 1, targetPartnerId: 1, type: 1 },
  { unique: true },
);
partnerRelationshipSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
partnerRelationshipSchema.index({ organizationId: 1, sourcePartnerId: 1, status: 1 });
partnerRelationshipSchema.index({ organizationId: 1, targetPartnerId: 1, status: 1 });

export const PartnerRelationshipModel = model('PartnerRelationship', partnerRelationshipSchema);
