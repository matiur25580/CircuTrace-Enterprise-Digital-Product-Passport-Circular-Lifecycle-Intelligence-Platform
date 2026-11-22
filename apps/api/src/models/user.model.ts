import { Schema, model } from 'mongoose';

interface UserRecord {
  displayName: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  status: 'active' | 'suspended';
}

const userSchema = new Schema<UserRecord>(
  {
    displayName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    emailVerified: { type: Boolean, required: true, default: false },
    status: { type: String, enum: ['active', 'suspended'], required: true, default: 'active' },
  },
  { timestamps: true },
);

export const UserModel = model<UserRecord>('User', userSchema);
