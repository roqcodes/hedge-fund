import { query } from './src/lib/db';

async function run() {
  const res = await query("UPDATE transactions SET business_date = '2026-06-22' WHERE business_date > '2026-06-22'");
  console.log(res.rows);
  process.exit(0);
}
run();
