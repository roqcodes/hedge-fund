'use server';

import { query } from '@/lib/db';
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
      ORDER BY s.created_at DESC
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
    await query(`UPDATE ic_sales SET delivery_agent_id = $1 WHERE id = $2`, [agentId, orderId]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  collectedAmount: number,
  deliveryImageUrl?: string | null,
) {
  try {
    await query(
      `UPDATE ic_sales SET delivery_status = $1, collected_amount = $2, delivery_image_url = $3 WHERE id = $4`,
      [status, collectedAmount, deliveryImageUrl || null, orderId],
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
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

    // 2. Fetch assigned orders in date range
    const result = await query(
      `
      SELECT
        s.*,
        a.name            AS delivery_agent_name,
        a.account_id      AS delivery_agent_account_id
      FROM ic_sales s
      LEFT JOIN ic_delivery_agents a ON s.delivery_agent_id = a.id
      WHERE s.delivery_agent_id = $1
        AND s.created_at >= $2
        AND s.created_at <  $3
      ORDER BY s.created_at DESC
      `,
      [agentId, dateFrom, dateToStr],
    );
    return { success: true, data: result.rows, agentId, warehouseId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
