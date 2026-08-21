import 'server-only';

import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

/** Ensure every branch customer has a matching personal IC Funds account. */
export async function syncCustomerFundAccount(customerId: string): Promise<void> {
  try {
    const res = await query(
      `SELECT id, branch_id, name, phone, email, status
       FROM customers
       WHERE id = $1
       LIMIT 1`,
      [customerId],
    );
    if (res.rows.length === 0) return;

    const row = res.rows[0];
    const branchId = row.branch_id ? String(row.branch_id) : null;
    if (!branchId) return;

    const name = String(row.name || '').trim();
    if (!name) return;

    const phone = row.phone ? String(row.phone) : null;
    const status = row.status === 'inactive' ? 'inactive' : 'active';

    const existing = await query(
      `SELECT id FROM ic_fund_accounts
       WHERE branch_id = $1
         AND (
           customer_id = $2
           OR (source_type = 'ic_customer' AND source_id = $2)
         )
       LIMIT 1`,
      [branchId, customerId],
    );

    if (existing.rows.length > 0) {
      await query(
        `UPDATE ic_fund_accounts
         SET name = $1,
             phone = COALESCE($2, phone),
             status = $3,
             customer_id = $4,
             source_type = COALESCE(source_type, 'ic_customer'),
             source_id = COALESCE(source_id, $4)
         WHERE id = $5`,
        [name, phone, status, customerId, String(existing.rows[0].id)],
      );
      return;
    }

    const id = `ICFA-${crypto.randomUUID().slice(0, 10).toUpperCase()}`;
    try {
      await query(
        `INSERT INTO ic_fund_accounts (
           id, branch_id, name, account_type, opening_balance, notes,
           customer_id, phone, source_type, source_id, status
         ) VALUES ($1, $2, $3, 'personal', 0, $4, $5, $6, 'ic_customer', $5, $7)`,
        [
          id,
          branchId,
          name,
          'Auto-synced from Customers',
          customerId,
          phone,
          status,
        ],
      );
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== '23505') throw err;
      const altName = `${name} [${customerId.slice(0, 8)}]`;
      await query(
        `INSERT INTO ic_fund_accounts (
           id, branch_id, name, account_type, opening_balance, notes,
           customer_id, phone, source_type, source_id, status
         ) VALUES ($1, $2, $3, 'personal', 0, $4, $5, $6, 'ic_customer', $5, $7)`,
        [id, branchId, altName, 'Auto-synced from Customers', customerId, phone, status],
      );
    }
  } catch (err) {
    logger.error({ err, customerId }, 'Failed to sync customer fund account');
  }
}

export async function backfillCustomerFundAccounts(): Promise<void> {
  try {
    const res = await query(
      `SELECT id FROM customers WHERE branch_id IS NOT NULL ORDER BY created_at ASC`,
    );
    for (const row of res.rows) {
      await syncCustomerFundAccount(String(row.id));
    }
  } catch (err) {
    logger.error({ err }, 'Failed to backfill customer fund accounts');
  }
}

export async function deactivateCustomerFundAccount(customerId: string): Promise<void> {
  try {
    await query(
      `UPDATE ic_fund_accounts
       SET status = 'inactive'
       WHERE customer_id = $1 OR (source_type = 'ic_customer' AND source_id = $1)`,
      [customerId],
    );
  } catch (err) {
    logger.error({ err, customerId }, 'Failed to deactivate customer fund account');
  }
}
