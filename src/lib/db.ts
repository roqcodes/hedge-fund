import { Pool } from 'pg';
import { env } from '@/lib/env';

// ── Connection Pool ──────────────────────────────────────────────────

// Parse the URL to safely strip query parameters (like ?sslmode=require) 
// which can interfere with our explicit ssl configuration below.
const parsedUrl = new URL(env.DATABASE_URL);
parsedUrl.search = '';
const cleanUrl = parsedUrl.toString();

let pool: Pool;

const poolConfig = {
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
};

if (process.env.NODE_ENV === 'production') {
  pool = new Pool(poolConfig);
} else {
  const globalWithPool = globalThis as unknown as {
    pool?: Pool;
  };
  if (!globalWithPool.pool) {
    globalWithPool.pool = new Pool(poolConfig);
  }
  pool = globalWithPool.pool;
}

// Log connection errors rather than crashing the process
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

/**
 * Execute a query against the PostgreSQL database.
 */
export async function query(text: string, params?: unknown[]) {
  return pool.query(text, params);
}

export { pool };
