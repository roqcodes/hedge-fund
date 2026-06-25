'use server';

import { query, pool } from '@/lib/db';
import { DbActionResult } from './dbActions';
import { getCurrentUserAction } from './auth';
import {
  ICRegion,
  ICSupplier,
  ICWarehouse,
  ICRates,
  ICPurchase,
  ICSale,
  ICWarehouseTransaction,
} from '@/types';
import {
  mapICRegionRow,
  mapICSupplierRow,
  mapICWarehouseRow,
  mapICRatesRow,
  mapICPurchaseRow,
  mapICSaleRow,
} from '@/lib/icTransferMappers';

async function resolveEnteredBy() {
  const userRes = await getCurrentUserAction();
  const user = userRes.success ? userRes.data : null;
  return {
    enteredBy: user?.email ?? null,
    enteredByName: user?.name ?? null,
    enteredByUserId: user?.id ?? null,
  };
}

export async function dbAddICRegionAction(name: string, country: string): Promise<DbActionResult<ICRegion>> {
  try {
    const res = await query(
      `INSERT INTO ic_regions (name, country) VALUES ($1, $2) RETURNING *`,
      [name, country]
    );
    return { success: true, data: mapICRegionRow(res.rows[0]) };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbUpdateICRegionAction(id: string, name: string, country: string): Promise<DbActionResult<ICRegion>> {
  try {
    const res = await query(
      `UPDATE ic_regions SET name = $1, country = $2 WHERE id = $3 RETURNING *`,
      [name, country, id]
    );
    if (res.rows.length === 0) return { success: false, error: 'Region not found' };
    return { success: true, data: mapICRegionRow(res.rows[0]) };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbDeleteICRegionAction(id: string): Promise<DbActionResult<void>> {
  try {
    const res = await query(`DELETE FROM ic_regions WHERE id = $1`, [id]);
    if (res.rowCount === 0) return { success: false, error: 'Region not found' };
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error. Might be linked to existing suppliers/warehouses.' };
  }
}

export async function dbAddICSupplierAction(
  name: string, phone: string, commission: number | null, regionId: string, email: string, address: string
): Promise<DbActionResult<ICSupplier>> {
  try {
    const res = await query(
      `INSERT INTO ic_suppliers (name, phone, commission, region_id, email, address)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, phone, commission, regionId, email, address]
    );
    return { success: true, data: mapICSupplierRow(res.rows[0]) };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbUpdateICSupplierAction(
  id: string, name: string, phone: string, commission: number | null, regionId: string, email: string, address: string
): Promise<DbActionResult<ICSupplier>> {
  try {
    const res = await query(
      `UPDATE ic_suppliers SET name=$1, phone=$2, commission=$3, region_id=$4, email=$5, address=$6 WHERE id=$7 RETURNING *`,
      [name, phone, commission, regionId, email, address, id]
    );
    if (res.rowCount === 0) return { success: false, error: 'Supplier not found' };
    return { success: true, data: mapICSupplierRow(res.rows[0]) };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbDeleteICSupplierAction(id: string): Promise<DbActionResult<void>> {
  try {
    const res = await query(`DELETE FROM ic_suppliers WHERE id=$1`, [id]);
    if (res.rowCount === 0) return { success: false, error: 'Supplier not found' };
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbAddICWarehouseAction(
  name: string, phone: string, commission: number | null, regionId: string, email: string, address: string
): Promise<DbActionResult<ICWarehouse>> {
  try {
    const res = await query(
      `INSERT INTO ic_warehouses (name, phone, commission, region_id, email, address)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, phone, commission, regionId, email, address]
    );
    return { success: true, data: mapICWarehouseRow(res.rows[0]) };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbUpdateICWarehouseAction(
  id: string, name: string, phone: string, commission: number | null, regionId: string, email: string, address: string
): Promise<DbActionResult<ICWarehouse>> {
  try {
    const res = await query(
      `UPDATE ic_warehouses SET name=$1, phone=$2, commission=$3, region_id=$4, email=$5, address=$6 WHERE id=$7 RETURNING *`,
      [name, phone, commission, regionId, email, address, id]
    );
    if (res.rowCount === 0) return { success: false, error: 'Warehouse not found' };
    return { success: true, data: mapICWarehouseRow(res.rows[0]) };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbDeleteICWarehouseAction(id: string): Promise<DbActionResult<void>> {
  try {
    const res = await query(`DELETE FROM ic_warehouses WHERE id=$1`, [id]);
    if (res.rowCount === 0) return { success: false, error: 'Warehouse not found' };
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbUpdateICRatesAction(
  buyRate: number, saleRate: number, sarConversion: number, inrConversion: number
): Promise<DbActionResult<ICRates>> {
  try {
    // Upsert logic for rates (assuming a single active row for the entire system)
    const existing = await query('SELECT id FROM ic_rates LIMIT 1');
    let res;
    if (existing.rows.length > 0) {
      res = await query(
        `UPDATE ic_rates SET buy_rate=$1, sale_rate=$2, sar_conversion=$3, inr_conversion=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *`,
        [buyRate, saleRate, sarConversion, inrConversion, existing.rows[0].id]
      );
    } else {
      res = await query(
        `INSERT INTO ic_rates (buy_rate, sale_rate, sar_conversion, inr_conversion) VALUES ($1, $2, $3, $4) RETURNING *`,
        [buyRate, saleRate, sarConversion, inrConversion]
      );
    }
    return { success: true, data: mapICRatesRow(res.rows[0]) };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbAddICPurchaseAction(
  purchase: Omit<ICPurchase, 'id' | 'createdAt'>
): Promise<DbActionResult<ICPurchase>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `INSERT INTO ic_purchases (supplier_id, location_id, warehouse_id, unit_rate, units, payment_method, notes, inr_total, aed_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        purchase.supplierId || null,
        purchase.locationId || null,
        purchase.warehouseId || null,
        purchase.unitRate,
        purchase.units,
        purchase.paymentMethod || null,
        purchase.notes || null,
        purchase.inrTotal || null,
        purchase.aedTotal || null
      ]
    );
    
    // Also log the transaction to ic_warehouse_transactions
    if (purchase.warehouseId) {
      await client.query(
        `INSERT INTO ic_warehouse_transactions (warehouse_id, transaction_type, units, reference_type, reference_id)
         VALUES ($1, 'receive', $2, 'purchase', $3)`,
        [purchase.warehouseId, purchase.units, res.rows[0].id]
      );
    }

    await client.query('COMMIT');
    return { success: true, data: mapICPurchaseRow(res.rows[0]) };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  } finally {
    client.release();
  }
}

export async function dbAddICSaleAction(
  sale: Omit<ICSale, 'id' | 'createdAt' | 'enteredBy' | 'enteredByName' | 'enteredByUserId'>
): Promise<DbActionResult<ICSale>> {
  const { enteredBy, enteredByName, enteredByUserId } = await resolveEnteredBy();
  try {
    const res = await query(
      `INSERT INTO ic_sales (customer_name, location_id, units, unit_rate, address, payment_mode, inr_amount, aed_amount, entered_by, entered_by_name, entered_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        sale.customerName,
        sale.locationId || null,
        sale.units,
        sale.unitRate,
        sale.address || null,
        sale.paymentMode || null,
        sale.inrAmount || null,
        sale.aedAmount || null,
        enteredBy,
        enteredByName,
        enteredByUserId
      ]
    );
    return { success: true, data: mapICSaleRow(res.rows[0]) };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}
export async function dbUpdateICPurchaseAction(
  id: string,
  updates: Partial<Omit<ICPurchase, 'id' | 'createdAt'>>
): Promise<DbActionResult<ICPurchase>> {
  const client = await pool.connect();
  try {
    const keys = Object.keys(updates);
    if (keys.length === 0) return { success: false, error: 'No fields to update' };

    const setClauses = [];
    const values = [];
    let idx = 1;
    for (const key of keys) {
      const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      setClauses.push(`${dbKey} = $${idx}`);
      values.push((updates as any)[key]);
      idx++;
    }
    values.push(id);

    const res = await client.query(
      `UPDATE ic_purchases SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (res.rows.length === 0) return { success: false, error: 'Purchase not found' };
    return { success: true, data: mapICPurchaseRow(res.rows[0]) };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  } finally {
    client.release();
  }
}

export async function dbUpdateICSaleAction(
  id: string,
  updates: Partial<Omit<ICSale, 'id' | 'createdAt'>>
): Promise<DbActionResult<ICSale>> {
  const client = await pool.connect();
  try {
    const keys = Object.keys(updates);
    if (keys.length === 0) return { success: false, error: 'No fields to update' };

    const setClauses = [];
    const values = [];
    let idx = 1;
    for (const key of keys) {
      const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      setClauses.push(`${dbKey} = $${idx}`);
      values.push((updates as any)[key]);
      idx++;
    }
    values.push(id);

    const res = await client.query(
      `UPDATE ic_sales SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (res.rows.length === 0) return { success: false, error: 'Sale not found' };
    return { success: true, data: mapICSaleRow(res.rows[0]) };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  } finally {
    client.release();
  }
}
