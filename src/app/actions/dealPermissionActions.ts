'use server';

import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { fetchCognitoUsersAction } from '@/app/actions/cognitoActions';
import { hasFullBranchAccess } from '@/lib/rbac';
import type { DealAccessLevel } from '@/types';

export type DealsStaffOption = {
  userId: string;
  name: string;
  email: string;
  dealsPageAccess: DealAccessLevel;
};

async function resolveBranchId(branchSlug: string): Promise<string | null> {
  const res = await query(`SELECT id FROM branches WHERE slug = $1 LIMIT 1`, [branchSlug]);
  return res.rows[0]?.id as string | null;
}

/** Staff with Groups & Deals page access — for group assignment UI. */
export async function fetchBranchDealsStaffAction(
  branchSlug: string,
): Promise<{ success: true; staff: DealsStaffOption[] } | { success: false; error: string }> {
  try {
    let user = branchSlug ? await getSessionUser(branchSlug) : null;
    if (!user) user = await getSessionUser();
    if (!user || !hasFullBranchAccess(user)) {
      return { success: false, error: 'Only branch managers can assign staff to groups.' };
    }

    const branchId = await resolveBranchId(branchSlug);
    if (!branchId) return { success: false, error: 'Branch not found.' };

    const usersRes = user.role === 'admin'
      ? await fetchCognitoUsersAction()
      : await fetchCognitoUsersAction(branchSlug);
    if (!usersRes.success || !usersRes.data) {
      return { success: false, error: usersRes.error || 'Failed to load staff.' };
    }

    const branchStaff = usersRes.data.filter(
      u => u.role === 'staff' && u.branchId === branchId,
    );

    const permsRes = await query(
      `SELECT user_id, access_level FROM user_page_permissions
       WHERE branch_id = $1 AND page_id = 'deals' AND access_level IN ('read', 'write')`,
      [branchId],
    );

    const dealsPageAccess = new Map<string, DealAccessLevel>();
    for (const row of permsRes.rows) {
      const level = row.access_level as DealAccessLevel;
      if (level === 'read' || level === 'write') {
        dealsPageAccess.set(row.user_id as string, level);
      }
    }

    const staff = branchStaff
      .filter(u => u.userId && dealsPageAccess.has(u.userId))
      .map(u => ({
        userId: u.userId!,
        name: u.name,
        email: u.email,
        dealsPageAccess: dealsPageAccess.get(u.userId!)!,
      }));

    return { success: true, staff };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load staff.',
    };
  }
}
