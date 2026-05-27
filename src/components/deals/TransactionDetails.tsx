'use client';

import React, { useMemo, useState } from 'react';
import SellDealModal from './SellDealModal';
import ExpensesModal from './ExpensesModal';
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
  const [showSellModal, setShowSellModal] = useState(false);
  const [showExpensesModal, setShowExpensesModal] = useState(false);

  const deal = deals.find(d => d.id === dealId);
  const txn = dealTransactions.find(t => t.id === txnId);

  // Calculate the remaining profit and investor distributions
  const distributions = useMemo(() => {
    if (!deal || !txn) return null;

    const managementProfit = txn.managementProfit;
    const investorProfitPool = txn.grossProfit - managementProfit;

    const breakdown = deal.investors.map(inv => {
      const shareRatio = deal.amount > 0 ? inv.amount / deal.amount : 0;
      const payout = investorProfitPool * shareRatio;
      return {
        ...inv,
        shareRatio,
        payout,
      };
    });

    return {
      managementProfit,
      investorProfitPool,
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

  const { managementProfit, investorProfitPool, breakdown } = distributions;

  return (
    <>
      <div className="mb-5 flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:w-auto">
          <div className="mb-2 flex items-center gap-3">
            <button
              onClick={() => router.push(`/group/${deal.id}`)}
              className="group flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
              aria-label="Back to Group"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={pageTitle}>Deal #{txn.deal}</h1>
            <div className={badgeClass(deal.status)}>{deal.status.toUpperCase()}</div>
          </div>
          <p className={pageSubtitle}>Date: {txn.date} &bull; Group: {deal.groupName || deal.name}</p>
        </div>
        {/* Buttons — on mobile: col, Expenses above Sell; on sm+: row */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className={txn.fixOrUnfix === 'unfixed' ? 'w-full sm:w-24' : 'w-full sm:w-auto'}>
            <CurrencySwitcher />
          </div>

          {/* Expenses button — always visible */}
          <button
            type="button"
            className="inline-flex min-h-[44px] sm:min-h-[36px] flex-1 sm:flex-none items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm sm:text-xs font-bold text-rose-600 hover:bg-rose-100 active:scale-[0.99] gap-1.5 transition-all"
            onClick={() => setShowExpensesModal(true)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span>Expenses</span>
          </button>

          {/* Sell button — only for unfixed deals */}
          {txn.fixOrUnfix === 'unfixed' && (
            <button
              type="button"
              className="inline-flex min-h-[44px] sm:min-h-[36px] flex-1 sm:flex-none items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm sm:text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.99] gap-1.5 transition-all"
              onClick={() => setShowSellModal(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>Sell Deal</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Row of KPI Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard
          label="Purchase Volume"
          value={`${txn.weight.toLocaleString()} g`}
          colorClass="bg-indigo-100 text-indigo-600"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          }
        />
        <KPICard
          label="Purchase Cost Total"
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
          label="Buy Premium/Disc"
          value={formatAED(txn.premiumDiscount)}
          colorClass="bg-amber-100 text-amber-700"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
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
          label="Total Sale Amount"
          value={formatAED(txn.salesAed)}
          colorClass="bg-emerald-100 text-emerald-600"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <KPICard
          label="Profit/Loss"
          value={formatAED(txn.grossProfit, true)}
          colorClass={txn.grossProfit >= 0 ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}
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

          <div className="flex flex-col gap-6">
            {/* Purchase Details */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-3 border-b border-slate-100 pb-2">Purchase Details</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Weight</p>
                  <p className="font-mono text-sm font-bold text-slate-900">{txn.weight.toLocaleString()} g</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Live Rate /oz</p>
                  <p className="font-mono text-sm font-bold text-slate-900">{txn.rate.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Premium/Disc</p>
                  <p className="font-mono text-sm font-bold text-slate-900">{txn.premiumDiscount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Purchase Cost (AED)</p>
                  <p className="font-mono text-sm font-bold text-slate-900">{formatAED(txn.pureCostAed)}</p>
                </div>
              </div>
            </div>

            {/* Selling Details */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-rose-800 mb-3 border-b border-slate-100 pb-2">Selling Details</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Live Sell Rate /oz</p>
                  <p className="font-mono text-sm font-bold text-slate-900">{txn.liveSellRate > 0 ? txn.liveSellRate.toFixed(2) : '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Sell Prem/Disc</p>
                  <p className="font-mono text-sm font-bold text-slate-900">{txn.liveSellRate > 0 ? txn.sellPremiumDiscount.toFixed(2) : '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Sales (AED)</p>
                  <p className="font-mono text-sm font-bold text-slate-900">{txn.salesAed > 0 ? formatAED(txn.salesAed) : '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Status</p>
                  <p className="font-mono text-sm font-bold capitalize text-slate-900">{txn.fixOrUnfix}</p>
                </div>
              </div>
            </div>

            {/* Expenses & Profitability */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-blue-800 mb-3 border-b border-slate-100 pb-2">Financials & Profitability</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Total Expenses</p>
                  <p className="font-mono text-sm font-bold text-slate-900">{formatAED(txn.expenses)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Gross Profit</p>
                  <p className={`font-mono text-sm font-bold ${txn.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatAED(txn.grossProfit)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Net Profit / Gram</p>
                  <p className={`font-mono text-sm font-bold ${txn.netProfitPerGram >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{txn.netProfitPerGram.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Management Fee</p>
                  <p className="font-mono text-sm font-bold text-slate-900">{formatAED(txn.managementProfit)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Investor Pool</p>
                  <p className="font-mono text-sm font-bold text-slate-900">{formatAED(investorProfitPool)}</p>
                </div>
              </div>
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
                <p className={`mt-0.5 font-mono text-base sm:text-lg font-black ${txn.managementProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatAED(txn.managementProfit, true)}
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
            <span className={`font-mono text-lg sm:text-xl font-black ${txn.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatAED(txn.grossProfit, true)}
            </span>
          </div>
        </div>
      </div>
      <SellDealModal
        open={showSellModal}
        onClose={() => setShowSellModal(false)}
        deal={deal}
        transaction={txn}
      />
      <ExpensesModal
        open={showExpensesModal}
        onClose={() => setShowExpensesModal(false)}
        dealTransactionId={txn.id}
        dealLabel={`Deal #${txn.deal} — ${deal.groupName || deal.name}`}
      />
    </>
  );
}
