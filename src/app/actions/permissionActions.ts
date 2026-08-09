'use server';

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  ChangePasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import type { BranchPageId } from '@/lib/branchPages';
import {
  getManageableBranchPages,
  hasFullBranchAccess,
  normalizePermissionMap,
  canWritePage,
  canWriteDeal,
  isCustomerRole,
  isInvestorRole,
} from '@/lib/rbac';
import {
  fetchBranchHiddenPages,
  fetchUserPermissionsFromDb,
  upsertUserPermissions,
} from '@/lib/userPermissions';
import type { PagePermissionMap, User } from '@/types';
import { env } from '@/lib/env';

const cognitoClient = env.COGNITO_REGION
  ? new CognitoIdentityProviderClient({ region: env.COGNITO_REGION })
  : null;

type PermissionEditorContext =
  | { user: User; branchId: string }
  | { error: string };

async function resolvePermissionEditorContext(options: {
  branchSlug?: string;
  branchId?: string;
}): Promise<PermissionEditorContext> {
  const { branchSlug, branchId } = options;

  if (branchSlug) {
    const user = await getSessionUser(branchSlug);
    if (user?.role === 'branch_manager') {
      if (!user.branchId) {
        return { error: 'Branch manager is not assigned to a branch.' };
      }
      const branchRes = await query(`SELECT id FROM branches WHERE slug = $1 LIMIT 1`, [branchSlug]);
      if (branchRes.rows.length === 0) {
        return { error: 'Branch not found.' };
      }
      if (branchRes.rows[0].id !== user.branchId) {
        return { error: 'Access denied for this branch.' };
      }
      return { user, branchId: user.branchId };
    }

    if (user?.role === 'admin') {
      const branchRes = await query(`SELECT id FROM branches WHERE slug = $1 LIMIT 1`, [branchSlug]);
      if (branchRes.rows.length === 0) {
        return { error: 'Branch not found.' };
      }
      return { user, branchId: branchRes.rows[0].id as string };
    }

    return { error: 'Only branch managers or superadmin can manage permissions.' };
  }

  if (branchId) {
    const user = await getSessionUser();
    if (!user || user.role !== 'admin') {
      return { error: 'Only superadmin can manage permissions by branch ID.' };
    }
    const branchRes = await query(`SELECT id FROM branches WHERE id = $1 LIMIT 1`, [branchId]);
    if (branchRes.rows.length === 0) {
      return { error: 'Branch not found.' };
    }
    return { user, branchId };
  }

  return { error: 'Branch context is required.' };
}

export async function fetchBranchStaffPermissionsBatchAction(
  branchSlug: string,
): Promise<
  | { success: true; permissionsByUser: Record<string, PagePermissionMap>; pages: BranchPageId[] }
  | { success: false; error: string }
> {
  try {
    const ctx = await resolvePermissionEditorContext({ branchSlug });
    if ('error' in ctx) return { success: false, error: ctx.error };

    const hiddenPages = await fetchBranchHiddenPages(ctx.branchId);
    const pages = getManageableBranchPages(hiddenPages);

    const res = await query(
      `SELECT user_id, page_id, access_level FROM user_page_permissions WHERE branch_id = $1`,
      [ctx.branchId],
    );

    const permissionsByUser: Record<string, PagePermissionMap> = {};
    for (const row of res.rows) {
      const userId = row.user_id as string;
      if (!permissionsByUser[userId]) permissionsByUser[userId] = {};
      const level = row.access_level as PagePermissionMap[string];
      if (level === 'read' || level === 'write' || level === 'none') {
        permissionsByUser[userId][row.page_id] = level;
      }
    }

    for (const userId of Object.keys(permissionsByUser)) {
      permissionsByUser[userId] = normalizePermissionMap(permissionsByUser[userId], hiddenPages);
    }

    return { success: true, permissionsByUser, pages };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load permissions.' };
  }
}

/** Superadmin: load staff permissions for all branches at once. */
export async function fetchAdminStaffPermissionsBatchAction(): Promise<
  | {
      success: true;
      permissionsByUser: Record<string, PagePermissionMap>;
      pagesByBranchId: Record<string, BranchPageId[]>;
    }
  | { success: false; error: string }
> {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'admin') {
      return { success: false, error: 'Only superadmin can load all staff permissions.' };
    }

    const branchesRes = await query(`SELECT id, hidden_pages FROM branches`);
    const pagesByBranchId: Record<string, BranchPageId[]> = {};
    for (const row of branchesRes.rows) {
      pagesByBranchId[row.id as string] = getManageableBranchPages(row.hidden_pages as string[]);
    }

    const res = await query(
      `SELECT user_id, branch_id, page_id, access_level FROM user_page_permissions`,
    );

    const permissionsByUser: Record<string, PagePermissionMap> = {};
    const branchIdByUser: Record<string, string> = {};

    for (const row of res.rows) {
      const userId = row.user_id as string;
      const branchId = row.branch_id as string;
      branchIdByUser[userId] = branchId;
      if (!permissionsByUser[userId]) permissionsByUser[userId] = {};
      const level = row.access_level as PagePermissionMap[string];
      if (level === 'read' || level === 'write' || level === 'none') {
        permissionsByUser[userId][row.page_id] = level;
      }
    }

    for (const userId of Object.keys(permissionsByUser)) {
      const branchId = branchIdByUser[userId];
      const hiddenPages = branchesRes.rows.find(r => r.id === branchId)?.hidden_pages as string[] | undefined;
      permissionsByUser[userId] = normalizePermissionMap(permissionsByUser[userId], hiddenPages);
    }

    return { success: true, permissionsByUser, pagesByBranchId };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load permissions.' };
  }
}

export async function fetchStaffPermissionsAction(
  targetUserId: string,
  branchSlug?: string,
  branchId?: string,
): Promise<{ success: true; data: PagePermissionMap; pages: BranchPageId[] } | { success: false; error: string }> {
  try {
    const ctx = await resolvePermissionEditorContext({ branchSlug, branchId });
    if ('error' in ctx) return { success: false, error: ctx.error };

    const hiddenPages = await fetchBranchHiddenPages(ctx.branchId);
    const permissions = await fetchUserPermissionsFromDb(targetUserId, ctx.branchId);

    return {
      success: true,
      data: normalizePermissionMap(permissions, hiddenPages),
      pages: getManageableBranchPages(hiddenPages),
    };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load permissions.' };
  }
}

export async function updateStaffPermissionsAction(
  targetUserId: string,
  permissions: PagePermissionMap,
  branchSlug?: string,
  branchId?: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const ctx = await resolvePermissionEditorContext({ branchSlug, branchId });
    if ('error' in ctx) return { success: false, error: ctx.error };

    if (ctx.user.role === 'branch_manager' && targetUserId === ctx.user.id) {
      return { success: false, error: 'You cannot change your own permissions.' };
    }

    const hiddenPages = await fetchBranchHiddenPages(ctx.branchId);
    const normalized = normalizePermissionMap(permissions, hiddenPages);

    await upsertUserPermissions(targetUserId, ctx.branchId, normalized, ctx.user.email);

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update permissions.' };
  }
}

export async function changeOwnPasswordAction(
  currentPassword: string,
  newPassword: string,
  branchSlug?: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await getSessionUser(branchSlug);
  if (!user) {
    return { success: false, error: 'You must be signed in.' };
  }

  if (!cognitoClient || !env.COGNITO_CLIENT_ID) {
    return { success: false, error: 'Authentication is not configured.' };
  }

  if (!currentPassword || !newPassword) {
    return { success: false, error: 'Current and new passwords are required.' };
  }

  try {
    const authRes = await cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: env.COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: user.email,
          PASSWORD: currentPassword,
        },
      }),
    );

    const accessToken = authRes.AuthenticationResult?.AccessToken;
    if (!accessToken) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    await cognitoClient.send(
      new ChangePasswordCommand({
        AccessToken: accessToken,
        PreviousPassword: currentPassword,
        ProposedPassword: newPassword,
      }),
    );

    return { success: true };
  } catch (error: unknown) {
    const errName = (error as { name?: string })?.name;
    if (errName === 'NotAuthorizedException') {
      return { success: false, error: 'Current password is incorrect.' };
    }
    if (errName === 'InvalidPasswordException') {
      return { success: false, error: 'New password does not meet security requirements.' };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Failed to change password.' };
  }
}

function denyNonStaffPortalRoles(user: User): string | null {
  if (isInvestorRole(user.role)) return 'Investors cannot modify this section.';
  if (isCustomerRole(user.role)) return 'You do not have permission to modify this section.';
  if (user.role !== 'staff') return 'You do not have permission to modify this section.';
  return null;
}

/** Server-side write guard for staff mutations. Returns error message or null if allowed. */
export async function assertStaffWriteAccess(
  user: User | null | undefined,
  pageId: BranchPageId,
  branchId?: string,
): Promise<string | null> {
  if (!user) return 'You must be signed in.';
  if (hasFullBranchAccess(user)) return null;
  const roleErr = denyNonStaffPortalRoles(user);
  if (roleErr) return roleErr;

  const hiddenPages = branchId ? await fetchBranchHiddenPages(branchId) : [];
  if (!canWritePage(user, pageId, hiddenPages)) {
    return 'You do not have permission to modify this section.';
  }
  return null;
}

/** Server-side deal-level write guard for staff. */
export async function assertStaffDealWriteAccess(
  user: User | null | undefined,
  dealId: string,
  branchId?: string,
): Promise<string | null> {
  const pageErr = await assertStaffWriteAccess(user, 'deals', branchId);
  if (pageErr) return pageErr;
  if (!user || hasFullBranchAccess(user)) return null;
  if (!canWriteDeal(user, dealId)) {
    return 'You do not have write access to this group.';
  }
  return null;
}

export async function lookupCognitoUserIdByEmail(email: string): Promise<string | null> {
  const { ListUsersCommand } = await import('@aws-sdk/client-cognito-identity-provider');
  if (!cognitoClient || !env.COGNITO_USER_POOL_ID) return null;

  const res = await cognitoClient.send(
    new ListUsersCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Filter: `email = "${email}"`,
      Limit: 1,
    }),
  );

  const cognitoUser = res.Users?.[0];
  if (!cognitoUser) return null;
  const sub = cognitoUser.Attributes?.find(a => a.Name === 'sub')?.Value;
  return sub ?? cognitoUser.Username ?? null;
}
