'use client';

import { type RefObject } from 'react';
import { formatAEDStr } from '@/data/mockData';
import { useApp } from '@/context/AppContext';
import { useElementInView, EMPTY_REF } from '@/hooks/useElementInView';
import type { EntityLedgerTabTotals } from '@/lib/ledgers';

function formatSum(amount: number) {
  return formatAEDStr(amount);
}

function NetInfo({ label, hint, amount }: { label: string; hint: string; amount: number }) {
  return (
    <div className="flex flex-col gap-0.5 sm:items-end">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
        <span
          className="inline-flex size-4 cursor-help items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500"
          title={hint}
          aria-label={hint}
        >
          i
        </span>
      </span>
      <span className={`font-mono text-sm font-bold ${amount >= 0 ? 'text-slate-900' : 'text-amber-700'}`}>
        {formatSum(amount)}
      </span>
    </div>
  );
}

type Props = {
  totals: EntityLedgerTabTotals;
  /** Dock to viewport bottom on the funds page. */
  fixed?: boolean;
  /** Transactions table container — bar shows only while this is in view. */
  tableRef?: RefObject<HTMLElement | null>;
  watchKey?: string | number | boolean;
};

export default function LedgerTabSummaryBar({ totals, fixed = false, tableRef, watchKey }: Props) {
  const { sidebarCollapsed } = useApp();
  const tableInView = useElementInView(tableRef ?? EMPTY_REF, fixed && !!tableRef, watchKey);
  const dockVisible = !fixed || !tableRef || tableInView;

  const inner = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6">
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{totals.outLabel}</span>
        <span className="font-mono text-sm font-bold text-slate-900">{formatSum(totals.outTotal)}</span>
      </div>
      <div className="flex flex-col gap-0.5 sm:items-end">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{totals.inLabel}</span>
        <span className="font-mono text-sm font-bold text-slate-900">{formatSum(totals.inTotal)}</span>
      </div>
      <div
        className={`col-span-2 flex flex-col gap-0.5 sm:col-span-1 ${
          fixed ? 'border-t border-slate-200 pt-3 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0' : 'border-t border-slate-200 pt-3 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0'
        }`}
      >
        <NetInfo label={totals.netLabel} hint={totals.netHint} amount={totals.net} />
      </div>
    </div>
  );

  if (fixed) {
    return (
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/90 shadow-[0_-4px_16px_-6px_rgba(15,23,42,0.1)] backdrop-blur-xl transition-[transform,left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          sidebarCollapsed ? 'lg:left-[80px]' : 'lg:left-[240px]'
        } ${dockVisible ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}
        aria-hidden={!dockVisible}
      >
        <div className="mx-auto w-full max-w-[1680px] px-4 py-3 sm:px-6 lg:px-8">
          {inner}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      {inner}
    </div>
  );
}
