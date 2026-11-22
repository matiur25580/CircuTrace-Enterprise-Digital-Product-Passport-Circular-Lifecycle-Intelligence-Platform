import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('authentication API validation and access controls', () => {
  it('rejects registration with a short password before database access', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Test User',
      email: 'test@example.com',
      password: 'short',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects malformed login payloads', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'not-an-email',
      password: '',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects authentication requests from an untrusted browser origin', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'https://untrusted.example');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('UNTRUSTED_ORIGIN');
  });

  it('requires a refresh cookie to rotate a session', async () => {
    const response = await request(app).post('/api/v1/auth/refresh');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('REFRESH_TOKEN_REQUIRED');
  });

  it('protects the current-user endpoint', async () => {
    const response = await request(app).get('/api/v1/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('rejects invalid session identifiers', async () => {
    const response = await request(app)
      .delete('/api/v1/auth/sessions/not-an-object-id')
      .set('Authorization', 'Bearer invalid');

    expect(response.status).toBe(401);
  });
});
