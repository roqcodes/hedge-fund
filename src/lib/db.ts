import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

let prismaInstance: PrismaClient;

if (globalForPrisma.prisma) {
  prismaInstance = globalForPrisma.prisma;
} else {
  let connectionString = process.env.DATABASE_URL;
  const useSsl = connectionString?.includes('sslmode=require') || connectionString?.includes('rds.amazonaws.com');

  if (connectionString) {
    connectionString = connectionString.replace(/\?sslmode=[^&]+/, '').replace(/&sslmode=[^&]+/, '');
  }

  const poolConnection = new pg.Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

  const adapter = new PrismaPg(poolConnection);

  prismaInstance = new PrismaClient({
    adapter,
    log: ['query', 'info', 'warn', 'error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance;
  }
}

export const prisma = prismaInstance;
export { prisma as pool }; // keeping 'pool' for temporary backward compatibility if needed, though we will refactor dbActions
