'use server';

import { query, pool } from '@/lib/db';
import { DbActionResult } from './dbActions';
import { PhysicalBalance, PhysicalBuy, PhysicalSell, PhysicalBulkSell, PhysicalPaymentMode } from '@/types';

import { mapPhysicalBuyRow, mapPhysicalSellRow, mapPhysicalBulkSellRow } from '@/lib/physicalMappers';
import { adjustCustomerBalanceInTx } from './customerActions';
import { createAutoLedgerEntry, deleteAutoLedgerEntryByReference } from './fundActions';
import { logger } from '@/lib/logger';
import type { PhysicalDraftBuy, PhysicalDraftSell } from '@/lib/physical/drafts';
import { roundTo14 } from '@/lib/physicalCalculations';


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

export type PhysicalBuyMetadataInput = {
  date: string;
  txnId?: string;
  customerId?: string;
  customerName: string;
  productId?: string;
  item: string;
  notes?: string;
  fixOrUnfix?: 'fixed' | 'unfixed';
  paymentMode?: PhysicalBuy['paymentMode'];
};

export type PhysicalSellMetadataInput = {
  date: string;
  txnId?: string;
  customerId?: string;
  customerName: string;
  narration?: string;
  notes?: string;
  paymentMode?: PhysicalBuy['paymentMode'];
};

function requireCustomerName(name?: string): string {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) throw new Error('Customer name is required');
  return trimmed;
}

export async function dbAddPhysicalBuyAction(buy: PhysicalBuyInput): Promise<DbActionResult<PhysicalBuy>> {
  const client = await pool.connect();
  try {
    const customerName = requireCustomerName(buy.customerName);
    buy = { ...buy, customerName };
    await client.query('BEGIN');

    const id = `pbuy-${crypto.randomUUID().slice(0, 8)}`;
    const remainingWeight = buy.grossWeight; // track gross weight, not pure
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
        buy.idrAmount ?? buy.tltIdrValue ?? (buy.pureGram * buy.idrGram),
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
      [buy.buyValue, buy.grossWeight, buy.branchId],
    );

    await client.query('COMMIT');

    if (buy.customerId) {
      try {
        const usdtVal = buy.totalUsdt ?? buy.buyValue;
        const idrVal = buy.tltIdrValue;
        const parts = [`Physical buy - ${buy.item || buy.particulars || ''}`];
        if (usdtVal) parts.push(`USDT ${usdtVal.toFixed(2)}`);
        if (idrVal) parts.push(`IDR ${idrVal.toFixed(2)}`);
        const currencyInfo = await getCustomerCurrencyInfo(buy.customerId, usdtVal, buy.tltAedValue, buy.tltIdrValue);
        await createAutoLedgerEntry({
          branchId: buy.branchId,
          customerId: buy.customerId,
          direction: 'credit',
          amount: usdtVal,
          referenceType: 'physical_buy',
          referenceId: id,
          description: parts.join(' | '),
          ...currencyInfo,
          settlementCurrency: currencyInfo.settlementCurrency,
        });
      } catch (autoErr) {
        logger.error({ err: autoErr, buyId: id }, 'Auto ledger entry failed for buy');
      }
    }

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
    const customerName = requireCustomerName(sell.customerName);
    sell = { ...sell, customerName };
    await client.query('BEGIN');

    const buyRes = await client.query('SELECT * FROM physical_buys WHERE id = $1 FOR UPDATE', [sell.buyId]);
    if (buyRes.rows.length === 0) throw new Error('Buy deal not found');
    const buy = buyRes.rows[0];

    const remainingWeight = parseFloat(buy.remaining_weight); // gross grams remaining
    if (sell.grossWeight > remainingWeight) {
      throw new Error(`Cannot sell more than remaining gross weight (${remainingWeight}g)`);
    }

    const buyGrossWeight = parseFloat(buy.gross_weight);
    const buyValue = parseFloat(buy.buy_value);
    const costPerGram = roundTo14(buyValue / buyGrossWeight); // cost per gross gram
    const costValue = sell.costValue ?? roundTo14(costPerGram * sell.grossWeight);
    const profit = roundTo14(sell.sellValue - costValue);
    const margin = sell.margin ?? (sell.sellValue > 0 ? roundTo14((profit / sell.sellValue) * 100) : 0);

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
        sell.idrAmount ?? sell.tltIdrValue ?? (sell.pureGram * sell.idrGram),
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

    const newRemainingWeight = remainingWeight - sell.grossWeight; // decrement gross
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
      [sell.sellValue, sell.grossWeight, branchId],
    );

    await client.query('COMMIT');

    if (sell.customerId) {
      try {
        const usdtVal = sell.totalUsdt ?? sell.sellValue;
        const idrVal = sell.tltIdrValue;
        const parts = [`Physical sell - ${sell.narration || sell.particulars || ''}`];
        if (usdtVal) parts.push(`USDT ${usdtVal.toFixed(2)}`);
        if (idrVal) parts.push(`IDR ${idrVal.toFixed(2)}`);
        const currencyInfo = await getCustomerCurrencyInfo(sell.customerId, usdtVal, sell.tltAedValue, sell.tltIdrValue);
        await createAutoLedgerEntry({
          branchId,
          customerId: sell.customerId,
          direction: 'debit',
          amount: usdtVal,
          referenceType: 'physical_sell',
          referenceId: id,
          description: parts.join(' | '),
          ...currencyInfo,
          settlementCurrency: currencyInfo.settlementCurrency,
        });
      } catch (autoErr) {
        logger.error({ err: autoErr, sellId: id }, 'Auto ledger entry failed for sell');
      }
    }

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

export async function dbUpdatePhysicalBuyMetadataAction(
  buyId: string,
  input: PhysicalBuyMetadataInput,
): Promise<DbActionResult<PhysicalBuy>> {
  const client = await pool.connect();
  try {
    const customerName = requireCustomerName(input.customerName);
    const item = input.item.trim();
    if (!item) throw new Error('Item is required');

    await client.query('BEGIN');

    const buyRes = await client.query('SELECT * FROM physical_buys WHERE id = $1 FOR UPDATE', [buyId]);
    if (buyRes.rows.length === 0) throw new Error('Buy deal not found');
    const buy = buyRes.rows[0];

    const oldCustomerId = buy.customer_id as string | null;
    const newCustomerId = input.customerId ?? null;
    const buyValue = parseFloat(buy.buy_value);
    let openingBalance: number | null =
      buy.opening_balance != null ? parseFloat(buy.opening_balance) : null;

    if (oldCustomerId && oldCustomerId !== newCustomerId) {
      await adjustCustomerBalanceInTx(client, oldCustomerId, -buyValue);
      openingBalance = null;
    }
    if (newCustomerId && newCustomerId !== oldCustomerId) {
      openingBalance = await adjustCustomerBalanceInTx(client, newCustomerId, buyValue);
    }

    const res = await client.query(
      `UPDATE physical_buys SET
        date = $1,
        txn_id = $2,
        customer_id = $3,
        customer_name = $4,
        opening_balance = $5,
        product_id = $6,
        item = $7,
        particulars = $8,
        notes = $9,
        fix_or_unfix = $10,
        payment_mode = $11
      WHERE id = $12
      RETURNING *`,
      [
        input.date,
        input.txnId ?? null,
        newCustomerId,
        customerName,
        openingBalance,
        input.productId ?? null,
        item,
        item,
        input.notes?.trim() || null,
        input.fixOrUnfix ?? buy.fix_or_unfix ?? 'unfixed',
        input.paymentMode ?? buy.payment_mode ?? null,
        buyId,
      ],
    );

    await client.query('COMMIT');
    return { success: true, data: mapPhysicalBuyRow(res.rows[0]) };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

export async function dbUpdatePhysicalSellMetadataAction(
  sellId: string,
  input: PhysicalSellMetadataInput,
): Promise<DbActionResult<PhysicalSell>> {
  const client = await pool.connect();
  try {
    const customerName = requireCustomerName(input.customerName);

    await client.query('BEGIN');

    const sellRes = await client.query('SELECT * FROM physical_sells WHERE id = $1 FOR UPDATE', [sellId]);
    if (sellRes.rows.length === 0) throw new Error('Sell deal not found');
    const sell = sellRes.rows[0];

    const oldCustomerId = sell.customer_id as string | null;
    const newCustomerId = input.customerId ?? null;
    const sellValue = parseFloat(sell.sell_value);
    let openingBalance: number | null =
      sell.opening_balance != null ? parseFloat(sell.opening_balance) : null;

    if (oldCustomerId && oldCustomerId !== newCustomerId) {
      await adjustCustomerBalanceInTx(client, oldCustomerId, sellValue);
      openingBalance = null;
    }
    if (newCustomerId && newCustomerId !== oldCustomerId) {
      openingBalance = await adjustCustomerBalanceInTx(client, newCustomerId, -sellValue);
    }

    const narration = input.narration?.trim() || null;
    const res = await client.query(
      `UPDATE physical_sells SET
        date = $1,
        txn_id = $2,
        customer_id = $3,
        customer_name = $4,
        opening_balance = $5,
        narration = $6,
        particulars = COALESCE($6, particulars),
        notes = $7,
        payment_mode = $8
      WHERE id = $9
      RETURNING *`,
      [
        input.date,
        input.txnId ?? null,
        newCustomerId,
        customerName,
        openingBalance,
        narration,
        input.notes?.trim() || null,
        input.paymentMode ?? sell.payment_mode ?? null,
        sellId,
      ],
    );

    await client.query('COMMIT');
    return { success: true, data: mapPhysicalSellRow(res.rows[0]) };
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

    if (sell.bulk_sell_id) {
      throw new Error('This sell is part of a Bulk Sell. Please delete the entire Bulk Sell from the main page instead.');
    }


    const buyRes = await client.query('SELECT * FROM physical_buys WHERE id = $1 FOR UPDATE', [sell.buy_id]);
    if (buyRes.rows.length === 0) throw new Error('Buy deal not found');
    const buy = buyRes.rows[0];

    const grossWeight = parseFloat(sell.gross_weight); // restore gross grams
    const newRemainingWeight = parseFloat(buy.remaining_weight) + grossWeight;
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
      [sellValue, grossWeight, branchId],
    );

    if (sell.customer_id) {
      await adjustCustomerBalanceInTx(client, sell.customer_id, sellValue);
    }

    await client.query('DELETE FROM physical_sells WHERE id = $1', [sellId]);

    await client.query('COMMIT');
    await deleteAutoLedgerEntryByReference('physical_sell', sellId);
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
    const grossWeight = parseFloat(buy.gross_weight); // restore gross grams
    const branchId = buy.branch_id;
    await client.query(
      `UPDATE physical_balances
       SET available_fund = available_fund + $1, available_volume = available_volume - $2, updated_at = CURRENT_TIMESTAMP
       WHERE branch_id = $3`,
      [buyValue, grossWeight, branchId],
    );

    if (buy.customer_id) {
      await adjustCustomerBalanceInTx(client, buy.customer_id, -buyValue);
    }

    await client.query('DELETE FROM physical_buys WHERE id = $1', [buyId]);

    await client.query('COMMIT');
    await deleteAutoLedgerEntryByReference('physical_buy', buyId);
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

export async function dbAddPhysicalBulkSellAction(bulk: {
  branchId: string;
  date: string;
  particulars: string;
  notes?: string;
  customerName: string;
  customerId?: string;
  paymentMode: PhysicalPaymentMode;
  grossWeight: number;
  pureConversion: number;
  pureGram: number;
  idrGram: number;
  idrToUsdt: number;
  idrRate: number;
  total: number;
  sellValue: number;
  profit: number;
  txnId: string;
  usdAmount?: number;
  aedAmount?: number;
  totalWeight?: number;
  tltIdrValue?: number;
  tltAedValue?: number;
  totalUsdt?: number;
  items: Array<{
    buyId: string;
    pureGram: number;
    grossWeight: number;
    pureConversion: number;
    idrGram: number;
    idrToUsdt: number;
    idrRate: number;
    total: number;
    sellValue: number;
    profit: number;
    costValue: number;
    margin: number;
  }>;
}): Promise<DbActionResult<{ bulkSellId: string }>> {
  const client = await pool.connect();
  try {
    const customerName = requireCustomerName(bulk.customerName);
    await client.query('BEGIN');

    const bulkSellId = `bsell-${crypto.randomUUID().slice(0, 8)}`;
    let openingBalance: number | null = null;

    if (bulk.customerId) {
      openingBalance = await adjustCustomerBalanceInTx(client, bulk.customerId, -bulk.sellValue);
    }

    await client.query(
      `INSERT INTO physical_bulk_sells (
        id, branch_id, date, particulars, gross_weight, pure_conversion, pure_gram,
        idr_gram, idr_to_usdt, idr_rate, total, sell_value, profit,
        txn_id, customer_id, customer_name, opening_balance, narration, notes,
        payment_mode, idr_amount, usd_amount, aed_amount, total_weight, tlt_idr_value, tlt_aed_value, total_usdt
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
      )`,
      [
        bulkSellId,
        bulk.branchId,
        bulk.date,
        bulk.particulars,
        bulk.grossWeight,
        bulk.pureConversion,
        bulk.pureGram,
        bulk.idrGram,
        bulk.idrToUsdt,
        bulk.idrRate,
        bulk.total,
        bulk.sellValue,
        bulk.profit,
        bulk.txnId,
        bulk.customerId ?? null,
        customerName,
        openingBalance ?? null,
        bulk.particulars,
        bulk.notes ?? null,
        bulk.paymentMode,
        bulk.idrGram,
        bulk.usdAmount ?? null,
        bulk.aedAmount ?? null,
        bulk.totalWeight ?? bulk.pureGram,
        bulk.tltIdrValue ?? null,
        bulk.tltAedValue ?? null,
        bulk.totalUsdt ?? null,
      ]
    );

    for (const item of bulk.items) {
      const buyRes = await client.query('SELECT * FROM physical_buys WHERE id = $1 FOR UPDATE', [item.buyId]);
      if (buyRes.rows.length === 0) throw new Error(`Buy deal ${item.buyId} not found`);
      const buy = buyRes.rows[0];

      const remainingWeight = parseFloat(buy.remaining_weight); // gross grams
      if (item.grossWeight > remainingWeight) {
        throw new Error(`Cannot sell more than remaining gross weight (${remainingWeight}g) for Buy ${buy.item || buy.particulars}`);
      }

      const childSellId = `psell-${crypto.randomUUID().slice(0, 8)}`;
      const childTxnId = `${bulk.txnId}-${item.buyId.slice(-4)}`;

      await client.query(
        `INSERT INTO physical_sells (
          id, buy_id, date, particulars, gross_weight, pure_conversion, pure_gram,
          idr_gram, idr_to_usdt, idr_rate, total, sell_value, profit,
          txn_id, customer_id, customer_name, opening_balance, narration, notes,
          payment_mode, idr_amount, usd_amount, aed_amount, total_weight, tlt_idr_value, tlt_aed_value, total_usdt,
          cost_value, margin, bulk_sell_id
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
          $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30
        )`,
        [
          childSellId,
          item.buyId,
          bulk.date,
          bulk.particulars,
          item.grossWeight,
          item.pureConversion,
          item.pureGram,
          item.idrGram,
          item.idrToUsdt,
          item.idrRate,
          item.total,
          item.sellValue,
          item.profit,
          childTxnId,
          bulk.customerId ?? null,
          customerName,
          openingBalance ?? null,
          bulk.particulars,
          bulk.notes ?? null,
          bulk.paymentMode,
          item.idrGram,
          item.sellValue / 3.6725,
          item.sellValue,
          item.grossWeight,
          item.pureGram * item.idrGram,
          item.total,
          item.total / 3.6725,
          item.costValue,
          item.margin,
          bulkSellId,
        ]
      );

      const newRemainingWeight = remainingWeight - item.grossWeight; // decrement gross
      const status = newRemainingWeight <= 0.001 ? 'closed' : 'active';
      await client.query(`UPDATE physical_buys SET remaining_weight = $1, status = $2 WHERE id = $3`, [
        newRemainingWeight,
        status,
        item.buyId,
      ]);
    }

    await client.query(
      `UPDATE physical_balances
       SET available_fund = available_fund + $1, available_volume = available_volume - $2, updated_at = CURRENT_TIMESTAMP
       WHERE branch_id = $3`,
      [bulk.sellValue, bulk.grossWeight, bulk.branchId] // deduct gross
    );

    await client.query('COMMIT');

    if (bulk.customerId) {
      try {
        const usdtVal = bulk.totalUsdt ?? bulk.sellValue;
        const idrVal = bulk.tltIdrValue;
        const parts = [`Physical bulk sell - ${bulk.particulars || ''}`];
        if (usdtVal) parts.push(`USDT ${usdtVal.toFixed(2)}`);
        if (idrVal) parts.push(`IDR ${idrVal.toFixed(2)}`);
        const currencyInfo = await getCustomerCurrencyInfo(bulk.customerId, usdtVal, bulk.tltAedValue, bulk.tltIdrValue);
        await createAutoLedgerEntry({
          branchId: bulk.branchId,
          customerId: bulk.customerId,
          direction: 'debit',
          amount: usdtVal,
          referenceType: 'physical_sell',
          referenceId: bulkSellId,
          description: parts.join(' | '),
          ...currencyInfo,
          settlementCurrency: currencyInfo.settlementCurrency,
        });
      } catch (autoErr) {
        logger.error({ err: autoErr, bulkSellId }, 'Auto ledger entry failed for bulk sell');
      }
    }

    return { success: true, data: { bulkSellId } };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

export async function dbDeletePhysicalBulkSellAction(bulkSellId: string): Promise<DbActionResult<null>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const bulkRes = await client.query('SELECT * FROM physical_bulk_sells WHERE id = $1 FOR UPDATE', [bulkSellId]);
    if (bulkRes.rows.length === 0) throw new Error('Bulk sell not found');
    const bulk = bulkRes.rows[0];

    const sellsRes = await client.query('SELECT * FROM physical_sells WHERE bulk_sell_id = $1 FOR UPDATE', [bulkSellId]);
    const childSells = sellsRes.rows;

    for (const sell of childSells) {
      const buyRes = await client.query('SELECT * FROM physical_buys WHERE id = $1 FOR UPDATE', [sell.buy_id]);
      if (buyRes.rows.length > 0) {
        const buy = buyRes.rows[0];
        const grossWeight = parseFloat(sell.gross_weight); // restore gross grams
        const newRemainingWeight = parseFloat(buy.remaining_weight) + grossWeight;
        await client.query(`UPDATE physical_buys SET remaining_weight = $1, status = 'active' WHERE id = $2`, [
          newRemainingWeight,
          sell.buy_id,
        ]);
      }
    }

    const bulkSellValue = parseFloat(bulk.sell_value);
    const bulkGrossWeight = parseFloat(bulk.gross_weight); // restore gross
    const branchId = bulk.branch_id;
    await client.query(
      `UPDATE physical_balances
       SET available_fund = available_fund - $1, available_volume = available_volume + $2, updated_at = CURRENT_TIMESTAMP
       WHERE branch_id = $3`,
      [bulkSellValue, bulkGrossWeight, branchId]
    );

    if (bulk.customer_id) {
      await adjustCustomerBalanceInTx(client, bulk.customer_id, bulkSellValue);
    }

    await client.query('DELETE FROM physical_sells WHERE bulk_sell_id = $1', [bulkSellId]);
    await client.query('DELETE FROM physical_bulk_sells WHERE id = $1', [bulkSellId]);

    await client.query('COMMIT');
    await deleteAutoLedgerEntryByReference('physical_sell', bulkSellId);
    return { success: true, data: null };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

async function getCustomerCurrencyInfo(
  customerId: string,
  usdtVal: number,
  aedVal: number | undefined,
  idrVal: number | undefined,
): Promise<{ customerCurrency: string; customerCurrencyRate?: number; settlementCurrency: string }> {
  try {
    const result = await query('SELECT currency FROM customers WHERE id = $1', [customerId]);
    const profileCurrency: string = result.rows[0]?.currency || 'USDT';
    if (!usdtVal) {
      return { customerCurrency: profileCurrency, settlementCurrency: 'USDT' };
    }
    if (profileCurrency === 'AED' && aedVal) {
      return {
        customerCurrency: 'AED',
        customerCurrencyRate: aedVal / usdtVal,
        settlementCurrency: 'USDT',
      };
    }
    if (profileCurrency === 'IDR' && idrVal) {
      return {
        customerCurrency: 'IDR',
        customerCurrencyRate: idrVal / usdtVal,
        settlementCurrency: 'USDT',
      };
    }
    // No fiat rate on deal — ledger stays in USDT even for AED/IDR profile customers
    return { customerCurrency: 'USDT', settlementCurrency: 'USDT' };
  } catch {
    return { customerCurrency: 'USDT', settlementCurrency: 'USDT' };
  }
}

