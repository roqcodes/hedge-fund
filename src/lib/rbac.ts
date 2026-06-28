import type { BranchPageId } from '@/lib/branchPages';
import {
  BRANCH_NAV_PAGES,
  filterBranchNavPages,
  isBranchPageEnabled,
} from '@/lib/branchPages';
import type { PageAccessLevel, PagePermissionMap, User, UserRole } from '@/types';

export const BRANCH_PORTAL_ROLES: UserRole[] = ['branch_manager', 'staff', 'delivery'];

/** Shown on disabled write controls for read-only staff. */
export const READ_ONLY_ACCESS_MESSAGE =
  'Read-only access: you can view this section but cannot make changes. Ask your branch manager for write access.';

/** Pages managers configure for staff — excludes always-on dashboard & account settings. */
export const PERMISSION_MANAGED_PAGE_IDS: BranchPageId[] = BRANCH_NAV_PAGES.filter(
  p => p.hideable,
).map(p => p.id);

export function isBranchPortalRole(role: UserRole): boolean {
  return role === 'branch_manager' || role === 'staff' || role.startsWith('delivery') || role.startsWith('warehouse_');
}

export function isBranchScopedUser(user: Pick<User, 'role' | 'branchId'> | null | undefined): boolean {
  return !!user && isBranchPortalRole(user.role) && !!user.branchId;
}

export function hasFullBranchAccess(user: Pick<User, 'role'> | null | undefined): boolean {
  return user?.role === 'branch_manager' || user?.role === 'admin';
}

export function getManageableBranchPages(hiddenPages?: string[] | null): BranchPageId[] {
  return filterBranchNavPages(PERMISSION_MANAGED_PAGE_IDS, hiddenPages) as BranchPageId[];
}

export function getEffectivePageAccess(
  user: Pick<User, 'role' | 'permissions'> | null | undefined,
  pageId: BranchPageId,
  hiddenPages?: string[] | null,
): PageAccessLevel {
  if (!user) return 'none';
  if (!isBranchPageEnabled(pageId, hiddenPages)) return 'none';

  if (user.role === 'admin' || user.role === 'branch_manager') return 'write';

  if (user.role.startsWith('delivery')) {
    return pageId === 'warehouse' ? 'write' : 'none';
  }

  if (pageId === 'dashboard') {
    return user.permissions?.dashboard ?? 'read';
  }

  if (pageId === 'settings') {
    return 'write';
  }

  const level = user.permissions?.[pageId];
  return level ?? 'read';
}

export function canReadPage(
  user: Pick<User, 'role' | 'permissions'> | null | undefined,
  pageId: BranchPageId,
  hiddenPages?: string[] | null,
): boolean {
  const access = getEffectivePageAccess(user, pageId, hiddenPages);
  return access === 'read' || access === 'write';
}

export function canWritePage(
  user: Pick<User, 'role' | 'permissions'> | null | undefined,
  pageId: BranchPageId,
  hiddenPages?: string[] | null,
): boolean {
  return getEffectivePageAccess(user, pageId, hiddenPages) === 'write';
}

export function filterNavPagesForUser(
  pageIds: BranchPageId[],
  user: Pick<User, 'role' | 'permissions'> | null | undefined,
  hiddenPages?: string[] | null,
): BranchPageId[] {
  return pageIds.filter(id => canReadPage(user, id, hiddenPages));
}

export function defaultStaffPermissions(hiddenPages?: string[] | null): PagePermissionMap {
  const result: PagePermissionMap = { dashboard: 'read' };
  for (const pageId of getManageableBranchPages(hiddenPages)) {
    result[pageId] = 'read';
  }
  return result;
}

export function defaultDeliveryPermissions(): PagePermissionMap {
  return { dashboard: 'none', warehouse: 'write' };
}

export function normalizePermissionMap(
  input: PagePermissionMap | undefined,
  hiddenPages?: string[] | null,
): PagePermissionMap {
  const manageable = new Set(getManageableBranchPages(hiddenPages));
  const result: PagePermissionMap = { dashboard: input?.dashboard ?? 'read' };

  for (const pageId of manageable) {
    const level = input?.[pageId];
    if (level === 'read' || level === 'write' || level === 'none') {
      result[pageId] = level;
    } else {
      result[pageId] = 'read';
    }
  }

  return result;
}
