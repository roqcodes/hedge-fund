'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatAED, formatDateTime } from '@/data/mockData';
import { badgeClass } from '@/lib/badgeClass';
import KPICard from '@/components/ui/KPICard';
import EditDealModal from './EditDealModal';
import DealTransactionsTable from './DealTransactionsTable';
import CurrencySwitcher from './CurrencySwitcher';
import { SPORTS_MOCK_DATA } from '@/data/mockTransactions';
import { useDateFilter } from '@/hooks/useDateFilter';
import DateFilterBar from '@/components/ui/DateFilterBar';
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

  const {
    dateFilter, setDateFilter,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
    filteredData: filteredTransactions
  } = useDateFilter(deal.name.toLowerCase().includes('sports') ? SPORTS_MOCK_DATA : []);

  const numberOfDeals = deal.name.toLowerCase().includes('sports') ? filteredTransactions.length : 0;
  const completedDeals = deal.name.toLowerCase().includes('sports') ? filteredTransactions.filter(t => t.grossProfit !== undefined && t.grossProfit !== null && t.grossProfit !== 0).length : 0;
  const onTransitDeals = numberOfDeals - completedDeals;
  
  const filteredTotalPL = filteredTransactions.length > 0
    ? filteredTransactions.reduce((sum, txn) => sum + (txn.grossProfit || 0), 0)
    : (deal.totalPL || 0);

  const totalAibakProfit = filteredTransactions.length > 0
    ? filteredTransactions.reduce((sum, txn) => sum + (txn.aibakProfit || 0), 0)
    : 0;

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className="mb-5 flex items-start justify-between border-b border-slate-200/80 pb-5 sm:items-end">
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
              <h2 className={pageTitle}>{deal.groupName || deal.name}</h2>
              <span className={badgeClass(deal.status)}>{deal.status.toUpperCase()}</span>
            </div>
            <p className={pageSubtitle}>
              Created: {formatDateTime(deal.date)}
            </p>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors hover:bg-accent hover:text-white sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:rounded-lg sm:bg-transparent sm:text-slate-500 sm:hover:bg-slate-100 sm:hover:text-slate-900 gap-2 font-semibold text-sm"
              onClick={() => setShowEdit(true)}
              aria-label="Edit Group"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[18px] sm:h-[18px] sm:stroke-2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span className="hidden sm:inline">Edit Group</span>
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <DateFilterBar
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
        >
          <CurrencySwitcher />
        </DateFilterBar>

        <div className={`${kpiGrid} grid-cols-2`}>
          <KPICard
            label="Number of Deals"
            value={numberOfDeals}
            subValue="Total deals in group"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            }
            color="var(--purple)"
            bgColor="var(--purple-light)"
          />
          <KPICard
            label="Settled Deals"
            value={completedDeals}
            subValue="Completed deals"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            }
            color="var(--success)"
            bgColor="var(--success-light)"
          />
          <KPICard
            label="Unsettled Deals"
            value={onTransitDeals}
            subValue="In progress"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="var(--warning)"
            bgColor="var(--warning-light)"
          />
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
            value={formatAED(filteredTotalPL, true)}
            subValue="Gross Profit"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
            color={(deal.totalPL || 0) >= 0 ? 'var(--success)' : 'var(--action)'}
            bgColor={(deal.totalPL || 0) >= 0 ? 'var(--success-light)' : 'var(--action-light)'}
          />
      </div>

        {deal.leadName && (
          <div className="mb-6 mt-8 flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-surface-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-lg font-black text-slate-700">
                {deal.leadName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 leading-tight">{deal.leadName}</p>
                <p className="text-[10px] sm:text-xs font-medium text-slate-500">Group Lead</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-x-3 gap-y-4 sm:gap-6 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-50 w-full sm:w-auto">
              {deal.leadPhone && (
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone</p>
                  <p className="text-xs sm:text-sm font-medium text-slate-900 mt-0.5 truncate">{deal.leadPhone}</p>
                </div>
              )}
              {deal.leadEmail && (
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">Email</p>
                  <p className="text-xs sm:text-sm font-medium text-slate-900 mt-0.5 truncate">{deal.leadEmail}</p>
                </div>
              )}
              {deal.leadAddress && (
                <div className="col-span-2 sm:col-span-1 min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">Location</p>
                  <p className="text-xs sm:text-sm font-medium text-slate-900 mt-0.5 truncate">{deal.leadAddress}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mb-6 mt-8 rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-surface-xs">
          <div className="mb-4 sm:mb-5">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Payout Distribution</h3>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">Distribution of the deal's net profit</p>
          </div>

          {deal.investors.length === 0 && deal.managerShare === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
              <p className="text-sm font-medium text-slate-500">No profit distribution available.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {/* Manager Card */}
              <div className="relative flex items-center justify-between overflow-hidden rounded-xl sm:rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_1px_4px_-2px_rgba(0,0,0,0.05)]">
                <div className="absolute right-0 top-0 h-16 w-16 overflow-hidden z-20">
                  <div className="absolute top-[8px] -right-[32px] w-[100px] rotate-45 bg-red-600 py-0.5 text-center text-[6px] font-black uppercase tracking-widest text-white shadow-sm">
                    Manager
                  </div>
                </div>
                
                <div className="flex items-center gap-3 relative z-10">
                  <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-sm sm:text-base font-black text-slate-700">
                    M
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Manager</p>
                    <p className="text-[11px] sm:text-xs font-medium text-slate-400">Profit Share • {deal.managerShare ?? 20}%</p>
                  </div>
                </div>
                <div className="text-right pr-6 sm:pr-8 relative z-10">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">Payout</p>
                  <p className={`mt-0.5 font-mono text-base sm:text-lg font-black ${totalAibakProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatAED(totalAibakProfit, true)}
                  </p>
                </div>
              </div>

              {/* Investor Cards */}
              {[...deal.investors].sort((a, b) => b.amount - a.amount).map((inv, idx) => {
                const ratio = ((inv.amount / deal.amount) * 100).toFixed(1);
                const partnerProfit = filteredTotalPL * (inv.amount / deal.amount);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-slate-100 bg-white p-2.5 sm:p-3 shadow-[0_1px_4px_-2px_rgba(0,0,0,0.05)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-sm sm:text-base font-black text-slate-700">
                        {inv.investorName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 uppercase">{inv.investorName}</p>
                        <p className="text-[11px] sm:text-xs font-medium text-slate-400">Capital: {formatAED(inv.amount)} • {ratio}%</p>
                      </div>
                    </div>
                    <div className="text-right pr-2">
                      <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">Payout</p>
                      <p className={`mt-0.5 font-mono text-base font-black ${partnerProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatAED(partnerProfit, true)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Total Row */}
              <div className="mt-1 flex items-center justify-between rounded-xl sm:rounded-2xl bg-emerald-50/70 border border-emerald-100/50 p-3 sm:p-4">
                <p className="text-sm font-bold text-slate-900">Total Distributed Profit</p>
                <p className={`font-mono text-lg font-black ${filteredTotalPL >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formatAED(filteredTotalPL, true)}
                </p>
              </div>
            </div>
          )}
        </div>

        <DealTransactionsTable dealName={deal.name} transactions={filteredTransactions} />
      </div>
      <EditDealModal open={showEdit} onClose={() => setShowEdit(false)} deal={deal} />
    </>
  );
}
