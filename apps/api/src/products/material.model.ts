import { Schema, model } from 'mongoose';

export const MATERIAL_CATEGORIES = ['metal', 'plastic', 'textile', 'chemical', 'wood', 'glass', 'paper', 'composite', 'other'] as const;
const materialSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, immutable: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, immutable: true },
  componentId: { type: Schema.Types.ObjectId, ref: 'Component', required: true, immutable: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
  category: { type: String, enum: MATERIAL_CATEGORIES, required: true },
  mass: { type: Number, required: true, min: 0.000001, max: 1000000000 },
  massUnit: { type: String, required: true, trim: true, lowercase: true, enum: ['g', 'kg', 'mg'], default: 'g' },
  recycledContentPct: { type: Number, min: 0, max: 100, default: null },
  originCountryCode: { type: String, uppercase: true, match: /^[A-Z]{2}$/, default: null },
  supplierPartnerId: { type: Schema.Types.ObjectId, ref: 'Partner', default: null },
}, { timestamps: true });
materialSchema.index({ organizationId: 1, componentId: 1, createdAt: -1 });

export const MaterialModel = model('Material', materialSchema);
