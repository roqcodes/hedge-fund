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

    // Find all fixed transactions
    const txnsRes = await client.query(`
      SELECT dt.*, d.amount as group_amount
      FROM deal_transactions dt
      JOIN deals d ON d.id = dt.deal_id
      WHERE dt.fix_or_unfix = 'fixed'
    `);
    
    console.log(`Found ${txnsRes.rowCount} fixed transactions.`);

    let insertedCount = 0;

    for (const txn of txnsRes.rows) {
      // Check if payouts already exist
      const existingRes = await client.query(
        'SELECT COUNT(*) FROM deal_transaction_payouts WHERE deal_transaction_id = $1',
        [txn.id]
      );
      if (parseInt(existingRes.rows[0].count, 10) > 0) {
        continue; // Already migrated
      }

      // Find deal investors
      const invRes = await client.query(
        'SELECT * FROM deal_investors WHERE deal_id = $1',
        [txn.deal_id]
      );
      
      const groupAmount = parseFloat(txn.group_amount);
      const grossProfit = parseFloat(txn.gross_profit); // net profit stored here
      const managementProfit = parseFloat(txn.management_profit);
      const investorProfitPool = grossProfit - managementProfit;

      for (const inv of invRes.rows) {
        const invAmount = parseFloat(inv.amount);
        const shareRatio = groupAmount > 0 ? invAmount / groupAmount : 0;
        const payout = investorProfitPool * shareRatio;

        const payoutId = `payout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        await client.query(
          `INSERT INTO deal_transaction_payouts 
          (id, deal_transaction_id, investor_id, investor_name, payout_amount)
          VALUES ($1, $2, $3, $4, $5)`,
          [payoutId, txn.id, inv.investor_id, inv.investor_name, payout]
        );
        insertedCount++;
      }
    }

    console.log(`Successfully generated and inserted ${insertedCount} historical payouts.`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
