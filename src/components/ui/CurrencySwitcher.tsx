'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { filterSelect } from '@/lib/ui';
import { getCurrencyName } from '@/lib/worldCurrencies';
import type { CurrencyCode } from '@/lib/currency';

function formatRate(rate: number | undefined): string {
  if (rate == null) return '—';
  if (rate >= 100) return rate.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (rate >= 1) return rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return rate.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

function formatFetchedAt(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RatesHoverCard({
  enabledCurrencies,
  activeCurrency,
  currencyRates,
  currencyRatesLive,
  currencyRatesFetchedAt,
}: {
  enabledCurrencies: CurrencyCode[];
  activeCurrency: CurrencyCode;
  currencyRates: Record<string, number>;
  currencyRatesLive: boolean;
  currencyRatesFetchedAt: string | null;
}) {
  return (
    <div className="pointer-events-none invisible absolute right-0 top-[calc(100%+8px)] z-[400] w-56 origin-top-right scale-95 rounded-xl border border-slate-200/90 bg-white p-3 opacity-0 shadow-dropdown transition-all duration-200 group-hover:visible group-hover:scale-100 group-hover:opacity-100">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exchange rates</span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            currencyRatesLive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          <span className={`size-1.5 rounded-full ${currencyRatesLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {currencyRatesLive ? 'Live' : 'Fallback'}
        </span>
      </div>
      <p className="mb-2 text-[10px] text-slate-400">Base: AED · {formatFetchedAt(currencyRatesFetchedAt)}</p>
      <ul className="space-y-1.5">
        {enabledCurrencies.map(code => {
          const rate = currencyRates[code] ?? (code === 'AED' ? 1 : undefined);
          const isActive = code === activeCurrency;
          return (
            <li
              key={code}
              className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs ${
                isActive ? 'bg-slate-50 font-semibold text-slate-900' : 'text-slate-600'
              }`}
            >
              <span className="truncate">
                <span className="font-bold">{code}</span>
                <span className="ml-1 text-slate-400">{getCurrencyName(code)}</span>
              </span>
              <span className="shrink-0 font-mono text-[11px]">{formatRate(rate)}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] leading-relaxed text-slate-400">
        1 AED = rate shown above
      </p>
    </div>
  );
}

export default function CurrencySwitcher() {
  const {
    activeCurrency,
    setActiveCurrency,
    enabledCurrencies,
    currencyRates,
    currencyRatesLive,
    currencyRatesFetchedAt,
  } = useApp();

  if (!enabledCurrencies || enabledCurrencies.length <= 1) {
    return null;
  }

  return (
    <div className="group relative shrink-0">
      <select
        value={activeCurrency}
        onChange={e => setActiveCurrency(e.target.value as CurrencyCode)}
        className={`${filterSelect} w-full sm:hidden`}
        aria-label="Select currency"
      >
        {enabledCurrencies.map(curr => (
          <option key={curr} value={curr}>
            {curr} — {getCurrencyName(curr)}
          </option>
        ))}
      </select>

      <div className="hidden shrink-0 items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-100 p-0.5 shadow-sm sm:flex">
        {enabledCurrencies.map(curr => {
          const isActive = activeCurrency === curr;
          return (
            <button
              key={curr}
              type="button"
              onClick={() => setActiveCurrency(curr)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                isActive
                  ? 'bg-white font-black text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-900'
              }`}
            >
              {curr}
            </button>
          );
        })}
      </div>

      <RatesHoverCard
        enabledCurrencies={enabledCurrencies}
        activeCurrency={activeCurrency}
        currencyRates={currencyRates}
        currencyRatesLive={currencyRatesLive}
        currencyRatesFetchedAt={currencyRatesFetchedAt}
      />
    </div>
  );
}
