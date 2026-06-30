'use server';

import { query, pool } from '@/lib/db';
import { scaleSaleFinancials } from '@/lib/icTransfer/saleUnits';
import { getSessionUser } from '@/lib/auth';
import { createCognitoUserAction, deleteCognitoUserAction } from './cognitoActions';

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
    const dateFrom = options?.dateFrom ?? todayISO();
    const dateTo   = options?.dateTo   ?? todayISO();

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
        AND s.created_at >= $2
        AND s.created_at <  $3
      ORDER BY
        CASE s.priority WHEN 'High' THEN 0 WHEN 'Normal' THEN 1 WHEN 'Low' THEN 2 ELSE 1 END ASC,
        s.created_at DESC
      `,
      [warehouseId, dateFrom, dateToStr],
    );
    return { success: true, data: result.rows };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchDeliveryAgents(warehouseId: string) {
  try {
    const result = await query(
      `
      SELECT a.*, g.name as group_name, r.name as region_name
      FROM ic_delivery_agents a
      LEFT JOIN ic_warehouse_groups g ON a.group_id = g.id
      LEFT JOIN ic_regions r ON a.region_id = r.id
      WHERE a.warehouse_id = $1
      ORDER BY a.created_at DESC
      `,
      [warehouseId],
    );
    return { success: true, data: result.rows };
  } catch (error: any) {
    return { success: false, error: error.message };
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
    const user = await getSessionUser(data.branchSlug);
    if (!user) throw new Error('Unauthorized');

    // 1. Create Cognito User
    const cognitoResult = await createCognitoUserAction(
      data.email,
      data.name,
      `delivery_${data.warehouse_id.slice(0, 8)}`,
      user.branchId || '',
      data.password || 'Aibak123!',
      data.branchSlug,
    );

    if (!cognitoResult.success) {
      throw new Error(`Failed to create user account: ${cognitoResult.error}`);
    }

    // 2. Insert into DB
    const accountIdResult = await query(`SELECT COUNT(*) as count FROM ic_delivery_agents`);
    const nextId = parseInt(accountIdResult.rows[0].count) + 1;
    const accountId = `USER${nextId.toString().padStart(4, '0')}`;

    const result = await query(
      `
      INSERT INTO ic_delivery_agents (warehouse_id, account_id, name, email, phone, group_id, region_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        data.warehouse_id,
        accountId,
        data.name,
        data.email,
        data.phone || null,
        data.group_id || null,
        data.region_id || null,
      ],
    );

    return { success: true, data: result.rows[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteDeliveryAgent(id: string, email: string) {
  try {
    const cognitoResult = await deleteCognitoUserAction(email);
    if (!cognitoResult.success) {
      console.warn(
        'Failed to delete Cognito user, but proceeding with DB deletion',
        cognitoResult.error,
      );
    }

    await query(`DELETE FROM ic_delivery_agents WHERE id = $1`, [id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
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
    const user = await getSessionUser(data.branchSlug);
    if (!user) throw new Error('Unauthorized');

    const { updateCognitoUserAttributesAction, resetCognitoUserPasswordAction } = await import(
      './cognitoActions'
    );
    await updateCognitoUserAttributesAction(data.email, data.name, data.branchSlug);

    if (data.password) {
      const resetRes = await resetCognitoUserPasswordAction(
        data.email,
        data.password,
        data.branchSlug,
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
        data.name,
        data.phone || null,
        data.group_id || null,
        data.region_id || null,
        data.id,
      ],
    );

    return { success: true, data: result.rows[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchWarehouseGroups(warehouseId: string) {
  try {
    const result = await query(
      `SELECT * FROM ic_warehouse_groups WHERE warehouse_id = $1 ORDER BY name ASC`,
      [warehouseId],
    );
    return { success: true, data: result.rows };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createWarehouseGroup(
  warehouseId: string,
  name: string,
  description?: string,
) {
  try {
    const result = await query(
      `INSERT INTO ic_warehouse_groups (warehouse_id, name, description) VALUES ($1, $2, $3) RETURNING *`,
      [warehouseId, name, description || null],
    );
    return { success: true, data: result.rows[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteWarehouseGroup(id: string) {
  try {
    await query(`DELETE FROM ic_warehouse_groups WHERE id = $1`, [id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignOrderToAgent(orderId: string, agentId: string | null) {
  try {
    await query(
      `UPDATE ic_sales
       SET delivery_agent_id = $1,
           order_status = CASE
             WHEN $1 IS NOT NULL AND order_status IN ('accepted', 'da_rejected') THEN 'wh_processing'
             ELSE order_status
           END,
           status_updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [agentId, orderId],
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Warehouse manager accepts order and assigns a delivery agent. */
export async function warehouseAcceptOrder(orderId: string, agentId: string, updatedBy: string) {
  if (!agentId) {
    return { success: false, error: 'Delivery agent is required' };
  }
  try {
    const res = await query(
      `UPDATE ic_sales
       SET order_status = 'wh_processing',
           delivery_agent_id = $1,
           rejection_remarks = NULL,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $2
       WHERE id = $3
         AND order_status IN ('accepted', 'da_rejected')
       RETURNING id`,
      [agentId, updatedBy, orderId],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order not found or not awaiting warehouse action' };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Warehouse manager rejects an order with remarks. */
export async function warehouseRejectOrder(orderId: string, remarks: string, updatedBy: string) {
  if (!remarks.trim()) {
    return { success: false, error: 'Rejection reason is required' };
  }
  try {
    const res = await query(
      `UPDATE ic_sales
       SET order_status = 'wh_rejected',
           rejection_remarks = $1,
           delivery_agent_id = NULL,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $2
       WHERE id = $3
         AND order_status IN ('accepted', 'wh_processing', 'da_rejected')
       RETURNING id`,
      [remarks.trim(), updatedBy, orderId],
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
  if (!remarks.trim()) {
    return { success: false, error: 'Rejection reason is required' };
  }
  try {
    const res = await query(
      `UPDATE ic_sales
       SET order_status = 'da_rejected',
           rejection_remarks = $1,
           delivery_agent_id = NULL,
           status_updated_at = CURRENT_TIMESTAMP,
           status_updated_by = $2
       WHERE id = $3
         AND order_status = 'wh_processing'
       RETURNING id`,
      [remarks.trim(), updatedBy, orderId],
    );
    if (res.rowCount === 0) {
      return { success: false, error: 'Order cannot be rejected in its current status' };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function completeDeliveryWithUnits(
  orderId: string,
  collectedUnits: number,
  deliveryImageUrl?: string | null,
  updatedBy?: string,
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderRes = await client.query(`SELECT * FROM ic_sales WHERE id = $1 FOR UPDATE`, [orderId]);
    if (orderRes.rows.length === 0) {
      throw new Error('Order not found');
    }
    const order = orderRes.rows[0];

    if (order.order_status !== 'wh_processing') {
      throw new Error('Order is not ready for delivery completion');
    }

    const totalUnits = Number(order.units);
    const delivered = Number(collectedUnits);
    if (!Number.isFinite(delivered) || delivered <= 0 || delivered > totalUnits) {
      throw new Error(`Delivered units must be between 1 and ${totalUnits}`);
    }

    const unitRate = Number(order.unit_rate);
    const serviceCharge = Number(order.service_charge || 0);
    const deliveredFinancials = scaleSaleFinancials(totalUnits, delivered, unitRate, serviceCharge);
    const remaining = totalUnits - delivered;
    const isFullDelivery = remaining <= 0.0001;

    await client.query(
      `UPDATE ic_sales SET
        units = $1,
        converted_amount = $2,
        aed_amount = $3,
        service_charge = $4,
        collected_units = $1,
        order_status = 'completed',
        payment_status = 'paid',
        delivery_image_url = $5,
        status_updated_at = CURRENT_TIMESTAMP,
        status_updated_by = $6
       WHERE id = $7`,
      [
        deliveredFinancials.units,
        deliveredFinancials.convertedAmount,
        deliveredFinancials.aedAmount,
        deliveredFinancials.serviceCharge,
        deliveryImageUrl || null,
        updatedBy || 'delivery_agent',
        orderId,
      ],
    );

    let remainderSaleId: string | null = null;
    const agentId = order.delivery_agent_id as string | null;
    if (!isFullDelivery) {
      const remainderFinancials = scaleSaleFinancials(totalUnits, remaining, unitRate, serviceCharge);
      const remainderStatus = agentId ? 'wh_processing' : 'accepted';
      const insertRes = await client.query(
        `INSERT INTO ic_sales (
          customer_name, entered_by, entered_by_name, entered_by_user_id,
          warehouse_id, transaction_type, units, unit_rate, converted_amount, aed_amount,
          address, image_url, service_charge, priority, delivery_agent_id, order_status,
          payment_status, derived_from_sale_id, collected_units,
          status_updated_at, status_updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP, $20)
        RETURNING id`,
        [
          order.customer_name,
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
          orderId,
          0,
          updatedBy || 'delivery_agent',
        ],
      );
      remainderSaleId = insertRes.rows[0].id;
    }

    await client.query('COMMIT');
    return {
      success: true,
      remainderSaleId,
      message: remainderSaleId
        ? agentId
          ? `Delivered ${delivered} units. Remaining ${remaining} units assigned to you as a new order.`
          : `Delivered ${delivered} units. Remaining ${remaining} units created as a new order.`
        : `Delivered all ${delivered} units.`,
    };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  } finally {
    client.release();
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
    const dateFrom = options?.dateFrom ?? todayISO();
    const dateTo   = options?.dateTo   ?? todayISO();

    const dateToExclusive = new Date(dateTo);
    dateToExclusive.setDate(dateToExclusive.getDate() + 1);
    const dateToStr = dateToExclusive.toISOString().slice(0, 10);

    // 1. Find the agent
    const agentRes = await query(
      `SELECT id, warehouse_id FROM ic_delivery_agents WHERE email = $1 LIMIT 1`,
      [email],
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
      [agentId, dateFrom, dateToStr, email, warehouseId],
    );
    return { success: true, data: result.rows, agentId, warehouseId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
