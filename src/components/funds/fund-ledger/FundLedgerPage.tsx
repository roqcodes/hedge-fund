'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useFundLedger } from '@/hooks/useFundLedger';
import { getBranchUsdtBalanceAction, setBranchUsdtCapitalAction } from '@/app/actions/usdtActions';
import { btnPrimary, btnSecondary, pageHeader, pageTitle, pageSubtitle } from '@/lib/ui';
import KpiCards from './KpiCards';
import EntryTable from './EntryTable';
import NewEntryModal from './NewEntryModal';
import RecordPaymentModal from './RecordPaymentModal';
import EntryDetailModal from './EntryDetailModal';
import Modal from '@/components/ui/Modal';
import { useWriteAccess } from '@/context/RbacWriteContext';
import { useApp } from '@/context/AppContext';
import type { FundEntityLedgerEntry } from '@/types';

export default function FundLedgerPage() {
  const { canWrite, writeBlockedReason, buttonProps: wp } = useWriteAccess();
  const { currentSlug, branches } = useApp();
  const branchId = branches.find(b => b.slug === currentSlug)?.id;
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

  const openRecordPayment = (customerId?: string, amount?: number) => {
    setPreselectedEntity(customerId);
    setPreselectedAmount(amount ?? 0);
    setPaymentKey(k => k + 1);
    setShowRecordPayment(true);
  };

  const [usdtCapital, setUsdtCapital] = useState<number | null>(null);
  const [showEditCapital, setShowEditCapital] = useState(false);
  const [editCapitalAmount, setEditCapitalAmount] = useState('');
  const [isSavingCapital, setIsSavingCapital] = useState(false);

  const fetchCapital = useCallback(async () => {
    if (!branchId) return;
    const bal = await getBranchUsdtBalanceAction(branchId);
    if (bal) setUsdtCapital(bal.availableFund);
  }, [branchId]);

  const refreshAll = useCallback(async () => {
    await refresh();
    await fetchCapital();
  }, [refresh, fetchCapital]);

  useEffect(() => { fetchCapital(); }, [fetchCapital]);

  const handleSaveCapital = async () => {
    if (!branchId) return;
    const val = parseFloat(editCapitalAmount);
    if (isNaN(val) || val <= 0) return;
    setIsSavingCapital(true);
    const res = await setBranchUsdtCapitalAction(branchId, val);
    if (res.success) {
      setUsdtCapital(val);
      setShowEditCapital(false);
    }
    setIsSavingCapital(false);
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

  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
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
            onClick={refreshAll}
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
            className={`${btnSecondary}${!canWrite ? ' cursor-not-allowed opacity-50' : ''}`}
            {...wp()}
            onClick={() => canWrite && setShowEditCapital(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Capital
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

      {/* Branch USDT Capital KPI */}
      <div className="mb-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-surface-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Branch USDT Capital</p>
              <p className="mt-1 text-2xl font-black text-slate-900 font-mono">
                {usdtCapital !== null ? usdtCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '\u2014'}
                <span className="text-sm font-bold text-slate-500 ml-1.5">USDT</span>
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                Available working capital for USDT trading
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M3 21h18M3 10h18M5 21V10m14 11V10M2 7l10-5 10 5M10 14h4v7h-4z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

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
        onSubmit={handleCreateEntry}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        key={paymentKey}
        open={showRecordPayment}
        onClose={() => { setShowRecordPayment(false); setPreselectedEntity(undefined); setPreselectedAmount(0); }}
        customers={customers}
        preselectedCustomerId={preselectedEntity}
        preselectedAmount={preselectedAmount}
        onSubmit={handleRecordPayment}
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

      {/* Edit Capital Modal */}
      {showEditCapital && (
        <Modal
          open={showEditCapital}
          onClose={() => { setShowEditCapital(false); setEditCapitalAmount(''); }}
          title="Set Branch USDT Capital"
          maxWidth="max-w-sm"
        >
          <p className="text-xs font-medium text-slate-500 mb-4">
            Enter the initial USDT capital for this branch. This sets the available working capital.
          </p>
          <input
            type="number"
            step="0.0001"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="0.0000"
            value={editCapitalAmount}
            onChange={e => setEditCapitalAmount(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveCapital(); }}
            autoFocus
          />
          <p className="text-[11px] font-medium text-slate-400 mt-2">
            Current: {usdtCapital !== null ? `${usdtCapital.toFixed(2)} USDT` : '\u2014'}
          </p>
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => { setShowEditCapital(false); setEditCapitalAmount(''); }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={!editCapitalAmount || parseFloat(editCapitalAmount) <= 0 || isSavingCapital}
              onClick={handleSaveCapital}
            >
              {isSavingCapital ? 'Saving...' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {!canWrite && writeBlockedReason && (
        <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs font-semibold text-amber-700">
          {writeBlockedReason}
        </div>
      )}
    </div>
  );
}
