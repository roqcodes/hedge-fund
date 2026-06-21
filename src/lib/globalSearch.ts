import type { Branch, Deal, Entity, Investor, PhysicalBuy, Transaction } from '@/types';

export type GlobalSearchCategory =
  | 'pages'
  | 'branches'
  | 'groups'
  | 'transactions'
  | 'entities'
  | 'investors'
  | 'physical'
  | 'products'
  | 'marketplace';

export type GlobalSearchResult = {
  id: string;
  category: GlobalSearchCategory;
  title: string;
  subtitle?: string;
  meta?: string;
  href: string;
  badge?: string;
  badgeTone?: 'default' | 'success' | 'warning' | 'info';
};

export type GlobalSearchSection = {
  category: GlobalSearchCategory;
  label: string;
  results: GlobalSearchResult[];
};

export const SEARCH_CATEGORY_LABELS: Record<GlobalSearchCategory, string> = {
  pages: 'Pages',
  branches: 'Branches',
  groups: 'Groups & Deals',
  transactions: 'Transactions',
  entities: 'Entities',
  investors: 'Investors',
  physical: 'Physical',
  products: 'Products',
  marketplace: 'Marketplace',
};

export const SEARCH_PAGE_ITEMS: {
  id: string;
  label: string;
  path: string;
  keywords: string[];
  superadminOnly?: boolean;
  branchOnly?: boolean;
}[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', keywords: ['home', 'overview'] },
  { id: 'deals', label: 'Group & Deals', path: '/group', keywords: ['deals', 'groups', 'gold'] },
  { id: 'funds', label: 'Transaction', path: '/funds', keywords: ['funds', 'transfer', 'ledger', 'capital'] },
  { id: 'ic-transfer', label: 'IC Transfer & Reverse', path: '/ic-transfer', keywords: ['intercompany', 'ic'], branchOnly: true },
  { id: 'finance', label: 'Finance - Reports', path: '/finance', keywords: ['finance', 'reports', 'expense', 'invoice'] },
  { id: 'physical', label: 'Physical', path: '/physical', keywords: ['gold', 'buy', 'sell', 'inventory'] },
  { id: 'investors', label: 'Investors', path: '/investors', keywords: ['investor', 'capital', 'kyc'] },
  { id: 'usdt', label: 'USDT', path: '/usdt', keywords: ['crypto', 'usdt', 'stablecoin'] },
  { id: 'marketplace', label: 'Marketplace', path: '/marketplace', keywords: ['marketplace', 'tax', 'invoice', 'stock'] },
  { id: 'products', label: 'Products', path: '/products', keywords: ['products', 'catalogue', 'sku', 'inventory'] },
  { id: 'settings', label: 'Settings', path: '/settings', keywords: ['settings', 'profile', 'branch'] },
  { id: 'branches', label: 'Branches', path: '/branches', keywords: ['branches', 'locations'], superadminOnly: true },
  { id: 'users', label: 'Users & Roles', path: '/users', keywords: ['users', 'roles', 'admin'], superadminOnly: true },
  { id: 'reports', label: 'Report', path: '/reports', keywords: ['report', 'daily'], superadminOnly: true },
];

const MAX_PER_CATEGORY = 6;

export function normalizeSearchQuery(q: string): string {
  return q.trim().toLowerCase();
}

export function matchesSearch(q: string, ...fields: (string | number | undefined | null)[]): boolean {
  const norm = normalizeSearchQuery(q);
  if (!norm) return false;
  return fields.some(f => String(f ?? '').toLowerCase().includes(norm));
}

export function resolveBasePath(currentSlug: string): string {
  return currentSlug === 'superadmin' ? '' : `/${currentSlug}`;
}

export function branchSlugById(branches: Branch[], branchId?: string | null): string | undefined {
  if (!branchId) return undefined;
  return branches.find(b => b.id === branchId)?.slug;
}

function dealHref(deal: Deal, branches: Branch[], basePath: string, currentSlug: string): string {
  if (basePath) return `${basePath}/group/${deal.id}`;
  const slug = branchSlugById(branches, deal.managingBranchId);
  return slug ? `/group/${slug}/${deal.id}` : `/group`;
}

function physicalHref(buy: PhysicalBuy, branches: Branch[], basePath: string): string {
  const slug = branchSlugById(branches, buy.branchId) || (basePath ? basePath.slice(1) : undefined);
  if (!slug) return basePath ? `${basePath}/physical` : '/physical';
  return basePath ? `${basePath}/physical/${buy.id}` : `/physical/${slug}/${buy.id}`;
}

export function buildContextSearchResults(input: {
  query: string;
  basePath: string;
  currentSlug: string;
  isSuperadmin: boolean;
  isBranchUser: boolean;
  branchId?: string;
  branches: Branch[];
  transactions: Transaction[];
  entities: Entity[];
  investors: Investor[];
  deals: Deal[];
  physicalBuys: PhysicalBuy[];
}): GlobalSearchSection[] {
  const q = input.query;
  if (!normalizeSearchQuery(q)) return [];

  const sections: GlobalSearchSection[] = [];
  const push = (category: GlobalSearchCategory, results: GlobalSearchResult[]) => {
    if (results.length === 0) return;
    sections.push({
      category,
      label: SEARCH_CATEGORY_LABELS[category],
      results: results.slice(0, MAX_PER_CATEGORY),
    });
  };

  const pageResults: GlobalSearchResult[] = [];
  for (const page of SEARCH_PAGE_ITEMS) {
    if (page.superadminOnly && !input.isSuperadmin) continue;
    if (page.branchOnly && input.isSuperadmin && !input.basePath) continue;
    if (page.branchOnly && input.isSuperadmin && input.basePath) continue;
    const haystack = [page.label, page.id, ...page.keywords];
    if (!matchesSearch(q, ...haystack)) continue;
    const href = page.id === 'dashboard' ? (input.basePath || '/') : `${input.basePath}${page.path}`;
    pageResults.push({
      id: `page-${page.id}`,
      category: 'pages',
      title: page.label,
      subtitle: 'Navigate to page',
      href,
      badge: 'Page',
      badgeTone: 'info',
    });
  }
  push('pages', pageResults);

  if (input.isSuperadmin) {
    const branchResults = input.branches
      .filter(b => matchesSearch(q, b.name, b.location, b.managerName, b.slug, b.city))
      .map(b => ({
        id: `branch-${b.id}`,
        category: 'branches' as const,
        title: b.name,
        subtitle: b.location,
        meta: b.managerName,
        href: b.slug ? `/funds/${b.slug}` : '/branches',
        badge: b.status,
        badgeTone: (b.status === 'active' ? 'success' : 'default') as GlobalSearchResult['badgeTone'],
      }));
    push('branches', branchResults);
  }

  const scopedDeals = input.deals.filter(d => {
    if (input.isBranchUser && input.branchId) {
      return d.managingBranchId === input.branchId;
    }
    return true;
  });

  const groupResults: GlobalSearchResult[] = [];
  const seenGroups = new Set<string>();
  for (const deal of scopedDeals) {
    const groupKey = deal.groupName || 'General';
    const match = matchesSearch(q, deal.name, deal.groupName, deal.toBranchName, deal.id);
    if (!match) continue;

    if (!seenGroups.has(groupKey)) {
      seenGroups.add(groupKey);
      groupResults.push({
        id: `group-${groupKey}-${deal.id}`,
        category: 'groups',
        title: groupKey,
        subtitle: deal.groupType === 'gold' ? 'Gold group' : 'Currency group',
        meta: `${scopedDeals.filter(d => (d.groupName || 'General') === groupKey).length} deal(s)`,
        href: dealHref(deal, input.branches, input.basePath, input.currentSlug),
        badge: deal.status,
        badgeTone: deal.status === 'active' ? 'success' : 'warning',
      });
    }

    if (matchesSearch(q, deal.name, deal.id)) {
      groupResults.push({
        id: `deal-${deal.id}`,
        category: 'groups',
        title: deal.name,
        subtitle: groupKey,
        meta: deal.toBranchName,
        href: dealHref(deal, input.branches, input.basePath, input.currentSlug),
        badge: 'Deal',
        badgeTone: 'info',
      });
    }
  }
  push('groups', groupResults);

  const scopedTxns = input.transactions.filter(t => {
    if (input.isBranchUser && input.branchId) return t.branchId === input.branchId;
    return true;
  });

  const fundsPath = input.basePath ? `${input.basePath}/funds` : '/funds';
  const investorsPath = input.basePath ? `${input.basePath}/investors` : '/investors';

  push(
    'transactions',
    scopedTxns
      .filter(t =>
        matchesSearch(q, t.id, t.from, t.to, t.notes, t.type, t.category, ...(t.tags || [])),
      )
      .map(t => ({
        id: `txn-${t.id}`,
        category: 'transactions' as const,
        title: `${t.from} → ${t.to}`,
        subtitle: t.notes || t.type,
        meta: `${t.assetType === 'gold' ? `${t.amount.toFixed(2)}g` : `AED ${t.amount.toLocaleString()}`}`,
        href: fundsPath,
        badge: t.status,
        badgeTone: (t.status === 'completed' ? 'success' : t.status === 'pending' ? 'warning' : 'default') as GlobalSearchResult['badgeTone'],
      })),
  );

  const scopedEntities = input.entities.filter(e => {
    if (input.isBranchUser && input.branchId) return e.branchId === input.branchId;
    return true;
  });

  push(
    'entities',
    scopedEntities
      .filter(e => matchesSearch(q, e.name, e.phone, e.id))
      .map(e => ({
        id: `entity-${e.id}`,
        category: 'entities' as const,
        title: e.name,
        subtitle: e.phone || 'Fund entity',
        href: fundsPath,
        badge: 'Entity',
        badgeTone: 'info' as const,
      })),
  );

  const scopedInvestors = input.investors.filter(inv => {
    if (input.isBranchUser && input.branchId) {
      return inv.assignedBranchId === input.branchId || inv.isGlobal;
    }
    return true;
  });

  push(
    'investors',
    scopedInvestors
      .filter(inv => matchesSearch(q, inv.name, inv.email, inv.phone, inv.nationality, inv.emiratesId))
      .map(inv => ({
        id: `inv-${inv.id}`,
        category: 'investors' as const,
        title: inv.name,
        subtitle: inv.email,
        meta: inv.assignedBranchName || (inv.isGlobal ? 'Global' : undefined),
        href: `${investorsPath}?investor=${inv.id}`,
        badge: inv.status,
        badgeTone: (inv.status === 'active' ? 'success' : 'warning') as GlobalSearchResult['badgeTone'],
      })),
  );

  const scopedBuys = input.physicalBuys.filter(b => {
    if (input.isBranchUser && input.branchId) return b.branchId === input.branchId;
    return true;
  });

  push(
    'physical',
    scopedBuys
      .filter(b => matchesSearch(q, b.id, b.particulars, b.status))
      .map(b => ({
        id: `phy-${b.id}`,
        category: 'physical' as const,
        title: b.particulars || b.id,
        subtitle: `${b.pureGram?.toFixed?.(2) ?? b.pureGram}g pure`,
        meta: b.date ? new Date(b.date).toLocaleDateString() : undefined,
        href: physicalHref(b, input.branches, input.basePath),
        badge: b.status,
        badgeTone: (b.status === 'active' ? 'success' : 'default') as GlobalSearchResult['badgeTone'],
      })),
  );

  return sections;
}

export function mergeSearchSections(
  contextSections: GlobalSearchSection[],
  catalogSections: GlobalSearchSection[],
): GlobalSearchSection[] {
  const order: GlobalSearchCategory[] = [
    'pages',
    'branches',
    'groups',
    'transactions',
    'entities',
    'investors',
    'physical',
    'products',
    'marketplace',
  ];
  const map = new Map<GlobalSearchCategory, GlobalSearchResult[]>();

  for (const section of [...contextSections, ...catalogSections]) {
    const existing = map.get(section.category) || [];
    map.set(section.category, [...existing, ...section.results].slice(0, MAX_PER_CATEGORY));
  }

  return order
    .map(category => {
      const results = map.get(category);
      if (!results?.length) return null;
      return { category, label: SEARCH_CATEGORY_LABELS[category], results };
    })
    .filter((s): s is GlobalSearchSection => !!s);
}
