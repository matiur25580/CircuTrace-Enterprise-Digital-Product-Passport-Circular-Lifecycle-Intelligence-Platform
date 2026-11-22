import { Types } from 'mongoose';
import { AuthError } from '../auth/auth-error.js';
import { requirePermission } from '../organizations/organization.service.js';
import { PartnerModel } from './partner.model.js';
import { PartnerRelationshipModel, type PartnerRelationshipStatus, type PartnerRelationshipType } from './partner-relationship.model.js';

export interface PartnerRelationshipInput {
  sourcePartnerId: string;
  targetPartnerId: string;
  type: PartnerRelationshipType;
  description?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

async function requirePartnerEndpoints(organizationId: string, sourcePartnerId: string, targetPartnerId: string) {
  if (!Types.ObjectId.isValid(sourcePartnerId) || !Types.ObjectId.isValid(targetPartnerId)) {
    throw new AuthError('PARTNER_NOT_FOUND', 'Both partner endpoints must exist in this organization.', 404);
  }
  if (sourcePartnerId === targetPartnerId) {
    throw new AuthError('PARTNER_RELATIONSHIP_SELF_LINK', 'A partner cannot have a relationship with itself.', 400);
  }
  const partners = await PartnerModel.find({
    organizationId,
    _id: { $in: [sourcePartnerId, targetPartnerId] },
    status: 'active',
  }).select('_id').lean().exec();
  if (partners.length !== 2) throw new AuthError('PARTNER_NOT_FOUND', 'Both partner endpoints must be active partners in this organization.', 404);
}

function mapDuplicateKey(error: unknown): never {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
    throw new AuthError('PARTNER_RELATIONSHIP_CONFLICT', 'This directed relationship already exists.', 409);
  }
  throw error;
}

export async function listPartnerRelationships(userId: string, organizationId: string, filters: {
  partnerId?: string; type?: PartnerRelationshipType; status?: PartnerRelationshipStatus;
}) {
  await requirePermission(userId, organizationId, 'partners:read');
  const query: Record<string, unknown> = { organizationId };
  if (filters.partnerId) {
    if (!Types.ObjectId.isValid(filters.partnerId)) throw new AuthError('PARTNER_NOT_FOUND', 'The partner was not found.', 404);
    query.$or = [{ sourcePartnerId: filters.partnerId }, { targetPartnerId: filters.partnerId }];
  }
  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;
  return PartnerRelationshipModel.find(query)
    .populate('sourcePartnerId', 'name type status')
    .populate('targetPartnerId', 'name type status')
    .sort({ createdAt: -1, _id: -1 }).limit(200).lean().exec();
}

export async function createPartnerRelationship(userId: string, organizationId: string, input: PartnerRelationshipInput) {
  await requirePermission(userId, organizationId, 'partners:manage');
  await requirePartnerEndpoints(organizationId, input.sourcePartnerId, input.targetPartnerId);
  if (input.effectiveFrom && input.effectiveTo && new Date(input.effectiveTo) < new Date(input.effectiveFrom)) {
    throw new AuthError('VALIDATION_ERROR', 'The effective end date must be on or after the start date.', 400);
  }
  try {
    return await PartnerRelationshipModel.create({
      organizationId,
      sourcePartnerId: input.sourcePartnerId,
      targetPartnerId: input.targetPartnerId,
      type: input.type,
      description: input.description?.trim() || null,
      effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : null,
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
      createdBy: userId,
      updatedBy: userId,
    });
  } catch (error) { mapDuplicateKey(error); }
}

export async function updatePartnerRelationshipStatus(
  userId: string, organizationId: string, relationshipId: string, status: PartnerRelationshipStatus,
) {
  await requirePermission(userId, organizationId, 'partners:manage');
  if (!Types.ObjectId.isValid(relationshipId)) {
    throw new AuthError('PARTNER_RELATIONSHIP_NOT_FOUND', 'The relationship was not found.', 404);
  }
  const relationship = await PartnerRelationshipModel.findOneAndUpdate(
    { _id: relationshipId, organizationId },
    { $set: { status, updatedBy: userId } },
    { new: true, runValidators: true },
  ).lean().exec();
  if (!relationship) throw new AuthError('PARTNER_RELATIONSHIP_NOT_FOUND', 'The relationship was not found.', 404);
  return relationship;
}
