// ═══════════════════════════════════════════════════════════
// HEDGE Capital Management — Realistic Mock Data (INR)
// ═══════════════════════════════════════════════════════════

import { Branch, Transaction, Expense, DailyReport, Invoice, Notification } from '@/types';

// ─── BRANCHES ────────────────────────────────────────────
export const branches: Branch[] = [
  {
    id: 'BR001',
    name: 'Alpha Strategies',
    location: 'Mumbai, Maharashtra',
    managerName: 'Rajesh Sharma',
    currentBalance: 245000,
    openingBalance: 200000,
    closingBalance: 245000,
    dailyPL: 45000,
    status: 'active',
    lastActivity: '2026-05-03T10:30:00+05:30',
    createdAt: '2025-01-15T09:00:00+05:30',
  },
  {
    id: 'BR002',
    name: 'Nexus Equities',
    location: 'New Delhi, Delhi',
    managerName: 'Priya Verma',
    currentBalance: 120000,
    openingBalance: 150000,
    closingBalance: 120000,
    dailyPL: -30000,
    status: 'active',
    lastActivity: '2026-05-03T09:45:00+05:30',
    createdAt: '2025-02-20T09:00:00+05:30',
  },
  {
    id: 'BR003',
    name: 'Quantum Capital',
    location: 'Bengaluru, Karnataka',
    managerName: 'Arun Kumar',
    currentBalance: 380000,
    openingBalance: 350000,
    closingBalance: 380000,
    dailyPL: 30000,
    status: 'active',
    lastActivity: '2026-05-03T11:15:00+05:30',
    createdAt: '2025-03-10T09:00:00+05:30',
  },
  {
    id: 'BR004',
    name: 'Apex Holdings',
    location: 'Hyderabad, Telangana',
    managerName: 'Sneha Reddy',
    currentBalance: 175000,
    openingBalance: 180000,
    closingBalance: 175000,
    dailyPL: -5000,
    status: 'active',
    lastActivity: '2026-05-03T08:20:00+05:30',
    createdAt: '2025-04-05T09:00:00+05:30',
  },
  {
    id: 'BR005',
    name: 'Vertex Funds',
    location: 'Chennai, Tamil Nadu',
    managerName: 'Vikram Iyer',
    currentBalance: 330000,
    openingBalance: 320000,
    closingBalance: 330000,
    dailyPL: 10000,
    status: 'active',
    lastActivity: '2026-05-02T16:40:00+05:30',
    createdAt: '2025-05-18T09:00:00+05:30',
  },
];

// ─── TRANSACTIONS ────────────────────────────────────────
export const transactions: Transaction[] = [
  {
    id: 'TXN001',
    date: '2026-05-03T10:30:00+05:30',
    from: 'HQ Treasury',
    to: 'Alpha Strategies',
    amount: 200000,
    type: 'allocation',
    status: 'completed',
    notes: 'Monthly capital allocation — May 2026',
  },
  {
    id: 'TXN002',
    date: '2026-05-03T09:15:00+05:30',
    from: 'Alpha Strategies',
    to: 'Nexus Equities',
    amount: 50000,
    type: 'transfer',
    status: 'completed',
    notes: 'Emergency fund transfer for Q2 operations',
  },
  {
    id: 'TXN003',
    date: '2026-05-02T14:20:00+05:30',
    from: 'HQ Treasury',
    to: 'Quantum Capital',
    amount: 350000,
    type: 'allocation',
    status: 'completed',
    notes: 'Initial allocation for new branch setup',
  },
  {
    id: 'TXN004',
    date: '2026-05-02T11:45:00+05:30',
    from: 'Nexus Equities',
    to: 'Vendor — Office Lease',
    amount: 45000,
    type: 'expense',
    status: 'completed',
    notes: 'Office space rental — May 2026',
    category: 'OPEX',
  },
  {
    id: 'TXN005',
    date: '2026-05-01T16:30:00+05:30',
    from: 'Client — Tata Motors',
    to: 'Alpha Strategies',
    amount: 125000,
    type: 'profit',
    status: 'completed',
    notes: 'Portfolio advisory fee — April cycle',
  },
  {
    id: 'TXN006',
    date: '2026-05-01T13:00:00+05:30',
    from: 'Apex Holdings',
    to: 'Vendor — IT Infra',
    amount: 72000,
    type: 'expense',
    status: 'completed',
    notes: 'Server infrastructure upgrade',
    category: 'CAPEX',
  },
  {
    id: 'TXN007',
    date: '2026-04-30T10:00:00+05:30',
    from: 'Vertex Funds',
    to: 'Quantum Capital',
    amount: 30000,
    type: 'transfer',
    status: 'completed',
    notes: 'Inter-branch liquidity rebalance',
  },
  {
    id: 'TXN008',
    date: '2026-04-30T15:45:00+05:30',
    from: 'Client — Infosys',
    to: 'Quantum Capital',
    amount: 95000,
    type: 'profit',
    status: 'completed',
    notes: 'Consulting retainer — Q1 settlement',
  },
  {
    id: 'TXN009',
    date: '2026-04-29T09:30:00+05:30',
    from: 'HQ Treasury',
    to: 'Apex Holdings',
    amount: 180000,
    type: 'allocation',
    status: 'completed',
    notes: 'Capital top-up for expansion',
  },
  {
    id: 'TXN010',
    date: '2026-04-29T12:00:00+05:30',
    from: 'Alpha Strategies',
    to: 'Vendor — Compliance Audit',
    amount: 35000,
    type: 'expense',
    status: 'pending',
    notes: 'Annual compliance audit fees',
    category: 'OPEX',
  },
  {
    id: 'TXN011',
    date: '2026-04-28T08:15:00+05:30',
    from: 'Client — Wipro Ltd',
    to: 'Vertex Funds',
    amount: 68000,
    type: 'profit',
    status: 'completed',
    notes: 'Financial advisory — March deliverables',
  },
  {
    id: 'TXN012',
    date: '2026-04-28T14:30:00+05:30',
    from: 'Nexus Equities',
    to: 'Vendor — Furniture',
    amount: 92000,
    type: 'expense',
    status: 'completed',
    notes: 'Office furniture for new wing',
    category: 'CAPEX',
  },
];

// ─── EXPENSES (CAPEX / OPEX) ────────────────────────────
export const expenses: Expense[] = [
  { id: 'EXP001', date: '2026-05-03', branchId: 'BR001', branchName: 'Alpha Strategies', type: 'opex', category: 'Salaries', description: 'Staff salaries — May 2026', amount: 85000 },
  { id: 'EXP002', date: '2026-05-03', branchId: 'BR002', branchName: 'Nexus Equities', type: 'opex', category: 'Rent', description: 'Office space lease — May 2026', amount: 45000 },
  { id: 'EXP003', date: '2026-05-02', branchId: 'BR003', branchName: 'Quantum Capital', type: 'capex', category: 'Equipment', description: 'Trading terminals (4 units)', amount: 120000 },
  { id: 'EXP004', date: '2026-05-02', branchId: 'BR001', branchName: 'Alpha Strategies', type: 'opex', category: 'Utilities', description: 'Electricity & internet — April', amount: 12000 },
  { id: 'EXP005', date: '2026-05-01', branchId: 'BR004', branchName: 'Apex Holdings', type: 'capex', category: 'IT Infrastructure', description: 'Server rack installation', amount: 72000 },
  { id: 'EXP006', date: '2026-05-01', branchId: 'BR005', branchName: 'Vertex Funds', type: 'opex', category: 'Travel', description: 'Client visit — Coimbatore', amount: 8500 },
  { id: 'EXP007', date: '2026-04-30', branchId: 'BR002', branchName: 'Nexus Equities', type: 'capex', category: 'Furniture', description: 'Office furniture — new wing', amount: 92000 },
  { id: 'EXP008', date: '2026-04-30', branchId: 'BR003', branchName: 'Quantum Capital', type: 'opex', category: 'Software', description: 'Bloomberg Terminal license — Q2', amount: 35000 },
  { id: 'EXP009', date: '2026-04-29', branchId: 'BR001', branchName: 'Alpha Strategies', type: 'opex', category: 'Compliance', description: 'Annual compliance audit fees', amount: 35000 },
  { id: 'EXP010', date: '2026-04-29', branchId: 'BR004', branchName: 'Apex Holdings', type: 'opex', category: 'Marketing', description: 'Digital marketing — April campaign', amount: 22000 },
  { id: 'EXP011', date: '2026-04-28', branchId: 'BR005', branchName: 'Vertex Funds', type: 'capex', category: 'Vehicle', description: 'Company vehicle down-payment', amount: 150000 },
  { id: 'EXP012', date: '2026-04-28', branchId: 'BR002', branchName: 'Nexus Equities', type: 'opex', category: 'Salaries', description: 'Staff salaries — April 2026', amount: 78000 },
];

// ─── DAILY REPORTS ───────────────────────────────────────
export const dailyReports: DailyReport[] = [
  { date: '2026-05-03', branchId: 'BR001', branchName: 'Alpha Strategies', openingBalance: 200000, profit: 125000, expense: 80000, closingBalance: 245000 },
  { date: '2026-05-03', branchId: 'BR002', branchName: 'Nexus Equities', openingBalance: 150000, profit: 15000, expense: 45000, closingBalance: 120000 },
  { date: '2026-05-03', branchId: 'BR003', branchName: 'Quantum Capital', openingBalance: 350000, profit: 95000, expense: 65000, closingBalance: 380000 },
  { date: '2026-05-03', branchId: 'BR004', branchName: 'Apex Holdings', openingBalance: 180000, profit: 22000, expense: 27000, closingBalance: 175000 },
  { date: '2026-05-03', branchId: 'BR005', branchName: 'Vertex Funds', openingBalance: 320000, profit: 68000, expense: 58000, closingBalance: 330000 },
  // Previous day
  { date: '2026-05-02', branchId: 'BR001', branchName: 'Alpha Strategies', openingBalance: 185000, profit: 98000, expense: 83000, closingBalance: 200000 },
  { date: '2026-05-02', branchId: 'BR002', branchName: 'Nexus Equities', openingBalance: 162000, profit: 28000, expense: 40000, closingBalance: 150000 },
  { date: '2026-05-02', branchId: 'BR003', branchName: 'Quantum Capital', openingBalance: 320000, profit: 72000, expense: 42000, closingBalance: 350000 },
  { date: '2026-05-02', branchId: 'BR004', branchName: 'Apex Holdings', openingBalance: 195000, profit: 15000, expense: 30000, closingBalance: 180000 },
  { date: '2026-05-02', branchId: 'BR005', branchName: 'Vertex Funds', openingBalance: 305000, profit: 55000, expense: 40000, closingBalance: 320000 },
];

// ─── INVOICES ────────────────────────────────────────────
export const invoices: Invoice[] = [
  { id: 'INV-2026-001', clientName: 'Tata Motors Ltd', branchId: 'BR001', branchName: 'Alpha Strategies', amount: 125000, description: 'Portfolio advisory services — April 2026', date: '2026-05-01', status: 'paid' },
  { id: 'INV-2026-002', clientName: 'Infosys BPM', branchId: 'BR003', branchName: 'Quantum Capital', amount: 95000, description: 'Consulting retainer — Q1 FY27', date: '2026-04-30', status: 'paid' },
  { id: 'INV-2026-003', clientName: 'Wipro Technologies', branchId: 'BR005', branchName: 'Vertex Funds', amount: 68000, description: 'Financial advisory — March deliverables', date: '2026-04-28', status: 'paid' },
  { id: 'INV-2026-004', clientName: 'Reliance Capital', branchId: 'BR001', branchName: 'Alpha Strategies', amount: 210000, description: 'Risk assessment & compliance audit', date: '2026-05-02', status: 'pending' },
  { id: 'INV-2026-005', clientName: 'Mahindra Finance', branchId: 'BR002', branchName: 'Nexus Equities', amount: 45000, description: 'Market research report — Q4 FY26', date: '2026-04-25', status: 'overdue' },
  { id: 'INV-2026-006', clientName: 'HDFC Securities', branchId: 'BR004', branchName: 'Apex Holdings', amount: 82000, description: 'Tech infrastructure consulting', date: '2026-05-03', status: 'pending' },
  { id: 'INV-2026-007', clientName: 'Bajaj Finserv', branchId: 'BR003', branchName: 'Quantum Capital', amount: 156000, description: 'Strategic advisory — M&A due diligence', date: '2026-04-20', status: 'paid' },
  { id: 'INV-2026-008', clientName: 'Kotak Wealth', branchId: 'BR005', branchName: 'Vertex Funds', amount: 73000, description: 'Portfolio rebalancing consultation', date: '2026-05-01', status: 'pending' },
];

// ─── NOTIFICATIONS ───────────────────────────────────────
export const notifications: Notification[] = [
  { id: 'N001', message: 'Fund transfer of ₹50,000 completed — Mumbai → Delhi', time: '10 min ago', read: false, type: 'transfer' },
  { id: 'N002', message: 'Daily report submitted by Quantum Capital', time: '25 min ago', read: false, type: 'report' },
  { id: 'N003', message: 'Nexus Equities showing ₹30,000 loss today', time: '1 hr ago', read: false, type: 'alert' },
  { id: 'N004', message: 'Invoice INV-2026-005 is overdue — Mahindra Finance', time: '3 hrs ago', read: true, type: 'alert' },
  { id: 'N005', message: 'New branch "Pune West" creation pending approval', time: '5 hrs ago', read: true, type: 'info' },
];

// ─── P&L TREND DATA (for chart) ─────────────────────────
export const plTrendData = {
  labels: ['Apr 24', 'Apr 25', 'Apr 26', 'Apr 27', 'Apr 28', 'Apr 29', 'Apr 30', 'May 01', 'May 02', 'May 03'],
  values: [32000, -12000, 28000, 41000, -8000, 18000, 55000, 38000, 23000, 45600],
};

// ─── FUND DISTRIBUTION (for donut) ──────────────────────
export const fundDistribution = [
  { branch: 'Alpha Strategies', amount: 245000, color: '#D11439' },
  { branch: 'Nexus Equities', amount: 120000, color: '#F57C00' },
  { branch: 'Quantum Capital', amount: 380000, color: '#0FA958' },
  { branch: 'Apex Holdings', amount: 175000, color: '#2196F3' },
  { branch: 'Vertex Funds', amount: 330000, color: '#9C27B0' },
];

// ─── HELPERS ─────────────────────────────────────────────
export function formatINR(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
    style: 'currency',
    currency: 'INR',
  });
  return amount < 0 ? `-${formatted}` : formatted;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
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

// ─── EXTENDED CHARTS & DATA ──────────────────────────────
export const revenueExpenseData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  revenue: [450000, 520000, 480000, 610000, 590000, 680000],
  expense: [280000, 310000, 290000, 380000, 340000, 390000],
};

export const recentActivities = [
  { id: 'ACT1', title: 'Capital Allocation', desc: '₹2,00,000 allocated to Alpha Strategies', time: '2 hours ago', type: 'allocation', icon: '💰' },
  { id: 'ACT2', title: 'Fund Transfer', desc: 'Nexus Equities received ₹50,000 from HQ', time: '5 hours ago', type: 'transfer', icon: '🔄' },
  { id: 'ACT3', title: 'Expense Logged', desc: '₹45,000 for Office Lease (Nexus Equities)', time: 'Yesterday', type: 'expense', icon: '🧾' },
  { id: 'ACT4', title: 'Invoice Paid', desc: '₹1,25,000 received from Tata Motors', time: 'Yesterday', type: 'profit', icon: '✅' },
  { id: 'ACT5', title: 'New Branch Added', desc: 'Vertex Funds initialized', time: '2 days ago', type: 'info', icon: '🏢' },
];
