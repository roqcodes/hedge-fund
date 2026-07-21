'use client';

import React, { useState } from 'react';
import { useFundLedger } from '@/hooks/useFundLedger';
import { btnPrimary, btnSecondary, pageHeader, pageTitle, pageSubtitle } from '@/lib/ui';
import KpiCards from './KpiCards';
import EntryTable from './EntryTable';
import NewEntryModal from './NewEntryModal';
import RecordPaymentModal from './RecordPaymentModal';
import EntryDetailModal from './EntryDetailModal';
import { useWriteAccess } from '@/context/RbacWriteContext';
import type { FundEntityLedgerEntry } from '@/types';

export default function FundLedgerPage() {
  const { canWrite, writeBlockedReason, buttonProps: wp } = useWriteAccess();
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
    refresh,
  } = useFundLedger();

  const [showNewEntry, setShowNewEntry] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [preselectedEntity, setPreselectedEntity] = useState<string | undefined>(undefined);
  const [preselectedAmount, setPreselectedAmount] = useState<number>(0);
  const [paymentKey, setPaymentKey] = useState(0);
  const [viewingEntry, setViewingEntry] = useState<FundEntityLedgerEntry | null>(null);

  const handleViewEntry = (entry: FundEntityLedgerEntry) => setViewingEntry(entry);

  const handleDeleteEntry = async (entry: FundEntityLedgerEntry) => {
    await deleteEntry(entry.id);
    setViewingEntry(null);
  };

  const openRecordPayment = (customerId?: string, amount?: number) => {
    setPreselectedEntity(customerId);
    setPreselectedAmount(amount ?? 0);
    setPaymentKey(k => k + 1);
    setShowRecordPayment(true);
  };

  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Header */}
      <header className={pageHeader}>
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Entity settlement</p>
          <h1 className={pageTitle}>Entity Ledger</h1>
          <p className={pageSubtitle}>
            Track receivables, payables, and settlements per entity
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => refresh()}
            className={btnSecondary}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
          <button
            type="button"
            className={`${btnSecondary}${!canWrite ? ' cursor-not-allowed opacity-50' : ''}`}
            {...wp()}
            onClick={() => canWrite && openRecordPayment()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Record Payment
          </button>
          <button
            type="button"
            className={`${btnPrimary} w-full sm:w-auto${!canWrite ? ' pointer-events-none opacity-50' : ''}`}
            {...wp()}
            onClick={() => canWrite && setShowNewEntry(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Post Entry
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <KpiCards
        totalReceivable={totalReceivable}
        totalPayable={totalPayable}
        netPosition={netPosition}
        entityCount={balances.length}
        loading={loading}
      />

      {/* Main content: entity list + ledger entries */}
      <EntryTable
        entries={entries}
        balances={balances}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        onSelectCustomer={selectCustomer}
        onView={handleViewEntry}
        onDelete={handleDeleteEntry}
        onRecordPayment={openRecordPayment}
        canWrite={canWrite}
      />

      {/* Post Entry Modal */}
      <NewEntryModal
        open={showNewEntry}
        onClose={() => setShowNewEntry(false)}
        customers={customers}
        onSubmit={createEntry}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        key={paymentKey}
        open={showRecordPayment}
        onClose={() => { setShowRecordPayment(false); setPreselectedEntity(undefined); setPreselectedAmount(0); }}
        customers={customers}
        preselectedCustomerId={preselectedEntity}
        preselectedAmount={preselectedAmount}
        onSubmit={recordPayment}
      />

      {/* Detail Modal */}
      <EntryDetailModal
        open={viewingEntry !== null}
        entry={viewingEntry}
        customers={customers}
        onClose={() => setViewingEntry(null)}
        onDelete={handleDeleteEntry}
        canWrite={canWrite}
      />

      {!canWrite && writeBlockedReason && (
        <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs font-semibold text-amber-700">
          {writeBlockedReason}
        </div>
      )}
    </div>
  );
}
