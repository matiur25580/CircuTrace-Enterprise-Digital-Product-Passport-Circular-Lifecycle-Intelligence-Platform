import mongoose from 'mongoose';
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

    const connected = mongoose.connection.readyState === 1;
    expect(response.status).toBe(connected ? 200 : 503);
    expect(response.body.data.status).toBe(connected ? 'ready' : 'not_ready');
  });

  it('returns a safe not-found response', async () => {
    const response = await request(app).get('/api/v1/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
