'use server';

import { query, pool } from '@/lib/db';
import { DbActionResult } from './dbActions';
import { PhysicalBalance, PhysicalBuy, PhysicalSell } from '@/types';
import { mapPhysicalBuyRow, mapPhysicalSellRow } from '@/lib/physicalMappers';
import { adjustCustomerBalanceInTx } from './customerActions';
import type { PhysicalDraftBuy, PhysicalDraftSell } from '@/lib/physical/drafts';

export async function dbGetPhysicalBalanceAction(branchId: string): Promise<DbActionResult<PhysicalBalance>> {
  try {
    const res = await query('SELECT * FROM physical_balances WHERE branch_id = $1', [branchId]);
    if (res.rows.length === 0) {
      return {
        success: true,
        data: {
          branchId,
          initialCapital: 0,
          initialVolume: 0,
          availableFund: 0,
          availableVolume: 0,
        },
      };
    }
    const r = res.rows[0];
    return {
      success: true,
      data: {
        branchId: r.branch_id,
        initialCapital: parseFloat(r.initial_capital),
        initialVolume: parseFloat(r.initial_volume),
        availableFund: parseFloat(r.available_fund),
        availableVolume: parseFloat(r.available_volume),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  }
}

export async function dbUpdatePhysicalBalanceAction(
  branchId: string,
  initialCapital: number,
  initialVolume: number,
): Promise<DbActionResult<PhysicalBalance>> {
  try {
    const res = await query(
      `INSERT INTO physical_balances (branch_id, initial_capital, initial_volume, available_fund, available_volume)
       VALUES ($1, $2, $3, $2, $3)
       ON CONFLICT (branch_id) DO UPDATE SET
       initial_capital = EXCLUDED.initial_capital,
       initial_volume = EXCLUDED.initial_volume,
       updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [branchId, initialCapital, initialVolume],
    );
    const r = res.rows[0];
    return {
      success: true,
      data: {
        branchId: r.branch_id,
        initialCapital: parseFloat(r.initial_capital),
        initialVolume: parseFloat(r.initial_volume),
        availableFund: parseFloat(r.available_fund),
        availableVolume: parseFloat(r.available_volume),
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  }
}

export async function dbGetPhysicalBuysAction(branchId: string): Promise<DbActionResult<PhysicalBuy[]>> {
  try {
    const res = await query('SELECT * FROM physical_buys WHERE branch_id = $1 ORDER BY date DESC', [branchId]);
    return { success: true, data: res.rows.map(r => mapPhysicalBuyRow(r)) };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  }
}

type PhysicalBuyInput = Omit<PhysicalBuy, 'id' | 'remainingWeight' | 'status' | 'createdAt'>;

export async function dbAddPhysicalBuyAction(buy: PhysicalBuyInput): Promise<DbActionResult<PhysicalBuy>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const id = `pbuy-${crypto.randomUUID().slice(0, 8)}`;
    const remainingWeight = buy.pureGram;
    const status = 'active';
    let openingBalance = buy.openingBalance;

    if (buy.customerId) {
      openingBalance = await adjustCustomerBalanceInTx(client, buy.customerId, buy.buyValue);
    }

    await client.query(
      `INSERT INTO physical_buys (
        id, branch_id, date, particulars, gross_weight, pure_conversion, pure_gram,
        idr_gram, idr_to_usdt, idr_rate, total, buy_value, remaining_weight, status,
        txn_id, customer_id, customer_name, opening_balance, product_id, item, notes,
        purity, touch_loss, actual_purity, market_usd, deal, payment_mode,
        idr_amount, usd_amount, aed_amount, total_weight, tlt_idr_value, tlt_aed_value, total_usdt,
        fix_or_unfix
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
        $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35
      )`,
      [
        id,
        buy.branchId,
        buy.date,
        buy.item || buy.particulars,
        buy.grossWeight,
        buy.pureConversion,
        buy.pureGram,
        buy.idrGram,
        buy.idrToUsdt,
        buy.idrRate,
        buy.total,
        buy.buyValue,
        remainingWeight,
        status,
        buy.txnId ?? null,
        buy.customerId ?? null,
        buy.customerName ?? null,
        openingBalance ?? null,
        buy.productId ?? null,
        buy.item ?? buy.particulars,
        buy.notes ?? null,
        buy.purity ?? null,
        buy.touchLoss ?? null,
        buy.actualPurity ?? buy.pureGram,
        buy.marketUsd ?? null,
        buy.deal ?? null,
        buy.paymentMode ?? null,
        buy.idrAmount ?? buy.idrGram,
        buy.usdAmount ?? null,
        buy.aedAmount ?? null,
        buy.totalWeight ?? buy.pureGram,
        buy.tltIdrValue ?? null,
        buy.tltAedValue ?? null,
        buy.totalUsdt ?? null,
        buy.fixOrUnfix ?? 'unfixed',
      ],
    );

    await client.query(
      `UPDATE physical_balances
       SET available_fund = available_fund - $1, available_volume = available_volume + $2, updated_at = CURRENT_TIMESTAMP
       WHERE branch_id = $3`,
      [buy.buyValue, buy.pureGram, buy.branchId],
    );

    await client.query('COMMIT');

    return {
      success: true,
      data: {
        ...buy,
        id,
        remainingWeight,
        status,
        openingBalance,
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

export async function dbGetPhysicalSellsAction(buyId: string): Promise<DbActionResult<PhysicalSell[]>> {
  try {
    const res = await query('SELECT * FROM physical_sells WHERE buy_id = $1 ORDER BY date DESC', [buyId]);
    return { success: true, data: res.rows.map(r => mapPhysicalSellRow(r)) };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  }
}

type PhysicalSellInput = Omit<PhysicalSell, 'id' | 'profit' | 'createdAt'>;

export async function dbAddPhysicalSellAction(sell: PhysicalSellInput): Promise<DbActionResult<PhysicalSell>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const buyRes = await client.query('SELECT * FROM physical_buys WHERE id = $1 FOR UPDATE', [sell.buyId]);
    if (buyRes.rows.length === 0) throw new Error('Buy deal not found');
    const buy = buyRes.rows[0];

    const remainingWeight = parseFloat(buy.remaining_weight);
    if (sell.pureGram > remainingWeight) {
      throw new Error(`Cannot sell more than remaining weight (${remainingWeight}g)`);
    }

    const pureGram = parseFloat(buy.pure_gram);
    const buyValue = parseFloat(buy.buy_value);
    const costPerGram = buyValue / pureGram;
    const costValue = sell.costValue ?? costPerGram * sell.pureGram;
    const profit = sell.sellValue - costValue;
    const margin = sell.margin ?? (sell.sellValue > 0 ? (profit / sell.sellValue) * 100 : 0);

    let openingBalance = sell.openingBalance;
    if (sell.customerId) {
      openingBalance = await adjustCustomerBalanceInTx(client, sell.customerId, -sell.sellValue);
    }

    const id = `psell-${crypto.randomUUID().slice(0, 8)}`;

    await client.query(
      `INSERT INTO physical_sells (
        id, buy_id, date, particulars, gross_weight, pure_conversion, pure_gram,
        idr_gram, idr_to_usdt, idr_rate, total, sell_value, profit,
        txn_id, customer_id, customer_name, opening_balance, narration, notes,
        purity, touch_loss, actual_purity, market_usd, deal, payment_mode,
        idr_amount, usd_amount, aed_amount, total_weight, tlt_idr_value, tlt_aed_value, total_usdt,
        cost_value, margin
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34
      )`,
      [
        id,
        sell.buyId,
        sell.date,
        sell.narration || sell.particulars || '',
        sell.grossWeight,
        sell.pureConversion,
        sell.pureGram,
        sell.idrGram,
        sell.idrToUsdt,
        sell.idrRate,
        sell.total,
        sell.sellValue,
        profit,
        sell.txnId ?? null,
        sell.customerId ?? null,
        sell.customerName ?? null,
        openingBalance ?? null,
        sell.narration ?? sell.particulars ?? null,
        sell.notes ?? null,
        sell.purity ?? null,
        sell.touchLoss ?? null,
        sell.actualPurity ?? sell.pureGram,
        sell.marketUsd ?? null,
        sell.deal ?? null,
        sell.paymentMode ?? null,
        sell.idrAmount ?? sell.idrGram,
        sell.usdAmount ?? null,
        sell.aedAmount ?? null,
        sell.totalWeight ?? sell.pureGram,
        sell.tltIdrValue ?? null,
        sell.tltAedValue ?? null,
        sell.totalUsdt ?? null,
        costValue,
        margin,
      ],
    );

    const newRemainingWeight = remainingWeight - sell.pureGram;
    const status = newRemainingWeight <= 0.001 ? 'closed' : 'active';
    await client.query(`UPDATE physical_buys SET remaining_weight = $1, status = $2 WHERE id = $3`, [
      newRemainingWeight,
      status,
      sell.buyId,
    ]);

    const branchId = buy.branch_id;
    await client.query(
      `UPDATE physical_balances
       SET available_fund = available_fund + $1, available_volume = available_volume - $2, updated_at = CURRENT_TIMESTAMP
       WHERE branch_id = $3`,
      [sell.sellValue, sell.pureGram, branchId],
    );

    await client.query('COMMIT');

    return {
      success: true,
      data: {
        id,
        profit,
        costValue,
        margin,
        openingBalance,
        ...sell,
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

export async function dbGetPhysicalBuyByIdAction(buyId: string): Promise<DbActionResult<PhysicalBuy>> {
  try {
    const res = await query('SELECT * FROM physical_buys WHERE id = $1', [buyId]);
    if (res.rows.length === 0) throw new Error('Buy deal not found');
    return { success: true, data: mapPhysicalBuyRow(res.rows[0]) };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  }
}

export async function dbDeletePhysicalSellAction(sellId: string): Promise<DbActionResult<null>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sellRes = await client.query('SELECT * FROM physical_sells WHERE id = $1 FOR UPDATE', [sellId]);
    if (sellRes.rows.length === 0) throw new Error('Sell deal not found');
    const sell = sellRes.rows[0];

    const buyRes = await client.query('SELECT * FROM physical_buys WHERE id = $1 FOR UPDATE', [sell.buy_id]);
    if (buyRes.rows.length === 0) throw new Error('Buy deal not found');
    const buy = buyRes.rows[0];

    const pureGram = parseFloat(sell.pure_gram);
    const newRemainingWeight = parseFloat(buy.remaining_weight) + pureGram;
    await client.query(`UPDATE physical_buys SET remaining_weight = $1, status = 'active' WHERE id = $2`, [
      newRemainingWeight,
      sell.buy_id,
    ]);

    const sellValue = parseFloat(sell.sell_value);
    const branchId = buy.branch_id;
    await client.query(
      `UPDATE physical_balances
       SET available_fund = available_fund - $1, available_volume = available_volume + $2, updated_at = CURRENT_TIMESTAMP
       WHERE branch_id = $3`,
      [sellValue, pureGram, branchId],
    );

    if (sell.customer_id) {
      await adjustCustomerBalanceInTx(client, sell.customer_id, sellValue);
    }

    await client.query('DELETE FROM physical_sells WHERE id = $1', [sellId]);

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

export async function dbDeletePhysicalBuyAction(buyId: string): Promise<DbActionResult<null>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sellsRes = await client.query('SELECT id FROM physical_sells WHERE buy_id = $1 LIMIT 1', [buyId]);
    if (sellsRes.rows.length > 0) {
      throw new Error('Cannot delete buy with existing sells. Please delete the sells first.');
    }

    const buyRes = await client.query('SELECT * FROM physical_buys WHERE id = $1 FOR UPDATE', [buyId]);
    if (buyRes.rows.length === 0) {
      // Already deleted (e.g. a duplicate/concurrent request). Treat as success so
      // the UI stays consistent instead of surfacing a spurious "not found" error.
      await client.query('COMMIT');
      return { success: true, data: null };
    }
    const buy = buyRes.rows[0];

    const buyValue = parseFloat(buy.buy_value);
    const pureGram = parseFloat(buy.pure_gram);
    const branchId = buy.branch_id;
    await client.query(
      `UPDATE physical_balances
       SET available_fund = available_fund + $1, available_volume = available_volume - $2, updated_at = CURRENT_TIMESTAMP
       WHERE branch_id = $3`,
      [buyValue, pureGram, branchId],
    );

    if (buy.customer_id) {
      await adjustCustomerBalanceInTx(client, buy.customer_id, -buyValue);
    }

    await client.query('DELETE FROM physical_buys WHERE id = $1', [buyId]);

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

// ─── Physical deal drafts ───────────────────────────────────────────────────
//
// Drafts are a per-branch scratchpad. They live in dedicated tables and are
// intentionally NOT joined into balances, customer ledgers/KYC, KPIs, exports
// or the sellable-stock list. They simply persist until explicitly discarded.

export interface PhysicalDraftsResult {
  buys: PhysicalDraftBuy[];
  sells: PhysicalDraftSell[];
}

export async function dbGetPhysicalDraftsAction(
  branchId: string,
): Promise<DbActionResult<PhysicalDraftsResult>> {
  try {
    const [buysRes, sellsRes] = await Promise.all([
      query('SELECT payload FROM physical_draft_buys WHERE branch_id = $1 ORDER BY created_at DESC', [branchId]),
      query('SELECT payload FROM physical_draft_sells WHERE branch_id = $1 ORDER BY created_at DESC', [branchId]),
    ]);
    return {
      success: true,
      data: {
        buys: buysRes.rows.map(r => r.payload as PhysicalDraftBuy),
        sells: sellsRes.rows.map(r => r.payload as PhysicalDraftSell),
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  }
}

export async function dbAddPhysicalDraftBuyAction(
  branchId: string,
  draft: PhysicalDraftBuy,
): Promise<DbActionResult<null>> {
  try {
    await query(
      `INSERT INTO physical_draft_buys (draft_id, branch_id, payload)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (draft_id) DO UPDATE SET payload = EXCLUDED.payload`,
      [draft.draftId, branchId, JSON.stringify(draft)],
    );
    return { success: true, data: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  }
}

export async function dbAddPhysicalDraftSellAction(
  branchId: string,
  draft: PhysicalDraftSell,
): Promise<DbActionResult<null>> {
  try {
    await query(
      `INSERT INTO physical_draft_sells (draft_id, branch_id, buy_id, payload)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (draft_id) DO UPDATE SET payload = EXCLUDED.payload, buy_id = EXCLUDED.buy_id`,
      [draft.draftId, branchId, draft.buyId ?? null, JSON.stringify(draft)],
    );
    return { success: true, data: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  }
}

export async function dbDeletePhysicalDraftBuyAction(draftId: string): Promise<DbActionResult<null>> {
  try {
    await query('DELETE FROM physical_draft_buys WHERE draft_id = $1', [draftId]);
    return { success: true, data: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  }
}

export async function dbDeletePhysicalDraftSellAction(draftId: string): Promise<DbActionResult<null>> {
  try {
    await query('DELETE FROM physical_draft_sells WHERE draft_id = $1', [draftId]);
    return { success: true, data: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  }
}
