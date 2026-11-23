import { Schema, model } from 'mongoose';

const componentSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, immutable: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, immutable: true },
  code: { type: String, required: true, trim: true, uppercase: true, minlength: 2, maxlength: 80 },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 2000, default: null },
  quantity: { type: Number, required: true, min: 0.000001, max: 1000000000 },
  unit: { type: String, required: true, trim: true, lowercase: true, maxlength: 24 },
  supplierPartnerId: { type: Schema.Types.ObjectId, ref: 'Partner', default: null },
}, { timestamps: true });
componentSchema.index({ organizationId: 1, productId: 1, code: 1 }, { unique: true });
componentSchema.index({ organizationId: 1, productId: 1, createdAt: -1 });

export const ComponentModel = model('Component', componentSchema);
