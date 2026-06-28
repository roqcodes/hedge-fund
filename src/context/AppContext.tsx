'use client';
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { usePathname } from 'next/navigation';
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
  DealTransaction,
  PhysicalBalance,
  PhysicalBuy,
  PhysicalSell,
  UsdtBranchSettings,
  UsdtBuy,
  UsdtSell,
  ICRegion,
  ICSupplier,
  ICWarehouse,
  ICRates,
  ICPurchase,
  ICSale,
  ICWarehouseTransaction,
} from '@/types';
import * as mock from '@/data/mockData';
import { DEFAULT_BRANCH_TIMEZONE } from '@/lib/businessTime';
import { getCurrentUserAction, logoutAction } from '@/app/actions/auth';
import {
  fetchInitialDataAction,
  dbAddBranchAction,
  dbUpdateBranchAction,
  dbUpdateBranchInitialFundAction,
  dbUpdateHqBalanceAction,
  dbDeleteBranchAction,
  dbTransferFundsAction,
  dbAddInvoiceAction,
  dbAddExpenseAction,
  dbAddInvestorAction,
  dbUpdateInvestorAction,
  dbDeleteInvestorAction,
  dbAddDealAction,
  dbUpdateDealAction,
  dbDeleteDealAction,
  dbAddDealTransactionAction,
  dbUpdateDealTransactionAction,
  dbDeleteDealTransactionAction,
  dbAddEntityAction,
  dbUpdateEntityAction,
  dbDeleteEntityAction,
  dbProcessLedgerTransactionAction,
  dbUpdateLedgerTransactionAction,
  dbDeleteLedgerTransactionAction,
  dbUpdateTransactionMetaAction,
  dbAddLedgerAction,
  dbUpdateLedgerAction,
  dbDeleteLedgerAction,
  dbUpdateBranchInitialGoldAction,
  dbCreateTransactionTagAction,
} from '@/app/actions/dbActions';
import { updateBranchPageSettingsAction } from '@/app/actions/branchActions';
import {
  dbAddICRegionAction,
  dbAddICSupplierAction,
  dbAddICWarehouseAction,
  dbUpdateICRatesAction,
  dbAddICPurchaseAction,
  dbAddICSaleAction,
  dbUpdateICRegionAction,
  dbDeleteICRegionAction,
  dbUpdateICSupplierAction,
  dbDeleteICSupplierAction,
  dbUpdateICWarehouseAction,
  dbDeleteICWarehouseAction,
  dbUpdateICPurchaseAction,
  dbDeleteICPurchaseAction,
  dbUpdateICSaleAction,
  dbDeleteICSaleAction,
} from '@/app/actions/icTransferActions';
import { fetchCurrencyRatesAction } from '@/app/actions/currencyActions';
import {
  sanitizeEnabledCurrencies,
  setLiveCurrencyRates,
  type CurrencyCode,
} from '@/lib/currency';
import { isBranchScopedUser } from '@/lib/rbac';

interface Toast { id: string; message: string; type: 'success' | 'error'; }

const SIDEBAR_COLLAPSED_KEY = 'hedge_sidebar_collapsed';

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
  sidebarCollapsed: boolean;
  selectedBranchId: string | null;
  selectedInvestorId: string | null;
  investors: Investor[];
  deals: Deal[];
  isInitialLoading: boolean;
  hqBalance: number;
  activeCurrency: CurrencyCode;
  currencyRates: Record<string, number>;
  currencyRatesFetchedAt: string | null;
  currencyRatesLive: boolean;
  dealTransactions: DealTransaction[];
  entities: import('@/types').Entity[];
  ledgers: import('@/types').Ledger[];
  transactionTags: import('@/types').TransactionTag[];
  physicalBalances: PhysicalBalance[];
  physicalBuys: PhysicalBuy[];
  physicalSells: PhysicalSell[];
  usdtBuys: UsdtBuy[];
  usdtSells: UsdtSell[];
  usdtSettings: UsdtBranchSettings[];
  icRegions: ICRegion[];
  icSuppliers: ICSupplier[];
  icWarehouses: ICWarehouse[];
  icRates: ICRates[];
  icPurchases: ICPurchase[];
  icSales: ICSale[];
  icWarehouseTransactions: ICWarehouseTransaction[];
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
  isGlobal?: boolean;
  notes?: string;
};

interface AppContextType extends AppState {
  login: (user: User) => void;
  logout: () => void;
  setPage: (page: PageId) => void;
  setDateRange: (range: DateRange) => void;
  addBranch: (b: Omit<Branch, 'id' | 'status' | 'lastActivity' | 'createdAt' | 'closingBalance' | 'dailyPL' | 'cashBalance' | 'goldBalance' | 'currentBalance' | 'timezone'> & { openingBalance: number; timezone?: string }, slug: string) => void;
  updateBranch: (branch: Branch, slug: string) => Promise<boolean>;
  updateBranchPages: (branchId: string, hiddenPages: string[]) => Promise<boolean>;
  updateBranchInitialFund: (branchId: string, newAmount: number, newCurrentBalance?: number) => Promise<boolean>;
  updateBranchInitialGold: (branchId: string, newAmount: number, newCurrentBalance?: number) => Promise<boolean>;
  updateHqBalance: (newAmount: number) => Promise<boolean>;
  deleteBranch: (id: string) => Promise<boolean>;
  transferFunds: (from: string, to: string, amount: number, notes: string) => void;
  addInvoice: (inv: Omit<Invoice, 'id' | 'status'>) => void;
  addExpense: (exp: Omit<Expense, 'id'>) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  toggleSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isICTransferRoute: boolean;
  icTransferMainMenuOpen: boolean;
  showICTransferSecondarySidebar: boolean;
  openICTransferMainMenu: () => void;
  showICTransferSubNav: () => void;
  isWarehouseRoute: boolean;
  warehouseMainMenuOpen: boolean;
  showWarehouseSecondarySidebar: boolean;
  openWarehouseMainMenu: () => void;
  showWarehouseSubNav: () => void;
  selectBranch: (id: string | null) => void;
  selectInvestor: (id: string | null) => void;
  addInvestor: (input: AddInvestorInput) => void;
  updateInvestor: (investor: Investor) => void;
  deleteInvestor: (id: string) => Promise<boolean>;
  addDeal: (deal: Omit<Deal, 'id' | 'date'> & { date?: string }) => void;
  updateDeal: (deal: Deal) => void;
  deleteDeal: (id: string) => Promise<boolean>;
  addDealTransaction: (txn: DealTransaction) => Promise<boolean>;
  updateDealTransaction: (txn: DealTransaction) => Promise<boolean>;
  deleteDealTransaction: (id: string, dealId: string) => Promise<boolean>;
  getTotalCapital: () => number;
  getNetPL: () => number;
  setActiveCurrency: (c: CurrencyCode) => void;
  enabledCurrencies: CurrencyCode[];
  refetchCurrencyRates: () => Promise<void>;
  refetchData: () => Promise<void>;
  isBranchView: boolean;
  currentSlug: string;
  addEntity: (entity: import('@/types').Entity) => Promise<boolean>;
  updateEntity: (entity: import('@/types').Entity) => Promise<boolean>;
  deleteEntity: (entityName: string, entityId: string) => Promise<boolean>;
  processLedgerTransaction: (txn: import('@/types').Transaction, deltaCash: number, deltaGold: number, branchId: string) => Promise<boolean>;
  updateLedgerTransaction: (txn: import('@/types').Transaction, oldAmount: number, oldCategory: string | undefined, deltaCash: number, deltaGold: number, branchId: string) => Promise<boolean>;
  updateTransactionMeta: (txnId: string, date: string, notes: string, tagIds: string[]) => Promise<boolean>;
  deleteLedgerTransaction: (id: string, txnAmount: number, txnCategory: string | undefined, txnAssetType: string | undefined, branchId: string) => Promise<boolean>;
  addLedger: (ledger: import('@/types').Ledger) => Promise<boolean>;
  updateLedger: (ledger: import('@/types').Ledger) => Promise<boolean>;
  deleteLedger: (id: string, name: string) => Promise<boolean>;
  addTransactionTag: (tag: import('@/types').TransactionTag) => Promise<import('@/types').TransactionTag | null>;
  addICRegion: (name: string, country: string) => Promise<boolean>;
  updateICRegion: (id: string, name: string, country: string) => Promise<boolean>;
  deleteICRegion: (id: string) => Promise<boolean>;
  addICSupplier: (name: string, phone: string, commission: number | null, regionId: string, email: string, address: string) => Promise<boolean>;
  updateICSupplier: (id: string, name: string, phone: string, commission: number | null, regionId: string, email: string, address: string) => Promise<boolean>;
  deleteICSupplier: (id: string) => Promise<boolean>;
  addICWarehouse: (name: string, phone: string, commission: number | null, regionId: string, email: string, address: string) => Promise<boolean>;
  updateICWarehouse: (id: string, name: string, phone: string, commission: number | null, regionId: string, email: string, address: string) => Promise<boolean>;
  deleteICWarehouse: (id: string) => Promise<boolean>;
  updateICRates: (buyRate: number, saleRate: number, sarConversion: number, inrConversion: number) => Promise<boolean>;
  addICPurchase: (purchase: Omit<ICPurchase, 'id' | 'createdAt'>) => Promise<boolean>;
  updateICPurchase: (id: string, updates: Partial<Omit<ICPurchase, 'id' | 'createdAt'>>) => Promise<boolean>;
  addICSale: (sale: Omit<ICSale, 'id' | 'createdAt' | 'enteredBy' | 'enteredByName' | 'enteredByUserId'>) => Promise<boolean>;
  updateICSale: (id: string, updates: Partial<Omit<ICSale, 'id' | 'createdAt'>>) => Promise<boolean>;
  deleteICPurchase: (id: string) => Promise<boolean>;
  deleteICSale: (id: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | null>(null);

const getSlugFromPath = (path: string): string => {
  const parts = path.split('/').filter(Boolean);
  const first = parts[0];
  const SYSTEM_PATHS = new Set(['users', 'branches', 'finance', 'funds', 'group', 'investors', 'invoices', 'physical', 'physical-sales', 'reports', 'settings', 'usdt', 'api']);
  if (first && !SYSTEM_PATHS.has(first)) {
    return first;
  }
  return 'superadmin';
};

const resolveViewBranchSlug = (pathname: string, currentSlug: string): string | null => {
  const parts = pathname.split('/').filter(Boolean);
  const drillPrefixes = new Set(['group', 'funds', 'physical-sales', 'usdt']);
  if (parts[0] && drillPrefixes.has(parts[0]) && parts[1]) {
    return parts[1];
  }
  if (currentSlug !== 'superadmin') return currentSlug;
  return null;
};

const findBranchBySlug = (branches: Branch[], slug: string) =>
  branches.find(
    b =>
      b.slug === slug ||
      b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug,
  );

export function AppProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const currentSlug = useMemo(() => getSlugFromPath(pathname), [pathname]);
  const [icTransferMainMenuOpen, setICTransferMainMenuOpen] = useState(false);
  const [warehouseMainMenuOpen, setWarehouseMainMenuOpen] = useState(false);

  useEffect(() => {
    if (!pathname.includes('/ic-transfer')) {
      setICTransferMainMenuOpen(false);
    }
  }, [pathname]);

  const [state, setState] = useState<AppState>({
    user: null,
    isAuthenticated: false,
    currentPage: 'dashboard',
    dateRange: 'today',
    branches: [],
    transactions: [],
    expenses: [],
    invoices: [],
    notifications: [],
    toasts: [],
    sidebarOpen: false,
    sidebarCollapsed: false,
    selectedBranchId: null,
    selectedInvestorId: null,
    investors: [],
    deals: [],
    isInitialLoading: true,
    hqBalance: 50000000, // 50M AED initial treasury
    activeCurrency: 'AED',
    currencyRates: {},
    currencyRatesFetchedAt: null,
    currencyRatesLive: false,
    dealTransactions: [],
    entities: [],
    ledgers: [],
    transactionTags: [],
    physicalBalances: [],
    physicalBuys: [],
    physicalSells: [],
    usdtBuys: [],
    usdtSells: [],
    usdtSettings: [],
    icRegions: [],
    icSuppliers: [],
    icWarehouses: [],
    icRates: [],
    icPurchases: [],
    icSales: [],
    icWarehouseTransactions: [],
  });

  const refetchCurrencyRates = useCallback(async () => {
    const res = await fetchCurrencyRatesAction();
    setLiveCurrencyRates(res.rates);
    setState(s => ({
      ...s,
      currencyRates: res.rates,
      currencyRatesFetchedAt: res.fetchedAt,
      currencyRatesLive: res.success,
    }));
  }, []);

  const refetchData = useCallback(async () => {
    try {
      const slug = currentSlug === 'superadmin' ? undefined : currentSlug;
      const dbRes = await fetchInitialDataAction(slug);
      if (dbRes.success && dbRes.data) {
        const data = dbRes.data;
        
        setState(s => {
          return {
            ...s,
            branches: data.branches,
            transactions: data.transactions,
            expenses: data.expenses,
            invoices: data.invoices,
            notifications: data.notifications,
            investors: data.investors,
            deals: data.deals,
            hqBalance: data.hqBalance,
            dealTransactions: data.dealTransactions || [],
            entities: data.entities || [],
            ledgers: data.ledgers || [],
            transactionTags: data.transactionTags || [],
            physicalBalances: data.physicalBalances || [],
            physicalBuys: data.physicalBuys || [],
            physicalSells: data.physicalSells || [],
            usdtBuys: data.usdtBuys || [],
            usdtSells: data.usdtSells || [],
            usdtSettings: data.usdtSettings || [],
            icRegions: data.icRegions || [],
            icSuppliers: data.icSuppliers || [],
            icWarehouses: data.icWarehouses || [],
            icRates: data.icRates || [],
            icPurchases: data.icPurchases || [],
            icSales: data.icSales || [],
            icWarehouseTransactions: data.icWarehouseTransactions || [],
          };
        });
      }
      await refetchCurrencyRates();
    } catch (e) {
      console.error('Failed to refetch data:', e);
    }
  }, [currentSlug, refetchCurrencyRates]);

  // Load session and database data on mount or when switching branch prefix
  React.useEffect(() => {
    // Immediately reset auth state when slug changes to prevent
    // flashing the previous context's dashboard content
    setState(s => ({
      ...s,
      user: null,
      isAuthenticated: false,
      isInitialLoading: true,
    }));

    async function initApp() {
      let currentUser: User | null = null;
      let isAuthenticated = false;

      const slug = currentSlug === 'superadmin' ? undefined : currentSlug;

      try {
        const authRes = await getCurrentUserAction(slug);
        if (authRes.success && authRes.data) {
          currentUser = authRes.data;
          isAuthenticated = true;
        } else {
          localStorage.removeItem('hedge_session_' + currentSlug);
        }
      } catch (e) {
        console.error('Failed to load session from server', e);
      }

      try {
        const dbRes = await fetchInitialDataAction(slug);
        if (dbRes.success && dbRes.data) {
          const data = dbRes.data;
          const rateRes = await fetchCurrencyRatesAction();
          setLiveCurrencyRates(rateRes.rates);
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
            dealTransactions: data.dealTransactions || [],
            entities: data.entities || [],
            ledgers: data.ledgers || [],
            transactionTags: data.transactionTags || [],
            physicalBalances: data.physicalBalances || [],
            physicalBuys: data.physicalBuys || [],
            physicalSells: data.physicalSells || [],
            usdtBuys: data.usdtBuys || [],
            usdtSells: data.usdtSells || [],
            usdtSettings: data.usdtSettings || [],
            icRegions: data.icRegions || [],
            icSuppliers: data.icSuppliers || [],
            icWarehouses: data.icWarehouses || [],
            icRates: data.icRates || [],
            icPurchases: data.icPurchases || [],
            icSales: data.icSales || [],
            icWarehouseTransactions: data.icWarehouseTransactions || [],
            currencyRates: rateRes.rates,
            currencyRatesFetchedAt: rateRes.fetchedAt,
            currencyRatesLive: rateRes.success,
            isInitialLoading: false,
          }));
          return;
        } else {
          console.error('Failed to fetch initial database data:', dbRes.error);
        }
      } catch (e) {
        console.error('Failed to fetch database data', e);
      }

      const rateRes = await fetchCurrencyRatesAction();
      setLiveCurrencyRates(rateRes.rates);
      setState(s => ({
        ...s,
        user: currentUser,
        isAuthenticated,
        currencyRates: rateRes.rates,
        currencyRatesFetchedAt: rateRes.fetchedAt,
        currencyRatesLive: rateRes.success,
        isInitialLoading: false,
      }));
    }
    initApp();
  }, [currentSlug]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
    setState(s => ({ ...s, toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => setState(s => ({ ...s, toasts: s.toasts.filter(t => t.id !== id) })), 3500);
  }, []);

  const login = useCallback((user: User) => {
    setState(s => ({ ...s, user, isAuthenticated: true }));
    localStorage.setItem('hedge_session_' + currentSlug, JSON.stringify({ user, isAuthenticated: true }));
  }, [currentSlug]);

  const logout = useCallback(async () => {
    const slug = currentSlug === 'superadmin' ? undefined : currentSlug;
    try {
      await logoutAction(slug);
    } catch (e) {
      console.error('Failed to execute logout Server Action:', e);
    }
    setState(s => ({ ...s, user: null, isAuthenticated: false, currentPage: 'dashboard' }));
    localStorage.removeItem('hedge_session_' + currentSlug);
  }, [currentSlug]);

  const setPage = useCallback((page: PageId) => {
    setState(s => ({ ...s, currentPage: page, selectedBranchId: null, selectedInvestorId: null }));
  }, []);

  const setDateRange = useCallback((range: DateRange) => {
    setState(s => ({ ...s, dateRange: range }));
  }, []);

  const toggleSidebar = useCallback(() => {
    setState(s => ({ ...s, sidebarOpen: !s.sidebarOpen }));
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setState(s => {
      const next = !s.sidebarCollapsed;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        /* ignore storage errors */
      }
      return { ...s, sidebarCollapsed: next };
    });
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setState(s => {
      if (s.sidebarCollapsed === collapsed) return s;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
      } catch {
        /* ignore storage errors */
      }
      return { ...s, sidebarCollapsed: collapsed };
    });
  }, []);

  const openICTransferMainMenu = useCallback(() => {
    setICTransferMainMenuOpen(true);
    setSidebarCollapsed(false);
  }, [setSidebarCollapsed]);

  const showICTransferSubNav = useCallback(() => {
    setICTransferMainMenuOpen(false);
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  const openWarehouseMainMenu = useCallback(() => {
    setWarehouseMainMenuOpen(true);
    setSidebarCollapsed(false);
  }, [setSidebarCollapsed]);

  const showWarehouseSubNav = useCallback(() => {
    setWarehouseMainMenuOpen(false);
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === 'true') {
        setState(s => ({ ...s, sidebarCollapsed: true }));
      }
    } catch {
      /* ignore storage errors */
    }
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
      status: 'active',
      kycStatus: 'pending',
      joinedDate: now.slice(0, 10),
      lastActivity: now,
      assignedBranchName: branch?.name,
      isGlobal: input.isGlobal,
      depositHistory: history,
    };

    try {
      const dbRes = await dbAddInvestorAction(newInvestor);
      if (dbRes.success) {
        setState(s => ({ ...s, investors: [newInvestor, ...s.investors] }));
        showToast(`Investor "${newInvestor.name}" added successfully`);
      } else {
        showToast(dbRes.error || 'Failed to add investor', 'error');
      }
    } catch (e) {
      console.error('DB addInvestor failed', e);
      showToast('Failed to add investor', 'error');
    }
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
      } else {
        showToast(dbRes.error || 'Failed to update investor', 'error');
      }
    } catch (e) {
      console.error('DB updateInvestor failed', e);
      showToast('Failed to update investor', 'error');
    }
  }, [showToast, state.branches]);

  const deleteInvestor = useCallback(async (id: string) => {
    try {
      const dbRes = await dbDeleteInvestorAction(id);
      if (dbRes.success) {
        setState(s => ({
          ...s,
          investors: s.investors.filter(inv => inv.id !== id),
          selectedInvestorId: s.selectedInvestorId === id ? null : s.selectedInvestorId
        }));
        showToast('Investor deleted successfully');
        return true;
      } else {
        showToast(dbRes.error || 'Failed to delete investor', 'error');
        return false;
      }
    } catch (e) {
      console.error('DB deleteInvestor failed', e);
      showToast('Failed to delete investor', 'error');
      return false;
    }
  }, [showToast]);

  const addDeal = useCallback(async (deal: Omit<Deal, 'id' | 'date'> & { date?: string }) => {
    const dealId = `deal-${Date.now()}`;
    const now = new Date().toISOString();
    const newDeal: Deal = {
      ...deal,
      id: dealId,
      date: deal.date || now,
      managingBranchId: state.user?.role === 'branch_manager' ? state.user.branchId : deal.managingBranchId,
    };

    try {
      const dbRes = await dbAddDealAction(newDeal);
      if (dbRes.success) {
        setState(s => ({ ...s, deals: [newDeal, ...s.deals] }));
        showToast(`Deal "${newDeal.name}" created successfully`);
        return;
      } else {
        showToast(dbRes.error || 'Failed to create deal', 'error');
        return;
      }
    } catch (e) {
      console.error('DB addDeal failed', e);
      showToast('Failed to create deal', 'error');
      return;
    }
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
      } else {
        showToast(dbRes.error || 'Failed to update deal', 'error');
        return;
      }
    } catch (e) {
      console.error('DB updateDeal failed', e);
      showToast('Failed to update deal', 'error');
      return;
    }
  }, [showToast]);

  const deleteDeal = useCallback(async (id: string) => {
    try {
      const dbRes = await dbDeleteDealAction(id);
      if (dbRes.success) {
        setState(s => ({
          ...s,
          deals: s.deals.filter(d => d.id !== id),
          dealTransactions: s.dealTransactions.filter(t => t.dealId !== id)
        }));
        showToast('Deal deleted successfully');
        return true;
      } else {
        showToast(dbRes.error || 'Failed to delete deal', 'error');
        return false;
      }
    } catch (e) {
      console.error('DB deleteDeal failed', e);
      showToast('Failed to delete deal', 'error');
      return false;
    }
  }, [showToast]);

  const addDealTransaction = useCallback(async (txn: DealTransaction) => {
    try {
      const dbRes = await dbAddDealTransactionAction(txn);
      if (dbRes.success) {
        setState(s => {
          const updatedTransactions = [txn, ...s.dealTransactions];
          const dealTxnsForThisDeal = updatedTransactions.filter(t => t.dealId === txn.dealId);
          const totalPL = dealTxnsForThisDeal.reduce((sum, t) => sum + (t.grossProfit || 0), 0);

          return {
            ...s,
            dealTransactions: updatedTransactions,
            deals: s.deals.map(d => d.id === txn.dealId ? { ...d, totalPL } : d)
          };
        });
        showToast(`Deal transaction executed successfully`);
        return true;
      } else {
        showToast(dbRes.error || 'Failed to execute deal transaction', 'error');
        return false;
      }
    } catch (e) {
      console.error('DB addDealTransaction failed', e);
      showToast('Failed to execute deal transaction', 'error');
      return false;
    }
  }, [showToast]);

  const updateDealTransaction = useCallback(async (txn: DealTransaction) => {
    try {
      const dbRes = await dbUpdateDealTransactionAction(txn);
      if (dbRes.success) {
        setState(s => {
          const updatedTransactions = s.dealTransactions.map(t => t.id === txn.id ? txn : t);
          const dealTxnsForThisDeal = updatedTransactions.filter(t => t.dealId === txn.dealId);
          const totalPL = dealTxnsForThisDeal.reduce((sum, t) => sum + (t.grossProfit || 0), 0);
          
          return {
            ...s,
            dealTransactions: updatedTransactions,
            deals: s.deals.map(d => d.id === txn.dealId ? { ...d, totalPL } : d)
          };
        });
        showToast(`Deal transaction updated successfully`);
        return true;
      } else {
        showToast(dbRes.error || 'Failed to update deal transaction', 'error');
        return false;
      }
    } catch (e) {
      console.error('DB updateDealTransaction failed', e);
      showToast('Failed to update deal transaction', 'error');
      return false;
    }
  }, [showToast]);

  const deleteDealTransaction = useCallback(async (id: string, dealId: string) => {
    try {
      const dbRes = await dbDeleteDealTransactionAction(id, dealId);
      if (dbRes.success) {
        setState(s => {
          const updatedTransactions = s.dealTransactions.filter(t => t.id !== id);
          const dealTxnsForThisDeal = updatedTransactions.filter(t => t.dealId === dealId);
          const totalPL = dealTxnsForThisDeal.reduce((sum, t) => sum + (t.grossProfit || 0), 0);

          return {
            ...s,
            dealTransactions: updatedTransactions,
            deals: s.deals.map(d => d.id === dealId ? { ...d, totalPL } : d)
          };
        });
        showToast(`Deal transaction deleted successfully`);
        return true;
      } else {
        showToast(dbRes.error || 'Failed to delete deal transaction', 'error');
        return false;
      }
    } catch (e) {
      console.error('DB deleteDealTransaction failed', e);
      showToast('Failed to delete deal transaction', 'error');
      return false;
    }
  }, [showToast]);

  const addBranch = useCallback(async (b: Omit<Branch, 'id' | 'status' | 'lastActivity' | 'createdAt' | 'closingBalance' | 'dailyPL' | 'cashBalance' | 'goldBalance' | 'currentBalance' | 'timezone'> & { openingBalance: number; timezone?: string }, slug: string) => {
    const total = b.openingBalance;
    const branchId = mock.generateId('BR');
    const now = new Date().toISOString();

    const newBranch: Branch = {
      ...b,
      id: branchId,
      slug,
      cashBalance: total,
      goldBalance: 0,
      currentBalance: total,
      closingBalance: total,
      dailyPL: 0,
      status: 'active',
      timezone: b.timezone || DEFAULT_BRANCH_TIMEZONE,
      hiddenPages: [],
      lastActivity: now,
      createdAt: now,
    };

    try {
      const dbRes = await dbAddBranchAction(newBranch);
      if (dbRes.success) {
        setState(s => ({
          ...s,
          branches: [...s.branches, newBranch],
          hqBalance: s.hqBalance - b.openingBalance,
        }));
        showToast(`Branch "${newBranch.name}" created with AED ${b.openingBalance.toLocaleString('en-AE')} allocated`);
      } else {
        showToast(dbRes.error || 'Failed to create branch', 'error');
      }
    } catch (e) {
      console.error('DB addBranch failed', e);
      showToast('Failed to create branch', 'error');
    }
  }, [showToast]);

  const updateBranch = useCallback(async (updatedBranch: Branch, slug: string) => {
    try {
      const dbRes = await dbUpdateBranchAction(updatedBranch.id, slug, updatedBranch.name, updatedBranch.location, updatedBranch.managerName);
      if (dbRes.success) {
        setState(s => ({
          ...s,
          branches: s.branches.map(b => b.id === updatedBranch.id ? updatedBranch : b)
        }));
        showToast(`Branch "${updatedBranch.name}" updated successfully`);
        return true;
      } else {
        showToast(dbRes.error || 'Failed to update branch', 'error');
        return false;
      }
    } catch (e) {
      console.error('DB updateBranch failed', e);
      showToast('Failed to update branch', 'error');
      return false;
    }
  }, [showToast]);

  const updateBranchPages = useCallback(async (branchId: string, hiddenPages: string[]) => {
    try {
      const res = await updateBranchPageSettingsAction(branchId, hiddenPages);
      if (res.success && res.hiddenPages) {
        setState(s => ({
          ...s,
          branches: s.branches.map(b =>
            b.id === branchId ? { ...b, hiddenPages: res.hiddenPages! } : b,
          ),
        }));
        showToast('Branch page access updated');
        return true;
      }
      showToast(res.error || 'Failed to update page access', 'error');
      return false;
    } catch (e) {
      console.error('updateBranchPages failed', e);
      showToast('Failed to update page access', 'error');
      return false;
    }
  }, [showToast]);

  const updateBranchInitialFund = useCallback(async (branchId: string, newAmount: number, newCurrentBalance?: number) => {
    try {
      const branchName = state.branches.find(b => b.id === branchId)?.name || '';
      const dbRes = await dbUpdateBranchInitialFundAction(branchId, branchName, newAmount, newCurrentBalance);
      
      if (dbRes.success && dbRes.data) {
        const delta = dbRes.data.delta;
        
        setState(s => ({
          ...s,
          branches: s.branches.map(b => b.id === branchId ? {
            ...b,
            openingBalance: b.openingBalance + delta,
            currentBalance: newCurrentBalance !== undefined && !isNaN(newCurrentBalance) ? newCurrentBalance : b.currentBalance + delta,
            cashBalance: newCurrentBalance !== undefined && !isNaN(newCurrentBalance) ? newCurrentBalance : b.cashBalance + delta,
            closingBalance: b.closingBalance + delta
          } : b),
          transactions: s.transactions.map(t => (t.to === branchName && t.type === 'allocation') ? {
            ...t,
            amount: t.amount + delta
          } : t),
          hqBalance: s.hqBalance - delta
        }));
        
        showToast(`Branch initial capital updated successfully by AED ${delta.toLocaleString('en-AE')}`);
        return true;
      } else {
        showToast(dbRes.error || 'Failed to update initial capital', 'error');
        return false;
      }
    } catch (e) {
      console.error('DB updateBranchInitialFund failed', e);
      showToast('Failed to update initial capital', 'error');
      return false;
    }
  }, [showToast, state.branches]);

  const updateBranchInitialGold = useCallback(async (branchId: string, newAmount: number, newCurrentBalance?: number) => {
    try {
      const branchName = state.branches.find(b => b.id === branchId)?.name || '';
      const dbRes = await dbUpdateBranchInitialGoldAction(branchId, branchName, newAmount, newCurrentBalance);
      
      if (dbRes.success && dbRes.data) {
        const delta = dbRes.data.delta;
        
        setState(s => ({
          ...s,
          branches: s.branches.map(b => b.id === branchId ? {
            ...b,
            openingGoldBalance: b.openingGoldBalance + delta,
            goldBalance: newCurrentBalance !== undefined && !isNaN(newCurrentBalance) ? newCurrentBalance : b.goldBalance + delta,
          } : b),
          transactions: s.transactions.map(t => (t.to === branchName && t.type === 'allocation' && t.assetType === 'gold') ? {
            ...t,
            amount: t.amount + delta
          } : t)
        }));
        
        showToast(`Branch initial gold updated successfully by ${delta.toLocaleString('en-AE')}g`);
        return true;
      } else {
        showToast(dbRes.error || 'Failed to update initial gold', 'error');
        return false;
      }
    } catch (e) {
      console.error('DB updateBranchInitialGold failed', e);
      showToast('Failed to update initial gold', 'error');
      return false;
    }
  }, [showToast, state.branches]);

  const updateHqBalance = useCallback(async (newAmount: number) => {
    try {
      const dbRes = await dbUpdateHqBalanceAction(newAmount);
      if (dbRes.success) {
        setState(s => ({ ...s, hqBalance: newAmount }));
        showToast('Treasury balance updated successfully', 'success');
        return true;
      } else {
        showToast(dbRes.error || 'Failed to update treasury balance', 'error');
        return false;
      }
    } catch (e) {
      console.error('DB updateHqBalance failed', e);
      showToast('Failed to update treasury balance', 'error');
      return false;
    }
  }, [showToast]);

  const deleteBranch = useCallback(async (id: string) => {
    try {
      const dbRes = await dbDeleteBranchAction(id);
      if (dbRes.success) {
        setState(s => ({
          ...s,
          branches: s.branches.filter(b => b.id !== id),
          transactions: s.transactions.filter(t => t.from !== id && t.to !== id) // Remove local associated transactions (allocations) if they reference ID. (Actually they use branch name, but keeping this simple)
        }));
        showToast('Branch deleted successfully');
        return true;
      } else {
        showToast(dbRes.error || 'Failed to delete branch', 'error');
        return false;
      }
    } catch (e) {
      console.error('DB deleteBranch failed', e);
      showToast('Failed to delete branch', 'error');
      return false;
    }
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
      } else {
        showToast(dbRes.error || 'Failed to transfer funds', 'error');
      }
    } catch (e) {
      console.error('DB transferFunds failed', e);
      showToast('Failed to transfer funds', 'error');
    }
  }, [showToast, state.branches, state.hqBalance]);

  const addEntity = useCallback(async (entity: import('@/types').Entity) => {
    try {
      const dbRes = await dbAddEntityAction(entity);
      if (dbRes.success && dbRes.data) {
        setState(s => ({ ...s, entities: [dbRes.data!, ...s.entities] }));
        showToast('Entity created successfully');
        return true;
      } else {
        showToast(dbRes.error || 'Failed to create entity', 'error');
        return false;
      }
    } catch (e) {
      console.error('DB addEntity failed', e);
      showToast('Failed to create entity', 'error');
      return false;
    }
  }, [showToast]);

  const updateEntity = useCallback(async (entity: import('@/types').Entity) => {
    try {
      const dbRes = await dbUpdateEntityAction(entity);
      if (dbRes.success && dbRes.data) {
        setState(s => ({
          ...s,
          entities: s.entities.map(e => e.id === entity.id ? dbRes.data! : e)
        }));
        showToast('Entity updated successfully');
        return true;
      } else {
        showToast(dbRes.error || 'Failed to update entity', 'error');
        return false;
      }
    } catch (e) {
      console.error('DB updateEntity failed', e);
      showToast('Failed to update entity', 'error');
      return false;
    }
  }, [showToast]);

  const deleteEntity = useCallback(async (entityName: string, entityId: string) => {
    try {
      const dbRes = await dbDeleteEntityAction(entityName, entityId);
      if (dbRes.success) {
        setState(s => ({
          ...s,
          entities: s.entities.filter(e => e.id !== entityId)
        }));
        showToast('Entity deleted successfully', 'success');
        return true;
      } else {
        showToast(dbRes.error || 'Failed to delete entity', 'error');
        return false;
      }
    } catch (e) {
      console.error('DB deleteEntity failed', e);
      showToast('Failed to delete entity', 'error');
      return false;
    }
  }, [showToast]);

  const processLedgerTransaction = useCallback(async (txn: import('@/types').Transaction, deltaCash: number, deltaGold: number, branchId: string) => {
    try {
      const branchSlug = currentSlug === 'superadmin' ? undefined : currentSlug;
      const dbRes = await dbProcessLedgerTransactionAction(txn, deltaCash, deltaGold, branchId, txn.tagIds || [], branchSlug);
      if (dbRes.success && dbRes.data) {
        const processed = dbRes.data;
        setState(s => {
          const newBranches = s.branches.map(b => {
            if (b.id === branchId) {
              return { 
                ...b, 
                currentBalance: b.currentBalance + deltaCash, 
                cashBalance: b.cashBalance + deltaCash,
                goldBalance: b.goldBalance + deltaGold,
              };
            }
            return b;
          });
          return {
            ...s,
            transactions: [processed, ...s.transactions],
            branches: newBranches
          };
        });
        showToast('Transaction processed successfully', 'success');
        return true;
      } else {
        showToast(dbRes.error || 'Failed to process transaction', 'error');
        return false;
      }
    } catch (error) {
      console.error('DB processLedgerTransaction failed', error);
      showToast('Failed to process transaction', 'error');
      return false;
    }
  }, [showToast, currentSlug]);

  const updateLedgerTransaction = useCallback(async (txn: import('@/types').Transaction, oldAmount: number, oldCategory: string | undefined, deltaCash: number, deltaGold: number, branchId: string) => {
    try {
      const dbRes = await dbUpdateLedgerTransactionAction(txn, oldAmount, oldCategory, deltaCash, deltaGold, branchId);
      if (dbRes.success && dbRes.data) {
        setState(s => {
          const newBranches = s.branches.map(b => {
            if (b.id === branchId) {
              return { 
                ...b, 
                currentBalance: b.currentBalance + deltaCash, 
                cashBalance: b.cashBalance + deltaCash,
                goldBalance: b.goldBalance + deltaGold,
              };
            }
            return b;
          });
          return {
            ...s,
            transactions: s.transactions.map(t => t.id === txn.id ? dbRes.data! : t),
            branches: newBranches
          };
        });
        showToast('Transaction updated successfully', 'success');
        return true;
      } else {
        showToast(dbRes.error || 'Failed to update transaction', 'error');
        return false;
      }
    } catch (error) {
      console.error('DB updateLedgerTransaction failed', error);
      showToast('Failed to update transaction', 'error');
      return false;
    }
  }, [showToast]);

  const deleteLedgerTransaction = useCallback(async (id: string, txnAmount: number, txnCategory: string | undefined, txnAssetType: string | undefined, branchId: string) => {
    let deltaCash = 0;
    let deltaGold = 0;
    
    if (txnAssetType === 'gold') {
      if (txnCategory === 'debit') deltaGold = -txnAmount;
      if (txnCategory === 'credit') deltaGold = txnAmount;
    } else {
      if (txnCategory === 'debit') deltaCash = -txnAmount;
      if (txnCategory === 'credit') deltaCash = txnAmount;
    }
    
    try {
      const dbRes = await dbDeleteLedgerTransactionAction(id, deltaCash, deltaGold, branchId);
      if (dbRes.success) {
        setState(s => {
          const newBranches = s.branches.map(b => {
            if (b.id === branchId) {
              return { 
                ...b, 
                currentBalance: b.currentBalance + deltaCash, 
                cashBalance: b.cashBalance + deltaCash,
                goldBalance: b.goldBalance + deltaGold,
              };
            }
            return b;
          });
          return {
            ...s,
            transactions: s.transactions.filter(t => t.id !== id),
            branches: newBranches
          };
        });
        showToast('Transaction deleted successfully', 'success');
        return true;
      } else {
        showToast(dbRes.error || 'Failed to delete transaction', 'error');
        return false;
      }
    } catch (error) {
      console.error('DB deleteLedgerTransaction failed', error);
      showToast('Failed to delete transaction', 'error');
      return false;
    }
  }, [showToast]);

  const updateTransactionMeta = useCallback(async (txnId: string, date: string, notes: string, tagIds: string[]) => {
    try {
      const dbRes = await dbUpdateTransactionMetaAction(txnId, date, notes, tagIds);
      if (dbRes.success && dbRes.data) {
        setState(s => ({
          ...s,
          transactions: s.transactions.map(t => (t.id === txnId ? dbRes.data! : t)),
        }));
        showToast('Transaction updated successfully', 'success');
        return true;
      }
      showToast(dbRes.error || 'Failed to update transaction', 'error');
      return false;
    } catch (error) {
      console.error('DB updateTransactionMeta failed', error);
      showToast('Failed to update transaction', 'error');
      return false;
    }
  }, [showToast]);

  const addLedger = useCallback(async (ledger: import('@/types').Ledger) => {
    try {
      const dbRes = await dbAddLedgerAction(ledger);
      if (dbRes.success && dbRes.data) {
        setState(s => ({ ...s, ledgers: [...s.ledgers, dbRes.data!] }));
        showToast('Ledger created successfully');
        return true;
      } else {
        showToast(dbRes.error || 'Failed to create ledger', 'error');
        return false;
      }
    } catch (e) {
      console.error('DB addLedger failed', e);
      showToast('Failed to create ledger', 'error');
      return false;
    }
  }, [showToast]);

  const updateLedger = useCallback(async (ledger: import('@/types').Ledger) => {
    try {
      const dbRes = await dbUpdateLedgerAction(ledger);
      if (dbRes.success && dbRes.data) {
        setState(s => ({
          ...s,
          ledgers: s.ledgers.map(l => l.id === ledger.id ? dbRes.data! : l)
        }));
        showToast('Ledger updated successfully');
        return true;
      } else {
        showToast(dbRes.error || 'Failed to update ledger', 'error');
        return false;
      }
    } catch (e) {
      console.error('DB updateLedger failed', e);
      showToast('Failed to update ledger', 'error');
      return false;
    }
  }, [showToast]);

  const deleteLedger = useCallback(async (id: string, name: string) => {
    try {
      const dbRes = await dbDeleteLedgerAction(id, name);
      if (dbRes.success) {
        setState(s => ({
          ...s,
          ledgers: s.ledgers.filter(l => l.id !== id)
        }));
        showToast('Ledger deleted successfully');
        return true;
      } else {
        showToast(dbRes.error || 'Failed to delete ledger', 'error');
        return false;
      }
    } catch (e) {
      console.error('DB deleteLedger failed', e);
      showToast('Failed to delete ledger', 'error');
      return false;
    }
  }, [showToast]);

  const addTransactionTag = useCallback(async (tag: import('@/types').TransactionTag) => {
    try {
      const dbRes = await dbCreateTransactionTagAction(tag);
      if (dbRes.success && dbRes.data) {
        setState(s => {
          const exists = s.transactionTags.some(t => t.id === dbRes.data!.id);
          return {
            ...s,
            transactionTags: exists
              ? s.transactionTags.map(t => (t.id === dbRes.data!.id ? dbRes.data! : t))
              : [...s.transactionTags, dbRes.data!],
          };
        });
        return dbRes.data;
      }
      showToast(dbRes.error || 'Failed to create tag', 'error');
      return null;
    } catch (e) {
      console.error('DB addTransactionTag failed', e);
      showToast('Failed to create tag', 'error');
      return null;
    }
  }, [showToast]);


  const addInvoice = useCallback(async (inv: Omit<Invoice, 'id' | 'status'>) => {
    const newInvId = `INV-2026-${String(state.invoices.length + 1).padStart(3, '0')}`;
    const newInv: Invoice = { ...inv, id: newInvId, status: 'pending' };

    try {
      const dbRes = await dbAddInvoiceAction(newInv);
      if (dbRes.success) {
        setState(s => ({ ...s, invoices: [newInv, ...s.invoices] }));
        showToast(`Invoice ${newInv.id} created`);
      } else {
        showToast(dbRes.error || 'Failed to create invoice', 'error');
      }
    } catch (e) {
      console.error('DB addInvoice failed', e);
      showToast('Failed to create invoice', 'error');
    }
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
      assetType: 'currency',
      status: 'completed',
      notes: `${exp.category}: ${exp.description}`,
      branchId: exp.branchId,
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
      } else {
        showToast(dbRes.error || 'Failed to record expense', 'error');
      }
    } catch (e) {
      console.error('DB addExpense failed', e);
      showToast('Failed to record expense', 'error');
    }
  }, [showToast, state.hqBalance]);

  const setActiveCurrency = useCallback((currency: CurrencyCode) => {
    mock.setGlobalCurrency(currency);
    setState(s => ({ ...s, activeCurrency: currency }));
  }, []);

  const addICRegion = useCallback(async (name: string, country: string) => {
    try {
      const res = await dbAddICRegionAction(name, country);
      if (res.success && res.data) {
        setState(s => ({ ...s, icRegions: [...s.icRegions, res.data!] }));
        showToast('Region added successfully');
        return true;
      } else {
        showToast(res.error || 'Failed to add region', 'error');
        return false;
      }
    } catch (e) {
      showToast('Error adding region', 'error');
      return false;
    }
  }, [showToast]);

  const updateICRegion = useCallback(async (id: string, name: string, country: string) => {
    try {
      const res = await dbUpdateICRegionAction(id, name, country);
      if (res.success && res.data) {
        setState(s => ({ ...s, icRegions: s.icRegions.map(r => r.id === id ? res.data! : r) }));
        showToast('Region updated successfully');
        return true;
      } else {
        showToast(res.error || 'Failed to update region', 'error');
        return false;
      }
    } catch (e) {
      showToast('Error updating region', 'error');
      return false;
    }
  }, [showToast]);

  const deleteICRegion = useCallback(async (id: string) => {
    try {
      const res = await dbDeleteICRegionAction(id);
      if (res.success) {
        setState(s => ({ ...s, icRegions: s.icRegions.filter(r => r.id !== id) }));
        showToast('Region deleted successfully');
        return true;
      } else {
        showToast(res.error || 'Failed to delete region', 'error');
        return false;
      }
    } catch (e) {
      showToast('Error deleting region', 'error');
      return false;
    }
  }, [showToast]);

  const addICSupplier = useCallback(async (name: string, phone: string, commission: number | null, regionId: string, email: string, address: string) => {
    try {
      const res = await dbAddICSupplierAction(name, phone, commission, regionId, email, address);
      if (res.success && res.data) {
        setState(s => ({ ...s, icSuppliers: [...s.icSuppliers, res.data!] }));
        showToast('Supplier added successfully');
        return true;
      } else {
        showToast(res.error || 'Failed to add supplier', 'error');
        return false;
      }
    } catch (e) {
      showToast('Error adding supplier', 'error');
      return false;
    }
  }, [showToast]);

  const updateICSupplier = useCallback(async (id: string, name: string, phone: string, commission: number | null, regionId: string, email: string, address: string) => {
    try {
      const res = await dbUpdateICSupplierAction(id, name, phone, commission, regionId, email, address);
      if (res.success && res.data) {
        setState(s => ({ ...s, icSuppliers: s.icSuppliers.map(sup => sup.id === id ? res.data! : sup) }));
        showToast('Supplier updated successfully');
        return true;
      } else {
        showToast(res.error || 'Failed to update supplier', 'error');
        return false;
      }
    } catch (e) {
      showToast('Error updating supplier', 'error');
      return false;
    }
  }, [showToast]);

  const deleteICSupplier = useCallback(async (id: string) => {
    try {
      const res = await dbDeleteICSupplierAction(id);
      if (res.success) {
        setState(s => ({ ...s, icSuppliers: s.icSuppliers.filter(sup => sup.id !== id) }));
        showToast('Supplier deleted successfully');
        return true;
      } else {
        showToast(res.error || 'Failed to delete supplier', 'error');
        return false;
      }
    } catch (e) {
      showToast('Error deleting supplier', 'error');
      return false;
    }
  }, [showToast]);

  const addICWarehouse = useCallback(async (name: string, phone: string, commission: number | null, regionId: string, email: string, address: string) => {
    try {
      const res = await dbAddICWarehouseAction(name, phone, commission, regionId, email, address);
      if (res.success && res.data) {
        setState(s => ({ ...s, icWarehouses: [...s.icWarehouses, res.data!] }));
        showToast('Warehouse added successfully');
        return true;
      } else {
        showToast(res.error || 'Failed to add warehouse', 'error');
        return false;
      }
    } catch (e) {
      showToast('Error adding warehouse', 'error');
      return false;
    }
  }, [showToast]);

  const updateICWarehouse = useCallback(async (id: string, name: string, phone: string, commission: number | null, regionId: string, email: string, address: string) => {
    try {
      const res = await dbUpdateICWarehouseAction(id, name, phone, commission, regionId, email, address);
      if (res.success && res.data) {
        setState(s => ({ ...s, icWarehouses: s.icWarehouses.map(w => w.id === id ? res.data! : w) }));
        showToast('Warehouse updated successfully');
        return true;
      } else {
        showToast(res.error || 'Failed to update warehouse', 'error');
        return false;
      }
    } catch (e) {
      showToast('Error updating warehouse', 'error');
      return false;
    }
  }, [showToast]);

  const deleteICWarehouse = useCallback(async (id: string) => {
    try {
      const res = await dbDeleteICWarehouseAction(id);
      if (res.success) {
        setState(s => ({ ...s, icWarehouses: s.icWarehouses.filter(w => w.id !== id) }));
        showToast('Warehouse deleted successfully');
        return true;
      } else {
        showToast(res.error || 'Failed to delete warehouse', 'error');
        return false;
      }
    } catch (e) {
      showToast('Error deleting warehouse', 'error');
      return false;
    }
  }, [showToast]);

  const updateICRates = useCallback(async (buyRate: number, saleRate: number, sarConversion: number, inrConversion: number) => {
    try {
      const res = await dbUpdateICRatesAction(buyRate, saleRate, sarConversion, inrConversion);
      if (res.success && res.data) {
        setState(s => ({ ...s, icRates: [res.data!] }));
        showToast('Rates updated successfully');
        return true;
      } else {
        showToast(res.error || 'Failed to update rates', 'error');
        return false;
      }
    } catch (e) {
      showToast('Error updating rates', 'error');
      return false;
    }
  }, [showToast]);

  const addICPurchase = useCallback(async (purchase: Omit<ICPurchase, 'id' | 'createdAt'>) => {
    try {
      const res = await dbAddICPurchaseAction(purchase);
      if (res.success && res.data) {
        setState(s => ({ ...s, icPurchases: [res.data!, ...s.icPurchases] }));
        showToast('Purchase recorded successfully');
        refetchData(); // fetch to get warehouse updates
        return true;
      } else {
        showToast(res.error || 'Failed to record purchase', 'error');
        return false;
      }
    } catch (e) {
      showToast('Error recording purchase', 'error');
      return false;
    }
  }, [showToast, refetchData]);

  const addICSale = useCallback(async (sale: Omit<ICSale, 'id' | 'createdAt' | 'enteredBy' | 'enteredByName' | 'enteredByUserId'>) => {
    try {
      const res = await dbAddICSaleAction(sale);
      if (res.success && res.data) {
        setState(s => ({ ...s, icSales: [res.data!, ...s.icSales] }));
        showToast('Sale recorded successfully');
        return true;
      } else {
        showToast(res.error || 'Failed to record sale', 'error');
        return false;
      }
    } catch (e) {
      showToast('Error recording sale', 'error');
      return false;
    }
  }, [showToast]);

  const updateICPurchase = useCallback(async (id: string, updates: Partial<Omit<ICPurchase, 'id' | 'createdAt'>>) => {
    try {
      const res = await dbUpdateICPurchaseAction(id, updates);
      if (res.success && res.data) {
        setState(s => ({
          ...s,
          icPurchases: s.icPurchases.map(p => p.id === id ? res.data! : p)
        }));
        showToast('Purchase updated successfully');
        refetchData(); // fetch to get warehouse updates
        return true;
      } else {
        showToast(res.error || 'Failed to update purchase', 'error');
        return false;
      }
    } catch (e) {
      showToast('Error updating purchase', 'error');
      return false;
    }
  }, [showToast, refetchData]);

  const updateICSale = useCallback(async (id: string, updates: Partial<Omit<ICSale, 'id' | 'createdAt'>>) => {
    try {
      const res = await dbUpdateICSaleAction(id, updates);
      if (res.success && res.data) {
        setState(s => ({
          ...s,
          icSales: s.icSales.map(sItem => sItem.id === id ? res.data! : sItem)
        }));
        showToast('Sale updated successfully');
        return true;
      } else {
        showToast(res.error || 'Failed to update sale', 'error');
        return false;
      }
    } catch (e) {
      showToast('Error updating sale', 'error');
      return false;
    }
  }, [showToast]);

  const deleteICPurchase = useCallback(async (id: string) => {
    try {
      const res = await dbDeleteICPurchaseAction(id);
      if (res.success) {
        setState(s => ({
          ...s,
          icPurchases: s.icPurchases.filter(p => p.id !== id)
        }));
        showToast('Purchase deleted successfully');
        refetchData(); // fetch to get warehouse updates
        return true;
      } else {
        showToast(res.error || 'Failed to delete purchase', 'error');
        return false;
      }
    } catch (e) {
      showToast('Error deleting purchase', 'error');
      return false;
    }
  }, [showToast, refetchData]);

  const deleteICSale = useCallback(async (id: string) => {
    try {
      const res = await dbDeleteICSaleAction(id);
      if (res.success) {
        setState(s => ({
          ...s,
          icSales: s.icSales.filter(sale => sale.id !== id)
        }));
        showToast('Sale deleted successfully');
        return true;
      } else {
        showToast(res.error || 'Failed to delete sale', 'error');
        return false;
      }
    } catch (e) {
      showToast('Error deleting sale', 'error');
      return false;
    }
  }, [showToast]);

  const contextValue = useMemo(() => {
    let filteredState = state;
    const activeSlug = pathname === '/' ? undefined : pathname?.split('/')[1];

    let filterBranchId: string | undefined = undefined;

    if (!state.isInitialLoading && state.user) {
    if (isBranchScopedUser(state.user) && state.user.branchId) {
      filterBranchId = state.user.branchId;
    } else if (state.user.role === 'admin' && activeSlug) {
        const matchingBranch = state.branches.find(b => 
          b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === activeSlug
        );
        if (matchingBranch) {
          filterBranchId = matchingBranch.id;
        }
      }

      if (filterBranchId) {
        const branchName = state.branches.find(b => b.id === filterBranchId)?.name || filterBranchId;
        const deals = state.deals.filter(d => {
          const matchManaging = d.managingBranchId === filterBranchId;
          const matchInvestor = d.investors.some(di => {
            const inv = state.investors.find(i => i.id === di.investorId);
            return inv && inv.assignedBranchId === filterBranchId;
          });
          return matchManaging || matchInvestor;
        });
        const dealIds = new Set(deals.map(d => d.id));

        filteredState = {
          ...state,
          branches: state.branches.filter(b => b.id === filterBranchId),
          transactions: state.transactions.filter(t => t.branchId === filterBranchId),
          expenses: state.expenses.filter(e => e.branchId === filterBranchId),
          invoices: state.invoices.filter(i => i.branchId === filterBranchId),
          investors: state.investors.filter(i => i.assignedBranchId === filterBranchId || i.isGlobal),
          deals,
          dealTransactions: state.dealTransactions.filter(dt => dealIds.has(dt.dealId || '')),
        };
      }
    }

    const getTotalCapital = () => {
      if (isBranchScopedUser(filteredState.user)) {
        return filteredState.deals.reduce((sum, d) => sum + d.totalInvestment, 0);
      }
      if (filterBranchId) {
        return filteredState.branches.reduce((sum, b) => sum + b.currentBalance, 0);
      }
      return filteredState.branches.reduce((sum, b) => sum + b.currentBalance, 0) + filteredState.hqBalance;
    };

    const getNetPL = () => {
      if (isBranchScopedUser(filteredState.user)) {
        return filteredState.dealTransactions.reduce((sum, dt) => sum + dt.grossProfit, 0);
      }
      return filteredState.branches.reduce((sum, b) => sum + b.dailyPL, 0);
    };

    const isBranchView = !!filterBranchId || isBranchScopedUser(filteredState.user);
    const isICTransferRoute = pathname.includes('/ic-transfer') && !pathname.includes('/ic-transfer-branch');
    const showICTransferSecondarySidebar = isICTransferRoute && !icTransferMainMenuOpen;
    const isWarehouseRoute = pathname.split('/').includes('warehouse') && !pathname.split('/').includes('ic-transfer');
    const showWarehouseSecondarySidebar = isWarehouseRoute && !warehouseMainMenuOpen && filteredState.user?.role !== 'branch_manager' && filteredState.user?.role !== 'staff';

    const viewBranchSlug = resolveViewBranchSlug(pathname, currentSlug);
    let enabledCurrencies: CurrencyCode[] = sanitizeEnabledCurrencies(['AED', 'USD', 'INR']);
    const viewBranch = viewBranchSlug
      ? findBranchBySlug(state.branches, viewBranchSlug)
      : filteredState.branches.length === 1
        ? filteredState.branches[0]
        : undefined;
    if (viewBranch?.enabledCurrencies?.length) {
      enabledCurrencies = sanitizeEnabledCurrencies(viewBranch.enabledCurrencies);
    }

    return {
      ...filteredState,
      isBranchView,
      isICTransferRoute,
      icTransferMainMenuOpen,
      showICTransferSecondarySidebar,
      isWarehouseRoute,
      warehouseMainMenuOpen,
      showWarehouseSecondarySidebar,
      currentSlug,
      enabledCurrencies,
      login, logout, setPage, setDateRange, addBranch, updateBranch, updateBranchPages, updateBranchInitialFund, updateBranchInitialGold, updateHqBalance, deleteBranch, transferFunds,
      addInvoice, addExpense, showToast, toggleSidebar, toggleSidebarCollapsed, setSidebarCollapsed, openICTransferMainMenu, showICTransferSubNav, openWarehouseMainMenu, showWarehouseSubNav, selectBranch, selectInvestor, addInvestor,
      updateInvestor, deleteInvestor, addDeal, updateDeal, deleteDeal, addDealTransaction, updateDealTransaction, deleteDealTransaction, getTotalCapital, getNetPL, setActiveCurrency, refetchData, refetchCurrencyRates,
      addEntity, updateEntity, deleteEntity, processLedgerTransaction, updateLedgerTransaction, updateTransactionMeta, deleteLedgerTransaction,
      addLedger, updateLedger, deleteLedger, addTransactionTag,
      addICRegion, updateICRegion, deleteICRegion, addICSupplier, updateICSupplier, deleteICSupplier, addICWarehouse, updateICWarehouse, deleteICWarehouse, updateICRates, addICPurchase, updateICPurchase, addICSale, updateICSale,
      deleteICPurchase,
      deleteICSale,
    };
  }, [state, pathname, currentSlug, icTransferMainMenuOpen, login, logout, setPage, setDateRange, addBranch, updateBranch, updateBranchPages, updateBranchInitialFund, updateBranchInitialGold, updateHqBalance, deleteBranch, transferFunds, addInvoice, addExpense, showToast, toggleSidebar, toggleSidebarCollapsed, setSidebarCollapsed, openICTransferMainMenu, showICTransferSubNav, selectBranch, selectInvestor, addInvestor, updateInvestor, deleteInvestor, addDeal, updateDeal, deleteDeal, addDealTransaction, updateDealTransaction, deleteDealTransaction, setActiveCurrency, refetchData, refetchCurrencyRates, addEntity, updateEntity, deleteEntity, processLedgerTransaction, updateLedgerTransaction, updateTransactionMeta, deleteLedgerTransaction, addLedger, updateLedger, deleteLedger, addTransactionTag, addICRegion, updateICRegion, deleteICRegion, addICSupplier, updateICSupplier, deleteICSupplier, addICWarehouse, updateICWarehouse, deleteICWarehouse, updateICRates, addICPurchase, updateICPurchase, addICSale, updateICSale, deleteICPurchase, deleteICSale]);

  useEffect(() => {
    const enabled = contextValue.enabledCurrencies;
    if (!enabled.includes(contextValue.activeCurrency)) {
      setActiveCurrency(enabled[0]);
    }
  }, [contextValue.enabledCurrencies, contextValue.activeCurrency, setActiveCurrency]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
