'use client';

import React from 'react';
import Link from 'next/link';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { btnSecondary, formInput, pageHeader, pageSubtitle, pageTitle } from '@/lib/ui';

type Props = {
  title: string;
  subtitle: string;
  backHref: string;
  backLabel?: string;
  dateFilter: string;
  setDateFilter: (v: string) => void;
  customStartDate: string;
  setCustomStartDate: (v: string) => void;
  customEndDate: string;
  setCustomEndDate: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
  children: React.ReactNode;
};

export default function FinanceReportLayout({
  title,
  subtitle,
  backHref,
  backLabel = 'All Reports',
  dateFilter,
  setDateFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  search,
  setSearch,
  onRefresh,
  loading,
  children,
}: Props) {
  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] space-y-6">
      <header className={pageHeader}>
        <div className="min-w-0 space-y-2">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 no-underline hover:text-accent"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {backLabel}
          </Link>
          <h1 className={pageTitle}>{title}</h1>
          <p className={pageSubtitle}>{subtitle}</p>
        </div>
        {onRefresh && (
          <button type="button" className={btnSecondary} onClick={onRefresh} disabled={loading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        )}
      </header>

      <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-surface sm:p-6">
        <div className="min-w-0">
          <label htmlFor="report-search" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Search
          </label>
          <input
            id="report-search"
            className={formInput}
            placeholder="Customer, txn ID, particulars…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <DateFilterBar
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
        />
      </div>

      {children}
    </div>
  );
}
