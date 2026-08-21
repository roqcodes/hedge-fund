import 'server-only';

import type { QueryResult } from 'pg';
import { query, pool } from '@/lib/db';
import { validateVoucherAccounts } from '@/lib/icFunds/voucherRules';
import { deleteAutoLedgerEntryByReference } from '@/app/actions/fundActions';
import { logger } from '@/lib/logger';

type DbClient = {
  query: (text: string, params?: unknown[]) => Promise<QueryResult>;
};

const db: DbClient = { query };

export type ICFundAccountSourceType = 'ic_supplier' | 'ic_warehouse' | 'ic_customer';

const STARTER_TILLS = ['Collection', 'Fund', 'Cashier'] as const;
const SYNC_ACTOR = 'IC Transfer sync';

function isoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const raw = String(value ?? '');
  return raw.length >= 10 ? raw.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function accountDisplayName(sourceType: ICFundAccountSourceType, name: string): string {
  if (sourceType === 'ic_warehouse') return `Warehouse: ${name}`;
  return name.trim();
}

async function ensureStarterTills(client: DbClient, branchId: string): Promise<void> {
  for (const name of STARTER_TILLS) {
    const exists = await client.query(
      `SELECT 1 FROM ic_fund_accounts WHERE branch_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) LIMIT 1`,
      [branchId, name],
    );
    if (exists.rows.length > 0) continue;
    const id = `ICFA-${crypto.randomUUID().slice(0, 10).toUpperCase()}`;
    await client.query(
      `INSERT INTO ic_fund_accounts (id, branch_id, name, account_type, opening_balance, notes)
       VALUES ($1, $2, $3, 'bank', 0, 'Auto-seeded for IC Transfer')`,
      [id, branchId, name],
    );
  }
}

async function ensureLinkedAccount(
  client: DbClient,
  params: {
    branchId: string;
    sourceType: ICFundAccountSourceType;
    sourceId: string;
    name: string;
    phone?: string | null;
    customerId?: string | null;
  },
): Promise<string | null> {
  if (!params.name.trim()) return null;

  const existing = await client.query(
    `SELECT id FROM ic_fund_accounts
     WHERE branch_id = $1 AND source_type = $2 AND source_id = $3
     LIMIT 1`,
    [params.branchId, params.sourceType, params.sourceId],
  );
  if (existing.rows.length > 0) {
    const accountId = String(existing.rows[0].id);
    await client.query(
      `UPDATE ic_fund_accounts
       SET name = $1, phone = COALESCE($2, phone), customer_id = COALESCE($3, customer_id)
       WHERE id = $4`,
      [
        accountDisplayName(params.sourceType, params.name),
        params.phone || null,
        params.customerId || null,
        accountId,
      ],
    );
    return accountId;
  }

  const id = `ICFA-${crypto.randomUUID().slice(0, 10).toUpperCase()}`;
  const displayName = accountDisplayName(params.sourceType, params.name);
  try {
    await client.query(
      `INSERT INTO ic_fund_accounts (
         id, branch_id, name, account_type, opening_balance, notes,
         source_type, source_id, phone, customer_id
       ) VALUES ($1, $2, $3, 'personal', 0, $4, $5, $6, $7, $8)`,
      [
        id,
        params.branchId,
        displayName,
        `Auto-synced from IC Transfer (${params.sourceType.replace('ic_', '')})`,
        params.sourceType,
        params.sourceId,
        params.phone || null,
        params.customerId || null,
      ],
    );
    return id;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== '23505') throw err;
    const altName = `${displayName} [${params.sourceId.slice(0, 8)}]`;
    await client.query(
      `INSERT INTO ic_fund_accounts (
         id, branch_id, name, account_type, opening_balance, notes,
         source_type, source_id, phone, customer_id
       ) VALUES ($1, $2, $3, 'personal', 0, $4, $5, $6, $7, $8)`,
      [
        id,
        params.branchId,
        altName,
        `Auto-synced from IC Transfer (${params.sourceType.replace('ic_', '')})`,
        params.sourceType,
        params.sourceId,
        params.phone || null,
        params.customerId || null,
      ],
    );
    return id;
  }
}

async function ensureSystemAccount(
  client: DbClient,
  branchId: string,
  name: string,
  accountType: 'income' | 'd_expense',
  sourceId: string,
): Promise<string> {
  const existing = await client.query(
    `SELECT id FROM ic_fund_accounts
     WHERE branch_id = $1 AND source_type = 'ic_system' AND source_id = $2
     LIMIT 1`,
    [branchId, sourceId],
  );
  if (existing.rows.length > 0) return String(existing.rows[0].id);

  const id = `ICFA-${crypto.randomUUID().slice(0, 10).toUpperCase()}`;
  await client.query(
    `INSERT INTO ic_fund_accounts (
       id, branch_id, name, account_type, opening_balance, notes, source_type, source_id
     ) VALUES ($1, $2, $3, $4, 0, 'Auto-seeded for IC Transfer', 'ic_system', $5)`,
    [id, branchId, name, accountType, sourceId],
  );
  return id;
}

async function resolveBankTillAccount(
  client: DbClient,
  branchId: string,
  bankHint?: string | null,
): Promise<string | null> {
  await ensureStarterTills(client, branchId);
  const hint = bankHint?.trim();
  if (hint) {
    const match = await client.query(
      `SELECT id FROM ic_fund_accounts
       WHERE branch_id = $1 AND account_type = 'bank' AND status = 'active'
         AND LOWER(TRIM(name)) = LOWER(TRIM($2))
       LIMIT 1`,
      [branchId, hint],
    );
    if (match.rows.length > 0) return String(match.rows[0].id);
  }
  for (const fallback of STARTER_TILLS) {
    const res = await client.query(
      `SELECT id FROM ic_fund_accounts
       WHERE branch_id = $1 AND account_type = 'bank' AND status = 'active'
         AND LOWER(TRIM(name)) = LOWER(TRIM($2))
       LIMIT 1`,
      [branchId, fallback],
    );
    if (res.rows.length > 0) return String(res.rows[0].id);
  }
  const any = await client.query(
    `SELECT id FROM ic_fund_accounts
     WHERE branch_id = $1 AND account_type = 'bank' AND status = 'active'
     ORDER BY LOWER(name) LIMIT 1`,
    [branchId],
  );
  return any.rows.length > 0 ? String(any.rows[0].id) : null;
}

async function voidVoucherByReference(
  client: DbClient,
  branchId: string,
  referenceType: string,
  referenceId: string,
): Promise<void> {
  await client.query(
    `UPDATE ic_fund_vouchers
     SET status = 'void',
         voided_at = CURRENT_TIMESTAMP,
         voided_by_name = $4
     WHERE branch_id = $1 AND reference_type = $2 AND reference_id = $3 AND status = 'active'`,
    [branchId, referenceType, referenceId, SYNC_ACTOR],
  );
}

async function postVoucherInTx(
  client: DbClient,
  params: {
    branchId: string;
    voucherType: 'payment' | 'receipt' | 'journal';
    voucherDate: string;
    debitAccountId: string;
    creditAccountId: string;
    amount: number;
    notes: string;
    referenceType: string;
    referenceId: string;
  },
): Promise<void> {
  const amount = Number(params.amount.toFixed(2));
  if (amount <= 0) return;

  const existing = await client.query(
    `SELECT id, amount, debit_account_id, credit_account_id
     FROM ic_fund_vouchers
     WHERE branch_id = $1 AND reference_type = $2 AND reference_id = $3 AND status = 'active'
     LIMIT 1`,
    [params.branchId, params.referenceType, params.referenceId],
  );
  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    if (
      Number(row.amount) === amount &&
      String(row.debit_account_id) === params.debitAccountId &&
      String(row.credit_account_id) === params.creditAccountId
    ) {
      return;
    }
    await voidVoucherByReference(client, params.branchId, params.referenceType, params.referenceId);
  }

  const accounts = await client.query(
    `SELECT id, account_type, status FROM ic_fund_accounts
     WHERE id = ANY($1::varchar[]) AND branch_id = $2
     FOR UPDATE`,
    [[params.debitAccountId, params.creditAccountId], params.branchId],
  );
  if (accounts.rows.length !== 2) {
    throw new Error('IC Funds accounts not found for voucher posting');
  }
  const debit = accounts.rows.find(r => String(r.id) === params.debitAccountId);
  const credit = accounts.rows.find(r => String(r.id) === params.creditAccountId);
  if (!debit || !credit) throw new Error('IC Funds accounts not found for voucher posting');
  if (debit.status !== 'active' || credit.status !== 'active') {
    throw new Error('Inactive IC Funds accounts cannot be used');
  }

  const ruleError = validateVoucherAccounts({
    voucherType: params.voucherType,
    debitType: debit.account_type,
    creditType: credit.account_type,
    debitId: params.debitAccountId,
    creditId: params.creditAccountId,
  });
  if (ruleError) throw new Error(ruleError);

  await client.query(
    `INSERT INTO ic_fund_voucher_counters (branch_id, last_no) VALUES ($1, 0) ON CONFLICT (branch_id) DO NOTHING`,
    [params.branchId],
  );
  const counter = await client.query(
    `UPDATE ic_fund_voucher_counters SET last_no = last_no + 1 WHERE branch_id = $1 RETURNING last_no`,
    [params.branchId],
  );
  const voucherNo = Number(counter.rows[0]?.last_no) || 1;
  const id = `ICFV-${crypto.randomUUID().slice(0, 10).toUpperCase()}`;

  await client.query(
    `INSERT INTO ic_fund_vouchers (
       id, branch_id, voucher_no, voucher_type, voucher_date,
       debit_account_id, credit_account_id, amount, notes,
       created_by_name, reference_type, reference_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      id,
      params.branchId,
      voucherNo,
      params.voucherType,
      params.voucherDate,
      params.debitAccountId,
      params.creditAccountId,
      amount,
      params.notes,
      SYNC_ACTOR,
      params.referenceType,
      params.referenceId,
    ],
  );
}

async function resolvePurchaseBranchId(client: DbClient, purchaseId: string): Promise<string | null> {
  const res = await client.query(
    `SELECT COALESCE(w.branch_id, s.branch_id) AS branch_id
     FROM ic_purchases p
     LEFT JOIN ic_warehouses w ON w.id = p.warehouse_id
     LEFT JOIN ic_suppliers s ON s.id = p.supplier_id
     WHERE p.id = $1`,
    [purchaseId],
  );
  return res.rows[0]?.branch_id ? String(res.rows[0].branch_id) : null;
}

async function resolveSaleBranchId(client: DbClient, customerName: string): Promise<string | null> {
  const res = await client.query(
    `SELECT id FROM branches WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
    [customerName],
  );
  if (res.rows.length > 0) return String(res.rows[0].id);
  const fallback = await client.query(`SELECT id FROM branches ORDER BY id ASC LIMIT 1`);
  return fallback.rows.length > 0 ? String(fallback.rows[0].id) : null;
}

async function resolveDefaultBranchId(client: DbClient): Promise<string | null> {
  const res = await client.query(`SELECT id FROM branches ORDER BY id ASC LIMIT 1`);
  return res.rows.length > 0 ? String(res.rows[0].id) : null;
}

export async function syncICSupplierFundAccount(supplierId: string): Promise<void> {
  try {
    const res = await query(
      `SELECT id, name, phone, email, branch_id FROM ic_suppliers WHERE id = $1 LIMIT 1`,
      [supplierId],
    );
    if (res.rows.length === 0) return;
    const row = res.rows[0];
    const branchId = row.branch_id ? String(row.branch_id) : await resolveDefaultBranchId(db);
    if (!branchId) return;
    await ensureLinkedAccount(db, {
      branchId,
      sourceType: 'ic_supplier',
      sourceId: supplierId,
      name: String(row.name),
      phone: row.phone ? String(row.phone) : null,
    });
  } catch (err) {
    logger.error({ err, supplierId }, 'Failed to sync IC supplier fund account');
  }
}

export async function syncICWarehouseFundAccount(warehouseId: string): Promise<void> {
  try {
    const res = await query(
      `SELECT id, name, phone, branch_id FROM ic_warehouses WHERE id = $1 LIMIT 1`,
      [warehouseId],
    );
    if (res.rows.length === 0) return;
    const row = res.rows[0];
    const branchId = row.branch_id ? String(row.branch_id) : await resolveDefaultBranchId(db);
    if (!branchId) return;
    await ensureLinkedAccount(db, {
      branchId,
      sourceType: 'ic_warehouse',
      sourceId: warehouseId,
      name: String(row.name),
      phone: row.phone ? String(row.phone) : null,
    });
  } catch (err) {
    logger.error({ err, warehouseId }, 'Failed to sync IC warehouse fund account');
  }
}

export async function backfillICTransferFundAccounts(): Promise<void> {
  try {
    const suppliers = await query(`SELECT id FROM ic_suppliers ORDER BY created_at ASC`);
    for (const row of suppliers.rows) {
      await syncICSupplierFundAccount(String(row.id));
    }
    const warehouses = await query(`SELECT id FROM ic_warehouses ORDER BY created_at ASC`);
    for (const row of warehouses.rows) {
      await syncICWarehouseFundAccount(String(row.id));
    }

    const purchases = await query(`SELECT id FROM ic_purchases ORDER BY created_at ASC`);
    for (const row of purchases.rows) {
      await syncICPurchaseToICFunds(String(row.id));
    }

    const sales = await query(
      `SELECT id FROM ic_sales WHERE order_status = 'completed' ORDER BY created_at ASC`,
    );
    for (const row of sales.rows) {
      await syncICSaleToICFunds(String(row.id));
    }
  } catch (err) {
    logger.error({ err }, 'Failed to backfill IC Transfer fund accounts');
  }
}

export async function syncICPurchaseToICFunds(purchaseId: string): Promise<void> {
  await deleteAutoLedgerEntryByReference('ic_purchase', purchaseId);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const purchaseRes = await client.query(`SELECT * FROM ic_purchases WHERE id = $1 LIMIT 1`, [purchaseId]);
    if (purchaseRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return;
    }
    const purchase = purchaseRes.rows[0];
    const branchId = await resolvePurchaseBranchId(client, purchaseId);
    if (!branchId) {
      await client.query('ROLLBACK');
      logger.warn({ purchaseId }, 'IC purchase fund sync skipped: no branch');
      return;
    }

    const amount = Number(purchase.aed_total) || 0;
    if (amount <= 0) {
      await voidVoucherByReference(client, branchId, 'ic_purchase', purchaseId);
      await client.query('COMMIT');
      return;
    }

    let supplierAccountId: string | null = null;
    if (purchase.supplier_id) {
      const supplierRes = await client.query(
        `SELECT id, name, phone FROM ic_suppliers WHERE id = $1 LIMIT 1`,
        [purchase.supplier_id],
      );
      if (supplierRes.rows.length > 0) {
        supplierAccountId = await ensureLinkedAccount(client, {
          branchId,
          sourceType: 'ic_supplier',
          sourceId: String(supplierRes.rows[0].id),
          name: String(supplierRes.rows[0].name),
          phone: supplierRes.rows[0].phone ? String(supplierRes.rows[0].phone) : null,
        });
      }
    }

    if (!supplierAccountId) {
      supplierAccountId = await ensureLinkedAccount(client, {
        branchId,
        sourceType: 'ic_supplier',
        sourceId: `purchase:${purchaseId}`,
        name: 'IC Purchase',
      });
    }

    const expenseAccountId = await ensureSystemAccount(
      client,
      branchId,
      'IC Purchase Cost',
      'd_expense',
      'ic_purchase_cost',
    );

    if (!supplierAccountId || !expenseAccountId) {
      throw new Error('Could not resolve IC Funds accounts for purchase');
    }

    // Accrual only: record payable to supplier (cash payment is a separate Payment voucher later).
    await postVoucherInTx(client, {
      branchId,
      voucherType: 'journal',
      voucherDate: isoDate(purchase.created_at),
      debitAccountId: expenseAccountId,
      creditAccountId: supplierAccountId,
      amount,
      notes: `IC Purchase payable ${purchaseId.slice(0, 8)}`,
      referenceType: 'ic_purchase',
      referenceId: purchaseId,
    });

    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    logger.error({ err, purchaseId }, 'Failed to sync IC purchase to IC Funds');
  } finally {
    client.release();
  }
}

export async function removeICPurchaseFromICFunds(purchaseId: string): Promise<void> {
  await deleteAutoLedgerEntryByReference('ic_purchase', purchaseId);
  try {
    const branchId = await resolvePurchaseBranchId(db, purchaseId);
    if (!branchId) return;
    await voidVoucherByReference(db, branchId, 'ic_purchase', purchaseId);
  } catch (err) {
    logger.error({ err, purchaseId }, 'Failed to remove IC purchase from IC Funds');
  }
}

export async function syncICSaleToICFunds(saleId: string): Promise<void> {
  await deleteAutoLedgerEntryByReference('ic_sale', saleId);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const saleRes = await client.query(`SELECT * FROM ic_sales WHERE id = $1 LIMIT 1`, [saleId]);
    if (saleRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return;
    }
    const sale = saleRes.rows[0];
    const branchId = await resolveSaleBranchId(client, String(sale.customer_name || ''));
    if (!branchId) {
      await client.query('ROLLBACK');
      logger.warn({ saleId }, 'IC sale fund sync skipped: no branch');
      return;
    }

    const orderStatus = String(sale.order_status || '');
    if (orderStatus !== 'completed') {
      await voidVoucherByReference(client, branchId, 'ic_sale', saleId);
      await client.query('COMMIT');
      return;
    }

    const amount = (Number(sale.aed_amount) || 0) + (Number(sale.service_charge) || 0);
    if (amount <= 0) {
      await voidVoucherByReference(client, branchId, 'ic_sale', saleId);
      await client.query('COMMIT');
      return;
    }

    const customerName =
      String(sale.order_customer_name || sale.customer_name || 'IC Customer').trim();
    const customerSourceId = sale.order_customer_id
      ? String(sale.order_customer_id)
      : `name:${customerName.toLowerCase()}`;

    const customerAccountId = await ensureLinkedAccount(client, {
      branchId,
      sourceType: 'ic_customer',
      sourceId: customerSourceId,
      name: customerName,
      customerId: sale.order_customer_id ? String(sale.order_customer_id) : null,
    });

    const incomeAccountId = await ensureSystemAccount(
      client,
      branchId,
      'IC Transfer Sales',
      'income',
      'ic_transfer_sales',
    );

    if (!customerAccountId || !incomeAccountId) {
      throw new Error('Could not resolve IC Funds accounts for sale');
    }

    // Accrual only: record receivable from customer (cash receipt is a separate Receipt voucher later).
    await postVoucherInTx(client, {
      branchId,
      voucherType: 'journal',
      voucherDate: isoDate(sale.status_updated_at || sale.created_at),
      debitAccountId: customerAccountId,
      creditAccountId: incomeAccountId,
      amount,
      notes: `IC Sale receivable ${saleId.slice(0, 8)}`,
      referenceType: 'ic_sale',
      referenceId: saleId,
    });

    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    logger.error({ err, saleId }, 'Failed to sync IC sale to IC Funds');
  } finally {
    client.release();
  }
}

export async function removeICSaleFromICFunds(saleId: string): Promise<void> {
  await deleteAutoLedgerEntryByReference('ic_sale', saleId);
  try {
    const saleRes = await query(`SELECT customer_name FROM ic_sales WHERE id = $1 LIMIT 1`, [saleId]);
    if (saleRes.rows.length === 0) return;
    const branchId = await resolveSaleBranchId(db, String(saleRes.rows[0].customer_name || ''));
    if (!branchId) return;
    await voidVoucherByReference(db, branchId, 'ic_sale', saleId);
  } catch (err) {
    logger.error({ err, saleId }, 'Failed to remove IC sale from IC Funds');
  }
}
