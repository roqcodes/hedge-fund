'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import type { FundEntityLedgerEntry, Customer } from '@/types';

interface EntryDetailModalProps {
  open: boolean;
  entry: FundEntityLedgerEntry | null;
  customers: Customer[];
  onClose: () => void;
  onDelete?: (entry: FundEntityLedgerEntry) => void;
  canWrite: boolean;
}

export default function EntryDetailModal({
  open,
  entry,
  customers,
  onClose,
  onDelete,
  canWrite,
}: EntryDetailModalProps) {
  if (!entry) return null;

  const customer = customers.find(c => c.id === entry.customerId);
  const isDebit = entry.debit > 0;

  const handleDelete = () => {
    if (confirm('Delete this ledger entry? This cannot be undone.')) {
      onDelete?.(entry);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isDebit ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
          }`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div>
            <p className="text-base font-extrabold text-slate-900 leading-tight">Ledger Entry</p>
            <p className="font-mono text-[10px] text-slate-400 leading-tight">{entry.id}</p>
          </div>
        </div>
      }
      maxWidth="max-w-lg w-[95vw]"
    >
      <div className="space-y-5 pb-4">
        {/* Entity + Direction */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">Entity</p>
            <p className="text-lg font-black text-slate-900">{customer?.name ?? entry.customerId}</p>
          </div>
          <div className={`rounded-2xl border p-4 ${isDebit ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
            <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${isDebit ? 'text-emerald-600' : 'text-red-600'}`}>
              {isDebit ? 'Receivable' : 'Payable'}
            </p>
            <p className={`text-lg font-black font-mono ${isDebit ? 'text-emerald-700' : 'text-red-700'}`}>
              {isDebit ? entry.debit.toFixed(2) : entry.credit.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              {isDebit ? 'Entity owes branch' : 'Branch owes entity'}
            </p>
          </div>
        </div>

        {/* Meta info grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">Date</p>
            <p className="text-sm font-bold text-slate-900">
              {new Date(entry.entryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">Created By</p>
            <p className="text-sm font-bold text-slate-900">{entry.createdByName || entry.createdBy || '\u2014'}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">Reference</p>
            <p className="text-sm font-bold text-slate-900">
              {entry.referenceType !== 'manual' ? entry.referenceType.replace('_', ' ') : 'Manual'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">Reference ID</p>
            <p className="text-sm font-bold text-slate-900 font-mono">{entry.referenceId || '\u2014'}</p>
          </div>
        </div>

        {/* Description */}
        {entry.description && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500 mb-0.5">Description</p>
            <p className="text-sm font-semibold text-slate-700">{entry.description}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          {canWrite && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-100 active:scale-[0.98]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
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
