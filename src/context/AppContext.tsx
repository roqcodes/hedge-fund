'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  User,
  Branch,
  Transaction,
  Expense,
  Invoice,
  Notification,
  Investor,
  PageId,
  DateRange,
  UserRole,
  Deal,
} from '@/types';
import * as mock from '@/data/mockData';

interface Toast { id: string; message: string; type: 'success' | 'error'; }

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  currentPage: PageId;
  dateRange: DateRange;
  branches: Branch[];
  transactions: Transaction[];
  expenses: Expense[];
  invoices: Invoice[];
  notifications: Notification[];
  toasts: Toast[];
  sidebarOpen: boolean;
  selectedBranchId: string | null;
  selectedInvestorId: string | null;
  investors: Investor[];
  deals: Deal[];
  isInitialLoading: boolean;
  hqBalance: number;
}

export type AddInvestorInput = {
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
  riskProfile: InvestorRiskProfile;
  preferredContact: 'email' | 'phone' | 'whatsapp';
  assignedBranchId?: string;
  notes?: string;
};

interface AppContextType extends AppState {
  login: (email: string, role: UserRole, branchId?: string) => void;
  logout: () => void;
  setPage: (page: PageId) => void;
  setDateRange: (range: DateRange) => void;
  addBranch: (b: Omit<Branch, 'id' | 'status' | 'lastActivity' | 'createdAt' | 'closingBalance' | 'dailyPL' | 'cashBalance' | 'goldBalance' | 'currentBalance'> & { openingBalance: number }) => void;
  transferFunds: (from: string, to: string, amount: number, notes: string) => void;
  addInvoice: (inv: Omit<Invoice, 'id' | 'status'>) => void;
  addExpense: (exp: Omit<Expense, 'id'>) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  toggleSidebar: () => void;
  selectBranch: (id: string | null) => void;
  selectInvestor: (id: string | null) => void;
  addInvestor: (input: AddInvestorInput) => void;
  addDeal: (deal: Omit<Deal, 'id' | 'date'>) => void;
  getTotalCapital: () => number;
  getNetPL: () => number;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    isAuthenticated: false,
    currentPage: 'dashboard',
    dateRange: 'today',
    branches: [...mock.branches],
    transactions: [...mock.transactions],
    expenses: [...mock.expenses],
    invoices: [...mock.invoices],
    notifications: [...mock.notifications],
    toasts: [],
    sidebarOpen: false,
    selectedBranchId: null,
    selectedInvestorId: null,
    investors: [...mock.investors],
    deals: [...mock.deals],
    isInitialLoading: true,
    hqBalance: 50000000, // 50M AED initial treasury
  });

  // Load session from localStorage on mount
  React.useEffect(() => {
    queueMicrotask(() => {
      const savedSession = localStorage.getItem('hedge_session');
      if (savedSession) {
        try {
          const { user, isAuthenticated } = JSON.parse(savedSession);
          if (isAuthenticated && user) {
            setState(s => ({ ...s, user, isAuthenticated: true, isInitialLoading: false }));
          } else {
            setState(s => ({ ...s, isInitialLoading: false }));
          }
        } catch (e) {
          console.error('Failed to parse session', e);
          setState(s => ({ ...s, isInitialLoading: false }));
        }
      } else {
        setState(s => ({ ...s, isInitialLoading: false }));
      }
    });
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString();
    setState(s => ({ ...s, toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => setState(s => ({ ...s, toasts: s.toasts.filter(t => t.id !== id) })), 3500);
  }, []);

  const login = useCallback((email: string, role: UserRole, branchId?: string) => {
    const user: User = {
      email,
      role,
      name: role === 'admin' ? 'John Doe' : 'Ahmed Al Maktoum',
      branchId: role === 'branch_manager' ? branchId || 'BR014' : undefined,
    };
    setState(s => ({ ...s, user, isAuthenticated: true }));
    localStorage.setItem('hedge_session', JSON.stringify({ user, isAuthenticated: true }));
  }, []);

  const logout = useCallback(() => {
    setState(s => ({ ...s, user: null, isAuthenticated: false, currentPage: 'dashboard' }));
    localStorage.removeItem('hedge_session');
  }, []);

  const setPage = useCallback((page: PageId) => {
    setState(s => ({ ...s, currentPage: page, selectedBranchId: null, selectedInvestorId: null }));
  }, []);

  const setDateRange = useCallback((range: DateRange) => {
    setState(s => ({ ...s, dateRange: range }));
  }, []);

  const toggleSidebar = useCallback(() => {
    setState(s => ({ ...s, sidebarOpen: !s.sidebarOpen }));
  }, []);

  const selectBranch = useCallback((id: string | null) => {
    setState(s => ({ ...s, selectedBranchId: id, selectedInvestorId: null }));
  }, []);

  const selectInvestor = useCallback((id: string | null) => {
    setState(s => ({ ...s, selectedInvestorId: id, selectedBranchId: null }));
  }, []);

  const addInvestor = useCallback((input: AddInvestorInput) => {
    const branch = input.assignedBranchId
      ? state.branches.find(b => b.id === input.assignedBranchId)
      : undefined;
    const now = new Date().toISOString();
    const hasDeposits = input.cashDeposit > 0 || input.goldDeposit > 0;
    const history = [];
    if (input.cashDeposit > 0) {
      history.push({
        id: mock.generateId('DEP'),
        date: now.slice(0, 10),
        type: 'cash' as const,
        amount: input.cashDeposit,
        notes: 'Initial cash deposit',
      });
    }
    if (input.goldDeposit > 0) {
      history.push({
        id: mock.generateId('DEP'),
        date: now.slice(0, 10),
        type: 'gold' as const,
        amount: input.goldDeposit,
        goldGrams: input.goldWeightGrams,
        notes: 'Initial gold deposit',
      });
    }
    const newInvestor: Investor = {
      id: mock.generateId('INV'),
      ...input,
      status: hasDeposits ? 'active' : 'pending',
      kycStatus: 'pending',
      joinedDate: now.slice(0, 10),
      lastActivity: now,
      assignedBranchName: branch?.name,
      depositHistory: history,
    };
    setState(s => ({ ...s, investors: [newInvestor, ...s.investors] }));
    showToast(`Investor "${newInvestor.name}" added successfully`);
  }, [showToast, state.branches]);

  const addDeal = useCallback((deal: Omit<Deal, 'id' | 'date'>) => {
    const newDeal: Deal = {
      ...deal,
      id: mock.generateId('DL'),
      date: new Date().toISOString(),
    };
    setState(s => ({ ...s, deals: [newDeal, ...s.deals] }));
    showToast(`Deal "${newDeal.name}" created successfully`);
  }, [showToast]);

  const addBranch = useCallback((b: Omit<Branch, 'id' | 'status' | 'lastActivity' | 'createdAt' | 'closingBalance' | 'dailyPL' | 'cashBalance' | 'goldBalance' | 'currentBalance'> & { openingBalance: number }) => {
    const total = b.openingBalance;
    const newBranch: Branch = {
      ...b,
      id: mock.generateId('BR'),
      cashBalance: total,
      goldBalance: 0,
      currentBalance: total,
      closingBalance: total,
      dailyPL: 0,
      status: 'active',
      lastActivity: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const txn: Transaction = {
      id: mock.generateId('TXN'),
      date: new Date().toISOString(),
      from: 'HQ Treasury',
      to: newBranch.name,
      amount: b.openingBalance,
      type: 'allocation',
      status: 'completed',
      notes: `Initial Capital Allocation — ${newBranch.name}`,
    };
    setState(s => ({
      ...s,
      branches: [...s.branches, newBranch],
      transactions: [txn, ...s.transactions],
    }));
    showToast(`Branch "${newBranch.name}" created with AED ${b.openingBalance.toLocaleString('en-AE')} allocated`);
  }, [showToast]);

  const transferFunds = useCallback((fromId: string, toId: string, amount: number, notes: string) => {
    setState(s => {
      let nextHqBalance = s.hqBalance;
      const branches = s.branches.map(b => {
        if (b.id === fromId) return { ...b, currentBalance: b.currentBalance - amount, closingBalance: b.closingBalance - amount, lastActivity: new Date().toISOString() };
        if (b.id === toId) return { ...b, currentBalance: b.currentBalance + amount, closingBalance: b.closingBalance + amount, lastActivity: new Date().toISOString() };
        return b;
      });

      if (fromId === 'HQ_TREASURY') {
        nextHqBalance -= amount;
      }

      const fromName = fromId === 'HQ_TREASURY' ? 'HQ Treasury' : (s.branches.find(b => b.id === fromId)?.name || fromId);
      const toName = s.branches.find(b => b.id === toId)?.name || toId;

      const txn: Transaction = {
        id: mock.generateId('TXN'),
        date: new Date().toISOString(),
        from: fromName,
        to: toName,
        amount,
        type: fromId === 'HQ_TREASURY' ? 'allocation' : 'transfer',
        status: 'completed',
        notes,
      };
      return { ...s, branches, hqBalance: nextHqBalance, transactions: [txn, ...s.transactions] };
    });
    showToast(`AED ${amount.toLocaleString('en-AE')} transferred successfully`);
  }, [showToast]);

  const addInvoice = useCallback((inv: Omit<Invoice, 'id' | 'status'>) => {
    const newInv: Invoice = { ...inv, id: `INV-2026-${String(state.invoices.length + 1).padStart(3, '0')}`, status: 'pending' };
    setState(s => ({ ...s, invoices: [newInv, ...s.invoices] }));
    showToast(`Invoice ${newInv.id} created`);
  }, [showToast, state.invoices.length]);

  const addExpense = useCallback((exp: Omit<Expense, 'id'>) => {
    const newExp: Expense = { ...exp, id: mock.generateId('EXP') };
    
    setState(s => {
      let nextHqBalance = s.hqBalance;
      const nextBranches = s.branches.map(b => {
        if (b.id === exp.branchId) {
          return { ...b, currentBalance: b.currentBalance - exp.amount, lastActivity: new Date().toISOString() };
        }
        return b;
      });

      if (exp.branchId === 'HQ_TREASURY') {
        nextHqBalance -= exp.amount;
      }

      // Create a transaction record for this expense
      const txn: Transaction = {
        id: mock.generateId('TXN'),
        date: new Date().toISOString(),
        from: exp.branchName,
        to: 'External (Expense)',
        amount: exp.amount,
        type: 'expense',
        status: 'completed',
        notes: `${exp.category}: ${exp.description}`,
      };

      return { 
        ...s, 
        expenses: [newExp, ...s.expenses], 
        hqBalance: nextHqBalance, 
        branches: nextBranches,
        transactions: [txn, ...s.transactions]
      };
    });
    
    showToast(`Expense of AED ${exp.amount.toLocaleString('en-AE')} recorded against ${exp.branchName}`);
  }, [showToast]);

  const getTotalCapital = useCallback(() => state.branches.reduce((sum, b) => sum + b.currentBalance, 0) + state.hqBalance, [state.branches, state.hqBalance]);
  const getNetPL = useCallback(() => state.branches.reduce((sum, b) => sum + b.dailyPL, 0), [state.branches]);

  return (
    <AppContext.Provider value={{
      ...state, login, logout, setPage, setDateRange, addBranch, transferFunds,
      addInvoice, addExpense, showToast, toggleSidebar, selectBranch, selectInvestor, addInvestor,
      addDeal, getTotalCapital, getNetPL,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
