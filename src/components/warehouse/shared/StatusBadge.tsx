'use client';

import React from 'react';
import type { DeliveryStatus, OrderPriority } from '@/types/warehouse';

/* ─── Delivery Status Badge ───────────────────────────────────────── */

const STATUS_STYLES: Record<string, string> = {
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Partial:   'bg-amber-50   text-amber-700   border-amber-200',
  Cancelled: 'bg-red-50     text-red-700     border-red-200',
  Pending:   'bg-slate-50   text-slate-600   border-slate-200',
};

interface StatusBadgeProps {
  status: DeliveryStatus | null | undefined;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = status || 'Pending';
  const cls = STATUS_STYLES[label] ?? STATUS_STYLES.Pending;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}

/* ─── Priority Badge ──────────────────────────────────────────────── */

const PRIORITY_STYLES: Record<string, string> = {
  High:   'bg-red-50   text-red-700   border-red-200',
  Low:    'bg-blue-50  text-blue-700  border-blue-200',
  Normal: 'bg-slate-100 text-slate-600 border-slate-200',
};

interface PriorityBadgeProps {
  priority: OrderPriority | null | undefined;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const label = priority || 'Normal';
  const cls = PRIORITY_STYLES[label] ?? PRIORITY_STYLES.Normal;

  if (label === 'High') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border-2 border-red-400 bg-red-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-red-700 shadow-sm"
        title="High priority — process first"
      >
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        High Priority
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}
