'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function getCustomersBySlug(slug: string) {
  try {
    const res = await query(
      `
      SELECT c.*
      FROM customers c
      LEFT JOIN branches b ON c.branch_id = b.id
      WHERE b.slug = $1
      ORDER BY c.created_at DESC
    `,
      [slug],
    );
    return { success: true, customers: res.rows };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('getCustomers error:', err);
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
    balance?: number | string;
    status?: string;
  },
) {
  try {
    const branchRes = await query(`SELECT id FROM branches WHERE slug = $1`, [slug]);
    if (branchRes.rowCount === 0) throw new Error('Branch not found');
    const branchId = branchRes.rows[0].id;

    const id = data.id || `cust_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const balance = data.balance !== undefined && data.balance !== '' ? Number(data.balance) : 0;
    const status = data.status || 'active';

    await query(
      `
      INSERT INTO customers (id, branch_id, name, phone, email, balance, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        balance = EXCLUDED.balance,
        status = EXCLUDED.status
    `,
      [
        id,
        branchId,
        data.name.trim(),
        data.phone?.trim() || null,
        data.email?.trim() || null,
        balance,
        status,
      ],
    );

    revalidatePath('/[slug]/customers');
    return { success: true, id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('saveCustomer error:', err);
    return { success: false, error: message };
  }
}

export async function deleteCustomer(id: string) {
  try {
    await query(`DELETE FROM customers WHERE id = $1`, [id]);
    revalidatePath('/[slug]/customers');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('deleteCustomer error:', err);
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
