import { Types } from 'mongoose';
import { AuthError } from '../auth/auth-error.js';
import { requirePermission } from '../organizations/organization.service.js';
import { PartnerModel } from '../partners/partner.model.js';
import { ProductModel } from './product.model.js';
import { ComponentModel } from './component.model.js';
import { MaterialModel, type MATERIAL_CATEGORIES } from './material.model.js';

type ProductInput = { sku: string; name: string; description?: string | null; category?: string | null; brandPartnerId?: string | null };
function invalidId(value: string) { return !Types.ObjectId.isValid(value); }
function notFound(code: string, message: string) { return new AuthError(code, message, 404); }
function conflict(error: unknown, code: string, message: string): never {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) throw new AuthError(code, message, 409);
  throw error;
}
async function requirePartnerScope(organizationId: string, partnerId?: string | null) {
  if (!partnerId) return null;
  if (invalidId(partnerId)) throw notFound('PARTNER_NOT_FOUND', 'The partner was not found.');
  const partner = await PartnerModel.findOne({ _id: partnerId, organizationId, status: 'active' }).select('_id').lean().exec();
  if (!partner) throw notFound('PARTNER_NOT_FOUND', 'The partner was not found.');
  return partner._id;
}
export async function listProducts(userId: string, organizationId: string, filters: { status?: string; search?: string }) {
  await requirePermission(userId, organizationId, 'products:read');
  const query: Record<string, unknown> = { organizationId };
  if (filters.status) query.status = filters.status;
  if (filters.search) query.name = { $regex: filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  return ProductModel.find(query).sort({ name: 1, _id: 1 }).limit(100).lean().exec();
}
export async function createProduct(userId: string, organizationId: string, input: ProductInput) {
  await requirePermission(userId, organizationId, 'products:manage');
  try {
    const brandPartnerId = await requirePartnerScope(organizationId, input.brandPartnerId);
    return await ProductModel.create({ ...input, sku: input.sku.trim().toUpperCase(), name: input.name.trim(), organizationId, brandPartnerId, createdBy: userId, updatedBy: userId });
  } catch (error) { conflict(error, 'PRODUCT_SKU_CONFLICT', 'That product SKU is already used in this organization.'); }
}
export async function getProduct(userId: string, organizationId: string, productId: string) {
  await requirePermission(userId, organizationId, 'products:read');
  if (invalidId(productId)) throw notFound('PRODUCT_NOT_FOUND', 'The product was not found.');
  const product = await ProductModel.findOne({ _id: productId, organizationId }).lean().exec();
  if (!product) throw notFound('PRODUCT_NOT_FOUND', 'The product was not found.');
  return product;
}
export async function updateProduct(userId: string, organizationId: string, productId: string, input: Partial<ProductInput>) {
  await requirePermission(userId, organizationId, 'products:manage');
  if (invalidId(productId)) throw notFound('PRODUCT_NOT_FOUND', 'The product was not found.');
  const update: Record<string, unknown> = { ...input, updatedBy: userId };
  if (input.sku !== undefined) update.sku = input.sku.trim().toUpperCase();
  if (input.brandPartnerId !== undefined) update.brandPartnerId = await requirePartnerScope(organizationId, input.brandPartnerId);
  try {
    const product = await ProductModel.findOneAndUpdate({ _id: productId, organizationId }, { $set: update }, { new: true, runValidators: true }).lean().exec();
    if (!product) throw notFound('PRODUCT_NOT_FOUND', 'The product was not found.');
    return product;
  } catch (error) { conflict(error, 'PRODUCT_SKU_CONFLICT', 'That product SKU is already used in this organization.'); }
}
export async function listComponents(userId: string, organizationId: string, productId: string) {
  await requirePermission(userId, organizationId, 'products:read');
  if (invalidId(productId)) throw notFound('PRODUCT_NOT_FOUND', 'The product was not found.');
  const product = await ProductModel.findOne({ _id: productId, organizationId }).select('_id').lean().exec();
  if (!product) throw notFound('PRODUCT_NOT_FOUND', 'The product was not found.');
  return ComponentModel.find({ organizationId, productId }).sort({ code: 1 }).limit(200).lean().exec();
}
export async function createComponent(userId: string, organizationId: string, productId: string, input: { code: string; name: string; description?: string | null; quantity: number; unit: string; supplierPartnerId?: string | null }) {
  await requirePermission(userId, organizationId, 'products:manage');
  if (invalidId(productId)) throw notFound('PRODUCT_NOT_FOUND', 'The product was not found.');
  const product = await ProductModel.findOne({ _id: productId, organizationId }).select('_id').lean().exec();
  if (!product) throw notFound('PRODUCT_NOT_FOUND', 'The product was not found.');
  const supplierPartnerId = await requirePartnerScope(organizationId, input.supplierPartnerId);
  try {
    return await ComponentModel.create({ ...input, code: input.code.trim().toUpperCase(), organizationId, productId, supplierPartnerId });
  } catch (error) { conflict(error, 'COMPONENT_CODE_CONFLICT', 'That component code is already used for this product.'); }
}
export async function listMaterials(userId: string, organizationId: string, productId: string, componentId: string) {
  await requirePermission(userId, organizationId, 'products:read');
  const component = await ComponentModel.findOne({ _id: componentId, productId, organizationId }).select('_id').lean().exec();
  if (!component) throw notFound('COMPONENT_NOT_FOUND', 'The component was not found.');
  return MaterialModel.find({ organizationId, productId, componentId }).sort({ name: 1 }).limit(200).lean().exec();
}
export async function createMaterial(userId: string, organizationId: string, productId: string, componentId: string, input: { name: string; category: typeof MATERIAL_CATEGORIES[number]; mass: number; massUnit: 'g' | 'kg' | 'mg'; recycledContentPct?: number | null; originCountryCode?: string | null; supplierPartnerId?: string | null }) {
  await requirePermission(userId, organizationId, 'products:manage');
  const component = await ComponentModel.findOne({ _id: componentId, productId, organizationId }).select('_id').lean().exec();
  if (!component) throw notFound('COMPONENT_NOT_FOUND', 'The component was not found.');
  const supplierPartnerId = await requirePartnerScope(organizationId, input.supplierPartnerId);
  return MaterialModel.create({ ...input, organizationId, productId, componentId, supplierPartnerId });
}
