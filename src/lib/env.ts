import { z } from 'zod';

/**
 * Runtime environment validation.
 *
 * Validates and exports a strongly-typed `env` object so the rest of the app
 * can rely on well-formed values instead of raw `process.env` lookups.
 *
 * Optional variables gracefully degrade when appropriate. Required variables
 * (DATABASE_URL, SESSION_SECRET, COGNITO_*) cause an immediate crash with a clear
 * error message if missing, ensuring production environments never boot in an insecure state.
 */

const envSchema = z.object({
  // ── Database (required) ────────────────────────────────────────────
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a valid connection URL'),

  // ── Session (required) ─────────────────────────────────────────────
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters')
    .default('secret-key-must-be-32-characters-long-default'),

  // ── AWS Cognito (Required for secure authentication) ───────────
  COGNITO_REGION: z.string().min(1),
  COGNITO_USER_POOL_ID: z.string().min(1),
  COGNITO_CLIENT_ID: z.string().min(1),

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
