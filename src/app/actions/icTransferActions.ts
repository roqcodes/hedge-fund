'use server';

import { cookies } from 'next/headers';
import { query, pool } from '@/lib/db';
import { DbActionResult } from './dbActions';
import { getCurrentUserAction } from './auth';
import { canPerformICTransferAdminActions } from '@/lib/rbac';
import type { User } from '@/types';
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
import { isByHandSale } from '@/lib/icTransfer/byHand';
import { isBranchHandledSale } from '@/lib/icTransfer/fulfillmentHandler';
import { isBranchPortalRole } from '@/lib/rbac';
import { normalizeHiddenPages } from '@/lib/branchPages';
import {
  customerOwnsSale,
  isBranchSubmittedSale,
  isCustomerEnteredOrder,
  saleBelongsToBranchPortal,
  shouldRecordCustomerOrderUnderBranch,
} from '@/lib/icTransfer/branchOrderOwnership';
import {
  customerOrderInitialStatus,
  customerOrderResubmitStatusAfterAdminReject,
  type BranchPortalConfig,
} from '@/lib/icTransfer/adminOnlyBranch';
import { canEditOrder, canDeleteOrder } from '@/lib/icTransfer/orderWorkflowRules';
import { validateSubCustomerForOrder } from '@/app/actions/subCustomerActions';
import { transactionTypeRequiresBank } from '@/lib/icTransfer/transactionTypes';
import { normalizePricingConfig, validatePricingConfig } from '@/lib/icTransfer/ratePricing';
import { logger } from '@/lib/logger';
import {
  syncICSaleFundLedger,
  syncICPurchaseFundLedger,
  removeICSaleFundLedger,
  removeICPurchaseFundLedger,
} from '@/lib/icTransfer/fundLedgerSync';
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
  bulkUpdateRateGroupPricingSchema,
  updateRateGroupPricingSchema,
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
  subCustomerId: 'sub_customer_id',
  subCustomerName: 'sub_customer_name',
  warehouseId: 'warehouse_id',
  transactionType: 'transaction_type',
  units: 'units',
  unitRate: 'unit_rate',
  convertedAmount: 'converted_amount',
  aedAmount: 'aed_amount',
  bank: 'bank',
  address: 'address',
  location: 'location',
  district: 'district',
  imageUrl: 'image_url',
  conversionRate: 'conversion_rate',
  currency: 'currency',
  serviceCharge: 'service_charge',
  collectedUnits: 'collected_units',
  priority: 'priority',
  fulfillmentHandler: 'fulfillment_handler',
  paymentStatus: 'payment_status',
  orderStatus: 'order_status',
  rejectionRemarks: 'rejection_remarks',
  deliveryAgentId: 'delivery_agent_id',
  deliveryImageUrl: 'delivery_image_url',
};

async function resolveEnteredByForBranch(branchSlug?: string) {
  const slug = branchSlug && branchSlug !== 'superadmin' ? branchSlug : undefined;
  const userRes = slug ? await getCurrentUserAction(slug) : await getCurrentUserAction();
  const user = userRes.success ? userRes.data : null;
  return {
    enteredBy: user?.email || 'system',
    enteredByName: user?.name || 'System',
    enteredByUserId: user?.id || 'system_id',
  };
}

async function isCustomerEnteredSale(sale: ICSale): Promise<boolean> {
  if (!sale.orderCustomerId || !sale.enteredByUserId) return false;
  const res = await query(
    `SELECT cognito_user_id FROM customers WHERE id = $1 LIMIT 1`,
    [sale.orderCustomerId],
  );
  const cognitoUserId = res.rows[0]?.cognito_user_id;
  return Boolean(cognitoUserId && String(cognitoUserId) === String(sale.enteredByUserId));
}

/** Resolve the authenticated user for IC Transfer admin actions (superadmin or branch portal). */
async function resolveICTransferAdminUser(branchSlug?: string): Promise<User | null> {
  const slug = branchSlug && branchSlug !== 'superadmin' ? branchSlug : undefined;

  if (slug) {
    const branchUser = (await getCurrentUserAction(slug)).data;
    if (branchUser) return branchUser;
  }

  const superUser = (await getCurrentUserAction()).data;
  if (superUser) return superUser;

  if (!slug) {
    const cookieStore = await cookies();
    for (const cookie of cookieStore.getAll()) {
      if (!cookie.name.startsWith('session_') || cookie.name === 'session_superadmin') continue;
      const cookieSlug = cookie.name.slice('session_'.length);
      const user = (await getCurrentUserAction(cookieSlug)).data;
      if (user) return user;
    }
  }

  return null;
}

/** Branch-created rate groups must use the same currency as the HQ admin-assigned branch rate. */
async function assertBranchRateGroupCurrencyMatchesAdmin(
  branchId: string,
  currency: string,
): Promise<string | null> {
  const res = await query(
    `SELECT rg.currency
     FROM ic_rate_groups rg
     INNER JOIN ic_rate_group_branches rgb ON rgb.group_id = rg.id
     WHERE rgb.branch_id = $1 AND rg.created_by_branch_id IS NULL
     LIMIT 1`,
    [branchId],
  );
  if (res.rows.length === 0) return null;
  const adminCurrency = String(res.rows[0].currency).toUpperCase();
  if (currency.toUpperCase() !== adminCurrency) {
    return `Rate group currency must match the admin-assigned branch currency (${adminCurrency})`;
  }
  return null;
}

/** Assert the current user may perform IC Transfer admin actions. */
async function assertAdminRole(branchSlug?: string): Promise<{ error: string } | { enteredBy: string }> {
  const user = await resolveICTransferAdminUser(branchSlug);
  if (!user || !canPerformICTransferAdminActions(user)) {
    return { error: 'Unauthorized: admin role required' };
  }
  return { enteredBy: user.email || user.name || 'system' };
}

export async function dbAddICRegionAction(name: string, country: string): Promise<DbActionResult<ICRegion>> {
  try {
    const parsed = addRegionSchema.parse({ name, country });
    const id = crypto.randomUUID();
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
  name: string,
  phone?: string,
  commission?: number | null,
  regionId?: string,
  email?: string,
  address?: string,
  branchId?: string | null,
  branchSlug?: string,
): Promise<DbActionResult<ICSupplier>> {
  try {
    const parsed = addSupplierSchema.parse({ name, phone, commission, regionId, email, address, branchId });

    if (parsed.branchId) {
      const user = await resolveICTransferAdminUser(branchSlug);
      if (!user || user.role !== 'branch_manager' || user.branchId !== parsed.branchId) {
        return { success: false, error: 'Unauthorized' };
      }
    } else if (branchSlug) {
      const user = await resolveICTransferAdminUser(branchSlug);
      if (user?.role === 'branch_manager') {
        return { success: false, error: 'Branch managers must create branch-scoped suppliers' };
      }
    }

    const id = crypto.randomUUID();
    const res = await query(
      `INSERT INTO ic_suppliers (id, name, phone, commission, region_id, email, address, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        id,
        parsed.name,
        parsed.phone || null,
        parsed.commission || 0,
        parsed.regionId || null,
        parsed.email || null,
        parsed.address || null,
        parsed.branchId || null,
      ],
    );
    return { success: true, data: mapICSupplierRow(res.rows[0]) };
  } catch (error: unknown) {
    logger.error({ error, name, email }, 'Error in dbAddICSupplierAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbUpdateICSupplierAction(
  id: string,
  name: string,
  phone?: string,
  commission?: number | null,
  regionId?: string,
  email?: string,
  address?: string,
  branchSlug?: string,
): Promise<DbActionResult<ICSupplier>> {
  try {
    const parsed = updateSupplierSchema.parse({ id, name, phone, commission, regionId, email, address });
    const ownershipCheck = await assertSupplierMutationAllowed(parsed.id, branchSlug);
    if (ownershipCheck) return { success: false, error: ownershipCheck.error };

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

export async function dbDeleteICSupplierAction(id: string, branchSlug?: string): Promise<DbActionResult<void>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const ownershipCheck = await assertSupplierMutationAllowed(parsedId, branchSlug);
    if (ownershipCheck) return { success: false, error: ownershipCheck.error };

    const res = await query(`DELETE FROM ic_suppliers WHERE id=$1`, [parsedId]);
    if (res.rowCount === 0) return { success: false, error: 'Supplier not found' };
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, id }, 'Error in dbDeleteICSupplierAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbAddICWarehouseAction(
  name: string,
  phone?: string,
  commission?: number | null,
  regionId?: string,
  email?: string,
  address?: string,
  sendDeliveryProofToCustomer: boolean = true,
  branchId?: string | null,
): Promise<DbActionResult<ICWarehouse>> {
  try {
    const parsed = addWarehouseSchema.parse({
      name,
      phone,
      commission,
      regionId,
      email,
      address,
      sendDeliveryProofToCustomer,
      branchId,
    });
    const id = crypto.randomUUID();
    const res = await query(
      `INSERT INTO ic_warehouses (
         id, name, phone, commission, region_id, email, address, send_delivery_proof_to_customer, branch_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        id,
        parsed.name,
        parsed.phone || null,
        parsed.commission || 0,
        parsed.regionId || null,
        parsed.email || null,
        parsed.address || null,
        parsed.sendDeliveryProofToCustomer ?? true,
        parsed.branchId || null,
      ],
    );
    return { success: true, data: mapICWarehouseRow(res.rows[0]) };
  } catch (error: unknown) {
    logger.error({ error, name, email }, 'Error in dbAddICWarehouseAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbUpdateICWarehouseAction(
  id: string,
  name: string,
  phone?: string,
  commission?: number | null,
  regionId?: string,
  email?: string,
  address?: string,
  sendDeliveryProofToCustomer: boolean = true,
): Promise<DbActionResult<ICWarehouse>> {
  try {
    const parsed = updateWarehouseSchema.parse({
      id,
      name,
      phone,
      commission,
      regionId,
      email,
      address,
      sendDeliveryProofToCustomer,
    });
    const res = await query(
      `UPDATE ic_warehouses
       SET name=$1, phone=$2, commission=$3, region_id=$4, email=$5, address=$6,
           send_delivery_proof_to_customer=$7
       WHERE id=$8 RETURNING *`,
      [
        parsed.name,
        parsed.phone || null,
        parsed.commission || 0,
        parsed.regionId || null,
        parsed.email || null,
        parsed.address || null,
        parsed.sendDeliveryProofToCustomer ?? true,
        parsed.id,
      ],
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
  name: string,
  country: string,
  currency: string,
  saleRate: number,
  conversionRate: number,
  createdByBranchId?: string,
  branchSlug?: string,
): Promise<DbActionResult<import('@/types').ICRateGroup>> {
  try {
    const parsed = addRateGroupSchema.parse({
      name,
      country,
      currency,
      saleRate,
      conversionRate,
      createdByBranchId,
    });

    if (parsed.createdByBranchId) {
      const user = await resolveICTransferAdminUser(branchSlug);
      if (!user || user.role !== 'branch_manager' || user.branchId !== parsed.createdByBranchId) {
        return { success: false, error: 'Unauthorized' };
      }
      const currencyError = await assertBranchRateGroupCurrencyMatchesAdmin(
        parsed.createdByBranchId,
        parsed.currency,
      );
      if (currencyError) return { success: false, error: currencyError };
    }

    const id = crypto.randomUUID();
    const res = await query(
      `INSERT INTO ic_rate_groups (id, name, country, currency, sale_rate, conversion_rate, created_by_branch_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        id,
        parsed.name,
        parsed.country,
        parsed.currency,
        parsed.saleRate,
        parsed.conversionRate,
        parsed.createdByBranchId ?? null,
      ],
    );
    return { success: true, data: mapICRateGroupRow(res.rows[0]) };
  } catch (error: unknown) {
    logger.error({ error, name, country }, 'Error in dbAddICRateGroupAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbUpdateICRateGroupAction(
  id: string, name: string, country: string, currency: string, saleRate: number, conversionRate: number
): Promise<DbActionResult<import('@/types').ICRateGroup>> {
  try {
    const parsed = updateRateGroupSchema.parse({ id, name, country, currency, saleRate, conversionRate });

    const existing = await query(
      `SELECT created_by_branch_id FROM ic_rate_groups WHERE id = $1 LIMIT 1`,
      [parsed.id],
    );
    if (existing.rows.length === 0) return { success: false, error: 'Group not found' };

    const createdByBranchId = existing.rows[0].created_by_branch_id as string | null;
    if (createdByBranchId) {
      const currencyError = await assertBranchRateGroupCurrencyMatchesAdmin(
        createdByBranchId,
        parsed.currency,
      );
      if (currencyError) return { success: false, error: currencyError };
    }

    const res = await query(
      `UPDATE ic_rate_groups SET name=$1, country=$2, currency=$3, sale_rate=$4, conversion_rate=$5, updated_at=CURRENT_TIMESTAMP WHERE id=$6 RETURNING *`,
      [parsed.name, parsed.country, parsed.currency, parsed.saleRate, parsed.conversionRate, parsed.id]
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
  pricingConfig?: import('@/types').ICRateGroupPricingConfig | null,
): Promise<DbActionResult<import('@/types').ICRateGroup[]>> {
  try {
    const parsed = bulkUpdateRateGroupPricingSchema.parse({
      groupIds,
      saleRate,
      conversionRate,
      pricingConfig: pricingConfig ?? null,
    });

    const flat = { saleRate: parsed.saleRate, conversionRate: parsed.conversionRate };
    if (parsed.pricingConfig) {
      const validationError = validatePricingConfig(parsed.pricingConfig, flat);
      if (validationError) return { success: false, error: validationError };
    }

    const normalizedConfig = parsed.pricingConfig
      ? normalizePricingConfig(parsed.pricingConfig, flat)
      : null;
    const configPayload =
      normalizedConfig &&
      !(normalizedConfig.scope === 'all_types' && normalizedConfig.kind === 'flat')
        ? JSON.stringify(normalizedConfig)
        : null;

    const res = await query(
      `UPDATE ic_rate_groups
       SET sale_rate = $1, conversion_rate = $2, pricing_config = $3::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($4::text[])
       RETURNING *`,
      [parsed.saleRate, parsed.conversionRate, configPayload, parsed.groupIds],
    );
    if (res.rowCount === 0) return { success: false, error: 'No groups were updated' };
    return { success: true, data: res.rows.map(mapICRateGroupRow) };
  } catch (error: unknown) {
    logger.error({ error, groupIds }, 'Error in dbBulkUpdateICRateGroupRatesAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbUpdateICRateGroupPricingAction(
  groupId: string,
  saleRate: number,
  conversionRate: number,
  pricingConfig: import('@/types').ICRateGroupPricingConfig | null,
): Promise<DbActionResult<import('@/types').ICRateGroup>> {
  try {
    const parsed = updateRateGroupPricingSchema.parse({
      groupId,
      saleRate,
      conversionRate,
      pricingConfig,
    });

    const flat = { saleRate: parsed.saleRate, conversionRate: parsed.conversionRate };
    if (parsed.pricingConfig) {
      const validationError = validatePricingConfig(parsed.pricingConfig, flat);
      if (validationError) return { success: false, error: validationError };
    }

    const normalizedConfig = parsed.pricingConfig
      ? normalizePricingConfig(parsed.pricingConfig, flat)
      : null;
    const configPayload =
      normalizedConfig &&
      !(normalizedConfig.scope === 'all_types' && normalizedConfig.kind === 'flat')
        ? JSON.stringify(normalizedConfig)
        : null;

    const res = await query(
      `UPDATE ic_rate_groups
       SET sale_rate = $1, conversion_rate = $2, pricing_config = $3::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [parsed.saleRate, parsed.conversionRate, configPayload, parsed.groupId],
    );
    if (res.rowCount === 0) return { success: false, error: 'Group not found' };
    return { success: true, data: mapICRateGroupRow(res.rows[0]) };
  } catch (error: unknown) {
    logger.error({ error, groupId }, 'Error in dbUpdateICRateGroupPricingAction');
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
           SELECT $1, unnest($2::text[])`,
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
           SELECT $1, unnest($2::text[])`,
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
  purchase: Omit<ICPurchase, 'id' | 'createdAt'>,
  branchSlug?: string,
): Promise<DbActionResult<ICPurchase>> {
  try {
    const parsed = addPurchaseSchema.parse(purchase);
    const warehouseCheck = await assertBranchManagerPurchaseWarehouse(parsed.warehouseId, branchSlug);
    if (warehouseCheck) return { success: false, error: warehouseCheck.error };
    const supplierCheck = await assertBranchManagerPurchaseSupplier(parsed.supplierId, branchSlug);
    if (supplierCheck) return { success: false, error: supplierCheck.error };

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
      await syncICPurchaseFundLedger(res.rows[0].id);
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
  sale: Omit<ICSale, 'id' | 'createdAt' | 'enteredBy' | 'enteredByName' | 'enteredByUserId'>,
  branchSlug?: string,
): Promise<DbActionResult<ICSale>> {
  try {
    const parsed = addSaleSchema.parse(sale);
    const slug = branchSlug && branchSlug !== 'superadmin' ? branchSlug : undefined;
    const userRes = slug ? await getCurrentUserAction(slug) : await getCurrentUserAction();
    const user = userRes.success ? userRes.data : null;

    let salePayload = { ...parsed };
    let branchName = '';
    let branchHiddenPages: string[] | null = null;
    let branchId: string | null = null;

    if (slug) {
      const branchRes = await query(
        `SELECT id, name, hidden_pages FROM branches WHERE slug = $1 LIMIT 1`,
        [slug],
      );
      if (branchRes.rows.length > 0) {
        branchId = String(branchRes.rows[0].id);
        branchName = String(branchRes.rows[0].name || '');
        branchHiddenPages = normalizeHiddenPages(
          Array.isArray(branchRes.rows[0].hidden_pages)
            ? branchRes.rows[0].hidden_pages.map(String)
            : [],
        );
      }
    }

    const branchPortalConfig: BranchPortalConfig = {
      branchId,
      hiddenPages: branchHiddenPages,
    };

    if (user?.role === 'customer') {
      if (!user.customerId) {
        return { success: false, error: 'Customer profile is not linked to this account' };
      }
      const customerName = user.name?.trim() || parsed.customerName;
      const recordUnderBranch = Boolean(branchName && shouldRecordCustomerOrderUnderBranch(branchHiddenPages));

      const subCustomer = await validateSubCustomerForOrder(user.customerId, parsed.subCustomerId);
      if ('error' in subCustomer) {
        return { success: false, error: subCustomer.error };
      }

      salePayload = {
        ...salePayload,
        customerName: recordUnderBranch ? branchName : customerName,
        orderCustomerId: user.customerId,
        orderCustomerName: customerName,
        subCustomerId: subCustomer.id,
        subCustomerName: subCustomer.name,
        warehouseId: undefined,
      };
    } else if (user && slug && (user.role === 'branch_manager' || user.role === 'staff') && branchName) {
      salePayload = {
        ...salePayload,
        customerName: branchName,
      };
      if (user.role !== 'branch_manager') {
        salePayload = { ...salePayload, fulfillmentHandler: 'hq_admin' };
      }
    }

    if (!transactionTypeRequiresBank(salePayload.transactionType)) {
      salePayload = { ...salePayload, bank: undefined };
    }

    const { enteredBy, enteredByName, enteredByUserId } = await resolveEnteredByForBranch(branchSlug);
    const isCustomerOrder = user?.role === 'customer';
    let initialOrderStatus = salePayload.warehouseId ? 'accepted' : 'pending';
    let fulfillmentHandler = salePayload.fulfillmentHandler === 'branch' ? 'branch' : 'hq_admin';

    if (isCustomerOrder) {
      initialOrderStatus = customerOrderInitialStatus(branchPortalConfig);
      fulfillmentHandler = 'hq_admin';
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO ic_sales (
          customer_name, order_customer_name, order_customer_id, sub_customer_id, sub_customer_name,
          warehouse_id, transaction_type, units, unit_rate, converted_amount, aed_amount,
          entered_by, entered_by_name, entered_by_user_id, address, location, district, image_url, service_charge, order_status, priority, bank, conversion_rate, currency, fulfillment_handler, admin_unit_rate, admin_conversion_rate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) RETURNING *`,
        [
          salePayload.customerName,
          salePayload.orderCustomerName || null,
          salePayload.orderCustomerId || null,
          salePayload.subCustomerId || null,
          salePayload.subCustomerName || null,
          salePayload.warehouseId || null,
          salePayload.transactionType || null,
          salePayload.units,
          salePayload.unitRate,
          salePayload.convertedAmount || null,
          salePayload.aedAmount || null,
          enteredBy,
          enteredByName,
          enteredByUserId,
          salePayload.address || null,
          salePayload.location || null,
          salePayload.district || null,
          salePayload.imageUrl || null,
          salePayload.serviceCharge || 0.00,
          initialOrderStatus,
          salePayload.priority || 'Normal',
          salePayload.bank || null,
          salePayload.conversionRate ?? 1.0,
          salePayload.currency || 'AED',
          fulfillmentHandler,
          salePayload.adminUnitRate ?? null,
          salePayload.adminConversionRate ?? null,
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
  updates: Partial<Omit<ICPurchase, 'id' | 'createdAt'>>,
  branchSlug?: string,
): Promise<DbActionResult<ICPurchase>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const parsedUpdates = updatePurchaseSchema.parse(updates);

    const modifyCheck = await assertBranchManagerCanModifyPurchase(parsedId, branchSlug);
    if (modifyCheck) return { success: false, error: modifyCheck.error };

    if (parsedUpdates.warehouseId) {
      const warehouseCheck = await assertBranchManagerPurchaseWarehouse(
        parsedUpdates.warehouseId,
        branchSlug,
      );
      if (warehouseCheck) return { success: false, error: warehouseCheck.error };
    }

    if (parsedUpdates.supplierId) {
      const supplierCheck = await assertBranchManagerPurchaseSupplier(
        parsedUpdates.supplierId,
        branchSlug,
      );
      if (supplierCheck) return { success: false, error: supplierCheck.error };
    }

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
      await syncICPurchaseFundLedger(parsedId);
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
    const existing = await fetchICSaleById(parsedId);
    if (!existing) return { success: false, error: 'Sale not found' };
    if (isBranchHandledSale(existing) && updates.fulfillmentHandler !== 'hq_admin') {
      return {
        success: false,
        error: 'This order is managed by the branch. Admin has view-only access.',
      };
    }

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
      await syncICSaleFundLedger(parsedId);
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
      await removeICPurchaseFundLedger(parsedId);
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
        `SELECT order_status, fulfillment_handler FROM ic_sales WHERE id = $1`,
        [parsedId]
      );
      if (saleRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Sale not found' };
      }
      if (saleRes.rows[0].fulfillment_handler === 'branch') {
        await client.query('ROLLBACK');
        return { success: false, error: 'Branch-managed orders must be deleted by the branch manager' };
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

      await removeICSaleFundLedger(parsedId);
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

async function assertAdminCanModifySale(id: string): Promise<{ sale: ICSale } | { error: string }> {
  const sale = await fetchICSaleById(id);
  if (!sale) return { error: 'Order not found' };
  if (isBranchHandledSale(sale)) {
    return { error: 'This order is managed by the branch. Admin has view-only access.' };
  }
  return { sale };
}

async function assertBranchManagerHandlesSale(
  saleId: string,
  branchSlug?: string,
): Promise<
  { sale: ICSale; updatedBy: string; branchId: string; branchName: string } | { error: string }
> {
  const slug = branchSlug && branchSlug !== 'superadmin' ? branchSlug : undefined;
  const userRes = slug ? await getCurrentUserAction(slug) : await getCurrentUserAction();
  const user = userRes.success ? userRes.data : null;

  if (!user || user.role !== 'branch_manager') {
    return { error: 'Only branch managers can perform this action' };
  }

  let branchId: string;
  let branchName: string;

  if (slug) {
    const branchRes = await query(
      `SELECT id, name FROM branches WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    if (branchRes.rows.length === 0) return { error: 'Branch not found' };
    if (user.branchId && branchRes.rows[0].id !== user.branchId) {
      return { error: 'You are not authorized for this branch' };
    }
    branchId = String(branchRes.rows[0].id);
    branchName = String(branchRes.rows[0].name || '');
  } else if (user.branchId) {
    const branchRes = await query(`SELECT id, name FROM branches WHERE id = $1 LIMIT 1`, [user.branchId]);
    if (branchRes.rows.length === 0) return { error: 'Branch not found' };
    branchId = String(branchRes.rows[0].id);
    branchName = String(branchRes.rows[0].name || '');
  } else {
    return { error: 'Branch not found' };
  }

  const sale = await fetchICSaleById(saleId);
  if (!sale) return { error: 'Order not found' };
  if (!isBranchHandledSale(sale)) {
    return { error: 'This action is only for branch-managed orders' };
  }

  const custRes = await query(`SELECT id FROM customers WHERE branch_id = $1`, [branchId]);
  const branchCustomerIds = new Set(custRes.rows.map((r: { id: string }) => String(r.id)));

  if (!saleBelongsToBranchPortal(sale, branchName, branchCustomerIds)) {
    return { error: 'You can only manage orders for your branch' };
  }

  return {
    sale,
    updatedBy: user.email || user.name || 'branch',
    branchId,
    branchName,
  };
}

async function assertBranchManagerCanReviewCustomerOrder(
  saleId: string,
  branchSlug?: string,
): Promise<
  { sale: ICSale; updatedBy: string; branchId: string; branchName: string } | { error: string }
> {
  const slug = branchSlug && branchSlug !== 'superadmin' ? branchSlug : undefined;
  const userRes = slug ? await getCurrentUserAction(slug) : await getCurrentUserAction();
  const user = userRes.success ? userRes.data : null;

  if (!user || user.role !== 'branch_manager') {
    return { error: 'Only branch managers can review customer orders' };
  }

  let branchId: string;
  let branchName: string;

  if (slug) {
    const branchRes = await query(
      `SELECT id, name FROM branches WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    if (branchRes.rows.length === 0) return { error: 'Branch not found' };
    if (user.branchId && branchRes.rows[0].id !== user.branchId) {
      return { error: 'You are not authorized for this branch' };
    }
    branchId = String(branchRes.rows[0].id);
    branchName = String(branchRes.rows[0].name || '');
  } else if (user.branchId) {
    const branchRes = await query(`SELECT id, name FROM branches WHERE id = $1 LIMIT 1`, [user.branchId]);
    if (branchRes.rows.length === 0) return { error: 'Branch not found' };
    branchId = String(branchRes.rows[0].id);
    branchName = String(branchRes.rows[0].name || '');
  } else {
    return { error: 'Branch not found' };
  }

  const sale = await fetchICSaleById(saleId);
  if (!sale) return { error: 'Order not found' };
  if (!sale.orderCustomerId) {
    return { error: 'Only customer orders require branch review' };
  }
  if (normalizeOrderStatus(sale.orderStatus) !== 'pending_branch_review') {
    return { error: 'Order is not awaiting branch review' };
  }

  const custRes = await query(`SELECT id FROM customers WHERE branch_id = $1`, [branchId]);
  const branchCustomerIds = new Set(custRes.rows.map((r: { id: string }) => String(r.id)));

  if (!saleBelongsToBranchPortal(sale, branchName, branchCustomerIds)) {
    return { error: 'You can only review orders for your branch customers' };
  }

  return {
    sale,
    updatedBy: user.email || user.name || 'branch',
    branchId,
    branchName,
  };
}

/** Branch manager accepts a customer order and routes it to admin or branch fulfillment. */
export async function branchReviewAcceptICSaleAction(
  id: string,
  handler: 'hq_admin' | 'branch',
  branchSlug?: string,
): Promise<DbActionResult<ICSale>> {
  try {
    const parsed = z
      .object({
        id: z.string().min(1),
        handler: z.enum(['hq_admin', 'branch']),
      })
      .parse({ id, handler });
    const auth = await assertBranchManagerCanReviewCustomerOrder(parsed.id, branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };

    const res = await query(
      `UPDATE ic_sales
       SET order_status = 'pending',
           fulfillment_handler = $1,
           rejection_remarks = NULL,
           warehouse_id = NULL,
           delivery_agent_id = NULL,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $2
       WHERE id = $3 AND order_status = 'pending_branch_review'
       RETURNING id`,
      [parsed.handler, auth.updatedBy, parsed.id],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order not found or no longer awaiting review' };
    }
    const updated = await fetchICSaleById(parsed.id);
    return updated ? { success: true, data: updated } : { success: false, error: 'Order not found' };
  } catch (err: unknown) {
    logger.error({ err, id, handler }, 'Validation error in branchReviewAcceptICSaleAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/** Branch manager rejects a customer order before it enters fulfillment. */
export async function branchReviewRejectICSaleAction(
  id: string,
  remarks: string,
  branchSlug?: string,
): Promise<DbActionResult<ICSale>> {
  try {
    const parsed = z
      .object({
        id: z.string().min(1),
        remarks: z.string().min(1),
      })
      .parse({ id, remarks });
    const auth = await assertBranchManagerCanReviewCustomerOrder(parsed.id, branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };

    const res = await query(
      `UPDATE ic_sales
       SET order_status = 'branch_rejected',
           rejection_remarks = $1,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $2
       WHERE id = $3 AND order_status = 'pending_branch_review'
       RETURNING id`,
      [parsed.remarks, auth.updatedBy, parsed.id],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order not found or no longer awaiting review' };
    }
    const updated = await fetchICSaleById(parsed.id);
    return updated ? { success: true, data: updated } : { success: false, error: 'Order not found' };
  } catch (err: unknown) {
    logger.error({ err, id, remarks }, 'Validation error in branchReviewRejectICSaleAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

async function assertBranchWarehouseForBranch(
  warehouseId: string,
  branchId: string,
): Promise<{ error: string } | null> {
  const whRes = await query(
    `SELECT branch_id FROM ic_warehouses WHERE id = $1 LIMIT 1`,
    [warehouseId],
  );
  if (whRes.rows.length === 0) return { error: 'Warehouse not found' };
  if (String(whRes.rows[0].branch_id) !== String(branchId)) {
    return { error: 'Warehouse must belong to your branch' };
  }
  return null;
}

async function assertSupplierMutationAllowed(
  supplierId: string,
  branchSlug?: string,
): Promise<{ error: string } | null> {
  const res = await query(`SELECT branch_id FROM ic_suppliers WHERE id = $1 LIMIT 1`, [supplierId]);
  if (res.rows.length === 0) return { error: 'Supplier not found' };

  const supplierBranchId = res.rows[0].branch_id ? String(res.rows[0].branch_id) : null;
  const user = branchSlug ? await resolveICTransferAdminUser(branchSlug) : null;

  if (supplierBranchId) {
    if (!user || user.role !== 'branch_manager' || user.branchId !== supplierBranchId) {
      return { error: 'Unauthorized' };
    }
    return null;
  }

  if (user?.role === 'branch_manager') {
    return { error: 'Unauthorized' };
  }

  return null;
}

async function resolveBranchManagerBranchId(
  branchSlug?: string,
): Promise<{ branchId: string } | { error: string } | null> {
  const user = await resolveICTransferAdminUser(branchSlug);
  if (!user || user.role !== 'branch_manager' || !user.branchId) {
    return null;
  }

  const slug = branchSlug && branchSlug !== 'superadmin' ? branchSlug : undefined;
  if (slug) {
    const branchRes = await query(`SELECT id FROM branches WHERE slug = $1 LIMIT 1`, [slug]);
    if (branchRes.rows.length === 0) return { error: 'Branch not found' };
    const branchId = String(branchRes.rows[0].id);
    if (String(user.branchId) !== branchId) {
      return { error: 'You are not authorized for this branch' };
    }
    return { branchId };
  }

  return { branchId: String(user.branchId) };
}

async function assertBranchManagerPurchaseSupplier(
  supplierId: string | null | undefined,
  branchSlug?: string,
): Promise<{ error: string } | null> {
  if (!supplierId) return null;

  const resolved = await resolveBranchManagerBranchId(branchSlug);
  if (!resolved) return null;
  if ('error' in resolved) return { error: resolved.error };

  const res = await query(`SELECT branch_id FROM ic_suppliers WHERE id = $1 LIMIT 1`, [supplierId]);
  if (res.rows.length === 0) return { error: 'Supplier not found' };
  if (!res.rows[0].branch_id || String(res.rows[0].branch_id) !== resolved.branchId) {
    return { error: 'Supplier must belong to your branch' };
  }

  return null;
}

async function assertBranchManagerPurchaseWarehouse(
  warehouseId: string | null | undefined,
  branchSlug?: string,
): Promise<{ error: string } | null> {
  const resolved = await resolveBranchManagerBranchId(branchSlug);
  if (!resolved) return null;
  if ('error' in resolved) return { error: resolved.error };
  if (!warehouseId) return { error: 'Warehouse is required' };
  return assertBranchWarehouseForBranch(warehouseId, resolved.branchId);
}

async function assertBranchManagerCanModifyPurchase(
  purchaseId: string,
  branchSlug?: string,
): Promise<{ error: string } | null> {
  const resolved = await resolveBranchManagerBranchId(branchSlug);
  if (!resolved) return null;
  if ('error' in resolved) return { error: resolved.error };

  const res = await query(
    `SELECT w.branch_id
     FROM ic_purchases p
     LEFT JOIN ic_warehouses w ON p.warehouse_id = w.id
     WHERE p.id = $1`,
    [purchaseId],
  );
  if (res.rows.length === 0) return { error: 'Purchase not found' };
  if (String(res.rows[0].branch_id) !== resolved.branchId) {
    return { error: 'Unauthorized' };
  }
  return null;
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

  if (user.role === 'customer') {
    if (!user.customerId) {
      return { error: 'Customer profile is not linked to this account' };
    }
    if (!customerOwnsSale(sale, user.customerId, user.name, branchName)) {
      return { error: 'You can only modify your own orders' };
    }
    return { sale, updatedBy: user.email || user.name || 'customer' };
  }

  if (isBranchHandledSale(sale) && user.role === 'branch_manager') {
    const branchIdForCust = slug
      ? (await query(`SELECT id FROM branches WHERE slug = $1 LIMIT 1`, [slug])).rows[0]?.id
      : user.branchId;
    if (branchIdForCust) {
      const custRes = await query(`SELECT id FROM customers WHERE branch_id = $1`, [branchIdForCust]);
      const branchCustomerIds = new Set(custRes.rows.map((r: { id: string }) => String(r.id)));
      if (saleBelongsToBranchPortal(sale, branchName, branchCustomerIds)) {
        return { sale, updatedBy: user.email || user.name || 'branch' };
      }
    }
  }

  if (!isBranchSubmittedSale(sale, branchName)) {
    return { error: 'You can only modify orders submitted by your branch' };
  }

  if (await isCustomerEnteredSale(sale)) {
    return { error: 'This order was submitted by the customer and can only be modified by them' };
  }

  return { sale, updatedBy: user.email || user.name || 'branch' };
}

/** Admin accepts a pending order and assigns a warehouse. */
export async function adminAcceptICSaleAction(
  id: string,
  warehouseId: string,
  branchSlug?: string,
): Promise<DbActionResult<ICSale>> {
  try {
    const parsed = z.object({ id: z.string().min(1), warehouseId: z.string().min(1) }).parse({ id, warehouseId });
    const auth = await assertAdminRole(branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };
    const modCheck = await assertAdminCanModifySale(parsed.id);
    if ('error' in modCheck) return { success: false, error: modCheck.error };
    const whCheck = await assertBranchManagerPurchaseWarehouse(parsed.warehouseId, branchSlug);
    if (whCheck) return { success: false, error: whCheck.error };
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
  branchSlug?: string,
): Promise<DbActionResult<ICSale>> {
  try {
    const parsed = z.object({ id: z.string().min(1), remarks: z.string() }).parse({ id, remarks });
    const auth = await assertAdminRole(branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };
    const modCheck = await assertAdminCanModifySale(parsed.id);
    if ('error' in modCheck) return { success: false, error: modCheck.error };
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
  branchSlug?: string,
): Promise<DbActionResult<ICSale>> {
  try {
    const parsed = z.object({ id: z.string().min(1), warehouseId: z.string().min(1) }).parse({ id, warehouseId });
    const auth = await assertAdminRole(branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };
    const modCheck = await assertAdminCanModifySale(parsed.id);
    if ('error' in modCheck) return { success: false, error: modCheck.error };
    const whCheck = await assertBranchManagerPurchaseWarehouse(parsed.warehouseId, branchSlug);
    if (whCheck) return { success: false, error: whCheck.error };
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

/** Branch portal user edits a pre-accepted order or resubmits a rejected one. */
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
    const status = normalizeOrderStatus(sale.orderStatus);
    const slug = parsedSlug && parsedSlug !== 'superadmin' ? parsedSlug : undefined;
    const userRes = slug ? await getCurrentUserAction(slug) : await getCurrentUserAction();
    const user = userRes.success ? userRes.data : null;

    if (!canEditOrder(sale, user?.role)) {
      return { success: false, error: 'This order can no longer be edited' };
    }

    let targetStatus = status;
    let resetHandler = '';
    const isResubmit = status === 'branch_rejected' || status === 'admin_rejected';

    let branchPortalConfig: BranchPortalConfig | null = null;
    if (slug) {
      const branchRes = await query(
        `SELECT id, hidden_pages FROM branches WHERE slug = $1 LIMIT 1`,
        [slug],
      );
      if (branchRes.rows.length > 0) {
        branchPortalConfig = {
          branchId: String(branchRes.rows[0].id),
          hiddenPages: normalizeHiddenPages(
            Array.isArray(branchRes.rows[0].hidden_pages)
              ? branchRes.rows[0].hidden_pages.map(String)
              : [],
          ),
        };
      }
    }

    if (status === 'branch_rejected') {
      targetStatus = 'pending_branch_review';
      resetHandler = `, fulfillment_handler = 'hq_admin'`;
    } else if (status === 'admin_rejected') {
      targetStatus = isCustomerEnteredOrder(sale)
        ? customerOrderResubmitStatusAfterAdminReject(branchPortalConfig)
        : 'pending';
      if (targetStatus === 'pending_branch_review') {
        resetHandler = `, fulfillment_handler = 'hq_admin'`;
      }
    }

    if (!hasICSaleEditableFieldsChanged(sale, parsedUpdates as ICSaleContentFields)) {
      return { success: false, error: 'Update at least one field before saving' };
    }

    const resubmitTxnType = parsedUpdates.transactionType || sale.transactionType;
    const resubmitBank = transactionTypeRequiresBank(resubmitTxnType)
      ? (parsedUpdates.bank || null)
      : null;

    const clearOnResubmit = isResubmit
      ? `, rejection_remarks = NULL, warehouse_id = NULL, delivery_agent_id = NULL${resetHandler}`
      : '';

    try {
      const res = await query(
        `UPDATE ic_sales
         SET transaction_type = $1,
             units = $2,
             converted_amount = $3,
             aed_amount = $4,
             address = $5,
             location = $6,
             district = $7,
             image_url = $8,
             service_charge = $9,
             bank = $10,
             conversion_rate = $11,
             currency = $12,
             order_status = $13,
             status_updated_at = CURRENT_TIMESTAMP,
             status_updated_by = $14
             ${clearOnResubmit}
         WHERE id = $15 AND order_status = $16
         RETURNING id`,
        [
          parsedUpdates.transactionType || null,
          parsedUpdates.units,
          parsedUpdates.convertedAmount ?? null,
          parsedUpdates.aedAmount ?? null,
          parsedUpdates.address || null,
          parsedUpdates.location || null,
          parsedUpdates.district || null,
          parsedUpdates.imageUrl || null,
          parsedUpdates.serviceCharge ?? 0,
          resubmitBank,
          parsedUpdates.conversionRate ?? 1.0,
          parsedUpdates.currency || 'AED',
          targetStatus,
          updatedBy,
          parsedId,
          status,
        ],
      );
      if (res.rowCount === 0) {
        return { success: false, error: 'Order not found or status has changed' };
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

    const slug = parsedSlug && parsedSlug !== 'superadmin' ? parsedSlug : undefined;
    const userRes = slug ? await getCurrentUserAction(slug) : await getCurrentUserAction();
    const user = userRes.success ? userRes.data : null;

    if (!canDeleteOrder(auth.sale, user?.role)) {
      return { success: false, error: 'This order can no longer be deleted' };
    }

    const allowedStatuses =
      user?.role === 'customer'
        ? ['pending_branch_review', 'branch_rejected', 'pending']
        : isBranchHandledSale(auth.sale)
          ? ['pending']
          : ['pending', 'admin_rejected'];

    try {
      const res = await query(
        `DELETE FROM ic_sales
         WHERE id = $1
           AND order_status = ANY($2::text[])
         RETURNING id`,
        [parsedId, allowedStatuses],
      );
      if (res.rowCount === 0) {
        return { success: false, error: 'Order not found or no longer pending' };
      }
      await removeICSaleFundLedger(parsedId);
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
      return { success: false, error: 'Only accepted orders can be cancelled' };
    }
    if (isCustomerEnteredOrder(auth.sale)) {
      return { success: false, error: 'Customer must request cancellation on their own orders' };
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

/** Customer requests cancellation of an accepted order (branch manager reviews). */
export async function customerRequestCancelICSaleAction(
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
    if (!isCustomerEnteredOrder(auth.sale)) {
      return { success: false, error: 'Only customer portal orders can use this action' };
    }
    if (normalizeOrderStatus(auth.sale.orderStatus) !== 'accepted') {
      return { success: false, error: 'Only accepted orders can be cancelled' };
    }

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
  } catch (err: unknown) {
    logger.error({ err, id }, 'Validation error in customerRequestCancelICSaleAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

async function assertBranchManagerForCustomerCancellation(
  saleId: string,
  branchSlug?: string,
): Promise<{ sale: ICSale; updatedBy: string } | { error: string }> {
  const slug = branchSlug && branchSlug !== 'superadmin' ? branchSlug : undefined;
  const userRes = slug ? await getCurrentUserAction(slug) : await getCurrentUserAction();
  const user = userRes.success ? userRes.data : null;

  if (!user || user.role !== 'branch_manager') {
    return { error: 'Only branch managers can resolve customer cancellations' };
  }

  let branchId: string;
  let branchName: string;

  if (slug) {
    const branchRes = await query(`SELECT id, name FROM branches WHERE slug = $1 LIMIT 1`, [slug]);
    if (branchRes.rows.length === 0) return { error: 'Branch not found' };
    branchId = String(branchRes.rows[0].id);
    branchName = String(branchRes.rows[0].name || '');
  } else if (user.branchId) {
    const branchRes = await query(`SELECT id, name FROM branches WHERE id = $1 LIMIT 1`, [user.branchId]);
    if (branchRes.rows.length === 0) return { error: 'Branch not found' };
    branchId = String(branchRes.rows[0].id);
    branchName = String(branchRes.rows[0].name || '');
  } else {
    return { error: 'Branch not found' };
  }

  const sale = await fetchICSaleById(saleId);
  if (!sale) return { error: 'Order not found' };
  if (!isCustomerEnteredOrder(sale)) {
    return { error: 'Only customer-requested cancellations can be resolved by the branch' };
  }
  if (normalizeOrderStatus(sale.orderStatus) !== 'cancellation_pending') {
    return { error: 'Order is not awaiting cancellation review' };
  }

  const custRes = await query(`SELECT id FROM customers WHERE branch_id = $1`, [branchId]);
  const branchCustomerIds = new Set(custRes.rows.map((r: { id: string }) => String(r.id)));
  if (!saleBelongsToBranchPortal(sale, branchName, branchCustomerIds)) {
    return { error: 'You can only resolve cancellations for your branch customers' };
  }

  return { sale, updatedBy: user.email || user.name || 'branch' };
}

/** Branch manager approves a customer cancellation request. */
export async function branchApproveCustomerCancelICSaleAction(
  id: string,
  branchSlug?: string,
): Promise<DbActionResult<ICSale>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const auth = await assertBranchManagerForCustomerCancellation(parsedId, branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };

    const res = await query(
      `UPDATE ic_sales
       SET order_status = 'cancelled',
           warehouse_id = NULL,
           delivery_agent_id = NULL,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $2
       WHERE id = $1 AND order_status = 'cancellation_pending'
       RETURNING id`,
      [parsedId, auth.updatedBy],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order not found or not awaiting cancellation' };
    }
    const updated = await fetchICSaleById(parsedId);
    return updated ? { success: true, data: updated } : { success: false, error: 'Order not found' };
  } catch (err: unknown) {
    logger.error({ err, id }, 'Validation error in branchApproveCustomerCancelICSaleAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/** Branch manager declines a customer cancellation request. */
export async function branchDeclineCustomerCancelICSaleAction(
  id: string,
  branchSlug?: string,
): Promise<DbActionResult<ICSale>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const auth = await assertBranchManagerForCustomerCancellation(parsedId, branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };

    const res = await query(
      `UPDATE ic_sales
       SET order_status = 'accepted',
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $2
       WHERE id = $1 AND order_status = 'cancellation_pending'
       RETURNING id`,
      [parsedId, auth.updatedBy],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order not found or not awaiting cancellation' };
    }
    const updated = await fetchICSaleById(parsedId);
    return updated ? { success: true, data: updated } : { success: false, error: 'Order not found' };
  } catch (err: unknown) {
    logger.error({ err, id }, 'Validation error in branchDeclineCustomerCancelICSaleAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/** Admin approves a cancellation request — order becomes cancelled. */
export async function adminApproveCancelICSaleAction(id: string, branchSlug?: string): Promise<DbActionResult<ICSale>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const auth = await assertAdminRole(branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };
    const modCheck = await assertAdminCanModifySale(parsedId);
    if ('error' in modCheck) return { success: false, error: modCheck.error };
    if (isCustomerEnteredOrder(modCheck.sale)) {
      return {
        success: false,
        error: 'Customer cancellation requests are resolved by the branch manager',
      };
    }
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
export async function adminDeclineCancelICSaleAction(id: string, branchSlug?: string): Promise<DbActionResult<ICSale>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const auth = await assertAdminRole(branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };
    const modCheck = await assertAdminCanModifySale(parsedId);
    if ('error' in modCheck) return { success: false, error: modCheck.error };
    if (isCustomerEnteredOrder(modCheck.sale)) {
      return {
        success: false,
        error: 'Customer cancellation requests are resolved by the branch manager',
      };
    }
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

/** Admin verifies delivery proof before the customer sees the order as completed. */
export async function adminVerifyDeliveryAction(id: string, branchSlug?: string): Promise<DbActionResult<ICSale>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const auth = await assertAdminRole(branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };
    const modCheck = await assertAdminCanModifySale(parsedId);
    if ('error' in modCheck) return { success: false, error: modCheck.error };

    const res = await query(
      `UPDATE ic_sales
       SET order_status = 'completed',
           payment_status = 'paid',
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $1
       WHERE id = $2
         AND order_status = 'delivery_pending_admin'
         AND fulfillment_handler IS DISTINCT FROM 'branch'
       RETURNING id`,
      [auth.enteredBy, parsedId],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order not found or not awaiting delivery verification' };
    }
    await syncICSaleFundLedger(parsedId);
    const updated = await fetchICSaleById(parsedId);
    return updated ? { success: true, data: updated } : { success: false, error: 'Order not found' };
  } catch (err: unknown) {
    logger.error({ err, id }, 'Validation error in adminVerifyDeliveryAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

export async function adminBulkVerifyDeliveryAction(
  ids: string[],
  branchSlug?: string,
): Promise<DbActionResult<{ verifiedCount: number; failedCount: number }>> {
  try {
    const parsedIds = z.array(z.string().min(1)).min(1).max(100).parse(ids);
    const uniqueIds = [...new Set(parsedIds)];
    const auth = await assertAdminRole(branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };

    const res = await query(
      `UPDATE ic_sales
       SET order_status = 'completed',
           payment_status = 'paid',
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $1
       WHERE id = ANY($2::uuid[])
         AND order_status = 'delivery_pending_admin'
         AND fulfillment_handler IS DISTINCT FROM 'branch'
       RETURNING id`,
      [auth.enteredBy, uniqueIds],
    );
    const verifiedCount = res.rowCount ?? 0;
    const failedCount = uniqueIds.length - verifiedCount;
    for (const row of res.rows) {
      await syncICSaleFundLedger(String(row.id));
    }
    return { success: true, data: { verifiedCount, failedCount } };
  } catch (err: unknown) {
    logger.error({ err, ids }, 'Validation error in adminBulkVerifyDeliveryAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

export async function adminCompleteByHandOrderAction(id: string, branchSlug?: string): Promise<DbActionResult<ICSale>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const auth = await assertAdminRole(branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };
    const modCheck = await assertAdminCanModifySale(parsedId);
    if ('error' in modCheck) return { success: false, error: modCheck.error };

    const sale = await fetchICSaleById(parsedId);
    if (!sale) return { success: false, error: 'Order not found' };
    if (!isByHandSale(sale)) return { success: false, error: 'Only By Hand orders can use this action' };
    if (!sale.warehouseId) return { success: false, error: 'Warehouse must be assigned before completing' };
    if (normalizeOrderStatus(sale.orderStatus) !== 'accepted') {
      return { success: false, error: 'Order must be in pending completion status' };
    }

    const res = await query(
      `UPDATE ic_sales
       SET order_status = 'completed',
           collected_units = units,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $1
       WHERE id = $2
         AND transaction_type = 'by_hand'
         AND order_status = 'accepted'
       RETURNING id`,
      [auth.enteredBy, parsedId],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order could not be completed' };
    }
    await syncICSaleFundLedger(parsedId);
    const updated = await fetchICSaleById(parsedId);
    return updated ? { success: true, data: updated } : { success: false, error: 'Order not found' };
  } catch (err: unknown) {
    logger.error({ err, id }, 'Validation error in adminCompleteByHandOrderAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/** Admin reopens a completed By Hand order back to pending completion. */
export async function adminReopenByHandOrderAction(id: string, branchSlug?: string): Promise<DbActionResult<ICSale>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const auth = await assertAdminRole(branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };
    const modCheck = await assertAdminCanModifySale(parsedId);
    if ('error' in modCheck) return { success: false, error: modCheck.error };

    const sale = await fetchICSaleById(parsedId);
    if (!sale) return { success: false, error: 'Order not found' };
    if (!isByHandSale(sale)) return { success: false, error: 'Only By Hand orders can use this action' };
    if (normalizeOrderStatus(sale.orderStatus) !== 'completed') {
      return { success: false, error: 'Only completed By Hand orders can be reopened' };
    }

    const res = await query(
      `UPDATE ic_sales
       SET order_status = 'accepted',
           collected_units = 0,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $1
       WHERE id = $2
         AND transaction_type = 'by_hand'
         AND order_status = 'completed'
       RETURNING id`,
      [auth.enteredBy, parsedId],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order could not be reopened' };
    }
    await removeICSaleFundLedger(parsedId);
    const updated = await fetchICSaleById(parsedId);
    return updated ? { success: true, data: updated } : { success: false, error: 'Order not found' };
  } catch (err: unknown) {
    logger.error({ err, id }, 'Validation error in adminReopenByHandOrderAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/**
 * Admin sets whether a customer order is fulfilled by branch or HQ admin.
 */
export async function adminSetFulfillmentHandlerAction(
  id: string,
  handler: 'hq_admin' | 'branch',
  branchSlug?: string,
): Promise<DbActionResult<ICSale>> {
  try {
    const parsed = z
      .object({
        id: z.string().min(1),
        handler: z.enum(['hq_admin', 'branch']),
      })
      .parse({ id, handler });
    const auth = await assertAdminRole(branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };

    const sale = await fetchICSaleById(parsed.id);
    if (!sale) return { success: false, error: 'Order not found' };
    if (!sale.orderCustomerId) {
      return { success: false, error: 'Only customer orders can be assigned branch or admin handling' };
    }
    if (normalizeOrderStatus(sale.orderStatus) === 'pending_branch_review') {
      return {
        success: false,
        error: 'Branch manager must approve this order before assigning handling',
      };
    }
    if (normalizeOrderStatus(sale.orderStatus) !== 'pending') {
      return {
        success: false,
        error: 'Handling can only be changed while the order is pending',
      };
    }

    const res = await query(
      `UPDATE ic_sales
       SET fulfillment_handler = $1,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $2
       WHERE id = $3
       RETURNING id`,
      [parsed.handler, auth.enteredBy, parsed.id],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order not found' };
    }
    const updated = await fetchICSaleById(parsed.id);
    return updated ? { success: true, data: updated } : { success: false, error: 'Order not found' };
  } catch (err: unknown) {
    logger.error({ err, id, handler }, 'Validation error in adminSetFulfillmentHandlerAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/** Branch manager accepts a branch-handled order and assigns a branch warehouse. */
export async function branchAcceptICSaleAction(
  id: string,
  warehouseId: string,
  branchSlug?: string,
): Promise<DbActionResult<ICSale>> {
  try {
    const parsed = z.object({ id: z.string().min(1), warehouseId: z.string().min(1) }).parse({ id, warehouseId });
    const auth = await assertBranchManagerHandlesSale(parsed.id, branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };

    const whCheck = await assertBranchWarehouseForBranch(parsed.warehouseId, auth.branchId);
    if (whCheck) return { success: false, error: whCheck.error };

    const res = await query(
      `UPDATE ic_sales
       SET warehouse_id = $1,
           order_status = 'accepted',
           rejection_remarks = NULL,
           delivery_agent_id = NULL,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $2
       WHERE id = $3
         AND fulfillment_handler = 'branch'
         AND order_status = 'pending'
       RETURNING id`,
      [parsed.warehouseId, auth.updatedBy, parsed.id],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order not found or not in pending status' };
    }
    const updated = await fetchICSaleById(parsed.id);
    return updated ? { success: true, data: updated } : { success: false, error: 'Order not found' };
  } catch (err: unknown) {
    logger.error({ err, id, warehouseId }, 'Validation error in branchAcceptICSaleAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/** Branch manager reassigns warehouse on a branch-handled order after WH/DA rejection. */
export async function branchReassignICSaleWarehouseAction(
  id: string,
  warehouseId: string,
  branchSlug?: string,
): Promise<DbActionResult<ICSale>> {
  try {
    const parsed = z.object({ id: z.string().min(1), warehouseId: z.string().min(1) }).parse({ id, warehouseId });
    const auth = await assertBranchManagerHandlesSale(parsed.id, branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };

    const whCheck = await assertBranchWarehouseForBranch(parsed.warehouseId, auth.branchId);
    if (whCheck) return { success: false, error: whCheck.error };

    const res = await query(
      `UPDATE ic_sales
       SET warehouse_id = $1,
           order_status = 'accepted',
           rejection_remarks = NULL,
           delivery_agent_id = NULL,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $2
       WHERE id = $3
         AND fulfillment_handler = 'branch'
         AND order_status IN ('wh_rejected', 'da_rejected')
       RETURNING id`,
      [parsed.warehouseId, auth.updatedBy, parsed.id],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order cannot be reassigned in its current status' };
    }
    const updated = await fetchICSaleById(parsed.id);
    return updated ? { success: true, data: updated } : { success: false, error: 'Order not found' };
  } catch (err: unknown) {
    logger.error({ err, id, warehouseId }, 'Validation error in branchReassignICSaleWarehouseAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/** Branch manager marks a branch-handled order as completed (direct fulfillment). */
export async function branchCompleteHandledOrderAction(
  id: string,
  branchSlug?: string,
): Promise<DbActionResult<ICSale>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const auth = await assertBranchManagerHandlesSale(parsedId, branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };
    if (!auth.sale.warehouseId) {
      return { success: false, error: 'Assign a warehouse before completing' };
    }
    if (normalizeOrderStatus(auth.sale.orderStatus) !== 'accepted') {
      return { success: false, error: 'Order must be accepted before completing' };
    }

    const res = await query(
      `UPDATE ic_sales
       SET order_status = 'completed',
           collected_units = units,
           payment_status = 'paid',
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $1
       WHERE id = $2
         AND fulfillment_handler = 'branch'
         AND order_status = 'accepted'
       RETURNING id`,
      [auth.updatedBy, parsedId],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order could not be completed' };
    }
    await syncICSaleFundLedger(parsedId);
    const updated = await fetchICSaleById(parsedId);
    return updated ? { success: true, data: updated } : { success: false, error: 'Order not found' };
  } catch (err: unknown) {
    logger.error({ err, id }, 'Validation error in branchCompleteHandledOrderAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/** Branch manager reopens a completed branch-handled order back to pending completion. */
export async function branchReopenHandledOrderAction(
  id: string,
  branchSlug?: string,
): Promise<DbActionResult<ICSale>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const auth = await assertBranchManagerHandlesSale(parsedId, branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };
    if (normalizeOrderStatus(auth.sale.orderStatus) !== 'completed') {
      return { success: false, error: 'Only completed orders can be reopened' };
    }

    const res = await query(
      `UPDATE ic_sales
       SET order_status = 'accepted',
           collected_units = 0,
           payment_status = 'pending',
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $1
       WHERE id = $2
         AND fulfillment_handler = 'branch'
         AND order_status = 'completed'
       RETURNING id`,
      [auth.updatedBy, parsedId],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order could not be reopened' };
    }
    await removeICSaleFundLedger(parsedId);
    const updated = await fetchICSaleById(parsedId);
    return updated ? { success: true, data: updated } : { success: false, error: 'Order not found' };
  } catch (err: unknown) {
    logger.error({ err, id }, 'Validation error in branchReopenHandledOrderAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/** Branch manager updates a branch-handled order (non-completed). */
export async function branchUpdateHandledICSaleAction(
  id: string,
  updates: Partial<ICSaleContentFields>,
  branchSlug?: string,
): Promise<DbActionResult<ICSale>> {
  try {
    const parsedId = z.string().min(1).parse(id);
    const parsedUpdates = updateSaleSchema.parse(updates);
    const auth = await assertBranchManagerHandlesSale(parsedId, branchSlug);
    if ('error' in auth) return { success: false, error: auth.error };

    const status = normalizeOrderStatus(auth.sale.orderStatus);
    if (status === 'completed' || status === 'cancelled') {
      return { success: false, error: 'Completed or cancelled orders cannot be edited' };
    }

    const keys = Object.keys(parsedUpdates);
    if (keys.length === 0) return { success: false, error: 'No fields to update' };

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const key of keys) {
      const dbKey = SALE_COLUMNS[key];
      if (!dbKey || key === 'fulfillmentHandler') continue;
      setClauses.push(`${dbKey} = $${idx}`);
      let val = (parsedUpdates as Record<string, unknown>)[key];
      if (key.endsWith('Id') && val === '') val = null;
      values.push(val);
      idx++;
    }
    if (setClauses.length === 0) return { success: false, error: 'No valid fields to update' };
    values.push(parsedId);

    const res = await query(
      `UPDATE ic_sales SET ${setClauses.join(', ')} WHERE id = $${idx} AND fulfillment_handler = 'branch' RETURNING *`,
      values,
    );
    if (res.rows.length === 0) return { success: false, error: 'Order not found' };
    return { success: true, data: mapICSaleRow(res.rows[0]) };
  } catch (err: unknown) {
    logger.error({ err, id, updates }, 'Validation error in branchUpdateHandledICSaleAction');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/**
 * Auto-complete By Hand orders still pending at end of UAE business day (10pm GST).
 * Invoked by the cron route — not for direct client use.
 */
export async function autoCompleteByHandOrdersCronAction(): Promise<DbActionResult<{ completedCount: number }>> {
  try {
    const res = await query(
      `UPDATE ic_sales
       SET order_status = 'completed',
           collected_units = units,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = 'cron:auto-complete-by-hand'
       WHERE transaction_type = 'by_hand'
         AND order_status = 'accepted'
         AND warehouse_id IS NOT NULL
       RETURNING id`,
    );
    for (const row of res.rows) {
      await syncICSaleFundLedger(String(row.id));
    }
    return { success: true, data: { completedCount: res.rowCount ?? 0 } };
  } catch (error: unknown) {
    logger.error({ error }, 'Error in autoCompleteByHandOrdersCronAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function dbGetCustomerCurrencyAction(
  opts: string | { customerId?: string | null; customerName?: string | null },
): Promise<DbActionResult<string>> {
  try {
    const customerId = typeof opts === 'string' ? null : (opts.customerId?.trim() || null);
    const customerName = typeof opts === 'string' ? opts.trim() : (opts.customerName?.trim() || null);
    if (!customerId && !customerName) {
      return { success: false, error: 'Customer id or name is required' };
    }
    const res = await query(
      `SELECT COALESCE(
         (
           SELECT g.currency
           FROM ic_rate_group_customers c
           JOIN customers cust ON c.customer_id = cust.id
           JOIN ic_rate_groups g ON c.group_id = g.id
           WHERE ($1::text IS NOT NULL AND cust.id = $1)
              OR ($1::text IS NULL AND $2::text IS NOT NULL AND LOWER(cust.name) = LOWER($2))
           LIMIT 1
         ),
         (
           SELECT g.currency
           FROM ic_rate_group_branches b
           JOIN branches br ON b.branch_id = br.id
           JOIN ic_rate_groups g ON b.group_id = g.id
           WHERE $2::text IS NOT NULL AND LOWER(br.name) = LOWER($2)
           LIMIT 1
         ),
         'Currency'
       ) AS currency`,
      [customerId, customerName]
    );
    const currency = res.rows.length > 0 ? res.rows[0].currency : 'Currency';
    return { success: true, data: currency };
  } catch (error: unknown) {
    logger.error({ error, opts }, 'Error in dbGetCustomerCurrencyAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

/**
 * Resolves a customer's phone number for messaging, matching by customer id
 * first (most reliable) and falling back to a case-insensitive name match.
 */
export async function dbGetCustomerPhoneAction(
  opts: { customerId?: string | null; customerName?: string | null }
): Promise<DbActionResult<string | null>> {
  try {
    const customerId = opts.customerId?.trim() || null;
    const customerName = opts.customerName?.trim() || null;
    if (!customerId && !customerName) {
      return { success: true, data: null };
    }
    const res = await query(
      `SELECT phone
         FROM customers
        WHERE ($1::text IS NOT NULL AND id = $1)
           OR ($1::text IS NULL AND $2::text IS NOT NULL AND LOWER(name) = LOWER($2))
        ORDER BY (id = $1) DESC
        LIMIT 1`,
      [customerId, customerName]
    );
    const phone = res.rows.length > 0 && res.rows[0].phone ? String(res.rows[0].phone) : null;
    return { success: true, data: phone };
  } catch (error: unknown) {
    logger.error({ error, opts }, 'Error in dbGetCustomerPhoneAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}
