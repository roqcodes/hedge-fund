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

export default function SuperadminPhysical() {
  const { branches, physicalBalances, physicalBuys } = useApp();
  const router = useRouter();

  const [branchSearchTerm, setBranchSearchTerm] = useState('');
  const [branchSortField, setBranchSortField] = useState<string>('name');
  const [branchSortDirection, setBranchSortDirection] = useState<'asc' | 'desc'>('asc');

  const enhancedBranches = useMemo(() => {
    return branches.map(b => {
      const balance = physicalBalances.find(pb => pb.branchId === b.id) || { initialCapital: 0, initialVolume: 0, branchId: b.id };
      const branchBuys = physicalBuys.filter(pb => pb.branchId === b.id);
      
      const totalInventory = branchBuys.reduce((sum, buy) => sum + buy.pureGram, 0);
      const totalRemaining = branchBuys.reduce((sum, buy) => sum + buy.remainingWeight, 0);
      const totalValue = branchBuys.reduce((sum, buy) => sum + buy.buyValue, 0);

      return {
        ...b,
        initialCapital: balance.initialCapital,
        initialVolume: balance.initialVolume,
        totalInventory,
        totalRemaining,
        totalValue,
        totalBuys: branchBuys.length
      };
    });
  }, [branches, physicalBalances, physicalBuys]);

  const globalMetrics = useMemo(() => {
    let globalInventory = 0;
    let globalValue = 0;
    let globalCapital = 0;
    let globalRemaining = 0;

    enhancedBranches.forEach(b => {
      globalInventory += b.totalInventory;
      globalValue += b.totalValue;
      globalCapital += b.initialCapital;
      globalRemaining += b.totalRemaining;
    });

    return {
      globalInventory,
      globalValue,
      globalCapital,
      globalRemaining
    };
  }, [enhancedBranches]);

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
        case 'inventory':
          valA = a.totalInventory;
          valB = b.totalInventory;
          break;
        case 'value':
          valA = a.totalValue;
          valB = b.totalValue;
          break;
        case 'capital':
          valA = a.initialCapital;
          valB = b.initialCapital;
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
    { value: 'inventory', label: 'Total Inventory (g)' },
    { value: 'value', label: 'Total Value' },
    { value: 'capital', label: 'Initial Physical Capital' }
  ];

  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className={pageHeader}>
        <div>
          <h2 className={pageTitle}>Global Physical Assets</h2>
          <p className={pageSubtitle}>Monitor physical gold inventory and buys across all branches</p>
        </div>
      </div>

      <div className={kpiGrid}>
        <KPICard
          label="Total Gold Inventory"
          value={globalMetrics.globalInventory.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' g'}
          subValue="Gross weight bought globally"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          color="var(--accent)"
          bgColor="var(--accent-light)"
        />
        <KPICard
          label="Remaining Global Stock"
          value={globalMetrics.globalRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' g'}
          subValue="Currently held in vaults"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="var(--warning)"
          bgColor="var(--warning-light)"
        />
        <KPICard
          label="Total Physical Capital"
          value={formatAED(globalMetrics.globalCapital)}
          subValue="Capital allocated for physical"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          color="var(--info)"
          bgColor="var(--info-light)"
        />
        <KPICard
          label="Total Spent"
          value={formatAED(globalMetrics.globalValue)}
          subValue="Total buy value"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
          color="var(--action)"
          bgColor="var(--action-light)"
        />
      </div>

      <div className="mt-8 mb-6">
        <div className="flex flex-col gap-3 pb-4 md:border-b md:border-slate-100 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">
            Branches Physical Overview
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
              onClick={() => router.push(`/physical/${b.slug}`)}
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Inventory</span>
                  <span className="font-mono text-[15px] font-bold text-accent">{b.totalInventory.toFixed(2)} g</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Initial Capital</span>
                  <span className="font-mono text-[15px] font-bold text-info">{formatAED(b.initialCapital)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Remaining Stock</span>
                  <span className="font-mono text-sm font-bold text-warning">{b.totalRemaining.toFixed(2)} g</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Spent</span>
                  <span className="font-mono text-sm font-bold text-action">{formatAED(b.totalValue)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
