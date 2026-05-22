import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

let pool: Pool | null = null;

if (DATABASE_URL) {
  const cleanConnectionString = DATABASE_URL.split('?')[0];
  pool = new Pool({
    connectionString: cleanConnectionString,
    ssl: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false }, // Required for secure connections to AWS RDS
  });
} else {
  console.warn(
    'WARNING: DATABASE_URL environment variable is missing. Database operations will run in local mock fallback mode.'
  );
}

/**
 * Execute a query against the PostgreSQL database.
 * If DATABASE_URL is not set, this will throw an error advising configuration.
 */
export async function query(text: string, params?: any[]) {
  if (!pool) {
    throw new Error(
      'Database Connection Error: DATABASE_URL is not configured in your environment. Please configure it in your .env file.'
    );
  }
  return pool.query(text, params);
}

export { pool };
