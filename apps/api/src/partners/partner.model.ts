import { Schema, model } from 'mongoose';

export const PARTNER_TYPES = ['supplier', 'manufacturer', 'brand', 'logistics', 'service_provider', 'recycler', 'other'] as const;
export type PartnerType = typeof PARTNER_TYPES[number];
export const PARTNER_STATUSES = ['active', 'suspended', 'archived'] as const;
export type PartnerStatus = typeof PARTNER_STATUSES[number];

const partnerSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
  legalName: { type: String, trim: true, maxlength: 200, default: null },
  type: { type: String, enum: PARTNER_TYPES, required: true },
  status: { type: String, enum: PARTNER_STATUSES, default: 'active', required: true },
  website: { type: String, trim: true, maxlength: 2048, default: null },
  countryCode: { type: String, uppercase: true, match: /^[A-Z]{2}$/, default: null },
  contact: {
    name: { type: String, trim: true, maxlength: 120, default: null },
    email: { type: String, trim: true, lowercase: true, maxlength: 254, default: null },
    role: { type: String, trim: true, maxlength: 120, default: null },
  },
  externalReference: { type: String, trim: true, maxlength: 120, default: null },
  notes: { type: String, trim: true, maxlength: 2000, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

partnerSchema.index({ organizationId:  1, name: 1 });
partnerSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
partnerSchema.index(
  { organizationId: 1, externalReference: 1 },
  { unique: true, partialFilterExpression: { externalReference: { $type: 'string' } } },
);

export const PartnerModel = model('Partner', partnerSchema);
