'use client';
import React, { useState, useMemo } from 'react';
import KPICard from '@/components/ui/KPICard';
import { useApp } from '@/context/AppContext';
import { formatAED } from '@/data/mockData';
import { Branch } from '@/types';
import {
  btnSecondary,
  formInput,
  kpiGrid,
  pageHeader,
  pageSubtitle,
  pageTitle,
} from '@/lib/ui';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { useRouter } from 'next/navigation';

export default function SuperadminGroups() {
  const { branches, deals, dealTransactions } = useApp();
  const router = useRouter();

  const [branchSearchTerm, setBranchSearchTerm] = useState('');
  const [branchSortField, setBranchSortField] = useState<string>('name');
  const [branchSortDirection, setBranchSortDirection] = useState<'asc' | 'desc'>('asc');

  const enhancedBranches = useMemo(() => {
    return branches.map(b => {
      const branchDeals = deals.filter(d => d.managingBranchId === b.id);
      
      let totalGroups = branchDeals.length;
      let totalCapital = 0;
      let settledDealsCount = 0;
      let grossProfit = 0;

      branchDeals.forEach(deal => {
        const groupTxns = dealTransactions.filter(t => t.dealId === deal.id);
        
        const unsettledTxns = groupTxns.filter(t => t.fixOrUnfix === 'unfixed');
        const unsettledCost = unsettledTxns.reduce((sum, t) => sum + (t.pureCostAed || 0), 0);
        
        totalCapital += (deal.amount - unsettledCost);

        const completed = groupTxns.filter(t => t.grossProfit !== undefined && t.grossProfit !== null && t.grossProfit !== 0).length;
        settledDealsCount += completed;

        const dealGrossProfit = groupTxns.reduce((sum, t) => sum + (t.grossProfit || 0), 0) || deal.totalPL || 0;
        grossProfit += dealGrossProfit;
      });

      return {
        ...b,
        totalGroups,
        totalCapital,
        settledDealsCount,
        grossProfit
      };
    });
  }, [branches, deals, dealTransactions]);

  const globalMetrics = useMemo(() => {
    let globalTotalGroups = 0;
    let globalTotalDeals = dealTransactions.length;
    let globalTotalCapital = 0;
    let globalTotalGrossProfit = 0;

    enhancedBranches.forEach(b => {
      globalTotalGroups += b.totalGroups;
      globalTotalCapital += b.totalCapital;
      globalTotalGrossProfit += b.grossProfit;
    });

    return {
      globalTotalGroups,
      globalTotalDeals,
      globalTotalCapital,
      globalTotalGrossProfit
    };
  }, [enhancedBranches, dealTransactions]);

  const filteredAndSortedBranches = useMemo(() => {
    let result = enhancedBranches.filter(b => {
      if (branchSearchTerm.trim()) {
        const query = branchSearchTerm.toLowerCase();
        return (
          b.name.toLowerCase().includes(query) ||
          (b.managerName && b.managerName.toLowerCase().includes(query)) ||
          (b.location && b.location.toLowerCase().includes(query))
        );
      }
      return true;
    });

    result.sort((a, b) => {
      let valA: any, valB: any;
      switch (branchSortField) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'groups':
          valA = a.totalGroups;
          valB = b.totalGroups;
          break;
        case 'capital':
          valA = a.totalCapital;
          valB = b.totalCapital;
          break;
        case 'profit':
          valA = a.grossProfit;
          valB = b.grossProfit;
          break;
        default:
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
      }

      if (valA < valB) return branchSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return branchSortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [enhancedBranches, branchSearchTerm, branchSortField, branchSortDirection]);

  const sortOptions = [
    { value: 'name', label: 'Branch Name' },
    { value: 'groups', label: 'Total Groups' },
    { value: 'capital', label: 'Capital Deployed' },
    { value: 'profit', label: 'Gross P&L' }
  ];

  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className={pageHeader}>
        <div>
          <h2 className={pageTitle}>Global Groups & Deals</h2>
          <p className={pageSubtitle}>Monitor investment groups and deal allocations across the network</p>
        </div>
      </div>

      <div className={kpiGrid}>
        <KPICard
          label="Total Groups"
          value={globalMetrics.globalTotalGroups}
          subValue="Active groups globally"
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
          label="Total Deals"
          value={globalMetrics.globalTotalDeals}
          subValue="Total deal transactions"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          }
          color="var(--info)"
          bgColor="var(--info-light)"
        />
        <KPICard
          label="Total Capital Deployed"
          value={formatAED(globalMetrics.globalTotalCapital)}
          subValue="Capital currently active"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
          color="var(--accent)"
          bgColor="var(--accent-light)"
        />
        <KPICard
          label="Total Gross P&L"
          value={formatAED(globalMetrics.globalTotalGrossProfit)}
          subValue="Network gross profit"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          }
          color={globalMetrics.globalTotalGrossProfit >= 0 ? "var(--profit)" : "var(--loss)"}
          bgColor={globalMetrics.globalTotalGrossProfit >= 0 ? "var(--profit-light)" : "var(--loss-light)"}
        />
      </div>

      <div className="mt-8 mb-6">
        <div className="flex flex-col gap-3 pb-4 md:border-b md:border-slate-100 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">
            Branches Deal Overview
          </h3>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2">
            <div className="relative w-full sm:w-44">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Search branches..."
                value={branchSearchTerm}
                onChange={e => setBranchSearchTerm(e.target.value)}
                className={`${formInput} !py-2 !pl-10 !pr-4 !text-sm w-full`}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <SearchableSelect
                options={sortOptions}
                value={branchSortField}
                onChange={setBranchSortField}
                className="w-full sm:w-48"
              />
              <button
                type="button"
                onClick={() => setBranchSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors shrink-0"
                title={branchSortDirection === 'asc' ? "Ascending" : "Descending"}
              >
                {branchSortDirection === 'asc' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 14-5-5-4 4-3-3"/></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredAndSortedBranches.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">No branches found.</div>
        ) : (
          filteredAndSortedBranches.map(b => (
            <div
              key={b.id}
              onClick={() => router.push(`/group/${b.slug}`)}
              className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] transition-all hover:shadow-md hover:border-accent/30 cursor-pointer active:scale-[0.99] group"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <h4 className="text-lg font-bold text-slate-900 group-hover:text-accent transition-colors">{b.name}</h4>
                  <p className="text-xs font-semibold text-slate-500">{b.managerName || 'No Manager'}</p>
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-slate-400 group-hover:bg-accent group-hover:text-white transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <span className="truncate">{b.location || 'Location not set'}</span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Groups</span>
                  <span className="font-mono text-[15px] font-bold text-slate-900">{b.totalGroups}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Capital Deployed</span>
                  <span className="font-mono text-[15px] font-bold text-accent">{formatAED(b.totalCapital)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Settled Deals</span>
                  <span className="font-mono text-sm font-bold text-slate-700">{b.settledDealsCount}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross P&L</span>
                  <span className={`font-mono text-sm font-bold ${b.grossProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatAED(b.grossProfit)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
