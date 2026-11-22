import { createHash, randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import { AuthError } from '../auth/auth-error.js';
import { UserModel } from '../models/user.model.js';
import { requirePermission } from '../organizations/organization.service.js';
import { OrganizationModel } from '../organizations/organization.model.js';
import { PartnerModel } from './partner.model.js';
import { PartnerInvitationModel } from './partner-invitation.model.js';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const tokenPattern = /^[A-Za-z0-9_-]{40,64}$/;

async function requirePartner(userId: string, organizationId: string, partnerId: string, permission: string) {
  await requirePermission(userId, organizationId, permission);
  if (!Types.ObjectId.isValid(partnerId)) throw new AuthError('PARTNER_NOT_FOUND', 'The partner was not found.', 404);
  const partner = await PartnerModel.findOne({ _id: partnerId, organizationId }).lean().exec();
  if (!partner) throw new AuthError('PARTNER_NOT_FOUND', 'The partner was not found.', 404);
  return partner;
}

export async function createPartnerInvitation(actorId: string, organizationId: string, partnerId: string) {
  const partner = await requirePartner(actorId, organizationId, partnerId, 'partners:manage');
  const email = partner.contact?.email?.trim().toLowerCase();
  if (!email) throw new AuthError('PARTNER_CONTACT_EMAIL_REQUIRED', 'Add a primary contact email to the partner profile before inviting them.', 400);
  if (partner.status !== 'active') throw new AuthError('PARTNER_NOT_ACTIVE', 'Only active partners can be invited.', 409);
  const token = randomBytes(32).toString('base64url');
  const invitation = await PartnerInvitationModel.create({
    organizationId, partnerId, email, tokenHash: hashToken(token), invitedBy: actorId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  return {
    invitation: {
      id: invitation.id, organizationId, partnerId, email,
      expiresAt: invitation.expiresAt.toISOString(), acceptedAt: null, revokedAt: null,
    },
    token,
  };
}

export async function listPartnerInvitations(actorId: string, organizationId: string, partnerId: string) {
  await requirePartner(actorId, organizationId, partnerId, 'partners:read');
  return PartnerInvitationModel.find({ organizationId, partnerId })
    .select('-tokenHash')
    .sort({ createdAt: -1 }).limit(50).lean().exec();
}

export async function revokePartnerInvitation(actorId: string, organizationId: string, partnerId: string, invitationId: string) {
  await requirePartner(actorId, organizationId, partnerId, 'partners:manage');
  if (!Types.ObjectId.isValid(invitationId)) throw new AuthError('PARTNER_INVITATION_NOT_FOUND', 'The invitation was not found or is no longer active.', 404);
  const result = await PartnerInvitationModel.updateOne(
    { _id: invitationId, organizationId, partnerId, acceptedAt: null, revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date() } },
  ).exec();
  if (!result.modifiedCount) throw new AuthError('PARTNER_INVITATION_NOT_FOUND', 'The invitation was not found or is no longer active.', 404);
}

export async function acceptPartnerInvitation(userId: string, token: string) {
  if (!tokenPattern.test(token)) throw new AuthError('PARTNER_INVITATION_INVALID', 'The invitation is invalid, expired, revoked, or already used.', 400);
  const user = await UserModel.findById(userId).select('email').lean().exec();
  if (!user) throw new AuthError('ACCOUNT_UNAVAILABLE', 'This account is currently unavailable.', 403);
  const normalizedEmail = user.email.trim().toLowerCase();
  const tokenHash = hashToken(token);
  const candidate = await PartnerInvitationModel.findOne({ tokenHash }).select('organizationId partnerId email acceptedAt revokedAt expiresAt').lean().exec();
  if (!candidate) throw new AuthError('PARTNER_INVITATION_INVALID', 'The invitation is invalid, expired, revoked, or already used.', 400);
  if (candidate.email !== normalizedEmail) throw new AuthError('PARTNER_INVITATION_EMAIL_MISMATCH', 'Sign in with the email address that received this invitation.', 403);
  const [organization, partner] = await Promise.all([
    OrganizationModel.findOne({ _id: candidate.organizationId, status: 'active' }).select('_id').lean().exec(),
    PartnerModel.findOne({ _id: candidate.partnerId, organizationId: candidate.organizationId, status: 'active' }).select('_id').lean().exec(),
  ]);
  if (!organization || !partner) throw new AuthError('PARTNER_UNAVAILABLE', 'The organization or partner is no longer active.', 409);
  const now = new Date();
  const accepted = await PartnerInvitationModel.findOneAndUpdate(
    { _id: candidate._id, tokenHash, email: normalizedEmail, acceptedAt: null, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { acceptedAt: now, acceptedByUserId: userId } },
    { new: true },
  ).select('_id').lean().exec();
  if (!accepted) throw new AuthError('PARTNER_INVITATION_INVALID', 'The invitation is invalid, expired, revoked, or already used.', 400);
  return { accepted: true, partnerId: candidate.partnerId.toString(), organizationId: candidate.organizationId.toString() };
}
