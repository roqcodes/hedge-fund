import type { BranchPageId } from '@/lib/branchPages';
import {
  BRANCH_NAV_PAGES,
  CUSTOMER_PORTAL_PAGE_IDS,
  filterBranchNavPages,
  isBranchPageEnabled,
} from '@/lib/branchPages';
import type { PageAccessLevel, PagePermissionMap, User, UserRole } from '@/types';

export const BRANCH_PORTAL_ROLES: UserRole[] = ['branch_manager', 'staff', 'delivery', 'customer'];

/** Shown on disabled write controls for read-only staff. */
export const READ_ONLY_ACCESS_MESSAGE =
  'Read-only access: you can view this section but cannot make changes. Ask your branch manager for write access.';

/** Pages managers configure for staff — excludes always-on dashboard & account settings. */
export const PERMISSION_MANAGED_PAGE_IDS: BranchPageId[] = BRANCH_NAV_PAGES.filter(
  p => p.hideable,
).map(p => p.id);

export function isCustomerRole(role: UserRole | string | undefined): boolean {
  return role === 'customer';
}

export function isBranchPortalRole(role: UserRole | string): boolean {
  return (
    role === 'branch_manager' ||
    role === 'staff' ||
    role === 'customer' ||
    role.startsWith('delivery') ||
    role.startsWith('warehouse_')
  );
}

export function isBranchScopedUser(user: Pick<User, 'role' | 'branchId'> | null | undefined): boolean {
  return !!user && isBranchPortalRole(user.role) && !!user.branchId;
}

export function hasFullBranchAccess(user: Pick<User, 'role'> | null | undefined): boolean {
  return user?.role === 'branch_manager' || user?.role === 'admin';
}

/** IC Transfer admin panel — accept/reject orders, verify delivery, etc. */
export function canPerformICTransferAdminActions(user: Pick<User, 'role'> | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'branch_manager';
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

  if (isCustomerRole(user.role)) {
    return CUSTOMER_PORTAL_PAGE_IDS.includes(pageId) ? 'write' : 'none';
  }

  if (user.role === 'branch_manager' && pageId === 'warehouse') return 'none';

  if (user.role === 'admin' || user.role === 'branch_manager') return 'write';

  if (user.role.startsWith('delivery') || user.role.startsWith('warehouse_')) {
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

export function migrateLegacyPermissionMap(input: PagePermissionMap | undefined): PagePermissionMap {
  if (!input) return {};
  const result = { ...input };
  const legacyBranch = result['ic-transfer-branch'];
  const legacyAdmin = result['ic-transfer'];

  if (legacyBranch !== undefined) {
    result['ic-transfer'] = legacyBranch;
  }
  if (legacyAdmin !== undefined) {
    result['ic-transfer-admin'] = legacyAdmin;
    if (legacyBranch === undefined) {
      delete result['ic-transfer'];
    }
  }
  delete result['ic-transfer-branch'];
  return result;
}

export function normalizePermissionMap(
  input: PagePermissionMap | undefined,
  hiddenPages?: string[] | null,
): PagePermissionMap {
  const migrated = migrateLegacyPermissionMap(input);
  const manageable = new Set(getManageableBranchPages(hiddenPages));
  const result: PagePermissionMap = { dashboard: migrated?.dashboard ?? 'read' };

  for (const pageId of manageable) {
    const level = migrated?.[pageId];
    if (level === 'read' || level === 'write' || level === 'none') {
      result[pageId] = level;
    } else {
      result[pageId] = 'read';
    }
  }

  return result;
}
