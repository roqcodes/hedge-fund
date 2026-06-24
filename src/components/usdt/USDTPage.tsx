'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UsdtBuy, UsdtSell } from '@/types';
import { useApp } from '@/context/AppContext';
import { formatMoneyValue } from '@/data/mockData';
import { useDateFilter } from '@/hooks/useDateFilter';
import { resolveDateFilterRange, isDateInRange } from '@/lib/dateFilterRange';
import DateFilterBar from '@/components/ui/DateFilterBar';
import PhysicalSplitKPICard, { PhysicalSingleKPICard } from '@/components/physical/PhysicalSplitKPICard';
import UsdtEnteredBy from './UsdtEnteredBy';
import USDTBuyModal from './USDTBuyModal';
import USDTSellModal from './USDTSellModal';
import USDTSettingsModal from './USDTSettingsModal';
import { txnTh, txnThSortable } from '@/lib/transactionTableStyles';
import {
  btnPrimary,
  btnSecondary,
  kpiGrid,
  pageHeader,
  pageSubtitle,
  pageTitle,
  tableWrap,
  dataTable,
  formInput,
} from '@/lib/ui';

type Tab = 'buys' | 'sells';
type SortDirection = 'asc' | 'desc';

const byTh = `${txnTh} w-[96px] min-w-[96px] max-w-[96px]`;
const byTd = 'border-y border-black/5 px-2 py-2.5 w-[96px] min-w-[96px] max-w-[96px] align-top';

function SortIcon({ active, dir }: { active: boolean; dir: SortDirection }) {
  if (!active) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-1 inline-block text-slate-300 opacity-0 transition-opacity group-hover:opacity-100">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  return dir === 'asc' ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent ml-1 inline-block">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent ml-1 inline-block">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function cellClass(transparent: boolean, extra = '') {
  return `border-y border-black/5 px-3 py-3.5 sm:px-5 sm:py-4 ${transparent ? 'bg-transparent' : 'bg-white'} ${extra}`.trim();
}

function usdtBuyValue(sell: UsdtSell) {
  return sell.usdtAmount * sell.cost;
}

export default function USDTPage() {
  const router = useRouter();
  const { currentSlug, branches, usdtBuys, usdtSells, usdtSettings, refetchData, activeCurrency } = useApp();
  const branchId = branches.find(b => b.slug === currentSlug)?.id;
  const branchSlug = currentSlug;

  const [activeTab, setActiveTab] = useState<Tab>('buys');
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const branchBuys = useMemo(() => usdtBuys.filter(b => b.branchId === branchId), [usdtBuys, branchId]);
  const branchSells = useMemo(() => usdtSells.filter(s => s.branchId === branchId), [usdtSells, branchId]);
  const presetMargin = usdtSettings.find(s => s.branchId === branchId)?.presetMargin ?? 0.002;

  const { dateFilter, setDateFilter, customStartDate, setCustomStartDate, customEndDate, setCustomEndDate, filteredData: filteredBuys } =
    useDateFilter(branchBuys);

  const filteredSells = useMemo(() => {
    const range = resolveDateFilterRange(dateFilter, customStartDate, customEndDate);
    if (!range.startDate && !range.endDate) return branchSells;
    return branchSells.filter(item => isDateInRange(item.date, range));
  }, [branchSells, dateFilter, customStartDate, customEndDate]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filterRows = <T extends UsdtBuy | UsdtSell>(rows: T[]) => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter(r =>
      (r.customerName?.toLowerCase().includes(q)) ||
      (r.txnId?.toLowerCase().includes(q)) ||
      (r.walletId?.toLowerCase().includes(q)) ||
      (r.enteredByName?.toLowerCase().includes(q)) ||
      (r.enteredByUsername?.toLowerCase().includes(q)),
    );
  };

  const sortRows = <T extends UsdtBuy | UsdtSell>(rows: T[]) => {
    const result = [...rows];
    result.sort((a, b) => {
      const getVal = (row: T): string | number => {
        if (sortField === 'date') return new Date(row.date).getTime();
        if (sortField === 'buyValue' && 'cost' in row) return usdtBuyValue(row as UsdtSell);
        if (sortField === 'sellValue' && 'cost' in row) return (row as UsdtSell).aedTotal;
        const val = row[sortField as keyof T];
        if (typeof val === 'number') return val;
        return String(val ?? '').toLowerCase();
      };
      const valA = getVal(a);
      const valB = getVal(b);
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  };

  const sortedBuys = useMemo(() => sortRows(filterRows(filteredBuys)), [filteredBuys, searchTerm, sortField, sortDir]);
  const sortedSells = useMemo(() => sortRows(filterRows(filteredSells)), [filteredSells, searchTerm, sortField, sortDir]);

  const fmtAed = (n: number) => formatMoneyValue(n, activeCurrency);
  const fmtUsdt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });
  const fmtRate = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });

  const totalBuyUsdt = filteredBuys.reduce((s, b) => s + b.usdtAmount, 0);
  const totalBuyAed = filteredBuys.reduce((s, b) => s + b.aedTotal, 0);
  const totalSellUsdt = filteredSells.reduce((s, b) => s + b.usdtAmount, 0);
  const totalSellAed = filteredSells.reduce((s, b) => s + b.aedTotal, 0);
  const totalProfit = filteredSells.reduce((s, b) => s + b.profit, 0);

  if (!branchId) return <div className="p-8 text-center text-red-500">Branch not found.</div>;

  const goToDeal = (id: string) => router.push(`/${branchSlug}/usdt/${id}`);

  const thSort = (field: string, label: string, align: 'left' | 'right' | 'center' = 'left') => (
    <th
      className={`${txnThSortable}${align === 'right' ? ' text-right' : align === 'center' ? ' text-center' : ''}`}
      onClick={() => handleSort(field)}
    >
      <div className={`flex items-center gap-1${align === 'right' ? ' justify-end' : align === 'center' ? ' justify-center' : ''}`}>
        {label}
        <SortIcon active={sortField === field} dir={sortDir} />
      </div>
    </th>
  );

  const ActionCell = ({ id, transparent }: { id: string; transparent?: boolean }) => (
    <td className={cellClass(!!transparent, 'border-r text-center last:rounded-r-2xl')}>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
        onClick={e => {
          e.stopPropagation();
          goToDeal(id);
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </td>
  );

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: 'buys', label: 'Purchases', count: filteredBuys.length },
    { value: 'sells', label: 'Sales', count: filteredSells.length },
  ];

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className={pageHeader}>
          <div>
            <h2 className={pageTitle}>USDT</h2>
            <p className={pageSubtitle}>Buy and sell USDT with customer ledger integration</p>
          </div>
          <div className="mt-4 flex flex-col items-center gap-3 sm:mt-0 sm:flex-row">
            <button type="button" onClick={() => setIsSettingsOpen(true)} className={`${btnSecondary} w-full sm:w-auto`}>
              Settings
            </button>
            <button type="button" onClick={() => setIsBuyModalOpen(true)} className={`${btnPrimary} w-full sm:w-auto`}>
              Buy USDT
            </button>
            <button type="button" onClick={() => setIsSellModalOpen(true)} className={`${btnSecondary} w-full sm:w-auto`}>
              Sell USDT
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

        <div className={`${kpiGrid} mb-6`}>
          <PhysicalSplitKPICard
            top={{ label: 'Total Bought USDT', value: fmtUsdt(totalBuyUsdt) }}
            bottom={{ label: 'Total Buy AED', value: fmtAed(totalBuyAed) }}
            icon={<span aria-hidden>💵</span>}
            color="#059669"
            bgColor="rgba(5,150,105,0.1)"
          />
          <PhysicalSplitKPICard
            top={{ label: 'Total Sold USDT', value: fmtUsdt(totalSellUsdt) }}
            bottom={{ label: 'Total Sell AED', value: fmtAed(totalSellAed) }}
            icon={<span aria-hidden>📤</span>}
            color="#2563eb"
            bgColor="rgba(37,99,235,0.1)"
          />
          <PhysicalSingleKPICard
            label="Total Profit"
            value={fmtAed(totalProfit)}
            icon={<span aria-hidden>📈</span>}
            color="#059669"
            bgColor="rgba(5,150,105,0.1)"
            valueClassName={totalProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}
          />
          <PhysicalSingleKPICard
            label="Preset Margin"
            value={presetMargin.toFixed(4)}
            icon={<span aria-hidden>⚙️</span>}
            color="#64748b"
            bgColor="rgba(100,116,139,0.1)"
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setActiveTab(tab.value);
                setSortField(tab.value === 'buys' ? 'date' : 'date');
                setSortDir('desc');
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                activeTab === tab.value
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${activeTab === tab.value ? 'bg-slate-100 text-slate-600' : 'bg-slate-200/60 text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface">
          <div className="flex flex-col gap-3 pb-4 px-4 md:border-b md:border-slate-100 md:px-5 md:py-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">
              {activeTab === 'buys' ? 'USDT Purchases' : 'USDT Sales'}
            </h3>
            <div className="relative w-full sm:w-52">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Search txns..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`${formInput} !py-2 !pl-10 !pr-4 !text-sm w-full`}
              />
            </div>
          </div>

          <div className={`${tableWrap} hidden md:block`}>
            {activeTab === 'buys' ? (
              <table className={`${dataTable} w-full min-w-[640px]`}>
                <thead>
                  <tr>
                    {thSort('usdtAmount', 'USDT', 'center')}
                    {thSort('aedRate', 'AED Rate', 'center')}
                    {thSort('aedTotal', 'AED Total', 'center')}
                    <th className={byTh}>By</th>
                    <th className={`${txnTh} text-center`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBuys.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-slate-400">No buy transactions yet</td>
                    </tr>
                  ) : (
                    sortedBuys.map((buy: UsdtBuy) => (
                      <tr
                        key={buy.id}
                        data-interactive-row
                        className="cursor-pointer transition-colors hover:bg-slate-50/80"
                        onClick={() => goToDeal(buy.id)}
                      >
                        <td className={cellClass(false, 'border-l text-center font-mono text-sm font-bold first:rounded-l-2xl')}>
                          {fmtUsdt(buy.usdtAmount)}
                        </td>
                        <td className={cellClass(false, 'text-center font-mono text-sm text-slate-700')}>
                          {fmtRate(buy.aedRate)}
                        </td>
                        <td className={cellClass(false, 'text-center font-mono text-sm font-bold')}>
                          {fmtAed(buy.aedTotal)}
                        </td>
                        <td className={`${byTd} bg-white`}>
                          <UsdtEnteredBy deal={buy} />
                        </td>
                        <ActionCell id={buy.id} />
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className={`${dataTable} w-full min-w-[720px]`}>
                <thead>
                  <tr>
                    {thSort('usdtAmount', 'USDT', 'center')}
                    {thSort('buyValue', 'Buy Value', 'center')}
                    {thSort('sellValue', 'Sell Value', 'center')}
                    {thSort('profit', 'Profit', 'center')}
                    <th className={byTh}>By</th>
                    <th className={`${txnTh} text-center`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSells.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-slate-400">No sell transactions yet</td>
                    </tr>
                  ) : (
                    sortedSells.map((sell: UsdtSell) => {
                      const hasProfit = sell.profit > 0;
                      const rowGradient = hasProfit ? 'bg-gradient-to-l from-emerald-50/90 to-transparent' : '';
                      return (
                        <tr
                          key={sell.id}
                          data-interactive-row
                          className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${rowGradient}`}
                          onClick={() => goToDeal(sell.id)}
                        >
                          <td className={cellClass(hasProfit, 'border-l text-center font-mono text-sm font-bold first:rounded-l-2xl')}>
                            {fmtUsdt(sell.usdtAmount)}
                          </td>
                          <td className={cellClass(hasProfit, 'text-center font-mono text-sm text-slate-700')}>
                            {fmtAed(usdtBuyValue(sell))}
                          </td>
                          <td className={cellClass(hasProfit, 'text-center font-mono text-sm font-bold')}>
                            {fmtAed(sell.aedTotal)}
                          </td>
                          <td className={`${cellClass(hasProfit, 'text-center font-mono text-sm font-bold')} ${sell.profit >= 0 ? 'text-emerald-700' : sell.profit < 0 ? 'text-red-600' : ''}`}>
                            {sell.profit > 0 ? '+' : ''}{fmtAed(sell.profit)}
                          </td>
                          <td className={`${byTd} ${hasProfit ? 'bg-transparent' : 'bg-white'}`}>
                            <UsdtEnteredBy deal={sell} />
                          </td>
                          <ActionCell id={sell.id} transparent={hasProfit} />
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex flex-col gap-3 px-4 py-4 md:hidden">
            {(activeTab === 'buys' ? sortedBuys : sortedSells).length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No transactions yet</div>
            ) : activeTab === 'buys' ? (
              sortedBuys.map((buy: UsdtBuy) => (
                <div
                  key={buy.id}
                  onClick={() => goToDeal(buy.id)}
                  className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold">{fmtUsdt(buy.usdtAmount)} USDT</span>
                    <span className="font-mono text-sm font-bold">{fmtAed(buy.aedTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-50 pt-2 text-xs text-slate-500">
                    <span>Rate {fmtRate(buy.aedRate)}</span>
                    <UsdtEnteredBy deal={buy} />
                  </div>
                </div>
              ))
            ) : (
              sortedSells.map((sell: UsdtSell) => (
                <div
                  key={sell.id}
                  onClick={() => goToDeal(sell.id)}
                  className={`flex cursor-pointer flex-col gap-3 rounded-2xl border border-slate-100 p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] active:scale-[0.98] ${
                    sell.profit > 0 ? 'bg-gradient-to-br from-emerald-50/80 to-white' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold">{fmtUsdt(sell.usdtAmount)} USDT</span>
                    <span className={`font-mono text-sm font-bold ${sell.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {sell.profit > 0 ? '+' : ''}{fmtAed(sell.profit)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-50 pt-2 text-xs">
                    <div><span className="text-slate-400">Buy</span><p className="font-bold">{fmtAed(usdtBuyValue(sell))}</p></div>
                    <div className="text-right"><span className="text-slate-400">Sell</span><p className="font-bold">{fmtAed(sell.aedTotal)}</p></div>
                  </div>
                  <UsdtEnteredBy deal={sell} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <USDTBuyModal open={isBuyModalOpen} slug={currentSlug} branchId={branchId} onClose={() => setIsBuyModalOpen(false)} onSuccess={() => refetchData()} />
      <USDTSellModal open={isSellModalOpen} slug={currentSlug} branchId={branchId} presetMargin={presetMargin} onClose={() => setIsSellModalOpen(false)} onSuccess={() => refetchData()} />
      <USDTSettingsModal open={isSettingsOpen} branchId={branchId} presetMargin={presetMargin} onClose={() => setIsSettingsOpen(false)} onSuccess={() => refetchData()} />
    </>
  );
}
