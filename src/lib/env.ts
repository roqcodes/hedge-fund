import { z } from 'zod';

/**
 * Runtime environment validation.
 *
 * Validates and exports a strongly-typed `env` object so the rest of the app
 * can rely on well-formed values instead of raw `process.env` lookups.
 *
 * Optional variables (COGNITO_*) gracefully degrade — the app runs in
 * developer-mock auth mode when they are absent.  Required variables
 * (DATABASE_URL, SESSION_SECRET) cause an immediate crash with a clear
 * error message if missing.
 */

const envSchema = z.object({
  // ── Database (required) ────────────────────────────────────────────
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a valid connection URL')
    .optional(),

  // ── Session (required) ─────────────────────────────────────────────
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters')
    .default('secret-key-must-be-32-characters-long-default'),

  // ── AWS Cognito (optional — falls back to dev mock auth) ───────────
  COGNITO_REGION: z.string().optional(),
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),

  // ── Node ───────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');

    console.error(
      `\n╔══════════════════════════════════════════════════╗\n` +
      `║  ENVIRONMENT VALIDATION FAILED                   ║\n` +
      `╚══════════════════════════════════════════════════╝\n\n` +
      `${formatted}\n\n` +
      `Copy .env.example → .env and fill in the required values.\n`,
    );

    throw new Error('Invalid environment configuration. See errors above.');
  }

  return result.data;
}

export const env = validateEnv();
