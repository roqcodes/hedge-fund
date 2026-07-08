'use server';

import { query, pool } from '@/lib/db';
import { scaleSaleFinancials } from '@/lib/icTransfer/saleUnits';
import { adjustWarehouseStock, logWarehouseStockTransaction } from '@/lib/warehouse/stockDb';
import { getSessionUser } from '@/lib/auth';
import { createCognitoUserAction, deleteCognitoUserAction } from './cognitoActions';
import { logger } from '@/lib/logger';
import {
  createDeliveryAgentSchema,
  updateDeliveryAgentSchema,
  deleteDeliveryAgentSchema,
  createWarehouseGroupSchema,
  deleteWarehouseGroupSchema,
  assignOrderToAgentSchema,
  completeDeliverySchema,
  fetchWarehouseOrdersSchema,
  warehouseActionSchema,
  fetchDeliveryAgentOrdersSchema,
} from '@/lib/validations/icTransfer';
import { z } from 'zod';
import { SQL_EXCLUDE_BY_HAND_FROM_WAREHOUSE } from '@/lib/icTransfer/byHand';

/** Returns today's ISO date string (YYYY-MM-DD) in UTC. */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Fetch all orders for a warehouse, optionally scoped to a date range.
 * Defaults to today so the initial page load never scans the full history.
 */
export async function fetchWarehouseOrders(
  warehouseId: string,
  options?: { dateFrom?: string; dateTo?: string },
) {
  try {
    const parsed = fetchWarehouseOrdersSchema.parse({
      warehouseId,
      dateFrom: options?.dateFrom,
      dateTo: options?.dateTo,
    });
    const dateFrom = parsed.dateFrom ?? todayISO();
    const dateTo   = parsed.dateTo   ?? todayISO();

    // dateTo is inclusive: advance by 1 day for < comparison
    const dateToExclusive = new Date(dateTo);
    dateToExclusive.setDate(dateToExclusive.getDate() + 1);
    const dateToStr = dateToExclusive.toISOString().slice(0, 10);

    const result = await query(
      `
      SELECT
        s.*,
        a.name            AS delivery_agent_name,
        a.account_id      AS delivery_agent_account_id,
        a.email           AS delivery_agent_email
      FROM ic_sales s
      LEFT JOIN ic_delivery_agents a ON s.delivery_agent_id = a.id
      WHERE s.warehouse_id = $1
        AND ${SQL_EXCLUDE_BY_HAND_FROM_WAREHOUSE}
        AND s.created_at >= $2
        AND s.created_at <  $3
      ORDER BY
        CASE s.priority WHEN 'High' THEN 0 WHEN 'Normal' THEN 1 WHEN 'Low' THEN 2 ELSE 1 END ASC,
        s.created_at DESC
      `,
      [parsed.warehouseId, dateFrom, dateToStr],
    );
    return { success: true, data: result.rows };
  } catch (error: unknown) {
    logger.error({ error, warehouseId }, 'Error in fetchWarehouseOrders');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

/** All non-delivered, non-WH-rejected orders — used for reserved stock KPIs. */
export async function fetchWarehouseUndeliveredOrders(warehouseId: string) {
  try {
    const parsedId = z.string().min(1).parse(warehouseId);
    const result = await query(
      `
      SELECT
        s.*,
        a.name            AS delivery_agent_name,
        a.account_id      AS delivery_agent_account_id,
        a.email           AS delivery_agent_email
      FROM ic_sales s
      LEFT JOIN ic_delivery_agents a ON s.delivery_agent_id = a.id
      WHERE s.warehouse_id = $1
        AND ${SQL_EXCLUDE_BY_HAND_FROM_WAREHOUSE}
        AND s.order_status <> 'completed'
        AND s.order_status <> 'wh_rejected'
      ORDER BY s.created_at DESC
      `,
      [parsedId],
    );
    return { success: true, data: result.rows };
  } catch (error: unknown) {
    logger.error({ error, warehouseId }, 'Error in fetchWarehouseUndeliveredOrders');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function fetchDeliveryAgents(warehouseId: string) {
  try {
    const parsedId = z.string().min(1).parse(warehouseId);
    const result = await query(
      `
      SELECT a.*, g.name as group_name, r.name as region_name
      FROM ic_delivery_agents a
      LEFT JOIN ic_warehouse_groups g ON a.group_id = g.id
      LEFT JOIN ic_regions r ON a.region_id = r.id
      WHERE a.warehouse_id = $1
      ORDER BY a.created_at DESC
      `,
      [parsedId],
    );
    return { success: true, data: result.rows };
  } catch (error: unknown) {
    logger.error({ error, warehouseId }, 'Error in fetchDeliveryAgents');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function createDeliveryAgent(data: {
  warehouse_id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  group_id?: string;
  region_id?: string;
  branchSlug: string;
}) {
  try {
    const parsed = createDeliveryAgentSchema.parse(data);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const user = await getSessionUser(parsed.branchSlug);
      if (!user) throw new Error('Unauthorized');

      // 1. Create Cognito User
      const cognitoResult = await createCognitoUserAction(
        parsed.email,
        parsed.name,
        `delivery_${parsed.warehouse_id.slice(0, 8)}`,
        user.branchId || '',
        parsed.password || 'Aibak123!',
        parsed.branchSlug,
      );

      if (!cognitoResult.success) {
        throw new Error(`Failed to create user account: ${cognitoResult.error}`);
      }

      // 2. Generate next account ID safely — advisory lock serializes concurrent creates;
      //    FOR UPDATE cannot be used with aggregate functions in PostgreSQL.
      await client.query('SELECT pg_advisory_xact_lock($1)', [7423901]);
      const accountIdResult = await client.query(
        `SELECT COALESCE(
           MAX(CAST(SUBSTRING(account_id FROM 5) AS INTEGER)), 0
         ) + 1 AS next_id
         FROM ic_delivery_agents
         WHERE account_id ~ '^USER[0-9]+$'`,
      );
      const nextId = parseInt(accountIdResult.rows[0].next_id) || 1;
      const accountId = `USER${nextId.toString().padStart(4, '0')}`;

      const result = await client.query(
        `
        INSERT INTO ic_delivery_agents (warehouse_id, account_id, name, email, phone, group_id, region_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        `,
        [
          parsed.warehouse_id,
          accountId,
          parsed.name,
          parsed.email,
          parsed.phone || null,
          parsed.group_id || null,
          parsed.region_id || null,
        ],
      );

      await client.query('COMMIT');
      return { success: true, data: result.rows[0] };
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      logger.error({ error, data }, 'Error in createDeliveryAgent execution');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    logger.error({ err, data }, 'Validation error in createDeliveryAgent');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

export async function deleteDeliveryAgent(id: string, email: string) {
  try {
    const parsed = deleteDeliveryAgentSchema.parse({ id, email });
    try {
      const cognitoResult = await deleteCognitoUserAction(parsed.email);
      if (!cognitoResult.success) {
        logger.warn(
          { error: cognitoResult.error, email: parsed.email },
          'Failed to delete Cognito user, but proceeding with DB deletion',
        );
      }

      await query(`DELETE FROM ic_delivery_agents WHERE id = $1`, [parsed.id]);
      return { success: true };
    } catch (error: unknown) {
      logger.error({ error, id, email }, 'Error in deleteDeliveryAgent execution');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    }
  } catch (err: unknown) {
    logger.error({ err, id, email }, 'Validation error in deleteDeliveryAgent');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

export async function updateDeliveryAgent(data: {
  id: string;
  email: string;
  name: string;
  phone?: string;
  region_id?: string;
  group_id?: string;
  password?: string;
  branchSlug: string;
}) {
  try {
    const parsed = updateDeliveryAgentSchema.parse(data);
    const user = await getSessionUser(parsed.branchSlug);
    if (!user) throw new Error('Unauthorized');

    const { updateCognitoUserAttributesAction, resetCognitoUserPasswordAction } = await import(
      './cognitoActions'
    );
    await updateCognitoUserAttributesAction(parsed.email, parsed.name, parsed.branchSlug);

    if (parsed.password) {
      const resetRes = await resetCognitoUserPasswordAction(
        parsed.email,
        parsed.password,
        parsed.branchSlug,
      );
      if (!resetRes.success) {
        throw new Error(`Failed to reset password: ${resetRes.error}`);
      }
    }

    const result = await query(
      `
      UPDATE ic_delivery_agents
      SET name = $1, phone = $2, group_id = $3, region_id = $4
      WHERE id = $5
      RETURNING *
      `,
      [
        parsed.name,
        parsed.phone || null,
        parsed.group_id || null,
        parsed.region_id || null,
        parsed.id,
      ],
    );

    return { success: true, data: result.rows[0] };
  } catch (error: unknown) {
    logger.error({ error, data }, 'Error in updateDeliveryAgent');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function fetchWarehouseGroups(warehouseId: string) {
  try {
    const parsedId = z.string().min(1).parse(warehouseId);
    const result = await query(
      `SELECT * FROM ic_warehouse_groups WHERE warehouse_id = $1 ORDER BY name ASC`,
      [parsedId],
    );
    return { success: true, data: result.rows };
  } catch (error: unknown) {
    logger.error({ error, warehouseId }, 'Error in fetchWarehouseGroups');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function createWarehouseGroup(
  warehouseId: string,
  name: string,
  description?: string,
) {
  try {
    const parsed = createWarehouseGroupSchema.parse({ warehouse_id: warehouseId, name, description });
    const result = await query(
      `INSERT INTO ic_warehouse_groups (warehouse_id, name, description) VALUES ($1, $2, $3) RETURNING *`,
      [parsed.warehouse_id, parsed.name, parsed.description || null],
    );
    return { success: true, data: result.rows[0] };
  } catch (error: unknown) {
    logger.error({ error, warehouseId, name }, 'Error in createWarehouseGroup');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function deleteWarehouseGroup(id: string) {
  try {
    const parsed = deleteWarehouseGroupSchema.parse({ id });
    await query(`DELETE FROM ic_warehouse_groups WHERE id = $1`, [parsed.id]);
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, id }, 'Error in deleteWarehouseGroup');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function assignOrderToAgent(orderId: string, agentId: string | null) {
  try {
    const parsed = assignOrderToAgentSchema.parse({ orderId, agentId });
    const res = await query(
      `UPDATE ic_sales
       SET delivery_agent_id = $1,
           order_status = CASE
             WHEN $1 IS NOT NULL AND order_status IN ('accepted', 'da_rejected') THEN 'wh_processing'
             ELSE order_status
           END,
           status_updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
         AND transaction_type IS DISTINCT FROM 'by_hand'`,
      [parsed.agentId, parsed.orderId],
    );
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, orderId, agentId }, 'Error in assignOrderToAgent');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

/** Warehouse manager accepts order and assigns a delivery agent. */
export async function warehouseAcceptOrder(orderId: string, agentId: string, updatedBy: string) {
  try {
    const parsed = warehouseActionSchema.parse({ orderId, agentId, updatedBy });
    if (!parsed.agentId) {
      return { success: false, error: 'Delivery agent is required' };
    }
    const res = await query(
      `UPDATE ic_sales
       SET order_status = 'wh_processing',
           delivery_agent_id = $1,
           rejection_remarks = NULL,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $2
       WHERE id = $3
         AND order_status IN ('accepted', 'da_rejected')
         AND transaction_type IS DISTINCT FROM 'by_hand'
       RETURNING id`,
      [parsed.agentId, parsed.updatedBy, parsed.orderId],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order not found or not awaiting warehouse action' };
    }
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, orderId, agentId, updatedBy }, 'Error in warehouseAcceptOrder');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

/** Warehouse manager rejects an order with remarks. */
export async function warehouseRejectOrder(orderId: string, remarks: string, updatedBy: string) {
  try {
    const parsed = warehouseActionSchema.parse({ orderId, remarks, updatedBy });
    if (!parsed.remarks || !parsed.remarks.trim()) {
      return { success: false, error: 'Rejection reason is required' };
    }
    const res = await query(
      `UPDATE ic_sales
       SET order_status = 'wh_rejected',
           rejection_remarks = $1,
           delivery_agent_id = NULL,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $2
       WHERE id = $3
         AND order_status IN ('accepted', 'wh_processing', 'da_rejected')
         AND transaction_type IS DISTINCT FROM 'by_hand'
       RETURNING id`,
      [parsed.remarks.trim(), parsed.updatedBy, parsed.orderId],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order cannot be rejected in its current status' };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Delivery agent rejects an assigned order with remarks. */
export async function deliveryAgentRejectOrder(orderId: string, remarks: string, updatedBy: string) {
  try {
    const parsed = warehouseActionSchema.parse({ orderId, remarks, updatedBy });
    if (!parsed.remarks || !parsed.remarks.trim()) {
      return { success: false, error: 'Rejection reason is required' };
    }
    const res = await query(
      `UPDATE ic_sales
       SET order_status = 'da_rejected',
           rejection_remarks = $1,
           delivery_agent_id = NULL,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $2
       WHERE id = $3
         AND order_status = 'wh_processing'
         AND transaction_type IS DISTINCT FROM 'by_hand'
       RETURNING id`,
      [parsed.remarks.trim(), parsed.updatedBy, parsed.orderId],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order cannot be rejected in its current status' };
    }
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, orderId, remarks, updatedBy }, 'Error in deliveryAgentRejectOrder');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function completeDeliveryWithUnits(
  orderId: string,
  collectedUnits: number,
  deliveryImageUrl?: string | null,
  updatedBy?: string,
) {
  try {
    const parsed = completeDeliverySchema.parse({
      orderId,
      collectedUnits,
      imageUrl: deliveryImageUrl,
      updatedBy,
    });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderRes = await client.query(`SELECT * FROM ic_sales WHERE id = $1 FOR UPDATE`, [parsed.orderId]);
      if (orderRes.rows.length === 0) {
        throw new Error('Order not found');
      }
      const order = orderRes.rows[0];

      if (order.transaction_type === 'by_hand') {
        throw new Error('By Hand orders are fulfilled by admin only');
      }

      if (order.order_status !== 'wh_processing') {
        throw new Error('Order is not ready for delivery completion');
      }

      const totalUnits = Number(order.units);
      const delivered = Number(parsed.collectedUnits);
      if (!Number.isFinite(delivered) || delivered <= 0 || delivered > totalUnits) {
        throw new Error('Delivered units must be between 1 and ' + totalUnits);
      }

      const conversionRate = order.conversion_rate != null ? Number(order.conversion_rate) : 1;
      const orderCurrency = order.currency || 'AED';

      const unitRate = Number(order.unit_rate);
      const serviceCharge = Number(order.service_charge || 0);
      const deliveredFinancials = scaleSaleFinancials(totalUnits, delivered, unitRate, serviceCharge, conversionRate);
      const remaining = totalUnits - delivered;
      const isFullDelivery = remaining <= 0.0001;

      const warehouseId = order.warehouse_id as string | null;
      let sendProofToCustomer = true;
      if (warehouseId) {
        const whRes = await client.query(
          `SELECT send_delivery_proof_to_customer FROM ic_warehouses WHERE id = $1`,
          [warehouseId],
        );
        if (whRes.rows.length > 0) {
          sendProofToCustomer = whRes.rows[0].send_delivery_proof_to_customer !== false;
        }
      }

      const finalOrderStatus = sendProofToCustomer ? 'completed' : 'delivery_pending_admin';
      const finalPaymentStatus = sendProofToCustomer ? 'paid' : 'pending';

      await client.query(
        `UPDATE ic_sales SET
          units = $1,
          converted_amount = $2,
          aed_amount = $3,
          service_charge = $4,
          collected_units = $1,
          order_status = $5,
          payment_status = $6,
          delivery_image_url = $7,
          status_updated_at = CURRENT_TIMESTAMP,
          status_updated_by = $8
         WHERE id = $9`,
        [
          deliveredFinancials.units,
          deliveredFinancials.convertedAmount,
          deliveredFinancials.aedAmount,
          deliveredFinancials.serviceCharge,
          finalOrderStatus,
          finalPaymentStatus,
          parsed.imageUrl || null,
          parsed.updatedBy || 'delivery_agent',
          parsed.orderId,
        ],
      );

      let remainderSaleId: string | null = null;
      const agentId = order.delivery_agent_id as string | null;
      if (!isFullDelivery) {
        const remainderFinancials = scaleSaleFinancials(totalUnits, remaining, unitRate, serviceCharge, conversionRate);
        const remainderStatus = agentId ? 'wh_processing' : 'accepted';
        const insertRes = await client.query(
          `INSERT INTO ic_sales (
            customer_name, order_customer_name, order_customer_id,
            entered_by, entered_by_name, entered_by_user_id,
            warehouse_id, transaction_type, units, unit_rate, converted_amount, aed_amount,
            address, image_url, service_charge, priority, delivery_agent_id, order_status,
            payment_status, derived_from_sale_id, collected_units,
            status_updated_at, status_updated_by, conversion_rate, currency
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, CURRENT_TIMESTAMP, $22, $23, $24)
          RETURNING id`,
          [
            order.customer_name,
            order.order_customer_name || null,
            order.order_customer_id || null,
            order.entered_by,
            order.entered_by_name,
            order.entered_by_user_id,
            order.warehouse_id,
            order.transaction_type,
            remainderFinancials.units,
            unitRate,
            remainderFinancials.convertedAmount,
            remainderFinancials.aedAmount,
            order.address,
            order.image_url,
            remainderFinancials.serviceCharge,
            order.priority || 'Normal',
            agentId,
            remainderStatus,
            'pending',
            parsed.orderId,
            0,
            parsed.updatedBy || 'delivery_agent',
            conversionRate,
            orderCurrency,
          ],
        );
        remainderSaleId = insertRes.rows[0].id;
      }

      if (warehouseId) {
        await logWarehouseStockTransaction(
          client,
          warehouseId,
          'clear',
          delivered,
          'sale',
          parsed.orderId,
        );
        await adjustWarehouseStock(client, warehouseId, -delivered);
      }

      await client.query('COMMIT');
      const awaitingAdmin = finalOrderStatus === 'delivery_pending_admin';
      return {
        success: true,
        remainderSaleId,
        message: remainderSaleId
          ? agentId
            ? `Delivered ${delivered} units. Remaining ${remaining} units assigned to you as a new order.${
                awaitingAdmin ? ' Awaiting admin verification.' : ''
              }`
            : `Delivered ${delivered} units. Remaining ${remaining} units created as a new order.${
                awaitingAdmin ? ' Awaiting admin verification.' : ''
              }`
          : awaitingAdmin
            ? `Delivered all ${delivered} units. Awaiting admin verification.`
            : `Delivered all ${delivered} units.`,
      };
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      logger.error({ error, orderId, collectedUnits }, 'Error executing completeDeliveryWithUnits');
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    logger.error({ err, orderId, collectedUnits }, 'Validation error in completeDeliveryWithUnits');
    return { success: false, error: err instanceof Error ? err.message : 'Invalid data format' };
  }
}

/**
 * Fetch orders assigned to a specific delivery agent, scoped to a date range.
 * Defaults to today.
 */
export async function fetchDeliveryAgentOrders(
  email: string,
  options?: { dateFrom?: string; dateTo?: string },
) {
  try {
    const parsed = fetchDeliveryAgentOrdersSchema.parse({
      email,
      dateFrom: options?.dateFrom,
      dateTo: options?.dateTo,
    });
    const dateFrom = parsed.dateFrom ?? todayISO();
    const dateTo   = parsed.dateTo   ?? todayISO();

    const dateToExclusive = new Date(dateTo);
    dateToExclusive.setDate(dateToExclusive.getDate() + 1);
    const dateToStr = dateToExclusive.toISOString().slice(0, 10);

    // 1. Find the agent
    const agentRes = await query(
      `SELECT id, warehouse_id FROM ic_delivery_agents WHERE email = $1 LIMIT 1`,
      [parsed.email],
    );
    if (agentRes.rows.length === 0) {
      return { success: false, error: 'Delivery agent not found' };
    }
    const agentId    = agentRes.rows[0].id;
    const warehouseId = agentRes.rows[0].warehouse_id;

    // 2. Fetch assigned orders + orders this agent rejected (agent is cleared on reject)
    const result = await query(
      `
      SELECT
        s.*,
        a.name            AS delivery_agent_name,
        a.account_id      AS delivery_agent_account_id
      FROM ic_sales s
      LEFT JOIN ic_delivery_agents a ON s.delivery_agent_id = a.id
      WHERE s.created_at >= $2
        AND s.created_at <  $3
        AND ${SQL_EXCLUDE_BY_HAND_FROM_WAREHOUSE}
        AND (
          s.delivery_agent_id = $1
          OR (
            s.order_status = 'da_rejected'
            AND LOWER(s.status_updated_by) = LOWER($4)
            AND s.warehouse_id = $5
          )
        )
      ORDER BY
        CASE s.priority WHEN 'High' THEN 0 WHEN 'Normal' THEN 1 WHEN 'Low' THEN 2 ELSE 1 END ASC,
        s.created_at DESC
      `,
      [agentId, dateFrom, dateToStr, parsed.email, warehouseId],
    );
    return { success: true, data: result.rows, agentId, warehouseId };
  } catch (error: unknown) {
    logger.error({ error, email }, 'Error in fetchDeliveryAgentOrders');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}
