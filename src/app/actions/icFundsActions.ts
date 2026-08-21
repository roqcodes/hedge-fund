'use server';

import { query, pool } from '@/lib/db';
import { logger } from '@/lib/logger';
import { revalidatePath } from 'next/cache';
import { createCustomerCognitoUser, resetCustomerCognitoPasswordAction, updateCognitoUserName } from '@/app/actions/cognitoActions';
import { requireICFundsAccess } from '@/lib/icFunds/requireAccess';
import { accountBalanceSql, trialBalanceSplit } from '@/lib/icFunds/accountBalance';
import { validateVoucherAccounts } from '@/lib/icFunds/voucherRules';
import {
  buildAccountDetailStats,
  type ICFundAccountDetail,
  type ICFundAccountRelatedPurchase,
  type ICFundAccountRelatedSale,
} from '@/lib/icFunds/accountDetailAnalytics';
import {
  createICFundAccountSchema,
  icFundsDateRangeSchema,
  postICFundVoucherSchema,
  updateICFundAccountSchema,
} from '@/lib/validations/icFunds';
import { PASSWORD_INVALID_MESSAGE, validatePassword } from '@/lib/passwordValidation';
import type {
  ICFundAccount,
  ICFundAccountType,
  ICFundStatementLine,
  ICFundTrialBalanceLine,
  ICFundVoucher,
  ICFundVoucherType,
} from '@/types';

type ActionOk<T> = { success: true; data: T };
type ActionErr = { success: false; error: string };
type ActionResult<T> = ActionOk<T> | ActionErr;

function isoDate(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const raw = String(value ?? '');
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
}

function mapAccount(row: Record<string, unknown>): ICFundAccount {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    name: String(row.name),
    accountType: row.account_type as ICFundAccountType,
    status: row.status === 'inactive' ? 'inactive' : 'active',
    openingBalance: Number(row.opening_balance) || 0,
    notes: String(row.notes ?? ''),
    createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
    balance: Number(row.balance) || 0,
    customerId: row.customer_id ? String(row.customer_id) : undefined,
    email: row.customer_email ? String(row.customer_email) : undefined,
    phone: row.customer_phone ? String(row.customer_phone) : undefined,
    hasPortalLogin: Boolean(row.customer_cognito_user_id),
    sourceType: row.source_type ? String(row.source_type) : undefined,
    sourceId: row.source_id ? String(row.source_id) : undefined,
  };
}

function mapVoucher(row: Record<string, unknown>): ICFundVoucher {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    voucherNo: Number(row.voucher_no) || 0,
    voucherType: row.voucher_type as ICFundVoucherType,
    voucherDate: isoDate(row.voucher_date),
    debitAccountId: String(row.debit_account_id),
    creditAccountId: String(row.credit_account_id),
    debitAccountName: String(row.debit_account_name ?? ''),
    creditAccountName: String(row.credit_account_name ?? ''),
    debitAccountType: row.debit_account_type as ICFundAccountType,
    creditAccountType: row.credit_account_type as ICFundAccountType,
    amount: Number(row.amount) || 0,
    notes: String(row.notes ?? ''),
    createdBy: row.created_by ? String(row.created_by) : undefined,
    createdByName: row.created_by_name ? String(row.created_by_name) : undefined,
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : undefined,
    createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
    status: row.status === 'void' ? 'void' : 'active',
    voidedAt: row.voided_at ? String(row.voided_at) : undefined,
    voidedByName: row.voided_by_name ? String(row.voided_by_name) : undefined,
    referenceType: row.reference_type ? String(row.reference_type) : undefined,
    referenceId: row.reference_id ? String(row.reference_id) : undefined,
  };
}

function accountBalanceSelectSql(asOfParam: string | null): string {
  return `SELECT a.*, ${accountBalanceSql(asOfParam)} AS balance,
    c.email AS customer_email,
    COALESCE(c.phone, a.phone) AS customer_phone,
    c.cognito_user_id AS customer_cognito_user_id
    FROM ic_fund_accounts a
    LEFT JOIN customers c ON c.id = a.customer_id`;
}

async function fetchAccountsWithBalances(
  branchId: string,
  asOfDate?: string | null,
): Promise<ICFundAccount[]> {
  const sql = asOfDate
    ? `${accountBalanceSelectSql('$2')} WHERE a.branch_id = $1 ORDER BY a.account_type, LOWER(a.name)`
    : `${accountBalanceSelectSql(null)} WHERE a.branch_id = $1 ORDER BY a.account_type, LOWER(a.name)`;
  const params = asOfDate ? [branchId, asOfDate] : [branchId];
  const res = await query(sql, params);
  return res.rows.map(r => mapAccount(r as Record<string, unknown>));
}

function typedVoucherSum(
  vouchers: ICFundVoucher[],
  accounts: ICFundAccount[],
  types: ICFundAccountType[],
  side: 'debit' | 'credit',
): number {
  const ids = new Set(accounts.filter(a => types.includes(a.accountType)).map(a => a.id));
  return vouchers.reduce((sum, v) => {
    if (v.status === 'void') return sum;
    if (side === 'debit' && ids.has(v.debitAccountId)) return sum + v.amount;
    if (side === 'credit' && ids.has(v.creditAccountId)) return sum + v.amount;
    return sum;
  }, 0);
}

const VOUCHER_SELECT_SQL = `
SELECT v.*,
  da.name AS debit_account_name, da.account_type AS debit_account_type,
  ca.name AS credit_account_name, ca.account_type AS credit_account_type
FROM ic_fund_vouchers v
JOIN ic_fund_accounts da ON da.id = v.debit_account_id
JOIN ic_fund_accounts ca ON ca.id = v.credit_account_id
`;

export async function listICFundAccountsAction(branchId: string): Promise<ICFundAccount[]> {
  const access = await requireICFundsAccess(branchId, 'read');
  if (!access.ok) return [];
  try {
    return await fetchAccountsWithBalances(branchId);
  } catch (err) {
    logger.error({ err, branchId }, 'Failed to list IC fund accounts');
    return [];
  }
}

export async function getICFundAccountByCustomerIdAction(
  branchId: string,
  customerId: string,
): Promise<ICFundAccount | null> {
  const access = await requireICFundsAccess(branchId, 'read');
  if (!access.ok) return null;
  try {
    const res = await query(
      `${accountBalanceSelectSql(null)} WHERE a.branch_id = $1 AND (
        a.customer_id = $2 OR (a.source_type = 'ic_customer' AND a.source_id = $2)
      ) LIMIT 1`,
      [branchId, customerId],
    );
    if (res.rows.length === 0) return null;
    return mapAccount(res.rows[0] as Record<string, unknown>);
  } catch (err) {
    logger.error({ err, branchId, customerId }, 'Failed to load IC fund account by customer');
    return null;
  }
}

export async function createICFundAccountAction(
  input: unknown,
): Promise<ActionResult<ICFundAccount>> {
  const parsed = createICFundAccountSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const access = await requireICFundsAccess(parsed.data.branchId, 'write');
  if (!access.ok) return { success: false, error: access.error };

  const id = `ICFA-${crypto.randomUUID().slice(0, 10).toUpperCase()}`;
  const email = parsed.data.email?.trim() || '';
  const password = parsed.data.password?.trim() || '';
  const phone = parsed.data.phone?.trim() || null;

  if (parsed.data.requireSignIn && !validatePassword(password).isValid) {
    return { success: false, error: PASSWORD_INVALID_MESSAGE };
  }

  let customerId: string | null = null;

  try {
    if (parsed.data.requireSignIn) {
      customerId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const cognitoRes = await createCustomerCognitoUser({
        email,
        name: parsed.data.name.trim(),
        branchId: parsed.data.branchId,
        password,
      });
      if (!cognitoRes.success || !cognitoRes.userId) {
        return { success: false, error: cognitoRes.error || 'Failed to create portal login account.' };
      }

      await query(
        `INSERT INTO customers (id, branch_id, name, phone, email, balance, status, cognito_user_id, currency)
         VALUES ($1, $2, $3, $4, $5, 0, 'active', $6, 'AED')`,
        [customerId, parsed.data.branchId, parsed.data.name.trim(), phone, email, cognitoRes.userId],
      );
    }

      await query(
        `INSERT INTO ic_fund_accounts (id, branch_id, name, account_type, opening_balance, notes, customer_id, phone, source_type, source_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id,
          parsed.data.branchId,
          parsed.data.name.trim(),
          parsed.data.accountType,
          Number(parsed.data.openingBalance.toFixed(2)),
          parsed.data.notes?.trim() ?? '',
          customerId,
          phone,
          customerId ? 'ic_customer' : null,
          customerId,
        ],
      );
    const res = await query(`${accountBalanceSelectSql(null)} WHERE a.id = $1`, [id]);
    revalidatePath(`/${access.slug}/ic-funds/accounts`);
    revalidatePath(`/${access.slug}/customers`);
    return { success: true, data: mapAccount(res.rows[0] as Record<string, unknown>) };
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '23505') return { success: false, error: 'An account with this name already exists' };
    logger.error({ err }, 'Failed to create IC fund account');
    return { success: false, error: 'Failed to create account' };
  }
}

export async function seedICFundStarterAccountsAction(branchId: string): Promise<ActionResult<{ created: number }>> {
  const access = await requireICFundsAccess(branchId, 'write');
  if (!access.ok) return { success: false, error: access.error };

  const starters: Array<{ name: string; accountType: ICFundAccountType }> = [
    { name: 'Collection', accountType: 'bank' },
    { name: 'Fund', accountType: 'bank' },
    { name: 'Cashier', accountType: 'bank' },
  ];

  let created = 0;
  try {
    for (const starter of starters) {
      const exists = await query(
        `SELECT 1 FROM ic_fund_accounts WHERE branch_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) LIMIT 1`,
        [branchId, starter.name],
      );
      if (exists.rows.length > 0) continue;
      const id = `ICFA-${crypto.randomUUID().slice(0, 10).toUpperCase()}`;
      await query(
        `INSERT INTO ic_fund_accounts (id, branch_id, name, account_type, opening_balance, notes)
         VALUES ($1, $2, $3, $4, 0, '')
         ON CONFLICT DO NOTHING`,
        [id, branchId, starter.name, starter.accountType],
      );
      created += 1;
    }
    return { success: true, data: { created } };
  } catch (err) {
    logger.error({ err, branchId }, 'Failed to seed IC fund starter accounts');
    return { success: false, error: 'Failed to seed starter accounts' };
  }
}

export async function updateICFundAccountAction(input: unknown): Promise<ActionResult<ICFundAccount>> {
  const parsed = updateICFundAccountSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const access = await requireICFundsAccess(parsed.data.branchId, 'write');
  if (!access.ok) return { success: false, error: access.error };

  try {
    const existing = await query(
      `SELECT * FROM ic_fund_accounts WHERE id = $1 AND branch_id = $2 LIMIT 1`,
      [parsed.data.id, parsed.data.branchId],
    );
    if (existing.rows.length === 0) return { success: false, error: 'Account not found' };

    if (parsed.data.accountType && parsed.data.accountType !== existing.rows[0].account_type) {
      const used = await query(
        `SELECT 1 FROM ic_fund_vouchers
         WHERE debit_account_id = $1 OR credit_account_id = $1
         LIMIT 1`,
        [parsed.data.id],
      );
      if (used.rows.length > 0) {
        return { success: false, error: 'Cannot change type after vouchers have been posted' };
      }
    }

    if (parsed.data.openingBalance !== undefined) {
      const used = await query(
        `SELECT 1 FROM ic_fund_vouchers
         WHERE debit_account_id = $1 OR credit_account_id = $1
         LIMIT 1`,
        [parsed.data.id],
      );
      if (used.rows.length > 0) {
        return {
          success: false,
          error: 'Opening balance is locked after entries exist. Post a journal adjustment instead.',
        };
      }
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    const push = (col: string, val: unknown) => {
      sets.push(`${col} = $${idx}`);
      values.push(val);
      idx += 1;
    };

    if (parsed.data.name !== undefined) push('name', parsed.data.name.trim());
    if (parsed.data.accountType !== undefined) push('account_type', parsed.data.accountType);
    if (parsed.data.status !== undefined) push('status', parsed.data.status);
    if (parsed.data.openingBalance !== undefined) push('opening_balance', Number(parsed.data.openingBalance.toFixed(2)));
    if (parsed.data.notes !== undefined) push('notes', parsed.data.notes.trim());

    if (parsed.data.phone !== undefined) {
      push('phone', parsed.data.phone.trim() || null);
      const customerId = existing.rows[0].customer_id ? String(existing.rows[0].customer_id) : null;
      if (customerId) {
        await query(`UPDATE customers SET phone = $1 WHERE id = $2`, [
          parsed.data.phone.trim() || null,
          customerId,
        ]);
      }
    }

    if (sets.length === 0 && parsed.data.phone === undefined) {
      return { success: false, error: 'No fields to update' };
    }

    if (sets.length > 0) {
      values.push(parsed.data.id, parsed.data.branchId);
      await query(
        `UPDATE ic_fund_accounts SET ${sets.join(', ')} WHERE id = $${idx} AND branch_id = $${idx + 1}`,
        values,
      );
    }

    const accountName = parsed.data.name?.trim();
    const customerId = existing.rows[0].customer_id ? String(existing.rows[0].customer_id) : null;
    if (accountName && customerId) {
      const customerRes = await query(
        `SELECT email, cognito_user_id FROM customers WHERE id = $1 LIMIT 1`,
        [customerId],
      );
      const customerEmail = customerRes.rows[0]?.email ? String(customerRes.rows[0].email) : '';
      const cognitoUserId = customerRes.rows[0]?.cognito_user_id;
      await query(`UPDATE customers SET name = $1 WHERE id = $2`, [accountName, customerId]);
      if (cognitoUserId && customerEmail) {
        await updateCognitoUserName(customerEmail, accountName);
      }
    }

    const res = await query(`${accountBalanceSelectSql(null)} WHERE a.id = $1`, [parsed.data.id]);
    revalidatePath(`/${access.slug}/ic-funds/accounts`);
    return { success: true, data: mapAccount(res.rows[0] as Record<string, unknown>) };
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '23505') return { success: false, error: 'An account with this name already exists' };
    logger.error({ err }, 'Failed to update IC fund account');
    return { success: false, error: 'Failed to update account' };
  }
}

export async function resetICFundAccountPasswordAction(
  branchId: string,
  accountId: string,
  passwordRaw: string,
): Promise<ActionResult<void>> {
  const access = await requireICFundsAccess(branchId, 'write');
  if (!access.ok) return { success: false, error: access.error };
  if (!validatePassword(passwordRaw).isValid) {
    return { success: false, error: PASSWORD_INVALID_MESSAGE };
  }

  try {
    const res = await query(
      `SELECT a.customer_id, c.email, c.cognito_user_id
       FROM ic_fund_accounts a
       LEFT JOIN customers c ON c.id = a.customer_id
       WHERE a.id = $1 AND a.branch_id = $2
       LIMIT 1`,
      [accountId, branchId],
    );
    if (res.rows.length === 0) return { success: false, error: 'Account not found' };
    const email = res.rows[0].email ? String(res.rows[0].email) : '';
    const cognitoUserId = res.rows[0].cognito_user_id;
    if (!email || !cognitoUserId) {
      return { success: false, error: 'This account has no portal login.' };
    }

    const reset = await resetCustomerCognitoPasswordAction(email, passwordRaw, access.slug);
    if (!reset.success) return { success: false, error: reset.error || 'Failed to reset password' };
    return { success: true, data: undefined };
  } catch (err) {
    logger.error({ err, branchId, accountId }, 'Failed to reset IC fund account password');
    return { success: false, error: 'Failed to reset password' };
  }
}

export async function listICFundVouchersAction(params: {
  branchId: string;
  voucherType?: ICFundVoucherType;
  startDate?: string;
  endDate?: string;
  search?: string;
}): Promise<ICFundVoucher[]> {
  const access = await requireICFundsAccess(params.branchId, 'read');
  if (!access.ok) return [];

  try {
    const clauses = ['v.branch_id = $1'];
    const values: unknown[] = [params.branchId];
    let idx = 2;

    if (params.voucherType) {
      clauses.push(`v.voucher_type = $${idx}`);
      values.push(params.voucherType);
      idx += 1;
    }
    if (params.startDate) {
      clauses.push(`v.voucher_date >= $${idx}`);
      values.push(params.startDate);
      idx += 1;
    }
    if (params.endDate) {
      clauses.push(`v.voucher_date <= $${idx}`);
      values.push(params.endDate);
      idx += 1;
    }
    if (params.search?.trim()) {
      clauses.push(
        `(da.name ILIKE $${idx} OR ca.name ILIKE $${idx} OR v.notes ILIKE $${idx} OR CAST(v.voucher_no AS TEXT) ILIKE $${idx})`,
      );
      values.push(`%${params.search.trim()}%`);
      idx += 1;
    }

    const res = await query(
      `${VOUCHER_SELECT_SQL}
       WHERE ${clauses.join(' AND ')}
       ORDER BY v.voucher_date DESC, v.voucher_no DESC
       LIMIT 2000`,
      values,
    );
    return res.rows.map(r => mapVoucher(r as Record<string, unknown>));
  } catch (err) {
    logger.error({ err, params }, 'Failed to list IC fund vouchers');
    return [];
  }
}

export async function postICFundVoucherAction(input: unknown): Promise<ActionResult<ICFundVoucher>> {
  const parsed = postICFundVoucherSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const access = await requireICFundsAccess(parsed.data.branchId, 'write');
  if (!access.ok) return { success: false, error: access.error };

  const amount = Number(parsed.data.amount.toFixed(2));
  if (amount <= 0) return { success: false, error: 'Amount must be greater than zero' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const accounts = await client.query(
      `SELECT id, account_type, status, branch_id
       FROM ic_fund_accounts
       WHERE id = ANY($1::varchar[]) AND branch_id = $2
       FOR UPDATE`,
      [[parsed.data.debitAccountId, parsed.data.creditAccountId], parsed.data.branchId],
    );
    if (accounts.rows.length !== 2) {
      await client.query('ROLLBACK');
      return { success: false, error: 'One or both accounts were not found' };
    }

    const debit = accounts.rows.find(r => String(r.id) === parsed.data.debitAccountId);
    const credit = accounts.rows.find(r => String(r.id) === parsed.data.creditAccountId);
    if (!debit || !credit) {
      await client.query('ROLLBACK');
      return { success: false, error: 'One or both accounts were not found' };
    }
    if (debit.status !== 'active' || credit.status !== 'active') {
      await client.query('ROLLBACK');
      return { success: false, error: 'Inactive accounts cannot be used' };
    }

    const ruleError = validateVoucherAccounts({
      voucherType: parsed.data.voucherType,
      debitType: debit.account_type,
      creditType: credit.account_type,
      debitId: parsed.data.debitAccountId,
      creditId: parsed.data.creditAccountId,
    });
    if (ruleError) {
      await client.query('ROLLBACK');
      return { success: false, error: ruleError };
    }

    await client.query(
      `INSERT INTO ic_fund_voucher_counters (branch_id, last_no)
       VALUES ($1, 0)
       ON CONFLICT (branch_id) DO NOTHING`,
      [parsed.data.branchId],
    );
    const counter = await client.query(
      `UPDATE ic_fund_voucher_counters
       SET last_no = last_no + 1
       WHERE branch_id = $1
       RETURNING last_no`,
      [parsed.data.branchId],
    );
    const voucherNo = Number(counter.rows[0]?.last_no) || 1;
    const id = `ICFV-${crypto.randomUUID().slice(0, 10).toUpperCase()}`;

    await client.query(
      `INSERT INTO ic_fund_vouchers (
         id, branch_id, voucher_no, voucher_type, voucher_date,
         debit_account_id, credit_account_id, amount, notes,
         created_by, created_by_name, created_by_user_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        id,
        parsed.data.branchId,
        voucherNo,
        parsed.data.voucherType,
        parsed.data.voucherDate,
        parsed.data.debitAccountId,
        parsed.data.creditAccountId,
        amount,
        parsed.data.notes?.trim() ?? '',
        access.user.id ?? null,
        access.user.name ?? null,
        access.user.id ?? null,
      ],
    );

    await client.query('COMMIT');

    const res = await query(`${VOUCHER_SELECT_SQL} WHERE v.id = $1`, [id]);
    return { success: true, data: mapVoucher(res.rows[0] as Record<string, unknown>) };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    logger.error({ err }, 'Failed to post IC fund voucher');
    return { success: false, error: 'Failed to save voucher' };
  } finally {
    client.release();
  }
}

export async function deleteICFundVoucherAction(
  branchId: string,
  voucherId: string,
): Promise<ActionResult<{ id: string }>> {
  const access = await requireICFundsAccess(branchId, 'write');
  if (!access.ok) return { success: false, error: access.error };

  try {
    const res = await query(
      `UPDATE ic_fund_vouchers
       SET status = 'void',
           voided_at = CURRENT_TIMESTAMP,
           voided_by_name = $3
       WHERE id = $1 AND branch_id = $2 AND status = 'active'
       RETURNING id`,
      [voucherId, branchId, access.user.name ?? access.user.id ?? 'User'],
    );
    if (res.rows.length === 0) {
      const exists = await query(
        `SELECT status FROM ic_fund_vouchers WHERE id = $1 AND branch_id = $2`,
        [voucherId, branchId],
      );
      if (exists.rows.length === 0) return { success: false, error: 'Voucher not found' };
      return { success: false, error: 'Voucher is already void' };
    }
    return { success: true, data: { id: voucherId } };
  } catch (err) {
    logger.error({ err, voucherId }, 'Failed to void IC fund voucher');
    return { success: false, error: 'Failed to void voucher' };
  }
}

export async function getICFundStatementAction(params: {
  branchId: string;
  accountId: string;
  startDate?: string;
  endDate?: string;
}): Promise<ActionResult<{ account: ICFundAccount; opening: number; lines: ICFundStatementLine[]; closing: number }>> {
  const access = await requireICFundsAccess(params.branchId, 'read');
  if (!access.ok) return { success: false, error: access.error };

  try {
    const accRes = await query(`${accountBalanceSelectSql(null)} WHERE a.id = $1 AND a.branch_id = $2`, [
      params.accountId,
      params.branchId,
    ]);
    if (accRes.rows.length === 0) return { success: false, error: 'Account not found' };
    const account = mapAccount(accRes.rows[0] as Record<string, unknown>);

    const beforeParams: unknown[] = [params.accountId];
    let beforeSql = `
      SELECT
        COALESCE(SUM(CASE WHEN debit_account_id = $1 THEN amount ELSE 0 END), 0) AS dr,
        COALESCE(SUM(CASE WHEN credit_account_id = $1 THEN amount ELSE 0 END), 0) AS cr
      FROM ic_fund_vouchers
      WHERE (debit_account_id = $1 OR credit_account_id = $1)
        AND COALESCE(status, 'active') = 'active'
    `;
    if (params.startDate) {
      beforeSql += ` AND voucher_date < $2`;
      beforeParams.push(params.startDate);
    } else {
      beforeSql += ` AND FALSE`;
    }
    const before = await query(beforeSql, beforeParams);
    const opening =
      account.openingBalance +
      (Number(before.rows[0]?.dr) || 0) -
      (Number(before.rows[0]?.cr) || 0);

    const clauses = [
      '(v.debit_account_id = $1 OR v.credit_account_id = $1)',
      "COALESCE(v.status, 'active') = 'active'",
    ];
    const values: unknown[] = [params.accountId];
    let idx = 2;
    if (params.startDate) {
      clauses.push(`v.voucher_date >= $${idx}`);
      values.push(params.startDate);
      idx += 1;
    }
    if (params.endDate) {
      clauses.push(`v.voucher_date <= $${idx}`);
      values.push(params.endDate);
      idx += 1;
    }

    const vRes = await query(
      `${VOUCHER_SELECT_SQL}
       WHERE ${clauses.join(' AND ')}
       ORDER BY v.voucher_date ASC, v.voucher_no ASC`,
      values,
    );

    let running = opening;
    const lines: ICFundStatementLine[] = [
      {
        date: params.startDate ?? '',
        voucherNo: 0,
        voucherType: 'journal',
        particulars: 'OPENING BALANCE',
        debit: 0,
        credit: 0,
        balance: Number(opening.toFixed(2)),
        notes: '',
      },
    ];

    for (const row of vRes.rows) {
      const v = mapVoucher(row as Record<string, unknown>);
      const debit = v.debitAccountId === params.accountId ? v.amount : 0;
      const credit = v.creditAccountId === params.accountId ? v.amount : 0;
      running += debit - credit;
      const counterparty = debit > 0 ? v.creditAccountName : v.debitAccountName;
      lines.push({
        date: v.voucherDate,
        voucherNo: v.voucherNo,
        voucherType: v.voucherType,
        particulars: counterparty,
        debit,
        credit,
        balance: Number(running.toFixed(2)),
        notes: v.notes,
        userName: v.createdByName,
        userAt: v.createdAt,
      });
    }

    return {
      success: true,
      data: {
        account,
        opening: Number(opening.toFixed(2)),
        lines,
        closing: Number(running.toFixed(2)),
      },
    };
  } catch (err) {
    logger.error({ err, params }, 'Failed to load IC fund statement');
    return { success: false, error: 'Failed to load statement' };
  }
}

export async function getICFundAccountDetailAction(params: {
  branchId: string;
  accountId: string;
}): Promise<ActionResult<ICFundAccountDetail>> {
  const access = await requireICFundsAccess(params.branchId, 'read');
  if (!access.ok) return { success: false, error: access.error };

  try {
    const accRes = await query(`${accountBalanceSelectSql(null)} WHERE a.id = $1 AND a.branch_id = $2`, [
      params.accountId,
      params.branchId,
    ]);
    if (accRes.rows.length === 0) return { success: false, error: 'Account not found' };
    const account = mapAccount(accRes.rows[0] as Record<string, unknown>);

    const vRes = await query(
      `${VOUCHER_SELECT_SQL}
       WHERE (v.debit_account_id = $1 OR v.credit_account_id = $1)
         AND COALESCE(v.status, 'active') = 'active'
       ORDER BY v.voucher_date ASC, v.voucher_no ASC`,
      [params.accountId],
    );
    const vouchers = vRes.rows.map(r => mapVoucher(r as Record<string, unknown>));
    const stats = buildAccountDetailStats(vouchers, params.accountId);

    const statementResult = await getICFundStatementAction({
      branchId: params.branchId,
      accountId: params.accountId,
    });
    if (!statementResult.success) return { success: false, error: statementResult.error };

    const detail: ICFundAccountDetail = {
      account,
      statement: {
        opening: statementResult.data.opening,
        lines: statementResult.data.lines,
        closing: statementResult.data.closing,
      },
      vouchers: [...vouchers].reverse(),
      stats,
    };

    if (account.sourceType === 'ic_supplier' && account.sourceId) {
      const purchases = await query(
        `SELECT p.id, p.created_at, p.units, p.aed_total, p.payment_method, w.name AS warehouse_name
         FROM ic_purchases p
         LEFT JOIN ic_warehouses w ON w.id = p.warehouse_id
         WHERE p.supplier_id = $1
         ORDER BY p.created_at DESC
         LIMIT 100`,
        [account.sourceId],
      );
      detail.relatedPurchases = purchases.rows.map(row => ({
        id: String(row.id),
        date: row.created_at ? String(row.created_at) : '',
        units: Number(row.units) || 0,
        aedAmount: Number(row.aed_total) || 0,
        paymentMethod: row.payment_method ? String(row.payment_method) : undefined,
        warehouseName: row.warehouse_name ? String(row.warehouse_name) : undefined,
      })) as ICFundAccountRelatedPurchase[];

      const supplier = await query(`SELECT commission FROM ic_suppliers WHERE id = $1 LIMIT 1`, [
        account.sourceId,
      ]);
      if (supplier.rows[0]) {
        detail.relatedMeta = {
          commission: Number(supplier.rows[0].commission) || 0,
        };
      }
    }

    if (account.sourceType === 'ic_warehouse' && account.sourceId) {
      const sales = await query(
        `SELECT id, created_at, units, aed_amount, order_status, payment_status, order_customer_name
         FROM ic_sales
         WHERE warehouse_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [account.sourceId],
      );
      detail.relatedSales = sales.rows.map(row => ({
        id: String(row.id),
        date: row.created_at ? String(row.created_at) : '',
        units: Number(row.units) || 0,
        aedAmount: Number(row.aed_amount) || 0,
        orderStatus: row.order_status ? String(row.order_status) : undefined,
        paymentStatus: row.payment_status ? String(row.payment_status) : undefined,
        customerName: row.order_customer_name ? String(row.order_customer_name) : undefined,
      })) as ICFundAccountRelatedSale[];

      const warehouse = await query(`SELECT current_stock FROM ic_warehouses WHERE id = $1 LIMIT 1`, [
        account.sourceId,
      ]);
      if (warehouse.rows[0]) {
        detail.relatedMeta = {
          ...detail.relatedMeta,
          stock: Number(warehouse.rows[0].current_stock) || 0,
        };
      }
    }

    return { success: true, data: detail };
  } catch (err) {
    logger.error({ err, params }, 'Failed to load IC fund account detail');
    return { success: false, error: 'Failed to load account detail' };
  }
}

export async function getICFundReportBundleAction(params: unknown): Promise<
  ActionResult<{
    accounts: ICFundAccount[];
    cashBank: ICFundAccount[];
    allVouchers: ICFundVoucher[];
    dExpenses: ICFundVoucher[];
    receivables: ICFundAccount[];
    payables: ICFundAccount[];
    trialBalance: ICFundTrialBalanceLine[];
    asOfDate: string | null;
    profitLoss: {
      income: number;
      profit: number;
      expense: number;
      dExpense: number;
      net: number;
    };
    balanceSheet: {
      bank: number;
      receivables: number;
      payables: number;
      equity: number;
      accumulatedPL: number;
      totalAssets: number;
      totalLiabilitiesEquity: number;
      balanced: boolean;
    };
  }>
> {
  const parsed = icFundsDateRangeSchema.safeParse(params);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const access = await requireICFundsAccess(parsed.data.branchId, 'read');
  if (!access.ok) return { success: false, error: access.error };

  try {
    const asOfDate = parsed.data.endDate ?? null;
    const accounts = await fetchAccountsWithBalances(parsed.data.branchId, asOfDate);
    const periodVouchers = await listICFundVouchersAction({
      branchId: parsed.data.branchId,
      voucherType: undefined,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    });

    const cumulativeVouchers = asOfDate
      ? await listICFundVouchersAction({
          branchId: parsed.data.branchId,
          voucherType: undefined,
          endDate: asOfDate,
        })
      : periodVouchers;

    const income = typedVoucherSum(periodVouchers, accounts, ['income'], 'credit')
      - typedVoucherSum(periodVouchers, accounts, ['income'], 'debit');
    const profit = typedVoucherSum(periodVouchers, accounts, ['profit'], 'credit')
      - typedVoucherSum(periodVouchers, accounts, ['profit'], 'debit');
    const expense = typedVoucherSum(periodVouchers, accounts, ['expense'], 'debit')
      - typedVoucherSum(periodVouchers, accounts, ['expense'], 'credit');
    const dExpense = typedVoucherSum(periodVouchers, accounts, ['d_expense'], 'debit')
      - typedVoucherSum(periodVouchers, accounts, ['d_expense'], 'credit');

    const accumulatedIncome = typedVoucherSum(cumulativeVouchers, accounts, ['income'], 'credit')
      - typedVoucherSum(cumulativeVouchers, accounts, ['income'], 'debit');
    const accumulatedExpense = typedVoucherSum(cumulativeVouchers, accounts, ['expense'], 'debit')
      - typedVoucherSum(cumulativeVouchers, accounts, ['expense'], 'credit');
    const accumulatedDExpense = typedVoucherSum(cumulativeVouchers, accounts, ['d_expense'], 'debit')
      - typedVoucherSum(cumulativeVouchers, accounts, ['d_expense'], 'credit');
    const accumulatedPL = accumulatedIncome - accumulatedExpense - accumulatedDExpense;

    const personal = accounts.filter(a => a.accountType === 'personal');
    const cashBank = accounts.filter(a => a.accountType === 'bank');
    const receivables = personal.filter(a => a.balance > 0);
    const payables = personal.filter(a => a.balance < 0);

    const bankTotal = cashBank.reduce((s, a) => s + a.balance, 0);
    const ar = receivables.reduce((s, a) => s + a.balance, 0);
    const ap = payables.reduce((s, a) => s + Math.abs(a.balance), 0);
    const profitReserve = accounts
      .filter(a => a.accountType === 'profit')
      .reduce((s, a) => s + -a.balance, 0);
    const equity = profitReserve + accumulatedPL;
    const totalAssets = bankTotal + ar;
    const totalLiabilitiesEquity = ap + equity;

    const trialBalance: ICFundTrialBalanceLine[] = accounts
      .filter(a => a.balance !== 0)
      .map(a => {
        const split = trialBalanceSplit(a.balance);
        return {
          accountId: a.id,
          accountName: a.name,
          accountType: a.accountType,
          debit: Number(split.debit.toFixed(2)),
          credit: Number(split.credit.toFixed(2)),
        };
      })
      .sort((a, b) => a.accountType.localeCompare(b.accountType) || a.accountName.localeCompare(b.accountName));

    const trialDebit = trialBalance.reduce((s, l) => s + l.debit, 0);
    const trialCredit = trialBalance.reduce((s, l) => s + l.credit, 0);
    const balanced = Math.abs(trialDebit - trialCredit) < 0.01;

    return {
      success: true,
      data: {
        accounts,
        cashBank,
        allVouchers: periodVouchers,
        dExpenses: periodVouchers.filter(
          v => v.debitAccountType === 'd_expense' || v.creditAccountType === 'd_expense',
        ),
        receivables,
        payables,
        trialBalance,
        asOfDate,
        profitLoss: {
          income: Number(income.toFixed(2)),
          profit: Number(profit.toFixed(2)),
          expense: Number(expense.toFixed(2)),
          dExpense: Number(dExpense.toFixed(2)),
          net: Number((income + profit - expense - dExpense).toFixed(2)),
        },
        balanceSheet: {
          bank: Number(bankTotal.toFixed(2)),
          receivables: Number(ar.toFixed(2)),
          payables: Number(ap.toFixed(2)),
          equity: Number(profitReserve.toFixed(2)),
          accumulatedPL: Number(accumulatedPL.toFixed(2)),
          totalAssets: Number(totalAssets.toFixed(2)),
          totalLiabilitiesEquity: Number(totalLiabilitiesEquity.toFixed(2)),
          balanced,
        },
      },
    };
  } catch (err) {
    logger.error({ err }, 'Failed to load IC fund reports');
    return { success: false, error: 'Failed to load reports' };
  }
}
