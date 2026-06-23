export type BranchPageId =
  | 'dashboard'
  | 'deals'
  | 'funds'
  | 'transactions-beta'
  | 'ic-transfer'
  | 'finance'
  | 'physical'
  | 'marketplace'
  | 'products'
  | 'customers'
  | 'investors'
  | 'usdt'
  | 'settings';

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
  { id: 'ic-transfer', label: 'IC Transfer & Reverse', path: '/ic-transfer', hideable: true },
  { id: 'finance', label: 'Finance - Reports', path: '/finance', hideable: true },
  { id: 'physical', label: 'Physical Sales', path: '/physical-sales', hideable: true },
  { id: 'marketplace', label: 'Physical', path: '/physical', hideable: true },
  { id: 'products', label: 'Products', path: '/products', hideable: true },
  { id: 'customers', label: 'Customers', path: '/customers', hideable: true },
  { id: 'investors', label: 'Investors', path: '/investors', hideable: true },
  { id: 'usdt', label: 'USDT', path: '/usdt', hideable: true },
  { id: 'settings', label: 'Settings', path: '/settings', hideable: false },
];

export const BRANCH_NAV_PAGE_IDS = BRANCH_NAV_PAGES.map(p => p.id);

export const HIDEABLE_BRANCH_PAGE_IDS = BRANCH_NAV_PAGES.filter(p => p.hideable).map(p => p.id);

const PATH_SEGMENT_TO_PAGE_ID: Record<string, BranchPageId> = {
  group: 'deals',
  funds: 'funds',
  transactions: 'transactions-beta',
  'ic-transfer': 'ic-transfer',
  finance: 'finance',
  physical: 'marketplace',
  'physical-sales': 'physical',
  investors: 'investors',
  usdt: 'usdt',
  products: 'products',
  customers: 'customers',
  settings: 'settings',
  reports: 'finance',
};

export function isBranchPageEnabled(pageId: string, hiddenPages?: string[] | null): boolean {
  const page = BRANCH_NAV_PAGES.find(p => p.id === pageId);
  if (!page) return true;
  if (!page.hideable) return true;
  return !(hiddenPages ?? []).includes(pageId);
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
