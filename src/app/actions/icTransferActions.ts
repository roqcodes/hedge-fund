'use server';

import { query, pool } from '@/lib/db';
import { DbActionResult } from './dbActions';
import { getCurrentUserAction } from './auth';
import {
  ICRegion,
  ICSupplier,
  ICWarehouse,
  ICPurchase,
  ICSale,
  ICWarehouseTransaction,
} from '@/types';
import {
  mapICRegionRow,
  mapICSupplierRow,
  mapICWarehouseRow,
  mapICRateGroupRow,
  mapICPurchaseRow,
  mapICSaleRow,
} from '@/lib/icTransferMappers';

async function resolveEnteredBy() {
  const userRes = await getCurrentUserAction();
  const user = userRes.success ? userRes.data : null;
  return {
    enteredBy: user?.email || 'system',
    enteredByName: user?.name || 'System',
    enteredByUserId: user?.id || 'system_id'
  };
}

export async function dbAddICRegionAction(name: string, country: string): Promise<DbActionResult<ICRegion>> {
  try {
    const id = `reg-${crypto.randomUUID().slice(0, 8)}`;
    const res = await query(`INSERT INTO ic_regions (id, name, country) VALUES ($1, $2, $3) RETURNING *`, [id, name, country]);
    return { success: true, data: mapICRegionRow(res.rows[0]) };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbUpdateICRegionAction(id: string, name: string, country: string): Promise<DbActionResult<ICRegion>> {
  try {
    const res = await query(`UPDATE ic_regions SET name=$1, country=$2 WHERE id=$3 RETURNING *`, [name, country, id]);
    if (res.rowCount === 0) return { success: false, error: 'Region not found' };
    return { success: true, data: mapICRegionRow(res.rows[0]) };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbDeleteICRegionAction(id: string): Promise<DbActionResult<void>> {
  try {
    const res = await query(`DELETE FROM ic_regions WHERE id=$1`, [id]);
    if (res.rowCount === 0) return { success: false, error: 'Region not found' };
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbAddICSupplierAction(
  name: string, phone?: string, commission?: number | null, regionId?: string, email?: string, address?: string
): Promise<DbActionResult<ICSupplier>> {
  try {
    const id = `sup-${crypto.randomUUID().slice(0, 8)}`;
    const res = await query(
      `INSERT INTO ic_suppliers (id, name, phone, commission, region_id, email, address) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, name, phone || null, commission || 0, regionId || null, email || null, address || null]
    );
    return { success: true, data: mapICSupplierRow(res.rows[0]) };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbUpdateICSupplierAction(
  id: string, name: string, phone?: string, commission?: number | null, regionId?: string, email?: string, address?: string
): Promise<DbActionResult<ICSupplier>> {
  try {
    const res = await query(
      `UPDATE ic_suppliers SET name=$1, phone=$2, commission=$3, region_id=$4, email=$5, address=$6 WHERE id=$7 RETURNING *`,
      [name, phone || null, commission || 0, regionId || null, email || null, address || null, id]
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
  name: string, phone?: string, commission?: number | null, regionId?: string, email?: string, address?: string
): Promise<DbActionResult<ICWarehouse>> {
  try {
    const id = `wh-${crypto.randomUUID().slice(0, 8)}`;
    const res = await query(
      `INSERT INTO ic_warehouses (id, name, phone, commission, region_id, email, address) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, name, phone || null, commission || 0, regionId || null, email || null, address || null]
    );
    return { success: true, data: mapICWarehouseRow(res.rows[0]) };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbUpdateICWarehouseAction(
  id: string, name: string, phone?: string, commission?: number | null, regionId?: string, email?: string, address?: string
): Promise<DbActionResult<ICWarehouse>> {
  try {
    const res = await query(
      `UPDATE ic_warehouses SET name=$1, phone=$2, commission=$3, region_id=$4, email=$5, address=$6 WHERE id=$7 RETURNING *`,
      [name, phone || null, commission || 0, regionId || null, email || null, address || null, id]
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

export async function dbAddICRateGroupAction(
  name: string, country: string, region: string, currency: string, saleRate: number, conversionRate: number
): Promise<DbActionResult<import('@/types').ICRateGroup>> {
  try {
    const id = `irgp-${crypto.randomUUID().slice(0, 8)}`;
    const res = await query(
      `INSERT INTO ic_rate_groups (id, name, country, region, currency, sale_rate, conversion_rate) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, name, country, region, currency, saleRate, conversionRate]
    );
    return { success: true, data: mapICRateGroupRow(res.rows[0]) };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbUpdateICRateGroupAction(
  id: string, name: string, country: string, region: string, currency: string, saleRate: number, conversionRate: number
): Promise<DbActionResult<import('@/types').ICRateGroup>> {
  try {
    const res = await query(
      `UPDATE ic_rate_groups SET name=$1, country=$2, region=$3, currency=$4, sale_rate=$5, conversion_rate=$6, updated_at=CURRENT_TIMESTAMP WHERE id=$7 RETURNING *`,
      [name, country, region, currency, saleRate, conversionRate, id]
    );
    if (res.rowCount === 0) return { success: false, error: 'Group not found' };
    return { success: true, data: mapICRateGroupRow(res.rows[0]) };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbDeleteICRateGroupAction(id: string): Promise<DbActionResult<void>> {
  try {
    const res = await query(`DELETE FROM ic_rate_groups WHERE id=$1`, [id]);
    if (res.rowCount === 0) return { success: false, error: 'Group not found' };
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbSetICRateGroupCustomersAction(groupId: string, customerIds: string[]): Promise<DbActionResult<void>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if any customer is already assigned to a different rate group
    if (customerIds.length > 0) {
      const checkRes = await client.query(
        `SELECT c.customer_id, g.name as group_name 
         FROM ic_rate_group_customers c 
         JOIN ic_rate_groups g ON c.group_id = g.id
         WHERE c.customer_id = ANY($1) AND c.group_id != $2`,
        [customerIds, groupId]
      );
      if (checkRes.rows.length > 0) {
        const dup = checkRes.rows[0];
        throw new Error(`Customer is already assigned to another rate group: ${dup.group_name}`);
      }
    }

    await client.query('DELETE FROM ic_rate_group_customers WHERE group_id = $1', [groupId]);
    for (const cid of customerIds) {
      await client.query('INSERT INTO ic_rate_group_customers (group_id, customer_id) VALUES ($1, $2)', [groupId, cid]);
    }
    await client.query('COMMIT');
    return { success: true };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  } finally {
    client.release();
  }
}

export async function dbSetICRateGroupBranchesAction(groupId: string, branchIds: string[]): Promise<DbActionResult<void>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if any branch is already assigned to a different rate group
    if (branchIds.length > 0) {
      const checkRes = await client.query(
        `SELECT b.branch_id, g.name as group_name 
         FROM ic_rate_group_branches b 
         JOIN ic_rate_groups g ON b.group_id = g.id
         WHERE b.branch_id = ANY($1) AND b.group_id != $2`,
        [branchIds, groupId]
      );
      if (checkRes.rows.length > 0) {
        const dup = checkRes.rows[0];
        throw new Error(`Branch is already assigned to another rate group: ${dup.group_name}`);
      }
    }

    await client.query('DELETE FROM ic_rate_group_branches WHERE group_id = $1', [groupId]);
    for (const bid of branchIds) {
      await client.query('INSERT INTO ic_rate_group_branches (group_id, branch_id) VALUES ($1, $2)', [groupId, bid]);
    }
    await client.query('COMMIT');
    return { success: true };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  } finally {
    client.release();
  }
}

export async function dbAddICPurchaseAction(
  purchase: Omit<ICPurchase, 'id' | 'createdAt'>
): Promise<DbActionResult<ICPurchase>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `INSERT INTO ic_purchases (supplier_id, location_id, warehouse_id, unit_rate, units, payment_method, notes, converted_total, aed_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        purchase.supplierId || null,
        purchase.locationId || null,
        purchase.warehouseId || null,
        purchase.unitRate,
        purchase.units,
        purchase.paymentMethod || null,
        purchase.notes || null,
        purchase.convertedTotal || null,
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
      `INSERT INTO ic_sales (customer_name, warehouse_id, transaction_type, units, unit_rate, converted_amount, aed_amount, entered_by, entered_by_name, entered_by_user_id, address, image_url, service_charge)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        sale.customerName,
        sale.warehouseId || null,
        sale.transactionType || null,
        sale.units,
        sale.unitRate,
        sale.convertedAmount || null,
        sale.aedAmount || null,
        enteredBy,
        enteredByName,
        enteredByUserId,
        sale.address || null,
        sale.imageUrl || null,
        sale.serviceCharge || 0.00
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

export async function dbDeleteICPurchaseAction(id: string): Promise<DbActionResult<null>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Remove related warehouse transactions
    await client.query(
      `DELETE FROM ic_warehouse_transactions WHERE reference_type = 'purchase' AND reference_id = $1`,
      [id]
    );

    const res = await client.query('DELETE FROM ic_purchases WHERE id = $1 RETURNING id', [id]);
    if (res.rowCount === 0) throw new Error('Purchase not found');

    await client.query('COMMIT');
    return { success: true, data: null };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  } finally {
    client.release();
  }
}

export async function dbDeleteICSaleAction(id: string): Promise<DbActionResult<null>> {
  try {
    const res = await query('DELETE FROM ic_sales WHERE id = $1 RETURNING id', [id]);
    if (res.rowCount === 0) return { success: false, error: 'Sale not found' };
    return { success: true, data: null };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}
