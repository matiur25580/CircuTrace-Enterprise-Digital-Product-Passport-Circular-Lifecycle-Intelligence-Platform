import { Schema, model } from 'mongoose';

const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedBySessionId: { type: Schema.Types.ObjectId, ref: 'Session', default: null },
    userAgent: { type: String, maxlength: 500, default: null },
    ipAddress: { type: String, maxlength: 64, default: null },
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });

export const SessionModel = model('Session', sessionSchema);
