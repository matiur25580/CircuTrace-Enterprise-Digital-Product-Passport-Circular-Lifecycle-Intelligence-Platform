import { Schema, model } from 'mongoose';

const partnerInvitationSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  partnerId: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  tokenHash: { type: String, required: true, unique: true, select: false },
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true, index: true },
  acceptedAt: { type: Date, default: null },
  acceptedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });

partnerInvitationSchema.index({ organizationId: 1, partnerId: 1, email: 1, createdAt: -1 });
partnerInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const PartnerInvitationModel = model('PartnerInvitation', partnerInvitationSchema);
