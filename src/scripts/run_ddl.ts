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
          process.env[key.trim()] = val.replace(/(^["']|["']$)/g, '');
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

  try {
    await client.connect();
    console.log('Connected to DB');

    const sql = `
      CREATE TABLE IF NOT EXISTS deal_transaction_payouts (
          id VARCHAR(50) PRIMARY KEY,
          deal_transaction_id VARCHAR(50) NOT NULL REFERENCES deal_transactions(id) ON DELETE CASCADE,
          investor_id VARCHAR(50) NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
          investor_name VARCHAR(255) NOT NULL,
          payout_amount DECIMAL(15, 2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_dtp_deal_transaction_id ON deal_transaction_payouts(deal_transaction_id);
    `;

    await client.query(sql);
    console.log('Table deal_transaction_payouts created successfully.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
