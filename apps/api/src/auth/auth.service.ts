import { randomUUID } from 'node:crypto';
import type { Types } from 'mongoose';
import { env } from '../config/env.js';
import { SessionModel } from '../models/session.model.js';
import { UserModel } from '../models/user.model.js';
import { AuthError } from './auth-error.js';
import type { AuthUser, SessionMetadata } from './auth.types.js';
import { hashPassword, verifyPassword } from './password.js';
import { createAccessToken, createRefreshToken, hashRefreshToken } from './tokens.js';

const REFRESH_TOKEN_TTL_MS = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

function toAuthUser(user: {
  _id: Types.ObjectId;
  displayName: string;
  email: string;
  emailVerified: boolean;
  createdAt?: Date;
}): AuthUser {
  return {
    id: user._id.toString(),
    displayName: user.displayName,
    email: user.email,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

async function issueSession(
  userId: string,
  metadata: SessionMetadata,
  familyId = randomUUID(),
): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
  const refreshToken = createRefreshToken();
  const session = await SessionModel.create({
    userId,
    tokenHash: hashRefreshToken(refreshToken),
    familyId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    userAgent: metadata.userAgent?.slice(0, 500) ?? null,
    ipAddress: metadata.ipAddress?.slice(0, 64) ?? null,
  });

  return {
    accessToken: await createAccessToken(userId, session.id),
    refreshToken,
    sessionId: session.id,
  };
}

export async function registerUser(
  input: { displayName: string; email: string; password: string },
  metadata: SessionMetadata,
) {
  const email = input.email.trim().toLowerCase();
  const existing = await UserModel.exists({ email });
  if (existing) throw new AuthError('EMAIL_ALREADY_REGISTERED', 'An account with this email already exists.', 409);

  const passwordHash = await hashPassword(input.password);
  const user = await UserModel.create({ displayName: input.displayName.trim(), email, passwordHash }).catch((error: unknown) => {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      throw new AuthError('EMAIL_ALREADY_REGISTERED', 'An account with this email already exists.', 409);
    }
    throw error;
  });

  const tokens = await issueSession(user.id, metadata);
  return { ...tokens, user: toAuthUser(user) };
}

export async function loginUser(
  input: { email: string; password: string },
  metadata: SessionMetadata,
) {
  const user = await UserModel.findOne({ email: input.email.trim().toLowerCase() })
    .select('+passwordHash')
    .exec();

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AuthError('INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }
  if (user.status !== 'active') {
    throw new AuthError('ACCOUNT_UNAVAILABLE', 'This account is currently unavailable.', 403);
  }

  const tokens = await issueSession(user.id, metadata);
  return { ...tokens, user: toAuthUser(user) };
}

export async function rotateRefreshToken(refreshToken: string, metadata: SessionMetadata) {
  const tokenHash = hashRefreshToken(refreshToken);
  const current = await SessionModel.findOne({ tokenHash }).select('+tokenHash').exec();
  if (!current) throw new AuthError('INVALID_REFRESH_TOKEN', 'The refresh session is invalid.');

  const now = new Date();
  if (current.revokedAt) {
    await SessionModel.updateMany(
      { familyId: current.familyId, revokedAt: null },
      { $set: { revokedAt: now } },
    ).exec();
    throw new AuthError('REFRESH_TOKEN_REUSE', 'The refresh session is no longer valid.');
  }
  if (current.expiresAt <= now) {
    throw new AuthError('REFRESH_SESSION_EXPIRED', 'The refresh session has expired.');
  }

  const user = await UserModel.findById(current.userId).exec();
  if (!user || user.status !== 'active') {
    await SessionModel.updateMany(
      { familyId: current.familyId, revokedAt: null },
      { $set: { revokedAt: now } },
    ).exec();
    throw new AuthError('ACCOUNT_UNAVAILABLE', 'This account is currently unavailable.', 403);
  }

  const nextRefreshToken = createRefreshToken();
  const nextSession = await SessionModel.create({
    userId: user.id,
    tokenHash: hashRefreshToken(nextRefreshToken),
    familyId: current.familyId,
    expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
    userAgent: metadata.userAgent?.slice(0, 500) ?? null,
    ipAddress: metadata.ipAddress?.slice(0, 64) ?? null,
  });

  const consumed = await SessionModel.findOneAndUpdate(
    { _id: current._id, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now, replacedBySessionId: nextSession._id } },
    { new: true },
  ).exec();

  if (!consumed) {
    await SessionModel.deleteOne({ _id: nextSession._id }).exec();
    await SessionModel.updateMany(
      { familyId: current.familyId, revokedAt: null },
      { $set: { revokedAt: now } },
    ).exec();
    throw new AuthError('REFRESH_TOKEN_REUSE', 'The refresh session is no longer valid.');
  }

  return {
    accessToken: await createAccessToken(user.id, nextSession.id),
    refreshToken: nextRefreshToken,
    sessionId: nextSession.id,
    user: toAuthUser(user),
  };
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await SessionModel.findOneAndUpdate(
    { tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  ).exec();
}

export async function revokeUserSession(userId: string, sessionId: string): Promise<boolean> {
  const result = await SessionModel.findOneAndUpdate(
    { _id: sessionId, userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  ).exec();
  return result !== null;
}

export async function listUserSessions(userId: string, currentSessionId: string) {
  const sessions = await SessionModel.find({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .select('createdAt expiresAt userAgent ipAddress')
    .lean()
    .exec();

  return sessions.map((session) => ({
    id: session._id.toString(),
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    current: session._id.toString() === currentSessionId,
  }));
}
