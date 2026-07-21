'use server';

import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import type {
  FundEntityLedgerEntry,
  FundEntityBalance,
  FundEntryDirection,
  FundReferenceType,
} from '@/types';

function mapRow(row: Record<string, unknown>): FundEntityLedgerEntry {
  return {
    id: row.id as string,
    branchId: row.branch_id as string,
    customerId: row.customer_id as string,
    entryDate: (row.entry_date as string) ?? new Date().toISOString(),
    description: (row.description as string) ?? '',
    debit: Number(row.debit) || 0,
    credit: Number(row.credit) || 0,
    referenceType: (row.reference_type as FundReferenceType) ?? 'manual',
    referenceId: (row.reference_id as string) ?? undefined,
    createdBy: (row.created_by as string) ?? undefined,
    createdByName: (row.created_by_name as string) ?? undefined,
    createdByUserId: (row.created_by_user_id as string) ?? undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
  };
}

export async function listEntityLedgerEntriesAction(params: {
  branchId: string;
  customerId?: string;
  limit?: number;
  offset?: number;
}): Promise<FundEntityLedgerEntry[]> {
  const { branchId, customerId, limit = 200, offset = 0 } = params;
  try {
    let sql = `SELECT * FROM fund_entity_ledger WHERE branch_id = $1`;
    const p: unknown[] = [branchId];
    let idx = 2;

    if (customerId) {
      sql += ` AND customer_id = $${idx}`;
      p.push(customerId);
      idx++;
    }

    sql += ` ORDER BY entry_date DESC, created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    p.push(limit, offset);

    const result = await query(sql, p);
    return result.rows.map(mapRow);
  } catch (err) {
    logger.error({ err, branchId, customerId }, 'Failed to list entity ledger entries');
    return [];
  }
}

export async function getEntityBalancesAction(
  branchId: string,
): Promise<FundEntityBalance[]> {
  try {
    const result = await query(
      `SELECT
         l.customer_id,
         c.name AS customer_name,
         COALESCE(SUM(l.debit), 0) AS total_debit,
         COALESCE(SUM(l.credit), 0) AS total_credit
       FROM fund_entity_ledger l
       JOIN customers c ON c.id = l.customer_id
       WHERE l.branch_id = $1
       GROUP BY l.customer_id, c.name
       ORDER BY c.name ASC`,
      [branchId],
    );

    return result.rows.map(r => ({
      customerId: r.customer_id as string,
      customerName: r.customer_name as string,
      totalDebit: Number(r.total_debit) || 0,
      totalCredit: Number(r.total_credit) || 0,
      net: (Number(r.total_debit) || 0) - (Number(r.total_credit) || 0),
    }));
  } catch (err) {
    logger.error({ err, branchId }, 'Failed to get entity balances');
    return [];
  }
}

export async function getEntityBalanceAction(
  branchId: string,
  customerId: string,
): Promise<FundEntityBalance | null> {
  try {
    const result = await query(
      `SELECT
         l.customer_id,
         c.name AS customer_name,
         COALESCE(SUM(l.debit), 0) AS total_debit,
         COALESCE(SUM(l.credit), 0) AS total_credit
       FROM fund_entity_ledger l
       JOIN customers c ON c.id = l.customer_id
       WHERE l.branch_id = $1 AND l.customer_id = $2
       GROUP BY l.customer_id, c.name`,
      [branchId, customerId],
    );

    if (result.rows.length === 0) return null;

    const r = result.rows[0];
    return {
      customerId: r.customer_id as string,
      customerName: r.customer_name as string,
      totalDebit: Number(r.total_debit) || 0,
      totalCredit: Number(r.total_credit) || 0,
      net: (Number(r.total_debit) || 0) - (Number(r.total_credit) || 0),
    };
  } catch (err) {
    logger.error({ err, branchId, customerId }, 'Failed to get entity balance');
    return null;
  }
}

export async function createFundLedgerEntryAction(params: {
  branchId: string;
  customerId: string;
  direction: FundEntryDirection;
  amount: number;
  description: string;
  entryDate?: string;
  referenceType?: FundReferenceType;
  referenceId?: string;
}): Promise<{ success: true; entryId: string } | { success: false; error: string }> {
  try {
    const { branchId, customerId, direction, amount, description, entryDate, referenceType, referenceId } = params;

    // Look up branch slug for session auth
    const branchRes = await query('SELECT slug FROM branches WHERE id = $1', [branchId]);
    if (branchRes.rows.length === 0) return { success: false, error: 'Branch not found' };
    const branchSlug = String(branchRes.rows[0].slug);
    const user = await getSessionUser(branchSlug);
    if (!user) return { success: false, error: 'Not authenticated' };

    if (!customerId) return { success: false, error: 'Entity is required' };
    if (!amount || amount <= 0) return { success: false, error: 'Amount must be greater than zero' };

    // Verify customer exists
    const custRes = await query('SELECT id FROM customers WHERE id = $1 AND branch_id = $2', [customerId, branchId]);
    if (custRes.rows.length === 0) {
      return { success: false, error: 'Entity not found in this branch' };
    }

    const id = `FL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    await query(
      `INSERT INTO fund_entity_ledger
        (id, branch_id, customer_id, entry_date, description, debit, credit,
         reference_type, reference_id, created_by, created_by_name, created_by_user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        branchId,
        customerId,
        entryDate ?? now,
        description.trim() || `${direction === 'debit' ? 'Receivable' : 'Payable'} entry`,
        direction === 'debit' ? amount : 0,
        direction === 'credit' ? amount : 0,
        referenceType ?? 'manual',
        referenceId ?? null,
        user.id ?? null,
        user.name ?? null,
        user.id ?? null,
        now,
      ],
    );

    logger.info({ entryId: id, branchId, customerId, direction, amount }, 'Fund ledger entry created');
    return { success: true, entryId: id };
  } catch (err) {
    logger.error({ err }, 'Failed to create fund ledger entry');
    return { success: false, error: 'Failed to create entry' };
  }
}

export async function deleteFundLedgerEntryAction(
  entryId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // Look up entry's branch to authenticate
    const entryRes = await query(
      'SELECT e.branch_id, b.slug FROM fund_entity_ledger e JOIN branches b ON e.branch_id = b.id WHERE e.id = $1',
      [entryId],
    );
    if (entryRes.rows.length === 0) return { success: false, error: 'Entry not found' };
    const branchSlug = String(entryRes.rows[0].slug);
    const user = await getSessionUser(branchSlug);
    if (!user) return { success: false, error: 'Not authenticated' };

    const result = await query('DELETE FROM fund_entity_ledger WHERE id = $1', [entryId]);

    logger.info({ entryId, userId: user.id }, 'Fund ledger entry deleted');
    return { success: true };
  } catch (err) {
    logger.error({ err, entryId }, 'Failed to delete fund ledger entry');
    return { success: false, error: 'Failed to delete entry' };
  }
}

export async function updateFundLedgerEntryAction(params: {
  entryId: string;
  entryDate?: string;
  description?: string;
  debit?: number;
  credit?: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { entryId, entryDate, description, debit, credit } = params;

    const entryRes = await query(
      'SELECT e.branch_id, b.slug FROM fund_entity_ledger e JOIN branches b ON e.branch_id = b.id WHERE e.id = $1',
      [entryId],
    );
    if (entryRes.rows.length === 0) return { success: false, error: 'Entry not found' };
    const branchSlug = String(entryRes.rows[0].slug);
    const user = await getSessionUser(branchSlug);
    if (!user) return { success: false, error: 'Not authenticated' };

    const sets: string[] = [];
    const p: unknown[] = [];
    let idx = 1;

    if (entryDate !== undefined) { sets.push(`entry_date = $${idx}`); p.push(entryDate); idx++; }
    if (description !== undefined) { sets.push(`description = $${idx}`); p.push(description); idx++; }
    if (debit !== undefined) { sets.push(`debit = $${idx}`); p.push(debit); idx++; }
    if (credit !== undefined) { sets.push(`credit = $${idx}`); p.push(credit); idx++; }

    if (sets.length === 0) return { success: false, error: 'No fields to update' };

    p.push(entryId);
    await query(`UPDATE fund_entity_ledger SET ${sets.join(', ')} WHERE id = $${idx}`, p);

    logger.info({ entryId, userId: user.id }, 'Fund ledger entry updated');
    return { success: true };
  } catch (err) {
    logger.error({ err }, 'Failed to update fund ledger entry');
    return { success: false, error: 'Failed to update entry' };
  }
}

/**
 * Auto-create a ledger entry from another module (physical, usdt, etc.)
 * Returns the entry ID.
 */
export async function createAutoLedgerEntry(params: {
  branchId: string;
  customerId: string;
  direction: FundEntryDirection;
  amount: number;
  referenceType: FundReferenceType;
  referenceId: string;
  description?: string;
}): Promise<string | null> {
  try {
    const result = await createFundLedgerEntryAction({
      branchId: params.branchId,
      customerId: params.customerId,
      direction: params.direction,
      amount: params.amount,
      description: params.description ?? `${params.direction === 'debit' ? 'Receivable' : 'Payable'} from ${params.referenceType}`,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
    });

    if (result.success) return result.entryId;
    return null;
  } catch (err) {
    logger.error({ err }, 'Failed to create auto ledger entry');
    return null;
  }
}
