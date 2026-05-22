'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import KPICard from '@/components/ui/KPICard';
import { useApp } from '@/context/AppContext';
import { formatAED, formatDateTime } from '@/data/mockData';
import { Deal } from '@/types';
import { badgeClass } from '@/lib/badgeClass';
import CreateDealModal from './CreateDealModal';
import {
  btnPrimary,
  kpiGrid,
  pageHeader,
  pageSubtitle,
  pageTitle,
  tableWrap,
  dataTable,
} from '@/lib/ui';

export default function DealsManagement() {
  const { deals } = useApp();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  const totalDeals = deals.length;
  const activeDealsCount = deals.filter(d => d.status === 'active').length;
  const totalDealAmount = deals.reduce((acc, d) => acc + d.amount, 0);
  const totalInvested = deals.reduce((acc, d) => acc + d.totalInvestment, 0);

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className={pageHeader}>
          <div>
            <h2 className={pageTitle}>Deals Pipeline</h2>
            <p className={pageSubtitle}>Manage investments and track deal allocations</p>
          </div>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={() => setShowCreate(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create New Deal
          </button>
        </div>

        <div className={kpiGrid}>
          <KPICard
            label="Total Deals"
            value={totalDeals}
            subValue={`${activeDealsCount} active deals`}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            }
            color="var(--purple)"
            bgColor="var(--purple-light)"
          />
          <KPICard
            label="Total Deal Amount"
            value={formatAED(totalDealAmount)}
            subValue="Target capital for all deals"
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
            value={formatAED(totalInvested)}
            subValue="Capital committed by investors"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M3 21h18M3 10h18M5 21V10m14 11V10M2 7l10-5 10 5M10 14h4v7h-4z" />
              </svg>
            }
            color="var(--success)"
            bgColor="var(--success-light)"
          />
          <KPICard
            label="Funding Gap"
            value={formatAED(totalDealAmount - totalInvested)}
            subValue="Remaining capital to raise"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            }
            color="var(--action)"
            bgColor="var(--action-light)"
          />
        </div>

        <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-surface transition-[box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
            <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">All Deals</h3>
          </div>
          <div className="p-0">
            <div className={tableWrap}>
              <table className={`${dataTable} min-w-[900px]`}>
                <thead>
                  <tr>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Date</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Deal Name</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Amount</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Invested</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Balance</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Status</th>
                    <th className="px-3 pb-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal: Deal) => (
                    <tr
                      key={deal.id}
                      data-interactive-row
                      onClick={() => router.push(`/deals/${deal.id}`)}
                      className="cursor-pointer"
                    >
                      <td className="whitespace-nowrap border-y border-l border-black/5 bg-white px-3 py-3.5 text-xs first:rounded-l-2xl sm:px-5 sm:py-4 sm:text-sm">
                        {formatDateTime(deal.date).split(',')[0]}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-semibold sm:px-5 sm:py-4">
                        {deal.name}
                        <div className="text-[11px] font-medium text-slate-500">To: {deal.toBranchName}</div>
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold sm:px-5 sm:py-4">
                        {formatAED(deal.amount)}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold sm:px-5 sm:py-4">
                        {formatAED(deal.totalInvestment)}
                        <div className="text-[11px] font-medium text-slate-500">{deal.investors.length} Investors</div>
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold sm:px-5 sm:py-4">
                        <span className={deal.balance > 0 ? 'text-green-600' : deal.balance < 0 ? 'text-red-600' : ''}>
                          {formatAED(deal.balance)}
                        </span>
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                        <span className={badgeClass(deal.status)}>{deal.status.toUpperCase()}</span>
                      </td>
                      <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 text-right last:rounded-r-2xl sm:px-5 sm:py-4">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/deals/${deal.id}`);
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {deals.length === 0 && (
                    <tr>
                      <td colSpan={7} className="border-y border-black/5 bg-white px-5 py-8 text-center text-sm text-slate-500">
                        No deals found. Create a new deal to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <CreateDealModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
