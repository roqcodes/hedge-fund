'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import type { ExpensePaymentMethod, ExpenseType } from '@/types';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all';

const labelClass = 'mb-1.5 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400';

const PAYMENT_METHODS: ExpensePaymentMethod[] = ['AED', 'USDT', 'IDR'];
const EXPENSE_TYPES: { value: ExpenseType; label: string; hint: string }[] = [
  { value: 'opex', label: 'OPEX', hint: 'Operating expense' },
  { value: 'capex', label: 'CAPEX', hint: 'Capital expense' },
];

const CATEGORIES = [
  'Rent',
  'Utilities',
  'Salaries',
  'Transport',
  'Marketing',
  'Office Supplies',
  'Maintenance',
  'Bank Fees',
  'Other',
];

interface BranchBalances {
  usdt: number;
  aed: number;
  idr: number;
}

interface ExpenseEntryModalProps {
  open: boolean;
  onClose: () => void;
  branchBalances: BranchBalances | null;
  onSubmit: (params: {
    date: string;
    type: ExpenseType;
    category: string;
    description: string;
    amount: number;
    paymentMethod: ExpensePaymentMethod;
  }) => Promise<{ success: boolean; error?: string }>;
}

function balanceForMethod(balances: BranchBalances | null, method: ExpensePaymentMethod): number | null {
  if (!balances) return null;
  if (method === 'AED') return balances.aed;
  if (method === 'IDR') return balances.idr;
  return balances.usdt;
}

export default function ExpenseEntryModal({
  open,
  onClose,
  branchBalances,
  onSubmit,
}: ExpenseEntryModalProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<ExpenseType>('opex');
  const [category, setCategory] = useState('Office Supplies');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('AED');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedCategory = category === 'Other' ? customCategory.trim() : category;
  const numAmount = parseFloat(amount) || 0;
  const availableBalance = balanceForMethod(branchBalances, paymentMethod);
  const insufficientFunds = availableBalance !== null && numAmount > availableBalance;
  const canSubmit =
    resolvedCategory.length > 0 &&
    description.trim().length > 0 &&
    numAmount > 0 &&
    !insufficientFunds &&
    !submitting;

  const reset = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setType('opex');
    setCategory('Office Supplies');
    setCustomCategory('');
    setDescription('');
    setAmount('');
    setPaymentMethod('AED');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);

    const result = await onSubmit({
      date,
      type,
      category: resolvedCategory,
      description: description.trim(),
      amount: numAmount,
      paymentMethod,
    });

    setSubmitting(false);
    if (result.success) {
      reset();
      onClose();
    } else {
      setError(result.error ?? 'Failed to record expense');
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Record Expense" maxWidth="max-w-lg w-[95vw]">
      <div className="space-y-5 pb-4">
        {/* Payment method */}
        <div>
          <label className={labelClass}>Payment Method</label>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map(method => {
              const bal = balanceForMethod(branchBalances, method);
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`rounded-xl border px-3 py-2.5 text-center transition-all ${
                    paymentMethod === method
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <p className={`text-xs font-extrabold uppercase tracking-wider ${
                    paymentMethod === method ? 'text-white' : 'text-slate-500'
                  }`}>
                    {method}
                  </p>
                  {bal !== null && (
                    <p className={`mt-0.5 text-[10px] font-semibold font-mono ${
                      paymentMethod === method ? 'text-white/70' : 'text-slate-400'
                    }`}>
                      {bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Expense type */}
        <div>
          <label className={labelClass}>Expense Type</label>
          <div className="grid grid-cols-2 gap-2">
            {EXPENSE_TYPES.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`rounded-xl border px-4 py-3 text-left transition-all ${
                  type === opt.value
                    ? 'border-violet-200 bg-violet-50 ring-2 ring-violet-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <p className={`text-xs font-extrabold uppercase tracking-wider ${
                  type === opt.value ? 'text-violet-700' : 'text-slate-400'
                }`}>
                  {opt.label}
                </p>
                <p className={`text-sm font-bold mt-0.5 ${
                  type === opt.value ? 'text-violet-800' : 'text-slate-500'
                }`}>
                  {opt.hint}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Amount + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Amount ({paymentMethod})</label>
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
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className={labelClass}>Category</label>
          <select
            className={inputClass}
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {category === 'Other' && (
            <input
              type="text"
              className={`${inputClass} mt-2`}
              value={customCategory}
              onChange={e => setCustomCategory(e.target.value)}
              placeholder="Enter category name"
            />
          )}
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Monthly office rent payment"
          />
        </div>

        {insufficientFunds && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs font-semibold text-amber-700">
            Insufficient {paymentMethod} balance. Available: {availableBalance?.toFixed(2)}
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* Summary */}
        {numAmount > 0 && description.trim() && resolvedCategory && !insufficientFunds && (
          <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-red-600">
              Summary
            </p>
            <p className="text-sm font-bold mt-0.5 text-red-800">
              Deduct {numAmount.toFixed(2)} {paymentMethod} from branch balance
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {type.toUpperCase()} · {resolvedCategory} · {description.trim()}
            </p>
            {availableBalance !== null && (
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                New balance: {(availableBalance - numAmount).toFixed(2)} {paymentMethod}
              </p>
            )}
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
            {submitting ? 'Recording\u2026' : 'Record Expense'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
