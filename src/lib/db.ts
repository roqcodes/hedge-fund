import { Pool } from 'pg';
import { env } from '@/lib/env';

// ── Connection Pool ──────────────────────────────────────────────────
let pool: Pool | null = null;

if (env.DATABASE_URL) {
  // Parse the URL to safely strip query parameters (like ?sslmode=require) 
  // which can interfere with our explicit ssl configuration below.
  const parsedUrl = new URL(env.DATABASE_URL);
  parsedUrl.search = '';
  const cleanUrl = parsedUrl.toString();

  pool = new Pool({
    connectionString: cleanUrl,
    ssl:
      env.DATABASE_URL.includes('localhost') ||
      env.DATABASE_URL.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
    // Production pool tuning
    max: 20,                  // max simultaneous connections
    idleTimeoutMillis: 30_000, // close idle clients after 30s
    connectionTimeoutMillis: 10_000, // fail if connection takes > 10s
  });

  // Log connection errors rather than crashing the process
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });
} else {
  console.warn(
    'WARNING: DATABASE_URL environment variable is missing. ' +
      'Database operations will run in local mock fallback mode.',
  );
}

/**
 * Execute a query against the PostgreSQL database.
 * If DATABASE_URL is not set, this will throw an error advising configuration.
 */
export async function query(text: string, params?: unknown[]) {
  if (!pool) {
    throw new Error(
      'Database Connection Error: DATABASE_URL is not configured in your ' +
        'environment. Please configure it in your .env file.',
    );
  }
  return pool.query(text, params);
}

export { pool };
