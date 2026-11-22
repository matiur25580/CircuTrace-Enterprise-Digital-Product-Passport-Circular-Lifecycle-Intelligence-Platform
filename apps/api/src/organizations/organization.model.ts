import { Schema, model } from 'mongoose';

const organizationSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
  slug: { type: String, required: true, lowercase: true, trim: true, unique: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  legalName: { type: String, trim: true, maxlength: 200, default: null },
  registrationNumber: { type: String, trim: true, maxlength: 100, default: null },
  status: { type: String, enum: ['active', 'suspended', 'archived'], default: 'active', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export const OrganizationModel = model('Organization', organizationSchema);
