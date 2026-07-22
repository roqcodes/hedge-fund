'use client';

import React from 'react';
import { kpiCard, sectionEyebrow } from '@/lib/ui';

interface BranchBalances {
  usdt: number;
  aed: number;
  idr: number;
}

interface FundLedgerKpiSectionProps {
  branchBalances: BranchBalances | null;
  totalReceivable: number;
  totalPayable: number;
  netPosition: number;
  entityCount: number;
  loading: boolean;
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function StatCard({
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
    <article className={`${kpiCard} relative`}>
      <p className="text-[11px] font-semibold text-slate-600 sm:text-xs">{label}</p>
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
    </article>
  );
}

export default function FundLedgerKpiSection({
  branchBalances,
  totalReceivable,
  totalPayable,
  netPosition,
  entityCount,
  loading,
}: FundLedgerKpiSectionProps) {
  if (loading) {
    return (
      <section className="mb-8" aria-label="Fund summary">
        <p className={sectionEyebrow}>Branch summary</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-[108px] animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      </section>
    );
  }

  const dash = '\u2014';

  return (
    <section className="mb-8" aria-label="Fund summary">
      <div className="mb-3">
        <p className={sectionEyebrow}>Branch summary</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 [&>*]:motion-safe:animate-fade-in-up">
        <StatCard
          label="USDT capital"
          value={branchBalances ? fmt(branchBalances.usdt) : dash}
          sub="Available fund"
          color="#6366f1"
          bgColor="#eef2ff"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12M8 10h8M8 14h8" />
            </svg>
          }
        />
        <StatCard
          label="AED balance"
          value={branchBalances ? fmt(branchBalances.aed) : dash}
          sub="Cash on hand"
          color="#059669"
          bgColor="#d1fae5"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          label="IDR balance"
          value={branchBalances ? fmt(branchBalances.idr) : dash}
          sub="Cash on hand"
          color="#ca8a04"
          bgColor="#fef9c3"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          label="Receivables"
          value={fmt(totalReceivable)}
          sub="Entities owe branch"
          color="#059669"
          bgColor="#d1fae5"
          valueClass="text-emerald-600"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          }
        />
        <StatCard
          label="Payables"
          value={fmt(totalPayable)}
          sub="Branch owes entities"
          color="#dc2626"
          bgColor="#fee2e2"
          valueClass="text-red-600"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          }
        />
        <StatCard
          label="Net position"
          value={fmt(netPosition)}
          sub={netPosition >= 0 ? 'Branch is net owed' : 'Branch owes net'}
          color={netPosition >= 0 ? '#059669' : '#dc2626'}
          bgColor={netPosition >= 0 ? '#d1fae5' : '#fee2e2'}
          valueClass={netPosition >= 0 ? 'text-emerald-600' : 'text-red-600'}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 21h18M3 10h18M5 21V10m14 11V10M2 7l10-5 10 5M10 14h4v7h-4z" />
            </svg>
          }
        />
        <StatCard
          label="Active entities"
          value={entityCount.toString()}
          sub="With open balances"
          color="#6366f1"
          bgColor="#eef2ff"
          valueClass="text-indigo-600"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          }
        />
      </div>
    </section>
  );
}
