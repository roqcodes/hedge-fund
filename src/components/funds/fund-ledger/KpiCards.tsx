'use client';

import React from 'react';
import { kpiCard, kpiGrid } from '@/lib/ui';

interface KpiCardsProps {
  totalReceivable: number;
  totalPayable: number;
  netPosition: number;
  entityCount: number;
  loading: boolean;
}

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function KpiCards({
  totalReceivable,
  totalPayable,
  netPosition,
  entityCount,
  loading,
}: KpiCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-[124px] animate-pulse rounded-3xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className={`${kpiGrid} mb-8`}>
      <KpiCard
        label="Total Receivables (USDT)"
        value={fmt(totalReceivable)}
        sub="What entities owe the branch"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        }
        color="#059669"
        bgColor="#d1fae5"
        valueClass="text-emerald-600"
      />
      <KpiCard
        label="Total Payables (USDT)"
        value={fmt(totalPayable)}
        sub="What the branch owes entities"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        }
        color="#dc2626"
        bgColor="#fee2e2"
        valueClass="text-red-600"
      />
      <KpiCard
        label="Net Position (USDT)"
        value={fmt(netPosition)}
        sub={netPosition >= 0 ? 'Branch is net owed' : 'Branch owes net'}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 21h18M3 10h18M5 21V10m14 11V10M2 7l10-5 10 5M10 14h4v7h-4z" />
          </svg>
        }
        color={netPosition >= 0 ? '#059669' : '#dc2626'}
        bgColor={netPosition >= 0 ? '#d1fae5' : '#fee2e2'}
        valueClass={netPosition >= 0 ? 'text-emerald-600' : 'text-red-600'}
      />
      <KpiCard
        label="Active Entities"
        value={entityCount.toString()}
        sub="With open balances"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        }
        color="#6366f1"
        bgColor="#eef2ff"
        valueClass="text-indigo-600"
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  color,
  bgColor,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  valueClass?: string;
}) {
  return (
    <div className={kpiCard}>
      <div className="text-[11px] font-semibold text-slate-600 sm:text-xs">{label}</div>
      <p className={`mt-1 truncate text-base font-extrabold tabular-nums tracking-tight sm:text-lg ${valueClass ?? 'text-slate-900'}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-[11px] font-medium text-slate-500">{sub}</p>}
      <div
        className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-xl [&_svg]:size-4 sm:right-3.5 sm:top-3.5"
        style={{ backgroundColor: bgColor, color }}
        aria-hidden
      >
        {icon}
      </div>
    </div>
  );
}
