'use server';

import { getSessionUser } from '@/lib/auth';
import { query, pool } from '@/lib/db';
import { logger } from '@/lib/logger';
import { parseCalendarDate } from '@/lib/businessTime';
import { EXCLUDE_PENDING_LEDGER_SQL } from '@/lib/fundLedgerCurrency';
import { resolveJournalAmounts, resolveEntityTransferUsdt, convertUsdtToCustomer, type AmountInputSide, type EntityTransferInputSide } from '@/lib/fundLedgerAmounts';
import { roundTo14 } from '@/lib/physicalCalculations';
import { addExpenseSchema } from '@/lib/validations';
import type {
  FundEntityLedgerEntry,
  FundEntityBalance,
  FundEntryDirection,
  FundReferenceType,
  ExpensePaymentMethod,
  ExpenseType,
} from '@/types';

function mapRow(row: Record<string, unknown>): FundEntityLedgerEntry {
  return {
    id: row.id as string,
    branchId: row.branch_id as string,
    customerId: row.customer_id as string,
    entryDate: parseCalendarDate(row.entry_date) || new Date().toISOString(),
    description: (row.description as string) ?? '',
    debit: Number(row.debit) || 0,
    credit: Number(row.credit) || 0,
    referenceType: (row.reference_type as FundReferenceType) ?? 'manual',
    referenceId: (row.reference_id as string) ?? undefined,
    customerCurrency: (row.customer_currency as string) ?? undefined,
    customerCurrencyRate: row.customer_currency_rate != null ? Number(row.customer_currency_rate) : undefined,
    settlementCurrency: (row.settlement_currency as string) ?? undefined,
    settlementAmount: row.settlement_amount != null ? Number(row.settlement_amount) : undefined,
    createdBy: (row.created_by as string) ?? undefined,
    createdByName: (row.created_by_name as string) ?? undefined,
    createdByUserId: (row.created_by_user_id as string) ?? undefined,
    createdAt: parseCalendarDate(row.created_at) || new Date().toISOString(),
  };
}

export async function listEntityLedgerEntriesAction(params: {
  branchId: string;
  customerId?: string;
  limit?: number;
  offset?: number;
}): Promise<FundEntityLedgerEntry[]> {
  const { branchId, customerId, limit = 200, offset = 0 } = params;
  try {
    let sql = `SELECT * FROM fund_entity_ledger WHERE branch_id = $1`;
    const p: unknown[] = [branchId];
    let idx = 2;

    if (customerId) {
      sql += ` AND customer_id = $${idx}`;
      p.push(customerId);
      idx++;
    }

    sql += ` ORDER BY entry_date DESC, created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    p.push(limit, offset);

    const result = await query(sql, p);
    return result.rows.map(mapRow);
  } catch (err) {
    logger.error({ err, branchId, customerId }, 'Failed to list entity ledger entries');
    return [];
  }
}

export async function getEntityBalancesAction(
  branchId: string,
): Promise<FundEntityBalance[]> {
  try {
    const result = await query(
      `SELECT
         l.customer_id,
         c.name AS customer_name,
         COALESCE(SUM(l.debit), 0) AS total_debit,
         COALESCE(SUM(l.credit), 0) AS total_credit
       FROM fund_entity_ledger l
       JOIN customers c ON c.id = l.customer_id
       WHERE l.branch_id = $1
       ${EXCLUDE_PENDING_LEDGER_SQL}
       GROUP BY l.customer_id, c.name
       ORDER BY c.name ASC`,
      [branchId],
    );

    return result.rows.map(r => ({
      customerId: r.customer_id as string,
      customerName: r.customer_name as string,
      totalDebit: Number(r.total_debit) || 0,
      totalCredit: Number(r.total_credit) || 0,
      net: (Number(r.total_debit) || 0) - (Number(r.total_credit) || 0),
    }));
  } catch (err) {
    logger.error({ err, branchId }, 'Failed to get entity balances');
    return [];
  }
}

export async function getEntityBalanceAction(
  branchId: string,
  customerId: string,
): Promise<FundEntityBalance | null> {
  try {
    const result = await query(
      `SELECT
         l.customer_id,
         c.name AS customer_name,
         COALESCE(SUM(l.debit), 0) AS total_debit,
         COALESCE(SUM(l.credit), 0) AS total_credit
       FROM fund_entity_ledger l
       JOIN customers c ON c.id = l.customer_id
       WHERE l.branch_id = $1 AND l.customer_id = $2
       ${EXCLUDE_PENDING_LEDGER_SQL}
       GROUP BY l.customer_id, c.name`,
      [branchId, customerId],
    );

    if (result.rows.length === 0) return null;

    const r = result.rows[0];
    return {
      customerId: r.customer_id as string,
      customerName: r.customer_name as string,
      totalDebit: Number(r.total_debit) || 0,
      totalCredit: Number(r.total_credit) || 0,
      net: (Number(r.total_debit) || 0) - (Number(r.total_credit) || 0),
    };
  } catch (err) {
    logger.error({ err, branchId, customerId }, 'Failed to get entity balance');
    return null;
  }
}

export async function createFundLedgerEntryAction(params: {
  branchId: string;
  customerId: string;
  direction: FundEntryDirection;
  amount: number;
  description: string;
  entryDate?: string;
  referenceType?: FundReferenceType;
  referenceId?: string;
  customerCurrency?: string;
  /** 1 USDT = rate × customerCurrency. Required unless both are USDT. */
  customerCurrencyRate?: number;
  /** Currency of `amount`: USDT or customer profile currency */
  inputSide?: AmountInputSide;
  settlementCurrency?: string;
  /** @deprecated use inputSide + customer currency rate only */
  settlementUsdtRate?: number;
}): Promise<{ success: true; entryId: string } | { success: false; error: string }> {
  try {
    const {
      branchId, customerId, direction, amount, description, entryDate,
      referenceType, referenceId, customerCurrency, customerCurrencyRate,
      settlementCurrency, settlementUsdtRate, inputSide,
    } = params;

    const branchRes = await query('SELECT slug FROM branches WHERE id = $1', [branchId]);
    if (branchRes.rows.length === 0) return { success: false, error: 'Branch not found' };
    const branchSlug = String(branchRes.rows[0].slug);
    const user = await getSessionUser(branchSlug);
    if (!user) return { success: false, error: 'Not authenticated' };

    if (!customerId) return { success: false, error: 'Entity is required' };
    if (!amount || amount <= 0) return { success: false, error: 'Amount must be greater than zero' };

    const custRes = await query('SELECT id, currency FROM customers WHERE id = $1 AND branch_id = $2', [customerId, branchId]);
    if (custRes.rows.length === 0) {
      return { success: false, error: 'Entity not found in this branch' };
    }
    const profileCurrency = String(custRes.rows[0].currency || 'USDT');
    const displayCurrency = customerCurrency ?? profileCurrency;

    const usdtRate = customerCurrencyRate ?? (displayCurrency === 'USDT' ? 1 : 0);
    if (displayCurrency !== 'USDT' && (!usdtRate || usdtRate <= 0)) {
      return { success: false, error: 'USDT rate is required (1 USDT = ? customer currency)' };
    }

    const side: AmountInputSide = inputSide
      ?? (settlementCurrency === 'USDT' || (settlementCurrency == null && displayCurrency === 'USDT')
        ? 'usdt'
        : 'customer');

    const resolved = resolveJournalAmounts({
      inputSide: side,
      usdtAmount: side === 'usdt' ? amount : 0,
      customerAmount: side === 'customer' ? amount : 0,
      customerCurrency: displayCurrency,
      customerCurrencyRate: roundTo14(usdtRate),
    });

    if (!resolved) {
      return { success: false, error: 'Invalid amount or rate' };
    }

    const usdtAmount = resolved.usdtAmount;
    const settleCurrency = referenceType === 'settlement'
      ? resolved.settlementCurrency
      : (settlementCurrency ?? displayCurrency);
    const settlementAmount = referenceType === 'settlement' ? resolved.settlementAmount : null;

    if (usdtAmount <= 0) return { success: false, error: 'Invalid USDT amount' };

    const id = `FL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const baseCols = ['id', 'branch_id', 'customer_id', 'entry_date', 'description', 'debit', 'credit',
      'reference_type', 'reference_id', 'created_by', 'created_by_name', 'created_by_user_id', 'created_at'];
    const baseVals: unknown[] = [id, branchId, customerId, entryDate ?? now,
      description.trim() || `${direction === 'debit' ? 'Receivable' : 'Payable'} entry`,
      direction === 'debit' ? roundTo14(usdtAmount) : 0, direction === 'credit' ? roundTo14(usdtAmount) : 0,
      referenceType ?? 'manual', referenceId ?? null,
      user.id ?? null, user.name ?? null, user.id ?? null, now];

    baseCols.push('customer_currency', 'customer_currency_rate', 'settlement_currency', 'settlement_amount');
    baseVals.push(
      displayCurrency === 'USDT' && profileCurrency !== 'USDT' && referenceType !== 'settlement'
        ? 'USDT'
        : displayCurrency,
      displayCurrency === 'USDT' ? 1 : roundTo14(usdtRate),
      settleCurrency,
      settlementAmount,
    );

    const ph = baseVals.map((_, i) => `$${i + 1}`).join(', ');
    await query(
      `INSERT INTO fund_entity_ledger (${baseCols.join(', ')}) VALUES (${ph})`,
      baseVals,
    );

    if (referenceType === 'settlement' && settlementAmount != null) {
      const directionMultiplier = direction === 'credit' ? 1 : -1;
      await adjustBranchCashBalance(branchId, settleCurrency, directionMultiplier * settlementAmount);
    }

    logger.info({ entryId: id, branchId, customerId, direction, usdtAmount, settleCurrency, amount }, 'Fund ledger entry created');
    return { success: true, entryId: id };
  } catch (err) {
    logger.error({ err }, 'Failed to create fund ledger entry');
    return { success: false, error: 'Failed to create entry' };
  }
}

export async function createEntityTransferAction(params: {
  branchId: string;
  fromCustomerId: string;
  toCustomerId: string;
  inputSide: EntityTransferInputSide;
  inputAmount: number;
  fromCustomerCurrencyRate?: number;
  toCustomerCurrencyRate?: number;
  description?: string;
  entryDate?: string;
}): Promise<{ success: true; transferId: string; fromEntryId: string; toEntryId: string } | { success: false; error: string }> {
  const client = await pool.connect();
  try {
    const {
      branchId, fromCustomerId, toCustomerId, inputSide, inputAmount,
      fromCustomerCurrencyRate, toCustomerCurrencyRate, description, entryDate,
    } = params;

    if (fromCustomerId === toCustomerId) {
      return { success: false, error: 'From and to entity must be different' };
    }
    if (!inputAmount || inputAmount <= 0) {
      return { success: false, error: 'Amount must be greater than zero' };
    }

    const branchRes = await query('SELECT slug FROM branches WHERE id = $1', [branchId]);
    if (branchRes.rows.length === 0) return { success: false, error: 'Branch not found' };
    const user = await getSessionUser(String(branchRes.rows[0].slug));
    if (!user) return { success: false, error: 'Not authenticated' };

    const custRes = await query(
      `SELECT id, name, currency FROM customers WHERE branch_id = $1 AND id = ANY($2::varchar[])`,
      [branchId, [fromCustomerId, toCustomerId]],
    );
    if (custRes.rows.length !== 2) {
      return { success: false, error: 'Both entities must belong to this branch' };
    }

    const fromRow = custRes.rows.find(r => String(r.id) === fromCustomerId);
    const toRow = custRes.rows.find(r => String(r.id) === toCustomerId);
    if (!fromRow || !toRow) return { success: false, error: 'Entity not found' };

    const fromCurrency = String(fromRow.currency || 'AED');
    const toCurrency = String(toRow.currency || 'AED');
    const fromRate = fromCurrency === 'USDT' ? 1 : roundTo14(fromCustomerCurrencyRate ?? 0);
    const toRate = toCurrency === 'USDT' ? 1 : roundTo14(toCustomerCurrencyRate ?? 0);

    if (fromCurrency !== 'USDT' && fromRate <= 0) {
      return { success: false, error: `USDT rate required for ${fromCurrency} (from entity)` };
    }
    if (toCurrency !== 'USDT' && toRate <= 0) {
      return { success: false, error: `USDT rate required for ${toCurrency} (to entity)` };
    }

    const usdtAmount = resolveEntityTransferUsdt({
      inputSide,
      inputAmount,
      fromCurrency,
      fromRate,
      toCurrency,
      toRate,
    });
    if (!usdtAmount || usdtAmount <= 0) {
      return { success: false, error: 'Invalid amount or conversion rate' };
    }

    const fromBookAmount = fromCurrency === 'USDT' ? usdtAmount : convertUsdtToCustomer(usdtAmount, fromRate);
    const toBookAmount = toCurrency === 'USDT' ? usdtAmount : convertUsdtToCustomer(usdtAmount, toRate);

    const paidInUsdt = inputSide === 'usdt';
    const fromSettleCurrency = paidInUsdt ? 'USDT' : fromCurrency;
    const fromSettleAmount = paidInUsdt ? usdtAmount : fromBookAmount;
    const toSettleCurrency = paidInUsdt ? 'USDT' : toCurrency;
    const toSettleAmount = paidInUsdt ? usdtAmount : (inputSide === 'to' ? inputAmount : toBookAmount);

    const transferId = `ET-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();
    const fromName = String(fromRow.name);
    const toName = String(toRow.name);
    const desc = description?.trim()
      || `Transfer ${fromName} → ${toName}`;

    const fromEntryId = `FL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const toEntryId = `FL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    await client.query('BEGIN');

    const insertSql = `INSERT INTO fund_entity_ledger (
      id, branch_id, customer_id, entry_date, description, debit, credit,
      reference_type, reference_id, created_by, created_by_name, created_by_user_id, created_at,
      customer_currency, customer_currency_rate, settlement_currency, settlement_amount
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`;

    await client.query(insertSql, [
      fromEntryId, branchId, fromCustomerId, entryDate ?? now,
      `${desc} (out)`,
      0, roundTo14(usdtAmount),
      'entity_transfer', transferId,
      user.id ?? null, user.name ?? null, user.id ?? null, now,
      fromCurrency, fromCurrency === 'USDT' ? 1 : fromRate,
      fromSettleCurrency, roundTo14(fromSettleAmount),
    ]);

    await client.query(insertSql, [
      toEntryId, branchId, toCustomerId, entryDate ?? now,
      `${desc} (in)`,
      roundTo14(usdtAmount), 0,
      'entity_transfer', transferId,
      user.id ?? null, user.name ?? null, user.id ?? null, now,
      toCurrency, toCurrency === 'USDT' ? 1 : toRate,
      toSettleCurrency, roundTo14(toSettleAmount),
    ]);

    await client.query('COMMIT');

    logger.info({ transferId, fromEntryId, toEntryId, usdtAmount, branchId }, 'Entity transfer posted');
    return { success: true, transferId, fromEntryId, toEntryId };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Failed to create entity transfer');
    return { success: false, error: 'Failed to create entity transfer' };
  } finally {
    client.release();
  }
}

export async function deleteFundLedgerEntryAction(
  entryId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // Look up entry's branch to authenticate
    const entryRes = await query(
      'SELECT e.branch_id, e.debit, e.credit, e.reference_type, e.reference_id, e.customer_currency, e.customer_currency_rate, e.settlement_currency, e.settlement_amount, b.slug FROM fund_entity_ledger e JOIN branches b ON e.branch_id = b.id WHERE e.id = $1',
      [entryId],
    );
    if (entryRes.rows.length === 0) return { success: false, error: 'Entry not found' };
    const branchSlug = String(entryRes.rows[0].slug);
    const row = entryRes.rows[0];
    const user = await getSessionUser(branchSlug);
    if (!user) return { success: false, error: 'Not authenticated' };

    const refType = String(row.reference_type) as FundReferenceType;
    const linkedBlockMessages: Partial<Record<FundReferenceType, string>> = {
      physical_buy: 'Delete the physical buy deal first. The ledger entry will be removed automatically.',
      physical_sell: 'Delete the physical sell deal first. The ledger entry will be removed automatically.',
      usdt_buy: 'Delete the USDT purchase first. The ledger entry will be removed automatically.',
      usdt_sell: 'Delete the USDT sale first. The ledger entry will be removed automatically.',
      ic_sale: 'Reopen or delete the IC Transfer sale first. The ledger entry will be removed automatically.',
      ic_purchase: 'Delete the IC Transfer purchase first. The ledger entry will be removed automatically.',
    };
    const linkedBlock = linkedBlockMessages[refType];
    if (linkedBlock) {
      return { success: false, error: linkedBlock };
    }

    if (String(row.reference_type) === 'settlement') {
      const debit = parseFloat(row.debit) || 0;
      const credit = parseFloat(row.credit) || 0;
      const directionMultiplier = debit > 0 ? 1 : -1;
      const currency = String(row.settlement_currency || row.customer_currency || 'USDT');
      const storedSettlement = row.settlement_amount != null ? parseFloat(String(row.settlement_amount)) : null;
      const balanceAmount = storedSettlement != null && storedSettlement > 0
        ? storedSettlement
        : (() => {
          const usdtAmt = debit > 0 ? debit : credit;
          const rate = row.customer_currency_rate ? parseFloat(String(row.customer_currency_rate)) : null;
          if (currency === 'USDT') return usdtAmt;
          return rate && rate > 0 ? usdtAmt * rate : usdtAmt;
        })();
      await adjustBranchCashBalance(String(row.branch_id), currency, directionMultiplier * balanceAmount);
    }

    if (String(row.reference_type) === 'entity_transfer' && row.reference_id) {
      await query(
        'DELETE FROM fund_entity_ledger WHERE reference_type = $1 AND reference_id = $2',
        ['entity_transfer', row.reference_id],
      );
    } else {
      await query('DELETE FROM fund_entity_ledger WHERE id = $1', [entryId]);
    }

    logger.info({ entryId, userId: user.id }, 'Fund ledger entry deleted');
    return { success: true };
  } catch (err) {
    logger.error({ err, entryId }, 'Failed to delete fund ledger entry');
    return { success: false, error: 'Failed to delete entry' };
  }
}

export async function updateFundLedgerEntryAction(params: {
  entryId: string;
  entryDate?: string;
  description?: string;
  debit?: number;
  credit?: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { entryId, entryDate, description, debit, credit } = params;

    const entryRes = await query(
      'SELECT e.branch_id, b.slug FROM fund_entity_ledger e JOIN branches b ON e.branch_id = b.id WHERE e.id = $1',
      [entryId],
    );
    if (entryRes.rows.length === 0) return { success: false, error: 'Entry not found' };
    const branchSlug = String(entryRes.rows[0].slug);
    const user = await getSessionUser(branchSlug);
    if (!user) return { success: false, error: 'Not authenticated' };

    const sets: string[] = [];
    const p: unknown[] = [];
    let idx = 1;

    if (entryDate !== undefined) { sets.push(`entry_date = $${idx}`); p.push(entryDate); idx++; }
    if (description !== undefined) { sets.push(`description = $${idx}`); p.push(description); idx++; }
    if (debit !== undefined) { sets.push(`debit = $${idx}`); p.push(debit); idx++; }
    if (credit !== undefined) { sets.push(`credit = $${idx}`); p.push(credit); idx++; }

    if (sets.length === 0) return { success: false, error: 'No fields to update' };

    p.push(entryId);
    await query(`UPDATE fund_entity_ledger SET ${sets.join(', ')} WHERE id = $${idx}`, p);

    logger.info({ entryId, userId: user.id }, 'Fund ledger entry updated');
    return { success: true };
  } catch (err) {
    logger.error({ err }, 'Failed to update fund ledger entry');
    return { success: false, error: 'Failed to update entry' };
  }
}

export async function convertFundLedgerEntryAction(params: {
  entryId: string;
  rate: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { entryId, rate } = params;
    if (!rate || rate <= 0) return { success: false, error: 'Rate must be greater than zero' };

    const entryRes = await query(
      `SELECT e.*, c.currency AS profile_currency, b.slug
       FROM fund_entity_ledger e
       JOIN customers c ON c.id = e.customer_id
       JOIN branches b ON b.id = e.branch_id
       WHERE e.id = $1`,
      [entryId],
    );
    if (entryRes.rows.length === 0) return { success: false, error: 'Entry not found' };

    const row = entryRes.rows[0];
    const branchSlug = String(row.slug);
    const user = await getSessionUser(branchSlug);
    if (!user) return { success: false, error: 'Not authenticated' };

    const profileCurrency = String(row.profile_currency || '');
    if (!['AED', 'IDR'].includes(profileCurrency)) {
      return { success: false, error: 'Only AED/IDR profile entities can convert pending USDT entries' };
    }

    const ledgerCurrency = String(row.customer_currency || 'USDT');
    if (ledgerCurrency !== 'USDT') {
      return { success: false, error: 'Entry is already rated in customer currency' };
    }

    const usdtAmount = (Number(row.debit) || 0) > 0 ? Number(row.debit) : Number(row.credit);
    if (!usdtAmount || usdtAmount <= 0) return { success: false, error: 'Invalid entry amount' };

    const descriptionSuffix = ` | Rated ${usdtAmount.toFixed(2)} USDT @ ${rate} ${profileCurrency}/USDT`;
    const description = String(row.description || '').includes('Rated ')
      ? String(row.description)
      : `${String(row.description || '').trim()}${descriptionSuffix}`.trim();

    await query(
      `UPDATE fund_entity_ledger
       SET customer_currency = $1, customer_currency_rate = $2,
           description = $3
       WHERE id = $4`,
      [profileCurrency, rate, description, entryId],
    );

    logger.info({ entryId, rate, profileCurrency, usdtAmount }, 'Fund ledger entry converted');
    return { success: true };
  } catch (err) {
    logger.error({ err, entryId: params.entryId }, 'Failed to convert fund ledger entry');
    return { success: false, error: 'Failed to convert entry' };
  }
}

/**
 * Auto-create a ledger entry from another module (physical, usdt, IC transfer, etc.)
 * Uses direct DB insert — no session required (safe for cron / system posting).
 */
export async function insertAutoFundLedgerEntry(params: {
  branchId: string;
  customerId: string;
  direction: FundEntryDirection;
  amount: number;
  referenceType: FundReferenceType;
  referenceId: string;
  description?: string;
  customerCurrency?: string;
  customerCurrencyRate?: number;
  settlementCurrency?: string;
  inputSide?: AmountInputSide;
  entryDate?: string;
  createdBy?: string;
  createdByName?: string;
  createdByUserId?: string;
}): Promise<string | null> {
  try {
    const {
      branchId, customerId, direction, amount, referenceType, referenceId,
      description, customerCurrency, customerCurrencyRate, settlementCurrency,
      inputSide, entryDate, createdBy, createdByName, createdByUserId,
    } = params;

    if (!customerId || !amount || amount <= 0) return null;

    const custRes = await query(
      'SELECT id, currency FROM customers WHERE id = $1 AND branch_id = $2',
      [customerId, branchId],
    );
    if (custRes.rows.length === 0) return null;

    const profileCurrency = String(custRes.rows[0].currency || 'USDT');
    const displayCurrency = customerCurrency ?? profileCurrency;
    const usdtRate = customerCurrencyRate ?? (displayCurrency === 'USDT' ? 1 : 0);

    if (displayCurrency !== 'USDT' && (!usdtRate || usdtRate <= 0)) {
      // Pending fiat entry — store provisional USDT amount until converted on Funds page.
      const id = `FL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const now = entryDate ?? new Date().toISOString();
      await query(
        `INSERT INTO fund_entity_ledger (
          id, branch_id, customer_id, entry_date, description, debit, credit,
          reference_type, reference_id, created_by, created_by_name, created_by_user_id, created_at,
          customer_currency, customer_currency_rate, settlement_currency, settlement_amount
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [
          id, branchId, customerId, now,
          description?.trim() || `${direction === 'debit' ? 'Receivable' : 'Payable'} from ${referenceType}`,
          direction === 'debit' ? roundTo14(amount) : 0,
          direction === 'credit' ? roundTo14(amount) : 0,
          referenceType, referenceId,
          createdBy ?? 'system', createdByName ?? 'System', createdByUserId ?? null, now,
          'USDT', 1, settlementCurrency ?? 'USDT', null,
        ],
      );
      return id;
    }

    const side: AmountInputSide = inputSide
      ?? (displayCurrency === 'USDT' ? 'usdt' : 'customer');

    const resolved = resolveJournalAmounts({
      inputSide: side,
      usdtAmount: side === 'usdt' ? amount : 0,
      customerAmount: side === 'customer' ? amount : 0,
      customerCurrency: displayCurrency,
      customerCurrencyRate: roundTo14(usdtRate),
    });
    if (!resolved) return null;

    const usdtAmount = resolved.usdtAmount;
    if (usdtAmount <= 0) return null;

    const id = `FL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const now = entryDate ?? new Date().toISOString();
    const settleCurrency = settlementCurrency ?? displayCurrency;

    await query(
      `INSERT INTO fund_entity_ledger (
        id, branch_id, customer_id, entry_date, description, debit, credit,
        reference_type, reference_id, created_by, created_by_name, created_by_user_id, created_at,
        customer_currency, customer_currency_rate, settlement_currency, settlement_amount
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        id, branchId, customerId, now,
        description?.trim() || `${direction === 'debit' ? 'Receivable' : 'Payable'} from ${referenceType}`,
        direction === 'debit' ? roundTo14(usdtAmount) : 0,
        direction === 'credit' ? roundTo14(usdtAmount) : 0,
        referenceType, referenceId,
        createdBy ?? 'system', createdByName ?? 'System', createdByUserId ?? null, now,
        displayCurrency === 'USDT' && profileCurrency !== 'USDT' ? 'USDT' : displayCurrency,
        displayCurrency === 'USDT' ? 1 : roundTo14(usdtRate),
        settleCurrency,
        null,
      ],
    );

    return id;
  } catch (err) {
    logger.error({ err, referenceType: params.referenceType, referenceId: params.referenceId }, 'Failed to insert auto fund ledger entry');
    return null;
  }
}

/**
 * Auto-create a ledger entry from another module (physical, usdt, etc.)
 * Returns the entry ID.
 */
export async function createAutoLedgerEntry(params: {
  branchId: string;
  customerId: string;
  direction: FundEntryDirection;
  amount: number;
  referenceType: FundReferenceType;
  referenceId: string;
  description?: string;
  customerCurrency?: string;
  customerCurrencyRate?: number;
  settlementCurrency?: string;
  settlementUsdtRate?: number;
  entryDate?: string;
}): Promise<string | null> {
  try {
    const inputSide: AmountInputSide =
      params.customerCurrency && params.customerCurrency !== 'USDT' && params.customerCurrencyRate
        ? 'customer'
        : 'usdt';

    return await insertAutoFundLedgerEntry({
      branchId: params.branchId,
      customerId: params.customerId,
      direction: params.direction,
      amount: params.amount,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      description: params.description,
      customerCurrency: params.customerCurrency,
      customerCurrencyRate: params.customerCurrencyRate ?? params.settlementUsdtRate,
      settlementCurrency: params.settlementCurrency,
      inputSide,
      entryDate: params.entryDate,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to create auto ledger entry');
    return null;
  }
}

/** Remove auto-posted ledger rows when a source deal is deleted (non-settlement only). */
export async function deleteAutoLedgerEntryByReference(
  referenceType: FundReferenceType,
  referenceId: string,
): Promise<void> {
  try {
    await query(
      `DELETE FROM fund_entity_ledger
       WHERE reference_type = $1 AND reference_id = $2 AND reference_type != 'settlement'`,
      [referenceType, referenceId],
    );
  } catch (err) {
    logger.error({ err, referenceType, referenceId }, 'Failed to delete auto ledger entry');
  }
}

async function adjustBranchCashBalance(branchId: string, currency: string, delta: number) {
  try {
    const col = currency === 'AED' ? 'aed_balance' : currency === 'IDR' ? 'idr_balance' : 'available_fund';
    await query(
      `INSERT INTO branch_usdt_balances (branch_id, initial_capital, available_fund, aed_balance, idr_balance)
       VALUES ($1, 0, 0, 0, 0) ON CONFLICT (branch_id) DO NOTHING`,
      [branchId],
    );
    await query(
      `UPDATE branch_usdt_balances SET ${col} = ${col} + $1, updated_at = CURRENT_TIMESTAMP WHERE branch_id = $2`,
      [delta, branchId],
    );
  } catch (err) {
    logger.error({ err, branchId, currency, delta }, 'Failed to adjust branch cash balance');
  }
}

function balanceColumnForCurrency(currency: ExpensePaymentMethod): string {
  if (currency === 'AED') return 'aed_balance';
  if (currency === 'IDR') return 'idr_balance';
  return 'available_fund';
}

export async function createBranchExpenseAction(params: {
  branchId: string;
  date: string;
  type: ExpenseType;
  category: string;
  description: string;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
}): Promise<{ success: true; expenseId: string } | { success: false; error: string }> {
  const branchRes = await query('SELECT id, name, slug FROM branches WHERE id = $1', [params.branchId]);
  if (branchRes.rows.length === 0) return { success: false, error: 'Branch not found' };

  const branch = branchRes.rows[0];
  const branchSlug = String(branch.slug);
  const branchName = String(branch.name);
  const user = await getSessionUser(branchSlug);
  if (!user) return { success: false, error: 'Not authenticated' };

  const validation = addExpenseSchema.safeParse({
    date: params.date,
    branchId: params.branchId,
    branchName,
    type: params.type,
    category: params.category,
    description: params.description,
    amount: params.amount,
    paymentMethod: params.paymentMethod,
  });
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
  }

  const expenseId = `EXP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const txnId = `TXN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const timestamp = new Date().toISOString();
  const balanceCol = balanceColumnForCurrency(params.paymentMethod);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO branch_usdt_balances (branch_id, initial_capital, available_fund, aed_balance, idr_balance)
       VALUES ($1, 0, 0, 0, 0) ON CONFLICT (branch_id) DO NOTHING`,
      [params.branchId],
    );

    const balRes = await client.query(
      `SELECT ${balanceCol} AS balance FROM branch_usdt_balances WHERE branch_id = $1 FOR UPDATE`,
      [params.branchId],
    );
    const currentBalance = parseFloat(String(balRes.rows[0]?.balance ?? '0')) || 0;
    if (currentBalance < params.amount) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: `Insufficient ${params.paymentMethod} balance. Available: ${currentBalance.toFixed(2)}`,
      };
    }

    await client.query(
      `INSERT INTO expenses (id, date, branch_id, branch_name, type, category, description, amount, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        expenseId,
        params.date,
        params.branchId,
        branchName,
        params.type,
        params.category,
        params.description,
        params.amount,
        params.paymentMethod,
      ],
    );

    await client.query(
      `UPDATE branch_usdt_balances SET ${balanceCol} = ${balanceCol} - $1, updated_at = CURRENT_TIMESTAMP WHERE branch_id = $2`,
      [params.amount, params.branchId],
    );

    if (params.paymentMethod === 'AED') {
      await client.query(
        `UPDATE branches SET current_balance = current_balance - $1, last_activity = $2 WHERE id = $3`,
        [params.amount, timestamp, params.branchId],
      );
    } else {
      await client.query(
        `UPDATE branches SET last_activity = $1 WHERE id = $2`,
        [timestamp, params.branchId],
      );
    }

    const notes = `${params.category}: ${params.description} (${params.paymentMethod})`;
    await client.query(
      `INSERT INTO transactions (id, date, from_entity, to_entity, amount, type, status, notes, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [txnId, timestamp, branchName, 'External (Expense)', params.amount, 'expense', 'completed', notes, params.branchId],
    );

    await client.query('COMMIT');
    logger.info({ expenseId, branchId: params.branchId, amount: params.amount, paymentMethod: params.paymentMethod }, 'Branch expense created');
    return { success: true, expenseId };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, params }, 'Failed to create branch expense');
    return { success: false, error: 'Failed to record expense' };
  } finally {
    client.release();
  }
}

export async function deleteBranchExpenseAction(
  expenseId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const expenseRes = await query(
    `SELECT e.*, b.slug AS branch_slug
     FROM expenses e
     JOIN branches b ON b.id = e.branch_id
     WHERE e.id = $1`,
    [expenseId],
  );
  if (expenseRes.rows.length === 0) return { success: false, error: 'Expense not found' };

  const row = expenseRes.rows[0];
  const branchId = String(row.branch_id);
  const branchSlug = String(row.branch_slug);
  const amount = parseFloat(String(row.amount)) || 0;
  const paymentMethod = (row.payment_method as ExpensePaymentMethod) ?? 'AED';
  const category = String(row.category);
  const description = String(row.description);
  const notes = `${category}: ${description} (${paymentMethod})`;

  const user = await getSessionUser(branchSlug);
  if (!user) return { success: false, error: 'Not authenticated' };

  const balanceCol = balanceColumnForCurrency(paymentMethod);
  const timestamp = new Date().toISOString();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const delRes = await client.query('DELETE FROM expenses WHERE id = $1 RETURNING id', [expenseId]);
    if (delRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Expense not found' };
    }

    await client.query(
      `INSERT INTO branch_usdt_balances (branch_id, initial_capital, available_fund, aed_balance, idr_balance)
       VALUES ($1, 0, 0, 0, 0) ON CONFLICT (branch_id) DO NOTHING`,
      [branchId],
    );

    await client.query(
      `UPDATE branch_usdt_balances SET ${balanceCol} = ${balanceCol} + $1, updated_at = CURRENT_TIMESTAMP WHERE branch_id = $2`,
      [amount, branchId],
    );

    if (paymentMethod === 'AED') {
      await client.query(
        `UPDATE branches SET current_balance = current_balance + $1, last_activity = $2 WHERE id = $3`,
        [amount, timestamp, branchId],
      );
    } else {
      await client.query(
        `UPDATE branches SET last_activity = $1 WHERE id = $2`,
        [timestamp, branchId],
      );
    }

    await client.query(
      `DELETE FROM transactions
       WHERE branch_id = $1 AND type = 'expense' AND to_entity = 'External (Expense)' AND amount = $2 AND notes = $3`,
      [branchId, amount, notes],
    );

    await client.query('COMMIT');
    logger.info({ expenseId, branchId, amount, paymentMethod }, 'Branch expense deleted');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, expenseId }, 'Failed to delete branch expense');
    return { success: false, error: 'Failed to delete expense' };
  } finally {
    client.release();
  }
}
