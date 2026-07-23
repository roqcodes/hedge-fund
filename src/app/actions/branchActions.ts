'use server';

import { query, pool } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getCurrentUserAction } from '@/app/actions/auth';
import { HIDEABLE_BRANCH_PAGE_IDS } from '@/lib/branchPages';
import { sanitizeEnabledCurrencies } from '@/lib/currency';
import { logger } from '@/lib/logger';

export type BranchCashBalances = {
  usdt: number;
  aed: number;
  idr: number;
};

function parseBalance(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : null;
}

/** Directly overwrite branch USDT / AED / IDR wallet balances (branch manager only). */
export async function overwriteBranchCashBalancesAction(
  branchId: string,
  balances: { usdt: number; aed: number; idr: number },
  branchSlug?: string,
): Promise<{ success: true; data: BranchCashBalances } | { success: false; error: string }> {
  const usdt = parseBalance(balances.usdt);
  const aed = parseBalance(balances.aed);
  const idr = parseBalance(balances.idr);
  if (usdt == null || aed == null || idr == null) {
    return { success: false, error: 'Enter valid numbers for USDT, AED, and IDR balances.' };
  }

  try {
    const userRes = branchSlug ? await getCurrentUserAction(branchSlug) : await getCurrentUserAction();
    const user = userRes.success ? userRes.data : null;
    if (!user || user.role !== 'branch_manager' || user.branchId !== branchId) {
      return { success: false, error: 'Only the branch manager can overwrite cash balances.' };
    }

    if (!pool) return { success: false, error: 'Database not connected.' };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO branch_usdt_balances (branch_id, initial_capital, available_fund, aed_balance, idr_balance)
         VALUES ($1, 0, $2, $3, $4)
         ON CONFLICT (branch_id) DO UPDATE SET
           available_fund = EXCLUDED.available_fund,
           aed_balance = EXCLUDED.aed_balance,
           idr_balance = EXCLUDED.idr_balance,
           updated_at = CURRENT_TIMESTAMP`,
        [branchId, usdt, aed, idr],
      );

      await client.query(
        `UPDATE branches SET current_balance = $1, cash_balance = $1, last_activity = CURRENT_TIMESTAMP WHERE id = $2`,
        [aed, branchId],
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    revalidatePath('/', 'layout');
    logger.warn({ branchId, usdt, aed, idr, userId: user.id }, 'Branch cash balances overwritten');

    return { success: true, data: { usdt, aed, idr } };
  } catch (error: unknown) {
    logger.error({ error, branchId }, 'Failed to overwrite branch cash balances');
    return { success: false, error: error instanceof Error ? error.message : 'Overwrite failed' };
  }
}

export async function updateBranchSettingsAction(
  branchId: string, 
  name: string, 
  logoUrl: string | null,
  identityDetails: {
    address: string;
    city: string;
    country: string;
    trn: string;
    phone: string;
    email: string;
    website: string;
    enabledCurrencies: string[];
  },
  branchSlug?: string,
) {
  try {
    const userRes = branchSlug ? await getCurrentUserAction(branchSlug) : await getCurrentUserAction();
    const user = userRes.success ? userRes.data : null;
    if (!user || user.role !== 'branch_manager' || user.branchId !== branchId) {
      return { success: false, error: 'Only the branch manager can update branch settings.' };
    }

    const enabledCurrencies = sanitizeEnabledCurrencies(identityDetails.enabledCurrencies);
    if (logoUrl) {
      await query(
        `UPDATE branches SET name = $1, logo_url = $2, address = $3, city = $4, country = $5, trn = $6, phone = $7, email = $8, website = $9, enabled_currencies = $10::text[] WHERE id = $11`, 
        [name, logoUrl, identityDetails.address, identityDetails.city, identityDetails.country, identityDetails.trn, identityDetails.phone, identityDetails.email, identityDetails.website, enabledCurrencies, branchId]
      );
    } else {
      await query(
        `UPDATE branches SET name = $1, address = $2, city = $3, country = $4, trn = $5, phone = $6, email = $7, website = $8, enabled_currencies = $9::text[] WHERE id = $10`, 
        [name, identityDetails.address, identityDetails.city, identityDetails.country, identityDetails.trn, identityDetails.phone, identityDetails.email, identityDetails.website, enabledCurrencies, branchId]
      );
    }

    // Revalidate settings and global layout
    revalidatePath('/', 'layout');

    return { success: true };
  } catch (error: any) {
    logger.error({ error, branchId }, 'Failed to update branch settings');
    return { success: false, error: error.message };
  }
}

export async function updateBranchPageSettingsAction(
  branchId: string,
  hiddenPages: string[],
) {
  try {
    const userRes = await getCurrentUserAction();
    if (!userRes.success || !userRes.data || userRes.data.role !== 'admin') {
      return { success: false, error: 'Only superadmin can manage branch page access.' };
    }

    const sanitized = hiddenPages.filter(id =>
      (HIDEABLE_BRANCH_PAGE_IDS as readonly string[]).includes(id),
    );
    await query(
      `UPDATE branches SET hidden_pages = $1::text[] WHERE id = $2`,
      [sanitized, branchId],
    );

    revalidatePath('/', 'layout');
    return { success: true, hiddenPages: sanitized };
  } catch (error: unknown) {
    logger.error({ error, branchId }, 'Failed to update branch page settings');
    return { success: false, error: error instanceof Error ? error.message : 'Update failed' };
  }
}
