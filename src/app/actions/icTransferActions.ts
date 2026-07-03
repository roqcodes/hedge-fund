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
import { adjustWarehouseStock, logWarehouseStockTransaction } from '@/lib/warehouse/stockDb';
import {
  hasICSaleEditableFieldsChanged,
  type ICSaleContentFields,
} from '@/lib/icTransfer/saleChanges';
import { normalizeOrderStatus } from '@/lib/icTransfer/orderStatus';
import { isBranchPortalRole } from '@/lib/rbac';
import { logger } from '@/lib/logger';
import {
  addRegionSchema,
  updateRegionSchema,
  addSupplierSchema,
  updateSupplierSchema,
  addWarehouseSchema,
  updateWarehouseSchema,
  addRateGroupSchema,
  updateRateGroupSchema,
  bulkUpdateRateGroupRatesSchema,
  setRateGroupCustomersSchema,
  setRateGroupBranchesSchema,
  addPurchaseSchema,
  updatePurchaseSchema,
  addSaleSchema,
  updateSaleSchema,
} from '@/lib/validations/icTransfer';
import { z } from 'zod';

// ── Column whitelists to prevent SQL injection in dynamic updates ────
const PURCHASE_COLUMNS: Record<string, string> = {
  supplierId: 'supplier_id',
  locationId: 'location_id',
  warehouseId: 'warehouse_id',
  unitRate: 'unit_rate',
  units: 'units',
  paymentMethod: 'payment_method',
  notes: 'notes',
  convertedTotal: 'converted_total',
  aedTotal: 'aed_total',
};

const SALE_COLUMNS: Record<string, string> = {
  customerName: 'customer_name',
  orderCustomerName: 'order_customer_name',
  orderCustomerId: 'order_customer_id',
  warehouseId: 'warehouse_id',
  transactionType: 'transaction_type',
  units: 'units',
  unitRate: 'unit_rate',
  convertedAmount: 'converted_amount',
  aedAmount: 'aed_amount',
  bank: 'bank',
  address: 'address',
  imageUrl: 'image_url',
  conversionRate: 'conversion_rate',
  currency: 'currency',
  serviceCharge: 'service_charge',
  collectedUnits: 'collected_units',
  priority: 'priority',
  paymentStatus: 'payment_status',
  orderStatus: 'order_status',
  rejectionRemarks: 'rejection_remarks',
  deliveryAgentId: 'delivery_agent_id',
  deliveryImageUrl: 'delivery_image_url',
};

async function resolveEnteredBy() {
  const userRes = await getCurrentUserAction();
  const user = userRes.success ? userRes.data : null;
  return {
    enteredBy: user?.email || 'system',
    enteredByName: user?.name || 'System',
    enteredByUserId: user?.id || 'system_id'
  };
}

/** Assert the current user is an admin. Returns error result on failure. */
async function assertAdminRole(): Promise<{ error: string } | { enteredBy: string }> {
  const userRes = await getCurrentUserAction();
  const user = userRes.success ? userRes.data : null;
  if (!user || user.role !== 'admin') {
    return { error: 'Unauthorized: admin role required' };
  }
  return { enteredBy: user.email || 'system' };
}

export async function dbAddICRegionAction(name: string, country: string): Promise<DbActionResult<ICRegion>> {
  try {
    const parsed = addRegionSchema.parse({ name, country });
    const id = `reg-${crypto.randomUUID().slice(0, 8)}`;
    const res = await query(`INSERT INTO ic_regions (id, name, country) VALUES ($1, $2, $3) RETURNING *`, [id, parsed.name, parsed.country]);
    return { success: true, data: mapICRegionRow(res.rows[0]) };
  } catch (error: unknown) {
    logger.error({ error, name, country }, 'Error in dbAddICRegionAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbUpdateICRegionAction(id: string, name: string, country: string): Promise<DbActionResult<ICRegion>> {
  try {
    const parsed = updateRegionSchema.parse({ id, name, country });
    const res = await query(`UPDATE ic_regions SET name=$1, country=$2 WHERE id=$3 RETURNING *`, [parsed.name, parsed.country, parsed.id]);
    if (res.rowCount === 0) return { success: false, error: 'Region not found' };
    return { success: true, data: mapICRegionRow(res.rows[0]) };
  } catch (error: unknown) {
    logger.error({ error, id, name, country }, 'Error in dbUpdateICRegionAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbDeleteICRegionAction(id: string): Promise<DbActionResult<void>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const res = await query(`DELETE FROM ic_regions WHERE id=$1`, [parsedId]);
    if (res.rowCount === 0) return { success: false, error: 'Region not found' };
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, id }, 'Error in dbDeleteICRegionAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbAddICSupplierAction(
  name: string, phone?: string, commission?: number | null, regionId?: string, email?: string, address?: string
): Promise<DbActionResult<ICSupplier>> {
  try {
    const parsed = addSupplierSchema.parse({ name, phone, commission, regionId, email, address });
    const id = `sup-${crypto.randomUUID().slice(0, 8)}`;
    const res = await query(
      `INSERT INTO ic_suppliers (id, name, phone, commission, region_id, email, address) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, parsed.name, parsed.phone || null, parsed.commission || 0, parsed.regionId || null, parsed.email || null, parsed.address || null]
    );
    return { success: true, data: mapICSupplierRow(res.rows[0]) };
  } catch (error: unknown) {
    logger.error({ error, name, email }, 'Error in dbAddICSupplierAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbUpdateICSupplierAction(
  id: string, name: string, phone?: string, commission?: number | null, regionId?: string, email?: string, address?: string
): Promise<DbActionResult<ICSupplier>> {
  try {
    const parsed = updateSupplierSchema.parse({ id, name, phone, commission, regionId, email, address });
    const res = await query(
      `UPDATE ic_suppliers SET name=$1, phone=$2, commission=$3, region_id=$4, email=$5, address=$6 WHERE id=$7 RETURNING *`,
      [parsed.name, parsed.phone || null, parsed.commission || 0, parsed.regionId || null, parsed.email || null, parsed.address || null, parsed.id]
    );
    if (res.rowCount === 0) return { success: false, error: 'Supplier not found' };
    return { success: true, data: mapICSupplierRow(res.rows[0]) };
  } catch (error: unknown) {
    logger.error({ error, id, name }, 'Error in dbUpdateICSupplierAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbDeleteICSupplierAction(id: string): Promise<DbActionResult<void>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const res = await query(`DELETE FROM ic_suppliers WHERE id=$1`, [parsedId]);
    if (res.rowCount === 0) return { success: false, error: 'Supplier not found' };
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, id }, 'Error in dbDeleteICSupplierAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbAddICWarehouseAction(
  name: string, phone?: string, commission?: number | null, regionId?: string, email?: string, address?: string
): Promise<DbActionResult<ICWarehouse>> {
  try {
    const parsed = addWarehouseSchema.parse({ name, phone, commission, regionId, email, address });
    const id = `wh-${crypto.randomUUID().slice(0, 8)}`;
    const res = await query(
      `INSERT INTO ic_warehouses (id, name, phone, commission, region_id, email, address) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, parsed.name, parsed.phone || null, parsed.commission || 0, parsed.regionId || null, parsed.email || null, parsed.address || null]
    );
    return { success: true, data: mapICWarehouseRow(res.rows[0]) };
  } catch (error: unknown) {
    logger.error({ error, name, email }, 'Error in dbAddICWarehouseAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbUpdateICWarehouseAction(
  id: string, name: string, phone?: string, commission?: number | null, regionId?: string, email?: string, address?: string
): Promise<DbActionResult<ICWarehouse>> {
  try {
    const parsed = updateWarehouseSchema.parse({ id, name, phone, commission, regionId, email, address });
    const res = await query(
      `UPDATE ic_warehouses SET name=$1, phone=$2, commission=$3, region_id=$4, email=$5, address=$6 WHERE id=$7 RETURNING *`,
      [parsed.name, parsed.phone || null, parsed.commission || 0, parsed.regionId || null, parsed.email || null, parsed.address || null, parsed.id]
    );
    if (res.rowCount === 0) return { success: false, error: 'Warehouse not found' };
    return { success: true, data: mapICWarehouseRow(res.rows[0]) };
  } catch (error: unknown) {
    logger.error({ error, id, name }, 'Error in dbUpdateICWarehouseAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbDeleteICWarehouseAction(id: string): Promise<DbActionResult<void>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const res = await query(`DELETE FROM ic_warehouses WHERE id=$1`, [parsedId]);
    if (res.rowCount === 0) return { success: false, error: 'Warehouse not found' };
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, id }, 'Error in dbDeleteICWarehouseAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbAddICRateGroupAction(
  name: string, country: string, region: string, currency: string, saleRate: number, conversionRate: number
): Promise<DbActionResult<import('@/types').ICRateGroup>> {
  try {
    const parsed = addRateGroupSchema.parse({ name, country, region, currency, saleRate, conversionRate });
    const id = `irgp-${crypto.randomUUID().slice(0, 8)}`;
    const res = await query(
      `INSERT INTO ic_rate_groups (id, name, country, region, currency, sale_rate, conversion_rate) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, parsed.name, parsed.country, parsed.region, parsed.currency, parsed.saleRate, parsed.conversionRate]
    );
    return { success: true, data: mapICRateGroupRow(res.rows[0]) };
  } catch (error: unknown) {
    logger.error({ error, name, country }, 'Error in dbAddICRateGroupAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbUpdateICRateGroupAction(
  id: string, name: string, country: string, region: string, currency: string, saleRate: number, conversionRate: number
): Promise<DbActionResult<import('@/types').ICRateGroup>> {
  try {
    const parsed = updateRateGroupSchema.parse({ id, name, country, region, currency, saleRate, conversionRate });
    const res = await query(
      `UPDATE ic_rate_groups SET name=$1, country=$2, region=$3, currency=$4, sale_rate=$5, conversion_rate=$6, updated_at=CURRENT_TIMESTAMP WHERE id=$7 RETURNING *`,
      [parsed.name, parsed.country, parsed.region, parsed.currency, parsed.saleRate, parsed.conversionRate, parsed.id]
    );
    if (res.rowCount === 0) return { success: false, error: 'Group not found' };
    return { success: true, data: mapICRateGroupRow(res.rows[0]) };
  } catch (error: unknown) {
    logger.error({ error, id, name }, 'Error in dbUpdateICRateGroupAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbBulkUpdateICRateGroupRatesAction(
  groupIds: string[],
  saleRate: number,
  conversionRate: number,
): Promise<DbActionResult<import('@/types').ICRateGroup[]>> {
  try {
    const parsed = bulkUpdateRateGroupRatesSchema.parse({ groupIds, saleRate, conversionRate });
    const res = await query(
      `UPDATE ic_rate_groups
       SET sale_rate = $1, conversion_rate = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($3::text[])
       RETURNING *`,
      [parsed.saleRate, parsed.conversionRate, parsed.groupIds],
    );
    if (res.rowCount === 0) return { success: false, error: 'No groups were updated' };
    return { success: true, data: res.rows.map(mapICRateGroupRow) };
  } catch (error: unknown) {
    logger.error({ error, groupIds }, 'Error in dbBulkUpdateICRateGroupRatesAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbDeleteICRateGroupAction(id: string): Promise<DbActionResult<void>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const res = await query(`DELETE FROM ic_rate_groups WHERE id=$1`, [parsedId]);
    if (res.rowCount === 0) return { success: false, error: 'Group not found' };
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, id }, 'Error in dbDeleteICRateGroupAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbSetICRateGroupCustomersAction(groupId: string, customerIds: string[]): Promise<DbActionResult<void>> {
  try {
    const parsed = setRateGroupCustomersSchema.parse({ groupId, customerIds });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if any customer is already assigned to a different rate group
      if (parsed.customerIds.length > 0) {
        const checkRes = await client.query(
          `SELECT c.customer_id, g.name as group_name 
           FROM ic_rate_group_customers c 
           JOIN ic_rate_groups g ON c.group_id = g.id
           WHERE c.customer_id = ANY($1) AND c.group_id != $2`,
          [parsed.customerIds, parsed.groupId]
        );
        if (checkRes.rows.length > 0) {
          const dup = checkRes.rows[0];
          throw new Error(`Customer is already assigned to another rate group: ${dup.group_name}`);
        }
      }

      await client.query('DELETE FROM ic_rate_group_customers WHERE group_id = $1', [parsed.groupId]);
      if (parsed.customerIds.length > 0) {
        await client.query(
          `INSERT INTO ic_rate_group_customers (group_id, customer_id)
           SELECT $1::uuid, unnest($2::text[])`,
          [parsed.groupId, parsed.customerIds]
        );
      }
      await client.query('COMMIT');
      return { success: true };
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      logger.error({ error, groupId, customerIds }, 'Error in dbSetICRateGroupCustomersAction');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    logger.error({ err, groupId, customerIds }, 'Validation error in dbSetICRateGroupCustomersAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

export async function dbSetICRateGroupBranchesAction(groupId: string, branchIds: string[]): Promise<DbActionResult<void>> {
  try {
    const parsed = setRateGroupBranchesSchema.parse({ groupId, branchIds });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if any branch is already assigned to a different rate group
      if (parsed.branchIds.length > 0) {
        const checkRes = await client.query(
          `SELECT b.branch_id, g.name as group_name 
           FROM ic_rate_group_branches b 
           JOIN ic_rate_groups g ON b.group_id = g.id
           WHERE b.branch_id = ANY($1) AND b.group_id != $2`,
          [parsed.branchIds, parsed.groupId]
        );
        if (checkRes.rows.length > 0) {
          const dup = checkRes.rows[0];
          throw new Error(`Branch is already assigned to another rate group: ${dup.group_name}`);
        }
      }

      await client.query('DELETE FROM ic_rate_group_branches WHERE group_id = $1', [parsed.groupId]);
      if (parsed.branchIds.length > 0) {
        await client.query(
          `INSERT INTO ic_rate_group_branches (group_id, branch_id)
           SELECT $1::uuid, unnest($2::text[])`,
          [parsed.groupId, parsed.branchIds]
        );
      }
      await client.query('COMMIT');
      return { success: true };
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      logger.error({ error, groupId, branchIds }, 'Error in dbSetICRateGroupBranchesAction');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    logger.error({ err, groupId, branchIds }, 'Validation error in dbSetICRateGroupBranchesAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

export async function dbAddICPurchaseAction(
  purchase: Omit<ICPurchase, 'id' | 'createdAt'>
): Promise<DbActionResult<ICPurchase>> {
  try {
    const parsed = addPurchaseSchema.parse(purchase);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO ic_purchases (supplier_id, location_id, warehouse_id, unit_rate, units, payment_method, notes, converted_total, aed_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          parsed.supplierId || null,
          parsed.locationId || null,
          parsed.warehouseId || null,
          parsed.unitRate,
          parsed.units,
          parsed.paymentMethod || null,
          parsed.notes || null,
          parsed.convertedTotal || null,
          parsed.aedTotal || null
        ]
      );

      // Log receive transaction and increment warehouse stock
      if (parsed.warehouseId) {
        await logWarehouseStockTransaction(
          client,
          parsed.warehouseId,
          'receive',
          parsed.units,
          'purchase',
          res.rows[0].id,
        );
        await adjustWarehouseStock(client, parsed.warehouseId, parsed.units);
      }

      await client.query('COMMIT');
      return { success: true, data: mapICPurchaseRow(res.rows[0]) };
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      logger.error({ error, purchase }, 'Error in dbAddICPurchaseAction');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    logger.error({ err, purchase }, 'Validation error in dbAddICPurchaseAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

export async function dbAddICSaleAction(
  sale: Omit<ICSale, 'id' | 'createdAt' | 'enteredBy' | 'enteredByName' | 'enteredByUserId'>
): Promise<DbActionResult<ICSale>> {
  try {
    const parsed = addSaleSchema.parse(sale);
    const { enteredBy, enteredByName, enteredByUserId } = await resolveEnteredBy();
    const initialOrderStatus = parsed.warehouseId ? 'accepted' : 'pending';
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO ic_sales (
          customer_name, order_customer_name, order_customer_id, warehouse_id, transaction_type, units, unit_rate, converted_amount, aed_amount,
          entered_by, entered_by_name, entered_by_user_id, address, image_url, service_charge, order_status, priority, bank, conversion_rate, currency
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *`,
        [
          parsed.customerName,
          parsed.orderCustomerName || null,
          parsed.orderCustomerId || null,
          parsed.warehouseId || null,
          parsed.transactionType || null,
          parsed.units,
          parsed.unitRate,
          parsed.convertedAmount || null,
          parsed.aedAmount || null,
          enteredBy,
          enteredByName,
          enteredByUserId,
          parsed.address || null,
          parsed.imageUrl || null,
          parsed.serviceCharge || 0.00,
          initialOrderStatus,
          parsed.priority || 'Normal',
          parsed.bank || null,
          parsed.conversionRate ?? 1.0,
          parsed.currency || 'AED',
        ]
      );
      await client.query('COMMIT');
      return { success: true, data: mapICSaleRow(res.rows[0]) };
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      logger.error({ error, sale }, 'Error in dbAddICSaleAction');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    logger.error({ err, sale }, 'Validation error in dbAddICSaleAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

export async function dbUpdateICPurchaseAction(
  id: string,
  updates: Partial<Omit<ICPurchase, 'id' | 'createdAt'>>
): Promise<DbActionResult<ICPurchase>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const parsedUpdates = updatePurchaseSchema.parse(updates);
    const client = await pool.connect();
    try {
      const keys = Object.keys(parsedUpdates);
      if (keys.length === 0) return { success: false, error: 'No fields to update' };

      const setClauses: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      for (const key of keys) {
        const dbKey = PURCHASE_COLUMNS[key];
        if (!dbKey) continue; // Skip unknown keys — prevents SQL injection
        setClauses.push(`${dbKey} = $${idx}`);
        let val = (parsedUpdates as Record<string, unknown>)[key];
        if (key.endsWith('Id') && val === '') val = null;
        values.push(val);
        idx++;
      }
      if (setClauses.length === 0) return { success: false, error: 'No valid fields to update' };
      values.push(parsedId);

      const res = await client.query(
        `UPDATE ic_purchases SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );
      if (res.rows.length === 0) return { success: false, error: 'Purchase not found' };
      return { success: true, data: mapICPurchaseRow(res.rows[0]) };
    } catch (error: unknown) {
      logger.error({ error, id, updates }, 'Error in dbUpdateICPurchaseAction');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    logger.error({ err, id, updates }, 'Validation error in dbUpdateICPurchaseAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

export async function dbUpdateICSaleAction(
  id: string,
  updates: Partial<Omit<ICSale, 'id' | 'createdAt'>>
): Promise<DbActionResult<ICSale>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const parsedUpdates = updateSaleSchema.parse(updates);
    const client = await pool.connect();
    try {
      const keys = Object.keys(parsedUpdates);
      if (keys.length === 0) return { success: false, error: 'No fields to update' };

      const setClauses: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      for (const key of keys) {
        const dbKey = SALE_COLUMNS[key];
        if (!dbKey) continue; // Skip unknown keys — prevents SQL injection
        setClauses.push(`${dbKey} = $${idx}`);
        let val = (parsedUpdates as Record<string, unknown>)[key];
        if (key.endsWith('Id') && val === '') val = null;
        values.push(val);
        idx++;
      }
      if (setClauses.length === 0) return { success: false, error: 'No valid fields to update' };
      values.push(parsedId);

      const res = await client.query(
        `UPDATE ic_sales SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );
      if (res.rows.length === 0) return { success: false, error: 'Sale not found' };
      return { success: true, data: mapICSaleRow(res.rows[0]) };
    } catch (error: unknown) {
      logger.error({ error, id, updates }, 'Error in dbUpdateICSaleAction');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    logger.error({ err, id, updates }, 'Validation error in dbUpdateICSaleAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

export async function dbDeleteICPurchaseAction(id: string): Promise<DbActionResult<null>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Fetch purchase to determine warehouse + units for stock reversal
      const purchaseRes = await client.query(
        `SELECT warehouse_id, units FROM ic_purchases WHERE id = $1`,
        [parsedId]
      );
      if (purchaseRes.rows.length === 0) throw new Error('Purchase not found');
      const { warehouse_id, units } = purchaseRes.rows[0];

      // Remove related warehouse transactions
      await client.query(
        `DELETE FROM ic_warehouse_transactions WHERE reference_type = 'purchase' AND reference_id = $1`,
        [parsedId]
      );

      // Reverse warehouse stock that was added when this purchase was created
      if (warehouse_id && units) {
        await adjustWarehouseStock(client, warehouse_id, -Number(units));
      }

      await client.query('DELETE FROM ic_purchases WHERE id = $1', [parsedId]);

      await client.query('COMMIT');
      return { success: true, data: null };
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      logger.error({ error, id }, 'Error in dbDeleteICPurchaseAction');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    logger.error({ err, id }, 'Validation error in dbDeleteICPurchaseAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

export async function dbDeleteICSaleAction(id: string): Promise<DbActionResult<null>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Block deletion of completed orders to protect financial records
      const saleRes = await client.query(
        `SELECT order_status FROM ic_sales WHERE id = $1`,
        [parsedId]
      );
      if (saleRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Sale not found' };
      }
      if (saleRes.rows[0].order_status === 'completed') {
        await client.query('ROLLBACK');
        return { success: false, error: 'Completed orders cannot be deleted' };
      }

      // Clean up any related warehouse transactions
      await client.query(
        `DELETE FROM ic_warehouse_transactions WHERE reference_type = 'sale' AND reference_id = $1`,
        [parsedId]
      );

      await client.query('DELETE FROM ic_sales WHERE id = $1', [parsedId]);
      await client.query('COMMIT');
      return { success: true, data: null };
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      logger.error({ error, id }, 'Error in dbDeleteICSaleAction');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    logger.error({ err, id }, 'Validation error in dbDeleteICSaleAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
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
  try {
    const parsed = z.object({ id: z.string().min(1), warehouseId: z.string().min(1) }).parse({ id, warehouseId });
    const auth = await assertAdminRole();
    if ('error' in auth) return { success: false, error: auth.error };
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
        [parsed.warehouseId, auth.enteredBy, parsed.id],
      );
      if (res.rowCount === 0) {
        return { success: false, error: 'Order not found or not in pending status' };
      }
      const sale = await fetchICSaleById(parsed.id);
      return sale ? { success: true, data: sale } : { success: false, error: 'Order not found' };
    } catch (error: unknown) {
      logger.error({ error, id, warehouseId }, 'Error in adminAcceptICSaleAction execution');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    }
  } catch (err: unknown) {
    logger.error({ err, id, warehouseId }, 'Validation error in adminAcceptICSaleAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/** Admin rejects an order with remarks. */
export async function adminRejectICSaleAction(
  id: string,
  remarks: string,
): Promise<DbActionResult<ICSale>> {
  try {
    const parsed = z.object({ id: z.string().min(1), remarks: z.string() }).parse({ id, remarks });
    const auth = await assertAdminRole();
    if ('error' in auth) return { success: false, error: auth.error };
    if (!parsed.remarks.trim()) {
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
        [parsed.remarks.trim(), auth.enteredBy, parsed.id],
      );
      if (res.rowCount === 0) {
        return { success: false, error: 'Order cannot be rejected in its current status' };
      }
      const sale = await fetchICSaleById(parsed.id);
      return sale ? { success: true, data: sale } : { success: false, error: 'Order not found' };
    } catch (error: unknown) {
      logger.error({ error, id, remarks }, 'Error in adminRejectICSaleAction execution');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    }
  } catch (err: unknown) {
    logger.error({ err, id, remarks }, 'Validation error in adminRejectICSaleAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/** Admin reassigns warehouse after WH or delivery agent rejection. */
export async function adminReassignICSaleWarehouseAction(
  id: string,
  warehouseId: string,
): Promise<DbActionResult<ICSale>> {
  try {
    const parsed = z.object({ id: z.string().min(1), warehouseId: z.string().min(1) }).parse({ id, warehouseId });
    const auth = await assertAdminRole();
    if ('error' in auth) return { success: false, error: auth.error };
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
        [parsed.warehouseId, auth.enteredBy, parsed.id],
      );
      if (res.rowCount === 0) {
        return { success: false, error: 'Order cannot be reassigned in its current status' };
      }
      const sale = await fetchICSaleById(parsed.id);
      return sale ? { success: true, data: sale } : { success: false, error: 'Order not found' };
    } catch (error: unknown) {
      logger.error({ error, id, warehouseId }, 'Error in adminReassignICSaleWarehouseAction execution');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    }
  } catch (err: unknown) {
    logger.error({ err, id, warehouseId }, 'Validation error in adminReassignICSaleWarehouseAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/** Branch updates a rejected order and resubmits it to admin review. */
export async function branchResubmitICSaleAction(
  id: string,
  updates: ICSaleContentFields,
  branchSlug?: string,
): Promise<DbActionResult<ICSale>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const parsedUpdates = addSaleSchema.parse(updates);
    const parsedSlug = z.string().optional().parse(branchSlug);

    const auth = await assertBranchOwnsSale(parsedId, parsedSlug);
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const { sale, updatedBy } = auth;
    if (normalizeOrderStatus(sale.orderStatus) !== 'admin_rejected') {
      return { success: false, error: 'Only admin-rejected orders can be resubmitted' };
    }

    if (!hasICSaleEditableFieldsChanged(sale, parsedUpdates as ICSaleContentFields)) {
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
             bank = $8,
             conversion_rate = $9,
             currency = $10,
             order_status = 'pending',
             rejection_remarks = NULL,
             warehouse_id = NULL,
             delivery_agent_id = NULL,
             status_updated_at = CURRENT_TIMESTAMP,
             status_updated_by = $11
         WHERE id = $12 AND order_status = 'admin_rejected'
         RETURNING id`,
        [
          parsedUpdates.transactionType || null,
          parsedUpdates.units,
          parsedUpdates.convertedAmount ?? null,
          parsedUpdates.aedAmount ?? null,
          parsedUpdates.address || null,
          parsedUpdates.imageUrl || null,
          parsedUpdates.serviceCharge ?? 0,
          parsedUpdates.bank || null,
          parsedUpdates.conversionRate ?? 1.0,
          parsedUpdates.currency || 'AED',
          updatedBy,
          parsedId,
        ],
      );
      if (res.rowCount === 0) {
        return { success: false, error: 'Order not found or no longer rejected' };
      }
      const updated = await fetchICSaleById(parsedId);
      return updated ? { success: true, data: updated } : { success: false, error: 'Order not found' };
    } catch (error: unknown) {
      logger.error({ error, id, updates }, 'Error in branchResubmitICSaleAction execution');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    }
  } catch (err: unknown) {
    logger.error({ err, id, updates }, 'Validation error in branchResubmitICSaleAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/** Branch deletes its own order while it is still pending admin acceptance. */
export async function branchDeleteICSaleAction(
  id: string,
  branchSlug?: string,
): Promise<DbActionResult<null>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const parsedSlug = z.string().optional().parse(branchSlug);
    const auth = await assertBranchOwnsSale(parsedId, parsedSlug);
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }
    if (normalizeOrderStatus(auth.sale.orderStatus) !== 'pending') {
      return { success: false, error: 'Only pending orders can be deleted' };
    }
    try {
      const res = await query(
        `DELETE FROM ic_sales WHERE id = $1 AND order_status = 'pending' RETURNING id`,
        [parsedId],
      );
      if (res.rowCount === 0) {
        return { success: false, error: 'Order not found or no longer pending' };
      }
      return { success: true, data: null };
    } catch (error: unknown) {
      logger.error({ error, id }, 'Error in branchDeleteICSaleAction execution');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    }
  } catch (err: unknown) {
    logger.error({ err, id }, 'Validation error in branchDeleteICSaleAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/** Branch requests cancellation of an admin-accepted order (awaits admin review). */
export async function branchRequestCancelICSaleAction(
  id: string,
  branchSlug?: string,
): Promise<DbActionResult<ICSale>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const parsedSlug = z.string().optional().parse(branchSlug);
    const auth = await assertBranchOwnsSale(parsedId, parsedSlug);
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }
    if (normalizeOrderStatus(auth.sale.orderStatus) !== 'accepted') {
      return { success: false, error: 'Only admin-accepted orders can be cancelled' };
    }
    try {
      const res = await query(
        `UPDATE ic_sales
         SET order_status = 'cancellation_pending',
             status_updated_at = CURRENT_TIMESTAMP,
             status_updated_by = $2
         WHERE id = $1 AND order_status = 'accepted'
         RETURNING id`,
        [parsedId, auth.updatedBy],
      );
      if (res.rowCount === 0) {
        return { success: false, error: 'Order not found or no longer eligible for cancellation' };
      }
      const updated = await fetchICSaleById(parsedId);
      return updated ? { success: true, data: updated } : { success: false, error: 'Order not found' };
    } catch (error: unknown) {
      logger.error({ error, id }, 'Error in branchRequestCancelICSaleAction execution');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    }
  } catch (err: unknown) {
    logger.error({ err, id }, 'Validation error in branchRequestCancelICSaleAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/** Admin approves a cancellation request — order becomes cancelled. */
export async function adminApproveCancelICSaleAction(id: string): Promise<DbActionResult<ICSale>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const auth = await assertAdminRole();
    if ('error' in auth) return { success: false, error: auth.error };
    try {
      const res = await query(
        `UPDATE ic_sales
         SET order_status = 'cancelled',
             warehouse_id = NULL,
             delivery_agent_id = NULL,
             status_updated_at = CURRENT_TIMESTAMP,
             status_updated_by = $2
         WHERE id = $1 AND order_status = 'cancellation_pending'
         RETURNING id`,
        [parsedId, auth.enteredBy],
      );
      if (res.rowCount === 0) {
        return { success: false, error: 'Order not found or not awaiting cancellation' };
      }
      const updated = await fetchICSaleById(parsedId);
      return updated ? { success: true, data: updated } : { success: false, error: 'Order not found' };
    } catch (error: unknown) {
      logger.error({ error, id }, 'Error in adminApproveCancelICSaleAction execution');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    }
  } catch (err: unknown) {
    logger.error({ err, id }, 'Validation error in adminApproveCancelICSaleAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/** Admin declines a cancellation request — order reverts to accepted. */
export async function adminDeclineCancelICSaleAction(id: string): Promise<DbActionResult<ICSale>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const auth = await assertAdminRole();
    if ('error' in auth) return { success: false, error: auth.error };
    try {
      const res = await query(
        `UPDATE ic_sales
         SET order_status = 'accepted',
             status_updated_at = CURRENT_TIMESTAMP,
             status_updated_by = $2
         WHERE id = $1 AND order_status = 'cancellation_pending'
         RETURNING id`,
        [parsedId, auth.enteredBy],
      );
      if (res.rowCount === 0) {
        return { success: false, error: 'Order not found or not awaiting cancellation' };
      }
      const updated = await fetchICSaleById(parsedId);
      return updated ? { success: true, data: updated } : { success: false, error: 'Order not found' };
    } catch (error: unknown) {
      logger.error({ error, id }, 'Error in adminDeclineCancelICSaleAction execution');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    }
  } catch (err: unknown) {
    logger.error({ err, id }, 'Validation error in adminDeclineCancelICSaleAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

export async function dbGetCustomerCurrencyAction(customerName: string): Promise<DbActionResult<string>> {
  try {
    const parsedName = z.string().min(1).parse(customerName);
    const res = await query(
      `SELECT COALESCE(
         (
           SELECT g.currency
           FROM ic_rate_group_customers c
           JOIN customers cust ON c.customer_id = cust.id
           JOIN ic_rate_groups g ON c.group_id = g.id
           WHERE LOWER(cust.name) = LOWER($1)
           LIMIT 1
         ),
         (
           SELECT g.currency
           FROM ic_rate_group_branches b
           JOIN branches br ON b.branch_id = br.id
           JOIN ic_rate_groups g ON b.group_id = g.id
           WHERE LOWER(br.name) = LOWER($1)
           LIMIT 1
         ),
         'Currency'
       ) AS currency`,
      [parsedName]
    );
    const currency = res.rows.length > 0 ? res.rows[0].currency : 'Currency';
    return { success: true, data: currency };
  } catch (error: unknown) {
    logger.error({ error, customerName }, 'Error in dbGetCustomerCurrencyAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}
