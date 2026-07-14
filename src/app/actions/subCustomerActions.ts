'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import { getSessionUser } from '@/lib/auth';
import { mapICSubCustomerRow } from '@/lib/icTransferMappers';
import { z } from 'zod';

const SUB_CUSTOMER_DELETE_BLOCKED =
  'This sub-customer cannot be deleted because they have existing orders.';

const saveSubCustomerSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Name is required'),
  contact: z.string().trim().optional().nullable(),
});

function subCustomerHasOrdersExpr(subCustomerIdRef: string): string {
  return `EXISTS (SELECT 1 FROM ic_sales WHERE sub_customer_id::text = ${subCustomerIdRef}::text LIMIT 1)`;
}

async function assertParentCustomerAccess(slug: string) {
  const user = await getSessionUser(slug);
  if (!user) return { error: 'You must be signed in.' as const, user: null, customerId: null };
  if (user.role !== 'customer') {
    return { error: 'Only portal customers can manage sub-customers.' as const, user: null, customerId: null };
  }
  if (!user.customerId) {
    return { error: 'Customer profile is not linked to this account.' as const, user: null, customerId: null };
  }
  const branchRes = await query(`SELECT id FROM branches WHERE slug = $1 LIMIT 1`, [slug]);
  if (branchRes.rows.length === 0) {
    return { error: 'Branch not found' as const, user: null, customerId: null };
  }
  const branchId = String(branchRes.rows[0].id);
  if (user.branchId && user.branchId !== branchId) {
    return { error: 'You are not authorized for this branch.' as const, user: null, customerId: null };
  }
  return { user, customerId: user.customerId };
}

export async function getSubCustomersBySlug(slug: string) {
  try {
    const access = await assertParentCustomerAccess(slug);
    if (access.error || !access.customerId) {
      return { success: false, error: access.error || 'Unauthorized' };
    }

    const res = await query(
      `
      SELECT sc.*, ${subCustomerHasOrdersExpr('sc.id')} AS has_orders
      FROM ic_sub_customers sc
      WHERE sc.parent_customer_id = $1
      ORDER BY sc.name ASC
    `,
      [access.customerId],
    );

    return {
      success: true,
      subCustomers: res.rows.map(r => mapICSubCustomerRow(r as Record<string, unknown>)),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ error: err, slug }, 'getSubCustomersBySlug error');
    return { success: false, error: message };
  }
}

export async function saveSubCustomer(
  slug: string,
  data: { id?: string; name: string; contact?: string | null },
) {
  try {
    const access = await assertParentCustomerAccess(slug);
    if (access.error || !access.customerId) {
      return { success: false, error: access.error || 'Unauthorized' };
    }

    const parsed = saveSubCustomerSchema.parse(data);
    const isNew = !parsed.id;
    const id = parsed.id || `subcust_${crypto.randomUUID().slice(0, 12)}`;
    const contact = parsed.contact?.trim() || null;

    if (!isNew) {
      const existing = await query(
        `SELECT id FROM ic_sub_customers WHERE id::text = $1::text AND parent_customer_id::text = $2::text LIMIT 1`,
        [id, access.customerId],
      );
      if (existing.rows.length === 0) {
        return { success: false, error: 'Sub-customer not found' };
      }

      await query(
        `UPDATE ic_sub_customers SET name = $1, contact = $2 WHERE id::text = $3::text AND parent_customer_id::text = $4::text`,
        [parsed.name, contact, id, access.customerId],
      );
    } else {
      const duplicate = await query(
        `SELECT id FROM ic_sub_customers WHERE parent_customer_id::text = $1::text AND LOWER(name) = LOWER($2) LIMIT 1`,
        [access.customerId, parsed.name],
      );
      if (duplicate.rows.length > 0) {
        const existingId = String(duplicate.rows[0].id);
        return {
          success: true,
          subCustomer: mapICSubCustomerRow({
            id: existingId,
            parent_customer_id: access.customerId,
            name: parsed.name,
            contact,
          }),
        };
      }

      await query(
        `INSERT INTO ic_sub_customers (id, parent_customer_id, name, contact) VALUES ($1, $2, $3, $4)`,
        [id, access.customerId, parsed.name, contact],
      );
    }

    revalidatePath(`/${slug}/ic-transfer`);
    return {
      success: true,
      subCustomer: mapICSubCustomerRow({
        id,
        parent_customer_id: access.customerId,
        name: parsed.name,
        contact,
      }),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ error: err, slug, data }, 'saveSubCustomer error');
    return { success: false, error: message };
  }
}

export async function deleteSubCustomer(slug: string, subCustomerId: string) {
  try {
    const access = await assertParentCustomerAccess(slug);
    if (access.error || !access.customerId) {
      return { success: false, error: access.error || 'Unauthorized' };
    }

    const existing = await query(
      `SELECT id, ${subCustomerHasOrdersExpr('id')} AS has_orders
       FROM ic_sub_customers WHERE id::text = $1::text AND parent_customer_id::text = $2::text LIMIT 1`,
      [subCustomerId, access.customerId],
    );
    if (existing.rows.length === 0) {
      return { success: false, error: 'Sub-customer not found' };
    }
    if (Boolean(existing.rows[0].has_orders)) {
      return { success: false, error: SUB_CUSTOMER_DELETE_BLOCKED };
    }

    await query(
      `DELETE FROM ic_sub_customers WHERE id::text = $1::text AND parent_customer_id::text = $2::text`,
      [subCustomerId, access.customerId],
    );

    revalidatePath(`/${slug}/ic-transfer`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ error: err, slug, subCustomerId }, 'deleteSubCustomer error');
    return { success: false, error: message };
  }
}

/** Server-side validation when a customer places an IC Transfer order. */
export async function validateSubCustomerForOrder(
  parentCustomerId: string,
  subCustomerId: string | undefined | null,
): Promise<{ id: string; name: string } | { error: string }> {
  if (!subCustomerId?.trim()) {
    return { error: 'Please select or add a sub-customer for this order.' };
  }

  const res = await query(
    `SELECT id, name FROM ic_sub_customers WHERE id::text = $1::text AND parent_customer_id::text = $2::text LIMIT 1`,
    [subCustomerId.trim(), parentCustomerId],
  );

  if (res.rows.length === 0) {
    return { error: 'Invalid sub-customer selection.' };
  }

  return { id: String(res.rows[0].id), name: String(res.rows[0].name) };
}
