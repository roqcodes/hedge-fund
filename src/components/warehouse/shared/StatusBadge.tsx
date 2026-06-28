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
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}
