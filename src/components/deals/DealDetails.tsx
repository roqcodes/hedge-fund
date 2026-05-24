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
  const [dateFilter, setDateFilter] = useState<string>('all-time');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');

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

  const filteredTransactions = React.useMemo(() => {
    const dataSource = deal.name.toLowerCase() === 'sports' ? SPORTS_MOCK_DATA : [];
    if (dateFilter === 'all-time') return dataSource;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    
    let startLimit = '';
    let endLimit = '';

    if (dateFilter === 'this-month') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      startLimit = `${year}-${month}-01`;
      endLimit = `${year}-${month}-31`;
    } else if (dateFilter === 'last-month') {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = prevMonthDate.getFullYear();
      const month = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
      startLimit = `${year}-${month}-01`;
      
      const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      endLimit = `${year}-${month}-${String(lastDayPrevMonth.getDate()).padStart(2, '0')}`;
    } else if (dateFilter === 'last-3-months') {
      const start3MonthsDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const year = start3MonthsDate.getFullYear();
      const month = String(start3MonthsDate.getMonth() + 1).padStart(2, '0');
      startLimit = `${year}-${month}-01`;
      endLimit = todayStr;
    } else if (dateFilter === 'today') {
      startLimit = todayStr;
      endLimit = todayStr;
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      startLimit = yesterday.toISOString().slice(0, 10);
      endLimit = yesterday.toISOString().slice(0, 10);
    } else if (dateFilter === 'this-week') {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      startLimit = monday.toISOString().slice(0, 10);
      endLimit = todayStr;
    } else if (dateFilter === 'last-week') {
      const monday = new Date();
      monday.setDate(now.getDate() - now.getDay() - 6);
      const sunday = new Date();
      sunday.setDate(now.getDate() - now.getDay());
      startLimit = monday.toISOString().slice(0, 10);
      endLimit = sunday.toISOString().slice(0, 10);
    } else if (dateFilter === 'this-year') {
      startLimit = `${now.getFullYear()}-01-01`;
      endLimit = `${now.getFullYear()}-12-31`;
    } else if (dateFilter === 'custom') {
      startLimit = customStartDate || '1970-01-01';
      endLimit = customEndDate || '9999-12-31';
    }

    return dataSource.filter(item => {
      const itemDate = item.date;
      return itemDate >= startLimit && itemDate <= endLimit;
    });
  }, [deal, dateFilter, customStartDate, customEndDate]);

  const numberOfDeals = deal.name.toLowerCase() === 'sports' ? filteredTransactions.length : 0;
  
  const filteredTotalPL = deal.name.toLowerCase() === 'sports'
    ? filteredTransactions.reduce((sum, txn) => sum + txn.grossProfit, 0)
    : (deal.totalPL || 0);

  const totalAibakProfit = deal.name.toLowerCase() === 'sports' 
    ? filteredTransactions.reduce((sum, txn) => sum + txn.aibakProfit, 0)
    : filteredTotalPL * ((deal.managerShare ?? 20) / 100);

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
            className="group flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 sm:w-auto"
            onClick={() => setShowEdit(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Group
          </button>
        </div>

        {/* Date Filter Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all-time', label: 'All Time' },
                { id: 'this-month', label: 'This Month' },
                { id: 'last-month', label: 'Last Month' },
                { id: 'last-3-months', label: 'Last 3 Months' },
              ] as const
            ).map(opt => {
              const isActive = dateFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setDateFilter(opt.id);
                    setShowDropdown(false);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}

            {/* Custom Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 outline-none transition-all hover:text-slate-900 focus:border-accent ${
                  !['all-time', 'this-month', 'last-month', 'last-3-months'].includes(dateFilter)
                    ? 'border-accent bg-accent/5 text-accent font-black'
                    : ''
                }`}
              >
                <span>
                  {dateFilter === 'custom'
                    ? (customStartDate || customEndDate
                      ? `${customStartDate || '...'} to ${customEndDate || '...'}`
                      : 'Custom Range')
                    : ['today', 'yesterday', 'this-week', 'last-week', 'this-year'].includes(dateFilter)
                    ? dateFilter.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                    : 'More filters'}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Floating Dropdown / Popover Modal-like */}
              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowDropdown(false)}></div>
                  <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl z-40 animate-[fade-in_0.15s_ease-out] flex flex-col gap-1">
                    <div className="flex flex-col gap-0.5">
                      {(
                        [
                          { id: 'today', label: 'Today' },
                          { id: 'yesterday', label: 'Yesterday' },
                          { id: 'this-week', label: 'This Week' },
                          { id: 'last-week', label: 'Last Week' },
                          { id: 'this-year', label: 'This Year' },
                        ] as const
                      ).map(opt => {
                        const isActive = dateFilter === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setDateFilter(opt.id);
                              setShowDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                              isActive
                                ? 'bg-slate-900 text-white font-black'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="border-t border-slate-100 my-2"></div>

                    <div className="px-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Custom Date Range</p>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">From</label>
                          <input
                            type="date"
                            value={tempStartDate}
                            onChange={(e) => setTempStartDate(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-accent focus:bg-white"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">To</label>
                          <input
                            type="date"
                            value={tempEndDate}
                            onChange={(e) => setTempEndDate(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-accent focus:bg-white"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomStartDate(tempStartDate);
                            setCustomEndDate(tempEndDate);
                            setDateFilter('custom');
                            setShowDropdown(false);
                          }}
                          className="mt-2 w-full rounded-xl bg-accent py-2 text-center text-xs font-bold text-white shadow-md shadow-accent/15 transition-all hover:bg-accent/90 active:scale-95"
                        >
                          Apply Custom Range
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Custom Date Inputs Summary */}
            {dateFilter === 'custom' && (customStartDate || customEndDate) && (
              <div className="flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/10 px-3 py-1 text-xs font-bold text-accent animate-[fade-in_0.25s_ease-out]">
                <span className="font-semibold text-slate-600 mr-1">Active Range:</span>
                <span className="font-mono">{customStartDate || '...'}</span>
                <span className="text-[10px] text-slate-400 font-normal">to</span>
                <span className="font-mono">{customEndDate || '...'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomStartDate('');
                    setCustomEndDate('');
                    setTempStartDate('');
                    setTempEndDate('');
                    setDateFilter('all-time');
                  }}
                  className="ml-1 flex size-4 items-center justify-center rounded-full bg-accent/20 text-[10px] font-black text-accent hover:bg-accent hover:text-white transition-colors"
                  aria-label="Clear filter"
                >
                  &times;
                </button>
              </div>
            )}
            <CurrencySwitcher />
          </div>
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
            value={formatAED(filteredTotalPL, true)}
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
            label="Number of Deals"
            value={numberOfDeals}
            subValue="Total transactions in group"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            }
            color="var(--purple)"
            bgColor="var(--purple-light)"
          />
        </div>

        <div className="mb-6 mt-8">
          <div className="mb-5 flex items-center justify-between px-2">
            <h3 className="text-xl font-bold tracking-tight text-slate-900">Partners</h3>
            <button
              type="button"
              className="group flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-accent hover:shadow-lg hover:shadow-accent/25 active:scale-95"
              onClick={() => setShowEdit(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:rotate-90">
                <path d="M12 5v14m-7-7h14" />
              </svg>
              Add Partner
            </button>
          </div>

          {deal.investors.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50">
              <p className="text-sm font-medium text-slate-500">No partners allocated yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Manager Card */}
              <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-surface-xs transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/10">
                {/* Diagonal Manager Ribbon */}
                <div className="absolute right-0 top-0 h-16 w-16 overflow-hidden z-20">
                  <div className="absolute top-3 -right-7 w-24 rotate-45 bg-red-600 py-0.5 text-center text-[8px] font-extrabold uppercase tracking-widest text-white shadow-sm">
                    Manager
                  </div>
                </div>

                <div className="absolute right-0 top-0 -mr-4 -mt-4 size-24 rounded-full bg-slate-50 opacity-50 transition-transform duration-500 group-hover:scale-150 group-hover:bg-accent/5"></div>
                
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-lg font-black text-slate-700 shadow-inner group-hover:from-accent group-hover:to-accent/80 group-hover:text-white transition-colors duration-300">
                      M
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900 group-hover:text-accent transition-colors">Manager</p>
                    </div>
                  </div>
                </div>
                
                <div className="relative z-10 mt-5 flex flex-col gap-3 border-t border-slate-50 pt-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Share</p>
                      <p className="mt-1 font-mono text-lg font-black text-slate-900">{deal.managerShare ?? 20}%</p>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                        % Profit Share
                      </div>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Gold Volume</p>
                      <p className="mt-1 font-mono text-sm font-bold text-slate-600">—</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Profit</p>
                      <p className={`mt-1 font-mono text-xl font-black tracking-tight ${totalAibakProfit >= 0 ? 'text-emerald-500 drop-shadow-sm' : 'text-red-500'}`}>
                        {formatAED(totalAibakProfit, true)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {[...deal.investors].sort((a, b) => b.amount - a.amount).map((inv, idx) => {
                const ratio = ((inv.amount / deal.amount) * 100).toFixed(1);
                const partnerProfit = filteredTotalPL * (inv.amount / deal.amount);
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

                    <div className="relative z-10 mt-5 flex flex-col gap-3 border-t border-slate-50 pt-4">
                      <div className="flex items-end justify-between">
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
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Gold Volume</p>
                          <p className="mt-1 font-mono text-sm font-bold text-slate-600">{inv.isGold ? inv.amount.toFixed(4) : "0.0000"} g</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Profit</p>
                          <p className={`mt-1 font-mono text-xl font-black tracking-tight ${partnerProfit >= 0 ? 'text-emerald-500 drop-shadow-sm' : 'text-red-500'}`}>
                            {formatAED(partnerProfit, true)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DealTransactionsTable dealName={deal.name} transactions={filteredTransactions} />
      </div>
      <EditDealModal open={showEdit} onClose={() => setShowEdit(false)} deal={deal} />
    </>
  );
}
