'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { pageHeader, pageTitle, pageSubtitle, btnPrimary, btnSecondary, kpiGrid, tableWrap, dataTable, formInput } from '@/lib/ui';
import KPICard from '@/components/ui/KPICard';
import { PhysicalBuy, PhysicalSell } from '@/types';
import { 
  dbDeletePhysicalSellAction,
  dbDeletePhysicalBuyAction
} from '@/app/actions/physicalActions';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useDateFilter } from '@/hooks/useDateFilter';
import PhysicalSellModal from './PhysicalSellModal';
import DateFilterBar from '@/components/ui/DateFilterBar';
import CustomerLink from '@/components/customers/CustomerLink';
import PhysicalAmountDisplay, { PhysicalAmountKpiValue } from './PhysicalAmountDisplay';

type SortField = 'date' | 'id' | 'particulars' | 'grossWeight' | 'pureConversion' | 'pureGram' | 'idrGram' | 'idrToUsdt' | 'idrRate' | 'sellValue' | 'profit';
type SortDirection = 'asc' | 'desc';

interface Props {
  branchSlug: string;
  buyId: string;
}

export default function PhysicalBuyDetailPage({ branchSlug, buyId }: Props) {
  const { physicalBuys, physicalSells, refetchData, currentSlug } = useApp();
  const basePath = currentSlug === 'superadmin' ? `/physical-deals/${branchSlug}` : `/${branchSlug}/physical-deals`;

  const buy = physicalBuys.find(b => b.id === buyId) || null;
  const sells = physicalSells.filter(s => s.buyId === buyId);

  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const router = useRouter();

  const handleDeleteBuy = async () => {
    if (sells.length > 0) {
      alert("Cannot delete buy with existing sells. Please delete the sells first.");
      return;
    }
    if (!confirm('Are you sure you want to delete this sale?')) return;
    const res = await dbDeletePhysicalBuyAction(buyId);
    if (res.success) {
      router.push(basePath);
    } else {
      alert(res.error);
    }
  };

  const handleDeleteSell = async (sellId: string) => {
    if (!confirm('Are you sure you want to delete this sell?')) return;
    const res = await dbDeletePhysicalSellAction(sellId);
    if (res.success) {
      await refetchData();
    } else {
      alert(res.error);
    }
  };
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const {
    dateFilter, setDateFilter,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
    filteredData: filteredSells
  } = useDateFilter(sells);

  const handleSellSuccess = async () => {
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

  const filteredAndSortedSells = useMemo(() => {
    let result = [...filteredSells];

    if (searchTerm.trim()) {
      const lowerQuery = searchTerm.toLowerCase();
      result = result.filter(sell => 
        (sell.particulars && sell.particulars.toLowerCase().includes(lowerQuery)) ||
        sell.id.toLowerCase().includes(lowerQuery) ||
        sell.date.toLowerCase().includes(lowerQuery)
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
  }, [filteredSells, searchTerm, sortField, sortDirection]);

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

  if (!buy) return <div className="p-8 text-center text-red-500">Buy record not found.</div>;

  const totalSaleProfit = sells.reduce((sum, s) => sum + s.profit, 0);
  const totalSellValue = sells.reduce((sum, s) => sum + s.sellValue, 0);

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className={pageHeader}>
          <div>
            <div className="mb-2 flex items-center gap-3">
              <Link
                href={basePath}
                className="group flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
                aria-label="Back to Physical Deals"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </Link>
              <h2 className={pageTitle}>{buy.item || buy.particulars || 'Sale Details'}</h2>
            </div>
            <p className={pageSubtitle}>Manage sells and track profits for this inventory</p>
          </div>
          <div className="mt-4 flex flex-col items-center gap-3 sm:mt-0 sm:flex-row">
            <button
              type="button"
              onClick={handleDeleteBuy}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-100 sm:w-auto sm:px-4 sm:text-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Delete Sale
            </button>
            <button
              type="button"
              onClick={() => setIsSellModalOpen(true)}
              disabled={buy.remainingWeight <= 0}
              className={`${btnPrimary} w-full sm:w-auto disabled:pointer-events-none disabled:opacity-50`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M5 12h14" />
              </svg>
              Sell
            </button>
          </div>
        </div>

        <div className={`${kpiGrid} grid-cols-2 md:grid-cols-4 mb-6`}>
          <KPICard
            label="Sell Value"
            value={<PhysicalAmountKpiValue aedAmount={totalSellValue} />}
            subValue="Total amount sold"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
            color="var(--action)"
            bgColor="var(--action-light)"
          />
          <KPICard
            label="P&L"
            value={<PhysicalAmountKpiValue aedAmount={totalSaleProfit} showPlus profitTone="auto" />}
            subValue="Total Profit/Loss"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
            color={totalSaleProfit >= 0 ? 'var(--profit)' : 'var(--loss)'}
            bgColor={totalSaleProfit >= 0 ? 'var(--profit-light)' : 'var(--loss-light)'}
            cardClassName={totalSaleProfit >= 0 ? 'bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 border-emerald-100' : 'bg-gradient-to-br from-rose-50/50 to-rose-100/30 border-rose-100'}
          />
          <KPICard
            label="Stock Remaining"
            value={buy.remainingWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' g'}
            subValue="Current inventory"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="var(--warning)"
            bgColor="var(--warning-light)"
          />
          <KPICard
            label="Initial Stock"
            value={buy.pureGram.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' g'}
            subValue="Total purchased"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            color="var(--purple)"
            bgColor="var(--purple-light)"
          />
        </div>

        {/* Buy Info Summary */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-surface-xs">
          <h3 className="mb-4 text-sm font-bold text-slate-800">Inventory Purchase Details</h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            <div>
              <p className="text-slate-500 text-[11px] uppercase tracking-wider font-bold mb-1">TXN ID</p>
              <p className="font-semibold text-slate-800">{buy.txnId || buy.id.split('-')[1]?.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[11px] uppercase tracking-wider font-bold mb-1">Customer</p>
              <p className="font-semibold text-slate-800">
                <CustomerLink slug={branchSlug} customerId={buy.customerId} customerName={buy.customerName} />
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-[11px] uppercase tracking-wider font-bold mb-1">Buy ID</p>
              <p className="font-semibold text-slate-800">{buy.id.split('-')[1].toUpperCase()}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[11px] uppercase tracking-wider font-bold mb-1">Date</p>
              <p className="font-semibold text-slate-800">{new Date(buy.date).toLocaleDateString()}</p>
            </div>
            <div className="col-span-2 sm:col-span-1 lg:col-span-2">
              <p className="text-slate-500 text-[11px] uppercase tracking-wider font-bold mb-1">Item</p>
              <p className="font-semibold text-slate-800">{buy.item || buy.particulars || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[11px] uppercase tracking-wider font-bold mb-1">Gross Wt</p>
              <p className="font-semibold text-slate-800">{buy.grossWeight.toFixed(2)} g</p>
            </div>
            <div>
              <p className="text-slate-500 text-[11px] uppercase tracking-wider font-bold mb-1">Pure Conv</p>
              <p className="font-semibold text-slate-800">{buy.pureConversion}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[11px] uppercase tracking-wider font-bold mb-1">Pure Gram</p>
              <p className="font-bold text-slate-900">{buy.pureGram.toFixed(2)} g</p>
            </div>
            <div>
              <p className="text-slate-500 text-[11px] uppercase tracking-wider font-bold mb-1">IDR Gram</p>
              <p className="font-semibold text-slate-800">{buy.idrGram.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[11px] uppercase tracking-wider font-bold mb-1">IDR / USDT</p>
              <p className="font-semibold text-slate-800">{buy.idrToUsdt.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[11px] uppercase tracking-wider font-bold mb-1">IDR Rate</p>
              <p className="font-semibold text-slate-800">{buy.idrRate.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[11px] uppercase tracking-wider font-bold mb-1">Total</p>
              <PhysicalAmountDisplay aedAmount={buy.total} size="md" align="left" className="!items-start !text-left" />
            </div>
            <div>
              <p className="text-slate-500 text-[11px] uppercase tracking-wider font-bold mb-1">Buy Value</p>
              <PhysicalAmountDisplay aedAmount={buy.buyValue} size="md" align="left" className="!items-start !text-left" />
            </div>
            <div>
              <p className="text-slate-500 text-[11px] uppercase tracking-wider font-bold mb-1">Cost / Gram</p>
              <PhysicalAmountDisplay aedAmount={buy.buyValue / buy.pureGram} size="md" align="left" className="!items-start !text-left" />
            </div>
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

        <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-4 pb-4 px-4 md:border-b md:border-slate-100 md:px-6 md:py-5 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-bold text-slate-900">Sell Deals</h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Search sells..."
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
                  <option value="sellValue">Sort by: Sell Value</option>
                  <option value="profit">Sort by: Profit</option>
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
                      <div className="flex items-center gap-2">Narration <SortIcon field="particulars" /></div>
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
                    <th className={getThClass('center')} onClick={() => handleSort('idrGram')}>
                      <div className="flex items-center justify-center gap-2">IDR Gram <SortIcon field="idrGram" /></div>
                    </th>
                    <th className={getThClass('center')} onClick={() => handleSort('idrToUsdt')}>
                      <div className="flex items-center justify-center gap-2">IDR/USDT <SortIcon field="idrToUsdt" /></div>
                    </th>
                    <th className={getThClass('center')} onClick={() => handleSort('sellValue')}>
                      <div className="flex items-center justify-center gap-2">Sell Value <SortIcon field="sellValue" /></div>
                    </th>
                    <th className={getThClass('center')} onClick={() => handleSort('profit')}>
                      <div className="flex items-center justify-center gap-2">P&L <SortIcon field="profit" /></div>
                    </th>
                    <th className={getThClass('center')}>
                      <div className="flex items-center justify-center gap-2">Actions</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedSells.map((sell) => (
                    <tr key={sell.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="whitespace-nowrap border-y border-l border-black/5 bg-white px-3 py-3.5 text-xs font-semibold text-slate-500 first:rounded-l-2xl sm:px-5 sm:py-4 sm:text-sm">
                        {new Date(sell.date).toLocaleDateString()}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-xs text-slate-600 sm:px-5 sm:py-4 sm:text-sm">
                        <CustomerLink slug={branchSlug} customerId={sell.customerId} customerName={sell.customerName} className="text-xs sm:text-sm font-medium" />
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-xs text-slate-500 sm:px-5 sm:py-4 sm:text-sm">
                        {sell.narration || sell.particulars || '-'}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-center text-sm sm:px-5 sm:py-4">
                        {sell.grossWeight?.toFixed(2) || '0.00'}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-center text-sm sm:px-5 sm:py-4">
                        {sell.pureConversion || '1'}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-center text-sm font-bold sm:px-5 sm:py-4">
                        {sell.pureGram.toFixed(2)}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-center text-sm sm:px-5 sm:py-4">
                        {sell.idrGram?.toLocaleString() || '0'}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-center text-sm sm:px-5 sm:py-4">
                        {sell.idrToUsdt || '0'}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                        <PhysicalAmountDisplay aedAmount={sell.sellValue} size="md" />
                      </td>
                      <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                        <PhysicalAmountDisplay aedAmount={sell.profit} size="md" showPlus profitTone="auto" />
                      </td>
                      <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 text-center last:rounded-r-2xl sm:px-5 sm:py-4">
                        <button onClick={() => handleDeleteSell(sell.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Delete Sell">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredAndSortedSells.length === 0 && (
                    <tr>
                      <td colSpan={11} className="border-y border-black/5 bg-white px-5 py-8 text-center text-sm text-slate-500">
                        {searchTerm || dateFilter !== 'all' ? 'No sells found matching your filters.' : 'No sells recorded yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="flex md:hidden flex-col gap-4 py-4">
                {filteredAndSortedSells.map((sell) => (
                  <div 
                    key={sell.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{sell.particulars || 'SELL'}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400">{new Date(sell.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <button onClick={() => handleDeleteSell(sell.id)} className="text-red-500 hover:text-red-700 p-1 mb-1 transition-colors" title="Delete Sell">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                          </svg>
                        </button>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sell Value</span>
                        <PhysicalAmountDisplay aedAmount={sell.sellValue} size="md" align="right" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-b border-slate-50 pb-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Wt</span>
                        <span className="text-sm font-bold text-slate-700">{sell.grossWeight?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pure Gram</span>
                        <span className="text-sm font-bold text-slate-700">{sell.pureGram.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">P&L</span>
                        <PhysicalAmountDisplay aedAmount={sell.profit} size="md" showPlus profitTone="auto" align="left" className="!items-start !text-left" />
                      </div>
                    </div>
                  </div>
                ))}
                {filteredAndSortedSells.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-500">
                    {searchTerm || dateFilter !== 'all' ? 'No sells found matching your filters.' : 'No sells recorded yet.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isSellModalOpen && buy && (
        <PhysicalSellModal
          open={isSellModalOpen}
          slug={branchSlug}
          buy={buy}
          onClose={() => setIsSellModalOpen(false)}
          onSuccess={handleSellSuccess}
        />
      )}
    </>
  );
}
