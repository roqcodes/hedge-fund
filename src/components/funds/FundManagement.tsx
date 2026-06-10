'use client';
import React, { useState } from 'react';
import KPICard from '@/components/ui/KPICard';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { formatAED, formatAEDStr, formatDateTime } from '@/data/mockData';
import { Branch, Transaction } from '@/types';
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
import { EntityManagementModal } from './EntityManagementModal';
import { BranchTransferModal } from './BranchTransferModal';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { useDateFilter } from '@/hooks/useDateFilter';
import DateFilterBar from '@/components/ui/DateFilterBar';

export default function FundManagement() {
  const { branches, transactions, transferFunds, hqBalance, isBranchView, updateBranchInitialFund, showToast, entities, addEntity, processLedgerTransaction, updateLedgerTransaction, deleteLedgerTransaction } = useApp();
  const [showTransfer, setShowTransfer] = useState(false);
  const [showEditInitialFund, setShowEditInitialFund] = useState(false);
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [editFundAmount, setEditFundAmount] = useState('');
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

  const {
    dateFilter, setDateFilter,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
    filteredData: filteredTransactions
  } = useDateFilter(transactions);

  const branchName = branches.length === 1 ? branches[0].name : '';

  const totalVolume = filteredTransactions.reduce((acc: number, t: Transaction) => acc + t.amount, 0);
  const transferCount = filteredTransactions.filter((t: Transaction) => t.type === 'transfer').length;
  const pendingCount = filteredTransactions.filter((t: Transaction) => t.status === 'pending').length;

  const customerAccountTxns = filteredTransactions.filter(t => t.type === 'customer_account' && (t.to === branchName || t.from === branchName));
  const tempCreditTxns = filteredTransactions.filter(t => t.type === 'temporary_credit' && (t.to === branchName || t.from === branchName));

  const customerAccountsBalance = customerAccountTxns.reduce((acc, t) => {
    return acc + (t.category === 'debit' ? t.amount : -t.amount);
  }, 0);

  const temporaryCreditsBalance = tempCreditTxns.reduce((acc, t) => {
    return acc + (t.category === 'debit' ? t.amount : -t.amount);
  }, 0);

  const branchCapital = branches.length === 1 ? branches[0].openingBalance : 0;
  const totalCashInLocker = branchCapital + customerAccountsBalance + temporaryCreditsBalance;

  const filteredAndSortedTxns = React.useMemo(() => {
    let result = filteredTransactions.filter((t: Transaction) => {
      if (filter !== 'all' && t.type !== filter) return false;
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
  }, [transactions, filter, branchFilter, searchTerm, sortField, sortDirection]);

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

  const typeFilters: { value: string; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'expense', label: 'Expense' },
    { value: 'allocation', label: 'Allocation' },
    { value: 'customer_account', label: 'Customer Account' },
    { value: 'temporary_credit', label: 'Temporary Credit' },
  ];

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
              <>
                <button 
                  type="button" 
                  className={`${btnSecondary} w-full sm:w-auto`} 
                  onClick={() => {
                    setEditFundAmount(branches[0].openingBalance.toString());
                    setShowEditInitialFund(true);
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit Capital
                </button>
                <button 
                  type="button" 
                  className={`${btnSecondary} w-full sm:w-auto`} 
                  onClick={() => setShowEntityModal(true)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Manage Entities
                </button>
              </>
            )}
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
                value={formatAED(branchCapital)}
                subValue="Initial capital"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M3 21h18M3 10h18M5 21V10m14 11V10M2 7l10-5 10 5M10 14h4v7h-4z" />
                  </svg>
                }
                color="var(--accent)"
                bgColor="var(--accent-light)"
              />
              <KPICard
                label="Customer Accounts"
                value={formatAED(customerAccountsBalance)}
                subValue="Net customer deposits"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                }
                color="var(--success)"
                bgColor="var(--success-light)"
              />
              <KPICard
                label="Temporary Credits"
                value={formatAED(temporaryCreditsBalance)}
                subValue="Net temporary credits"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                }
                color="var(--warning)"
                bgColor="var(--warning-light)"
              />
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

        <div className="md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-3 pb-4 px-4 md:border-b md:border-slate-100 md:px-5 md:py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
            <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">Transaction History</h3>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2">
              <div className="relative w-full sm:w-44">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Search txns..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={`${formInput} !py-2 !pl-10 !pr-4 !text-sm w-full`}
                />
              </div>
              <div className="grid grid-cols-1 gap-2 w-full min-[480px]:grid-cols-3 sm:flex sm:w-auto sm:flex-row sm:gap-2">
                <SearchableSelect
                  options={typeFilters}
                  value={filter}
                  onChange={setFilter}
                  className="w-full sm:w-40"
                />
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
            </div>
          </div>
          <div className="p-0">

            {/* ── Desktop table ── */}
            <div className={`${tableWrap} hidden md:block`}>
              <table className={`${dataTable} min-w-[900px]`}>
                <thead>
                  <tr>
                    <th className="group cursor-pointer select-none px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 sm:px-5" onClick={() => handleSort('date')}>
                      Date &amp; Time <SortIcon field="date" />
                    </th>
                    <th className="group cursor-pointer select-none px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 sm:px-5" onClick={() => handleSort('from')}>
                      From <SortIcon field="from" />
                    </th>
                    <th className="group cursor-pointer select-none px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 sm:px-5" onClick={() => handleSort('to')}>
                      To <SortIcon field="to" />
                    </th>
                    <th className="group cursor-pointer select-none px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 sm:px-5" onClick={() => handleSort('amount')}>
                      Amount <SortIcon field="amount" />
                    </th>
                    <th className="group cursor-pointer select-none px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 sm:px-5" onClick={() => handleSort('type')}>
                      Type <SortIcon field="type" />
                    </th>
                    <th className="group cursor-pointer select-none px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 sm:px-5" onClick={() => handleSort('category')}>
                      Debit / Credit <SortIcon field="category" />
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
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold sm:px-5 sm:py-4 sm:text-base">
                        {formatAED(t.amount)}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                        <span className={badgeClass(t.type)}>{t.type.toUpperCase()}</span>
                      </td>
                      <td className={`border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4${!(isBranchView && branches.length === 1 && (t.type === 'customer_account' || t.type === 'temporary_credit')) ? ' last:rounded-r-2xl border-r' : ''}`}>
                        {t.category === 'debit' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                            Debit
                          </span>
                        ) : t.category === 'credit' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-rose-700 ring-1 ring-rose-200">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                            Credit
                          </span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>
                      {isBranchView && branches.length === 1 && (
                        <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 last:rounded-r-2xl sm:px-4 sm:py-3">
                          {(t.type === 'customer_account' || t.type === 'temporary_credit') ? (
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
                            <span className="block text-center text-slate-300">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredAndSortedTxns.length === 0 && (
                    <tr>
                      <td colSpan={isBranchView && branches.length === 1 ? 7 : 6} className="py-10 text-center text-sm text-slate-400">
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Mobile card list ── */}
            <div className="flex md:hidden flex-col gap-3 py-4 px-4">
              {filteredAndSortedTxns.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">No transactions found.</div>
              ) : filteredAndSortedTxns.map((t: Transaction) => {
                const isEditable = isBranchView && branches.length === 1 && (t.type === 'customer_account' || t.type === 'temporary_credit');
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
                        {t.category === 'debit' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                            Debit
                          </span>
                        ) : t.category === 'credit' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 ring-1 ring-rose-200">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                            Credit
                          </span>
                        ) : null}
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
                      <div className="flex flex-col gap-0.5 items-end">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount</span>
                        <span className="font-mono text-sm font-bold text-slate-900">{formatAED(t.amount)}</span>
                      </div>
                    </div>

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
              })}
            </div>

          </div>
        </div>
      </div>

      {isBranchView && branches.length === 1 ? (
        <BranchTransferModal
          open={showTransfer}
          onClose={() => setShowTransfer(false)}
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

      <EntityManagementModal
        open={showEntityModal}
        onClose={() => setShowEntityModal(false)}
      />

      {/* Edit Transaction Modal */}
      {editingTxn && isBranchView && branches.length === 1 && (
        <EditLedgerTransactionModal
          txn={editingTxn}
          branchId={branches[0].id}
          entities={entities}
          branchName={branches[0].name}
          isSaving={isSavingTxn}
          onClose={() => setEditingTxn(null)}
          onSave={async (updated) => {
            setIsSavingTxn(true);
            const ok = await updateLedgerTransaction(
              updated,
              editingTxn.amount,
              editingTxn.category,
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
                    branches[0].id
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
                  if (isNaN(amt) || amt < 0) {
                    showToast('Please enter a valid amount', 'error');
                    return;
                  }
                  setIsUpdatingFund(true);
                  const success = await updateBranchInitialFund(branches[0].id, amt);
                  setIsUpdatingFund(false);
                  if (success) {
                    setShowEditInitialFund(false);
                  }
                }}
              >
                {isUpdatingFund ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          }
        >
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
        </Modal>
      )}
    </>
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
  branchName,
  isSaving,
  onClose,
  onSave,
}: {
  txn: Transaction;
  branchId: string;
  entities: import('@/types').Entity[];
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
      category,
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
