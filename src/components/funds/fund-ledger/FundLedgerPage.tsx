'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useFundLedger } from '@/hooks/useFundLedger';
import { getBranchUsdtBalanceAction } from '@/app/actions/usdtActions';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { btnPrimary, btnSecondary, pageHeader, pageTitle } from '@/lib/ui';
import FundLedgerKpiSection from './FundLedgerKpiSection';
import FundLedgerTable from './FundLedgerTable';
import NewEntryModal from './NewEntryModal';
import RecordPaymentModal from './RecordPaymentModal';
import ExpenseEntryModal from './ExpenseEntryModal';
import EntryDetailModal from './EntryDetailModal';
import { useWriteAccess } from '@/context/RbacWriteContext';
import { useApp } from '@/context/AppContext';
import { createBranchExpenseAction, deleteBranchExpenseAction } from '@/app/actions/fundActions';
import { resolveEntityLedgerCurrency, sumPendingUsdt } from '@/lib/fundLedgerCurrency';
import type { Expense, FundEntityLedgerEntry, ExpensePaymentMethod, ExpenseType } from '@/types';

export default function FundLedgerPage() {
  const { canWrite, writeBlockedReason, buttonProps: wp } = useWriteAccess();
  const { currentSlug, branches, showToast, refetchData, expenses, isInitialLoading } = useApp();
  const branch = branches.find(b => b.slug === currentSlug);
  const branchId = branch?.id;

  const {
    entries,
    balances,
    customers,
    selectedCustomerId,
    totalReceivable,
    totalPayable,
    netPosition,
    loading,
    selectCustomer,
    createEntry,
    recordPayment,
    deleteEntry,
    convertEntry,
    refresh,
  } = useFundLedger();

  const [showNewEntry, setShowNewEntry] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showExpenseEntry, setShowExpenseEntry] = useState(false);
  const [preselectedEntity, setPreselectedEntity] = useState<string | undefined>(undefined);
  const [preselectedAmount, setPreselectedAmount] = useState<number>(0);
  const [preselectedLedgerCurrency, setPreselectedLedgerCurrency] = useState<string | undefined>(undefined);
  const [paymentKey, setPaymentKey] = useState(0);
  const [viewingEntry, setViewingEntry] = useState<FundEntityLedgerEntry | null>(null);
  const [branchBalances, setBranchBalances] = useState<{ usdt: number; aed: number; idr: number } | null>(null);
  const [dateFilter, setDateFilter] = useState('all-time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchCapital = useCallback(async () => {
    if (!branchId) return;
    const bal = await getBranchUsdtBalanceAction(branchId);
    if (bal) setBranchBalances({ usdt: bal.availableFund, aed: bal.aedBalance, idr: bal.idrBalance });
  }, [branchId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refresh(), fetchCapital(), refetchData()]);
  }, [refresh, fetchCapital, refetchData]);

  useEffect(() => { fetchCapital(); }, [fetchCapital]);

  const openRecordPayment = (customerId?: string, amount?: number, ledgerCurrency?: string) => {
    const profileCurrency = customerId
      ? customers.find(c => c.id === customerId)?.currency
      : undefined;
    const resolvedLedger = ledgerCurrency
      ?? (customerId ? resolveEntityLedgerCurrency(entries, customerId, profileCurrency) : undefined);
    setPreselectedEntity(customerId);
    setPreselectedAmount(amount ?? 0);
    setPreselectedLedgerCurrency(resolvedLedger);
    setPaymentKey(k => k + 1);
    setShowRecordPayment(true);
  };

  const handleCreateEntry = async (params: Parameters<typeof createEntry>[0]) => {
    const result = await createEntry(params);
    if (result.success) await fetchCapital();
    return result;
  };

  const handleRecordPayment = async (params: Parameters<typeof recordPayment>[0]) => {
    const result = await recordPayment(params);
    if (result.success) await fetchCapital();
    return result;
  };

  const handleDeleteEntry = async (entry: FundEntityLedgerEntry) => {
    await deleteEntry(entry.id);
    setViewingEntry(null);
    await fetchCapital();
  };

  const handleDeleteExpense = async (expense: Expense) => {
    const result = await deleteBranchExpenseAction(expense.id);
    if (result.success) {
      await fetchCapital();
      await refetchData();
      showToast('Expense deleted', 'success');
    } else {
      showToast(result.error ?? 'Failed to delete expense', 'error');
    }
  };

  const handleCreateExpense = async (params: {
    date: string;
    type: ExpenseType;
    category: string;
    description: string;
    amount: number;
    paymentMethod: ExpensePaymentMethod;
  }) => {
    if (!branchId) return { success: false, error: 'No branch selected' };
    const result = await createBranchExpenseAction({ ...params, branchId });
    if (result.success) {
      await fetchCapital();
      await refetchData();
      showToast(`Expense of ${params.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${params.paymentMethod} recorded`, 'success');
    }
    return result;
  };

  const branchExpenses = branchId
    ? expenses.filter(e => e.branchId === branchId)
    : expenses;

  const handleConvertEntry = async (entryId: string, rate: number) => {
    const result = await convertEntry(entryId, rate);
    if (result.success) {
      setViewingEntry(null);
      await fetchCapital();
    }
    return result;
  };

  const pendingUsdt = sumPendingUsdt(entries, customers);

  const writeBlocked = !canWrite;

  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <header className={pageHeader}>
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Branch operations</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={pageTitle}>Funds</h1>
            {branch?.name && (
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {branch.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <button type="button" onClick={refreshAll} className={`${btnSecondary} w-full sm:w-auto`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
          <button
            type="button"
            className={`${btnSecondary} w-full sm:w-auto${writeBlocked ? ' cursor-not-allowed opacity-50' : ''}`}
            {...wp()}
            onClick={() => canWrite && setShowExpenseEntry(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Record expense
          </button>
          <button
            type="button"
            className={`${btnSecondary} w-full sm:w-auto${writeBlocked ? ' cursor-not-allowed opacity-50' : ''}`}
            {...wp()}
            onClick={() => canWrite && openRecordPayment()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Record payment
          </button>
          <button
            type="button"
            className={`${btnPrimary} w-full sm:w-auto${writeBlocked ? ' pointer-events-none opacity-50' : ''}`}
            {...wp()}
            onClick={() => canWrite && setShowNewEntry(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Post entry
          </button>
        </div>
      </header>

      <DateFilterBar
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />

      <FundLedgerKpiSection
        branchBalances={branchBalances}
        totalReceivable={totalReceivable}
        totalPayable={totalPayable}
        netPosition={netPosition}
        entityCount={balances.length}
        pendingUsdt={pendingUsdt}
        loading={loading || isInitialLoading}
      />

      <FundLedgerTable
        entries={entries}
        expenses={branchExpenses}
        balances={balances}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        loading={loading || isInitialLoading}
        dateFilter={dateFilter}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onSelectCustomer={selectCustomer}
        onViewEntry={entry => setViewingEntry(entry)}
        onDeleteEntry={handleDeleteEntry}
        onDeleteExpense={handleDeleteExpense}
        onRecordPayment={openRecordPayment}
        canWrite={canWrite}
      />

      <NewEntryModal
        open={showNewEntry}
        onClose={() => setShowNewEntry(false)}
        customers={customers}
        onSubmit={handleCreateEntry}
      />

      <RecordPaymentModal
        key={paymentKey}
        open={showRecordPayment}
        onClose={() => {
          setShowRecordPayment(false);
          setPreselectedEntity(undefined);
          setPreselectedAmount(0);
          setPreselectedLedgerCurrency(undefined);
        }}
        customers={customers}
        entries={entries}
        preselectedCustomerId={preselectedEntity}
        preselectedAmount={preselectedAmount}
        preselectedLedgerCurrency={preselectedLedgerCurrency}
        onSubmit={handleRecordPayment}
      />

      <ExpenseEntryModal
        open={showExpenseEntry}
        onClose={() => setShowExpenseEntry(false)}
        branchBalances={branchBalances}
        onSubmit={handleCreateExpense}
      />

      <EntryDetailModal
        open={viewingEntry !== null}
        entry={viewingEntry}
        customers={customers}
        onClose={() => setViewingEntry(null)}
        onDelete={handleDeleteEntry}
        onConvert={handleConvertEntry}
        canWrite={canWrite}
      />

      {!canWrite && writeBlockedReason && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
          {writeBlockedReason}
        </div>
      )}
    </div>
  );
}
