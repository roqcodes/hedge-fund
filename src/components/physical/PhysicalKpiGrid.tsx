'use client';

import React, { useMemo } from 'react';
import type { PhysicalCurrencyTotals, PhysicalKpiMetrics } from '@/lib/physical/kpiMetrics';
import { formatPhysicalUsdt } from '@/lib/physicalCurrencyDisplay';

function fmtGram(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

type MetricCellProps = {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
};

function MetricCell({ label, value, hint, valueClassName = 'text-slate-900' }: MetricCellProps) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums leading-none sm:text-2xl ${valueClassName}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

type UsdtCellProps = {
  label: string;
  totals: PhysicalCurrencyTotals;
  showPlus?: boolean;
  profitTone?: boolean;
};

function UsdtCell({ label, totals, showPlus = false, profitTone = false }: UsdtCellProps) {
  const tone =
    profitTone && totals.aed > 0
      ? 'text-emerald-600'
      : profitTone && totals.aed < 0
        ? 'text-red-600'
        : 'text-slate-900';

  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-1.5 font-mono text-base font-bold tabular-nums leading-tight sm:text-lg ${tone}`}>
        {formatPhysicalUsdt(totals.usdt, { showPlus })}
        <span className="ml-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">USDT</span>
      </p>
    </div>
  );
}

type Props = {
  metrics: PhysicalKpiMetrics;
};

export default function PhysicalKpiGrid({ metrics }: Props) {
  const progressHint = useMemo(() => {
    return `${fmtGram(metrics.soldGram)} g sold · ${fmtGram(metrics.remainingGram)} g in vault`;
  }, [metrics.remainingGram, metrics.soldGram]);

  return (
    <section
      className="mb-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-white"
      aria-label="Physical deals summary metrics"
    >
      <div className="grid divide-slate-100 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:divide-x">
        <div className="border-b border-slate-100 p-4 sm:p-5 md:border-b-0">
          <div className="flex max-sm:flex-col max-sm:gap-4 sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Vault Stock</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
                  {fmtGram(metrics.remainingGram)}
                </span>
                <span className="text-sm font-medium text-slate-500">g on hand</span>
              </div>
            </div>
            <div className="flex gap-5 sm:gap-6 sm:text-right">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Purchased</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-600">
                  {fmtGram(metrics.totalPurchasedGram)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Sold</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-amber-600">{fmtGram(metrics.soldGram)}</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-slate-500">
              <span>Stock movement</span>
              <span className="tabular-nums">{metrics.soldPct}% sold</span>
            </div>
            <div
              className="relative h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuenow={metrics.soldPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Share of purchased gold already sold"
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-[width] duration-500 ease-out"
                style={{ width: `${metrics.soldPct}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400 max-sm:truncate sm:whitespace-normal">
              <span className="sm:hidden">
                {fmtGram(metrics.soldGram)} sold · {fmtGram(metrics.remainingGram)} left
              </span>
              <span className="hidden sm:inline">{progressHint}</span>
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Deals · selected range</p>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 sm:gap-x-6">
            <MetricCell label="Total Deals" value={String(metrics.totalDeals)} hint="buys" />
            <MetricCell
              label="Fix"
              value={`${fmtGram(metrics.fixVolumeGram)} g`}
              hint={`${metrics.fixCount} deals · fixed price`}
              valueClassName="text-indigo-700"
            />
            <MetricCell
              label="Unfix"
              value={`${fmtGram(metrics.unfixVolumeGram)} g`}
              hint={`${metrics.unfixCount} deals · open price`}
              valueClassName="text-violet-700"
            />
            <MetricCell
              label="Sales"
              value={String(metrics.totalSales)}
              hint="sells"
              valueClassName="text-emerald-700"
            />
          </div>

          <div className="my-4 border-t border-dashed border-slate-200" />

          <div className="grid grid-cols-3 gap-x-4 gap-y-5 sm:gap-x-6">
            <UsdtCell label="Buy Value" totals={metrics.buyValue} />
            <UsdtCell label="Sell Value" totals={metrics.sellValue} />
            <UsdtCell label="P&L" totals={metrics.pl} showPlus profitTone />
          </div>
        </div>
      </div>
    </section>
  );
}
