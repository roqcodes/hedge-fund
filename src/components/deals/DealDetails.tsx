'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatAED, formatDateTime } from '@/data/mockData';
import { badgeClass } from '@/lib/badgeClass';
import KPICard from '@/components/ui/KPICard';
import EditDealModal from './EditDealModal';
import DealTransactionsTable from './DealTransactionsTable';
import {
  pageHeader,
  pageSubtitle,
  pageTitle,
  btnPrimary,
  btnSecondary,
  kpiGrid,
  tableWrap,
  dataTable,
} from '@/lib/ui';

export default function DealDetails({ dealId }: { dealId: string }) {
  const { deals, selectInvestor } = useApp();
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);

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

  const totalGoldGrams = deal.investors.reduce((acc, inv) => acc + (inv.isGold ? inv.amount : 0), 0);
  const totalGoldKg = (totalGoldGrams / 1000).toFixed(2);

  return (
    <>
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
          <button
            type="button"
            className={`${btnPrimary} w-full sm:w-auto flex items-center gap-2`}
            onClick={() => setShowEdit(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Deal
          </button>
        </div>


      <div className={kpiGrid}>
        <KPICard
          label="Capital"
          value={formatAED(deal.amount)}
          subValue="Total deal capital"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
          color="var(--accent)"
          bgColor="var(--accent-light)"
        />
        <KPICard
          label="Gold Volume"
          value={`${totalGoldKg} kg`}
          subValue="Gold backed investments"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z" />
            </svg>
          }
          color="var(--warning)"
          bgColor="var(--warning-light)"
        />
        <KPICard
          label="P&L"
          value={formatAED(deal.totalPL || 0, true)}
          subValue="Net Profit / Loss"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          color={(deal.totalPL || 0) >= 0 ? 'var(--success)' : 'var(--action)'}
          bgColor={(deal.totalPL || 0) >= 0 ? 'var(--success-light)' : 'var(--action-light)'}
        />
        <KPICard
          label="Expense"
          value={formatAED(deal.expense || 0)}
          subValue="Total operational costs"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="var(--action)"
          bgColor="var(--action-light)"
        />
      </div>

      <div className="mb-6 mt-8">
        <div className="mb-5 flex items-center justify-between px-2">
          <h3 className="text-xl font-bold tracking-tight text-slate-900">Allocated Investors</h3>
          <button 
            type="button" 
            className="group flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-accent hover:shadow-lg hover:shadow-accent/25 active:scale-95"
            onClick={() => setShowEdit(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:rotate-90">
              <path d="M12 5v14m-7-7h14" />
            </svg>
            Add Investor
          </button>
        </div>
        
        {deal.investors.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50">
            <p className="text-sm font-medium text-slate-500">No investors allocated yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deal.investors.map((inv, idx) => {
              const ratio = ((inv.amount / deal.amount) * 100).toFixed(1);
              return (
                <div 
                  key={idx} 
                  className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-surface-xs transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/10"
                  onClick={() => {
                    selectInvestor(inv.investorId);
                    router.push('/investors');
                  }}
                >
                  <div className="absolute right-0 top-0 -mr-4 -mt-4 size-24 rounded-full bg-slate-50 opacity-50 transition-transform duration-500 group-hover:scale-150 group-hover:bg-accent/5"></div>
                  
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-lg font-black text-slate-700 shadow-inner transition-colors duration-300 group-hover:from-accent group-hover:to-accent/80 group-hover:text-white">
                      {inv.investorName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900 transition-colors group-hover:text-accent">{inv.investorName}</p>
                    </div>
                  </div>
                  
                  <div className="relative z-10 mt-5 flex items-end justify-between border-t border-slate-50 pt-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Share</p>
                      <p className="mt-1 font-mono text-lg font-black text-slate-900">{formatAED(inv.amount)}</p>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 transition-colors group-hover:bg-accent/10 group-hover:text-accent">
                        {ratio}% of Capital
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DealTransactionsTable dealName={deal.name} />
    </div>
    <EditDealModal open={showEdit} onClose={() => setShowEdit(false)} deal={deal} />
  </>
);
}
