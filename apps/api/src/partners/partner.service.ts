import { Types } from 'mongoose';
import { AuthError } from '../auth/auth-error.js';
import { requirePermission } from '../organizations/organization.service.js';
import { PartnerModel, type PartnerStatus, type PartnerType } from './partner.model.js';

export interface PartnerInput {
  name: string;
  legalName?: string | null;
  type: PartnerType;
  website?: string | null;
  countryCode?: string | null;
  contact?: { name?: string | null; email?: string | null; role?: string | null };
  externalReference?: string | null;
  notes?: string | null;
}

function normalizeInput(input: Partial<PartnerInput>) {
  const normalized: Record<string, unknown> = {};
  if (input.name !== undefined) normalized.name = input.name.trim();
  if (input.legalName !== undefined) normalized.legalName = input.legalName?.trim() || null;
  if (input.type !== undefined) normalized.type = input.type;
  if (input.website !== undefined) normalized.website = input.website?.trim() || null;
  if (input.countryCode !== undefined) normalized.countryCode = input.countryCode?.trim().toUpperCase() || null;
  if (input.externalReference !== undefined) normalized.externalReference = input.externalReference?.trim() || null;
  if (input.notes !== undefined) normalized.notes = input.notes?.trim() || null;
  if (input.contact !== undefined) normalized.contact = {
    ...(input.contact.name !== undefined ? { name: input.contact.name?.trim() || null } : {}),
    ...(input.contact.email !== undefined ? { email: input.contact.email?.trim().toLowerCase() || null } : {}),
    ...(input.contact.role !== undefined ? { role: input.contact.role?.trim() || null } : {}),
  };
  return normalized;
}

function escapeRegExp(value: string) {
  return value.split('').map((character) => '.+*?^$[](){}|\\'.includes(character) ? '\\' + character : character).join('');
}

function mapDuplicateKey(error: unknown): never {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
    throw new AuthError('PARTNER_REFERENCE_CONFLICT', 'That external partner reference is already in use in this organization.', 409);
  }
  throw error;
}

export async function listPartners(userId: string, organizationId: string, filters: { type?: PartnerType; status?: PartnerStatus; search?: string }) {
  await requirePermission(userId, organizationId, 'partners:read');
  const query: Record<string, unknown> = { organizationId };
  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;
  if (filters.search) query.name = { $regex: escapeRegExp(filters.search), $options: 'i' };
  return PartnerModel.find(query).sort({ name: 1, _id: 1 }).limit(100).lean().exec();
}

export async function createPartner(userId: string, organizationId: string, input: PartnerInput) {
  await requirePermission(userId, organizationId, 'partners:manage');
  try {
    return await PartnerModel.create({ ...normalizeInput(input), organizationId, createdBy: userId, updatedBy: userId });
  } catch (error) { mapDuplicateKey(error); }
}

export async function getPartner(userId: string, organizationId: string, partnerId: string) {
  await requirePermission(userId, organizationId, 'partners:read');
  if (!Types.ObjectId.isValid(partnerId)) throw new AuthError('PARTNER_NOT_FOUND', 'The partner was not found.', 404);
  const partner = await PartnerModel.findOne({ _id: partnerId, organizationId }).lean().exec();
  if (!partner) throw new AuthError('PARTNER_NOT_FOUND', 'The partner was not found.', 404);
  return partner;
}

export async function updatePartner(userId: string, organizationId: string, partnerId: string, input: Partial<PartnerInput>) {
  await requirePermission(userId, organizationId, 'partners:manage');
  if (!Types.ObjectId.isValid(partnerId)) throw new AuthError('PARTNER_NOT_FOUND', 'The partner was not found.', 404);
  try {
    const partner = await PartnerModel.findOneAndUpdate(
      { _id: partnerId, organizationId },
      { $set: { ...normalizeInput(input), updatedBy: userId } },
      { new: true, runValidators: true },
    ).lean().exec();
    if (!partner) throw new AuthError('PARTNER_NOT_FOUND', 'The partner was not found.', 404);
    return partner;
  } catch (error) { mapDuplicateKey(error); }
}

export async function updatePartnerStatus(userId: string, organizationId: string, partnerId: string, status: PartnerStatus) {
  await requirePermission(userId, organizationId, 'partners:manage');
  if (!Types.ObjectId.isValid(partnerId)) throw new AuthError('PARTNER_NOT_FOUND', 'The partner was not found.', 404);
  const partner = await PartnerModel.findOneAndUpdate(
    { _id: partnerId, organizationId },
    { $set: { status, updatedBy: userId } },
    { new: true, runValidators: true },
  ).lean().exec();
  if (!partner) throw new AuthError('PARTNER_NOT_FOUND', 'The partner was not found.', 404);
  return partner;
}
