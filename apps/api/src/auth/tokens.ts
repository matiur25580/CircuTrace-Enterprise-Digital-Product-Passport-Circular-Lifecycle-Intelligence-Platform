import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../config/env.js';

const accessTokenSecret = new TextEncoder().encode(env.AUTH_ACCESS_TOKEN_SECRET);
const TOKEN_ISSUER = 'circutrace-api';
const TOKEN_AUDIENCE = 'circutrace-web';

export interface AccessTokenClaims {
  userId: string;
  sessionId: string;
}

export async function createAccessToken(userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ sid: sessionId, tokenUse: 'access' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(accessTokenSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, accessTokenSecret, {
      algorithms: ['HS256'],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });

    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string' || payload.tokenUse !== 'access') {
      return null;
    }

    return { userId: payload.sub, sessionId: payload.sid };
  } catch {
    return null;
  }
}

export function createRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
