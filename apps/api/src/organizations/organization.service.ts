import { createHash, randomBytes } from 'node:crypto';
import mongoose, { Types } from 'mongoose';
import { AuthError } from '../auth/auth-error.js';
import { UserModel } from '../models/user.model.js';
import { InvitationModel } from './invitation.model.js';
import { MembershipModel, type OrganizationRole } from './membership.model.js';
import { OrganizationModel } from './organization.model.js';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const slugify = (value: string) => value.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const permissions: Record<OrganizationRole, string[]> = {
  owner: ['organization:read', 'organization:update', 'organization:archive', 'members:read', 'members:invite', 'members:manage', 'members:remove'],
  admin: ['organization:read', 'organization:update', 'members:read', 'members:invite', 'members:manage', 'members:remove'],
  member: ['organization:read', 'members:read'],
  viewer: ['organization:read', 'members:read'],
};

export function can(role: OrganizationRole, permission: string) {
  return permissions[role].includes(permission);
}

export async function createOrganization(userId: string, input: { name: string; slug?: string; legalName?: string; registrationNumber?: string }) {
  const slug = slugify(input.slug || input.name);
  if (!slug) throw new AuthError('INVALID_ORGANIZATION_SLUG', 'A valid organization slug is required.', 400);
  const organization = await OrganizationModel.create({
    name: input.name.trim(), slug, legalName: input.legalName?.trim() || null,
    registrationNumber: input.registrationNumber?.trim() || null, createdBy: userId,
  }).catch((error: unknown) => {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      throw new AuthError('ORGANIZATION_SLUG_TAKEN', 'That organization slug is already in use.', 409);
    }
    throw error;
  });
  try {
    await MembershipModel.create({ organizationId: organization._id, userId, role: 'owner', status: 'active', acceptedAt: new Date() });
  } catch (error) {
    await OrganizationModel.deleteOne({ _id: organization._id }).exec();
    throw error;
  }
  return organization.toObject();
}

export async function listOrganizations(userId: string) {
  const memberships = await MembershipModel.find({ userId, status: 'active' }).select('organizationId role').lean().exec();
  const ids = memberships.map((membership) => membership.organizationId);
  const organizations = await OrganizationModel.find({ _id: { $in: ids }, status: 'active' }).sort({ name: 1 }).lean().exec();
  const roles = new Map(memberships.map((membership) => [membership.organizationId.toString(), membership.role]));
  return organizations.map((organization) => ({ ...organization, role: roles.get(organization._id.toString()) }));
}

export async function getMembership(userId: string, organizationId: string) {
  if (!Types.ObjectId.isValid(organizationId)) throw new AuthError('ORGANIZATION_NOT_FOUND', 'The organization was not found.', 404);
  const [organization, membership] = await Promise.all([
    OrganizationModel.findOne({ _id: organizationId, status: 'active' }).lean().exec(),
    MembershipModel.findOne({ organizationId, userId, status: 'active' }).lean().exec(),
  ]);
  if (!organization || !membership) throw new AuthError('ORGANIZATION_NOT_FOUND', 'The organization was not found.', 404);
  return { organization, membership };
}

export async function updateOrganization(userId: string, organizationId: string, input: { name?: string; legalName?: string | null; registrationNumber?: string | null }) {
  await requirePermission(userId, organizationId, 'organization:update');
  const updated = await OrganizationModel.findOneAndUpdate(
    { _id: organizationId, status: 'active' },
    { $set: input }, { new: true, runValidators: true },
  ).lean().exec();
  if (!updated) throw new AuthError('ORGANIZATION_NOT_FOUND', 'The organization was not found.', 404);
  return updated;
}

export async function archiveOrganization(userId: string, organizationId: string) {
  await requirePermission(userId, organizationId, 'organization:archive');
  await OrganizationModel.updateOne({ _id: organizationId, status: 'active' }, { $set: { status: 'archived' } }).exec();
}

export async function requirePermission(userId: string, organizationId: string, permission: string) {
  const { membership } = await getMembership(userId, organizationId);
  if (!can(membership.role as OrganizationRole, permission)) throw new AuthError('FORBIDDEN', 'You are not allowed to perform this action.', 403);
  return membership;
}

export async function listMembers(userId: string, organizationId: string) {
  await requirePermission(userId, organizationId, 'members:read');
  return MembershipModel.find({ organizationId, status: 'active' })
    .populate('userId', 'displayName email')
    .sort({ createdAt: 1 }).lean().exec();
}

export async function changeMemberRole(actorId: string, organizationId: string, membershipId: string, role: OrganizationRole) {
  const actor = await requirePermission(actorId, organizationId, 'members:manage');
  if (actor.role !== 'owner' && role === 'owner') throw new AuthError('FORBIDDEN', 'Only an owner can assign the owner role.', 403);
  const target = await MembershipModel.findOne({ _id: membershipId, organizationId, status: 'active' }).exec();
  if (!target) throw new AuthError('MEMBERSHIP_NOT_FOUND', 'The membership was not found.', 404);
  if (target.role === 'owner') throw new AuthError('OWNER_MEMBERSHIP_PROTECTED', 'Ownership transfer must be completed through the dedicated ownership workflow.', 409);
  target.role = role;
  await target.save();
  return target.toObject();
}

export async function removeMember(actorId: string, organizationId: string, membershipId: string) {
  const actor = await requirePermission(actorId, organizationId, 'members:remove');
  const target = await MembershipModel.findOne({ _id: membershipId, organizationId, status: 'active' }).exec();
  if (!target) throw new AuthError('MEMBERSHIP_NOT_FOUND', 'The membership was not found.', 404);
  if (target.role === 'owner') throw new AuthError('OWNER_MEMBERSHIP_PROTECTED', 'Transfer ownership before removing the owner.', 409);
  if (actor.role !== 'owner' && target.role === 'admin') throw new AuthError('FORBIDDEN', 'Only an owner can remove an administrator.', 403);
  target.status = 'suspended';
  await target.save();
}

export async function createInvitation(actorId: string, organizationId: string, input: { email: string; role: 'admin' | 'member' | 'viewer' }) {
  await requirePermission(actorId, organizationId, 'members:invite');
  const email = input.email.trim().toLowerCase();
  const user = await UserModel.findOne({ email }).select('_id').lean().exec();
  if (user) {
    const existing = await MembershipModel.findOne({ organizationId, userId: user._id, status: 'active' }).lean().exec();
    if (existing) throw new AuthError('ALREADY_A_MEMBER', 'This user is already an active member.', 409);
  }
  const token = randomBytes(32).toString('base64url');
  const invitation = await InvitationModel.create({
    organizationId, email, role: input.role, tokenHash: hashToken(token), invitedBy: actorId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  return { invitation: { id: invitation.id, email, role: invitation.role, expiresAt: invitation.expiresAt.toISOString() }, token };
}

export async function acceptInvitation(userId: string, token: string) {
  const user = await UserModel.findById(userId).select('email').lean().exec();
  if (!user) throw new AuthError('ACCOUNT_UNAVAILABLE', 'This account is currently unavailable.', 403);
  const invitation = await InvitationModel.findOneAndUpdate(
    { tokenHash: hashToken(token), acceptedAt: null, revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { acceptedAt: new Date() } }, { new: true },
  ).exec();
  if (!invitation) throw new AuthError('INVITATION_INVALID', 'The invitation is invalid, expired, or already used.', 400);
  if (invitation.email !== user.email) {
    await InvitationModel.updateOne({ _id: invitation._id, acceptedAt: invitation.acceptedAt }, { $set: { acceptedAt: null } }).exec();
    throw new AuthError('INVITATION_EMAIL_MISMATCH', 'Sign in with the email address that received this invitation.', 403);
  }
  try {
    await MembershipModel.create({
      organizationId: invitation.organizationId, userId, role: invitation.role,
      status: 'active', invitedBy: invitation.invitedBy, acceptedAt: new Date(),
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      throw new AuthError('ALREADY_A_MEMBER', 'This user is already a member of the organization.', 409);
    }
    throw error;
  }
  return { organizationId: invitation.organizationId.toString(), role: invitation.role };
}

export async function revokeInvitation(actorId: string, organizationId: string, invitationId: string) {
  await requirePermission(actorId, organizationId, 'members:manage');
  const result = await InvitationModel.updateOne(
    { _id: invitationId, organizationId, acceptedAt: null, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  ).exec();
  if (!result.modifiedCount) throw new AuthError('INVITATION_NOT_FOUND', 'The invitation was not found or is no longer active.', 404);
}
