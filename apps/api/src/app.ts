import cors from 'cors';
import express, { type Express } from 'express';
import mongoose from 'mongoose';
import type { HealthResponse } from '@circutrace/shared-types';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env.js';

// Assemble the API middleware stack and lightweight health/readiness endpoints.
export const app: Express = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use((request, response, next) => {
  const startedAt = Date.now();
  response.on('finish', () => {
    console.info(JSON.stringify({
      level: 'info',
      event: 'http_request',
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      durationMs: Date.now() - startedAt,
    }));
  });
  next();
});
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
);

app.get('/api/v1/health', (_request, response) => {
  const health: HealthResponse = {
    status: 'ok',
    service: 'circutrace-api',
    timestamp: new Date().toISOString(),
  };
  response.status(200).json({ data: health });
});

app.get('/api/v1/ready', (_request, response) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  response.status(databaseConnected ? 200 : 503).json({
    data: { status: databaseConnected ? 'ready' : 'not_ready' },
  });
});

app.use((_request, response) => {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    },
  });
});
