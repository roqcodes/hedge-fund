import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=');
        const val = values.join('=').trim();
        if (key && val) {
          process.env[key.trim()] = val.replace(/(^["']|["']$)/g, ''); // strip optional quotes
        }
      }
    });
  }
}

async function run() {
  loadEnv();
  const client = new Client({
    connectionString: process.env.DATABASE_URL?.split('?')[0],
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const res1 = await client.query('SELECT COUNT(*) FROM investors;');
  const res2 = await client.query('SELECT COUNT(*) FROM deals;');
  console.log('investors count:', res1.rows[0].count);
  console.log('deals count:', res2.rows[0].count);
  await client.end();
}
run();
