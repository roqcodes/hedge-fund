import 'server-only';
import { query } from '@/lib/db';
import { SQL_ENSURE_USDT_SCHEMA } from '@/lib/sql/usdtSchemaSql';
import { SQL_ENSURE_IC_TRANSFER_SETTINGS } from '@/lib/sql/icTransferSettingsSql';
import { SQL_ENSURE_IC_FUNDS_SCHEMA } from '@/lib/sql/icFundsSchemaSql';
import { backfillICTransferFundAccounts } from '@/lib/icFunds/icTransferFundSync';
import { backfillCustomerFundAccounts } from '@/lib/icFunds/customerFundSync';

let schemaReady: Promise<void> | null = null;

/** Run idempotent DDL once per server process — not on every data fetch. */
export function ensureDbSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = runSchemaMigrations().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

async function runSchemaMigrations(): Promise<void> {
  await Promise.all([
    query(`
      CREATE TABLE IF NOT EXISTS user_page_permissions (
        user_id VARCHAR(128) NOT NULL,
        branch_id VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        page_id VARCHAR(50) NOT NULL,
        access_level VARCHAR(10) NOT NULL DEFAULT 'none' CHECK (access_level IN ('none', 'read', 'write')),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255),
        PRIMARY KEY (user_id, branch_id, page_id)
      );
    `),
    query(`
      CREATE TABLE IF NOT EXISTS user_deal_permissions (
        user_id VARCHAR(128) NOT NULL,
        deal_id VARCHAR(50) NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
        access_level VARCHAR(10) NOT NULL CHECK (access_level IN ('read', 'write')),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255),
        PRIMARY KEY (user_id, deal_id)
      );
    `),
    query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM branches WHERE id = 'br-aibak-office') THEN
          UPDATE branches SET name = 'Aibak Office Old' WHERE id = 'br-aibak-office';
          INSERT INTO branches (id, name, location, manager_name, status)
          VALUES ('BRAIBAKOFF', 'Aibak Office', 'Dubai', 'Aibak', 'active')
          ON CONFLICT (id) DO NOTHING;
          UPDATE deals SET managing_branch_id = 'BRAIBAKOFF', to_branch_id = 'BRAIBAKOFF' WHERE managing_branch_id = 'br-aibak-office' OR to_branch_id = 'br-aibak-office';
          UPDATE investors SET assigned_branch_id = 'BRAIBAKOFF' WHERE assigned_branch_id = 'br-aibak-office';
          UPDATE entities SET branch_id = 'BRAIBAKOFF' WHERE branch_id = 'br-aibak-office';
          DELETE FROM branches WHERE id = 'br-aibak-office';
        END IF;
      END $$;
    `),
  ]);

  await Promise.all([
    query(`CREATE INDEX IF NOT EXISTS idx_user_page_permissions_branch ON user_page_permissions(branch_id);`),
    query(`CREATE INDEX IF NOT EXISTS idx_user_deal_permissions_deal ON user_deal_permissions(deal_id);`),
    query(`CREATE INDEX IF NOT EXISTS idx_user_deal_permissions_user ON user_deal_permissions(user_id);`),
    query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Dubai';`),
    query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS business_date DATE;`),
    query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS entered_by VARCHAR(255);`),
    query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS entered_by_name VARCHAR(255);`),
    query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS entered_by_user_id VARCHAR(255);`),
    query(`ALTER TABLE investors ADD COLUMN IF NOT EXISTS cognito_user_id VARCHAR(128) UNIQUE;`),
    query(`CREATE INDEX IF NOT EXISTS idx_investors_cognito_user ON investors(cognito_user_id);`),
    query(SQL_ENSURE_USDT_SCHEMA),
    query(SQL_ENSURE_IC_TRANSFER_SETTINGS),
    query(SQL_ENSURE_IC_FUNDS_SCHEMA),
  ]);

  await Promise.all([
    query(`CREATE INDEX IF NOT EXISTS idx_deals_managing_branch ON deals(managing_branch_id);`),
    query(`CREATE INDEX IF NOT EXISTS idx_deal_transactions_deal_id ON deal_transactions(deal_id);`),
    query(`CREATE INDEX IF NOT EXISTS idx_deal_transaction_payouts_txn ON deal_transaction_payouts(deal_transaction_id);`),
    query(`CREATE INDEX IF NOT EXISTS idx_deal_transaction_expenses_txn ON deal_transaction_expenses(deal_transaction_id);`),
    query(`CREATE INDEX IF NOT EXISTS idx_deal_transaction_buys_txn ON deal_transaction_buys(deal_transaction_id);`),
  ]);

  await backfillICTransferFundAccounts();
  await backfillCustomerFundAccounts();
}
