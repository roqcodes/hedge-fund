'use client';

import React from 'react';
import type { Ledger } from '@/types';
import type { DayRangeKpiDisplay } from '@/lib/dailyClose';
import { formatAED } from '@/data/mockData';
import DailyKpiCard from '@/components/funds/DailyKpiCard';
import { sectionEyebrow } from '@/lib/ui';
import { useLedgerKpiInvert } from '@/hooks/useLedgerKpiInvert';

type Props = {
  periodKpis: DayRangeKpiDisplay;
  branchLedgers: Ledger[];
};

function formatPeriodLabel(period: DayRangeKpiDisplay) {
  if (period.isSingleDay) {
    return new Date(`${period.startDate}T12:00:00Z`).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  const a = new Date(`${period.startDate}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const b = new Date(`${period.endDate}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${a} – ${b}`;
}

export default function TransactionBetaKpiSection({ periodKpis, branchLedgers }: Props) {
  const kpiLedgers = branchLedgers.filter(l => l.isKpi);
  const { displayAmount } = useLedgerKpiInvert(branchLedgers);

  return (
    <section className="mb-8" aria-label="Period summary">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={sectionEyebrow}>Period summary</p>
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">{formatPeriodLabel(periodKpis)}</h2>
          <p className="mt-1 text-xs text-slate-500">
            Opening = start-of-period · Closing = end-of-period
            {periodKpis.endClosed ? ' · Period locked' : ''}
          </p>
        </div>
        {periodKpis.endClosed && (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Closed period
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 [&>*]:motion-safe:animate-fade-in-up">
        <DailyKpiCard
          label="Branch fund"
          opening={formatAED(periodKpis.opening.branchFund)}
          closing={formatAED(periodKpis.closing.branchFund)}
          openingValue={periodKpis.opening.branchFund}
          closingValue={periodKpis.closing.branchFund}
          locked={periodKpis.endClosed}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 21h18M3 10h18M5 21V10m14 11V10M2 7l10-5 10 5M10 14h4v7h-4z" />
            </svg>
          }
          color="var(--accent)"
          bgColor="var(--accent-light)"
        />
        <DailyKpiCard
          label="Gold volume"
          opening={`${periodKpis.opening.gold.toFixed(2)}g`}
          closing={`${periodKpis.closing.gold.toFixed(2)}g`}
          openingValue={periodKpis.opening.gold}
          closingValue={periodKpis.closing.gold}
          locked={periodKpis.endClosed}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          }
          color="#ca8a04"
          bgColor="#fef9c3"
        />
        <DailyKpiCard
          label="Cash in locker"
          opening={formatAED(periodKpis.opening.cashInLocker)}
          closing={formatAED(periodKpis.closing.cashInLocker)}
          openingValue={periodKpis.opening.cashInLocker}
          closingValue={periodKpis.closing.cashInLocker}
          locked={periodKpis.endClosed}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          }
          color="var(--success)"
          bgColor="var(--success-light)"
        />
        {kpiLedgers.map(ledger => {
          const open = periodKpis.opening.ledgerBalances[ledger.id] || 0;
          const close = periodKpis.closing.ledgerBalances[ledger.id] || 0;
          const displayOpen = displayAmount(ledger.id, open);
          const displayClose = displayAmount(ledger.id, close);
          return (
            <DailyKpiCard
              key={ledger.id}
              label={ledger.name}
              opening={formatAED(displayOpen)}
              closing={formatAED(displayClose)}
              openingValue={displayOpen}
              closingValue={displayClose}
              locked={periodKpis.endClosed}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
              color={
                ledger.impact === 'positive'
                  ? 'var(--success)'
                  : ledger.impact === 'negative'
                    ? 'var(--warning)'
                    : 'var(--info)'
              }
              bgColor={
                ledger.impact === 'positive'
                  ? 'var(--success-light)'
                  : ledger.impact === 'negative'
                    ? 'var(--warning-light)'
                    : 'var(--info-light)'
              }
            />
          );
        })}
      </div>
    </section>
  );
}
