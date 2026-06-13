'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import KPICard from '@/components/ui/KPICard';
import { PhysicalBuy, PhysicalBalance } from '@/types';
import { 
  dbUpdatePhysicalBalanceAction, 
  dbAddPhysicalBuyAction 
} from '@/app/actions/physicalActions';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useDateFilter } from '@/hooks/useDateFilter';
import DateFilterBar from '@/components/ui/DateFilterBar';
import {
  btnPrimary, btnSecondary,
  kpiGrid,
  pageHeader,
  pageSubtitle,
  pageTitle,
  tableWrap,
  dataTable,
  formInput,
} from '@/lib/ui';

type SortField = 'date' | 'particulars' | 'grossWeight' | 'pureConversion' | 'pureGram' | 'idrGram' | 'idrToUsdt' | 'idrRate' | 'buyValue';
type SortDirection = 'asc' | 'desc';

export default function PhysicalPage() {
  const { currentSlug, branches, physicalBalances, physicalBuys, physicalSells, refetchData } = useApp();
  const router = useRouter();
  const branchSlug = currentSlug;
  const branchId = branches.find(b => b.slug === currentSlug)?.id;

  const balance = physicalBalances.find(b => b.branchId === branchId) || null;
  const buys = physicalBuys.filter(b => b.branchId === branchId);

  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isInitialSetupOpen, setIsInitialSetupOpen] = useState(false);

  const [buyForm, setBuyForm] = useState({
    date: new Date().toISOString().split('T')[0],
    particulars: '',
    grossWeightStr: '',
    pureConversionStr: '1',
    idrGramStr: '',
    idrToUsdtStr: '18000'
  });

  const buyCalculations = useMemo(() => {
    const gw = parseFloat(buyForm.grossWeightStr) || 0;
    const pc = parseFloat(buyForm.pureConversionStr) || 1;
    const ig = parseFloat(buyForm.idrGramStr) || 0;
    const itu = parseFloat(buyForm.idrToUsdtStr) || 18000;
    
    const pureGram = gw * pc;
    const idrRate = itu > 0 ? ig / itu : 0;
    const total = pureGram * idrRate;

    return { pureGram, idrRate, total };
  }, [buyForm]);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const {
    dateFilter, setDateFilter,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
    filteredData: filteredBuys
  } = useDateFilter(buys);

  useEffect(() => {
    if (balance && balance.initialCapital === 0 && balance.initialVolume === 0 && buys.length === 0) {
      setIsInitialSetupOpen(true);
    }
  }, [balance, buys.length]);

  const handleInitialSetup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const cap = parseFloat(fd.get('initialCapital') as string);
    const vol = parseFloat(fd.get('initialVolume') as string);
    
    if (!branchId) return;
    const res = await dbUpdatePhysicalBalanceAction(branchId, cap, vol);
    if (res.success) {
      setIsInitialSetupOpen(false);
      await refetchData();
    } else {
      alert(res.error);
    }
  };

  const handleCreateBuy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!branchId) return;
    
    const grossWeight = parseFloat(buyForm.grossWeightStr) || 0;
    const pureConversion = parseFloat(buyForm.pureConversionStr) || 1;
    const idrGram = parseFloat(buyForm.idrGramStr) || 0;
    const idrToUsdt = parseFloat(buyForm.idrToUsdtStr) || 18000;
    
    const { pureGram, idrRate, total } = buyCalculations;

    const buyData = {
      branchId,
      date: buyForm.date,
      particulars: buyForm.particulars,
      grossWeight,
      pureConversion,
      pureGram,
      idrGram,
      idrToUsdt,
      idrRate,
      total,
      buyValue: total, // Buy value equals total initially
    };

    const res = await dbAddPhysicalBuyAction(buyData);
    if (res.success && res.data) {
      setIsBuyModalOpen(false);
      setBuyForm({
        date: new Date().toISOString().split('T')[0],
        particulars: '',
        grossWeightStr: '',
        pureConversionStr: '1',
        idrGramStr: '',
        idrToUsdtStr: '18000'
      });
      await refetchData();
    } else {
      alert(res.error);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedBuys = useMemo(() => {
    let result = [...filteredBuys];

    if (searchTerm.trim()) {
      const lowerQuery = searchTerm.toLowerCase();
      result = result.filter(buy => 
        (buy.particulars && buy.particulars.toLowerCase().includes(lowerQuery)) ||
        buy.date.toLowerCase().includes(lowerQuery)
      );
    }

    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [filteredBuys, searchTerm, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300 opacity-0 transition-opacity group-hover:opacity-100">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const getThClass = (align: 'left' | 'center' | 'right') => 
    `group cursor-pointer select-none px-3 pb-3 text-${align} text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 sm:px-5`;

  if (!branchId) return <div className="p-8 text-center text-red-500">Branch not found.</div>;

  const totalInventory = filteredBuys.reduce((sum, b) => sum + b.pureGram, 0);
  const totalRemaining = filteredBuys.reduce((sum, b) => sum + b.remainingWeight, 0);
  
  const filteredBuyIds = new Set(filteredBuys.map(b => b.id));
  const filteredSells = physicalSells.filter(s => filteredBuyIds.has(s.buyId));
  const totalPL = filteredSells.reduce((sum, s) => sum + s.profit, 0);

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className="mb-5 flex items-start justify-between border-b border-slate-200/80 pb-5 sm:items-end">
          <div>
            <h2 className={pageTitle}>Physical Assets</h2>
            <p className={pageSubtitle}>Vault inventory, bullion tracking, and physical buys</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsInitialSetupOpen(true)} className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:rounded-lg gap-2 font-semibold text-sm">
              <span className="hidden sm:inline">Update Capital</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="sm:hidden">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={() => setIsBuyModalOpen(true)} className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors hover:bg-accent hover:text-white sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:rounded-lg sm:bg-accent sm:text-white sm:hover:bg-accent-hover gap-2 font-semibold text-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="sm:w-[18px] sm:h-[18px] sm:stroke-2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="hidden sm:inline">New Buy</span>
            </button>
          </div>
        </div>

        <DateFilterBar
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
        />
        <div className={`${kpiGrid} grid-cols-2 md:grid-cols-4 mb-6`}>
          <KPICard
            label="Total Purchases"
            value={filteredBuys.length}
            subValue="Number of buys"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
            color="var(--purple)"
            bgColor="var(--purple-light)"
          />
          <KPICard
            label="Total Inventory"
            value={totalInventory.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' g'}
            subValue="Gross weight bought"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            color="var(--accent)"
            bgColor="var(--accent-light)"
          />
          <KPICard
            label="Total Remaining"
            value={totalRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' g'}
            subValue="Current stock"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="var(--warning)"
            bgColor="var(--warning-light)"
          />
          <KPICard
            label="P&L"
            value={totalPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' AED'}
            subValue="Total Profit/Loss"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color={totalPL >= 0 ? "var(--success)" : "var(--danger)"}
            bgColor={totalPL >= 0 ? "var(--success-light)" : "var(--danger-light)"}
          />
        </div>

        <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-4 pb-4 px-4 md:border-b md:border-slate-100 md:px-6 md:py-5 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-bold text-slate-900">Physical Buys</h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Search buys..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={`${formInput} !py-2 !pl-10 !pr-4 !text-sm`}
                />
              </div>
              <div className="flex md:hidden items-center gap-2">
                <select
                  value={sortField}
                  onChange={(e) => handleSort(e.target.value as SortField)}
                  className={`${formInput} !py-2 !text-sm flex-1 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10`}
                >
                  <option value="date">Sort by: Date</option>
                  <option value="particulars">Sort by: Particulars</option>
                  <option value="grossWeight">Sort by: Gross Wt</option>
                  <option value="pureGram">Sort by: Pure Gram</option>
                  <option value="buyValue">Sort by: Buy Value</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${sortDirection === 'desc' ? 'rotate-180' : ''}`}>
                    <path d="M12 5v14M5 12l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="p-0">
            <div className={tableWrap}>
              <table className={`${dataTable} w-full hidden md:table`}>
                <thead>
                  <tr>
                    <th className={getThClass('left')} onClick={() => handleSort('date')}>
                      <div className="flex items-center gap-2">Date <SortIcon field="date" /></div>
                    </th>
                    <th className={getThClass('left')} onClick={() => handleSort('particulars')}>
                      <div className="flex items-center gap-2">Particulars <SortIcon field="particulars" /></div>
                    </th>
                    <th className={getThClass('center')} onClick={() => handleSort('grossWeight')}>
                      <div className="flex items-center justify-center gap-2">Gross Wt <SortIcon field="grossWeight" /></div>
                    </th>
                    <th className={getThClass('center')} onClick={() => handleSort('pureConversion')}>
                      <div className="flex items-center justify-center gap-2">Pure Conv <SortIcon field="pureConversion" /></div>
                    </th>
                    <th className={getThClass('center')} onClick={() => handleSort('pureGram')}>
                      <div className="flex items-center justify-center gap-2">Pure Gram <SortIcon field="pureGram" /></div>
                    </th>
                    <th className={getThClass('center')} onClick={() => handleSort('buyValue')}>
                      <div className="flex items-center justify-center gap-2">Buy Value <SortIcon field="buyValue" /></div>
                    </th>
                    <th className={getThClass('center')}>
                      <div className="flex items-center justify-center gap-2">Remaining Vol</div>
                    </th>
                    <th className="px-3 pb-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedBuys.map((buy) => (
                    <tr
                      key={buy.id}
                      data-interactive-row
                      onClick={() => router.push(`/${branchSlug}/physical/${buy.id}`)}
                      className={`cursor-pointer group hover:bg-slate-50/80 transition-colors ${buy.remainingWeight > 0 ? 'bg-gradient-to-l from-amber-100/80 to-transparent' : ''}`}
                    >
                      <td className={`whitespace-nowrap border-y border-l border-black/5 px-3 py-3.5 text-xs font-semibold text-slate-500 first:rounded-l-2xl sm:px-5 sm:py-4 sm:text-sm ${buy.remainingWeight > 0 ? 'bg-transparent' : 'bg-white'}`}>
                        {new Date(buy.date).toLocaleDateString()}
                      </td>
                      <td className={`border-y border-black/5 px-3 py-3.5 text-xs text-slate-500 sm:px-5 sm:py-4 sm:text-sm ${buy.remainingWeight > 0 ? 'bg-transparent' : 'bg-white'}`}>
                        {buy.particulars || '-'}
                      </td>
                      <td className={`border-y border-black/5 px-3 py-3.5 text-center text-sm sm:px-5 sm:py-4 ${buy.remainingWeight > 0 ? 'bg-transparent' : 'bg-white'}`}>
                        {buy.grossWeight.toFixed(2)}
                      </td>
                      <td className={`border-y border-black/5 px-3 py-3.5 text-center text-sm sm:px-5 sm:py-4 ${buy.remainingWeight > 0 ? 'bg-transparent' : 'bg-white'}`}>
                        {buy.pureConversion}
                      </td>
                      <td className={`border-y border-black/5 px-3 py-3.5 text-center text-sm font-bold sm:px-5 sm:py-4 ${buy.remainingWeight > 0 ? 'bg-transparent' : 'bg-white'}`}>
                        {buy.pureGram.toFixed(2)}
                      </td>
                      <td className={`border-y border-black/5 px-3 py-3.5 text-center font-mono text-sm font-bold sm:px-5 sm:py-4 ${buy.remainingWeight > 0 ? 'bg-transparent' : 'bg-white'}`}>
                        {buy.buyValue.toLocaleString()}
                      </td>
                      <td className={`border-y border-black/5 px-3 py-3.5 text-center text-sm font-bold sm:px-5 sm:py-4 ${buy.remainingWeight > 0 ? 'bg-transparent text-amber-600' : 'bg-white text-slate-900'}`}>
                        {buy.remainingWeight > 0 ? `${buy.remainingWeight.toFixed(2)} g` : '0 g'}
                      </td>
                      <td className={`border-y border-r border-black/5 px-3 py-3.5 text-center last:rounded-r-2xl sm:px-5 sm:py-4 ${buy.remainingWeight > 0 ? 'bg-transparent' : 'bg-white'}`}>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/${branchSlug}/physical/${buy.id}`);
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredAndSortedBuys.length === 0 && (
                    <tr>
                      <td colSpan={8} className="border-y border-black/5 bg-white px-5 py-8 text-center text-sm text-slate-500">
                        {searchTerm || dateFilter !== 'all' ? 'No buys found matching your filters.' : 'No physical buys found. Create one to get started.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="flex md:hidden flex-col gap-4 py-4">
                {filteredAndSortedBuys.map((buy) => (
                  <div 
                    key={buy.id}
                    onClick={() => router.push(`/${branchSlug}/physical/${buy.id}`)}
                    className="group flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-md cursor-pointer active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{buy.particulars || 'BUY'}</span>
                        <span className="text-[10px] text-slate-400">{new Date(buy.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Buy Value</span>
                        <span className="font-mono text-sm font-bold text-slate-900">{buy.buyValue.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Wt</span>
                        <span className="text-sm font-bold text-slate-700">{buy.grossWeight.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pure Gram</span>
                        <span className="text-sm font-bold text-slate-700">{buy.pureGram.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IDR/USDT</span>
                        <span className="text-sm font-bold text-slate-700">{buy.idrToUsdt}</span>
                      </div>
                    </div>
                    
                    <div className="mt-1 flex items-center justify-between border-t border-slate-50 pt-3 text-sm font-bold text-accent group-hover:text-accent-hover">
                      <span>View Details</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
                {filteredAndSortedBuys.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-500">
                    {searchTerm || dateFilter !== 'all' ? 'No buys found matching your filters.' : 'No physical buys found. Create one to get started.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isInitialSetupOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold">Physical Capital Setup</h3>
            <form onSubmit={handleInitialSetup} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Initial Capital (Fund)</label>
                <input
                  type="number"
                  step="0.01"
                  name="initialCapital"
                  defaultValue={balance?.initialCapital || 0}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Initial Gold Weight (g)</label>
                <input
                  type="number"
                  step="0.01"
                  name="initialVolume"
                  defaultValue={balance?.initialVolume || 0}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsInitialSetupOpen(false)} className={btnSecondary}>Cancel</button>
                <button type="submit" className={btnPrimary}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBuyModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-lg font-bold">New Physical Buy</h3>
            <form onSubmit={handleCreateBuy} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={buyForm.date}
                    onChange={(e) => setBuyForm({ ...buyForm, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Particulars</label>
                  <input
                    type="text"
                    name="particulars"
                    value={buyForm.particulars}
                    onChange={(e) => setBuyForm({ ...buyForm, particulars: e.target.value })}
                    placeholder="e.g. 1 KG BUY"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Gross Weight</label>
                  <input
                    type="number"
                    step="0.01"
                    name="grossWeight"
                    value={buyForm.grossWeightStr}
                    onChange={(e) => setBuyForm({ ...buyForm, grossWeightStr: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Pure Conversion</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="pureConversion"
                    value={buyForm.pureConversionStr}
                    onChange={(e) => setBuyForm({ ...buyForm, pureConversionStr: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">IDR Gram</label>
                  <input
                    type="number"
                    step="0.01"
                    name="idrGram"
                    value={buyForm.idrGramStr}
                    onChange={(e) => setBuyForm({ ...buyForm, idrGramStr: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">IDR to USDT</label>
                  <input
                    type="number"
                    step="0.01"
                    name="idrToUsdt"
                    value={buyForm.idrToUsdtStr}
                    onChange={(e) => setBuyForm({ ...buyForm, idrToUsdtStr: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Pure Gram</label>
                  <input
                    type="text"
                    value={buyCalculations.pureGram.toFixed(3)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-500 outline-none"
                    readOnly
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">IDR Rate</label>
                  <input
                    type="text"
                    value={buyCalculations.idrRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-500 outline-none"
                    readOnly
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Buy Value</label>
                  <input
                    type="text"
                    value={buyCalculations.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    className="w-full rounded-xl border border-slate-200 bg-emerald-50 px-3.5 py-2 text-emerald-700 font-bold outline-none"
                    readOnly
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsBuyModalOpen(false)} className={btnSecondary}>Cancel</button>
                <button type="submit" className={btnPrimary}>Create Buy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
