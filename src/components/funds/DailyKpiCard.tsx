'use client';

import React from 'react';
import { kpiCard } from '@/lib/ui';

type Props = {
  label: string;
  opening: React.ReactNode;
  closing: React.ReactNode;
  openingValue?: number;
  closingValue?: number;
  icon: React.ReactNode;
  color?: string;
  bgColor?: string;
  locked?: boolean;
};

function formatDelta(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DailyKpiCard({
  label,
  opening,
  closing,
  openingValue,
  closingValue,
  icon,
  color = 'var(--accent)',
  bgColor = 'var(--accent-light)',
  locked = false,
}: Props) {
  const hasNumericDelta =
    typeof openingValue === 'number' &&
    typeof closingValue === 'number' &&
    !Number.isNaN(openingValue) &&
    !Number.isNaN(closingValue);
  const delta = hasNumericDelta ? closingValue - openingValue : null;

  return (
    <article className={`${kpiCard} relative`}>
      <div className="flex items-start justify-between gap-2 pr-11">
        <h3 className="text-[11px] font-semibold text-slate-600 sm:text-xs">{label}</h3>
        {locked && (
          <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
            Locked
          </span>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Opening</dt>
          <dd className="truncate text-sm font-extrabold tabular-nums text-slate-800 sm:text-base">{opening}</dd>
        </div>
        <div className="flex flex-col gap-0.5 border-l border-slate-100 pl-3">
          <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Closing</dt>
          <dd className="truncate text-sm font-extrabold tabular-nums text-slate-900 sm:text-base">{closing}</dd>
        </div>
      </dl>

      {delta !== null && delta !== 0 && (
        <p
          className={`mt-2 text-[11px] font-semibold tabular-nums ${
            delta > 0 ? 'text-emerald-700' : 'text-amber-800'
          }`}
        >
          Movement {formatDelta(delta)}
        </p>
      )}

      <div
        className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-xl [&_svg]:size-4"
        style={{ backgroundColor: bgColor, color }}
        aria-hidden
      >
        {icon}
      </div>
    </article>
  );
}
