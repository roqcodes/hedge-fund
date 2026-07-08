import type { Branch, User } from '@/types';
import { isBranchPageEnabled } from '@/lib/branchPages';
import { canReadPage, isCustomerRole } from '@/lib/rbac';

export type MainNavItem = {
  id: string;
  path: string;
  label: string;
  icon: string;
};

export const MAIN_NAV_ITEMS: MainNavItem[] = [
  { id: 'dashboard', path: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { id: 'deals', path: '/group', label: 'Group & Deals', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id: 'funds', path: '/funds', label: 'Transaction', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
  { id: 'transactions-beta', path: '/transactions', label: 'Daily Ledger', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
  { id: 'ic-transfer-admin', path: '/ic-transfer-admin', label: 'IC Transfer (Admin)', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
  { id: 'ic-transfer', path: '/ic-transfer', label: 'IC Transfer', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2' },
  { id: 'finance', path: '/finance', label: 'Finance - Reports', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { id: 'physical', path: '/physical-deals', label: 'Physical Deals', icon: 'M9 6h6l2 2H7z M7 8h10v2H7z M3 14h6l2 2H1z M1 16h10v2H1z M15 14h6l2 2h-10z M13 16h10v2h-10z' },
  { id: 'investors', path: '/investors', label: 'Investors', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8m12 4v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { id: 'marketplace', path: '/physical', label: 'Physical', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
  { id: 'products', path: '/products', label: 'Products', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id: 'usdt', path: '/usdt', label: 'USDT', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z' },
  { id: 'customers', path: '/customers', label: 'Customers', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8m12 4v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { id: 'settings', path: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'warehouse', path: '/warehouse', label: 'Warehouse Portal', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { id: 'branches', path: '/branches', label: 'Branches', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'users', path: '/users', label: 'Users & Roles', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { id: 'reports', path: '/reports', label: 'Report', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
];

const BRANCH_NAV_ORDER = [
  'dashboard', 'deals', 'funds', 'transactions-beta', 'ic-transfer-admin', 'ic-transfer',
  'warehouse', 'finance', 'marketplace', 'physical', 'products', 'usdt', 'customers', 'investors', 'settings',
] as const;

const HQ_NAV_ORDER = [
  'dashboard', 'deals', 'funds', 'branches', 'finance', 'marketplace', 'physical', 'products',
  'usdt', 'customers', 'investors', 'settings', 'warehouse', 'ic-transfer',
] as const;

const BRANCH_PAGE_IDS = new Set([
  'dashboard', 'deals', 'funds', 'transactions-beta', 'ic-transfer-admin', 'ic-transfer',
  'finance', 'marketplace', 'physical', 'products', 'usdt', 'customers', 'investors', 'settings', 'warehouse',
]);

const HQ_PAGE_IDS = new Set([
  'dashboard', 'deals', 'funds', 'branches', 'finance', 'marketplace', 'physical', 'products',
  'usdt', 'customers', 'investors', 'settings', 'warehouse', 'ic-transfer',
]);

type VisibleNavInput = {
  currentSlug: string;
  user: User | null;
  branch: Branch | null | undefined;
};

function sortNavItems(items: MainNavItem[], order: readonly string[]): MainNavItem[] {
  return items.slice().sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

export function getVisibleMainNavItems({ currentSlug, user, branch }: VisibleNavInput): MainNavItem[] {
  const isBranchContext = !!currentSlug && currentSlug !== 'superadmin';

  const filtered = MAIN_NAV_ITEMS.filter(item => {
    if (isBranchContext) {
      if (isCustomerRole(user?.role)) {
        return item.id === 'ic-transfer';
      }

      if (!BRANCH_PAGE_IDS.has(item.id)) return false;
      if (branch && !isBranchPageEnabled(item.id, branch.hiddenPages)) return false;
      if (user?.role === 'branch_manager' && item.id === 'warehouse') return false;
      if (
        user?.role === 'staff' &&
        !canReadPage(user, item.id as import('@/lib/branchPages').BranchPageId, branch?.hiddenPages)
      ) {
        return false;
      }
      if (
        (user?.role?.startsWith('delivery') || user?.role?.startsWith('warehouse_')) &&
        item.id !== 'warehouse'
      ) {
        return false;
      }
      return true;
    }

    return HQ_PAGE_IDS.has(item.id);
  });

  return isBranchContext
    ? sortNavItems(filtered, isCustomerRole(user?.role) ? ['ic-transfer'] : BRANCH_NAV_ORDER)
    : sortNavItems(filtered, HQ_NAV_ORDER);
}

export function resolveMainNavItemHref(
  item: MainNavItem,
  currentSlug: string,
  user: User | null,
): string {
  const basePath = currentSlug && currentSlug !== 'superadmin' ? `/${currentSlug}` : '';

  if (item.id === 'dashboard') {
    return basePath || '/';
  }

  if (item.id === 'warehouse' && user?.role?.startsWith('delivery')) {
    return `${basePath}/warehouse/order-settlement`;
  }

  return `${basePath}${item.path}`;
}

export function resolveCompactPortalHome(
  items: MainNavItem[],
  currentSlug: string,
  user: User | null,
): string {
  if (items.length === 0) {
    return currentSlug && currentSlug !== 'superadmin' ? `/${currentSlug}` : '/';
  }
  return resolveMainNavItemHref(items[0], currentSlug, user);
}

export function shouldHideMainSidebar(visibleNavCount: number, isWarehousePortalRoute: boolean): boolean {
  return isWarehousePortalRoute || visibleNavCount <= 1;
}

/** True only for the standalone Warehouse Portal (`/warehouse`), not IC Transfer warehouse pages. */
export function isWarehousePortalRoute(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  const warehouseIndex = segments.indexOf('warehouse');
  if (warehouseIndex === -1) return false;

  const parentSegment = warehouseIndex > 0 ? segments[warehouseIndex - 1] : null;
  if (parentSegment === 'ic-transfer-admin' || parentSegment === 'ic-transfer') {
    return false;
  }

  return true;
}
