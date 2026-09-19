import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
    JWT_ACCESS_EXPIRES_IN: z.string().min(1).default('15m'),
    JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
    JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),
    CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    TAX_RATE: z.coerce.number().min(0).max(1).default(0.08),
    SHIPPING_FLAT_RATE: z.coerce.number().min(0).default(9.99),
    FREE_SHIPPING_THRESHOLD: z.coerce.number().min(0).default(75),
    STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
    STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
    STRIPE_PUBLISHABLE_KEY: z.string().min(1, 'STRIPE_PUBLISHABLE_KEY is required'),
    REDIS_URL: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      z.string().url().optional(),
    ),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional(),
  })
  .refine((value) => value.JWT_SECRET !== value.JWT_REFRESH_SECRET, {
    path: ['JWT_REFRESH_SECRET'],
    message: 'JWT_REFRESH_SECRET must be different from JWT_SECRET',
  });

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `  - ${path}: ${issue.message}`;
    })
    .join('\n');
}

function loadEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    process.stderr.write(`Invalid environment configuration:\n${formatIssues(result.error)}\n`);
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();

export type Env = typeof env;
