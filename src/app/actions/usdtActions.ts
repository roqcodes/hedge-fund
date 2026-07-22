'use server';

import { query, pool } from '@/lib/db';
import { DbActionResult } from './dbActions';
import { UsdtBranchSettings, UsdtBuy, UsdtSell, UsdtIdrConversion } from '@/types';
import { mapUsdtBuyRow, mapUsdtSellRow, mapUsdtSettingsRow } from '@/lib/usdtMappers';
import { SQL_ENSURE_USDT_SCHEMA } from '@/lib/sql/usdtSchemaSql';
import { adjustCustomerBalanceInTx } from './customerActions';
import { getCurrentUserAction } from './auth';

async function ensureUsdtSchema() {
  await query(SQL_ENSURE_USDT_SCHEMA);
}

async function resolveEnteredBy(branchSlug?: string) {
  const userRes = await getCurrentUserAction(branchSlug);
  const user = userRes.success ? userRes.data : null;
  return {
    enteredBy: user?.email ?? null,
    enteredByName: user?.name ?? null,
    enteredByUserId: user?.id ?? null,
  };
}

type UsdtBuyInput = Omit<UsdtBuy, 'id' | 'createdAt' | 'enteredByUsername' | 'enteredByName' | 'enteredByUserId'>;
type UsdtSellInput = Omit<UsdtSell, 'id' | 'createdAt' | 'enteredByUsername' | 'enteredByName' | 'enteredByUserId'>;

export async function dbGetUsdtSettingsAction(branchId: string): Promise<DbActionResult<UsdtBranchSettings>> {
  try {
    await ensureUsdtSchema();
    const res = await query('SELECT * FROM usdt_branch_settings WHERE branch_id = $1', [branchId]);
    if (res.rows.length === 0) {
      return { success: true, data: { branchId, presetMargin: 0.002 } };
    }
    return { success: true, data: mapUsdtSettingsRow(res.rows[0]) };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  }
}

export async function dbUpdateUsdtSettingsAction(
  branchId: string,
  presetMargin: number,
): Promise<DbActionResult<UsdtBranchSettings>> {
  try {
    await ensureUsdtSchema();
    const res = await query(
      `INSERT INTO usdt_branch_settings (branch_id, preset_margin)
       VALUES ($1, $2)
       ON CONFLICT (branch_id) DO UPDATE SET
         preset_margin = EXCLUDED.preset_margin,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [branchId, presetMargin],
    );
    return { success: true, data: mapUsdtSettingsRow(res.rows[0]) };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  }
}

export async function dbAddUsdtBuyAction(
  buy: UsdtBuyInput,
  branchSlug?: string,
): Promise<DbActionResult<UsdtBuy>> {
  await ensureUsdtSchema();
  if (!buy.customerName?.trim()) return { success: false, error: 'Customer name is required' };
  const { enteredBy, enteredByName, enteredByUserId } = await resolveEnteredBy(branchSlug);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check AED balance
    const balCheck = await client.query(
      'SELECT aed_balance FROM branch_usdt_balances WHERE branch_id = $1 FOR UPDATE',
      [buy.branchId],
    );
    const aedAvailable = balCheck.rows.length > 0 ? parseFloat(balCheck.rows[0].aed_balance) || 0 : 0;
    if (aedAvailable < buy.aedTotal) {
      throw new Error(`Not enough AED balance. Available: ${aedAvailable.toFixed(2)} AED, needed: ${buy.aedTotal.toFixed(2)} AED`);
    }

    const id = `ubuy-${crypto.randomUUID().slice(0, 8)}`;
    let openingBalance = buy.openingBalance;

    if (buy.customerId) {
      openingBalance = await adjustCustomerBalanceInTx(client, buy.customerId, buy.aedTotal);
    }

    const res = await client.query(
      `INSERT INTO usdt_buys (
        id, branch_id, date, txn_id, customer_id, customer_name, wallet_id,
        opening_balance, usdt_amount, aed_rate, service_charge, aed_total, notes,
        entered_by, entered_by_name, entered_by_user_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *`,
      [
        id,
        buy.branchId,
        buy.date,
        buy.txnId ?? null,
        buy.customerId ?? null,
        buy.customerName ?? null,
        buy.walletId ?? null,
        openingBalance ?? null,
        buy.usdtAmount,
        buy.aedRate,
        buy.serviceCharge,
        buy.aedTotal,
        buy.notes ?? null,
        enteredBy,
        enteredByName,
        enteredByUserId,
      ],
    );

    await adjustUsdtCapitalInTx(client, buy.branchId, buy.usdtAmount, -buy.aedTotal);

    await client.query('COMMIT');
    return { success: true, data: mapUsdtBuyRow(res.rows[0]) };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

export async function dbAddUsdtSellAction(
  sell: UsdtSellInput,
  branchSlug?: string,
): Promise<DbActionResult<UsdtSell>> {
  await ensureUsdtSchema();
  if (!sell.customerName?.trim()) return { success: false, error: 'Customer name is required' };
  const { enteredBy, enteredByName, enteredByUserId } = await resolveEnteredBy(branchSlug);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const id = `usell-${crypto.randomUUID().slice(0, 8)}`;
    let openingBalance = sell.openingBalance;

    if (sell.customerId) {
      openingBalance = await adjustCustomerBalanceInTx(client, sell.customerId, -sell.aedTotal);
    }

    const res = await client.query(
      `INSERT INTO usdt_sells (
        id, branch_id, date, txn_id, customer_id, customer_name, wallet_id,
        opening_balance, usdt_amount, cost, margin, aed_rate, service_charge, aed_total, profit, notes,
        entered_by, entered_by_name, entered_by_user_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *`,
      [
        id,
        sell.branchId,
        sell.date,
        sell.txnId ?? null,
        sell.customerId ?? null,
        sell.customerName ?? null,
        sell.walletId ?? null,
        openingBalance ?? null,
        sell.usdtAmount,
        sell.cost,
        sell.margin,
        sell.aedRate,
        sell.serviceCharge,
        sell.aedTotal,
        sell.profit,
        sell.notes ?? null,
        enteredBy,
        enteredByName,
        enteredByUserId,
      ],
    );

    await adjustUsdtCapitalInTx(client, sell.branchId, -sell.usdtAmount, sell.aedTotal);

    await client.query('COMMIT');
    return { success: true, data: mapUsdtSellRow(res.rows[0]) };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

export async function dbDeleteUsdtBuyAction(buyId: string): Promise<DbActionResult<null>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const buyRes = await client.query('SELECT * FROM usdt_buys WHERE id = $1 FOR UPDATE', [buyId]);
    if (buyRes.rows.length === 0) throw new Error('Buy deal not found');
    const buy = buyRes.rows[0];

    if (buy.customer_id) {
      await adjustCustomerBalanceInTx(client, buy.customer_id, -parseFloat(buy.aed_total));
    }

    await adjustUsdtCapitalInTx(client, buy.branch_id, -parseFloat(buy.usdt_amount), parseFloat(buy.aed_total));

    await client.query('DELETE FROM usdt_buys WHERE id = $1', [buyId]);
    await client.query('COMMIT');
    return { success: true, data: null };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

export async function dbDeleteUsdtSellAction(sellId: string): Promise<DbActionResult<null>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sellRes = await client.query('SELECT * FROM usdt_sells WHERE id = $1 FOR UPDATE', [sellId]);
    if (sellRes.rows.length === 0) throw new Error('Sell deal not found');
    const sell = sellRes.rows[0];

    if (sell.customer_id) {
      await adjustCustomerBalanceInTx(client, sell.customer_id, parseFloat(sell.aed_total));
    }

    await adjustUsdtCapitalInTx(client, sell.branch_id, parseFloat(sell.usdt_amount), -parseFloat(sell.aed_total));

    await client.query('DELETE FROM usdt_sells WHERE id = $1', [sellId]);
    await client.query('COMMIT');
    return { success: true, data: null };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

export interface BranchUsdtBalance {
  branchId: string;
  initialCapital: number;
  availableFund: number;
  aedBalance: number;
  idrBalance: number;
}

export async function getBranchUsdtBalanceAction(branchId: string): Promise<BranchUsdtBalance | null> {
  try {
    const [balRes, buyRes, sellRes] = await Promise.all([
      query('SELECT * FROM branch_usdt_balances WHERE branch_id = $1', [branchId]),
      query('SELECT COALESCE(SUM(usdt_amount), 0) AS total FROM usdt_buys WHERE branch_id = $1', [branchId]),
      query('SELECT COALESCE(SUM(usdt_amount), 0) AS total FROM usdt_sells WHERE branch_id = $1', [branchId]),
    ]);
    if (balRes.rows.length === 0) return null;
    const n = (v: unknown) => { const p = parseFloat(String(v ?? '')); return isNaN(p) ? 0 : p; };
    const totalBuy = n(buyRes.rows[0].total);
    const totalSell = n(sellRes.rows[0].total);
    return {
      branchId: balRes.rows[0].branch_id,
      initialCapital: n(balRes.rows[0].initial_capital),
      availableFund: n(balRes.rows[0].available_fund),
      aedBalance: n(balRes.rows[0].aed_balance),
      idrBalance: n(balRes.rows[0].idr_balance),
    };
  } catch {
    return null;
  }
}

export async function setBranchUsdtCapitalAction(
  branchId: string, initialCapital: number, aedBalance?: number, idrBalance?: number,
): Promise<DbActionResult<BranchUsdtBalance>> {
  try {
    const aed = (aedBalance != null && !isNaN(aedBalance)) ? aedBalance : null;
    const idr = (idrBalance != null && !isNaN(idrBalance)) ? idrBalance : null;
    const res = await query(
      `INSERT INTO branch_usdt_balances (branch_id, initial_capital, available_fund, aed_balance, idr_balance)
       VALUES ($1, $2, $2, COALESCE($3, 0), COALESCE($4, 0))
       ON CONFLICT (branch_id) DO UPDATE SET
         initial_capital = CASE WHEN $2 IS NOT NULL AND $2 > 0 THEN $2 ELSE branch_usdt_balances.initial_capital END,
         available_fund = CASE WHEN $2 IS NOT NULL AND $2 > 0 THEN $2 ELSE branch_usdt_balances.available_fund END,
         aed_balance = CASE WHEN $3 IS NOT NULL THEN $3 ELSE branch_usdt_balances.aed_balance END,
         idr_balance = CASE WHEN $4 IS NOT NULL THEN $4 ELSE branch_usdt_balances.idr_balance END,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [branchId, initialCapital, aed, idr],
    );
    const n = (v: unknown) => { const p = parseFloat(String(v ?? '')); return isNaN(p) ? 0 : p; };
    return {
      success: true,
      data: {
        branchId: res.rows[0].branch_id,
        initialCapital: n(res.rows[0].initial_capital),
        availableFund: n(res.rows[0].available_fund),
        aedBalance: n(res.rows[0].aed_balance),
        idrBalance: n(res.rows[0].idr_balance),
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    console.error('[setBranchUsdtCapitalAction]', message, error);
    return { success: false, error: message };
  }
}

export async function getUsdtIdrConversionsAction(branchId: string): Promise<DbActionResult<UsdtIdrConversion[]>> {
  try {
    await ensureUsdtSchema();
    const res = await query(
      `SELECT * FROM usdt_idr_conversions WHERE branch_id = $1 ORDER BY date DESC, created_at DESC`,
      [branchId],
    );
    const mapped: UsdtIdrConversion[] = res.rows.map(r => ({
      id: String(r.id),
      branchId: String(r.branch_id),
      date: new Date(String(r.date)).toISOString(),
      usdtAmount: parseFloat(String(r.usdt_amount || 0)),
      conversionRate: parseFloat(String(r.conversion_rate || 0)),
      idrAmount: parseFloat(String(r.idr_amount || 0)),
      enteredBy: r.entered_by ? String(r.entered_by) : undefined,
      enteredByName: r.entered_by_name ? String(r.entered_by_name) : undefined,
      enteredByUserId: r.entered_by_user_id ? String(r.entered_by_user_id) : undefined,
      notes: r.notes ? String(r.notes) : undefined,
      createdAt: r.created_at ? new Date(String(r.created_at)).toISOString() : undefined,
    }));
    return { success: true, data: mapped };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  }
}

export async function getUsdtAedAverageRateAction(branchId: string): Promise<number | null> {
  try {
    await ensureUsdtSchema();
    const res = await query(
      `SELECT SUM(aed_total) AS total_aed, SUM(usdt_amount) AS total_usdt FROM usdt_buys WHERE branch_id = $1`,
      [branchId],
    );
    if (res.rows.length === 0) return null;
    const totalAed = parseFloat(String(res.rows[0].total_aed || 0));
    const totalUsdt = parseFloat(String(res.rows[0].total_usdt || 0));
    if (totalUsdt <= 0) return null;
    return totalAed / totalUsdt;
  } catch {
    return null;
  }
}

export async function getUsdtIdrAverageRateAction(branchId: string): Promise<number | null> {
  try {
    await ensureUsdtSchema();
    const res = await query(
      `SELECT SUM(idr_amount) AS total_idr, SUM(usdt_amount) AS total_usdt FROM usdt_idr_conversions WHERE branch_id = $1`,
      [branchId],
    );
    if (res.rows.length === 0) return null;
    const totalIdr = parseFloat(String(res.rows[0].total_idr || 0));
    const totalUsdt = parseFloat(String(res.rows[0].total_usdt || 0));
    if (totalUsdt <= 0) return null;
    return totalIdr / totalUsdt;
  } catch {
    return null;
  }
}

export async function convertUsdtToIdrAction(
  branchId: string,
  usdtAmount: number,
  conversionRate: number,
  notes?: string,
  branchSlug?: string,
): Promise<DbActionResult<BranchUsdtBalance>> {
  await ensureUsdtSchema();
  if (!usdtAmount || usdtAmount <= 0) return { success: false, error: 'Amount must be greater than zero' };
  if (!conversionRate || conversionRate <= 0) return { success: false, error: 'Conversion rate must be greater than zero' };

  const { enteredBy, enteredByName, enteredByUserId } = await resolveEnteredBy(branchSlug);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check available USDT stock
    const balCheck = await client.query(
      'SELECT available_fund FROM branch_usdt_balances WHERE branch_id = $1 FOR UPDATE',
      [branchId],
    );
    const usdtAvailable = balCheck.rows.length > 0 ? parseFloat(balCheck.rows[0].available_fund) || 0 : 0;
    if (usdtAvailable < usdtAmount) {
      throw new Error(`Not enough USDT stock. Available: ${usdtAvailable.toFixed(4)} USDT, needed: ${usdtAmount.toFixed(4)} USDT`);
    }

    const idrAmount = usdtAmount * conversionRate;
    const convId = `uconv-${crypto.randomUUID().slice(0, 8)}`;

    await client.query(
      `INSERT INTO usdt_idr_conversions (
        id, branch_id, date, usdt_amount, conversion_rate, idr_amount,
        entered_by, entered_by_name, entered_by_user_id, notes
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8, $9)`,
      [
        convId,
        branchId,
        usdtAmount,
        conversionRate,
        idrAmount,
        enteredBy,
        enteredByName,
        enteredByUserId,
        notes ?? null,
      ],
    );

    const res = await client.query(
      `INSERT INTO branch_usdt_balances (branch_id, initial_capital, available_fund, aed_balance, idr_balance)
       VALUES ($1, 0, 0 - $2::numeric, 0, $3::numeric)
       ON CONFLICT (branch_id) DO UPDATE SET
         available_fund = branch_usdt_balances.available_fund - $2::numeric,
         idr_balance = branch_usdt_balances.idr_balance + $3::numeric,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [branchId, usdtAmount, idrAmount],
    );

    await client.query('COMMIT');

    const n2 = (v: unknown) => { const p = parseFloat(String(v ?? '')); return isNaN(p) ? 0 : p; };
    return {
      success: true,
      data: {
        branchId: res.rows[0].branch_id,
        initialCapital: n2(res.rows[0].initial_capital),
        availableFund: n2(res.rows[0].available_fund),
        aedBalance: n2(res.rows[0].aed_balance),
        idrBalance: n2(res.rows[0].idr_balance),
      },
    };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

export async function dbDeleteUsdtConversionAction(conversionId: string, branchId: string): Promise<DbActionResult<null>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const convRes = await client.query('SELECT * FROM usdt_idr_conversions WHERE id = $1 AND branch_id = $2 FOR UPDATE', [conversionId, branchId]);
    if (convRes.rows.length === 0) throw new Error('Conversion record not found');
    const conv = convRes.rows[0];
    const usdtAmount = parseFloat(conv.usdt_amount);
    const idrAmount = parseFloat(conv.idr_amount);

    await client.query(
      `UPDATE branch_usdt_balances SET
        available_fund = available_fund + $2::numeric,
        idr_balance = idr_balance - $3::numeric,
        updated_at = CURRENT_TIMESTAMP
       WHERE branch_id = $1`,
      [branchId, usdtAmount, idrAmount],
    );

    await client.query('DELETE FROM usdt_idr_conversions WHERE id = $1', [conversionId]);
    await client.query('COMMIT');
    return { success: true, data: null };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

async function adjustUsdtCapitalInTx(client: any, branchId: string, usdtDelta: number, aedDelta?: number) {
  await client.query(
    `INSERT INTO branch_usdt_balances (branch_id, initial_capital, available_fund, aed_balance)
     VALUES ($1, 0, $2, COALESCE($3, 0))
     ON CONFLICT (branch_id) DO UPDATE SET
       available_fund = branch_usdt_balances.available_fund + $2,
       aed_balance = CASE WHEN $3 IS NOT NULL THEN branch_usdt_balances.aed_balance + $3 ELSE branch_usdt_balances.aed_balance END,
       updated_at = CURRENT_TIMESTAMP`,
    [branchId, usdtDelta, aedDelta ?? null],
  );
}

