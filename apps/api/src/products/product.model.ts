import { Schema, model } from 'mongoose';

export const PRODUCT_STATUSES = ['draft', 'active', 'archived'] as const;
export type ProductStatus = typeof PRODUCT_STATUSES[number];

const productSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, immutable: true },
  sku: { type: String, required: true, trim: true, uppercase: true, minlength: 2, maxlength: 80 },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 4000, default: null },
  category: { type: String, trim: true, maxlength: 120, default: null },
  brandPartnerId: { type: Schema.Types.ObjectId, ref: 'Partner', default: null },
  status: { type: String, enum: PRODUCT_STATUSES, default: 'draft', required: true },
  evidenceSequence: { type: Number, min: 0, default: 0 },
  latestEvidenceHash: { type: String, match: /^[a-f0-9]{64}$/, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
productSchema.index({ organizationId: 1, sku: 1 }, { unique: true });
productSchema.index({ organizationId: 1, status: 1, updatedAt: -1 });
productSchema.index({ organizationId: 1, name: 1 });

export const ProductModel = model('Product', productSchema);
