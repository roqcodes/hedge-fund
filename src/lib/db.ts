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
  max: 20,
  idleTimeoutMillis: 30_000,
  // Remote RDS (e.g. us-east-1 from Asia) can take 5–8s to establish TLS; 10s was too tight.
  connectionTimeoutMillis: 30_000,
  keepAlive: true,
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
