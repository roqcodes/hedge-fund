'use client';
import React, { useState } from 'react';
import KPICard from '@/components/ui/KPICard';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { formatAED, formatAEDStr, formatDateTime, generateId } from '@/data/mockData';
import { formatBranchDateTime } from '@/lib/businessTime';
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
import EditTransactionModal from './EditTransactionModal';
import SearchableSelect from '@/components/ui/SearchableSelect';
import TagMultiSelect from '@/components/ui/TagMultiSelect';
import { useDateFilter } from '@/hooks/useDateFilter';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { getTransactionTagNames, transactionHasAnyTag } from '@/lib/transactionTags';
import { TransactionNotesCell } from '@/components/funds/TransactionNotesCell';
import TransactionEnteredByAvatar from '@/components/funds/TransactionEnteredByAvatar';
import { TransactionTagsCell } from '@/components/funds/TransactionTagsCell';
import TransactionsBackupModal from '@/components/funds/TransactionsBackupModal';
import EntityTransactionsModal from '@/components/funds/EntityTransactionsModal';
import LedgerTabSummaryBar from '@/components/funds/LedgerTabSummaryBar';
import LedgerSettingsModal from '@/components/funds/LedgerSettingsModal';
import { useLedgerKpiInvert } from '@/hooks/useLedgerKpiInvert';
import TransactionBetaHeader from '@/components/funds/transaction-beta/TransactionBetaHeader';
import TransactionBetaShell from '@/components/funds/transaction-beta/TransactionBetaShell';
import { useTransactionBetaPage } from '@/hooks/useTransactionBetaPage';
import { txnTd, txnTdBy, txnTdFromTo, txnTdNotes, txnTh, txnThBy, txnThSortable } from '@/lib/transactionTableStyles';
import { accountNameUsedInTransactions } from '@/lib/accountTransactions';
import {
  filterBranchLedgers,
  calculateLedgerBalances,
  calculateCashInLocker,
  calculateAvailableBranchFund,
  calculateAvailableBranchGold,
  getLedgerKpiSubValue,
  getLedgerTabColumns,
  isLedgerTabOutAmount,
  isLedgerTabInAmount,
  computeLedgerTabTotals,
} from '@/lib/ledgers';

export default function FundManagement({ variant = 'default' }: { variant?: 'default' | 'beta' }) {
  const isBeta = variant === 'beta';
  const { branches, transactions, transferFunds, hqBalance, isBranchView, currentSlug, updateBranchInitialFund, updateBranchInitialGold, updateHqBalance, showToast, refetchData, entities, addEntity, updateEntity, deleteEntity, processLedgerTransaction, updateTransactionMeta, deleteLedgerTransaction, ledgers, addLedger, updateLedger, deleteLedger, transactionTags, addTransactionTag } = useApp();
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
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [deletingTxn, setDeletingTxn] = useState<Transaction | null>(null);
  const txnTableRef = React.useRef<HTMLDivElement>(null);
  const [isSavingTxn, setIsSavingTxn] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'entities' | string>('all');
  const [showBackupModal, setShowBackupModal] = useState(false);

  // Ledger state
  const [showManageLedgers, setShowManageLedgers] = useState(false);
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

  const betaPage = useTransactionBetaPage({
    enabled: isBeta,
    transactions,
    branches,
    ledgers,
    currentSlug,
    isBranchView,
    refetchData,
  });

  const displayTransactions = isBeta
    ? betaPage.displayTransactions
    : filteredTransactions;

  const totalVolume = displayTransactions.reduce((acc: number, t: Transaction) => acc + t.amount, 0);
  const transferCount = displayTransactions.filter((t: Transaction) => t.type === 'transfer').length;
  const pendingCount = displayTransactions.filter((t: Transaction) => t.status === 'pending').length;

  const branchLedgers = React.useMemo(() => {
    return filterBranchLedgers(ledgers, branchId);
  }, [ledgers, branchId]);

  const { displayAmount: displayLedgerKpiAmount } = useLedgerKpiInvert(branchLedgers);

  const branchTags = React.useMemo(
    () => transactionTags.filter(t => !t.branchId || t.branchId === branchId),
    [transactionTags, branchId],
  );

  const tagFilterNames = React.useMemo(
    () =>
      tagFilter
        .map(id => branchTags.find(t => t.id === id)?.name)
        .filter((n): n is string => !!n),
    [tagFilter, branchTags],
  );

  const isLedgerTab = activeTab !== 'all' && activeTab !== 'entities';
  const showLedgerSummaryBar = isLedgerTab;
  const ledgerTabColumns = React.useMemo(
    () => (isLedgerTab ? getLedgerTabColumns(activeTab) : null),
    [isLedgerTab, activeTab],
  );
  const formatTxnAmount = (t: Transaction) =>
    t.assetType === 'gold' ? `${t.amount.toFixed(2)}g` : formatAED(t.amount);
  const txnTableColSpan = (isBranchView && branches.length === 1 ? 9 : 8) + (isLedgerTab ? 1 : 0);

  // Calculate Ledger Balances
  const ledgerBalances = React.useMemo(() => {
    return calculateLedgerBalances(branchLedgers, displayTransactions);
  }, [displayTransactions, branchLedgers]);

  const availableBranchFund = React.useMemo(() => {
    if (branches.length !== 1) return 0;
    return calculateAvailableBranchFund(
      branches[0].name,
      branches[0].openingBalance || 0,
      displayTransactions,
    );
  }, [branches, displayTransactions]);

  const branchGoldVolume = React.useMemo(() => {
    if (branches.length !== 1) return 0;
    return calculateAvailableBranchGold(
      branches[0].name,
      branches[0].openingGoldBalance || 0,
      displayTransactions,
    );
  }, [branches, displayTransactions]);

  const totalCashInLocker = React.useMemo(() => {
    return calculateCashInLocker(availableBranchFund, branchLedgers, ledgerBalances);
  }, [availableBranchFund, branchLedgers, ledgerBalances]);

  const tabCounts = React.useMemo(() => {
    const src = displayTransactions || [];
    const branchEntitiesCount = entities.filter(e => !branchId || e.branchId === branchId).length;
    
    const counts: Record<string, number> = {
      all: src.length,
      entities: branchEntitiesCount,
    };
    
    branchLedgers.forEach(l => {
      counts[l.name] = src.filter(t => t.type === l.name || t.from === l.name || t.to === l.name).length;
    });
    return counts;
  }, [displayTransactions, entities, branchId, branchLedgers]);

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
    let result = displayTransactions.filter((t: Transaction) => {
      // Isolate to the specific branch
      if (branchId && t.branchId !== branchId) return false;

      if (activeTab !== 'all') {
        const isMatch = t.type === activeTab || t.from === activeTab || t.to === activeTab;
        if (!isMatch) return false;
      }
      if (activeTab === 'all' && tagFilterNames.length > 0) {
        if (!transactionHasAnyTag(t, tagFilterNames)) return false;
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
          (t.notes || '').toLowerCase().includes(query) ||
          t.status.toLowerCase().includes(query) ||
          getTransactionTagNames(t).some(tag => tag.toLowerCase().includes(query))
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
  }, [displayTransactions, tagFilterNames, branchFilter, entityFilter, searchTerm, sortField, sortDirection, activeTab, branchId]);

  const canEditTxn = (t: Transaction) => {
    if (!isBranchView || branches.length !== 1) return false;
    if (isBeta) return betaPage.permissions.canEditEntry(t);
    return true;
  };

  const canPostTransactions = isBeta ? betaPage.permissions.canPostEntries : true;

  const formatTxnDateTime = (date: string) =>
    isBeta ? formatBranchDateTime(date, betaPage.branchTimezone) : formatDateTime(date);

  const ledgerTabTotals = React.useMemo(
    () => (showLedgerSummaryBar ? computeLedgerTabTotals(filteredAndSortedTxns, activeTab) : null),
    [showLedgerSummaryBar, filteredAndSortedTxns, activeTab],
  );

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

  const branchOptions = [
    { value: 'all', label: 'All Branches' },
    ...branches.map((b: Branch) => ({ value: b.name, label: b.name }))
  ];

  const entityOptions = [
    { value: 'all', label: 'All Entities' },
    ...entities.map(e => ({ value: e.name, label: e.name }))
  ];

  const handleCreateTag = async (name: string) => {
    if (!branchId) return null;
    return addTransactionTag({
      id: generateId('TAG'),
      name: name.trim(),
      branchId,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <>
      <div className={`animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]${showLedgerSummaryBar ? ' pb-24' : ''}`}>
        {isBeta ? (
          <TransactionBetaHeader
            branchName={branchName}
            branchTimezone={betaPage.branchTimezone}
            canPostEntries={canPostTransactions}
            onPostEntry={() => setShowTransfer(true)}
            onEditCapital={() => {
              const b = branches[0];
              setEditFundAmount(b.openingBalance?.toString() || '0');
              setEditCurrentBalanceAmount(b.currentBalance?.toString() || '0');
              setEditGoldFundAmount(b.openingGoldBalance?.toString() || '0');
              setEditCurrentGoldBalanceAmount(b.goldBalance?.toString() || '0');
              setShowEditInitialFund(true);
            }}
            onBackup={() => setShowBackupModal(true)}
            onManageLedgers={() => setShowManageLedgers(true)}
          />
        ) : (
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
            <button
              type="button"
              className={`${btnSecondary} w-full sm:w-auto`}
              onClick={() => setShowBackupModal(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Backup
            </button>
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
            <button
              type="button"
              className={`${btnPrimary} w-full sm:w-auto`}
              onClick={() => setShowTransfer(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Execute Transfer
            </button>
          </div>
        </div>
        )}

        {isBeta && betaPage.sessionLoading && !betaPage.session ? (
          <div className="mb-5 rounded-2xl border border-slate-100 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-surface-xs">
            Loading business day session…
          </div>
        ) : null}

        {isBeta && betaPage.session && betaPage.branchId ? (
          <TransactionBetaShell
            branchId={betaPage.branchId}
            branchSlug={betaPage.branchSlug}
            branchTimezone={betaPage.branchTimezone}
            session={betaPage.session}
            sessionLoading={betaPage.sessionLoading}
            sessionError={betaPage.sessionError}
            viewStartDate={betaPage.viewStartDate}
            viewEndDate={betaPage.viewEndDate}
            isAllTime={betaPage.isAllTime}
            periodKpis={betaPage.periodKpis}
            branchLedgers={betaPage.branchLedgers}
            onViewApply={betaPage.setViewDates}
            onDayClosed={betaPage.handleDayClosed}
            showToast={showToast}
          />
        ) : null}

        {!isBeta && (
        <DateFilterBar
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
        />
        )}

        {!isBeta && (
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
                  value={formatAED(displayLedgerKpiAmount(ledger.id, ledgerBalances[ledger.id] || 0))}
                  subValue={getLedgerKpiSubValue(ledger)}
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
                subValue="Physical cash after receivables & customer deposits"
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
        )}

        {isBeta && (
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Journal entries</p>
        )}

        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 w-fit mb-4 flex-wrap sm:flex-nowrap">
          {([
            { key: 'all', value: 'all', label: 'All Transactions', count: tabCounts.all },
            ...branchLedgers.map(l => ({ key: l.id, value: l.name, label: l.name, count: tabCounts[l.name] || 0 })),
            { key: 'entities', value: 'entities', label: 'Entities', count: tabCounts.entities },
          ]).map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === tab.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black transition-colors ${
                activeTab === tab.value
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-slate-200/60 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {ledgerTabColumns?.hint ? (
          <p className="mb-4 max-w-3xl text-xs leading-relaxed text-slate-500 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            {ledgerTabColumns.hint}
          </p>
        ) : null}

        <div
          ref={showLedgerSummaryBar ? txnTableRef : undefined}
          className="md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover"
        >
          <div className="flex flex-col gap-3 pb-4 px-4 md:border-b md:border-slate-100 md:px-5 md:py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
            <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">
              {activeTab === 'entities' ? 'Entities' : isBeta ? 'General journal' : 'Transactions'}
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
                    <TagMultiSelect
                      tags={branchTags}
                      selectedIds={tagFilter}
                      onChange={setTagFilter}
                      onCreateTag={async () => null}
                      placeholder="Filter by tags..."
                      compact
                      allowCreate={false}
                      className="w-full sm:w-44"
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
                <table className={`${dataTable} min-w-[860px]`}>
                  <thead>
                    <tr>
                      <th className={`${txnThSortable}`} onClick={() => handleSort('date')}>
                        <div className="flex items-center gap-1">
                          Date &amp; Time <SortIcon field="date" />
                        </div>
                      </th>
                      <th className={txnThSortable} onClick={() => handleSort('from')}>
                        <div className="flex items-center gap-1">
                          From <SortIcon field="from" />
                        </div>
                      </th>
                      <th className={txnThSortable} onClick={() => handleSort('to')}>
                        <div className="flex items-center gap-1">
                          To <SortIcon field="to" />
                        </div>
                      </th>
                      <th className={`${txnThSortable} min-w-0`} onClick={() => handleSort('notes')}>
                        <div className="flex items-center gap-1">
                          Notes <SortIcon field="notes" />
                        </div>
                      </th>
                      {isLedgerTab ? (
                        <>
                          <th className={txnTh}>{ledgerTabColumns?.outLabel ?? 'Sent'}</th>
                          <th className={txnTh}>{ledgerTabColumns?.inLabel ?? 'Received'}</th>
                        </>
                      ) : (
                        <th className={txnThSortable} onClick={() => handleSort('amount')}>
                          <div className="flex items-center gap-1">
                            Amount <SortIcon field="amount" />
                          </div>
                        </th>
                      )}
                      <th className={txnTh}>Tags</th>
                      <th className={txnThBy}>By</th>
                      {isBranchView && branches.length === 1 && (
                        <th className={`${txnTh} text-right`}>Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedTxns.map((t: Transaction) => (
                      <tr key={t.id} data-interactive-row>
                        <td className={`w-[108px] whitespace-normal border-y border-l border-black/5 bg-white px-2 py-2.5 text-[11px] leading-tight text-slate-600 first:rounded-l-2xl`}>
                          {formatTxnDateTime(t.date).split(',').map((part, i) => (
                             <div key={i} className={i === 0 ? "font-semibold text-slate-900" : "mt-0.5"}>{part.trim()}</div>
                          ))}
                        </td>
                        <td className={txnTdFromTo}>{t.from}</td>
                        <td className={txnTdFromTo}>{t.to}</td>
                        <td className={txnTdNotes}>
                          <TransactionNotesCell transaction={t} />
                        </td>
                        {isLedgerTab ? (
                          <>
                            <td className={`${txnTd} font-mono text-sm font-bold text-slate-900`}>
                              {isLedgerTabOutAmount(t, activeTab) ? formatTxnAmount(t) : <span className="text-slate-300">—</span>}
                            </td>
                            <td className={`${txnTd} font-mono text-sm font-bold text-slate-900`}>
                              {isLedgerTabInAmount(t, activeTab) ? formatTxnAmount(t) : <span className="text-slate-300">—</span>}
                            </td>
                          </>
                        ) : (
                          <td className={`${txnTd} font-mono text-sm font-bold text-slate-900`}>
                            {formatTxnAmount(t)}
                          </td>
                        )}
                        <td className={`${txnTd}${!(isBranchView && branches.length === 1) ? ' last:rounded-r-2xl border-r' : ''}`}>
                          <div className="flex flex-wrap gap-1">
                            {getTransactionTagNames(t).length === 0 ? (
                              <span className="text-slate-300">—</span>
                            ) : (
                              getTransactionTagNames(t).map(tag => (
                                <span
                                  key={tag}
                                  className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200"
                                >
                                  {tag}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className={`${txnTdBy}${!(isBranchView && branches.length === 1) ? ' last:rounded-r-2xl border-r' : ''}`} data-txn-by-cell>
                          <TransactionEnteredByAvatar transaction={t} />
                        </td>
                        {isBranchView && branches.length === 1 && (
                          <td className="border-y border-r border-black/5 bg-white px-2 py-2 last:rounded-r-2xl">
                            {canEditTxn(t) ? (
                            <div className="flex items-center justify-end gap-1.5">
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
                            ) : (
                              <span className="block text-right text-[10px] font-semibold text-slate-400">Locked</span>
                            )}
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
                  const isEditable = canEditTxn(t);
                  const isDeletable = canEditTxn(t);
                  const entityName = t.category === 'debit' ? t.from : t.category === 'credit' ? t.to : null;
                  return (
                    <div key={t.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] transition-all">
                      {/* Top row: date */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-800">
                            {formatTxnDateTime(t.date).split(',')[0]}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatTxnDateTime(t.date).split(',')[1]?.trim()}
                          </span>
                        </div>
                        <TransactionEnteredByAvatar transaction={t} compact={false} className="text-right" />
                      </div>

                      <TransactionNotesCell transaction={t} className="max-w-none" />

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
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{ledgerTabColumns?.outLabel ?? 'Sent'}</span>
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {isLedgerTabOutAmount(t, activeTab) ? formatTxnAmount(t) : <span className="text-slate-300">—</span>}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 items-end">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{ledgerTabColumns?.inLabel ?? 'Received'}</span>
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {isLedgerTabInAmount(t, activeTab) ? formatTxnAmount(t) : <span className="text-slate-300">—</span>}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Bottom: actions */}
                      <div className="flex items-center justify-end gap-2">
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

      {ledgerTabTotals && (
        <LedgerTabSummaryBar
          totals={ledgerTabTotals}
          fixed
          tableRef={txnTableRef}
          watchKey={activeTab}
        />
      )}

      {isBranchView && branches.length === 1 ? (
        <BranchTransferModal
          open={showTransfer}
          onClose={() => setShowTransfer(false)}
          targetBranchId={branchId}
          activeBusinessDate={
            isBeta && betaPage.permissions.canPostEntries && betaPage.session
              ? betaPage.session.workingDate
              : undefined
          }
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

      <TransactionsBackupModal
        open={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        onRestored={() => { void refetchData(); }}
        showToast={showToast}
        branches={branches}
        entities={entities}
        ledgers={ledgers}
        transactionTags={transactionTags}
        transactions={transactions}
        dateFilter={dateFilter}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        branchId={branchId}
        branchFilter={branchFilter}
      />

      {/* Edit Transaction Modal */}
      {editingTxn && isBranchView && branches.length === 1 && (
        <EditTransactionModal
          txn={editingTxn}
          branchTags={branchTags}
          isSaving={isSavingTxn}
          onClose={() => setEditingTxn(null)}
          onCreateTag={handleCreateTag}
          onSave={async ({ date, notes, tagIds }) => {
            setIsSavingTxn(true);
            const ok = await updateTransactionMeta(editingTxn.id, date, notes, tagIds);
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
          nameLocked={accountNameUsedInTransactions(editingEntity.name, transactions)}
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
      <LedgerSettingsModal
        open={showManageLedgers}
        branchId={branchId}
        branchLedgers={branchLedgers}
        transactions={transactions}
        onClose={() => setShowManageLedgers(false)}
        onAddLedger={addLedger}
        onUpdateLedger={updateLedger}
        onDeleteLedger={deleteLedger}
        showToast={showToast}
      />
    </>
  );
}

function EditEntityModal({
  entity,
  nameLocked = false,
  isSaving,
  onClose,
  onSave,
}: {
  entity: import('@/types').Entity;
  nameLocked?: boolean;
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
    if (nameLocked && name.trim() !== entity.name.trim()) {
      setError('Name cannot be changed because this entity has at least one transaction.');
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
              className={`${formInput}${nameLocked ? ' bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={nameLocked}
              readOnly={nameLocked}
              placeholder="e.g. John Doe"
            />
            {nameLocked ? (
              <p className={formHint}>Name is locked — this entity has transactions.</p>
            ) : null}
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
