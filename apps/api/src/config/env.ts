import { z } from 'zod';

const DEVELOPMENT_AUTH_SECRET = 'local-development-only-secret-change-before-deploy';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().url().optional(),
  AUTH_ACCESS_TOKEN_SECRET: z.string().min(32).default(DEVELOPMENT_AUTH_SECRET),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production' && value.AUTH_ACCESS_TOKEN_SECRET === DEVELOPMENT_AUTH_SECRET) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['AUTH_ACCESS_TOKEN_SECRET'],
      message: 'A unique AUTH_ACCESS_TOKEN_SECRET must be configured in production.',
    });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid API environment: ${parsed.error.message}`);
}

export const env = parsed.data;
