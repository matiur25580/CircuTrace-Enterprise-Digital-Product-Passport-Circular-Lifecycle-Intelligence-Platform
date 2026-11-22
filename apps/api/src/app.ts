import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import mongoose from 'mongoose';
import type { HealthResponse } from '@circutrace/shared-types';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env.js';
import { AuthError } from './auth/auth-error.js';
import { authRouter } from './auth/auth.routes.js';
import { organizationRouter } from './organizations/organization.routes.js';
import { partnerRouter } from './partners/partner.routes.js';
import { partnerInvitationAcceptanceRouter, partnerInvitationRouter } from './partners/partner-invitation.routes.js';

export const app: Express = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
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
app.use(
  '/api/v1/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
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

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/organizations', organizationRouter);
app.use('/api/v1/organizations/:organizationId/partners/:partnerId/invitations', partnerInvitationRouter);
app.use('/api/v1/partner-invitations', partnerInvitationAcceptanceRouter);
app.use('/api/v1/organizations/:organizationId/partners', partnerRouter);

app.use((_request, response) => {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    },
  });
});

app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
  void next;
  if (error instanceof AuthError) {
    response.status(error.statusCode).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    response.status(400).json({
      error: { code: 'INVALID_JSON', message: 'The request body contains invalid JSON.' },
    });
    return;
  }

  console.error('Unhandled API error', error instanceof Error ? { name: error.name } : { type: typeof error });
  response.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' },
  });
});
