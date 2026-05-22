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
  InvestorRiskProfile,
} from '@/types';
import * as mock from '@/data/mockData';
import { getCurrentUserAction, logoutAction } from '@/app/actions/auth';
import {
  fetchInitialDataAction,
  dbAddBranchAction,
  dbTransferFundsAction,
  dbAddInvoiceAction,
  dbAddExpenseAction,
  dbAddInvestorAction,
  dbUpdateInvestorAction,
  dbAddDealAction,
  dbUpdateDealAction,
} from '@/app/actions/dbActions';

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
  login: (user: User) => void;
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
  updateInvestor: (investor: Investor) => void;
  addDeal: (deal: Omit<Deal, 'id' | 'date'>) => void;
  updateDeal: (deal: Deal) => void;
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

  // Load session and database data on mount
  React.useEffect(() => {
    async function initApp() {
      let currentUser: User | null = null;
      let isAuthenticated = false;

      try {
        const authRes = await getCurrentUserAction();
        if (authRes.success && authRes.data) {
          currentUser = authRes.data;
          isAuthenticated = true;
        } else {
          localStorage.removeItem('hedge_session');
        }
      } catch (e) {
        console.error('Failed to load session from server', e);
      }

      try {
        const dbRes = await fetchInitialDataAction();
        if (dbRes.success && dbRes.data && !dbRes.isMockFallback) {
          const data = dbRes.data;
          setState(s => ({
            ...s,
            user: currentUser,
            isAuthenticated,
            branches: data.branches,
            transactions: data.transactions,
            expenses: data.expenses,
            invoices: data.invoices,
            notifications: data.notifications,
            investors: data.investors,
            deals: data.deals,
            hqBalance: data.hqBalance,
            isInitialLoading: false,
          }));
          return;
        }
      } catch (e) {
        console.error('Failed to fetch database data, falling back to mock data', e);
      }

      // If database is not configured or fails, keep the default mock data initialized in state
      setState(s => ({
        ...s,
        user: currentUser,
        isAuthenticated,
        isInitialLoading: false,
      }));
    }
    initApp();
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString();
    setState(s => ({ ...s, toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => setState(s => ({ ...s, toasts: s.toasts.filter(t => t.id !== id) })), 3500);
  }, []);

  const login = useCallback((user: User) => {
    setState(s => ({ ...s, user, isAuthenticated: true }));
    localStorage.setItem('hedge_session', JSON.stringify({ user, isAuthenticated: true }));
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutAction();
    } catch (e) {
      console.error('Failed to execute logout Server Action:', e);
    }
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

  const addInvestor = useCallback(async (input: AddInvestorInput) => {
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

    try {
      const dbRes = await dbAddInvestorAction(newInvestor);
      if (dbRes.success) {
        setState(s => ({ ...s, investors: [newInvestor, ...s.investors] }));
        showToast(`Investor "${newInvestor.name}" added successfully`);
        return;
      }
    } catch (e) {
      console.warn('DB addInvestor failed, running client-side only', e);
    }

    setState(s => ({ ...s, investors: [newInvestor, ...s.investors] }));
    showToast(`Investor "${newInvestor.name}" added locally (Mock Mode)`);
  }, [showToast, state.branches]);

  const updateInvestor = useCallback(async (updatedInvestor: Investor) => {
    const branch = updatedInvestor.assignedBranchId
      ? state.branches.find(b => b.id === updatedInvestor.assignedBranchId)
      : undefined;
    const now = new Date().toISOString();
    
    const finalInvestor: Investor = {
      ...updatedInvestor,
      assignedBranchName: branch ? branch.name : undefined,
      lastActivity: now,
    };

    try {
      const dbRes = await dbUpdateInvestorAction(finalInvestor);
      if (dbRes.success) {
        setState(s => ({
          ...s,
          investors: s.investors.map(inv => inv.id === finalInvestor.id ? finalInvestor : inv)
        }));
        showToast(`Investor "${finalInvestor.name}" updated successfully`);
        return;
      }
    } catch (e) {
      console.warn('DB updateInvestor failed, running client-side only', e);
    }

    setState(s => ({
      ...s,
      investors: s.investors.map(inv => inv.id === finalInvestor.id ? finalInvestor : inv)
    }));
    showToast(`Investor "${finalInvestor.name}" updated locally (Mock Mode)`);
  }, [showToast, state.branches]);

  const addDeal = useCallback(async (deal: Omit<Deal, 'id' | 'date'>) => {
    const dealId = mock.generateId('DL');
    const now = new Date().toISOString();
    const newDeal: Deal = {
      ...deal,
      id: dealId,
      date: now,
    };

    try {
      const dbRes = await dbAddDealAction(newDeal);
      if (dbRes.success) {
        setState(s => ({ ...s, deals: [newDeal, ...s.deals] }));
        showToast(`Deal "${newDeal.name}" created successfully`);
        return;
      }
    } catch (e) {
      console.warn('DB addDeal failed, running client-side only', e);
    }

    setState(s => ({ ...s, deals: [newDeal, ...s.deals] }));
    showToast(`Deal "${newDeal.name}" created locally (Mock Mode)`);
  }, [showToast]);

  const updateDeal = useCallback(async (updatedDeal: Deal) => {
    try {
      const dbRes = await dbUpdateDealAction(updatedDeal);
      if (dbRes.success) {
        setState(s => ({
          ...s,
          deals: s.deals.map(d => d.id === updatedDeal.id ? updatedDeal : d)
        }));
        showToast(`Deal "${updatedDeal.name}" updated successfully`);
        return;
      }
    } catch (e) {
      console.warn('DB updateDeal failed, running client-side only', e);
    }

    setState(s => ({
      ...s,
      deals: s.deals.map(d => d.id === updatedDeal.id ? updatedDeal : d)
    }));
    showToast(`Deal "${updatedDeal.name}" updated locally (Mock Mode)`);
  }, [showToast]);

  const addBranch = useCallback(async (b: Omit<Branch, 'id' | 'status' | 'lastActivity' | 'createdAt' | 'closingBalance' | 'dailyPL' | 'cashBalance' | 'goldBalance' | 'currentBalance'> & { openingBalance: number }) => {
    const total = b.openingBalance;
    const branchId = mock.generateId('BR');
    const txnId = mock.generateId('TXN');
    const now = new Date().toISOString();

    const newBranch: Branch = {
      ...b,
      id: branchId,
      cashBalance: total,
      goldBalance: 0,
      currentBalance: total,
      closingBalance: total,
      dailyPL: 0,
      status: 'active',
      lastActivity: now,
      createdAt: now,
    };

    const txn: Transaction = {
      id: txnId,
      date: now,
      from: 'HQ Treasury',
      to: newBranch.name,
      amount: b.openingBalance,
      type: 'allocation',
      status: 'completed',
      notes: `Initial Capital Allocation — ${newBranch.name}`,
    };

    try {
      const dbRes = await dbAddBranchAction(newBranch, txn);
      if (dbRes.success) {
        setState(s => ({
          ...s,
          branches: [...s.branches, newBranch],
          transactions: [txn, ...s.transactions],
          hqBalance: s.hqBalance - b.openingBalance,
        }));
        showToast(`Branch "${newBranch.name}" created with AED ${b.openingBalance.toLocaleString('en-AE')} allocated`);
        return;
      }
    } catch (e) {
      console.warn('DB addBranch failed, running client-side only', e);
    }

    setState(s => ({
      ...s,
      branches: [...s.branches, newBranch],
      transactions: [txn, ...s.transactions],
      hqBalance: s.hqBalance - b.openingBalance,
    }));
    showToast(`Branch "${newBranch.name}" created locally (Mock Mode)`);
  }, [showToast]);

  const transferFunds = useCallback(async (fromId: string, toId: string, amount: number, notes: string) => {
    const txnId = mock.generateId('TXN');
    const timestamp = new Date().toISOString();
    
    const fromName = fromId === 'HQ_TREASURY' ? 'HQ Treasury' : (state.branches.find(b => b.id === fromId)?.name || fromId);
    const toName = state.branches.find(b => b.id === toId)?.name || toId;

    try {
      const dbRes = await dbTransferFundsAction(fromId, toId, fromName, toName, amount, notes, txnId);
      if (dbRes.success && dbRes.data) {
        const serverTxn = dbRes.data.transaction;
        const newHq = dbRes.data.hqBalanceUpdate ?? state.hqBalance;
        setState(s => {
          const branches = s.branches.map(b => {
            if (b.id === fromId) return { ...b, currentBalance: b.currentBalance - amount, closingBalance: b.closingBalance - amount, lastActivity: timestamp };
            if (b.id === toId) return { ...b, currentBalance: b.currentBalance + amount, closingBalance: b.closingBalance + amount, lastActivity: timestamp };
            return b;
          });
          return {
            ...s,
            branches,
            hqBalance: newHq,
            transactions: [serverTxn, ...s.transactions]
          };
        });
        showToast(`AED ${amount.toLocaleString('en-AE')} transferred successfully`);
        return;
      }
    } catch (e) {
      console.warn('DB transferFunds failed, running client-side only', e);
    }

    // Fallback
    setState(s => {
      let nextHqBalance = s.hqBalance;
      const branches = s.branches.map(b => {
        if (b.id === fromId) return { ...b, currentBalance: b.currentBalance - amount, closingBalance: b.closingBalance - amount, lastActivity: timestamp };
        if (b.id === toId) return { ...b, currentBalance: b.currentBalance + amount, closingBalance: b.closingBalance + amount, lastActivity: timestamp };
        return b;
      });

      if (fromId === 'HQ_TREASURY') {
        nextHqBalance -= amount;
      }

      const txn: Transaction = {
        id: txnId,
        date: timestamp,
        from: fromName,
        to: toName,
        amount,
        type: fromId === 'HQ_TREASURY' ? 'allocation' : 'transfer',
        status: 'completed',
        notes,
      };
      return { ...s, branches, hqBalance: nextHqBalance, transactions: [txn, ...s.transactions] };
    });
    showToast(`AED ${amount.toLocaleString('en-AE')} transferred locally (Mock Mode)`);
  }, [showToast, state.branches, state.hqBalance]);

  const addInvoice = useCallback(async (inv: Omit<Invoice, 'id' | 'status'>) => {
    const newInvId = `INV-2026-${String(state.invoices.length + 1).padStart(3, '0')}`;
    const newInv: Invoice = { ...inv, id: newInvId, status: 'pending' };

    try {
      const dbRes = await dbAddInvoiceAction(newInv);
      if (dbRes.success) {
        setState(s => ({ ...s, invoices: [newInv, ...s.invoices] }));
        showToast(`Invoice ${newInv.id} created`);
        return;
      }
    } catch (e) {
      console.warn('DB addInvoice failed, running client-side only', e);
    }

    setState(s => ({ ...s, invoices: [newInv, ...s.invoices] }));
    showToast(`Invoice ${newInv.id} created locally (Mock Mode)`);
  }, [showToast, state.invoices.length]);

  const addExpense = useCallback(async (exp: Omit<Expense, 'id'>) => {
    const expId = mock.generateId('EXP');
    const txnId = mock.generateId('TXN');
    const timestamp = new Date().toISOString();

    const newExp: Expense = { ...exp, id: expId };
    const txn: Transaction = {
      id: txnId,
      date: timestamp,
      from: exp.branchName,
      to: 'External (Expense)',
      amount: exp.amount,
      type: 'expense',
      status: 'completed',
      notes: `${exp.category}: ${exp.description}`,
    };

    try {
      const dbRes = await dbAddExpenseAction(newExp, txn);
      if (dbRes.success && dbRes.data) {
        const newHq = dbRes.data.hqBalanceUpdate ?? state.hqBalance;
        setState(s => {
          const nextBranches = s.branches.map(b => {
            if (b.id === exp.branchId) {
              return { ...b, currentBalance: b.currentBalance - exp.amount, lastActivity: timestamp };
            }
            return b;
          });
          return {
            ...s,
            expenses: [newExp, ...s.expenses],
            branches: nextBranches,
            hqBalance: newHq,
            transactions: [txn, ...s.transactions]
          };
        });
        showToast(`Expense of AED ${exp.amount.toLocaleString('en-AE')} recorded against ${exp.branchName}`);
        return;
      }
    } catch (e) {
      console.warn('DB addExpense failed, running client-side only', e);
    }

    setState(s => {
      let nextHqBalance = s.hqBalance;
      const nextBranches = s.branches.map(b => {
        if (b.id === exp.branchId) {
          return { ...b, currentBalance: b.currentBalance - exp.amount, lastActivity: timestamp };
        }
        return b;
      });

      if (exp.branchId === 'HQ_TREASURY') {
        nextHqBalance -= exp.amount;
      }

      return { 
        ...s, 
        expenses: [newExp, ...s.expenses], 
        hqBalance: nextHqBalance, 
        branches: nextBranches,
        transactions: [txn, ...s.transactions]
      };
    });
    showToast(`Expense of AED ${exp.amount.toLocaleString('en-AE')} recorded locally (Mock Mode)`);
  }, [showToast, state.hqBalance]);

  const getTotalCapital = useCallback(() => state.branches.reduce((sum, b) => sum + b.currentBalance, 0) + state.hqBalance, [state.branches, state.hqBalance]);
  const getNetPL = useCallback(() => state.branches.reduce((sum, b) => sum + b.dailyPL, 0), [state.branches]);

  return (
    <AppContext.Provider value={{
      ...state, login, logout, setPage, setDateRange, addBranch, transferFunds,
      addInvoice, addExpense, showToast, toggleSidebar, selectBranch, selectInvestor, addInvestor,
      updateInvestor, addDeal, updateDeal, getTotalCapital, getNetPL,
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
