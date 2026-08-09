import 'server-only';
import { query } from '@/lib/db';
import type { DealAccessLevel, DealPermissionMap, DealStaffAssignment } from '@/types';

export async function fetchUserDealPermissionsFromDb(
  userId: string,
): Promise<DealPermissionMap> {
  const res = await query(
    `SELECT deal_id, access_level FROM user_deal_permissions WHERE user_id = $1`,
    [userId],
  );

  const map: DealPermissionMap = {};
  for (const row of res.rows) {
    const level = row.access_level as DealAccessLevel;
    if (level === 'read' || level === 'write') {
      map[row.deal_id as string] = level;
    }
  }
  return map;
}

export async function fetchDealStaffAssignments(dealId: string): Promise<DealStaffAssignment[]> {
  const res = await query(
    `SELECT user_id, access_level FROM user_deal_permissions WHERE deal_id = $1 ORDER BY user_id`,
    [dealId],
  );

  return res.rows.map(row => ({
    userId: row.user_id as string,
    userName: row.user_id as string,
    accessLevel: row.access_level as DealAccessLevel,
  }));
}

export async function fetchDealStaffAssignmentsBatch(
  dealIds: string[],
  userNamesById?: Record<string, string>,
): Promise<Record<string, DealStaffAssignment[]>> {
  if (dealIds.length === 0) return {};

  const res = await query(
    `SELECT deal_id, user_id, access_level FROM user_deal_permissions WHERE deal_id = ANY($1::varchar[])`,
    [dealIds],
  );

  const result: Record<string, DealStaffAssignment[]> = {};
  for (const row of res.rows) {
    const dealId = row.deal_id as string;
    const userId = row.user_id as string;
    if (!result[dealId]) result[dealId] = [];
    result[dealId].push({
      userId,
      userName: userNamesById?.[userId] ?? userId,
      accessLevel: row.access_level as DealAccessLevel,
    });
  }
  return result;
}

export async function replaceDealStaffAssignments(
  dealId: string,
  assignments: DealStaffAssignment[],
  updatedBy: string,
): Promise<void> {
  await query(`DELETE FROM user_deal_permissions WHERE deal_id = $1`, [dealId]);

  for (const assignment of assignments) {
    if (!assignment.userId) continue;
    await query(
      `INSERT INTO user_deal_permissions (user_id, deal_id, access_level, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, deal_id)
       DO UPDATE SET access_level = EXCLUDED.access_level, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP`,
      [assignment.userId, dealId, assignment.accessLevel, updatedBy],
    );
  }
}

export async function deleteUserDealPermissions(userId: string): Promise<void> {
  await query(`DELETE FROM user_deal_permissions WHERE user_id = $1`, [userId]);
}
