export interface DealTransaction {
  id: string;
  date: string;
  deal: string; // Deal ID or Name
  weight: number;
  rate: number;
  pureCostAed: number;
  salesValueInr: number;
  rvRate: number;
  salesAed: number;
  expenses: number;
  grossProfit: number;
  nPPerGr: number;
  tProfit: number;
  mange: number;
  yNet: number;
  srk: number;
  aibakProfit: number;
  fixOrUnfix: 'fixed' | 'unfixed' | string;
  marginDeposit: number;
  premiumDiscount: number;
}

export const SPORTS_MOCK_DATA: DealTransaction[] = [
  {
    id: 'txn-1',
    date: '2026-04-01',
    deal: '1',
    weight: 6998,
    rate: 546.02,
    pureCostAed: 3821047.96,
    salesValueInr: 104381602.00,
    rvRate: 3851,
    salesAed: 4019735.49,
    expenses: 44698,
    grossProfit: 153989.53,
    nPPerGr: 22.00,
    tProfit: 22004.79,
    mange: 4400.96,
    yNet: 11735.89,
    srk: 5867.94,
    aibakProfit: 4400.96,
    fixOrUnfix: 'fixed',
    marginDeposit: 0,
    premiumDiscount: 0,
  },
  {
    id: 'txn-2',
    date: '2026-04-02',
    deal: '2',
    weight: 6998,
    rate: 546.02,
    pureCostAed: 3821040.15,
    salesValueInr: 104381602.00,
    rvRate: 3851,
    salesAed: 4019735.49,
    expenses: 44698,
    grossProfit: 153997.34,
    nPPerGr: 22.01,
    tProfit: 22005.91,
    mange: 4401.18,
    yNet: 11736.48,
    srk: 5868.24,
    aibakProfit: 4401.18,
    fixOrUnfix: 'fixed',
    marginDeposit: 0,
    premiumDiscount: 0,
  },
  {
    id: 'txn-3',
    date: '2026-04-05',
    deal: '3',
    weight: 5800,
    rate: 551.85,
    pureCostAed: 3200739.83,
    salesValueInr: 86922570.00,
    rvRate: 3857,
    salesAed: 3352603.52,
    expenses: 39461.15,
    grossProfit: 112402.54,
    nPPerGr: 19.38,
    tProfit: 9689.87,
    mange: 484.49,
    yNet: 6136.92,
    srk: 3068.46,
    aibakProfit: 3875.95,
    fixOrUnfix: 'unfixed',
    marginDeposit: 0,
    premiumDiscount: 0,
  }
];
