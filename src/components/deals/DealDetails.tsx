'use client';
import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatAED, formatDateTime } from '@/data/mockData';
import { badgeClass } from '@/lib/badgeClass';
import KPICard from '@/components/ui/KPICard';
import {
  pageHeader,
  pageSubtitle,
  pageTitle,
  btnSecondary,
  kpiGrid,
  tableWrap,
  dataTable,
} from '@/lib/ui';

export default function DealDetails({ dealId }: { dealId: string }) {
  const { deals } = useApp();
  const router = useRouter();

  const deal = deals.find(d => d.id === dealId);

  if (!deal) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-bold text-slate-700">Deal Not Found</h2>
        <button className={btnSecondary} onClick={() => router.push('/deals')}>
          Back to Deals
        </button>
      </div>
    );
  }

  const fundingPercentage = Math.min((deal.totalInvestment / deal.amount) * 100, 100);

  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className={pageHeader}>
        <div>
          <div className="mb-2 flex items-center gap-3">
            <button
              onClick={() => router.push('/deals')}
              className="group flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
              aria-label="Back to Deals"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className={pageTitle}>{deal.name}</h2>
            <span className={badgeClass(deal.status)}>{deal.status.toUpperCase()}</span>
          </div>
          <p className={pageSubtitle}>
            Allocated to: <strong>{deal.toBranchName}</strong> • Created: {formatDateTime(deal.date)}
          </p>
        </div>
      </div>

      <div className={kpiGrid}>
        <KPICard
          label="Deal Target Amount"
          value={formatAED(deal.amount)}
          subValue="Total capital required"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
          color="var(--accent)"
          bgColor="var(--accent-light)"
        />
        <KPICard
          label="Total Invested"
          value={formatAED(deal.totalInvestment)}
          subValue={`${deal.investors.length} Investors`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8m12 4v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          }
          color="var(--success)"
          bgColor="var(--success-light)"
        />
        <KPICard
          label="Funding Balance"
          value={formatAED(Math.abs(deal.balance))}
          subValue={deal.balance > 0 ? 'Overfunded' : deal.balance < 0 ? 'Underfunded (Remaining)' : 'Fully Funded'}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M16 12H8M12 8v8" />
            </svg>
          }
          color={deal.balance >= 0 ? 'var(--success)' : 'var(--action)'}
          bgColor={deal.balance >= 0 ? 'var(--success-light)' : 'var(--action-light)'}
        />
      </div>

      <div className="mb-6 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-surface">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900">Funding Progress</h3>
        </div>
        <div className="p-5">
          <div className="mb-2 flex justify-between text-sm font-semibold">
            <span className="text-slate-700">{formatAED(deal.totalInvestment)} Raised</span>
            <span className="text-slate-400">{formatAED(deal.amount)} Goal</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${deal.balance >= 0 ? 'bg-green-500' : 'bg-accent'}`}
              style={{ width: `${fundingPercentage}%` }}
            />
          </div>
          <div className="mt-2 text-right text-xs font-medium text-slate-500">
            {fundingPercentage.toFixed(1)}% Funded
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-surface">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900">Participating Investors</h3>
        </div>
        <div className="p-0">
          <div className={tableWrap}>
            <table className={`${dataTable} min-w-[700px]`}>
              <thead>
                <tr>
                  <th className="px-5 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Investor Name</th>
                  <th className="px-5 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Investment Amount</th>
                  <th className="px-5 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">% of Target</th>
                  <th className="px-5 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Type</th>
                </tr>
              </thead>
              <tbody>
                {deal.investors.map((inv, idx) => {
                  const share = (inv.amount / deal.amount) * 100;
                  return (
                    <tr key={idx} className="group">
                      <td className="border-y border-black/5 bg-white px-5 py-4 text-sm font-semibold text-slate-900">
                        {inv.investorName}
                      </td>
                      <td className="border-y border-black/5 bg-white px-5 py-4 font-mono text-sm font-bold text-slate-900">
                        {formatAED(inv.amount)}
                      </td>
                      <td className="border-y border-black/5 bg-white px-5 py-4 text-sm text-slate-600">
                        {share.toFixed(1)}%
                      </td>
                      <td className="border-y border-black/5 bg-white px-5 py-4">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                          {inv.isGold ? 'Gold' : 'Cash AED'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
