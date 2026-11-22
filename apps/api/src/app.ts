import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ redact: ['req.headers.authorization', 'req.headers.cookie'] }));
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
  response.status(200).json({
    data: {
      status: 'ok',
      service: 'circutrace-api',
      timestamp: new Date().toISOString(),
    },
  });
});

app.get('/api/v1/ready', (_request, response) => {
  response.status(200).json({ data: { status: 'ready' } });
});

app.use((_request, response) => {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    },
  });
});
