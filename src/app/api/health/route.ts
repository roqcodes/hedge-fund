import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

/**
 * GET /api/health
 *
 * Health-check endpoint for load balancers, uptime monitors, and
 * third-party integration readiness checks.
 *
 * Returns:
 *   { status: "ok", db: "connected"|"disconnected", timestamp: ISO string }
 */
export async function GET() {
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';

  if (pool) {
    try {
      await pool.query('SELECT 1');
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }
  }

  const payload = {
    status: 'ok' as const,
    db: dbStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
  };

  return NextResponse.json(payload, {
    status: dbStatus === 'connected' ? 200 : 503,
  });
}
