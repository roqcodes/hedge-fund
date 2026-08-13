export type BranchPageId =
  | 'dashboard'
  | 'deals'
  | 'funds'
  | 'transactions-beta'
  | 'ic-transfer-admin'
  | 'ic-funds'
  | 'ic-transfer'
  | 'finance'
  | 'physical'
  | 'marketplace'
  | 'products'
  | 'customers'
  | 'investors'
  | 'usdt'
  | 'settings'
  | 'warehouse';

export type BranchNavPage = {
  id: BranchPageId;
  label: string;
  path: string;
  /** Pages that must always remain visible for branch users */
  hideable: boolean;
};

/** Branch portal navigation pages — shared by Sidebar, search, and access control */
export const BRANCH_NAV_PAGES: BranchNavPage[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', hideable: false },
  { id: 'deals', label: 'Group & Deals', path: '/group', hideable: true },
  { id: 'funds', label: 'Transaction', path: '/funds', hideable: true },
  { id: 'transactions-beta', label: 'Daily Ledger', path: '/transactions', hideable: true },
  { id: 'ic-transfer-admin', label: 'IC Transfer (Admin)', path: '/ic-transfer-admin', hideable: true },
  { id: 'ic-funds', label: 'IC Funds', path: '/ic-funds', hideable: true },
  { id: 'finance', label: 'Finance - Reports', path: '/finance', hideable: true },
  { id: 'physical', label: 'Physical Deals', path: '/physical-deals', hideable: true },
  { id: 'marketplace', label: 'Physical', path: '/physical', hideable: true },
  { id: 'products', label: 'Products', path: '/products', hideable: true },
  { id: 'usdt', label: 'Currency', path: '/currency', hideable: true },
  { id: 'customers', label: 'Customers', path: '/customers', hideable: true },
  { id: 'investors', label: 'Investors', path: '/investors', hideable: true },
  { id: 'warehouse', label: 'Warehouse Portal', path: '/warehouse', hideable: false },
  { id: 'ic-transfer', label: 'IC Transfer', path: '/ic-transfer', hideable: true },
  { id: 'settings', label: 'Settings', path: '/settings', hideable: false },
];

export const BRANCH_NAV_PAGE_IDS = BRANCH_NAV_PAGES.map(p => p.id);

export const HIDEABLE_BRANCH_PAGE_IDS = BRANCH_NAV_PAGES.filter(p => p.hideable).map(p => p.id);

/** Pages customer-role users may access (extensible for future customer portals). */
export const CUSTOMER_PORTAL_PAGE_IDS: BranchPageId[] = ['ic-transfer'];

const PATH_SEGMENT_TO_PAGE_ID: Record<string, BranchPageId> = {
  group: 'deals',
  funds: 'funds',
  transactions: 'transactions-beta',
  'ic-transfer-admin': 'ic-transfer-admin',
  'ic-funds': 'ic-funds',
  'ic-transfer': 'ic-transfer',
  finance: 'finance',
  physical: 'marketplace',
  'physical-deals': 'physical',
  investors: 'investors',
  usdt: 'usdt',
  currency: 'usdt',
  products: 'products',
  customers: 'customers',
  settings: 'settings',
  reports: 'finance',
  warehouse: 'warehouse',
};

/** Map legacy hidden page IDs stored in the database to current page IDs. */
export function normalizeHiddenPageId(pageId: string): string {
  if (pageId === 'ic-transfer-branch') return 'ic-transfer';
  return pageId;
}

export function normalizeHiddenPages(hiddenPages?: string[] | null): string[] {
  if (!hiddenPages?.length) return [];
  return hiddenPages.map(normalizeHiddenPageId);
}

function isICTransferAdminHidden(hiddenPages?: string[] | null): boolean {
  const raw = hiddenPages ?? [];
  if (raw.includes('ic-transfer-admin')) return true;
  // Legacy rows stored admin disable as `ic-transfer` before ic-transfer-admin existed.
  if (raw.includes('ic-transfer') && !raw.includes('ic-transfer-admin')) return true;
  return false;
}

function isICTransferBranchHidden(hiddenPages?: string[] | null): boolean {
  return normalizeHiddenPages(hiddenPages).includes('ic-transfer');
}

export function isBranchPageEnabled(pageId: string, hiddenPages?: string[] | null): boolean {
  const page = BRANCH_NAV_PAGES.find(p => p.id === pageId);
  if (!page) return true;
  if (!page.hideable) return true;

  if (pageId === 'ic-transfer-admin') {
    return !isICTransferAdminHidden(hiddenPages);
  }

  if (pageId === 'ic-transfer') {
    return !isICTransferBranchHidden(hiddenPages);
  }

  const normalized = normalizeHiddenPages(hiddenPages);
  return !normalized.includes(pageId);
}

export function getPageIdFromBranchPathname(pathname: string, slug: string): BranchPageId | null {
  const prefix = `/${slug}`;
  if (pathname === prefix || pathname === `${prefix}/`) return 'dashboard';

  if (!pathname.startsWith(`${prefix}/`)) return null;

  const rest = pathname.slice(prefix.length);
  const segment = rest.split('/').filter(Boolean)[0];
  if (!segment) return 'dashboard';

  return PATH_SEGMENT_TO_PAGE_ID[segment] ?? null;
}

export function filterBranchNavPages(
  pageIds: string[],
  hiddenPages?: string[] | null,
): string[] {
  return pageIds.filter(id => isBranchPageEnabled(id, hiddenPages));
}
