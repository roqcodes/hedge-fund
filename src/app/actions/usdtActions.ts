'use server';

import { query, pool } from '@/lib/db';
import { DbActionResult } from './dbActions';
import { UsdtBranchSettings, UsdtBuy, UsdtSell } from '@/types';
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
  const { enteredBy, enteredByName, enteredByUserId } = await resolveEnteredBy(branchSlug);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

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
