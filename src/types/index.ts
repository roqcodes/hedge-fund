// ═══════════════════════════════════════════════════════════
// HEDGE Capital Management — Type Definitions
// ═══════════════════════════════════════════════════════════

export type UserRole = 'admin' | 'branch_manager';

export interface User {
  email: string;
  role: UserRole;
  name: string;
  branchId?: string; // only for branch managers
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  managerName: string;
  cashBalance: number;
  goldBalance: number;
  currentBalance: number;
  openingBalance: number;
  closingBalance: number;
  dailyPL: number;
  status: 'active' | 'inactive';
  lastActivity: string; // ISO timestamp
  createdAt: string;
}

export type TransactionType = 'transfer' | 'expense' | 'profit' | 'allocation' | 'capex' | 'opex';
export type TransactionStatus = 'completed' | 'pending' | 'failed';

export interface Transaction {
  id: string;
  date: string;
  from: string;
  to: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  notes: string;
  category?: string;
}

export type ExpenseType = 'capex' | 'opex';

export interface Expense {
  id: string;
  date: string;
  branchId: string;
  branchName: string;
  type: ExpenseType;
  category: string;
  description: string;
  amount: number;
}

export interface DailyReport {
  date: string;
  branchId: string;
  branchName: string;
  openingBalance: number;
  profit: number;
  expense: number;
  closingBalance: number;
}

export type InvoiceStatus = 'paid' | 'pending' | 'overdue';

export interface Invoice {
  id: string;
  clientName: string;
  branchId: string;
  branchName: string;
  amount: number;
  description: string;
  date: string;
  status: InvoiceStatus;
}

export interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
  type: 'transfer' | 'report' | 'alert' | 'info';
}

export type PageId =
  | 'dashboard'
  | 'branches'
  | 'funds'
  | 'finance'
  | 'reports'
  | 'usdt'
  | 'deals'
  | 'investors'
  | 'physical';

export type DateRange = 'today' | 'weekly' | 'monthly';

export type InvestorStatus = 'active' | 'inactive' | 'pending';
export type InvestorRiskProfile = 'conservative' | 'balanced' | 'aggressive';
export type InvestorKycStatus = 'verified' | 'pending' | 'expired';

export interface InvestorDeposit {
  id: string;
  date: string;
  type: 'cash' | 'gold';
  amount: number;
  goldGrams?: number;
  notes?: string;
}

export interface Investor {
  id: string;
  name: string;
  email: string;
  phone: string;
  nationality: string;
  emiratesId?: string;
  passportNo?: string;
  address: string;
  city: string;
  country: string;
  cashDeposit: number;
  goldDeposit: number;
  goldWeightGrams: number;
  status: InvestorStatus;
  riskProfile: InvestorRiskProfile;
  kycStatus: InvestorKycStatus;
  joinedDate: string;
  lastActivity: string;
  assignedBranchId?: string;
  assignedBranchName?: string;
  preferredContact: 'email' | 'phone' | 'whatsapp';
  notes?: string;
  depositHistory: InvestorDeposit[];
}

export type DealStatus = 'active' | 'pending' | 'completed' | 'cancelled';

export interface DealInvestor {
  investorId: string;
  investorName: string;
  amount: number;
  isGold: boolean; // True if the amount represents gold grams, false if AED cash
  goldVolume?: number; // Volume of gold in grams (up to 4 decimals)
}

export interface Deal {
  id: string;
  name: string;
  groupName: string;
  amount: number;
  investors: DealInvestor[];
  totalInvestment: number;
  balance: number;
  toBranchId?: string;
  toBranchName?: string;
  status: DealStatus;
  date: string;
  totalPL: number;
  expense: number;
  managerShare: number;
  goldVolume?: number;
  leadName?: string;
  leadPhone?: string;
  leadEmail?: string;
  leadAddress?: string;
}

export interface DealTransactionExpense {
  id: string;
  dealTransactionId: string;
  key: string;           // Expense label, e.g. "Freight", "Insurance"
  value: number;         // Amount in AED
  timestamp?: string;    // Date & Time of expense
  createdAt?: string;
}

export interface DealTransaction {
  id: string;
  date: string;
  time?: string;       // "HH:MM" 24h format, e.g. "14:30"
  deal: string; // Deal sequence number/name (e.g. '1', '2')
  weight: number;
  rate: number;
  pureCostAed: number;
  liveSellRate: number;        // Renamed from salesValueInr
  sellPremiumDiscount: number; // Renamed from rvRate
  salesAed: number;
  expenses: number;
  grossProfit: number;
  netProfitPerGram: number;    // Renamed from nPPerGr
  managementProfit: number;    // Renamed from mange
  fixOrUnfix: 'fixed' | 'unfixed' | string;
  marginDeposit: number;
  premiumDiscount: number;
  dealId?: string; // Foreign key linking to deals(id)
  payouts?: DealTransactionPayout[]; // Snapshot of investor payouts at settlement
}

export interface DealTransactionPayout {
  id: string;
  dealTransactionId: string;
  investorId: string;
  investorName: string;
  payoutAmount: number;
  createdAt?: string;
}
