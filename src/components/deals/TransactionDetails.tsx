'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { SPORTS_MOCK_DATA } from '@/data/mockTransactions';
import { formatAED } from '@/data/mockData';
import { badgeClass } from '@/lib/badgeClass';
import { pageHeader, pageTitle, pageSubtitle, tableWrap, dataTable } from '@/lib/ui';

export default function TransactionDetails({ dealId, txnId }: { dealId: string; txnId: string }) {
  const router = useRouter();
  const { deals, isInitialLoading } = useApp();

  const deal = deals.find(d => d.id === dealId);
  const txn = SPORTS_MOCK_DATA.find(t => t.id === txnId);

  // Calculate the remaining profit and investor distributions
  const distributions = useMemo(() => {
    if (!deal || !txn) return null;

    const remainingProfit = txn.tProfit - txn.aibakProfit;
    
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
        <p className="text-slate-500">Loading transaction details...</p>
      </div>
    );
  }

  if (!deal || !txn || !distributions) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center">
        <p className="mb-4 text-slate-500">Transaction or Deal not found.</p>
        <button onClick={() => router.back()} className="text-sm font-bold text-accent hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const { remainingProfit, breakdown } = distributions;

  return (
    <>
      <div className={pageHeader}>
        <div>
          <button 
            onClick={() => router.push(`/deals/${deal.id}`)}
            className="group mb-2 flex items-center gap-1 text-sm font-bold text-slate-400 transition-colors hover:text-accent"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-1">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Deal
          </button>
          <h1 className={pageTitle}>Transaction {txn.id}</h1>
          <p className={pageSubtitle}>Date: {txn.date} &bull; Deal: {deal.name}</p>
        </div>
        <div className={badgeClass(deal.status)}>{deal.status.toUpperCase()}</div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CSV Data Summary */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-surface">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Trade Execution Details</h3>
          <div className="mb-6 flex gap-4">
            <div className="flex-1 rounded-2xl bg-slate-900 p-5 shadow-lg">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pure Cost AED</p>
              <p className="mt-2 font-mono text-2xl font-black tracking-tight text-white">{formatAED(txn.pureCostAed)}</p>
            </div>
            <div className="flex-1 rounded-2xl bg-accent p-5 shadow-lg shadow-accent/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">Sales Value AED</p>
              <p className="mt-2 font-mono text-2xl font-black tracking-tight text-white">{formatAED(txn.salesAed)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Weight</span>
              <span className="font-mono text-sm font-black text-slate-900">{txn.weight.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Rate</span>
              <span className="font-mono text-sm font-black text-slate-900">{txn.rate.toFixed(2)}</span>
            </div>
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sales Value INR</span>
              <span className="font-mono text-sm font-black text-slate-900">₹{txn.salesValueInr.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">RV Rate</span>
              <span className="font-mono text-sm font-black text-slate-900">{txn.rvRate.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Expenses</span>
              <span className="font-mono text-sm font-black text-rose-500">{formatAED(txn.expenses)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">N P.PER GR</span>
              <span className="font-mono text-sm font-black text-slate-900">{txn.nPPerGr.toFixed(2)}</span>
            </div>
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">MANGE</span>
              <span className="font-mono text-sm font-black text-slate-900">{formatAED(txn.mange)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Y.NET</span>
              <span className="font-mono text-sm font-black text-slate-900">{formatAED(txn.yNet)}</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">SRK</span>
              <span className="font-mono text-sm font-black text-slate-900">{formatAED(txn.srk)}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Fix Status</span>
              <span className="font-mono text-sm font-black capitalize text-slate-900">{txn.fixOrUnfix}</span>
            </div>
          </div>
        </div>

        {/* Profit Waterfall Calculation */}
        <div className="flex flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-surface">
          <h3 className="mb-6 text-lg font-bold text-slate-900">Profit Waterfall</h3>
          <div className="flex flex-1 flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="text-sm font-bold text-slate-500">Gross Profit</span>
              <span className="font-mono text-base font-black text-slate-900">{formatAED(txn.grossProfit)}</span>
            </div>
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="text-sm font-bold text-slate-500">Total Profit (T Profit)</span>
              <span className="font-mono text-base font-black text-slate-900">{formatAED(txn.tProfit)}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="text-sm font-bold text-slate-500">Investor Pool (Remaining)</span>
              <span className="font-mono text-base font-black text-slate-600">{formatAED(remainingProfit)}</span>
            </div>

            <div className="mt-auto pt-2">
              <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-500/20">
                <span className="text-sm font-black uppercase tracking-widest text-emerald-800">Aibak Profit</span>
                <span className="font-mono text-2xl font-black tracking-tight text-emerald-600">{formatAED(txn.aibakProfit, true)}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-surface">
          <h3 className="mb-5 text-xl font-bold tracking-tight text-slate-900">Investor Payout Distribution</h3>
          <div className={`overflow-hidden rounded-2xl border border-slate-100 ${tableWrap}`}>
            <table className={dataTable}>
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Investor</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Capital Share</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Ratio (%)</th>
                <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Calculated Payout</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((inv, idx) => (
                <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                        {inv.investorName.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-slate-900">{inv.investorName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-600">
                    {formatAED(inv.amount)}
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-500">
                    {(inv.shareRatio * 100).toFixed(2)}%
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-base font-black text-emerald-600">
                    {formatAED(inv.payout, true)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td colSpan={3} className="px-5 py-4 text-right text-sm font-bold uppercase tracking-wider text-slate-500">
                  Total Distributed
                </td>
                <td className="px-5 py-4 text-right font-mono text-lg font-black text-slate-900">
                  {formatAED(breakdown.reduce((sum, inv) => sum + inv.payout, 0), true)}
                </td>
              </tr>
            </tfoot>
          </table>
          </div>
        </div>
      </div>
    </>
  );
}
