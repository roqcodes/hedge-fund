import 'server-only';
import { query } from '@/lib/db';
import type { PageAccessLevel, PagePermissionMap } from '@/types';

export async function fetchUserPermissionsFromDb(
  userId: string,
  branchId: string,
): Promise<PagePermissionMap> {
  const res = await query(
    `SELECT page_id, access_level FROM user_page_permissions WHERE user_id = $1 AND branch_id = $2`,
    [userId, branchId],
  );

  const map: PagePermissionMap = {};
  for (const row of res.rows) {
    const level = row.access_level as PageAccessLevel;
    if (level === 'read' || level === 'write' || level === 'none') {
      map[row.page_id] = level;
    }
  }
  return map;
}

export async function fetchBranchHiddenPages(branchId: string): Promise<string[]> {
  const res = await query(`SELECT hidden_pages FROM branches WHERE id = $1 LIMIT 1`, [branchId]);
  return (res.rows[0]?.hidden_pages as string[]) ?? [];
}

export async function upsertUserPermissions(
  userId: string,
  branchId: string,
  permissions: PagePermissionMap,
  updatedBy: string,
): Promise<void> {
  const entries = Object.entries(permissions).filter(
    ([, level]) => level === 'read' || level === 'write' || level === 'none',
  );

  for (const [pageId, accessLevel] of entries) {
    await query(
      `INSERT INTO user_page_permissions (user_id, branch_id, page_id, access_level, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, branch_id, page_id)
       DO UPDATE SET access_level = EXCLUDED.access_level, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP`,
      [userId, branchId, pageId, accessLevel, updatedBy],
    );
  }
}

export async function seedDefaultStaffPermissions(
  userId: string,
  branchId: string,
  updatedBy: string,
): Promise<void> {
  await query(
    `INSERT INTO user_page_permissions (user_id, branch_id, page_id, access_level, updated_by)
     VALUES ($1, $2, 'dashboard', 'read', $3)
     ON CONFLICT (user_id, branch_id, page_id) DO NOTHING`,
    [userId, branchId, updatedBy],
  );
}

export async function deleteUserPermissions(userId: string): Promise<void> {
  await query(`DELETE FROM user_page_permissions WHERE user_id = $1`, [userId]);
}
