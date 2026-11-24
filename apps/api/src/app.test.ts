import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './app.js';

describe('API health endpoint', () => {
  it('returns a healthy service response', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.service).toBe('circutrace-api');
  });

  it('reports not ready when the database is disconnected', async () => {
    const response = await request(app).get('/api/v1/ready');

    expect(response.status).toBe(503);
    expect(response.body.data.status).toBe('not_ready');
  });

  it('returns a safe not-found response', async () => {
    const response = await request(app).get('/api/v1/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('API security middleware', () => {
  it('sets baseline security headers and does not expose Express', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('allows the configured browser origin but does not reflect an untrusted origin', async () => {
    const allowed = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:5173');
    const denied = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'https://untrusted.example');

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(denied.headers['access-control-allow-origin']).not.toBe('https://untrusted.example');
  });
});
