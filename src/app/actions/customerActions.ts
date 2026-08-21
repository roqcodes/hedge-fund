'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import { getSessionUser } from '@/lib/auth';
import { assertStaffWriteAccess } from '@/app/actions/permissionActions';
import { createCustomerCognitoUser, deleteCognitoUserByEmail, resetCustomerCognitoPasswordAction, updateCognitoUserName } from '@/app/actions/cognitoActions';
import { EXCLUDE_PENDING_LEDGER_SQL } from '@/lib/fundLedgerCurrency';
import { PASSWORD_INVALID_MESSAGE, validatePassword } from '@/lib/passwordValidation';
import { syncCustomerFundAccount, deactivateCustomerFundAccount } from '@/lib/icFunds/customerFundSync';

const CUSTOMER_DELETE_BLOCKED_MESSAGE =
  'This customer cannot be deleted because they have existing orders or transactions.';

function customerHasOrdersExpr(customerIdRef: string): string {
  return `(
    EXISTS (SELECT 1 FROM ic_sales WHERE order_customer_id = ${customerIdRef} LIMIT 1)
    OR EXISTS (SELECT 1 FROM physical_buys WHERE customer_id = ${customerIdRef} LIMIT 1)
    OR EXISTS (SELECT 1 FROM physical_sells WHERE customer_id = ${customerIdRef} LIMIT 1)
    OR EXISTS (SELECT 1 FROM usdt_buys WHERE customer_id = ${customerIdRef} LIMIT 1)
    OR EXISTS (SELECT 1 FROM usdt_sells WHERE customer_id = ${customerIdRef} LIMIT 1)
    OR EXISTS (SELECT 1 FROM tax_invoices WHERE customer_id = ${customerIdRef} LIMIT 1)
  )`;
}

async function customerHasAnyOrders(customerId: string): Promise<boolean> {
  const res = await query(`SELECT ${customerHasOrdersExpr('$1')} AS has_orders`, [customerId]);
  return Boolean(res.rows[0]?.has_orders);
}

function mapCustomerRow(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    branchId: String(r.branch_id),
    name: String(r.name),
    phone: r.phone ? String(r.phone) : undefined,
    email: r.email ? String(r.email) : undefined,
    balance: parseFloat(String(r.balance ?? 0)),
    status: String(r.status ?? 'active'),
    createdAt: r.created_at ? new Date(String(r.created_at)).toISOString() : undefined,
    cognitoUserId: r.cognito_user_id ? String(r.cognito_user_id) : undefined,
    currency: r.currency ? String(r.currency) : 'AED',
    hasOrders: Boolean(r.has_orders),
    netUsdt: r.net_usdt != null ? parseFloat(String(r.net_usdt)) : 0,
  };
}

async function assertCustomerWriteAccess(slug: string) {
  const user = await getSessionUser(slug);
  if (!user) return { error: 'You must be signed in.' as const, user: null };
  if (user.role === 'customer') {
    return { error: 'Customers cannot manage customer records.' as const, user: null };
  }
  const branchRes = await query(`SELECT id FROM branches WHERE slug = $1 LIMIT 1`, [slug]);
  if (branchRes.rows.length === 0) {
    return { error: 'Branch not found' as const, user: null };
  }
  const branchId = String(branchRes.rows[0].id);
  if (user.branchId && user.branchId !== branchId) {
    return { error: 'You are not authorized for this branch.' as const, user: null };
  }
  const denied = await assertStaffWriteAccess(user, 'customers', branchId);
  if (denied) return { error: denied, user: null };
  return { user, branchId };
}

export async function getCustomersBySlug(slug: string) {
  try {
    const res = await query(
      `
      SELECT c.*, ${customerHasOrdersExpr('c.id')} AS has_orders,
        COALESCE((
          SELECT SUM(l.debit - l.credit)
          FROM fund_entity_ledger l
          WHERE l.customer_id = c.id AND l.branch_id = c.branch_id
          ${EXCLUDE_PENDING_LEDGER_SQL}
        ), 0) AS net_usdt
      FROM customers c
      LEFT JOIN branches b ON c.branch_id = b.id
      WHERE b.slug = $1
      ORDER BY c.created_at DESC
    `,
      [slug],
    );
    return { success: true, customers: res.rows.map(mapCustomerRow) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ error: err, slug }, 'getCustomers error');
    return { success: false, error: message };
  }
}

export async function getCustomerByCognitoUserId(cognitoUserId: string) {
  try {
    const res = await query(
      `SELECT c.* FROM customers c WHERE c.cognito_user_id = $1 LIMIT 1`,
      [cognitoUserId],
    );
    if (res.rows.length === 0) {
      return { success: false, error: 'Customer not found' };
    }
    return { success: true, customer: mapCustomerRow(res.rows[0]) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ error: err, cognitoUserId }, 'getCustomerByCognitoUserId error');
    return { success: false, error: message };
  }
}

export async function getAllCustomers() {
  try {
    const res = await query(
      `
      SELECT c.*
      FROM customers c
      ORDER BY c.name ASC
    `
    );
    return { success: true, customers: res.rows.map(mapCustomerRow) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ error: err }, 'getAllCustomers error');
    return { success: false, error: message };
  }
}

export async function getCustomerById(customerId: string, slug?: string) {
  try {
    const res = await query(
      `
      SELECT c.*
      FROM customers c
      LEFT JOIN branches b ON c.branch_id = b.id
      WHERE c.id = $1
        AND ($2::text IS NULL OR b.slug = $2)
      LIMIT 1
    `,
      [customerId, slug ?? null],
    );
    if (res.rows.length === 0) {
      return { success: false, error: 'Customer not found' };
    }
    return { success: true, customer: mapCustomerRow(res.rows[0]) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ error: err, customerId, slug }, 'getCustomerById error');
    return { success: false, error: message };
  }
}

export async function saveCustomer(
  slug: string,
  data: {
    id?: string;
    name: string;
    phone?: string;
    email?: string;
    password?: string;
    balance?: number | string;
    status?: string;
    currency?: string;
  },
) {
  try {
    const access = await assertCustomerWriteAccess(slug);
    if ('error' in access && access.error) {
      return { success: false, error: access.error };
    }

    const branchId = access.branchId!;
    const isNew = !data.id;
    const email = data.email?.trim() || '';
    const password = data.password?.trim() || '';

    if (isNew) {
      if (!email) {
        return { success: false, error: 'Email is required to create a customer portal account.' };
      }
      if (!validatePassword(password).isValid) {
        return { success: false, error: PASSWORD_INVALID_MESSAGE };
      }
    }

    let existingCognitoUserId: string | null = null;
    if (!isNew && data.id) {
      const existing = await query(
        `SELECT cognito_user_id, email FROM customers WHERE id = $1 AND branch_id = $2 LIMIT 1`,
        [data.id, branchId],
      );
      if (existing.rows.length === 0) {
        return { success: false, error: 'Customer not found' };
      }
      existingCognitoUserId = existing.rows[0].cognito_user_id
        ? String(existing.rows[0].cognito_user_id)
        : null;
    }

    const id = data.id || `cust_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const balance = data.balance !== undefined && data.balance !== '' ? Number(data.balance) : 0;
    const status = data.status || 'active';
    let cognitoUserId = existingCognitoUserId;

    if (isNew) {
      const cognitoRes = await createCustomerCognitoUser({
        email,
        name: data.name.trim(),
        branchId,
        password,
      });
      if (!cognitoRes.success || !cognitoRes.userId) {
        return { success: false, error: cognitoRes.error || 'Failed to create customer login account.' };
      }
      cognitoUserId = cognitoRes.userId;
    } else if (existingCognitoUserId && email) {
      await updateCognitoUserName(email, data.name.trim());
    }

    await query(
      `
      INSERT INTO customers (id, branch_id, name, phone, email, balance, status, cognito_user_id, currency)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        balance = EXCLUDED.balance,
        status = EXCLUDED.status,
        cognito_user_id = COALESCE(EXCLUDED.cognito_user_id, customers.cognito_user_id),
        currency = EXCLUDED.currency
    `,
      [
        id,
        branchId,
        data.name.trim(),
        data.phone?.trim() || null,
        email || null,
        balance,
        status,
        cognitoUserId,
        data.currency?.toUpperCase() || 'AED',
      ],
    );

    await syncCustomerFundAccount(id);

    revalidatePath(`/${slug}/customers`);
    revalidatePath(`/${slug}/ic-funds/accounts`);
    return { success: true, id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ error: err, slug, data }, 'saveCustomer error');
    return { success: false, error: message };
  }
}

export async function resetCustomerPasswordAction(slug: string, customerId: string, passwordRaw: string) {
  try {
    const access = await assertCustomerWriteAccess(slug);
    if ('error' in access && access.error) {
      return { success: false, error: access.error };
    }
    if (!validatePassword(passwordRaw).isValid) {
      return { success: false, error: PASSWORD_INVALID_MESSAGE };
    }

    const existing = await query(
      `SELECT email, cognito_user_id FROM customers WHERE id = $1 AND branch_id = $2 LIMIT 1`,
      [customerId, access.branchId],
    );
    if (existing.rows.length === 0) {
      return { success: false, error: 'Customer not found' };
    }
    const email = existing.rows[0].email ? String(existing.rows[0].email) : '';
    const cognitoUserId = existing.rows[0].cognito_user_id;
    if (!email || !cognitoUserId) {
      return { success: false, error: 'Customer has no portal login account.' };
    }

    return resetCustomerCognitoPasswordAction(email, passwordRaw, slug);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ error: err, slug, customerId }, 'resetCustomerPasswordAction error');
    return { success: false, error: message };
  }
}

export async function deleteCustomer(id: string, slug: string) {
  try {
    const access = await assertCustomerWriteAccess(slug);
    if ('error' in access && access.error) {
      return { success: false, error: access.error };
    }

    const existing = await query(
      `SELECT email, cognito_user_id FROM customers WHERE id = $1 AND branch_id = $2 LIMIT 1`,
      [id, access.branchId],
    );
    if (existing.rows.length === 0) {
      return { success: false, error: 'Customer not found' };
    }

    if (await customerHasAnyOrders(id)) {
      return { success: false, error: CUSTOMER_DELETE_BLOCKED_MESSAGE };
    }

    const email = existing.rows[0].email ? String(existing.rows[0].email) : '';
    if (email) {
      await deleteCognitoUserByEmail(email);
    }

    await query(`DELETE FROM customers WHERE id = $1`, [id]);
    await deactivateCustomerFundAccount(id);
    revalidatePath(`/${slug}/customers`);
    revalidatePath(`/${slug}/ic-funds/accounts`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ error: err, id, slug }, 'deleteCustomer error');
    return { success: false, error: message };
  }
}

/** Adjust customer balance within an existing transaction client. Returns opening balance before change. */
export async function adjustCustomerBalanceInTx(
  client: { query: (text: string, params?: unknown[]) => Promise<{ rows: { balance: string }[] }> },
  customerId: string,
  delta: number,
): Promise<number> {
  const res = await client.query(`SELECT balance FROM customers WHERE id = $1 FOR UPDATE`, [customerId]);
  if (res.rows.length === 0) throw new Error('Customer not found');
  const openingBalance = parseFloat(res.rows[0].balance);
  await client.query(`UPDATE customers SET balance = balance + $1 WHERE id = $2`, [delta, customerId]);
  return openingBalance;
}
