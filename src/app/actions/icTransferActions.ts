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
import { hasICSaleContentChanged, type ICSaleContentFields } from '@/lib/icTransfer/saleChanges';
import { normalizeOrderStatus } from '@/lib/icTransfer/orderStatus';
import { isBranchPortalRole } from '@/lib/rbac';

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
  const initialOrderStatus = sale.warehouseId ? 'accepted' : 'pending';
  try {
    const res = await query(
      `INSERT INTO ic_sales (
        customer_name, warehouse_id, transaction_type, units, unit_rate, converted_amount, aed_amount,
        entered_by, entered_by_name, entered_by_user_id, address, image_url, service_charge, order_status, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
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
        sale.serviceCharge || 0.00,
        initialOrderStatus,
        sale.priority || 'Normal',
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
      let val = (updates as any)[key];
      if (key.endsWith('Id') && val === '') {
        val = null;
      }
      values.push(val);
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
      let val = (updates as any)[key];
      if (key.endsWith('Id') && val === '') {
        val = null;
      }
      values.push(val);
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

async function fetchICSaleById(id: string): Promise<ICSale | null> {
  const res = await query(
    `SELECT s.*, a.name AS delivery_agent_name
     FROM ic_sales s
     LEFT JOIN ic_delivery_agents a ON s.delivery_agent_id = a.id
     WHERE s.id = $1`,
    [id],
  );
  if (res.rows.length === 0) return null;
  return mapICSaleRow(res.rows[0]);
}

async function assertBranchOwnsSale(
  saleId: string,
  branchSlug?: string,
): Promise<{ sale: ICSale; updatedBy: string } | { error: string }> {
  const slug = branchSlug && branchSlug !== 'superadmin' ? branchSlug : undefined;
  const userRes = slug ? await getCurrentUserAction(slug) : await getCurrentUserAction();
  const user = userRes.success ? userRes.data : null;

  if (!user || !isBranchPortalRole(user.role)) {
    return { error: 'Only branch users can perform this action' };
  }

  let branchName: string;
  if (slug) {
    const branchRes = await query(
      `SELECT id, name FROM branches WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    if (branchRes.rows.length === 0) {
      return { error: 'Branch not found' };
    }
    if (user.branchId && branchRes.rows[0].id !== user.branchId) {
      return { error: 'You are not authorized for this branch' };
    }
    branchName = String(branchRes.rows[0].name || '');
  } else if (user.branchId) {
    const branchRes = await query(`SELECT name FROM branches WHERE id = $1 LIMIT 1`, [user.branchId]);
    if (branchRes.rows.length === 0) {
      return { error: 'Branch not found' };
    }
    branchName = String(branchRes.rows[0].name || '');
  } else {
    return { error: 'Only branch users can perform this action' };
  }

  const sale = await fetchICSaleById(saleId);
  if (!sale) {
    return { error: 'Order not found' };
  }

  if (sale.customerName.toLowerCase() !== branchName.toLowerCase()) {
    return { error: 'You can only modify orders submitted by your branch' };
  }

  return { sale, updatedBy: user.email || user.name || 'branch' };
}

/** Admin accepts a pending order and assigns a warehouse. */
export async function adminAcceptICSaleAction(
  id: string,
  warehouseId: string,
): Promise<DbActionResult<ICSale>> {
  const { enteredBy } = await resolveEnteredBy();
  try {
    const res = await query(
      `UPDATE ic_sales
       SET warehouse_id = $1,
           order_status = 'accepted',
           rejection_remarks = NULL,
           delivery_agent_id = NULL,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $2
       WHERE id = $3 AND order_status = 'pending'
       RETURNING id`,
      [warehouseId, enteredBy, id],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order not found or not in pending status' };
    }
    const sale = await fetchICSaleById(id);
    return sale ? { success: true, data: sale } : { success: false, error: 'Order not found' };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

/** Admin rejects an order with remarks. */
export async function adminRejectICSaleAction(
  id: string,
  remarks: string,
): Promise<DbActionResult<ICSale>> {
  const { enteredBy } = await resolveEnteredBy();
  if (!remarks.trim()) {
    return { success: false, error: 'Rejection reason is required' };
  }
  try {
    const res = await query(
      `UPDATE ic_sales
       SET order_status = 'admin_rejected',
           rejection_remarks = $1,
           warehouse_id = NULL,
           delivery_agent_id = NULL,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $2
       WHERE id = $3
         AND order_status IN ('pending', 'wh_rejected', 'da_rejected')
       RETURNING id`,
      [remarks.trim(), enteredBy, id],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order cannot be rejected in its current status' };
    }
    const sale = await fetchICSaleById(id);
    return sale ? { success: true, data: sale } : { success: false, error: 'Order not found' };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

/** Admin reassigns warehouse after WH or delivery agent rejection. */
export async function adminReassignICSaleWarehouseAction(
  id: string,
  warehouseId: string,
): Promise<DbActionResult<ICSale>> {
  const { enteredBy } = await resolveEnteredBy();
  try {
    const res = await query(
      `UPDATE ic_sales
       SET warehouse_id = $1,
           order_status = 'accepted',
           rejection_remarks = NULL,
           delivery_agent_id = NULL,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $2
       WHERE id = $3
         AND order_status IN ('wh_rejected', 'da_rejected')
       RETURNING id`,
      [warehouseId, enteredBy, id],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order cannot be reassigned in its current status' };
    }
    const sale = await fetchICSaleById(id);
    return sale ? { success: true, data: sale } : { success: false, error: 'Order not found' };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

/** Branch updates a rejected order and resubmits it to admin review. */
export async function branchResubmitICSaleAction(
  id: string,
  updates: ICSaleContentFields,
  branchSlug?: string,
): Promise<DbActionResult<ICSale>> {
  const auth = await assertBranchOwnsSale(id, branchSlug);
  if ('error' in auth) {
    return { success: false, error: auth.error };
  }

  const { sale, updatedBy } = auth;
  if (normalizeOrderStatus(sale.orderStatus) !== 'admin_rejected') {
    return { success: false, error: 'Only admin-rejected orders can be resubmitted' };
  }

  if (!hasICSaleContentChanged(sale, updates)) {
    return { success: false, error: 'Update at least one field before resubmitting the order' };
  }

  try {
    const res = await query(
      `UPDATE ic_sales
       SET transaction_type = $1,
           units = $2,
           converted_amount = $3,
           aed_amount = $4,
           address = $5,
           image_url = $6,
           service_charge = $7,
           order_status = 'pending',
           rejection_remarks = NULL,
           warehouse_id = NULL,
           delivery_agent_id = NULL,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $8
       WHERE id = $9 AND order_status = 'admin_rejected'
       RETURNING id`,
      [
        updates.transactionType || null,
        updates.units,
        updates.convertedAmount ?? null,
        updates.aedAmount ?? null,
        updates.address || null,
        updates.imageUrl || null,
        updates.serviceCharge ?? 0,
        updatedBy,
        id,
      ],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order not found or no longer rejected' };
    }
    const updated = await fetchICSaleById(id);
    return updated ? { success: true, data: updated } : { success: false, error: 'Order not found' };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}
