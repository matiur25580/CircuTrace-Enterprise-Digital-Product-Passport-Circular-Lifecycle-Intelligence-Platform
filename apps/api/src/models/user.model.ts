import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    displayName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    emailVerified: { type: Boolean, required: true, default: false },
    status: { type: String, enum: ['active', 'suspended'], required: true, default: 'active' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, returned) {
        delete returned.passwordHash;
        delete returned.__v;
        return returned;
      },
    },
  },
);

userSchema.index({ email: 1 }, { unique: true });

export const UserModel = model('User', userSchema);
