import { fetchInitialDataAction } from './src/app/actions/dbActions';
import { env } from './src/lib/env';
import { pool } from './src/lib/db';

async function test() {
  console.log('ENV:', env.DATABASE_URL);
  if (!pool) {
    console.log('No pool!');
    return;
  }
  console.log('Testing fetchInitialDataAction...');
  const res = await fetchInitialDataAction();
  if (!res.success) {
    console.error('FAILED:', res.error);
  } else if (res.isMockFallback) {
    console.log('MOCK FALLBACK');
  } else {
    console.log('SUCCESS! Branches:', res.data?.branches.length);
  }
}

test();
