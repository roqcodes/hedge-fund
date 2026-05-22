import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { branches } from '../data/mockData';

// 1. Manually parse `.env` to load connection credentials
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

async function runSeed() {
  loadEnv();
  
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not defined in .env');
    process.exit(1);
  }

  console.log('Connecting to AWS RDS Database...');
  const cleanConnectionString = DATABASE_URL.split('?')[0];
  const client = new Client({
    connectionString: cleanConnectionString,
    ssl: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Successfully connected to the database.');

    // 2. Read and run schema.sql (ensures tables are created)
    const schemaPath = path.resolve(process.cwd(), 'src/data/schema.sql');
    console.log(`Reading schema from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Initializing database tables (schema.sql)...');
    await client.query(schemaSql);
    console.log('Tables initialized successfully.');

    // 3. Clear all existing data to ensure a clean slate
    console.log('Clearing old mock data from all tables...');
    await client.query(
      `TRUNCATE TABLE 
        hq_balance, 
        branches, 
        transactions, 
        expenses, 
        invoices, 
        notifications, 
        investor_deposits, 
        deal_investors, 
        deals, 
        investors 
       CASCADE;`
    );
    console.log('All tables cleared.');

    // 4. Initialize HQ Balance
    console.log('Initializing HQ Treasury Balance...');
    await client.query(
      `INSERT INTO hq_balance (id, amount) 
       VALUES (1, 50000000.00) 
       ON CONFLICT (id) DO NOTHING;`
    );

    // 5. Seed Branches
    console.log(`Seeding ${branches.length} branches...`);
    for (const b of branches) {
      await client.query(
        `INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          b.id,
          b.name,
          b.location,
          b.managerName,
          b.cashBalance,
          b.goldBalance,
          b.currentBalance,
          b.openingBalance,
          b.closingBalance,
          b.dailyPL,
          b.status,
          b.lastActivity,
          b.createdAt,
        ]
      );
    }
    console.log('Branches seeded successfully.');

    console.log('════════════════════════════════════════════════');
    console.log('🎉 DATABASE RESET & BRANCHES SEEDED SUCCESSFULLY!');
    console.log('════════════════════════════════════════════════');
  } catch (error) {
    console.error('Seeding encountered an error:', error);
  } finally {
    await client.end();
  }
}

runSeed();
