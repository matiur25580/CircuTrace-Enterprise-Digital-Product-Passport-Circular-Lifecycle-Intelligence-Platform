import type { NextFunction, Request, Response } from 'express';
import { SessionModel } from '../models/session.model.js';
import { UserModel } from '../models/user.model.js';
import { AuthError } from './auth-error.js';
import type { AuthContext, AuthUser } from './auth.types.js';
import { verifyAccessToken } from './tokens.js';

function toAuthUser(user: {
  _id: { toString(): string };
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

export async function authenticate(request: Request, _response: Response, next: NextFunction) {
  try {
    const authorization = request.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      throw new AuthError('AUTHENTICATION_REQUIRED', 'A valid access token is required.');
    }

    const claims = await verifyAccessToken(authorization.slice(7).trim());
    if (!claims) throw new AuthError('INVALID_ACCESS_TOKEN', 'The access token is invalid or expired.');

    const now = new Date();
    const [session, user] = await Promise.all([
      SessionModel.findOne({
        _id: claims.sessionId,
        userId: claims.userId,
        revokedAt: null,
        expiresAt: { $gt: now },
      }).exec(),
      UserModel.findById(claims.userId).exec(),
    ]);

    if (!session) throw new AuthError('SESSION_REVOKED', 'This session is no longer active.');
    if (!user || user.status !== 'active') {
      throw new AuthError('ACCOUNT_UNAVAILABLE', 'This account is currently unavailable.', 403);
    }

    request.auth = {
      userId: user.id,
      sessionId: session.id,
      user: toAuthUser(user),
    } satisfies AuthContext;

    next();
  } catch (error) {
    next(error);
  }
}
