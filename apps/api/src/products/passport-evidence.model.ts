import { Schema, model } from 'mongoose';

export const EVIDENCE_CLAIM_TYPES = ['recycled_content', 'recovered_output', 'material_composition', 'repair', 'origin', 'other'] as const;
const passportEvidenceSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, immutable: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, immutable: true },
  lifecycleEventId: { type: Schema.Types.ObjectId, ref: 'ProductLifecycleEvent', default: null, immutable: true },
  sequence: { type: Number, required: true, min: 1, immutable: true },
  claimType: { type: String, enum: EVIDENCE_CLAIM_TYPES, required: true, immutable: true },
  claimDescription: { type: String, trim: true, maxlength: 1000, required: true, immutable: true },
  evidenceUri: { type: String, trim: true, maxlength: 1000, required: true, immutable: true },
  evidenceSha256: { type: String, lowercase: true, match: /^[a-f0-9]{64}$/, required: true, immutable: true },
  issuer: { type: String, trim: true, maxlength: 200, required: true, immutable: true },
  issuedAt: { type: Date, required: true, immutable: true },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  previousRecordHash: { type: String, lowercase: true, match: /^[a-f0-9]{64}$/, default: null, immutable: true },
  recordHash: { type: String, lowercase: true, match: /^[a-f0-9]{64}$/, required: true, immutable: true },
  verificationStatus: { type: String, enum: ['digest_recorded_unverified'], default: 'digest_recorded_unverified', immutable: true }
}, { timestamps: true, versionKey: false });
passportEvidenceSchema.index({ organizationId:  1, productId: 1, sequence: 1 }, { unique: true });
passportEvidenceSchema.index({ organizationId: 1, productId: 1, createdAt: -1 });
export const PassportEvidenceModel = model('PassportEvidence', passportEvidenceSchema);
