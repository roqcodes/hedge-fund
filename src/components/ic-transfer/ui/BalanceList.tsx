'use client';

import React from 'react';

export type BalanceItem = {
  label: string;
  value: string;
  tone?: 'blue' | 'green' | 'orange';
};

const toneDot = {
  blue: 'bg-sky-500',
  green: 'bg-emerald-500',
  orange: 'bg-amber-500',
};

/** Compact balance list — fits content, no stretched cards */
export default function BalanceList({ items }: { items: BalanceItem[] }) {
  return (
    <div className="flex flex-col px-4 py-3 lg:px-3 lg:py-2.5">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`flex flex-col gap-0.5 py-2 ${i > 0 ? 'border-t border-slate-100' : ''}`}
        >
          <div className="flex items-center gap-1.5">
            <span className={`size-1.5 shrink-0 rounded-full ${toneDot[item.tone || 'blue']}`} aria-hidden />
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {item.label}
            </span>
          </div>
          <p className="pl-3 font-mono text-sm font-bold tabular-nums leading-tight text-slate-900">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/** @deprecated Use BalanceList via SummaryPanel */
export function balanceIcon() {
  return null;
}
