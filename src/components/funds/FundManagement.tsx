'use client';
import React, { useState } from 'react';
import KPICard from '@/components/ui/KPICard';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { formatAED, formatAEDStr, formatDateTime, generateId } from '@/data/mockData';
import { Branch, Transaction, Entity } from '@/types';
import { badgeClass } from '@/lib/badgeClass';
import {
  btnPrimary,
  btnSecondary,
  formGroup,
  formInput,
  formLabel,
  formRow,
  filterSelect,
  formSelect,
  formTextarea,
  formHint,
  formError,
  kpiGrid,
  pageHeader,
  pageSubtitle,
  pageTitle,
  tableWrap,
  dataTable,
} from '@/lib/ui';
import { BranchTransferModal } from './BranchTransferModal';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { useDateFilter } from '@/hooks/useDateFilter';
import DateFilterBar from '@/components/ui/DateFilterBar';

export default function FundManagement() {
  const { branches, transactions, transferFunds, hqBalance, isBranchView, updateBranchInitialFund, updateBranchInitialGold, updateHqBalance, showToast, entities, addEntity, updateEntity, deleteEntity, processLedgerTransaction, updateLedgerTransaction, deleteLedgerTransaction, ledgers, addLedger, updateLedger, deleteLedger } = useApp();
  const [showTransfer, setShowTransfer] = useState(false);
  const [showEditInitialFund, setShowEditInitialFund] = useState(false);
  const [showEditHqBalance, setShowEditHqBalance] = useState(false);
  const [editHqBalanceAmount, setEditHqBalanceAmount] = useState('');
  const [isUpdatingHqBalance, setIsUpdatingHqBalance] = useState(false);
  const [editFundAmount, setEditFundAmount] = useState('');
  const [editCurrentBalanceAmount, setEditCurrentBalanceAmount] = useState('');
  const [editGoldFundAmount, setEditGoldFundAmount] = useState('');
  const [editCurrentGoldBalanceAmount, setEditCurrentGoldBalanceAmount] = useState('');
  const [isUpdatingFund, setIsUpdatingFund] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [deletingTxn, setDeletingTxn] = useState<Transaction | null>(null);
  const [isSavingTxn, setIsSavingTxn] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'entities' | string>('all');

  // Ledger state
  const [showManageLedgers, setShowManageLedgers] = useState(false);
  const [editingLedger, setEditingLedger] = useState<import('@/types').Ledger | null>(null);
  const [newLedgerName, setNewLedgerName] = useState('');
  const [newLedgerImpact, setNewLedgerImpact] = useState<'positive' | 'negative' | 'neutral'>('neutral');
  const [newLedgerIsKpi, setNewLedgerIsKpi] = useState(true);
  const [isSavingLedger, setIsSavingLedger] = useState(false);
  // Add Entity state
  const [showAddEntity, setShowAddEntity] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityPhone, setNewEntityPhone] = useState('');
  const [isSubmittingEntity, setIsSubmittingEntity] = useState(false);

  // Drilldown entity state
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [deletingEntity, setDeletingEntity] = useState<Entity | null>(null);
  const [isSavingEntity, setIsSavingEntity] = useState(false);
  const [isDeletingEntity, setIsDeletingEntity] = useState(false);

  const {
    dateFilter, setDateFilter,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
    filteredData: filteredTransactions
  } = useDateFilter(transactions);

  const branchName = branches.length === 1 ? branches[0].name : '';
  const branchId = branches.length === 1 ? branches[0].id : undefined;

  const totalVolume = filteredTransactions.reduce((acc: number, t: Transaction) => acc + t.amount, 0);
  const transferCount = filteredTransactions.filter((t: Transaction) => t.type === 'transfer').length;
  const pendingCount = filteredTransactions.filter((t: Transaction) => t.status === 'pending').length;

  const branchLedgers = React.useMemo(() => {
    return ledgers.filter(l => !l.branchId || l.branchId === branchId);
  }, [ledgers, branchId]);

  const isLedgerTab = activeTab !== 'all' && activeTab !== 'entities';
  const formatTxnAmount = (t: Transaction) =>
    t.assetType === 'gold' ? `${t.amount.toFixed(2)}g` : formatAED(t.amount);
  const txnTableColSpan = (isBranchView && branches.length === 1 ? 7 : 6) + (isLedgerTab ? 1 : 0);

  // Calculate Ledger Balances
  const ledgerBalances = React.useMemo(() => {
    const balances: Record<string, number> = {};
    branchLedgers.forEach(l => {
      const toSum = filteredTransactions.filter((t: Transaction) => t.to === l.name).reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      const fromSum = filteredTransactions.filter((t: Transaction) => t.from === l.name).reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      const tagSum = filteredTransactions.filter((t: Transaction) => t.type === l.name && t.from !== l.name && t.to !== l.name).reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      balances[l.id] = toSum - fromSum + tagSum;
    });
    return balances;
  }, [filteredTransactions, branchLedgers]);

  const availableBranchFund = React.useMemo(() => {
    let base = branches.length === 1 ? branches[0].openingBalance || 0 : 0;
    const bName = branches.length === 1 ? branches[0].name : '';
    const ledgersSet = new Set(branchLedgers.map(l => l.name));
    
    filteredTransactions.forEach((t: Transaction) => {
      if ((t.assetType || 'currency') !== 'currency' || t.status !== 'completed') return;
      const isLedgerTxn = ledgersSet.has(t.from) || ledgersSet.has(t.to) || ledgersSet.has(t.type);
      if (isLedgerTxn) return;
      if (t.to === bName) base += t.amount;
      if (t.from === bName) base -= t.amount;
    });
    return base;
  }, [branches, filteredTransactions, branchLedgers]);

  const branchGoldVolume = branches.length === 1 ? branches[0].goldBalance : 0;

  const inverseImpactSum = React.useMemo(() => {
    return branchLedgers.reduce((acc, l) => {
      const bal = ledgerBalances[l.id] || 0;
      if (l.impact === 'positive') return acc - bal;
      if (l.impact === 'negative') return acc + bal;
      return acc;
    }, 0);
  }, [branchLedgers, ledgerBalances]);

  const totalCashInLocker = availableBranchFund - inverseImpactSum;

  const tabCounts = React.useMemo(() => {
    const src = filteredTransactions || [];
    const branchEntitiesCount = entities.filter(e => !branchId || e.branchId === branchId).length;
    
    const counts: Record<string, number> = {
      all: src.length,
      entities: branchEntitiesCount,
    };
    
    branchLedgers.forEach(l => {
      counts[l.name] = src.filter(t => t.type === l.name || t.from === l.name || t.to === l.name).length;
    });
    return counts;
  }, [filteredTransactions, entities, branchId, branchLedgers]);

  const filteredEntities = React.useMemo(() => {
    let result = entities.filter(e => {
      if (branchId && e.branchId !== branchId) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        return (
          e.name.toLowerCase().includes(query) ||
          (e.phone && e.phone.includes(query))
        );
      }
      return true;
    });

    result.sort((a, b) => {
      let field = sortField;
      if (field !== 'name' && field !== 'createdAt') {
        field = 'createdAt';
      }
      let valA = field === 'name' ? a.name : a.createdAt || '';
      let valB = field === 'name' ? b.name : b.createdAt || '';

      const compare = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? compare : -compare;
    });

    return result;
  }, [entities, searchTerm, sortField, sortDirection, branchId]);

  const filteredAndSortedTxns = React.useMemo(() => {
    let result = filteredTransactions.filter((t: Transaction) => {
      // Isolate to the specific branch
      if (branchId && t.branchId !== branchId) return false;

      if (activeTab !== 'all') {
        const isMatch = t.type === activeTab || t.from === activeTab || t.to === activeTab;
        if (!isMatch) return false;
      }
      if (activeTab === 'all' && filter !== 'all') {
        const isMatch = t.type === filter || t.from === filter || t.to === filter;
        if (!isMatch) return false;
      }
      if (branchFilter !== 'all' && t.from !== branchFilter && t.to !== branchFilter) return false;
      if (entityFilter !== 'all' && t.from !== entityFilter && t.to !== entityFilter) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        return (
          t.from.toLowerCase().includes(query) ||
          t.to.toLowerCase().includes(query) ||
          t.amount.toString().includes(query) ||
          t.type.toLowerCase().includes(query) ||
          t.status.toLowerCase().includes(query)
        );
      }
      return true;
    });

    result.sort((a: any, b: any) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [transactions, filteredTransactions, filter, branchFilter, entityFilter, searchTerm, sortField, sortDirection, activeTab]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 inline-block ml-1">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent inline-block ml-1">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent inline-block ml-1">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const typeFilters = React.useMemo(() => {
    const baseFilters = [
      { value: 'all', label: 'All Types' },
      { value: 'transfer', label: 'Transfer' },
      { value: 'expense', label: 'Expense' },
      { value: 'allocation', label: 'Allocation' },
    ];
    const ledgerFilters = branchLedgers.map(l => ({
      value: l.name,
      label: l.name
    }));
    return [...baseFilters, ...ledgerFilters];
  }, [branchLedgers]);

  const branchOptions = [
    { value: 'all', label: 'All Branches' },
    ...branches.map((b: Branch) => ({ value: b.name, label: b.name }))
  ];

  const entityOptions = [
    { value: 'all', label: 'All Entities' },
    ...entities.map(e => ({ value: e.name, label: e.name }))
  ];

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className={pageHeader}>
          <div>
            <h2 className={pageTitle}>Fund Management</h2>
            <p className={pageSubtitle}>Monitor capital flow and execute strategic transfers</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 sm:mt-0">
            {isBranchView && branches.length === 1 && (
              <button 
                type="button" 
                className={`${btnSecondary} w-full sm:w-auto`} 
                onClick={() => {
                  const b = branches[0];
                  setEditFundAmount(b.openingBalance?.toString() || '0');
                  setEditCurrentBalanceAmount(b.currentBalance?.toString() || '0');
                  setEditGoldFundAmount(b.openingGoldBalance?.toString() || '0');
                  setEditCurrentGoldBalanceAmount(b.goldBalance?.toString() || '0');
                  setShowEditInitialFund(true);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Capital
              </button>
            )}
            {!isBranchView && (
              <button 
                type="button" 
                className={`${btnSecondary} w-full sm:w-auto`} 
                onClick={() => {
                  setEditHqBalanceAmount(hqBalance.toString());
                  setShowEditHqBalance(true);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Treasury
              </button>
            )}
            <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={() => setShowManageLedgers(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
              </svg>
              Manage Ledgers
            </button>
            <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={() => setShowTransfer(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Execute Transfer
            </button>
          </div>
        </div>

        <DateFilterBar
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
        />

        <div className={kpiGrid}>
          {isBranchView && branches.length === 1 ? (
            <>
              <KPICard
                label="Branch Fund"
                value={formatAED(availableBranchFund)}
                subValue={`Total: ${formatAEDStr(branches.length === 1 ? branches[0].openingBalance : 0)}`}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M3 21h18M3 10h18M5 21V10m14 11V10M2 7l10-5 10 5M10 14h4v7h-4z" />
                  </svg>
                }
                color="var(--accent)"
                bgColor="var(--accent-light)"
              />
              
              <KPICard
                label="Branch Gold Volume"
                value={`${branchGoldVolume.toFixed(2)}g`}
                subValue={`Total: ${branches.length === 1 ? (branches[0].openingGoldBalance || 0).toFixed(2) : '0.00'}g`}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                }
                color="#eab308"
                bgColor="#fef08a"
              />
              
              {branchLedgers.filter(l => l.isKpi).map(ledger => (
                <KPICard
                  key={ledger.id}
                  label={ledger.name}
                  value={formatAED(ledgerBalances[ledger.id] || 0)}
                  subValue={`Impact: ${ledger.impact}`}
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  }
                  color={ledger.impact === 'positive' ? "var(--success)" : ledger.impact === 'negative' ? "var(--warning)" : "var(--info)"}
                  bgColor={ledger.impact === 'positive' ? "var(--success-light)" : ledger.impact === 'negative' ? "var(--warning-light)" : "var(--info-light)"}
                />
              ))}

              <KPICard
                label="Total Cash In Locker"
                value={formatAED(totalCashInLocker)}
                subValue="Actual physical cash"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <circle cx="12" cy="12" r="2" />
                    <path d="M6 12h.01M18 12h.01" />
                  </svg>
                }
                color="var(--info)"
                bgColor="var(--info-light)"
              />
            </>
          ) : (
            <>
              <KPICard
                label="HQ Treasury Balance"
                value={formatAED(hqBalance)}
                subValue="Available for allocation"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M3 21h18M3 10h18M5 21V10m14 11V10M2 7l10-5 10 5M10 14h4v7h-4z" />
                  </svg>
                }
                color="var(--accent)"
                bgColor="var(--accent-light)"
              />
              <KPICard
                label="Total Fund Volume"
                value={formatAED(totalVolume)}
                subValue="Total transaction throughput"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                  </svg>
                }
                color="var(--info)"
                bgColor="var(--info-light)"
              />
              <KPICard
                label="Inter-branch Transfers"
                value={transferCount}
                subValue="Internal liquidity moves"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                }
                color="var(--purple)"
                bgColor="var(--purple-light)"
              />
              <KPICard
                label="Pending Approvals"
                value={pendingCount}
                subValue="Awaiting authorization"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                }
                color="var(--warning)"
                bgColor="var(--warning-light)"
              />
            </>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 w-fit mb-4 flex-wrap sm:flex-nowrap">
          {([
            { key: 'all', label: 'All Transactions', count: tabCounts.all },
            ...branchLedgers.map(l => ({ key: l.name, label: l.name, count: tabCounts[l.name] || 0 })),
            { key: 'entities', label: 'Entities', count: tabCounts.entities },
          ]).map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black transition-colors ${
                activeTab === tab.key
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-slate-200/60 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-3 pb-4 px-4 md:border-b md:border-slate-100 md:px-5 md:py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
            <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">
              {activeTab === 'entities' ? 'Entities' : 'Transactions'}
            </h3>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2">
              <div className="relative w-full sm:w-44">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder={activeTab === 'entities' ? "Search entities..." : "Search txns..."}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={`${formInput} !py-2 !pl-10 !pr-4 !text-sm w-full`}
                />
              </div>
              
              {activeTab === 'entities' ? (
                <button
                  type="button"
                  className={`${btnPrimary} w-full sm:w-auto`}
                  onClick={() => setShowAddEntity(!showAddEntity)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" className="mr-1 inline-block">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  {showAddEntity ? 'Cancel' : 'Add Entity'}
                </button>
              ) : (
                <div className={`grid grid-cols-1 gap-2 w-full ${activeTab === 'all' ? 'min-[480px]:grid-cols-3' : 'min-[480px]:grid-cols-2'} sm:flex sm:w-auto sm:flex-row sm:gap-2`}>
                  {activeTab === 'all' && (
                    <SearchableSelect
                      options={typeFilters}
                      value={filter}
                      onChange={setFilter}
                      className="w-full sm:w-40"
                    />
                  )}
                  <SearchableSelect
                    options={branchOptions}
                    value={branchFilter}
                    onChange={setBranchFilter}
                    className="w-full sm:w-40"
                  />
                  <SearchableSelect
                    options={entityOptions}
                    value={entityFilter}
                    onChange={setEntityFilter}
                    className="w-full sm:w-40"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="p-0">
            {activeTab === 'entities' && showAddEntity && (
              <div className="bg-slate-50 p-4 border-b border-slate-100 animate-[fade-in-up_0.3s_ease_both]">
                <div className="max-w-2xl mx-auto space-y-4">
                  <h4 className="font-bold text-slate-800 text-sm">Create New Entity</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Name</label>
                      <input
                        type="text"
                        className={formInput}
                        value={newEntityName}
                        onChange={e => setNewEntityName(e.target.value)}
                        placeholder="e.g. John Doe"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Phone Number (Optional)</label>
                      <input
                        type="text"
                        className={formInput}
                        value={newEntityPhone}
                        onChange={e => setNewEntityPhone(e.target.value)}
                        placeholder="e.g. +971 50 123 4567"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() => {
                        setNewEntityName('');
                        setNewEntityPhone('');
                        setShowAddEntity(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={btnPrimary}
                      onClick={async () => {
                        if (!newEntityName.trim()) return;
                        setIsSubmittingEntity(true);
                        const newEntity = {
                          id: generateId('ENT'),
                          name: newEntityName.trim(),
                          phone: newEntityPhone.trim() || undefined,
                          branchId,
                          createdAt: new Date().toISOString()
                        };
                        const success = await addEntity(newEntity);
                        setIsSubmittingEntity(false);
                        if (success) {
                          setNewEntityName('');
                          setNewEntityPhone('');
                          setShowAddEntity(false);
                          showToast('Entity created successfully', 'success');
                        }
                      }}
                      disabled={!newEntityName.trim() || isSubmittingEntity}
                    >
                      {isSubmittingEntity ? 'Saving...' : 'Save Entity'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Desktop table ── */}
            <div className={`${tableWrap} hidden md:block`}>
              {activeTab === 'entities' ? (
                <table className={`${dataTable} min-w-[900px]`}>
                  <thead>
                    <tr>
                      <th className="group cursor-pointer select-none px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 sm:px-5" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1">
                          Name <SortIcon field="name" />
                        </div>
                      </th>
                      <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">
                        Phone
                      </th>
                      <th className="group cursor-pointer select-none px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 sm:px-5" onClick={() => handleSort('createdAt')}>
                        <div className="flex items-center gap-1">
                          Created At <SortIcon field="createdAt" />
                        </div>
                      </th>
                      <th className="px-3 pb-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntities.map((ent) => (
                      <tr
                        key={ent.id}
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => setSelectedEntity(ent)}
                        data-interactive-row
                      >
                        <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 text-sm font-semibold first:rounded-l-2xl sm:px-5 sm:py-4 text-slate-900">
                          {ent.name}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm sm:px-5 sm:py-4 text-slate-600">
                          {ent.phone || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm sm:px-5 sm:py-4 text-slate-500">
                          {ent.createdAt ? new Date(ent.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 last:rounded-r-2xl sm:px-5 sm:py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              title="Edit Entity"
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition-all duration-150 hover:border-accent hover:bg-accent/5 hover:text-accent active:scale-95 lg:gap-1 lg:px-2.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingEntity(ent);
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              <span className="hidden lg:inline text-xs font-bold">Edit</span>
                            </button>
                            <button
                              type="button"
                              title="Delete Entity"
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition-all duration-150 hover:border-red-400 hover:bg-red-50 hover:text-red-600 active:scale-95 lg:gap-1 lg:px-2.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingEntity(ent);
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4h6v2" />
                              </svg>
                              <span className="hidden lg:inline text-xs font-bold text-red-600">Delete</span>
                            </button>
                            <button
                              type="button"
                              title="View Transactions"
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition-all duration-150 hover:border-accent hover:bg-accent/5 hover:text-accent active:scale-95 lg:gap-1 lg:px-2.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEntity(ent);
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              <span className="hidden lg:inline text-xs font-bold">Transactions</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredEntities.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-sm text-slate-400">
                          No entities found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className={`${dataTable} min-w-[900px]`}>
                  <thead>
                    <tr>
                      <th className="group cursor-pointer select-none px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 sm:px-5" onClick={() => handleSort('date')}>
                        <div className="flex items-center gap-1">
                          Date &amp; Time <SortIcon field="date" />
                        </div>
                      </th>
                      <th className="group cursor-pointer select-none px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 sm:px-5" onClick={() => handleSort('from')}>
                        <div className="flex items-center gap-1">
                          From <SortIcon field="from" />
                        </div>
                      </th>
                      <th className="group cursor-pointer select-none px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 sm:px-5" onClick={() => handleSort('to')}>
                        <div className="flex items-center gap-1">
                          To <SortIcon field="to" />
                        </div>
                      </th>
                      <th className="group cursor-pointer select-none px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 sm:px-5" onClick={() => handleSort('assetType')}>
                        <div className="flex items-center gap-1">Asset <SortIcon field="assetType" /></div>
                      </th>
                      {isLedgerTab ? (
                        <>
                          <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Sent</th>
                          <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Received</th>
                        </>
                      ) : (
                        <th className="group cursor-pointer select-none px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 sm:px-5" onClick={() => handleSort('amount')}>
                          <div className="flex items-center gap-1">
                            Amount <SortIcon field="amount" />
                          </div>
                        </th>
                      )}
                      <th className="group cursor-pointer select-none px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 sm:px-5" onClick={() => handleSort('type')}>
                        <div className="flex items-center gap-1">
                          Type <SortIcon field="type" />
                        </div>
                      </th>
                      {isBranchView && branches.length === 1 && (
                        <th className="px-3 pb-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedTxns.map((t: Transaction) => (
                      <tr key={t.id} data-interactive-row>
                        <td className="w-[120px] whitespace-normal border-y border-l border-black/5 bg-white px-3 py-3.5 text-[11px] leading-tight text-slate-600 first:rounded-l-2xl sm:px-4 sm:py-3">
                          {formatDateTime(t.date).split(',').map((part, i) => (
                             <div key={i} className={i === 0 ? "font-semibold text-slate-900" : "mt-0.5"}>{part.trim()}</div>
                          ))}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-semibold sm:px-5 sm:py-4">{t.from}</td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-semibold sm:px-5 sm:py-4">{t.to}</td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-semibold sm:px-5 sm:py-4">
                          {t.assetType === 'gold' ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">Gold</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/10">AED</span>
                          )}
                        </td>
                        {isLedgerTab ? (
                          <>
                            <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold sm:px-5 sm:py-4 sm:text-base text-slate-900">
                              {t.from === activeTab ? formatTxnAmount(t) : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold sm:px-5 sm:py-4 sm:text-base text-slate-900">
                              {t.to === activeTab ? formatTxnAmount(t) : <span className="text-slate-300">—</span>}
                            </td>
                          </>
                        ) : (
                          <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold sm:px-5 sm:py-4 sm:text-base text-slate-900">
                            {formatTxnAmount(t)}
                          </td>
                        )}
                        <td className={`border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4${!(isBranchView && branches.length === 1 && (t.type === 'customer_account' || t.type === 'temporary_credit')) ? ' last:rounded-r-2xl border-r' : ''}`}>
                          <span className={badgeClass(t.type)}>{t.type.toUpperCase()}</span>
                        </td>
                        {isBranchView && branches.length === 1 && (
                          <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 last:rounded-r-2xl sm:px-4 sm:py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {(t.type === 'customer_account' || t.type === 'temporary_credit') && (
                                <button
                                  type="button"
                                  title="Edit transaction"
                                  onClick={() => setEditingTxn({ ...t })}
                                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition-all duration-150 hover:border-accent hover:bg-accent/5 hover:text-accent active:scale-95"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                              )}
                              <button
                                type="button"
                                title="Delete transaction"
                                onClick={() => setDeletingTxn(t)}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition-all duration-150 hover:border-red-400 hover:bg-red-50 hover:text-red-600 active:scale-95"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                  <path d="M9 6V4h6v2" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {filteredAndSortedTxns.length === 0 && (
                      <tr>
                        <td colSpan={txnTableColSpan} className="py-10 text-center text-sm text-slate-400">
                          No transactions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* ── Mobile card list ── */}
            <div className="flex md:hidden flex-col gap-3 py-4 px-4">
              {activeTab === 'entities' ? (
                filteredEntities.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">No entities found.</div>
                ) : (
                  filteredEntities.map((ent) => (
                    <div
                      key={ent.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] transition-all hover:shadow-md cursor-pointer active:scale-[0.99]"
                      onClick={() => setSelectedEntity(ent)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold text-slate-900">{ent.name}</span>
                          <span className="text-xs text-slate-500">{ent.phone || 'No phone'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {ent.createdAt ? new Date(ent.createdAt).toLocaleDateString() : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                        <button
                          type="button"
                          className="text-xs font-bold text-slate-500 hover:text-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingEntity(ent);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs font-bold text-red-500 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingEntity(ent);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                filteredAndSortedTxns.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">No transactions found.</div>
                ) : filteredAndSortedTxns.map((t: Transaction) => {
                  const isEditable = isBranchView && branches.length === 1 && (t.type === 'customer_account' || t.type === 'temporary_credit');
                  const isDeletable = true;
                  const entityName = t.category === 'debit' ? t.from : t.category === 'credit' ? t.to : null;
                  return (
                    <div key={t.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] transition-all">
                      {/* Top row: date + badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-800">
                            {formatDateTime(t.date).split(',')[0]}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatDateTime(t.date).split(',')[1]?.trim()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <span className={badgeClass(t.type)}>{t.type.replace('_', ' ').toUpperCase()}</span>
                        </div>
                      </div>

                      {/* Middle: entity route + amount */}
                      <div className="grid grid-cols-2 gap-3 border-y border-slate-50 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Entity</span>
                          <span className="text-sm font-semibold text-slate-800 truncate">
                            {entityName ?? `${t.from} → ${t.to}`}
                          </span>
                        </div>
                        {!isLedgerTab && (
                          <div className="flex flex-col gap-0.5 items-end">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount</span>
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {formatTxnAmount(t)}
                            </span>
                          </div>
                        )}
                      </div>

                      {isLedgerTab && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sent</span>
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {t.from === activeTab ? formatTxnAmount(t) : <span className="text-slate-300">—</span>}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 items-end">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Received</span>
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {t.to === activeTab ? formatTxnAmount(t) : <span className="text-slate-300">—</span>}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Bottom: notes + actions */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400 truncate flex-1">
                          {t.notes || <span className="italic">No notes</span>}
                        </span>
                        {isEditable && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              title="Edit"
                              onClick={() => setEditingTxn({ ...t })}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition-all hover:border-accent hover:bg-accent/5 hover:text-accent active:scale-95"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          </div>
                        )}
                        {isDeletable && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => setDeletingTxn(t)}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition-all hover:border-red-400 hover:bg-red-50 hover:text-red-600 active:scale-95"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4h6v2" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      </div>

      {isBranchView && branches.length === 1 ? (
        <BranchTransferModal
          open={showTransfer}
          onClose={() => setShowTransfer(false)}
          targetBranchId={branchId}
        />
      ) : (
        <TransferFundsModal
          open={showTransfer}
          onClose={() => setShowTransfer(false)}
          branches={branches}
          hqBalance={hqBalance}
          transferFunds={transferFunds}
          isBranchView={isBranchView}
        />
      )}

      {/* Delete Entity Modal */}
      {deletingEntity && (
        <Modal
          open={!!deletingEntity}
          onClose={() => setDeletingEntity(null)}
          title="Delete Entity"
          footer={
            <div className="flex w-full gap-3 sm:justify-end">
              <button 
                type="button" 
                className={`${btnSecondary} w-full sm:w-auto`} 
                onClick={() => setDeletingEntity(null)}
                disabled={isDeletingEntity}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className={`${btnPrimary} w-full sm:w-auto !bg-red-600 hover:!bg-red-700 !border-red-600 hover:!border-red-700 ring-red-200`}
                disabled={isDeletingEntity}
                onClick={async () => {
                  setIsDeletingEntity(true);
                  const success = await deleteEntity(deletingEntity.name, deletingEntity.id);
                  setIsDeletingEntity(false);
                  if (success) {
                    setDeletingEntity(null);
                  }
                }}
              >
                {isDeletingEntity ? 'Deleting...' : 'Delete Entity'}
              </button>
            </div>
          }
        >
          <div className="flex flex-col items-center justify-center p-4 text-center sm:p-6">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 ring-8 ring-red-50">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-900">Delete Entity</h3>
            <p className="text-sm text-slate-500">
              Are you sure you want to delete <strong className="font-semibold text-slate-900">{deletingEntity.name}</strong>? This action cannot be undone.
              An entity cannot be deleted if it is participating in any past transactions.
            </p>
          </div>
        </Modal>
      )}

      {/* Entity Transactions Drilldown Modal */}
      {selectedEntity && (
        <EntityTransactionsModal
          entity={selectedEntity}
          transactions={transactions}
          onClose={() => setSelectedEntity(null)}
          isBranchView={isBranchView}
          branches={branches}
          setEditingTxn={setEditingTxn}
          setDeletingTxn={setDeletingTxn}
        />
      )}

      {/* Edit Transaction Modal */}
      {editingTxn && isBranchView && branches.length === 1 && (
        <EditLedgerTransactionModal
          txn={editingTxn}
          branchId={branches[0].id}
          entities={entities}
          ledgers={ledgers}
          branchName={branches[0].name}
          isSaving={isSavingTxn}
          onClose={() => setEditingTxn(null)}
          onSave={async (updated) => {
            setIsSavingTxn(true);
            let deltaCash = 0;
            let deltaGold = 0;
            
            // Revert old impact
            if (editingTxn.assetType === 'gold') {
              if (editingTxn.category === 'debit') deltaGold += editingTxn.amount;
              else if (editingTxn.category === 'credit') deltaGold -= editingTxn.amount;
            } else {
              if (editingTxn.category === 'debit') deltaCash += editingTxn.amount;
              else if (editingTxn.category === 'credit') deltaCash -= editingTxn.amount;
            }
            
            // Apply new impact
            if (updated.assetType === 'gold') {
              if (updated.category === 'debit') deltaGold -= updated.amount;
              else if (updated.category === 'credit') deltaGold += updated.amount;
            } else {
              if (updated.category === 'debit') deltaCash -= updated.amount;
              else if (updated.category === 'credit') deltaCash += updated.amount;
            }

            const ok = await updateLedgerTransaction(
              updated,
              editingTxn.amount,
              editingTxn.category,
              deltaCash,
              deltaGold,
              branches[0].id
            );
            setIsSavingTxn(false);
            if (ok) setEditingTxn(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingTxn && isBranchView && branches.length === 1 && (
        <Modal
          open={!!deletingTxn}
          onClose={() => setDeletingTxn(null)}
          title="Delete Transaction"
          footer={
            <>
              <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={() => setDeletingTxn(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition-all hover:bg-red-700 active:scale-95 w-full sm:w-auto"
                onClick={async () => {
                  if (!deletingTxn) return;
                  setIsSavingTxn(true);
                  const ok = await deleteLedgerTransaction(
                    deletingTxn.id,
                    deletingTxn.amount,
                    deletingTxn.category,
                    deletingTxn.assetType,
                    deletingTxn.branchId || branches[0].id
                  );
                  setIsSavingTxn(false);
                  if (ok) setDeletingTxn(null);
                }}
                disabled={isSavingTxn}
              >
                {isSavingTxn ? 'Deleting...' : 'Delete'}
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-3 py-2">
            <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0 text-red-500">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-800">This action cannot be undone.</p>
                <p className="mt-1 text-sm text-red-700">
                  Deleting this transaction will reverse its effect on the branch balance.
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
              <dt className="text-slate-500">Type</dt>
              <dd className="font-semibold text-slate-800 capitalize">{deletingTxn.type.replace('_', ' ')}</dd>
              <dt className="text-slate-500">Amount</dt>
              <dd className="font-mono font-bold text-slate-800">{formatAED(deletingTxn.amount)}</dd>
              <dt className="text-slate-500">Category</dt>
              <dd className="font-semibold text-slate-800 capitalize">{deletingTxn.category || '—'}</dd>
              <dt className="text-slate-500">Entity</dt>
              <dd className="font-semibold text-slate-800">{deletingTxn.type === 'customer_account' ? (deletingTxn.category === 'debit' ? deletingTxn.from : deletingTxn.to) : (deletingTxn.category === 'debit' ? deletingTxn.from : deletingTxn.to)}</dd>
            </dl>
          </div>
        </Modal>
      )}

      {isBranchView && branches.length === 1 && (
        <Modal
          open={showEditInitialFund}
          onClose={() => setShowEditInitialFund(false)}
          title="Edit Initial Capital"
          footer={
            <>
              <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={() => setShowEditInitialFund(false)}>
                Cancel
              </button>
              <button 
                type="button" 
                className={`${btnPrimary} w-full sm:w-auto`} 
                disabled={isUpdatingFund}
                onClick={async () => {
                  const amt = parseFloat(editFundAmount);
                  const currentBalAmt = parseFloat(editCurrentBalanceAmount);
                  const goldAmt = parseFloat(editGoldFundAmount);
                  const currentGoldAmt = parseFloat(editCurrentGoldBalanceAmount);
                  if (isNaN(amt) || amt < 0) {
                    showToast('Please enter a valid initial capital amount', 'error');
                    return;
                  }
                  if (isNaN(goldAmt) || goldAmt < 0) {
                    showToast('Please enter a valid initial gold amount', 'error');
                    return;
                  }
                  setIsUpdatingFund(true);
                  const successCash = await updateBranchInitialFund(branches[0].id, amt, !isNaN(currentBalAmt) ? currentBalAmt : undefined);
                  const successGold = await updateBranchInitialGold(branches[0].id, goldAmt, !isNaN(currentGoldAmt) ? currentGoldAmt : undefined);
                  setIsUpdatingFund(false);
                  if (successCash && successGold) {
                    setShowEditInitialFund(false);
                  }
                }}
              >
                {isUpdatingFund ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div className={formGroup}>
              <label className={formLabel}>Initial Capital (AED)</label>
              <input 
                type="number" 
                className={formInput} 
                value={editFundAmount}
                onChange={(e) => setEditFundAmount(e.target.value)}
                placeholder="Enter initial capital"
                min="0"
                step="any"
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e') {
                    e.preventDefault();
                  }
                }}
              />
              <p className={formHint}>
                Changing this value will retroactively adjust the branch's initial capital, cash balance, and current balance, as well as HQ Treasury.
              </p>
            </div>
            
            <div className={formGroup}>
              <label className={formLabel}>Available Capital Override (AED)</label>
              <input 
                type="number" 
                className={formInput} 
                value={editCurrentBalanceAmount}
                onChange={(e) => setEditCurrentBalanceAmount(e.target.value)}
                placeholder="Leave blank to calculate automatically"
                step="any"
              />
              <p className={formHint}>
                Optional: Manually override the current available cash balance. Leave empty to let the system calculate it.
              </p>
            </div>
            
            <hr className="my-2 border-slate-200" />
            
            <div className={formGroup}>
              <label className={formLabel}>Initial Gold Volume (g)</label>
              <input 
                type="number" 
                className={formInput} 
                value={editGoldFundAmount}
                onChange={(e) => setEditGoldFundAmount(e.target.value)}
                placeholder="Enter initial gold volume"
                min="0"
                step="any"
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e') {
                    e.preventDefault();
                  }
                }}
              />
            </div>
            
            <div className={formGroup}>
              <label className={formLabel}>Available Gold Override (g)</label>
              <input 
                type="number" 
                className={formInput} 
                value={editCurrentGoldBalanceAmount}
                onChange={(e) => setEditCurrentGoldBalanceAmount(e.target.value)}
                placeholder="Leave blank to calculate automatically"
                step="any"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Treasury Balance Modal */}
      {!isBranchView && (
        <Modal
          open={showEditHqBalance}
          onClose={() => setShowEditHqBalance(false)}
          title="Edit Treasury Balance"
          footer={
            <>
              <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={() => setShowEditHqBalance(false)}>
                Cancel
              </button>
              <button 
                type="button" 
                className={`${btnPrimary} w-full sm:w-auto`} 
                disabled={isUpdatingHqBalance}
                onClick={async () => {
                  const amt = parseFloat(editHqBalanceAmount);
                  if (isNaN(amt) || amt < 0) {
                    showToast('Please enter a valid amount', 'error');
                    return;
                  }
                  setIsUpdatingHqBalance(true);
                  const success = await updateHqBalance(amt);
                  setIsUpdatingHqBalance(false);
                  if (success) {
                    setShowEditHqBalance(false);
                  }
                }}
              >
                {isUpdatingHqBalance ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className={formGroup}>
            <label className={formLabel}>Treasury Balance (AED)</label>
            <input 
              type="number" 
              className={formInput} 
              value={editHqBalanceAmount}
              onChange={(e) => setEditHqBalanceAmount(e.target.value)}
              placeholder="Enter new treasury balance"
              min="0"
              step="any"
              onKeyDown={(e) => {
                if (e.key === '-' || e.key === 'e') {
                  e.preventDefault();
                }
              }}
            />
            <p className={formHint}>
              Changing this value will forcibly adjust the HQ global capital treasury.
            </p>
          </div>
        </Modal>
      )}

      {/* Edit Entity Modal */}
      {editingEntity && (
        <EditEntityModal
          entity={editingEntity}
          isSaving={isSavingEntity}
          onClose={() => setEditingEntity(null)}
          onSave={async (updated) => {
            setIsSavingEntity(true);
            const ok = await updateEntity(updated);
            setIsSavingEntity(false);
            if (ok) setEditingEntity(null);
          }}
        />
      )}
      {/* Manage Ledgers Modal */}
      <Modal
        open={showManageLedgers}
        onClose={() => setShowManageLedgers(false)}
        title="Manage Branch Ledgers"
        footer={
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={() => setShowManageLedgers(false)}>
            Done
          </button>
        }
      >
        <div className="flex flex-col gap-6 py-2">
          {/* Create new ledger form */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-800">Create New Ledger</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Name</label>
                <input
                  type="text"
                  className={formInput}
                  value={newLedgerName}
                  onChange={e => setNewLedgerName(e.target.value)}
                  placeholder="e.g. Marketing Expense"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Impact on Cash</label>
                <select className={formSelect} value={newLedgerImpact} onChange={e => setNewLedgerImpact(e.target.value as any)}>
                  <option value="positive">Positive (+)</option>
                  <option value="negative">Negative (-)</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Show as KPI</label>
                <select className={formSelect} value={newLedgerIsKpi ? 'yes' : 'no'} onChange={e => setNewLedgerIsKpi(e.target.value === 'yes')}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 justify-end">
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={isSavingLedger || !newLedgerName.trim()}
                  onClick={async () => {
                    setIsSavingLedger(true);
                    const ok = await addLedger({
                      id: generateId('LDG'),
                      branchId: branchId || '',
                      name: newLedgerName.trim(),
                      impact: newLedgerImpact,
                      isKpi: newLedgerIsKpi
                    });
                    if (ok) {
                      setNewLedgerName('');
                      setNewLedgerImpact('neutral');
                      setNewLedgerIsKpi(true);
                    }
                    setIsSavingLedger(false);
                  }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>

          {/* List of ledgers */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-slate-800">Existing Ledgers</h3>
            {branchLedgers.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No ledgers created yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {branchLedgers.map((l, index) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
                    {editingLedger?.id === l.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          className={`${formInput} flex-1 text-sm`}
                          value={editingLedger.name}
                          onChange={e => setEditingLedger({ ...editingLedger, name: e.target.value })}
                        />
                        <select
                          className={`${formSelect} w-32 text-sm`}
                          value={editingLedger.impact}
                          onChange={e => setEditingLedger({ ...editingLedger, impact: e.target.value as any })}
                        >
                          <option value="positive">Positive</option>
                          <option value="negative">Negative</option>
                          <option value="neutral">Neutral</option>
                        </select>
                        <select
                          className={`${formSelect} w-24 text-sm`}
                          value={editingLedger.isKpi ? 'yes' : 'no'}
                          onChange={e => setEditingLedger({ ...editingLedger, isKpi: e.target.value === 'yes' })}
                        >
                          <option value="yes">KPI</option>
                          <option value="no">Hidden</option>
                        </select>
                        <button
                          type="button"
                          className="px-2 py-1 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800"
                          onClick={async () => {
                            await updateLedger(editingLedger);
                            setEditingLedger(null);
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 text-xs font-semibold text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                          onClick={() => setEditingLedger(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 text-sm">{l.name}</span>
                          <span className="text-xs text-slate-500 capitalize">Impact: {l.impact} | {l.isKpi ? 'KPI visible' : 'Hidden'}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-col mr-2">
                            <button
                              type="button"
                              title="Move Up"
                              disabled={index === 0}
                              className="text-slate-400 hover:text-slate-700 disabled:opacity-30 p-0.5"
                              onClick={async () => {
                                const newLedgers = [...branchLedgers];
                                const temp = newLedgers[index];
                                newLedgers[index] = newLedgers[index - 1];
                                newLedgers[index - 1] = temp;
                                
                                for (let i = 0; i < newLedgers.length; i++) {
                                  if (newLedgers[i].sortOrder !== i) {
                                    await updateLedger({ ...newLedgers[i], sortOrder: i });
                                  }
                                }
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                            </button>
                            <button
                              type="button"
                              title="Move Down"
                              disabled={index === branchLedgers.length - 1}
                              className="text-slate-400 hover:text-slate-700 disabled:opacity-30 p-0.5"
                              onClick={async () => {
                                const newLedgers = [...branchLedgers];
                                const temp = newLedgers[index];
                                newLedgers[index] = newLedgers[index + 1];
                                newLedgers[index + 1] = temp;
                                
                                for (let i = 0; i < newLedgers.length; i++) {
                                  if (newLedgers[i].sortOrder !== i) {
                                    await updateLedger({ ...newLedgers[i], sortOrder: i });
                                  }
                                }
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                            </button>
                          </div>
                          <button
                            type="button"
                            className="text-xs font-semibold text-accent hover:underline"
                            onClick={() => setEditingLedger(l)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-xs font-semibold text-red-600 hover:underline"
                            onClick={async () => {
                              if (confirm(`Are you sure you want to delete the ledger "${l.name}"?`)) {
                                await deleteLedger(l.id, l.name);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

function EditEntityModal({
  entity,
  isSaving,
  onClose,
  onSave,
}: {
  entity: import('@/types').Entity;
  isSaving: boolean;
  onClose: () => void;
  onSave: (updated: import('@/types').Entity) => void;
}) {
  const [name, setName] = useState(entity.name);
  const [phone, setPhone] = useState(entity.phone || '');
  const [error, setError] = useState('');

  const handleSave = () => {
    setError('');
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    onSave({
      ...entity,
      name: name.trim(),
      phone: phone.trim() || undefined,
    });
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Edit Entity"
      footer={
        <>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className={formRow}>
          <div className={formGroup}>
            <label className={formLabel}>Name</label>
            <input
              type="text"
              className={formInput}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. John Doe"
            />
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Phone Number (Optional)</label>
            <input
              type="text"
              className={formInput}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. +971 50 123 4567"
            />
          </div>
        </div>
        {error && <p className={`${formError} mt-1`}>{error}</p>}
      </div>
    </Modal>
  );
}

function TransferFundsModal({
  open,
  onClose,
  branches,
  hqBalance,
  transferFunds,
  isBranchView,
}: {
  open: boolean;
  onClose: () => void;
  branches: Branch[];
  hqBalance: number;
  transferFunds: (fromId: string, toId: string, amount: number, notes: string) => void;
  isBranchView?: boolean;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (open && isBranchView && branches.length === 1) {
      setFrom(branches[0].id);
    } else if (!open) {
      setFrom('');
    }
  }, [open, isBranchView, branches]);

  const fromBranch = branches.find((b: Branch) => b.id === from);
  const isHqTransfer = from === 'HQ_TREASURY';
  const availableBalance = isHqTransfer ? hqBalance : fromBranch?.currentBalance || 0;

  const handleSubmit = () => {
    setError('');
    if (!from || !to || !amount) {
      setError('All fields are required');
      return;
    }
    if (from === to) {
      setError('Cannot transfer to the same branch');
      return;
    }
    const amt = Number(amount);
    if (amt > availableBalance) {
      setError(`Insufficient balance. Available: ${formatAEDStr(availableBalance)}`);
      return;
    }
    if (amt <= 0) {
      setError('Amount must be greater than zero');
      return;
    }

    transferFunds(from, to, amt, notes);
    setFrom('');
    setTo('');
    setAmount('');
    setNotes('');
    setError('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Execute Capital Movement"
      footer={
        <>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={handleSubmit}>
            Confirm Transfer
          </button>
        </>
      }
    >
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Source Account</label>
          {isBranchView ? (
            <input className={formInput} value={branches[0]?.name || ''} disabled />
          ) : (
            <select className={formSelect} value={from} onChange={e => setFrom(e.target.value)}>
              <option value="">Select source</option>
              <optgroup label="Central Treasury">
                <option value="HQ_TREASURY">HQ Treasury — {formatAEDStr(hqBalance)}</option>
              </optgroup>
              <optgroup label="Branch Balances">
                {branches.map((b: Branch) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
            </select>
          )}
          {from ? <p className={formHint}>Available: {formatAED(availableBalance)}</p> : null}
        </div>
        <div className={formGroup}>
          <label className={formLabel}>Recipient Branch</label>
          <select className={formSelect} value={to} onChange={e => setTo(e.target.value)}>
            <option value="">Select destination</option>
            {branches
              .filter((b: Branch) => b.id !== from)
              .map((b: Branch) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </div>
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Amount (AED)</label>
        <input 
          className={formInput} 
          type="number" 
          placeholder="0.00" 
          value={amount} 
          min="0.01"
          step="any"
          onChange={e => setAmount(e.target.value)} 
          onKeyDown={(e) => {
            if (e.key === '-' || e.key === 'e') {
              e.preventDefault();
            }
          }}
        />
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Reference Notes</label>
        <textarea className={formTextarea} placeholder="Describe the purpose of this transfer..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
      </div>
      {error ? <p className={`${formError} mb-4`}>{error}</p> : null}
    </Modal>
  );
}

function EditLedgerTransactionModal({
  txn,
  branchId,
  entities,
  ledgers,
  branchName,
  isSaving,
  onClose,
  onSave,
}: {
  txn: Transaction;
  branchId: string;
  entities: import('@/types').Entity[];
  ledgers: import('@/types').Ledger[];
  branchName: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (updated: Transaction) => void;
}) {
  const isDebit = txn.category === 'debit';
  const initialEntity = isDebit ? txn.from : txn.to;

  const [entityName, setEntityName] = useState(initialEntity);
  const [amount, setAmount] = useState(txn.amount.toString());
  const [category, setCategory] = useState<'debit' | 'credit'>(isDebit ? 'debit' : 'credit');
  const [notes, setNotes] = useState(txn.notes || '');
  const [status, setStatus] = useState<'completed' | 'pending'>(txn.status === 'pending' ? 'pending' : 'completed');
  const [error, setError] = useState('');

  const branchEntities = entities.filter(e => !e.branchId || e.branchId === branchId);
  const branchLedgers = ledgers.filter(l => !l.branchId || l.branchId === branchId);

  const handleSave = () => {
    setError('');
    const amt = parseFloat(amount);
    if (!entityName.trim()) { setError('Entity name is required.'); return; }
    if (isNaN(amt) || amt <= 0) { setError('Amount must be a positive number.'); return; }

    const updated: Transaction = {
      ...txn,
      from: category === 'debit' ? entityName.trim() : branchName,
      to: category === 'debit' ? branchName : entityName.trim(),
      amount: amt,
      category: (() => {
        const amtDiff = category === 'debit' ? amt : -amt;
        const fromLedger = branchLedgers.find(l => l.name === (category === 'debit' ? entityName.trim() : branchName));
        const toLedger = branchLedgers.find(l => l.name === (category === 'debit' ? branchName : entityName.trim()));
        if (fromLedger) return fromLedger.impact === 'positive' ? 'credit' : fromLedger.impact === 'negative' ? 'debit' : 'neutral';
        if (toLedger) return toLedger.impact === 'positive' ? 'debit' : toLedger.impact === 'negative' ? 'credit' : 'neutral';
        return category; // fallback to selected
      })(),
      notes: notes.trim(),
      status,
    };
    onSave(updated);
  };

  const txnTypeLabel = txn.type === 'customer_account' ? 'Customer Account' : 'Temporary Credit';

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Edit ${txnTypeLabel} Transaction`}
      footer={
        <>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className={formGroup}>
          <label className={formLabel}>
            {txn.type === 'customer_account' ? 'Customer / Entity' : 'Creditor / Entity'}
          </label>
          <select
            className={formSelect}
            value={entityName}
            onChange={e => setEntityName(e.target.value)}
          >
            <option value="">Select entity</option>
            {branchEntities.map(e => (
              <option key={e.id} value={e.name}>{e.name}</option>
            ))}
            {entityName && !branchEntities.some(e => e.name === entityName) && (
              <option value={entityName}>{entityName}</option>
            )}
          </select>
          <p className={formHint}>Select the external party for this transaction.</p>
        </div>

        <div className={formRow}>
          <div className={formGroup}>
            <label className={formLabel}>Amount (AED)</label>
            <input
              type="number"
              className={formInput}
              value={amount}
              min="0.01"
              step="0.01"
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              onKeyDown={(e) => {
                if (e.key === '-' || e.key === 'e') {
                  e.preventDefault();
                }
              }}
            />
          </div>

          <div className={formGroup}>
            <label className={formLabel}>Direction</label>
            <select className={formSelect} value={category} onChange={e => setCategory(e.target.value as 'debit' | 'credit')}>
              <option value="debit">Debit (Entity → Branch)</option>
              <option value="credit">Credit (Branch → Entity)</option>
            </select>
            <p className={formHint}>
              {category === 'debit'
                ? 'Cash flows in: increases branch locker.'
                : 'Cash flows out: decreases branch locker.'}
            </p>
          </div>
        </div>

        <div className={formGroup}>
          <label className={formLabel}>Status</label>
          <select className={formSelect} value={status} onChange={e => setStatus(e.target.value as 'completed' | 'pending')}>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className={formGroup}>
          <label className={formLabel}>Notes</label>
          <textarea
            className={formTextarea}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional notes..."
          />
        </div>

        {error && <p className={`${formError} mt-1`}>{error}</p>}
      </div>
    </Modal>
  );
}

function EntityTransactionsModal({
  entity,
  transactions,
  onClose,
  isBranchView,
  branches,
  setEditingTxn,
  setDeletingTxn,
}: {
  entity: import('@/types').Entity;
  transactions: import('@/types').Transaction[];
  onClose: () => void;
  isBranchView: boolean;
  branches: import('@/types').Branch[];
  setEditingTxn: (txn: import('@/types').Transaction | null) => void;
  setDeletingTxn: (txn: import('@/types').Transaction | null) => void;
}) {
  const entityTxns = React.useMemo(() => {
    return transactions.filter(t => t.from === entity.name || t.to === entity.name)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, entity.name]);

  const formatTxnAmount = (t: import('@/types').Transaction) =>
    t.assetType === 'gold' ? `${t.amount.toFixed(2)}g` : formatAED(t.amount);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-white/30 backdrop-blur-sm transition-[opacity,visibility] duration-300 ease-out sm:items-center sm:p-4 visible opacity-100"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="flex max-h-[min(90dvh,100%)] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-slate-200/90 bg-white shadow-modal transition-[transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:max-h-[90vh] sm:rounded-[1.75rem] translate-y-0 scale-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
          <h3 id="modal-title" className="text-base font-bold text-slate-900">
            {entity.name} — Transactions History
          </h3>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-full bg-slate-200 text-base text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
          
          {/* Desktop view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">From</th>
                  <th className="py-3 px-4">To</th>
                  <th className="py-3 px-4">Asset</th>
                  <th className="py-3 px-4">Sent</th>
                  <th className="py-3 px-4">Received</th>
                  <th className="py-3 px-4">Type</th>
                  {isBranchView && branches.length === 1 && (
                    <th className="py-3 px-4 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                {entityTxns.length === 0 ? (
                  <tr>
                    <td colSpan={isBranchView && branches.length === 1 ? 8 : 7} className="py-8 text-center text-slate-400">
                      No transactions found for this entity.
                    </td>
                  </tr>
                ) : (
                  entityTxns.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 text-[11px] leading-tight text-slate-600">
                        {formatDateTime(t.date).split(',').map((part, i) => (
                           <div key={i} className={i === 0 ? "font-semibold text-slate-900" : "mt-0.5"}>{part.trim()}</div>
                        ))}
                      </td>
                      <td className="py-3.5 px-4 font-semibold">{t.from}</td>
                      <td className="py-3.5 px-4 font-semibold">{t.to}</td>
                      <td className="py-3.5 px-4 text-[11px] font-semibold">
                        {t.assetType === 'gold' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">Gold</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/10">AED</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {t.to === entity.name ? formatTxnAmount(t) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {t.from === entity.name ? formatTxnAmount(t) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={badgeClass(t.type)}>{t.type.toUpperCase()}</span>
                      </td>
                      {isBranchView && branches.length === 1 && (
                        <td className="py-3.5 px-4 text-right">
                          {(t.type === 'customer_account' || t.type === 'temporary_credit') ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                title="Edit transaction"
                                onClick={() => {
                                  onClose();
                                  setEditingTxn({ ...t });
                                }}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1 text-slate-500 shadow-sm transition-all hover:border-accent hover:bg-accent/5 hover:text-accent active:scale-95"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                title="Delete transaction"
                                onClick={() => {
                                  onClose();
                                  setDeletingTxn(t);
                                }}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1 text-slate-500 shadow-sm transition-all hover:border-red-400 hover:bg-red-50 hover:text-red-600 active:scale-95"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                  <path d="M9 6V4h6v2" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile view */}
          <div className="flex md:hidden flex-col gap-3">
            {entityTxns.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">No transactions found.</div>
            ) : (
              entityTxns.map((t) => {
                const isEditable = isBranchView && branches.length === 1 && (t.type === 'customer_account' || t.type === 'temporary_credit');
                return (
                  <div key={t.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-800">
                          {formatDateTime(t.date).split(',')[0]}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDateTime(t.date).split(',')[1]?.trim()}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={badgeClass(t.type)}>{t.type.replace('_', ' ').toUpperCase()}</span>
                        {t.assetType === 'gold' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">Gold</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/10">AED</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-y border-slate-50 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Route</span>
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {t.from} &rarr; {t.to}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sent</span>
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {t.to === entity.name ? formatTxnAmount(t) : <span className="text-slate-300">—</span>}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 items-end">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Received</span>
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {t.from === entity.name ? formatTxnAmount(t) : <span className="text-slate-300">—</span>}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[11px] text-slate-400 truncate flex-1">
                        {t.notes || <span className="italic">No notes</span>}
                      </span>
                      {isEditable && (
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              setEditingTxn({ ...t });
                            }}
                            className="p-1 border border-slate-200 rounded text-slate-500 hover:text-accent hover:border-accent"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              setDeletingTxn(t);
                            }}
                            className="p-1 border border-slate-200 rounded text-slate-500 hover:text-red-600 hover:border-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
        <div className="sticky bottom-0 z-10 flex justify-end border-t border-slate-100 bg-slate-50/90 p-4">
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
