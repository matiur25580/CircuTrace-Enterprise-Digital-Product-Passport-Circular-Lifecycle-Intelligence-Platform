import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { AuthError } from './auth-error.js';
import { authenticate } from './auth.middleware.js';
import {
  listUserSessions,
  loginUser,
  registerUser,
  revokeRefreshToken,
  revokeUserSession,
  rotateRefreshToken,
} from './auth.service.js';

const router = Router();
const REFRESH_COOKIE = 'circutrace_refresh';
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
};

const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must not exceed 72 UTF-8 bytes.'),
}).strict();

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72),
}).strict();

function sessionMetadata(request: Request) {
  return {
    userAgent: request.get('user-agent'),
    ipAddress: request.ip,
  };
}

function setRefreshCookie(response: Response, token: string) {
  response.cookie(REFRESH_COOKIE, token, {
    ...cookieOptions,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function validateBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AuthError('VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join('; '), 400);
  }
  return parsed.data;
}

function sendAuthResponse(response: Response, result: {
  accessToken: string;
  refreshToken: string;
  user: unknown;
}) {
  setRefreshCookie(response, result.refreshToken);
  response.status(200).json({
    data: {
      accessToken: result.accessToken,
      tokenType: 'Bearer',
      expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
      user: result.user,
    },
  });
}

router.post('/register', async (request, response) => {
  const input = validateBody(registerSchema, request.body);
  const result = await registerUser(input, sessionMetadata(request));
  setRefreshCookie(response, result.refreshToken);
  response.status(201).json({
    data: {
      accessToken: result.accessToken,
      tokenType: 'Bearer',
      expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
      user: result.user,
    },
  });
});

router.post('/login', async (request, response) => {
  const input = validateBody(loginSchema, request.body);
  const result = await loginUser(input, sessionMetadata(request));
  sendAuthResponse(response, result);
});

router.post('/refresh', async (request, response) => {
  const token = request.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) throw new AuthError('REFRESH_TOKEN_REQUIRED', 'A refresh session is required.');
  const result = await rotateRefreshToken(token, sessionMetadata(request));
  sendAuthResponse(response, result);
});

router.post('/logout', async (request, response) => {
  const token = request.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (token) await revokeRefreshToken(token);
  response.clearCookie(REFRESH_COOKIE, cookieOptions);
  response.status(204).send();
});

router.get('/me', authenticate, (request, response) => {
  if (!request.auth) throw new AuthError('AUTHENTICATION_REQUIRED', 'A valid access token is required.');
  response.status(200).json({ data: { user: request.auth.user } });
});

router.get('/sessions', authenticate, async (request, response) => {
  if (!request.auth) throw new AuthError('AUTHENTICATION_REQUIRED', 'A valid access token is required.');
  const sessions = await listUserSessions(request.auth.userId, request.auth.sessionId);
  response.status(200).json({ data: { sessions } });
});

router.delete('/sessions/:sessionId', authenticate, async (request, response) => {
  if (!request.auth) throw new AuthError('AUTHENTICATION_REQUIRED', 'A valid access token is required.');
  if (!/^[a-f\d]{24}$/i.test(request.params.sessionId)) {
    throw new AuthError('INVALID_SESSION_ID', 'The session identifier is invalid.', 400);
  }
  const revoked = await revokeUserSession(request.auth.userId, request.params.sessionId);
  if (!revoked) throw new AuthError('SESSION_NOT_FOUND', 'The session was not found or is already revoked.', 404);
  response.status(204).send();
});

export { router as authRouter };
