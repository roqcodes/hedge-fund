// ═══════════════════════════════════════════════════════════
// HEDGE Capital Management — Helper Functions & Branch Data
// ═══════════════════════════════════════════════════════════

import { Branch, Transaction, Expense, DailyReport, Invoice, Notification, Investor, Deal } from '@/types';

const REPORT_DATE = '2026-05-03';
const BASE_ACTIVITY = '2026-05-03T10:00:00+04:00';

type BranchSeed = {
  name: string;
  location: string;
  cash: number;
  gold?: number;
  managerName?: string;
  status?: 'active' | 'inactive';
};

const BRANCH_SEEDS: BranchSeed[] = [
  { name: 'AEROCITY', location: 'Delhi, India', cash: 12_500_000 },
  { name: 'BLUESHINE', location: 'Dubai, UAE', cash: 0, gold: 2_250 },
  { name: 'BAB AL TAWASEL', location: 'Dubai, UAE', cash: 6_000_000, gold: 1_000 },
  { name: 'DELHI - AS IC', location: 'Delhi, India', cash: 2_700_000 },
  { name: 'RAHMATHULLH GROUP', location: 'Dubai, UAE', cash: 0, status: 'inactive' },
  { name: 'BAHRAIN - IC', location: 'Manama, Bahrain', cash: 578_592 },
  { name: 'MADANI', location: 'Dubai, UAE', cash: 0, status: 'inactive' },
  { name: 'MADANI GROUP FEB MGMNT FEE REC', location: 'Dubai, UAE', cash: 0, status: 'inactive' },
  { name: 'BAHRAIN - COMPANY', location: 'Manama, Bahrain', cash: 289_017 },
  { name: 'JEDA- COMPANY', location: 'Jeddah, Saudi Arabia', cash: 874_306 },
  { name: 'AL NOOR BH', location: 'Manama, Bahrain', cash: 150_000 },
  { name: 'RESTUARENT', location: 'Dubai, UAE', cash: 290_000 },
  { name: 'UGANDA', location: 'Kampala, Uganda', cash: 1_218_750 },
  { name: 'MAALI', location: 'Dubai, UAE', cash: 2_480_098 },
  { name: 'TANZANIA', location: 'Dar es Salaam, Tanzania', cash: 4_000_000 },
  { name: 'TANZ WORK SHOP CAPITAL', location: 'Dar es Salaam, Tanzania', cash: 35_433 },
  { name: 'RAWANDA GROUP 1', location: 'Kigali, Rwanda', cash: 14_410 },
  { name: 'RAWANDA 2 (25 K $)', location: 'Kigali, Rwanda', cash: 91_750 },
  { name: 'ABU YASIN GROUP', location: 'Dubai, UAE', cash: 360_000 },
  { name: 'ABU YASIN GROUP MGMNT FEE', location: 'Dubai, UAE', cash: 0, status: 'inactive' },
  { name: 'MAADA', location: 'Dubai, UAE', cash: 706_189 },
  { name: 'MAADA NEW COMPANY GROUP', location: 'Dubai, UAE', cash: 250_000 },
  { name: 'BANGKOK CAPITAL', location: 'Bangkok, Thailand', cash: 76_880 },
  { name: 'MUMBAI IC SRK', location: 'Mumbai, India', cash: 0 },
  { name: 'SUPER CHAIN', location: 'Dubai, UAE', cash: 0, status: 'inactive' },
  { name: 'BACK OFFICE', location: 'Dubai, UAE — HQ', cash: 0, gold: 2_547.91 },
  { name: 'DIAMOND 30 % (120 K )', location: 'Dubai, UAE', cash: 120_000 },
  { name: 'RAHMATHULLH GROUP — OPS', location: 'Dubai, UAE', cash: 120_000 },
  { name: 'TRUCK CAPITAL', location: 'Dubai, UAE', cash: 50_000 },
  { name: 'SPORT GROUP', location: 'Dubai, UAE', cash: 0, status: 'inactive' },
  { name: 'BANKOK GROUP NEW', location: 'Bangkok, Thailand', cash: 210_000 },
  { name: 'PORTUGAL WORK 5191', location: 'Lisbon, Portugal', cash: 75_207 },
];

function seedToBranch(seed: BranchSeed, index: number): Branch {
  const id = `BR${String(index + 1).padStart(3, '0')}`;
  const gold = seed.gold ?? 0;
  const cash = seed.cash;
  const total = cash + gold;
  const active = seed.status !== 'inactive' && total > 0;
  const dailyPL = active ? Math.round(total * 0.012) : 0;
  const openingBalance = active ? total - dailyPL : 0;

  return {
    id,
    name: seed.name,
    location: seed.location,
    managerName: seed.managerName ?? 'Group Treasury',
    cashBalance: cash,
    goldBalance: gold,
    currentBalance: total,
    openingBalance,
    closingBalance: total,
    dailyPL,
    status: seed.status ?? (active ? 'active' : 'inactive'),
    lastActivity: active ? BASE_ACTIVITY : '2026-04-15T09:00:00+04:00',
    createdAt: `2024-${String((index % 12) + 1).padStart(2, '0')}-01T09:00:00+04:00`,
  };
}

export const branches: Branch[] = BRANCH_SEEDS.map(seedToBranch);

export const transactions: Transaction[] = [];
export const expenses: Expense[] = [];

function buildDailyReport(branch: Branch, date: string): DailyReport {
  const expense = Math.round(branch.currentBalance * 0.008);
  const profit = branch.dailyPL + expense;
  return {
    date,
    branchId: branch.id,
    branchName: branch.name,
    openingBalance: branch.openingBalance,
    profit,
    expense,
    closingBalance: branch.closingBalance,
  };
}

const activeBranches = branches.filter(b => b.status === 'active' && b.currentBalance > 0);

export const dailyReports: DailyReport[] = [
  ...activeBranches.map(b => buildDailyReport(b, REPORT_DATE)),
  ...activeBranches.map(b => buildDailyReport(
    { ...b, openingBalance: Math.round(b.openingBalance * 0.995), closingBalance: b.openingBalance, dailyPL: Math.round(b.dailyPL * 0.9) },
    '2026-05-02',
  )),
];

export const invoices: Invoice[] = [];
export const notifications: Notification[] = [];
export const investors: Investor[] = [];
export const deals: Deal[] = [];

export const plTrendData = {
  labels: [] as string[],
  values: [] as number[],
};

const CHART_COLORS = ['#D11439', '#F57C00', '#0FA958', '#2196F3', '#9C27B0', '#64748B'];

export const fundDistribution = [...branches]
  .filter(b => b.currentBalance > 0)
  .sort((a, b) => b.currentBalance - a.currentBalance)
  .slice(0, 6)
  .map((b, i) => ({
    branch: b.name,
    amount: b.currentBalance,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

export const revenueExpenseData = {
  labels: [] as string[],
  revenue: [] as number[],
  expense: [] as number[],
};

export const recentActivities: any[] = [];

export function investorTotalExposure(inv: Pick<Investor, 'cashDeposit' | 'goldDeposit'>): number {
  return inv.cashDeposit + inv.goldDeposit;
}

export function formatAED(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-AE', {
    maximumFractionDigits: 0,
    style: 'currency',
    currency: 'AED',
  });
  return amount < 0 ? `-${formatted}` : formatted;
}

export const formatINR = formatAED;

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-AE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateId(prefix: string): string {
  return `${prefix}${Date.now().toString(36).toUpperCase()}`;
}
