import { BRANCH_NAV_PAGES, BranchPageId, isBranchPageEnabled } from '@/lib/branchPages';

export type CustomerModuleTabId = 'physical' | 'marketplace' | 'usdt' | 'ic-funds';

const CUSTOMER_TAB_PAGE_IDS: Record<CustomerModuleTabId, BranchPageId> = {
  physical: 'physical',
  marketplace: 'marketplace',
  usdt: 'usdt',
  'ic-funds': 'ic-funds',
};

export function getEnabledCustomerModuleTabs(hiddenPages?: string[] | null): {
  id: CustomerModuleTabId;
  label: string;
}[] {
  return (['physical', 'marketplace', 'usdt', 'ic-funds'] as CustomerModuleTabId[])
    .filter(id => isBranchPageEnabled(CUSTOMER_TAB_PAGE_IDS[id], hiddenPages))
    .map(id => ({
      id,
      label: BRANCH_NAV_PAGES.find(p => p.id === CUSTOMER_TAB_PAGE_IDS[id])?.label ?? id,
    }));
}
