import { Schema, model } from 'mongoose';

export const ORGANIZATION_ROLES = ['owner', 'admin', 'member', 'viewer'] as const;
export type OrganizationRole = typeof ORGANIZATION_ROLES[number];

const membershipSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ORGANIZATION_ROLES, required: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active', required: true },
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  acceptedAt: { type: Date, default: Date.now },
}, { timestamps: true });

membershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
membershipSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const MembershipModel = model('OrganizationMembership', membershipSchema);
