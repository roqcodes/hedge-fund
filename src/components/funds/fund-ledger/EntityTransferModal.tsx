'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { computeEntityTally, computeCustomerAverageUsdtRate, fmtFundAmount } from '@/lib/fundLedgerCurrency';
import {
  convertUsdtToCustomer,
  formatFundAmount,
  parseFundAmount,
  resolveEntityTransferUsdt,
  type EntityTransferInputSide,
} from '@/lib/fundLedgerAmounts';
import type { Customer, FundEntityLedgerEntry } from '@/types';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all';

const inputClassLg =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-lg font-mono font-bold text-slate-900 placeholder:text-slate-300 placeholder:font-normal focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all';

const labelClass = 'mb-1.5 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400';

type PayCurrency = 'usdt' | 'receiver';

export type EntityTransferSubmitParams = {
  fromCustomerId: string;
  toCustomerId: string;
  inputSide: EntityTransferInputSide;
  inputAmount: number;
  fromCustomerCurrencyRate?: number;
  toCustomerCurrencyRate?: number;
  description?: string;
  entryDate?: string;
};

interface EntityTransferModalProps {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  entries: FundEntityLedgerEntry[];
  preselectedFromId?: string;
  onSubmit: (params: EntityTransferSubmitParams) => Promise<{ success: boolean; error?: string }>;
}

function EntityPartyPicker({
  role,
  value,
  onSelect,
  customers,
  excludeId,
  tally,
}: {
  role: 'from' | 'to';
  value: string;
  onSelect: (customerId: string) => void;
  customers: Customer[];
  excludeId?: string;
  tally: ReturnType<typeof computeEntityTally> | null;
}) {
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selected = customers.find(c => c.id === value);
  const filtered = customers.filter(
    c => c.id !== excludeId && c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const isFrom = role === 'from';
  const accent = isFrom ? 'border-red-200 bg-red-50/40' : 'border-emerald-200 bg-emerald-50/40';
  const badge = isFrom ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700';
  const roleLabel = isFrom ? 'From · pays' : 'To · receives';

  return (
    <div className={`rounded-2xl border p-4 ${accent}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${badge}`}>
          {roleLabel}
        </span>
        {selected && (
          <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
            {selected.currency || 'AED'}
          </span>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          className={inputClass.replace('font-mono', '')}
          value={value && selected ? selected.name : search}
          onChange={e => { onSelect(''); setSearch(e.target.value); }}
          onFocus={() => { if (blurTimer.current) clearTimeout(blurTimer.current); setFocused(true); }}
          onBlur={() => { blurTimer.current = setTimeout(() => setFocused(false), 180); }}
          placeholder={isFrom ? 'Search sender…' : 'Search receiver…'}
        />
        {focused && !value && (
          <div className="absolute z-10 mt-1 max-h-44 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {filtered.length === 0 ? (
              <p className="py-3 text-center text-xs text-slate-400">No entities</p>
            ) : (
              filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={() => { onSelect(c.id); setSearch(''); setFocused(false); }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-slate-50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-slate-900">{c.name}</span>
                  <span className="ml-auto text-[10px] font-bold uppercase text-slate-400">{c.currency || 'AED'}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selected && tally && Math.abs(tally.netUsdt) > 0.0001 && (
        <div className="mt-3 rounded-xl border border-white/80 bg-white/70 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Open balance</p>
          <p className="font-mono text-sm font-bold text-slate-900">
            {tally.receivable ? 'Receivable ' : 'Payable '}
            {fmtFundAmount(Math.abs(tally.netUsdt), 'USDT')}
          </p>
          {tally.netCustomer != null && selected.currency !== 'USDT' && (
            <p className="font-mono text-xs font-bold text-indigo-700">
              = {fmtFundAmount(Math.abs(tally.netCustomer), selected.currency || 'AED')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function EntityTransferModal({
  open,
  onClose,
  customers,
  entries,
  preselectedFromId,
  onSubmit,
}: EntityTransferModalProps) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [payCurrency, setPayCurrency] = useState<PayCurrency>('usdt');
  const [amountStr, setAmountStr] = useState('');
  const [fromRateStr, setFromRateStr] = useState('');
  const [toRateStr, setToRateStr] = useState('');
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromCustomer = customers.find(c => c.id === fromId);
  const toCustomer = customers.find(c => c.id === toId);
  const fromCurrency = fromCustomer?.currency || 'AED';
  const toCurrency = toCustomer?.currency || 'AED';
  const fromIsUsdt = fromCurrency === 'USDT';
  const toIsUsdt = toCurrency === 'USDT';
  const partiesReady = Boolean(fromId && toId && fromId !== toId);

  const fromTally = useMemo(
    () => (fromId ? computeEntityTally(entries, fromId, fromCurrency) : null),
    [fromId, entries, fromCurrency],
  );
  const toTally = useMemo(
    () => (toId ? computeEntityTally(entries, toId, toCurrency) : null),
    [toId, entries, toCurrency],
  );

  useEffect(() => {
    if (!open) return;
    setFromId(preselectedFromId ?? '');
    setToId('');
    setPayCurrency('usdt');
    setAmountStr('');
    setFromRateStr('');
    setToRateStr('');
    setDescription('');
    setEntryDate(new Date().toISOString().slice(0, 10));
    setError(null);
  }, [open, preselectedFromId]);

  useEffect(() => {
    if (toIsUsdt) setPayCurrency('usdt');
  }, [toIsUsdt]);

  useEffect(() => {
    setAmountStr('');
    if (fromId && !fromIsUsdt) {
      const avg = computeCustomerAverageUsdtRate(entries, fromId, fromCurrency);
      setFromRateStr(avg ? formatFundAmount(avg.rate) : '');
    } else {
      setFromRateStr('');
    }
    if (toId && !toIsUsdt) {
      const avg = computeCustomerAverageUsdtRate(entries, toId, toCurrency);
      setToRateStr(avg ? formatFundAmount(avg.rate) : '');
    } else {
      setToRateStr('');
    }
  }, [fromId, toId, fromIsUsdt, toIsUsdt, fromCurrency, toCurrency, entries]);

  const fromAvgInfo = useMemo(
    () => (fromId && !fromIsUsdt ? computeCustomerAverageUsdtRate(entries, fromId, fromCurrency) : null),
    [fromId, fromIsUsdt, fromCurrency, entries],
  );
  const toAvgInfo = useMemo(
    () => (toId && !toIsUsdt ? computeCustomerAverageUsdtRate(entries, toId, toCurrency) : null),
    [toId, toIsUsdt, toCurrency, entries],
  );

  const fromRate = fromIsUsdt ? 1 : parseFundAmount(fromRateStr);
  const toRate = toIsUsdt ? 1 : parseFundAmount(toRateStr);
  const inputAmount = parseFundAmount(amountStr);
  const inputSide: EntityTransferInputSide = payCurrency === 'usdt' ? 'usdt' : 'to';

  const usdtAmount = useMemo(() => {
    if (!partiesReady) return null;
    return resolveEntityTransferUsdt({
      inputSide,
      inputAmount,
      fromCurrency,
      fromRate,
      toCurrency,
      toRate,
    });
  }, [partiesReady, inputSide, inputAmount, fromCurrency, fromRate, toCurrency, toRate]);

  const fromLegAmount = usdtAmount != null && usdtAmount > 0
    ? (fromIsUsdt ? usdtAmount : convertUsdtToCustomer(usdtAmount, fromRate))
    : null;
  const toLegAmount = usdtAmount != null && usdtAmount > 0
    ? (toIsUsdt ? usdtAmount : convertUsdtToCustomer(usdtAmount, toRate))
    : null;

  const needsToRate = partiesReady && !toIsUsdt;
  const needsFromRate = partiesReady && !fromIsUsdt;
  const toRateValid = !needsToRate || toRate > 0;
  const fromRateValid = !needsFromRate || fromRate > 0;

  const canSubmit = partiesReady
    && usdtAmount != null
    && usdtAmount > 0
    && inputAmount > 0
    && toRateValid
    && fromRateValid
    && !submitting;

  const payCurrencyLabel = payCurrency === 'usdt' ? 'USDT' : toCurrency;
  const amountLabel = payCurrency === 'usdt'
    ? 'Cash sent (USDT)'
    : `Cash sent (${toCurrency})`;

  const handleSubmit = async () => {
    if (!canSubmit || !usdtAmount) return;
    setSubmitting(true);
    setError(null);

    const result = await onSubmit({
      fromCustomerId: fromId,
      toCustomerId: toId,
      inputSide,
      inputAmount,
      fromCustomerCurrencyRate: fromIsUsdt ? 1 : fromRate,
      toCustomerCurrencyRate: toIsUsdt ? 1 : toRate,
      description: description.trim() || undefined,
      entryDate: entryDate || undefined,
    });

    setSubmitting(false);
    if (result.success) onClose();
    else setError(result.error ?? 'Failed to post transfer');
  };

  return (
    <Modal open={open} onClose={onClose} title="Entity transfer" maxWidth="max-w-lg w-[95vw]">
      <div className="space-y-5 pb-4">
        <p className="text-[11px] leading-relaxed text-slate-500">
          Send real cash value between entities on the ledger. Branch balances are not touched — this only clears or shifts what one entity owes another.
        </p>

        {/* Parties */}
        <div className="space-y-2">
          <p className={labelClass}>1 · Parties</p>
          <EntityPartyPicker
            role="from"
            value={fromId}
            onSelect={setFromId}
            customers={customers}
            excludeId={toId}
            tally={fromTally}
          />

          <div className="flex justify-center py-0.5" aria-hidden>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14" />
                <path d="M8 12l4 4 4-4" />
              </svg>
            </div>
          </div>

          <EntityPartyPicker
            role="to"
            value={toId}
            onSelect={setToId}
            customers={customers}
            excludeId={fromId}
            tally={toTally}
          />
        </div>

        {/* Payment — only after parties selected */}
        {partiesReady && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <p className={labelClass}>2 · Payment</p>

            {!toIsUsdt && (
              <div>
                <label className={labelClass}>Pay in</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setPayCurrency('usdt'); setAmountStr(''); }}
                    className={`rounded-xl border px-3 py-2.5 text-center transition-all ${
                      payCurrency === 'usdt'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-white'
                    }`}
                  >
                    <p className="text-xs font-extrabold uppercase tracking-wider">USDT</p>
                    <p className={`mt-0.5 text-[10px] font-medium ${payCurrency === 'usdt' ? 'text-slate-300' : 'text-slate-400'}`}>
                      Stablecoin
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPayCurrency('receiver'); setAmountStr(''); }}
                    className={`rounded-xl border px-3 py-2.5 text-center transition-all ${
                      payCurrency === 'receiver'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-white'
                    }`}
                  >
                    <p className="text-xs font-extrabold uppercase tracking-wider">{toCurrency}</p>
                    <p className={`mt-0.5 text-[10px] font-medium ${payCurrency === 'receiver' ? 'text-slate-300' : 'text-slate-400'}`}>
                      Receiver currency
                    </p>
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className={labelClass}>{amountLabel}</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  className={inputClassLg}
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  {payCurrencyLabel}
                </span>
              </div>
            </div>

            {(needsToRate || needsFromRate) && (
              <div className={`grid gap-3 ${needsToRate && needsFromRate ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                {needsToRate && (
                  <div>
                    <label className={labelClass}>
                      Receiver rate
                      <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">
                        (1 USDT = ? {toCurrency})
                      </span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={inputClass}
                      value={toRateStr}
                      onChange={e => setToRateStr(e.target.value)}
                      placeholder="Required"
                    />
                    {toAvgInfo && (
                      <p className="mt-1 text-[10px] font-medium text-slate-400">
                        Avg from {toAvgInfo.sampleCount} prior transaction{toAvgInfo.sampleCount === 1 ? '' : 's'} · editable
                      </p>
                    )}
                  </div>
                )}
                {needsFromRate && (
                  <div>
                    <label className={labelClass}>
                      Sender rate
                      <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">
                        (1 USDT = ? {fromCurrency})
                      </span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={inputClass}
                      value={fromRateStr}
                      onChange={e => setFromRateStr(e.target.value)}
                      placeholder="Required"
                    />
                    {fromAvgInfo && (
                      <p className="mt-1 text-[10px] font-medium text-slate-400">
                        Avg from {fromAvgInfo.sampleCount} prior transaction{fromAvgInfo.sampleCount === 1 ? '' : 's'} · editable
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {usdtAmount != null && usdtAmount > 0 && (
              <div className="rounded-xl border border-white bg-white px-4 py-3 text-xs shadow-sm">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Conversion</p>
                <div className="mt-2 space-y-1.5 font-mono">
                  <p className="font-bold text-slate-900">
                    Ledger base · {fmtFundAmount(usdtAmount, 'USDT')}
                  </p>
                  {!toIsUsdt && toLegAmount != null && (
                    <p className="font-bold text-emerald-700">
                      {toCustomer?.name} receives · {fmtFundAmount(toLegAmount, toCurrency)}
                    </p>
                  )}
                  {!fromIsUsdt && fromLegAmount != null && (
                    <p className="font-bold text-red-700">
                      {fromCustomer?.name} credited · {fmtFundAmount(fromLegAmount, fromCurrency)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!partiesReady && (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center">
            <p className="text-xs font-semibold text-slate-400">Select sender and receiver to enter payment</p>
          </div>
        )}

        {/* Details */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              className={inputClass.replace('font-mono', '')}
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              Reference <span className="font-normal normal-case tracking-normal text-slate-300">(optional)</span>
            </label>
            <input
              type="text"
              className={inputClass.replace('font-mono', '')}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Inter-entity settlement"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
            {error}
          </div>
        )}

        {canSubmit && fromCustomer && toCustomer && usdtAmount != null && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">Journal preview</p>
            <div className="mt-2 space-y-1 font-mono text-sm">
              <p className="font-bold text-red-800">
                Cr {fromCustomer.name}
                {' · '}
                {fmtFundAmount(usdtAmount, 'USDT')}
                {!fromIsUsdt && fromLegAmount != null && (
                  <span className="ml-1 text-xs text-red-600/80">
                    ({fmtFundAmount(fromLegAmount, fromCurrency)})
                  </span>
                )}
              </p>
              <p className="font-bold text-emerald-800">
                Dr {toCustomer.name}
                {' · '}
                {fmtFundAmount(usdtAmount, 'USDT')}
                {!toIsUsdt && toLegAmount != null && (
                  <span className="ml-1 text-xs text-emerald-600/80">
                    ({fmtFundAmount(toLegAmount, toCurrency)})
                  </span>
                )}
              </p>
            </div>
            <p className="mt-2 text-[10px] text-indigo-600/80">No branch cash movement</p>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {submitting ? 'Posting…' : 'Post transfer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
