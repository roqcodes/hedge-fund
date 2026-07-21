'use client';

import React, { useState, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import type { Customer } from '@/types';
import type { FundEntryDirection } from '@/types';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all';

const labelClass = 'mb-1.5 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400';

interface NewEntryModalProps {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  onSubmit: (params: {
    customerId: string;
    direction: FundEntryDirection;
    amount: number;
    description: string;
    entryDate?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export default function NewEntryModal({
  open,
  onClose,
  customers,
  onSubmit,
}: NewEntryModalProps) {
  const [customerId, setCustomerId] = useState('');
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [direction, setDirection] = useState<FundEntryDirection>('debit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedCustomer = customers.find(c => c.id === customerId);
  const showDropdown = focused && !customerId;

  const handleFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setFocused(true);
  };

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setFocused(false), 180);
  };

  const reset = () => {
    setCustomerId('');
    setSearch('');
    setFocused(false);
    setDirection('debit');
    setAmount('');
    setDescription('');
    setEntryDate(new Date().toISOString().slice(0, 10));
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const numAmount = parseFloat(amount) || 0;
  const canSubmit = customerId && numAmount > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);

    const result = await onSubmit({
      customerId,
      direction,
      amount: numAmount,
      description: description.trim() || `${direction === 'debit' ? 'Receivable' : 'Payable'} - ${selectedCustomer?.name ?? ''}`,
      entryDate: entryDate || undefined,
    });

    setSubmitting(false);
    if (result.success) {
      reset();
      onClose();
    } else {
      setError(result.error ?? 'Failed to create entry');
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="New Fund Entry" maxWidth="max-w-lg w-[95vw]">
      <div className="space-y-5 pb-4">
        {/* Entity search + select */}
        <div className="relative">
          <label className={labelClass}>Entity</label>
          <input
            type="text"
            className={inputClass}
            value={customerId && selectedCustomer ? selectedCustomer.name : search}
            onChange={e => { setCustomerId(''); setSearch(e.target.value); }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Search entities..."
          />
          {showDropdown && (
            <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="py-3 text-center text-xs text-slate-400">No entities found</p>
              ) : (
                filtered.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => { setCustomerId(c.id); setSearch(''); setFocused(false); }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-xs font-bold text-slate-600">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{c.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Direction toggle */}
        <div>
          <label className={labelClass}>Direction</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection('debit')}
              className={`rounded-xl border px-4 py-3 text-left transition-all ${
                direction === 'debit'
                  ? 'border-emerald-200 bg-emerald-50 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <p className={`text-xs font-extrabold uppercase tracking-wider ${direction === 'debit' ? 'text-emerald-700' : 'text-slate-400'}`}>
                Receivable
              </p>
              <p className={`text-sm font-bold mt-0.5 ${direction === 'debit' ? 'text-emerald-800' : 'text-slate-500'}`}>
                Entity owes us
              </p>
            </button>
            <button
              type="button"
              onClick={() => setDirection('credit')}
              className={`rounded-xl border px-4 py-3 text-left transition-all ${
                direction === 'credit'
                  ? 'border-red-200 bg-red-50 ring-2 ring-red-500/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <p className={`text-xs font-extrabold uppercase tracking-wider ${direction === 'credit' ? 'text-red-700' : 'text-slate-400'}`}>
                Payable
              </p>
              <p className={`text-sm font-bold mt-0.5 ${direction === 'credit' ? 'text-red-800' : 'text-slate-500'}`}>
                We owe entity
              </p>
            </button>
          </div>
        </div>

        {/* Amount + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              className={inputClass}
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>
            Description <span className="text-slate-300 font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <input
            type="text"
            className={inputClass}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={direction === 'debit' ? 'e.g. Gold sale to entity' : 'e.g. Gold buy from entity'}
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* Summary */}
        {customerId && numAmount > 0 && (
          <div className={`rounded-xl border px-4 py-3 ${
            direction === 'debit' ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'
          }`}>
            <p className={`text-[10px] font-extrabold uppercase tracking-widest ${
              direction === 'debit' ? 'text-emerald-600' : 'text-red-600'
            }`}>
              Summary
            </p>
            <p className={`text-sm font-bold mt-0.5 ${direction === 'debit' ? 'text-emerald-800' : 'text-red-800'}`}>
              {selectedCustomer?.name} {direction === 'debit' ? 'owes branch' : 'is owed by branch'} {numAmount.toFixed(2)}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white transition-all hover:bg-slate-800 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? 'Creating\u2026' : 'Create Entry'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
