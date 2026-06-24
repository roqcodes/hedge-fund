'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UsdtBuy, UsdtSell } from '@/types';
import { useApp } from '@/context/AppContext';
import { formatDateTime, formatMoneyValue } from '@/data/mockData';
import { useDateFilter } from '@/hooks/useDateFilter';
import { resolveDateFilterRange, isDateInRange } from '@/lib/dateFilterRange';
import DateFilterBar from '@/components/ui/DateFilterBar';
import PhysicalSplitKPICard from '@/components/physical/PhysicalSplitKPICard';
import UsdtEnteredBy from './UsdtEnteredBy';
import CustomerLink from '@/components/customers/CustomerLink';
import USDTBuyModal from './USDTBuyModal';
import USDTSellModal from './USDTSellModal';
import USDTSettingsModal from './USDTSettingsModal';
import { useWriteAccess } from '@/context/RbacWriteContext';
import { computeUsdtBranchStats, formatUsdtRateDisplay } from '@/lib/usdtCalculations';
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

function DateTimeCell({ date, transparent }: { date: string; transparent?: boolean }) {
  return (
    <td className={cellClass(!!transparent, 'w-[108px] whitespace-normal border-l text-[11px] leading-tight text-slate-600 first:rounded-l-2xl')}>
      {formatDateTime(date).split(',').map((part, i) => (
        <div key={i} className={i === 0 ? 'font-semibold text-slate-900' : 'mt-0.5'}>
          {part.trim()}
        </div>
      ))}
    </td>
  );
}

function TextCell({
  children,
  transparent,
  mono,
  bold,
  align = 'left',
}: {
  children: React.ReactNode;
  transparent?: boolean;
  mono?: boolean;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
}) {
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : '';
  return (
    <td className={cellClass(!!transparent, `${alignClass} text-sm ${mono ? 'font-mono' : ''} ${bold ? 'font-bold text-slate-900' : 'text-slate-700'}`)}>
      {children}
    </td>
  );
}

export default function USDTPage() {
  const router = useRouter();
  const { canWrite, buttonProps: wp } = useWriteAccess();
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

  const stats = useMemo(
    () => computeUsdtBranchStats(filteredBuys, filteredSells),
    [filteredBuys, filteredSells],
  );

  const fmtAed = (n: number) => formatMoneyValue(n, activeCurrency);
  const fmtUsdt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });
  const fmtRate = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });

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
            <button
              type="button"
              {...wp()}
              onClick={() => canWrite && setIsSettingsOpen(true)}
              className={`${btnSecondary} w-full sm:w-auto${!canWrite ? ' cursor-not-allowed opacity-50' : ''}`}
            >
              Settings
            </button>
            <button
              type="button"
              {...wp()}
              onClick={() => canWrite && setIsBuyModalOpen(true)}
              className={`${btnPrimary} w-full sm:w-auto${!canWrite ? ' cursor-not-allowed opacity-50' : ''}`}
            >
              Buy USDT
            </button>
            <button
              type="button"
              {...wp()}
              onClick={() => canWrite && setIsSellModalOpen(true)}
              className={`${btnSecondary} w-full sm:w-auto${!canWrite ? ' cursor-not-allowed opacity-50' : ''}`}
            >
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

        <div className={`${kpiGrid} mb-6 grid-cols-2 md:grid-cols-4`}>
          <PhysicalSplitKPICard
            top={{ label: 'Stock USDT', value: fmtUsdt(stats.stockUsdt) }}
            bottom={{
              label: 'Avg Cost',
              value: stats.avgCost != null ? formatUsdtRateDisplay(stats.avgCost) : '—',
            }}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7h-9M14 17H5M17 17V7M7 7v10" />
              </svg>
            }
            color="#f59e0b"
            bgColor="#fef3c7"
          />
          <PhysicalSplitKPICard
            top={{ label: 'Total Buy', value: fmtUsdt(stats.totalBuyUsdt) }}
            bottom={{ label: 'Buy AED', value: fmtAed(stats.totalBuyAed) }}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
            }
            color="var(--accent)"
            bgColor="var(--accent-light)"
          />
          <PhysicalSplitKPICard
            top={{ label: 'Total Sell', value: fmtUsdt(stats.totalSellUsdt) }}
            bottom={{ label: 'Sell AED', value: fmtAed(stats.totalSellAed) }}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
              </svg>
            }
            color="#6366f1"
            bgColor="#eef2ff"
          />
          <PhysicalSplitKPICard
            top={{ label: 'Profit Margin', value: fmtAed(stats.totalProfit) }}
            bottom={{
              label: 'Avg Margin',
              value: stats.avgSellMargin != null ? formatUsdtRateDisplay(stats.avgSellMargin) : '—',
            }}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="var(--profit)"
            bgColor="var(--profit-light)"
            bottomValueClassName={stats.totalProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}
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
              <table className={`${dataTable} w-full min-w-[1100px]`}>
                <thead>
                  <tr>
                    {thSort('date', 'Date & Time')}
                    {thSort('txnId', 'Txn ID')}
                    {thSort('customerName', 'Customer')}
                    <th className={txnTh}>Wallet ID</th>
                    <th className={`${txnTh} text-center`}>Opening Bal.</th>
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
                      <td colSpan={10} className="py-10 text-center text-sm text-slate-400">No buy transactions yet</td>
                    </tr>
                  ) : (
                    sortedBuys.map((buy: UsdtBuy) => (
                      <tr
                        key={buy.id}
                        data-interactive-row
                        className="cursor-pointer transition-colors hover:bg-slate-50/80"
                        onClick={() => goToDeal(buy.id)}
                      >
                        <DateTimeCell date={buy.date} />
                        <TextCell mono>{buy.txnId || '—'}</TextCell>
                        <td className={cellClass(false, 'text-sm font-bold text-slate-900')}>
                          <CustomerLink slug={branchSlug} customerId={buy.customerId} customerName={buy.customerName} />
                        </td>
                        <TextCell mono>{buy.walletId || '—'}</TextCell>
                        <TextCell align="center" mono>
                          {buy.openingBalance != null ? fmtAed(buy.openingBalance) : '—'}
                        </TextCell>
                        <TextCell align="center" mono bold>{fmtUsdt(buy.usdtAmount)}</TextCell>
                        <TextCell align="center" mono>{fmtRate(buy.aedRate)}</TextCell>
                        <TextCell align="center" mono bold>{fmtAed(buy.aedTotal)}</TextCell>
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
              <table className={`${dataTable} w-full min-w-[1280px]`}>
                <thead>
                  <tr>
                    {thSort('date', 'Date & Time')}
                    {thSort('txnId', 'Txn ID')}
                    {thSort('customerName', 'Customer')}
                    <th className={txnTh}>Wallet ID</th>
                    <th className={`${txnTh} text-center`}>Opening Bal.</th>
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
                      <td colSpan={11} className="py-10 text-center text-sm text-slate-400">No sell transactions yet</td>
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
                          <DateTimeCell date={sell.date} transparent={hasProfit} />
                          <TextCell mono transparent={hasProfit}>{sell.txnId || '—'}</TextCell>
                          <td className={cellClass(!!hasProfit, 'text-sm font-bold text-slate-900')}>
                            <CustomerLink slug={branchSlug} customerId={sell.customerId} customerName={sell.customerName} />
                          </td>
                          <TextCell mono transparent={hasProfit}>{sell.walletId || '—'}</TextCell>
                          <TextCell align="center" mono transparent={hasProfit}>
                            {sell.openingBalance != null ? fmtAed(sell.openingBalance) : '—'}
                          </TextCell>
                          <TextCell align="center" mono bold transparent={hasProfit}>{fmtUsdt(sell.usdtAmount)}</TextCell>
                          <TextCell align="center" mono transparent={hasProfit}>{fmtAed(usdtBuyValue(sell))}</TextCell>
                          <TextCell align="center" mono bold transparent={hasProfit}>{fmtAed(sell.aedTotal)}</TextCell>
                          <TextCell
                            align="center"
                            mono
                            bold
                            transparent={hasProfit}
                          >
                            <span className={sell.profit >= 0 ? 'text-emerald-700' : sell.profit < 0 ? 'text-red-600' : ''}>
                              {sell.profit > 0 ? '+' : ''}{fmtAed(sell.profit)}
                            </span>
                          </TextCell>
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
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CustomerLink slug={branchSlug} customerId={buy.customerId} customerName={buy.customerName} className="text-sm" />
                      <p className="text-[11px] text-slate-400">{formatDateTime(buy.date)}</p>
                      {buy.txnId ? <p className="font-mono text-[10px] text-slate-400">{buy.txnId}</p> : null}
                    </div>
                    <p className="font-mono text-sm font-bold text-slate-900">{fmtAed(buy.aedTotal)}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-t border-slate-50 pt-2 text-xs">
                    <div><span className="text-slate-400">USDT</span><p className="font-bold">{fmtUsdt(buy.usdtAmount)}</p></div>
                    <div><span className="text-slate-400">Rate</span><p className="font-bold">{fmtRate(buy.aedRate)}</p></div>
                    <div className="text-right"><span className="text-slate-400">Wallet</span><p className="truncate font-mono">{buy.walletId || '—'}</p></div>
                  </div>
                  <UsdtEnteredBy deal={buy} />
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
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CustomerLink slug={branchSlug} customerId={sell.customerId} customerName={sell.customerName} className="text-sm" />
                      <p className="text-[11px] text-slate-400">{formatDateTime(sell.date)}</p>
                      {sell.txnId ? <p className="font-mono text-[10px] text-slate-400">{sell.txnId}</p> : null}
                    </div>
                    <span className={`font-mono text-sm font-bold ${sell.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {sell.profit > 0 ? '+' : ''}{fmtAed(sell.profit)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-50 pt-2 text-xs">
                    <div><span className="text-slate-400">USDT</span><p className="font-bold">{fmtUsdt(sell.usdtAmount)}</p></div>
                    <div className="text-right"><span className="text-slate-400">Sell</span><p className="font-bold">{fmtAed(sell.aedTotal)}</p></div>
                    <div><span className="text-slate-400">Buy value</span><p className="font-bold">{fmtAed(usdtBuyValue(sell))}</p></div>
                    <div className="text-right"><span className="text-slate-400">Wallet</span><p className="truncate font-mono">{sell.walletId || '—'}</p></div>
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
