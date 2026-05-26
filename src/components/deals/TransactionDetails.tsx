'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatAED } from '@/data/mockData';
import { badgeClass } from '@/lib/badgeClass';
import CurrencySwitcher from './CurrencySwitcher';
import { pageHeader, pageTitle, pageSubtitle, tableWrap, dataTable } from '@/lib/ui';

function KPICard({ label, value, colorClass, icon }: { label: string; value: React.ReactNode; colorClass: string; icon: React.ReactNode }) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-3 sm:p-5 shadow-surface-xs transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/10">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <div className={`flex size-8 sm:size-10 items-center justify-center rounded-lg sm:rounded-xl ${colorClass}`}>
          {icon}
        </div>
      </div>
      <p className="font-mono text-lg sm:text-2xl font-black tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

export default function TransactionDetails({ dealId, txnId }: { dealId: string; txnId: string }) {
  const router = useRouter();
  const { deals, investors, isInitialLoading, dealTransactions } = useApp();

  const deal = deals.find(d => d.id === dealId);
  const txn = dealTransactions.find(t => t.id === txnId);

  // Calculate the remaining profit and investor distributions
  const distributions = useMemo(() => {
    if (!deal || !txn) return null;

    const remainingProfit = txn.tProfit - txn.mange;

    const breakdown = deal.investors.map(inv => {
      const shareRatio = inv.amount / deal.amount;
      const payout = remainingProfit * shareRatio;
      return {
        ...inv,
        shareRatio,
        payout,
      };
    });

    return {
      remainingProfit,
      breakdown,
    };
  }, [deal, txn]);

  if (isInitialLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-slate-500">Loading deal details...</p>
      </div>
    );
  }

  if (!deal || !txn || !distributions) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center">
        <p className="mb-4 text-slate-500">Deal or Group not found.</p>
        <button onClick={() => router.back()} className="text-sm font-bold text-accent hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const { remainingProfit, breakdown } = distributions;

  return (
    <>
      <div className="mb-5 flex items-start justify-between border-b border-slate-200/80 pb-5 sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <button
              onClick={() => router.push(`/deals/${deal.id}`)}
              className="group flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
              aria-label="Back to Deal"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={pageTitle}>Deal #{txn.deal}</h1>
            <div className={badgeClass(deal.status)}>{deal.status.toUpperCase()}</div>
          </div>
          <p className={pageSubtitle}>Date: {txn.date} &bull; Deal: {deal.name}</p>
        </div>
        <div className="flex items-center">
          <CurrencySwitcher />
        </div>
      </div>

      {/* Top Row of KPI Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KPICard
          label="Purchase"
          value={formatAED(txn.pureCostAed)}
          colorClass="bg-slate-900 text-white"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          }
        />
        <KPICard
          label="Expense"
          value={formatAED(txn.expenses)}
          colorClass="bg-rose-100 text-rose-600"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <KPICard
          label="Sale"
          value={formatAED(txn.salesAed)}
          colorClass="bg-emerald-100 text-emerald-600"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <KPICard
          label="Gross Profit"
          value={formatAED(txn.grossProfit)}
          colorClass="bg-accent/10 text-accent"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 6l-9.5 9.5-5-5L1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          }
        />
      </div>

      {/* 1 to 1 Horizontal Layout */}
      <div className="mb-8 flex flex-col-reverse gap-6 lg:grid lg:grid-cols-2">
        {/* Left side: Trade Execution Details */}
        <div className="md:rounded-3xl md:border md:border-slate-100 md:bg-white md:p-6 md:shadow-surface">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Execution Details</h3>
            <p className="text-xs text-slate-500">Key metrics and deal parameters</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Weight</span>
              <span className="font-mono text-sm font-black text-slate-900">{txn.weight.toLocaleString()} g</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Rate</span>
              <span className="font-mono text-sm font-black text-slate-900">{txn.rate.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sales Value INR</span>
              <span className="font-mono text-sm font-black text-slate-900">₹{txn.salesValueInr.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">RV Rate</span>
              <span className="font-mono text-sm font-black text-slate-900">{txn.rvRate.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">N P.PER GR</span>
              <span className="font-mono text-sm font-black text-slate-900">{txn.nPPerGr.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">MANGE</span>
              <span className="font-mono text-sm font-black text-slate-900">{formatAED(txn.mange)}</span>
            </div>


            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Profit (T Profit)</span>
              <span className="font-mono text-sm font-black text-slate-900">{formatAED(txn.tProfit)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Investor Pool</span>
              <span className="font-mono text-sm font-black text-slate-600">{formatAED(remainingProfit)}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-50 pb-3 sm:border-b-0 sm:pb-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Fix Status</span>
              <span className="font-mono text-sm font-black capitalize text-slate-900">{txn.fixOrUnfix}</span>
            </div>
          </div>
        </div>

        {/* Right side: Partner Profit Distribution */}
        <div className="flex flex-col md:rounded-3xl md:border md:border-slate-100 md:bg-white md:p-6 md:shadow-surface">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Profit Distribution</h3>
            <p className="text-xs text-slate-500">Distribution of the deal's net profit</p>
          </div>

          <div className="flex flex-col gap-3 flex-1">
            {/* Manager Card */}
            <div className="relative flex items-center justify-between overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 sm:p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
              <div className="absolute right-0 top-0 h-16 w-16 overflow-hidden z-20">
                <div className="absolute top-[10px] -right-[30px] w-[100px] rotate-45 bg-red-600 py-0.5 text-center text-[7px] font-black uppercase tracking-widest text-white shadow-sm">
                  Management
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                <div className="flex size-10 sm:size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-base sm:text-lg font-black text-slate-700">
                  M
                </div>
                <div>
                  <p className="text-sm sm:text-base font-bold text-slate-900">Management</p>
                  <p className="text-[11px] sm:text-xs font-medium text-slate-400">Profit Share • {deal.managerShare ?? 20}%</p>
                </div>
              </div>
              <div className="text-right pr-6 sm:pr-8 relative z-10">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">Payout</p>
                <p className={`mt-0.5 font-mono text-base sm:text-lg font-black ${txn.aibakProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatAED(txn.aibakProfit, true)}
                </p>
              </div>
            </div>

            {/* Partners Cards */}
            {breakdown.map((inv, idx) => {
              const resolvedName = investors.find(i => i.id === inv.investorId)?.name || inv.investorName;
              return (
              <div
                key={idx}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3 sm:p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex size-10 sm:size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-base sm:text-lg font-black text-slate-700">
                    {resolvedName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-bold text-slate-900 uppercase">{resolvedName}</p>
                    <p className="text-[11px] sm:text-xs font-medium text-slate-400">Capital: {formatAED(inv.amount)} • {(inv.shareRatio * 100).toFixed(1)}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">Payout</p>
                  <p className={`mt-0.5 font-mono text-base sm:text-lg font-black ${inv.payout >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatAED(inv.payout, true)}
                  </p>
                </div>
              </div>
            );
            })}
          </div>

          {/* Total Profit Distributed */}
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-emerald-50/70 border border-emerald-100/50 p-4 sm:p-5">
            <span className="text-sm sm:text-base font-bold text-slate-900">Total Distributed Profit</span>
            <span className={`font-mono text-lg sm:text-xl font-black ${txn.tProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatAED(txn.tProfit, true)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
