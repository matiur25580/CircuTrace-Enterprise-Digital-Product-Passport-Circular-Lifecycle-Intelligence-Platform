import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { SessionModel } from '../models/session.model.js';
import { UserModel } from '../models/user.model.js';
import { verifyPassword } from './password.js';

const mongoUri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/circutrace_test';

function readRefreshCookie(response: request.Response): string {
  const cookies = response.headers['set-cookie'] as string[] | undefined;
  const cookie = cookies?.find((value) => value.startsWith('circutrace_refresh='));
  if (!cookie) throw new Error('Expected the API to issue an HttpOnly refresh cookie.');
  return cookie.split(';')[0];
}

describe('authentication session lifecycle (MongoDB integration)', () => {
  beforeAll(async () => {
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    await Promise.all([UserModel.deleteMany({}), SessionModel.deleteMany({})]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('registers, authenticates, rotates, and revokes a session on logout', async () => {
    const registration = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Lifecycle Test',
      email: 'lifecycle@example.com',
      password: 'a-strong-password-for-tests-123',
    });

    expect(registration.status).toBe(201);
    expect(registration.body.data.user.email).toBe('lifecycle@example.com');
    const firstAccessToken = registration.body.data.accessToken as string;
    const firstRefreshCookie = readRefreshCookie(registration);

    const storedUser = await UserModel.findOne({ email: 'lifecycle@example.com' })
      .select('+passwordHash')
      .exec();
    expect(storedUser).not.toBeNull();
    expect(storedUser?.passwordHash).not.toBe('a-strong-password-for-tests-123');
    await expect(verifyPassword('a-strong-password-for-tests-123', storedUser!.passwordHash)).resolves.toBe(true);

    const currentIdentity = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${firstAccessToken}`);
    expect(currentIdentity.status).toBe(200);

    const refresh = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', firstRefreshCookie);
    expect(refresh.status).toBe(200);
    const secondAccessToken = refresh.body.data.accessToken as string;
    const secondRefreshCookie = readRefreshCookie(refresh);
    expect(secondAccessToken).not.toBe(firstAccessToken);

    const oldSessionAccess = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${firstAccessToken}`);
    expect(oldSessionAccess.status).toBe(401);

    const newSessionAccess = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${secondAccessToken}`);
    expect(newSessionAccess.status).toBe(200);

    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', secondRefreshCookie);
    expect(logout.status).toBe(204);

    const revokedAccess = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${secondAccessToken}`);
    expect(revokedAccess.status).toBe(401);
  });

  it('revokes a refresh-token family when a rotated token is reused', async () => {
    const registration = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Reuse Test',
      email: 'reuse@example.com',
      password: 'a-strong-password-for-tests-456',
    });
    expect(registration.status).toBe(201);
    const originalCookie = readRefreshCookie(registration);

    const rotation = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', originalCookie);
    expect(rotation.status).toBe(200);

    const reuse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', originalCookie);
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('REFRESH_TOKEN_REUSE');

    const rotatedAccess = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${rotation.body.data.accessToken as string}`);
    expect(rotatedAccess.status).toBe(401);
  });

  it('lists and revokes only sessions belonging to the authenticated user', async () => {
    const first = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Session Owner',
      email: 'owner@example.com',
      password: 'a-strong-password-for-tests-789',
    });
    const ownerAccess = first.body.data.accessToken as string;

    const secondLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@example.com',
      password: 'a-strong-password-for-tests-789',
    });
    expect(secondLogin.status).toBe(200);
    const secondAccess = secondLogin.body.data.accessToken as string;

    const sessionList = await request(app)
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${ownerAccess}`);
    expect(sessionList.status).toBe(200);
    expect(sessionList.body.data.sessions).toHaveLength(2);

    const otherSession = (sessionList.body.data.sessions as Array<{ id: string; current: boolean }>)
      .find((session) => !session.current);
    expect(otherSession).toBeDefined();

    const revoke = await request(app)
      .delete(`/api/v1/auth/sessions/${otherSession!.id}`)
      .set('Authorization', `Bearer ${ownerAccess}`);
    expect(revoke.status).toBe(204);

    const revokedSessionAccess = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${secondAccess}`);
    expect(revokedSessionAccess.status).toBe(401);
  });
});
