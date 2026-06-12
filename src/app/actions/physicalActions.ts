'use server';

import { query, pool } from '@/lib/db';
import { DbActionResult } from './dbActions';
import { PhysicalBalance, PhysicalBuy, PhysicalSell } from '@/types';
// Removed uuid import, using crypto.randomUUID()

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
  initialVolume: number
): Promise<DbActionResult<PhysicalBalance>> {
  try {
    // If setting for the first time, available = initial.
    // If updating, we should probably just reset it for simplicity or adjust it. 
    // Usually, this is just called once.
    const res = await query(
      `INSERT INTO physical_balances (branch_id, initial_capital, initial_volume, available_fund, available_volume)
       VALUES ($1, $2, $3, $2, $3)
       ON CONFLICT (branch_id) DO UPDATE SET
       initial_capital = EXCLUDED.initial_capital,
       initial_volume = EXCLUDED.initial_volume,
       updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [branchId, initialCapital, initialVolume]
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
    const buys: PhysicalBuy[] = res.rows.map(r => ({
      id: r.id,
      branchId: r.branch_id,
      date: new Date(r.date).toISOString(),
      particulars: r.particulars,
      grossWeight: parseFloat(r.gross_weight),
      pureConversion: parseFloat(r.pure_conversion),
      pureGram: parseFloat(r.pure_gram),
      idrGram: parseFloat(r.idr_gram),
      idrToUsdt: parseFloat(r.idr_to_usdt),
      idrRate: parseFloat(r.idr_rate),
      total: parseFloat(r.total),
      buyValue: parseFloat(r.buy_value),
      remainingWeight: parseFloat(r.remaining_weight),
      status: r.status,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    }));
    return { success: true, data: buys };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  }
}

export async function dbAddPhysicalBuyAction(
  buy: Omit<PhysicalBuy, 'id' | 'remainingWeight' | 'status'>
): Promise<DbActionResult<PhysicalBuy>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const id = `pbuy-${crypto.randomUUID().slice(0, 8)}`;
    const remainingWeight = buy.pureGram;
    const status = 'active';

    await client.query(
      `INSERT INTO physical_buys (
        id, branch_id, date, particulars, gross_weight, pure_conversion, pure_gram, 
        idr_gram, idr_to_usdt, idr_rate, total, buy_value, remaining_weight, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id, buy.branchId, buy.date, buy.particulars, buy.grossWeight, buy.pureConversion, buy.pureGram,
        buy.idrGram, buy.idrToUsdt, buy.idrRate, buy.total, buy.buyValue, remainingWeight, status
      ]
    );

    // Update branch balance
    await client.query(
      `UPDATE physical_balances 
       SET available_fund = available_fund - $1, available_volume = available_volume + $2, updated_at = CURRENT_TIMESTAMP
       WHERE branch_id = $3`,
      [buy.buyValue, buy.pureGram, buy.branchId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      data: {
        ...buy,
        id,
        remainingWeight,
        status,
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
    const sells: PhysicalSell[] = res.rows.map(r => ({
      id: r.id,
      buyId: r.buy_id,
      date: new Date(r.date).toISOString(),
      particulars: r.particulars,
      grossWeight: parseFloat(r.gross_weight),
      pureConversion: parseFloat(r.pure_conversion),
      pureGram: parseFloat(r.pure_gram),
      idrGram: parseFloat(r.idr_gram),
      idrToUsdt: parseFloat(r.idr_to_usdt),
      idrRate: parseFloat(r.idr_rate),
      total: parseFloat(r.total),
      sellValue: parseFloat(r.sell_value),
      profit: parseFloat(r.profit),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    }));
    return { success: true, data: sells };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  }
}

export async function dbAddPhysicalSellAction(
  sell: Omit<PhysicalSell, 'id' | 'profit' | 'createdAt'>
): Promise<DbActionResult<PhysicalSell>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get the Buy
    const buyRes = await client.query('SELECT * FROM physical_buys WHERE id = $1 FOR UPDATE', [sell.buyId]);
    if (buyRes.rows.length === 0) throw new Error('Buy deal not found');
    const buy = buyRes.rows[0];

    const remainingWeight = parseFloat(buy.remaining_weight);
    if (sell.pureGram > remainingWeight) {
      throw new Error(`Cannot sell more than remaining weight (${remainingWeight}g)`);
    }

    // 2. Calculate profit
    // Profit = Sell Value - (Cost per gram * Sell Weight)
    const pureGram = parseFloat(buy.pure_gram);
    const buyValue = parseFloat(buy.buy_value);
    const costPerGram = buyValue / pureGram;
    const costBasis = costPerGram * sell.pureGram;
    const profit = sell.sellValue - costBasis;

    const id = `psell-${crypto.randomUUID().slice(0, 8)}`;

    // 3. Insert Sell
    await client.query(
      `INSERT INTO physical_sells (id, buy_id, date, particulars, gross_weight, pure_conversion, pure_gram, idr_gram, idr_to_usdt, idr_rate, total, sell_value, profit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [id, sell.buyId, sell.date, sell.particulars || '', sell.grossWeight, sell.pureConversion, sell.pureGram, sell.idrGram, sell.idrToUsdt, sell.idrRate, sell.total, sell.sellValue, profit]
    );

    // 4. Update Buy remaining weight
    const newRemainingWeight = remainingWeight - sell.pureGram;
    const status = newRemainingWeight <= 0.001 ? 'closed' : 'active'; // Account for minor float precision
    await client.query(
      `UPDATE physical_buys SET remaining_weight = $1, status = $2 WHERE id = $3`,
      [newRemainingWeight, status, sell.buyId]
    );

    // 5. Update branch balance
    const branchId = buy.branch_id;
    await client.query(
      `UPDATE physical_balances 
       SET available_fund = available_fund + $1, available_volume = available_volume - $2, updated_at = CURRENT_TIMESTAMP
       WHERE branch_id = $3`,
      [sell.sellValue, sell.pureGram, branchId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      data: {
        id,
        profit,
        ...sell
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
    const r = res.rows[0];
    return {
      success: true,
      data: {
        id: r.id,
        branchId: r.branch_id,
        date: new Date(r.date).toISOString(),
        particulars: r.particulars,
        grossWeight: parseFloat(r.gross_weight),
        pureConversion: parseFloat(r.pure_conversion),
        pureGram: parseFloat(r.pure_gram),
        idrGram: parseFloat(r.idr_gram),
        idrToUsdt: parseFloat(r.idr_to_usdt),
        idrRate: parseFloat(r.idr_rate),
        total: parseFloat(r.total),
        buyValue: parseFloat(r.buy_value),
        remainingWeight: parseFloat(r.remaining_weight),
        status: r.status,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
      }
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    return { success: false, error: message };
  }
}

export async function dbDeletePhysicalSellAction(sellId: string): Promise<DbActionResult<null>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get the Sell
    const sellRes = await client.query('SELECT * FROM physical_sells WHERE id = $1 FOR UPDATE', [sellId]);
    if (sellRes.rows.length === 0) throw new Error('Sell deal not found');
    const sell = sellRes.rows[0];

    // 2. Get the Buy
    const buyRes = await client.query('SELECT * FROM physical_buys WHERE id = $1 FOR UPDATE', [sell.buy_id]);
    if (buyRes.rows.length === 0) throw new Error('Buy deal not found');
    const buy = buyRes.rows[0];

    // 3. Update Buy remaining weight
    const pureGram = parseFloat(sell.pure_gram);
    const newRemainingWeight = parseFloat(buy.remaining_weight) + pureGram;
    const status = 'active'; 
    await client.query(
      `UPDATE physical_buys SET remaining_weight = $1, status = $2 WHERE id = $3`,
      [newRemainingWeight, status, sell.buy_id]
    );

    // 4. Update branch balance
    const sellValue = parseFloat(sell.sell_value);
    const branchId = buy.branch_id;
    await client.query(
      `UPDATE physical_balances 
       SET available_fund = available_fund - $1, available_volume = available_volume + $2, updated_at = CURRENT_TIMESTAMP
       WHERE branch_id = $3`,
      [sellValue, pureGram, branchId]
    );

    // 5. Delete Sell
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

    // 1. Check for existing sells
    const sellsRes = await client.query('SELECT id FROM physical_sells WHERE buy_id = $1 LIMIT 1', [buyId]);
    if (sellsRes.rows.length > 0) {
      throw new Error('Cannot delete buy with existing sells. Please delete the sells first.');
    }

    // 2. Get the Buy
    const buyRes = await client.query('SELECT * FROM physical_buys WHERE id = $1 FOR UPDATE', [buyId]);
    if (buyRes.rows.length === 0) throw new Error('Buy deal not found');
    const buy = buyRes.rows[0];

    // 3. Update branch balance
    const buyValue = parseFloat(buy.buy_value);
    const pureGram = parseFloat(buy.pure_gram);
    const branchId = buy.branch_id;
    await client.query(
      `UPDATE physical_balances 
       SET available_fund = available_fund + $1, available_volume = available_volume - $2, updated_at = CURRENT_TIMESTAMP
       WHERE branch_id = $3`,
      [buyValue, pureGram, branchId]
    );

    // 4. Delete Buy
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
