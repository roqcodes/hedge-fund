'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import {
  computeEntityTally,
  computeCustomerAverageUsdtRate,
  fmtFundAmount,
} from '@/lib/fundLedgerCurrency';
import {
  convertCustomerToUsdt,
  convertUsdtToCustomer,
  formatFundAmount,
  parseFundAmount,
  resolveJournalAmounts,
  type AmountInputSide,
} from '@/lib/fundLedgerAmounts';
import type { Customer, FundEntityLedgerEntry, FundEntryDirection, FundReferenceType } from '@/types';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all';

const labelClass = 'mb-1.5 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400';

export type JournalEntryMode = 'journal' | 'settlement';

export type JournalEntrySubmitParams = {
  customerId: string;
  direction: FundEntryDirection;
  amount: number;
  description: string;
  entryDate?: string;
  customerCurrency?: string;
  customerCurrencyRate?: number;
  inputSide: AmountInputSide;
  referenceType: FundReferenceType;
};

interface JournalEntryModalProps {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  entries: FundEntityLedgerEntry[];
  mode?: JournalEntryMode;
  preselectedCustomerId?: string;
  preselectedAmount?: number;
  preselectedSide?: AmountInputSide;
  onSubmit: (params: JournalEntrySubmitParams) => Promise<{ success: boolean; error?: string }>;
}

export default function JournalEntryModal({
  open,
  onClose,
  customers,
  entries,
  mode: initialMode = 'journal',
  preselectedCustomerId,
  preselectedAmount,
  preselectedSide = 'customer',
  onSubmit,
}: JournalEntryModalProps) {
  const [mode, setMode] = useState<JournalEntryMode>(initialMode);
  const [customerId, setCustomerId] = useState('');
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [direction, setDirection] = useState<FundEntryDirection>('debit');
  const [inputSide, setInputSide] = useState<AmountInputSide>('usdt');
  const [usdtStr, setUsdtStr] = useState('');
  const [customerStr, setCustomerStr] = useState('');
  const [rateStr, setRateStr] = useState('');
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedCustomer = customers.find(c => c.id === customerId);
  const customerCurrency = selectedCustomer?.currency || 'AED';
  const isUsdtCustomer = customerCurrency === 'USDT';
  const showDropdown = focused && !customerId;

  const entityTally = useMemo(() => {
    if (!customerId) return null;
    return computeEntityTally(entries, customerId, customerCurrency);
  }, [customerId, entries, customerCurrency]);

  const avgRateInfo = useMemo(() => {
    if (!customerId || isUsdtCustomer) return null;
    return computeCustomerAverageUsdtRate(entries, customerId, customerCurrency);
  }, [customerId, entries, customerCurrency, isUsdtCustomer]);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setCustomerId(preselectedCustomerId ?? '');
    setSearch('');
    setFocused(false);
    setDirection(initialMode === 'settlement' ? 'credit' : 'debit');
    setInputSide(preselectedSide);
    setUsdtStr('');
    setCustomerStr(preselectedAmount ? formatFundAmount(preselectedAmount) : '');
    setRateStr('');
    setDescription('');
    setEntryDate(new Date().toISOString().slice(0, 10));
    setError(null);

    if (preselectedAmount && preselectedSide === 'customer') {
      setCustomerStr(formatFundAmount(preselectedAmount));
    } else if (preselectedAmount) {
      setUsdtStr(formatFundAmount(preselectedAmount));
    }
  }, [open, initialMode, preselectedCustomerId, preselectedAmount, preselectedSide]);

  useEffect(() => {
    if (!customerId || isUsdtCustomer) return;
    const avg = computeCustomerAverageUsdtRate(entries, customerId, customerCurrency);
    setRateStr(avg ? formatFundAmount(avg.rate) : '');
  }, [customerId, isUsdtCustomer, customerCurrency, entries]);

  const handleFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setFocused(true);
  };

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setFocused(false), 180);
  };

  const reset = () => {
    setCustomerId(preselectedCustomerId ?? '');
    setSearch('');
    setFocused(false);
    setMode(initialMode);
    setDirection(initialMode === 'settlement' ? 'credit' : 'debit');
    setInputSide('usdt');
    setUsdtStr('');
    setCustomerStr('');
    setRateStr('');
    setDescription('');
    setEntryDate(new Date().toISOString().slice(0, 10));
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const numRate = isUsdtCustomer ? 1 : parseFundAmount(rateStr);
  const numUsdt = parseFundAmount(usdtStr);
  const numCustomer = parseFundAmount(customerStr);

  const resolved = useMemo(() => {
    if (isUsdtCustomer) {
      return resolveJournalAmounts({
        inputSide: 'usdt',
        usdtAmount: numUsdt,
        customerAmount: numUsdt,
        customerCurrency: 'USDT',
        customerCurrencyRate: 1,
      });
    }
    return resolveJournalAmounts({
      inputSide,
      usdtAmount: numUsdt,
      customerAmount: numCustomer,
      customerCurrency,
      customerCurrencyRate: numRate,
    });
  }, [inputSide, numUsdt, numCustomer, numRate, customerCurrency, isUsdtCustomer]);

  const rateValid = isUsdtCustomer || numRate > 0;
  const canSubmit = Boolean(customerId && resolved && rateValid && !submitting);

  const syncFromUsdt = (value: string) => {
    setInputSide('usdt');
    setUsdtStr(value);
    const n = parseFundAmount(value);
    if (isUsdtCustomer) {
      setCustomerStr(value);
      return;
    }
    if (n > 0 && numRate > 0) {
      setCustomerStr(formatFundAmount(convertUsdtToCustomer(n, numRate)));
    } else if (!value.trim()) {
      setCustomerStr('');
    }
  };

  const syncFromCustomer = (value: string) => {
    setInputSide('customer');
    setCustomerStr(value);
    const n = parseFundAmount(value);
    if (n > 0 && numRate > 0) {
      setUsdtStr(formatFundAmount(convertCustomerToUsdt(n, numRate)));
    } else if (!value.trim()) {
      setUsdtStr('');
    }
  };

  const syncFromRate = (value: string) => {
    setRateStr(value);
    const r = parseFundAmount(value);
    if (r <= 0) return;
    if (inputSide === 'usdt' && numUsdt > 0) {
      setCustomerStr(formatFundAmount(convertUsdtToCustomer(numUsdt, r)));
    } else if (inputSide === 'customer' && numCustomer > 0) {
      setUsdtStr(formatFundAmount(convertCustomerToUsdt(numCustomer, r)));
    }
  };

  const selectCustomer = (c: Customer) => {
    setCustomerId(c.id);
    setSearch('');
    setFocused(false);
    setUsdtStr('');
    setCustomerStr('');
    setInputSide(c.currency === 'USDT' ? 'usdt' : 'customer');
    if (c.currency !== 'USDT') {
      const avg = computeCustomerAverageUsdtRate(entries, c.id, c.currency || 'AED');
      setRateStr(avg ? formatFundAmount(avg.rate) : '');
    } else {
      setRateStr('');
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !resolved) return;
    setError(null);
    setSubmitting(true);

    const referenceType: FundReferenceType = mode === 'settlement' ? 'settlement' : 'manual';
    const defaultDesc =
      mode === 'settlement'
        ? `Settlement ${direction === 'credit' ? 'received from' : 'paid to'} ${selectedCustomer?.name ?? 'entity'}`
        : `${direction === 'debit' ? 'Receivable' : 'Payable'} — ${selectedCustomer?.name ?? 'entity'}`;

    const result = await onSubmit({
      customerId,
      direction,
      amount: resolved.inputAmount,
      description: description.trim() || defaultDesc,
      entryDate: entryDate || undefined,
      customerCurrency,
      customerCurrencyRate: resolved.customerCurrencyRate,
      inputSide: resolved.inputCurrency === 'USDT' ? 'usdt' : 'customer',
      referenceType,
    });

    setSubmitting(false);
    if (result.success) {
      reset();
      onClose();
    } else {
      setError(result.error ?? 'Failed to post entry');
    }
  };

  const title = mode === 'settlement' ? 'Record settlement' : 'Post journal entry';

  return (
    <Modal open={open} onClose={handleClose} title={title} maxWidth="max-w-lg w-[95vw]">
      <div className="space-y-5 pb-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => { setMode('journal'); setDirection('debit'); }}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${mode === 'journal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Journal line
          </button>
          <button
            type="button"
            onClick={() => { setMode('settlement'); setDirection('credit'); }}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${mode === 'settlement' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Settlement
          </button>
        </div>

        <p className="text-[11px] leading-relaxed text-slate-500">
          {mode === 'journal'
            ? 'Double-entry: debit increases receivable, credit increases payable. Ledger books in USDT.'
            : 'Settlement clears entity balance and moves branch cash (USDT or entity currency).'}
        </p>

        <div className="relative">
          <label className={labelClass}>Entity</label>
          <input
            type="text"
            className={inputClass}
            value={customerId && selectedCustomer ? selectedCustomer.name : search}
            onChange={e => { setCustomerId(''); setSearch(e.target.value); }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Search entities…"
          />
          {showDropdown && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {filtered.length === 0 ? (
                <p className="py-3 text-center text-xs text-slate-400">No entities found</p>
              ) : (
                filtered.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => selectCustomer(c)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-xs font-bold text-slate-600">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{c.name}</span>
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {c.currency || 'AED'}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {customerId && entityTally && Math.abs(entityTally.netUsdt) > 0.0001 && (
          <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
            <p className="font-semibold text-slate-600">Open balance</p>
            <p className="font-mono font-bold text-slate-900">
              {entityTally.receivable ? 'Receivable ' : 'Payable '}
              {fmtFundAmount(Math.abs(entityTally.netUsdt), 'USDT')}
            </p>
            {entityTally.netCustomer != null && !isUsdtCustomer && (
              <p className="font-mono font-bold text-indigo-700">
                = {fmtFundAmount(Math.abs(entityTally.netCustomer), customerCurrency)}
              </p>
            )}
          </div>
        )}

        <div>
          <label className={labelClass}>{mode === 'settlement' ? 'Settlement side' : 'Journal side'}</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection('debit')}
              className={`rounded-xl border px-4 py-3 text-left transition-all ${direction === 'debit' ? 'border-emerald-200 bg-emerald-50 ring-2 ring-emerald-500/20' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
            >
              <p className={`text-xs font-extrabold uppercase tracking-wider ${direction === 'debit' ? 'text-emerald-700' : 'text-slate-400'}`}>Debit</p>
              <p className={`mt-0.5 text-sm font-bold ${direction === 'debit' ? 'text-emerald-800' : 'text-slate-500'}`}>
                {mode === 'settlement' ? 'Branch pays entity' : 'Receivable (Dr)'}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setDirection('credit')}
              className={`rounded-xl border px-4 py-3 text-left transition-all ${direction === 'credit' ? 'border-red-200 bg-red-50 ring-2 ring-red-500/20' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
            >
              <p className={`text-xs font-extrabold uppercase tracking-wider ${direction === 'credit' ? 'text-red-700' : 'text-slate-400'}`}>Credit</p>
              <p className={`mt-0.5 text-sm font-bold ${direction === 'credit' ? 'text-red-800' : 'text-slate-500'}`}>
                {mode === 'settlement' ? 'Entity pays branch' : 'Payable (Cr)'}
              </p>
            </button>
          </div>
        </div>

        {!isUsdtCustomer && (
          <div>
            <label className={labelClass}>Choose Wallet</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInputSide('usdt')}
                className={`rounded-xl border px-3 py-2.5 text-center transition-all ${inputSide === 'usdt' ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                <p className="text-xs font-extrabold uppercase tracking-wider">USDT</p>
              </button>
              <button
                type="button"
                onClick={() => setInputSide('customer')}
                className={`rounded-xl border px-3 py-2.5 text-center transition-all ${inputSide === 'customer' ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                <p className="text-xs font-extrabold uppercase tracking-wider">{customerCurrency}</p>
              </button>
            </div>
          </div>
        )}

        {!isUsdtCustomer && (
          <div>
            <label className={labelClass}>
              Exchange rate <span className="font-normal normal-case tracking-normal text-slate-400">(1 USDT = ? {customerCurrency})</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              className={inputClass}
              value={rateStr}
              onChange={e => syncFromRate(e.target.value)}
              placeholder="Required"
            />
            {avgRateInfo && (
              <p className="mt-1 text-[10px] font-medium text-slate-400">
                Avg from {avgRateInfo.sampleCount} prior transaction{avgRateInfo.sampleCount === 1 ? '' : 's'} · editable
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>USDT amount</label>
            <input
              type="text"
              inputMode="decimal"
              className={`${inputClass}${isUsdtCustomer || inputSide === 'usdt' ? '' : ' bg-slate-50'}`}
              value={usdtStr}
              onChange={e => syncFromUsdt(e.target.value)}
              placeholder="0"
              readOnly={!isUsdtCustomer && inputSide === 'customer' && numRate > 0}
            />
          </div>
          <div>
            <label className={labelClass}>{isUsdtCustomer ? 'USDT (same)' : `${customerCurrency} amount`}</label>
            <input
              type="text"
              inputMode="decimal"
              className={`${inputClass}${!isUsdtCustomer && inputSide === 'customer' ? '' : isUsdtCustomer ? '' : ' bg-slate-50'}`}
              value={isUsdtCustomer ? usdtStr : customerStr}
              onChange={e => (isUsdtCustomer ? syncFromUsdt(e.target.value) : syncFromCustomer(e.target.value))}
              placeholder="0"
              readOnly={!isUsdtCustomer && inputSide === 'usdt' && numRate > 0}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Date</label>
          <input type="date" className={inputClass} value={entryDate} onChange={e => setEntryDate(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>
            Description <span className="font-normal normal-case tracking-normal text-slate-300">(optional)</span>
          </label>
          <input
            type="text"
            className={inputClass.replace('font-mono', '')}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={mode === 'settlement' ? 'e.g. Cash settlement' : 'e.g. Gold sale on credit'}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">{error}</div>
        )}

        {resolved && (
          <div className={`rounded-xl border px-4 py-3 ${direction === 'debit' ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
            <p className={`text-[10px] font-extrabold uppercase tracking-widest ${direction === 'debit' ? 'text-emerald-600' : 'text-red-600'}`}>
              Ledger preview
            </p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-900">
              {direction === 'debit' ? 'Dr' : 'Cr'} {fmtFundAmount(resolved.usdtAmount, 'USDT')}
              {!isUsdtCustomer && (
                <span className="ml-2 text-indigo-700">
                  (= {fmtFundAmount(resolved.customerAmount, customerCurrency)})
                </span>
              )}
            </p>
            {mode === 'settlement' && (
              <p className="mt-1 text-xs text-slate-600">
                Branch {resolved.settlementCurrency} {direction === 'credit' ? '+' : '−'}
                {formatFundAmount(resolved.settlementAmount)}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={handleClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? 'Posting…' : mode === 'settlement' ? 'Post settlement' : 'Post entry'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
