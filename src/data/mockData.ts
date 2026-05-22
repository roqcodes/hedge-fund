// ═══════════════════════════════════════════════════════════
// HEDGE Capital Management — Mock Data (from branch ledger)
// CASH + GOLD positions per entity (AED)
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

/** Ledger rows from consolidated branch position sheet */
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

// ─── TRANSACTIONS ────────────────────────────────────────
export const transactions: Transaction[] = [
  {
    id: 'TXN001',
    date: '2026-05-03T10:30:00+04:00',
    from: 'HQ Treasury',
    to: 'AEROCITY',
    amount: 2_500_000,
    type: 'allocation',
    status: 'completed',
    notes: 'Capital top-up — Aerocity Delhi',
  },
  {
    id: 'TXN002',
    date: '2026-05-03T09:15:00+04:00',
    from: 'MAALI',
    to: 'TANZANIA',
    amount: 500_000,
    type: 'transfer',
    status: 'completed',
    notes: 'Inter-branch liquidity — East Africa',
  },
  {
    id: 'TXN003',
    date: '2026-05-02T14:20:00+04:00',
    from: 'HQ Treasury',
    to: 'BAB AL TAWASEL',
    amount: 1_000_000,
    type: 'allocation',
    status: 'completed',
    notes: 'Working capital allocation',
  },
  {
    id: 'TXN004',
    date: '2026-05-02T11:45:00+04:00',
    from: 'BAHRAIN - IC',
    to: 'Vendor — Office Lease',
    amount: 45_000,
    type: 'expense',
    status: 'completed',
    notes: 'Office space rental — May 2026',
    category: 'OPEX',
  },
  {
    id: 'TXN005',
    date: '2026-05-01T16:30:00+04:00',
    from: 'Client — Regional Partner',
    to: 'MAADA',
    amount: 125_000,
    type: 'profit',
    status: 'completed',
    notes: 'Management fee recovery — April',
  },
  {
    id: 'TXN006',
    date: '2026-05-01T13:00:00+04:00',
    from: 'DELHI - AS IC',
    to: 'Vendor — IT Infra',
    amount: 72_000,
    type: 'expense',
    status: 'completed',
    notes: 'Server infrastructure upgrade',
    category: 'CAPEX',
  },
  {
    id: 'TXN007',
    date: '2026-04-30T10:00:00+04:00',
    from: 'UGANDA',
    to: 'TANZ WORK SHOP CAPITAL',
    amount: 30_000,
    type: 'transfer',
    status: 'completed',
    notes: 'Workshop capital replenishment',
  },
  {
    id: 'TXN008',
    date: '2026-04-30T15:45:00+04:00',
    from: 'Client — Gulf Holdings',
    to: 'JEDA- COMPANY',
    amount: 95_000,
    type: 'profit',
    status: 'completed',
    notes: 'Consulting retainer — Q1 settlement',
  },
  {
    id: 'TXN009',
    date: '2026-04-29T09:30:00+04:00',
    from: 'HQ Treasury',
    to: 'MAALI',
    amount: 400_000,
    type: 'allocation',
    status: 'completed',
    notes: 'Liquidity support — MAALI',
  },
  {
    id: 'TXN010',
    date: '2026-04-29T12:00:00+04:00',
    from: 'ABU YASIN GROUP',
    to: 'Vendor — Compliance Audit',
    amount: 35_000,
    type: 'expense',
    status: 'pending',
    notes: 'Annual compliance audit fees',
    category: 'OPEX',
  },
  {
    id: 'TXN011',
    date: '2026-04-28T08:15:00+04:00',
    from: 'Client — Bangkok JV',
    to: 'BANKOK GROUP NEW',
    amount: 68_000,
    type: 'profit',
    status: 'completed',
    notes: 'Joint venture distribution — March',
  },
  {
    id: 'TXN012',
    date: '2026-04-28T14:30:00+04:00',
    from: 'RESTUARENT',
    to: 'Vendor — Kitchen Equipment',
    amount: 42_000,
    type: 'expense',
    status: 'completed',
    notes: 'Restaurant equipment refresh',
    category: 'CAPEX',
  },
];

// ─── EXPENSES (CAPEX / OPEX) ────────────────────────────
export const expenses: Expense[] = [
  { id: 'EXP001', date: REPORT_DATE, branchId: 'BR001', branchName: 'AEROCITY', type: 'opex', category: 'Salaries', description: 'Staff salaries — May 2026', amount: 185_000 },
  { id: 'EXP002', date: REPORT_DATE, branchId: 'BR006', branchName: 'BAHRAIN - IC', type: 'opex', category: 'Rent', description: 'Office lease — Manama', amount: 45_000 },
  { id: 'EXP003', date: '2026-05-02', branchId: 'BR015', branchName: 'TANZANIA', type: 'capex', category: 'Equipment', description: 'Fleet vehicles (2 units)', amount: 120_000 },
  { id: 'EXP004', date: '2026-05-02', branchId: 'BR004', branchName: 'DELHI - AS IC', type: 'opex', category: 'Utilities', description: 'Electricity & internet — April', amount: 12_000 },
  { id: 'EXP005', date: '2026-05-01', branchId: 'BR012', branchName: 'RESTUARENT', type: 'capex', category: 'Fit-out', description: 'Dining area refurbishment', amount: 72_000 },
  { id: 'EXP006', date: '2026-05-01', branchId: 'BR013', branchName: 'UGANDA', type: 'opex', category: 'Travel', description: 'Regional audit visit', amount: 8_500 },
  { id: 'EXP007', date: '2026-04-30', branchId: 'BR014', branchName: 'MAALI', type: 'capex', category: 'Systems', description: 'ERP module rollout', amount: 92_000 },
  { id: 'EXP008', date: '2026-04-30', branchId: 'BR003', branchName: 'BAB AL TAWASEL', type: 'opex', category: 'Software', description: 'Treasury platform license — Q2', amount: 35_000 },
  { id: 'EXP009', date: '2026-04-29', branchId: 'BR019', branchName: 'ABU YASIN GROUP', type: 'opex', category: 'Compliance', description: 'Annual compliance audit fees', amount: 35_000 },
  { id: 'EXP010', date: '2026-04-29', branchId: 'BR010', branchName: 'JEDA- COMPANY', type: 'opex', category: 'Marketing', description: 'Regional campaign — April', amount: 22_000 },
  { id: 'EXP011', date: '2026-04-28', branchId: 'BR031', branchName: 'BANKOK GROUP NEW', type: 'capex', category: 'Vehicle', description: 'Logistics van — down payment', amount: 150_000 },
  { id: 'EXP012', date: '2026-04-28', branchId: 'BR021', branchName: 'MAADA', type: 'opex', category: 'Salaries', description: 'Staff salaries — April 2026', amount: 78_000 },
];

// ─── DAILY REPORTS ───────────────────────────────────────
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

// ─── INVOICES ────────────────────────────────────────────
export const invoices: Invoice[] = [
  { id: 'INV-2026-001', clientName: 'Gulf Regional Partner', branchId: 'BR014', branchName: 'MAALI', amount: 248_000, description: 'Management services — April 2026', date: '2026-05-01', status: 'paid' },
  { id: 'INV-2026-002', clientName: 'East Africa Trading Co.', branchId: 'BR015', branchName: 'TANZANIA', amount: 195_000, description: 'Capital advisory — Q1 FY27', date: '2026-04-30', status: 'paid' },
  { id: 'INV-2026-003', clientName: 'Bangkok JV Partners', branchId: 'BR031', branchName: 'BANKOK GROUP NEW', amount: 68_000, description: 'Joint venture fee — March', date: '2026-04-28', status: 'paid' },
  { id: 'INV-2026-004', clientName: 'Saudi Industrial Group', branchId: 'BR010', branchName: 'JEDA- COMPANY', amount: 210_000, description: 'Project oversight — May cycle', date: '2026-05-02', status: 'pending' },
  { id: 'INV-2026-005', clientName: 'Bahrain Holdings', branchId: 'BR009', branchName: 'BAHRAIN - COMPANY', amount: 45_000, description: 'Compliance review — Q4 FY26', date: '2026-04-25', status: 'overdue' },
  { id: 'INV-2026-006', clientName: 'Delhi Infrastructure Fund', branchId: 'BR001', branchName: 'AEROCITY', amount: 820_000, description: 'Advisory mandate — Phase 2', date: REPORT_DATE, status: 'pending' },
  { id: 'INV-2026-007', clientName: 'Uganda Commodities Ltd', branchId: 'BR013', branchName: 'UGANDA', amount: 156_000, description: 'Trade finance facilitation', date: '2026-04-20', status: 'paid' },
  { id: 'INV-2026-008', clientName: 'Portugal Works Consortium', branchId: 'BR032', branchName: 'PORTUGAL WORK 5191', amount: 73_000, description: 'Project 5191 milestone payment', date: '2026-05-01', status: 'pending' },
];

// ─── NOTIFICATIONS ───────────────────────────────────────
export const notifications: Notification[] = [
  { id: 'N001', message: 'Fund transfer of AED 500,000 completed — MAALI → TANZANIA', time: '10 min ago', read: false, type: 'transfer' },
  { id: 'N002', message: 'Daily report submitted by BAB AL TAWASEL', time: '25 min ago', read: false, type: 'report' },
  { id: 'N003', message: 'MAADA position updated — AED 706,189 cash on hand', time: '1 hr ago', read: false, type: 'alert' },
  { id: 'N004', message: 'Invoice INV-2026-005 is overdue — Bahrain Holdings', time: '3 hrs ago', read: true, type: 'alert' },
  { id: 'N005', message: 'AEROCITY ledger balance exceeds AED 12.5M', time: '5 hrs ago', read: true, type: 'info' },
];

// ─── P&L TREND DATA (for chart) ─────────────────────────
export const plTrendData = {
  labels: ['Apr 24', 'Apr 25', 'Apr 26', 'Apr 27', 'Apr 28', 'Apr 29', 'Apr 30', 'May 01', 'May 02', 'May 03'],
  values: [180_000, -95_000, 220_000, 310_000, -60_000, 140_000, 420_000, 290_000, 175_000, 398_352],
};

// ─── FUND DISTRIBUTION (top entities by total balance) ─────
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

// ─── INVESTORS ───────────────────────────────────────────
export const investors: Investor[] = [
  {
    id: 'INV001',
    name: 'Khalid Al Mansoori',
    email: 'k.mansoori@email.ae',
    phone: '+971 50 123 4567',
    nationality: 'UAE',
    emiratesId: '784-1985-1234567-1',
    address: 'Villa 12, Al Barsha South',
    city: 'Dubai',
    country: 'United Arab Emirates',
    cashDeposit: 5_500_000,
    goldDeposit: 185_000,
    goldWeightGrams: 420,
    status: 'active',
    riskProfile: 'balanced',
    kycStatus: 'verified',
    joinedDate: '2023-06-15',
    lastActivity: '2026-05-03T09:30:00+04:00',
    assignedBranchId: 'BR014',
    assignedBranchName: 'MAALI',
    preferredContact: 'whatsapp',
    notes: 'Long-term partner; prefers quarterly statements.',
    depositHistory: [
      { id: 'DEP001', date: '2026-04-28', type: 'cash', amount: 500_000, notes: 'Top-up — Q2 allocation' },
      { id: 'DEP002', date: '2026-03-10', type: 'gold', amount: 45_000, goldGrams: 100, notes: 'Physical gold intake' },
    ],
  },
  {
    id: 'INV002',
    name: 'Fatima Al Hashimi',
    email: 'fatima.hashimi@corp.ae',
    phone: '+971 55 987 6543',
    nationality: 'UAE',
    emiratesId: '784-1990-7654321-2',
    address: 'Tower B, Business Bay',
    city: 'Dubai',
    country: 'United Arab Emirates',
    cashDeposit: 2_800_000,
    goldDeposit: 320_000,
    goldWeightGrams: 725,
    status: 'active',
    riskProfile: 'conservative',
    kycStatus: 'verified',
    joinedDate: '2024-01-20',
    lastActivity: '2026-05-02T14:15:00+04:00',
    assignedBranchId: 'BR021',
    assignedBranchName: 'MAADA',
    preferredContact: 'email',
    depositHistory: [
      { id: 'DEP003', date: '2026-05-01', type: 'gold', amount: 80_000, goldGrams: 180 },
      { id: 'DEP004', date: '2026-02-14', type: 'cash', amount: 1_200_000 },
    ],
  },
  {
    id: 'INV003',
    name: 'Rajesh Mehta',
    email: 'rajesh.mehta@invest.in',
    phone: '+91 98 7654 3210',
    nationality: 'India',
    passportNo: 'Z1234567',
    address: 'Bandra Kurla Complex, Unit 402',
    city: 'Mumbai',
    country: 'India',
    cashDeposit: 3_200_000,
    goldDeposit: 0,
    goldWeightGrams: 0,
    status: 'active',
    riskProfile: 'aggressive',
    kycStatus: 'verified',
    joinedDate: '2024-08-05',
    lastActivity: '2026-05-03T11:00:00+04:00',
    assignedBranchId: 'BR001',
    assignedBranchName: 'AEROCITY',
    preferredContact: 'phone',
    depositHistory: [{ id: 'DEP005', date: '2026-04-15', type: 'cash', amount: 800_000, notes: 'Delhi corridor expansion' }],
  },
  {
    id: 'INV004',
    name: 'Hassan Rahmathullah',
    email: 'h.rahmathullah@group.ae',
    phone: '+971 52 444 8899',
    nationality: 'UAE',
    emiratesId: '784-1978-9988776-3',
    address: 'Deira, Port Saeed Road',
    city: 'Dubai',
    country: 'United Arab Emirates',
    cashDeposit: 1_850_000,
    goldDeposit: 95_000,
    goldWeightGrams: 215,
    status: 'active',
    riskProfile: 'balanced',
    kycStatus: 'verified',
    joinedDate: '2022-11-30',
    lastActivity: '2026-04-30T16:45:00+04:00',
    assignedBranchId: 'BR049',
    assignedBranchName: 'RAHMATHULLH GROUP — OPS',
    preferredContact: 'whatsapp',
    notes: 'Family office principal.',
    depositHistory: [
      { id: 'DEP006', date: '2026-01-22', type: 'cash', amount: 350_000 },
      { id: 'DEP007', date: '2025-12-05', type: 'gold', amount: 55_000, goldGrams: 125 },
    ],
  },
  {
    id: 'INV005',
    name: 'Sarah Ochieng',
    email: 's.ochieng@capital.ug',
    phone: '+256 712 345 678',
    nationality: 'Uganda',
    passportNo: 'UGA987654',
    address: 'Plot 45, Kampala Road',
    city: 'Kampala',
    country: 'Uganda',
    cashDeposit: 950_000,
    goldDeposit: 42_000,
    goldWeightGrams: 95,
    status: 'active',
    riskProfile: 'balanced',
    kycStatus: 'verified',
    joinedDate: '2025-02-10',
    lastActivity: '2026-05-01T08:20:00+04:00',
    assignedBranchId: 'BR013',
    assignedBranchName: 'UGANDA',
    preferredContact: 'email',
    depositHistory: [{ id: 'DEP008', date: '2026-03-18', type: 'cash', amount: 250_000 }],
  },
  {
    id: 'INV006',
    name: 'Yusuf Al Jeddawi',
    email: 'y.aljeddawi@sa.com',
    phone: '+966 55 112 2334',
    nationality: 'Saudi Arabia',
    passportNo: 'SA4455667',
    address: 'Al Andalus District',
    city: 'Jeddah',
    country: 'Saudi Arabia',
    cashDeposit: 1_200_000,
    goldDeposit: 210_000,
    goldWeightGrams: 475,
    status: 'active',
    riskProfile: 'conservative',
    kycStatus: 'verified',
    joinedDate: '2024-05-22',
    lastActivity: '2026-04-29T13:30:00+04:00',
    assignedBranchId: 'BR010',
    assignedBranchName: 'JEDA- COMPANY',
    preferredContact: 'phone',
    depositHistory: [{ id: 'DEP009', date: '2026-04-02', type: 'gold', amount: 60_000, goldGrams: 135 }],
  },
  {
    id: 'INV007',
    name: 'Thomas Berg',
    email: 't.berg@portugal.eu',
    phone: '+351 91 234 5678',
    nationality: 'Portugal',
    passportNo: 'PT7788990',
    address: 'Avenida da Liberdade 120',
    city: 'Lisbon',
    country: 'Portugal',
    cashDeposit: 480_000,
    goldDeposit: 0,
    goldWeightGrams: 0,
    status: 'active',
    riskProfile: 'aggressive',
    kycStatus: 'verified',
    joinedDate: '2025-09-01',
    lastActivity: '2026-04-27T10:00:00+04:00',
    assignedBranchId: 'BR032',
    assignedBranchName: 'PORTUGAL WORK 5191',
    preferredContact: 'email',
    depositHistory: [{ id: 'DEP010', date: '2025-11-12', type: 'cash', amount: 480_000, notes: 'Initial mandate deposit' }],
  },
  {
    id: 'INV008',
    name: 'Priya Sharma',
    email: 'priya.sharma@invest.in',
    phone: '+91 99 8877 6655',
    nationality: 'India',
    passportNo: 'M8877665',
    address: 'Andheri East, MIDC',
    city: 'Mumbai',
    country: 'India',
    cashDeposit: 0,
    goldDeposit: 0,
    goldWeightGrams: 0,
    status: 'pending',
    riskProfile: 'balanced',
    kycStatus: 'pending',
    joinedDate: '2026-04-28',
    lastActivity: '2026-04-28T15:00:00+04:00',
    preferredContact: 'email',
    notes: 'KYC documents under review.',
    depositHistory: [],
  },
  {
    id: 'INV009',
    name: 'Abdullah Al Qasimi',
    email: 'a.qasimi@family.ae',
    phone: '+971 56 333 2211',
    nationality: 'UAE',
    emiratesId: '784-1982-5544332-4',
    address: 'Sharjah, Al Majaz',
    city: 'Sharjah',
    country: 'United Arab Emirates',
    cashDeposit: 750_000,
    goldDeposit: 28_000,
    goldWeightGrams: 62,
    status: 'inactive',
    riskProfile: 'conservative',
    kycStatus: 'expired',
    joinedDate: '2021-03-08',
    lastActivity: '2025-11-20T09:00:00+04:00',
    assignedBranchId: 'BR003',
    assignedBranchName: 'BAB AL TAWASEL',
    preferredContact: 'phone',
    notes: 'Account dormant — KYC renewal required.',
    depositHistory: [{ id: 'DEP011', date: '2024-06-01', type: 'cash', amount: 750_000 }],
  },
];

export function investorTotalExposure(inv: Pick<Investor, 'cashDeposit' | 'goldDeposit'>): number {
  return inv.cashDeposit + inv.goldDeposit;
}

// ─── HELPERS ─────────────────────────────────────────────
export function formatAED(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-AE', {
    maximumFractionDigits: 0,
    style: 'currency',
    currency: 'AED',
  });
  return amount < 0 ? `-${formatted}` : formatted;
}

/** @deprecated Use formatAED instead */
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

// ─── DEALS ───────────────────────────────────────────────
export const deals: Deal[] = [
  {
    id: 'DL001',
    name: 'Real Estate Acquisition - Downtown',
    amount: 15_000_000,
    investors: [
      { investorId: 'INV001', investorName: 'Khalid Al Mansoori', amount: 5_000_000, isGold: false },
      { investorId: 'INV002', investorName: 'Fatima Al Hashimi', amount: 2_500_000, isGold: false },
    ],
    totalInvestment: 7_500_000,
    balance: -7_500_000, // Underfunded
    toBranchId: 'BR003',
    toBranchName: 'BAB AL TAWASEL',
    status: 'active',
    date: '2026-05-01T10:00:00+04:00',
  },
  {
    id: 'DL002',
    name: 'Tech Startup Seed Funding',
    amount: 2_000_000,
    investors: [
      { investorId: 'INV003', investorName: 'Rajesh Mehta', amount: 2_500_000, isGold: false },
    ],
    totalInvestment: 2_500_000,
    balance: 500_000, // Overfunded
    toBranchId: 'BR001',
    toBranchName: 'AEROCITY',
    status: 'completed',
    date: '2026-04-15T14:30:00+04:00',
  },
];

// ─── EXTENDED CHARTS & DATA ──────────────────────────────
export const revenueExpenseData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  revenue: [4_200_000, 4_850_000, 4_600_000, 5_100_000, 4_950_000, 5_400_000],
  expense: [2_800_000, 3_100_000, 2_950_000, 3_400_000, 3_200_000, 3_550_000],
};

export const recentActivities = [
  { id: 'ACT1', title: 'Capital Allocation', desc: 'AED 2,500,000 allocated to AEROCITY', time: '2 hours ago', type: 'allocation', icon: '💰' },
  { id: 'ACT2', title: 'Fund Transfer', desc: 'MAALI transferred AED 500,000 to TANZANIA', time: '5 hours ago', type: 'transfer', icon: '🔄' },
  { id: 'ACT3', title: 'Expense Logged', desc: 'AED 45,000 for Office Lease (BAHRAIN - IC)', time: 'Yesterday', type: 'expense', icon: '🧾' },
  { id: 'ACT4', title: 'Invoice Paid', desc: 'AED 248,000 received — MAALI management fees', time: 'Yesterday', type: 'profit', icon: '✅' },
  { id: 'ACT5', title: 'Position Update', desc: 'MAADA cash balance AED 706,189', time: '2 days ago', type: 'info', icon: '🏢' },
];
