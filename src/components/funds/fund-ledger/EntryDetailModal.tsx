'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import {
  canConvertLedgerEntry,
  getEntryCustomerAmount,
  getEntryUsdtAmount,
  isPendingLedgerEntry,
  fmtFundAmount,
} from '@/lib/fundLedgerCurrency';
import type { FundEntityLedgerEntry, Customer } from '@/types';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all';

interface EntryDetailModalProps {
  open: boolean;
  entry: FundEntityLedgerEntry | null;
  customers: Customer[];
  onClose: () => void;
  onDelete?: (entry: FundEntityLedgerEntry) => void;
  onConvert?: (entryId: string, rate: number) => Promise<{ success: boolean; error?: string }>;
  canWrite: boolean;
}

export default function EntryDetailModal({
  open,
  entry,
  customers,
  onClose,
  onDelete,
  onConvert,
  canWrite,
}: EntryDetailModalProps) {
  const [rate, setRate] = useState('');
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

  if (!entry) return null;

  const customer = customers.find(c => c.id === entry.customerId);
  const profileCurrency = customer?.currency;
  const isDebit = entry.debit > 0;
  const usdtAmount = getEntryUsdtAmount(entry);
  const customerAmount = getEntryCustomerAmount(entry);
  const pending = isPendingLedgerEntry(entry, profileCurrency);
  const canConvert = canConvertLedgerEntry(entry, profileCurrency) && canWrite && !!onConvert;
  const settlementCurr = entry.settlementCurrency || 'USDT';
  const hasSettlement = entry.referenceType === 'settlement' && entry.settlementAmount != null && entry.settlementAmount > 0;
  const numRate = parseFloat(rate) || 0;
  const convertedPreview = numRate > 0 ? usdtAmount * numRate : 0;

  const handleDelete = () => {
    if (confirm('Delete this ledger entry? This cannot be undone.')) {
      onDelete?.(entry);
    }
  };

  const handleConvert = async () => {
    if (!onConvert || numRate <= 0) return;
    setConvertError(null);
    setConverting(true);
    const result = await onConvert(entry.id, numRate);
    setConverting(false);
    if (result.success) {
      setRate('');
      onClose();
    } else {
      setConvertError(result.error ?? 'Conversion failed');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            pending ? 'bg-amber-100 text-amber-600' : isDebit ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
          }`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div>
            <p className="text-base font-extrabold text-slate-900 leading-tight">
              {pending ? 'Pending Entry' : 'Ledger Entry'}
            </p>
            <p className="font-mono text-[10px] text-slate-400 leading-tight">{entry.id}</p>
          </div>
        </div>
      }
      maxWidth="max-w-xl w-[95vw]"
    >
      <div className="space-y-5 pb-4">

        {pending && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
            Stored in USDT — not counted in receivables/payables until converted to {profileCurrency}.
          </div>
        )}

        <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">Entity</p>
            <p className="text-xl font-black text-slate-900 truncate">{customer?.name ?? entry.customerId}</p>
            {profileCurrency && (
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Profile: {profileCurrency}
                {pending && ' · awaiting conversion'}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className={`text-[11px] font-extrabold uppercase tracking-widest mb-0.5 ${
              pending ? 'text-amber-600' : isDebit ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {pending ? 'Pending' : isDebit ? 'Receivable' : 'Payable'}
            </p>
            <p className={`text-xl font-black font-mono ${
              pending ? 'text-amber-700' : isDebit ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {fmtFundAmount(usdtAmount, 'USDT')}
            </p>
            {customerAmount != null && entry.customerCurrency && entry.customerCurrency !== 'USDT' && (
              <p className="text-sm font-bold font-mono text-indigo-700 mt-0.5">
                = {fmtFundAmount(customerAmount, entry.customerCurrency)}
              </p>
            )}
          </div>
        </div>

        {canConvert && (
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 space-y-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600 mb-1">
                Convert to {profileCurrency}
              </p>
              <p className="text-xs text-slate-600">
                Enter rate to book in customer currency. After convert, entry joins tally and you can settle in {profileCurrency}.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Rate <span className="font-normal normal-case tracking-normal text-slate-400">(1 USDT = ? {profileCurrency})</span>
              </label>
              <input
                type="number"
                step="0.000001"
                min="0"
                className={inputClass}
                value={rate}
                onChange={e => setRate(e.target.value)}
                placeholder={profileCurrency === 'AED' ? 'e.g. 3.67' : 'Enter rate'}
              />
            </div>
            {numRate > 0 && (
              <p className="text-sm font-bold font-mono text-indigo-800">
                = {fmtFundAmount(convertedPreview, profileCurrency ?? 'AED')}
              </p>
            )}
            {convertError && (
              <p className="text-xs font-semibold text-red-600">{convertError}</p>
            )}
            <button
              type="button"
              onClick={handleConvert}
              disabled={converting || numRate <= 0}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-indigo-700 disabled:pointer-events-none disabled:opacity-50"
            >
              {converting ? 'Converting…' : `Convert to ${profileCurrency}`}
            </button>
          </div>
        )}

        {hasSettlement && (
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-500 mb-3">
              Branch settlement
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-indigo-100 bg-white/60 p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 mb-0.5">Cash moved</p>
                <p className="text-xl font-black text-indigo-700 font-mono">
                  {fmtFundAmount(entry.settlementAmount!, settlementCurr)}
                </p>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-white/60 p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 mb-0.5">Ledger (USDT)</p>
                <p className="text-xl font-black text-indigo-700 font-mono">
                  {fmtFundAmount(usdtAmount, 'USDT')}
                </p>
              </div>
            </div>
            {entry.customerCurrencyRate && entry.customerCurrency && entry.customerCurrency !== 'USDT' && (
              <p className="mt-3 text-xs font-mono text-indigo-700">
                1 USDT = {entry.customerCurrencyRate} {entry.customerCurrency}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">Date</p>
            <p className="text-sm font-bold text-slate-900">
              {new Date(entry.entryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">Created By</p>
            <p className="text-sm font-bold text-slate-900">{entry.createdByName || entry.createdBy || '\u2014'}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">Reference</p>
            <p className="text-sm font-bold text-slate-900">
              {entry.referenceType !== 'manual' ? entry.referenceType.replace(/_/g, ' ') : 'Manual'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">Reference ID</p>
            <p className="text-sm font-bold text-slate-900 font-mono truncate" title={entry.referenceId || ''}>{entry.referenceId || '\u2014'}</p>
          </div>
        </div>

        {entry.description && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">Description</p>
            <p className="text-sm font-semibold text-slate-700">{entry.description}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          {canWrite && !pending && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-100 active:scale-[0.98]"
            >
              Delete Entry
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
