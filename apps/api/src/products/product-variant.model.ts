import { Schema, model } from 'mongoose';

const productVariantSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, immutable: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, immutable: true },
  sku: { type: String, required: true, trim: true, uppercase: true, minlength: 2, maxlength: 80 },
  gtin: { type: String, trim: true, match: /^(?:[0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})$/, default: null },
  name: { type: String, trim: true, maxlength: 160, default: null },
  attributes: { type: Map, of: String, default: {} },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
}, { timestamps: true });
productVariantSchema.index({ organizationId: 1, productId: 1, sku: 1 }, { unique: true });
productVariantSchema.index({ organizationId: 1, gtin: 1 }, { unique: true, partialFilterExpression: { gtin: { $type: 'string' } } });

export const ProductVariantModel = model('ProductVariant', productVariantSchema);
