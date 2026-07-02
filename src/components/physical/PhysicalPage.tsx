'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PhysicalBuy, PhysicalSell } from '@/types';
import { 
  dbUpdatePhysicalBalanceAction, 
} from '@/app/actions/physicalActions';
import { useApp } from '@/context/AppContext';
import { useDateFilter } from '@/hooks/useDateFilter';
import { resolveDateFilterRange, isDateInRange } from '@/lib/dateFilterRange';
import DateFilterBar from '@/components/ui/DateFilterBar';
import PhysicalExportModal from './PhysicalExportModal';
import PhysicalDealModal from './PhysicalDealModal';
import PhysicalKpiGrid from './PhysicalKpiGrid';
import PhysicalAmountDisplay from './PhysicalAmountDisplay';
import { DraftBuyRow, DraftBuyCard, DraftSellRow, DraftSellCard } from './DraftRows';
import { computePhysicalKpiMetrics } from '@/lib/physical/kpiMetrics';
import { usePhysicalDrafts } from '@/hooks/usePhysicalDrafts';
import CustomerLink from '@/components/customers/CustomerLink';
import { useWriteAccess } from '@/context/RbacWriteContext';
import {
  btnPrimary, btnSecondary,
  pageHeader,
  pageSubtitle,
  pageTitle,
  tableWrap,
  dataTable,
  formInput,
} from '@/lib/ui';

type SortField = 'date' | 'particulars' | 'grossWeight' | 'pureConversion' | 'pureGram' | 'idrGram' | 'idrToUsdt' | 'idrRate' | 'buyValue' | 'remainingWeight';
type SellSortField = 'date' | 'customerName' | 'narration' | 'grossWeight' | 'pureGram' | 'sellValue' | 'profit';
type SortDirection = 'asc' | 'desc';

function isFixedDeal(buy: PhysicalBuy) {
  if (buy.fixOrUnfix) {
    return buy.fixOrUnfix === 'fixed';
  }
  return buy.deal != null && buy.deal > 0;
}

export default function PhysicalPage() {
  const { currentSlug, branches, physicalBalances, physicalBuys, physicalSells, refetchData, currencyRates } = useApp();
  const { canWrite, buttonProps: wp } = useWriteAccess();
  const router = useRouter();
  const branchSlug = currentSlug;
  const branchId = branches.find(b => b.slug === currentSlug)?.id;

  const {
    draftBuys,
    draftSells,
    saveDraftBuy,
    saveDraftSell,
    discardDraftBuy,
    discardDraftSell,
  } = usePhysicalDrafts(branchId);

  const balance = physicalBalances.find(b => b.branchId === branchId) || null;
  const buys = physicalBuys.filter(b => b.branchId === branchId);

  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [isInitialSetupOpen, setIsInitialSetupOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [sellSearchTerm, setSellSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sellSortField, setSellSortField] = useState<SellSortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [sellSortDirection, setSellSortDirection] = useState<SortDirection>('desc');

  const branchBuyIds = useMemo(() => new Set(buys.map(b => b.id)), [buys]);
  const availableStock = useMemo(() => buys.filter(b => b.remainingWeight > 0.001), [buys]);
  const branchSells = useMemo(
    () => physicalSells.filter(s => branchBuyIds.has(s.buyId)),
    [physicalSells, branchBuyIds],
  );
  const buyById = useMemo(() => new Map(buys.map(b => [b.id, b])), [buys]);

  const {
    dateFilter, setDateFilter,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
    filteredData: filteredBuys
  } = useDateFilter(buys);

  const filteredSells = useMemo(() => {
    const range = resolveDateFilterRange(dateFilter, customStartDate, customEndDate);
    if (!range.startDate && !range.endDate) return branchSells;
    return branchSells.filter(item => isDateInRange(item.date, range));
  }, [branchSells, dateFilter, customStartDate, customEndDate]);

  const kpiMetrics = useMemo(
    () => computePhysicalKpiMetrics(buys, filteredBuys, filteredSells, isFixedDeal, currencyRates),
    [buys, filteredBuys, filteredSells, currencyRates],
  );

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

  const handleCreateBuySuccess = async () => {
    await refetchData();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSellSort = (field: SellSortField) => {
    if (sellSortField === field) {
      setSellSortDirection(sellSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSellSortField(field);
      setSellSortDirection('asc');
    }
  };

  const filteredAndSortedBuys = useMemo(() => {
    let result = [...filteredBuys];

    if (searchTerm.trim()) {
      const lowerQuery = searchTerm.toLowerCase();
      result = result.filter(buy => 
        (buy.particulars && buy.particulars.toLowerCase().includes(lowerQuery)) ||
        (buy.item && buy.item.toLowerCase().includes(lowerQuery)) ||
        (buy.customerName && buy.customerName.toLowerCase().includes(lowerQuery)) ||
        (buy.txnId && buy.txnId.toLowerCase().includes(lowerQuery)) ||
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

  const filteredAndSortedSells = useMemo(() => {
    let result = [...filteredSells];

    if (sellSearchTerm.trim()) {
      const q = sellSearchTerm.toLowerCase();
      result = result.filter(sell => {
        const buy = buyById.get(sell.buyId);
        return (
          (sell.customerName && sell.customerName.toLowerCase().includes(q)) ||
          (sell.narration && sell.narration.toLowerCase().includes(q)) ||
          (sell.particulars && sell.particulars.toLowerCase().includes(q)) ||
          (sell.txnId && sell.txnId.toLowerCase().includes(q)) ||
          (buy?.item && buy.item.toLowerCase().includes(q)) ||
          sell.date.toLowerCase().includes(q)
        );
      });
    }

    result.sort((a, b) => {
      let valA: unknown = a[sellSortField as keyof PhysicalSell];
      let valB: unknown = b[sellSortField as keyof PhysicalSell];
      if (sellSortField === 'narration') {
        valA = a.narration || a.particulars || '';
        valB = b.narration || b.particulars || '';
      }
      if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }
      if ((valA as number | string) < (valB as number | string)) return sellSortDirection === 'asc' ? -1 : 1;
      if ((valA as number | string) > (valB as number | string)) return sellSortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [filteredSells, sellSearchTerm, sellSortField, sellSortDirection, buyById]);

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

  const SellSortIcon = ({ field }: { field: SellSortField }) => {
    if (sellSortField !== field) {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300 opacity-0 transition-opacity group-hover:opacity-100">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sellSortDirection === 'asc' ? (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const paymentLabel = (mode?: string) => {
    const map: Record<string, string> = {
      CASH: 'Cash',
      BANK_TRANSFER: 'Bank / Transfer',
      USDT: 'USDT',
      MULTI_CURRENCY: 'Multy Currency',
    };
    return mode ? map[mode] ?? mode : '—';
  };

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className={pageHeader}>
          <div>
            <h2 className={pageTitle}>Physical Deals</h2>
            <p className={pageSubtitle}>Vault inventory, bullion tracking, and gold buys</p>
          </div>
          <div className="mt-4 flex flex-col items-center gap-3 sm:mt-0 sm:flex-row">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className={`${btnSecondary} w-full sm:w-auto`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
            <button
              type="button"
              onClick={() => canWrite && setIsDealModalOpen(true)}
              {...wp()}
              className={`${btnPrimary} w-full sm:w-auto${!canWrite ? ' cursor-not-allowed opacity-50' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Deal
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
        <PhysicalKpiGrid metrics={kpiMetrics} />

        <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover mb-6">
          <div className="flex flex-col gap-4 pb-4 px-4 md:border-b md:border-slate-100 md:px-6 md:py-5 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-bold text-slate-900">Gold Deals</h3>
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
                  <option value="remainingWeight">Sort by: Remaining Vol</option>
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
                    <th className={getThClass('left')}>
                      <div className="flex items-center gap-2">Customer</div>
                    </th>
                    <th className={getThClass('left')} onClick={() => handleSort('particulars')}>
                      <div className="flex items-center gap-2">Item <SortIcon field="particulars" /></div>
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
                      <div className="flex items-center justify-center gap-2">Buy Value (USDT) <SortIcon field="buyValue" /></div>
                    </th>
                    <th className={getThClass('center')} onClick={() => handleSort('remainingWeight')}>
                      <div className="flex items-center justify-center gap-2">Remaining Vol <SortIcon field="remainingWeight" /></div>
                    </th>
                    <th className="px-3 pb-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {draftBuys.map(draft => (
                    <DraftBuyRow key={draft.draftId} buy={draft} onDiscard={discardDraftBuy} />
                  ))}
                  {filteredAndSortedBuys.map((buy) => (
                    <tr
                      key={buy.id}
                      data-interactive-row
                      onClick={() => router.push(`/${branchSlug}/physical-deals/${buy.id}`)}
                      className={`cursor-pointer group hover:bg-slate-50/80 transition-colors ${buy.remainingWeight > 0 ? 'bg-gradient-to-l from-amber-100/80 to-transparent' : ''}`}
                    >
                      <td className={`whitespace-nowrap border-y border-l border-black/5 px-3 py-3.5 text-xs font-semibold text-slate-500 first:rounded-l-2xl sm:px-5 sm:py-4 sm:text-sm ${buy.remainingWeight > 0 ? 'bg-transparent' : 'bg-white'}`}>
                        {new Date(buy.date).toLocaleDateString()}
                      </td>
                      <td className={`border-y border-black/5 px-3 py-3.5 text-xs text-slate-600 sm:px-5 sm:py-4 sm:text-sm ${buy.remainingWeight > 0 ? 'bg-transparent' : 'bg-white'}`}>
                        <CustomerLink slug={branchSlug} customerId={buy.customerId} customerName={buy.customerName} className="text-xs sm:text-sm font-medium" />
                      </td>
                      <td className={`border-y border-black/5 px-3 py-3.5 text-xs text-slate-500 sm:px-5 sm:py-4 sm:text-sm ${buy.remainingWeight > 0 ? 'bg-transparent' : 'bg-white'}`}>
                        {buy.item || buy.particulars || '-'}
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
                      <td className={`border-y border-black/5 px-3 py-3.5 sm:px-5 sm:py-4 ${buy.remainingWeight > 0 ? 'bg-transparent' : 'bg-white'}`}>
                        <PhysicalAmountDisplay aedAmount={buy.buyValue} size="md" showUnit={false} />
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
                            router.push(`/${branchSlug}/physical-deals/${buy.id}`);
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredAndSortedBuys.length === 0 && draftBuys.length === 0 && (
                    <tr>
                      <td colSpan={9} className="border-y border-black/5 bg-white px-5 py-8 text-center text-sm text-slate-500">
                        {searchTerm || dateFilter !== 'all-time' ? 'No deals found matching your filters.' : 'No gold deals yet. Create one to get started.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="flex md:hidden flex-col gap-4 py-4">
                {draftBuys.map(draft => (
                  <DraftBuyCard key={draft.draftId} buy={draft} onDiscard={discardDraftBuy} />
                ))}
                {filteredAndSortedBuys.map((buy) => (
                  <div 
                    key={buy.id}
                    onClick={() => router.push(`/${branchSlug}/physical-deals/${buy.id}`)}
                    className={`group flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-md cursor-pointer active:scale-[0.98] ${buy.remainingWeight > 0 ? 'bg-gradient-to-br from-amber-50 to-white' : 'bg-white'}`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{buy.particulars || 'BUY'}</span>
                        <span className="text-[10px] text-slate-400">{new Date(buy.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Buy Value (USDT)</span>
                        <PhysicalAmountDisplay aedAmount={buy.buyValue} size="md" align="right" showUnit={false} />
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
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Remaining Vol</span>
                        <span className={`text-sm font-bold ${buy.remainingWeight > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                          {buy.remainingWeight > 0 ? `${buy.remainingWeight.toFixed(2)} g` : '0 g'}
                        </span>
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
                {filteredAndSortedBuys.length === 0 && draftBuys.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-500">
                    {searchTerm || dateFilter !== 'all-time' ? 'No deals found matching your filters.' : 'No gold deals yet. Create one to get started.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Gold Sales */}
        <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-4 pb-4 px-4 md:border-b md:border-slate-100 md:px-6 md:py-5 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-bold text-slate-900">Gold Sales</h3>
            <div className="relative flex-1 sm:max-w-xs">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Search sales..."
                value={sellSearchTerm}
                onChange={e => setSellSearchTerm(e.target.value)}
                className={`${formInput} !py-2 !pl-10 !pr-4 !text-sm w-full`}
              />
            </div>
          </div>
          <div className="p-0">
            <div className={tableWrap}>
              <table className={`${dataTable} w-full hidden md:table min-w-[1000px]`}>
                <thead>
                  <tr>
                    <th className={getThClass('left')} onClick={() => handleSellSort('date')}>
                      <div className="flex items-center gap-2">Date <SellSortIcon field="date" /></div>
                    </th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">TXN ID</th>
                    <th className={getThClass('left')} onClick={() => handleSellSort('customerName')}>
                      <div className="flex items-center gap-2">Customer <SellSortIcon field="customerName" /></div>
                    </th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Source Item</th>
                    <th className={getThClass('left')} onClick={() => handleSellSort('narration')}>
                      <div className="flex items-center gap-2">Narration <SellSortIcon field="narration" /></div>
                    </th>
                    <th className={getThClass('center')} onClick={() => handleSellSort('grossWeight')}>
                      <div className="flex items-center justify-center gap-2">Gram <SellSortIcon field="grossWeight" /></div>
                    </th>
                    <th className={getThClass('center')} onClick={() => handleSellSort('pureGram')}>
                      <div className="flex items-center justify-center gap-2">Pure Gram <SellSortIcon field="pureGram" /></div>
                    </th>
                    <th className="px-3 pb-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Payment</th>
                    <th className={getThClass('center')} onClick={() => handleSellSort('sellValue')}>
                      <div className="flex items-center justify-center gap-2">Sell Value (USDT) <SellSortIcon field="sellValue" /></div>
                    </th>
                    <th className={getThClass('center')} onClick={() => handleSellSort('profit')}>
                      <div className="flex items-center justify-center gap-2">Profit (USDT) <SellSortIcon field="profit" /></div>
                    </th>
                    <th className="px-3 pb-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {draftSells.map(draft => (
                    <DraftSellRow
                      key={draft.draftId}
                      sell={draft}
                      sourceBuy={buyById.get(draft.buyId)}
                      onDiscard={discardDraftSell}
                    />
                  ))}
                  {filteredAndSortedSells.map(sell => {
                    const buy = buyById.get(sell.buyId);
                    const isProfit = sell.profit > 0;
                    const isLoss = sell.profit < 0;
                    const rowGradient = isProfit
                      ? 'bg-gradient-to-l from-emerald-50/90 to-transparent'
                      : isLoss
                        ? 'bg-gradient-to-l from-red-50/90 to-transparent'
                        : '';
                    const cellBg = isProfit || isLoss ? 'bg-transparent' : 'bg-white';
                    return (
                      <tr
                        key={sell.id}
                        className={`cursor-pointer hover:bg-slate-50/80 transition-colors ${rowGradient}`}
                        onClick={() => router.push(`/${branchSlug}/physical-deals/${sell.buyId}`)}
                      >
                        <td className={`whitespace-nowrap border-y border-l border-black/5 px-3 py-3.5 text-xs font-semibold text-slate-500 first:rounded-l-2xl sm:px-5 sm:py-4 ${cellBg}`}>
                          {new Date(sell.date).toLocaleDateString()}
                        </td>
                        <td className={`border-y border-black/5 px-3 py-3.5 text-xs font-mono text-slate-500 sm:px-5 sm:py-4 ${cellBg}`}>
                          {sell.txnId || '—'}
                        </td>
                        <td className={`border-y border-black/5 px-3 py-3.5 text-sm text-slate-700 sm:px-5 sm:py-4 ${cellBg}`}>
                          <CustomerLink slug={branchSlug} customerId={sell.customerId} customerName={sell.customerName} />
                        </td>
                        <td className={`border-y border-black/5 px-3 py-3.5 text-sm text-slate-600 sm:px-5 sm:py-4 ${cellBg}`}>
                          {buy?.item || buy?.particulars || '—'}
                        </td>
                        <td className={`border-y border-black/5 px-3 py-3.5 text-sm text-slate-600 sm:px-5 sm:py-4 ${cellBg}`}>
                          {sell.narration || sell.particulars || '—'}
                        </td>
                        <td className={`border-y border-black/5 px-3 py-3.5 text-center text-sm sm:px-5 sm:py-4 ${cellBg}`}>
                          {sell.grossWeight?.toFixed(2)}
                        </td>
                        <td className={`border-y border-black/5 px-3 py-3.5 text-center text-sm font-bold sm:px-5 sm:py-4 ${cellBg}`}>
                          {sell.pureGram.toFixed(2)}
                        </td>
                        <td className={`border-y border-black/5 px-3 py-3.5 text-center text-xs sm:px-5 sm:py-4 ${cellBg}`}>
                          {paymentLabel(sell.paymentMode)}
                        </td>
                        <td className={`border-y border-black/5 px-3 py-3.5 sm:px-5 sm:py-4 ${cellBg}`}>
                          <PhysicalAmountDisplay aedAmount={sell.sellValue} size="md" showUnit={false} />
                        </td>
                        <td className={`border-y border-black/5 px-3 py-3.5 sm:px-5 sm:py-4 ${cellBg}`}>
                          <PhysicalAmountDisplay aedAmount={sell.profit} size="md" showPlus profitTone="auto" showUnit={false} />
                        </td>
                        <td className={`border-y border-r border-black/5 px-3 py-3.5 text-center last:rounded-r-2xl sm:px-5 sm:py-4 ${cellBg}`}>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                            onClick={e => {
                              e.stopPropagation();
                              router.push(`/${branchSlug}/physical-deals/${sell.buyId}`);
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAndSortedSells.length === 0 && draftSells.length === 0 && (
                    <tr>
                      <td colSpan={11} className="border-y border-black/5 bg-white px-5 py-8 text-center text-sm text-slate-500">
                        {sellSearchTerm || dateFilter !== 'all-time' ? 'No sales found matching your filters.' : 'No gold sales recorded yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="flex flex-col gap-4 py-4 px-4 md:hidden">
                {draftSells.map(draft => (
                  <DraftSellCard
                    key={draft.draftId}
                    sell={draft}
                    sourceBuy={buyById.get(draft.buyId)}
                    onDiscard={discardDraftSell}
                  />
                ))}
                {filteredAndSortedSells.map(sell => {
                  const buy = buyById.get(sell.buyId);
                  const cardGradient = sell.profit > 0
                    ? 'bg-gradient-to-br from-emerald-50 to-white'
                    : sell.profit < 0
                      ? 'bg-gradient-to-br from-red-50 to-white'
                      : 'bg-white';
                  return (
                    <div
                      key={sell.id}
                      onClick={() => router.push(`/${branchSlug}/physical-deals/${sell.buyId}`)}
                      className={`flex cursor-pointer flex-col gap-3 rounded-2xl border border-slate-100 p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] ${cardGradient}`}
                    >
                      <div className="flex items-start justify-between border-b border-slate-50 pb-3">
                        <div>
                          <CustomerLink slug={branchSlug} customerId={sell.customerId} customerName={sell.customerName || 'Sale'} className="text-sm" />
                          <p className="text-[10px] text-slate-400">{new Date(sell.date).toLocaleDateString()} · {sell.txnId || sell.id.slice(0, 8)}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Profit (USDT)</span>
                          <PhysicalAmountDisplay aedAmount={sell.profit} size="md" showPlus profitTone="auto" align="right" showUnit={false} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-[10px] font-bold uppercase text-slate-400">Item</span><p>{buy?.item || '—'}</p></div>
                        <div><span className="text-[10px] font-bold uppercase text-slate-400">Sell Value (USDT)</span><PhysicalAmountDisplay aedAmount={sell.sellValue} size="md" align="left" className="!items-start !text-left" showUnit={false} /></div>
                        <div className="col-span-2"><span className="text-[10px] font-bold uppercase text-slate-400">Narration</span><p>{sell.narration || '—'}</p></div>
                      </div>
                    </div>
                  );
                })}
                {filteredAndSortedSells.length === 0 && draftSells.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-500">No gold sales recorded yet.</div>
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
            <h3 className="mb-4 text-lg font-bold">Gold Capital Setup</h3>
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

      {isDealModalOpen && branchSlug && branchId && (
        <PhysicalDealModal
          open={isDealModalOpen}
          slug={branchSlug}
          branchId={branchId}
          availableBuys={availableStock}
          onClose={() => setIsDealModalOpen(false)}
          onSuccess={refetchData}
          onSaveDraftBuy={saveDraftBuy}
          onSaveDraftSell={saveDraftSell}
        />
      )}

      {isExportModalOpen && (
        <PhysicalExportModal
          open={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          buys={filteredBuys}
          sells={physicalSells}
          initialCapital={balance?.initialCapital || 0}
          initialVolume={balance?.initialVolume || 0}
        />
      )}
    </>
  );
}
