'use client';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import KPICard from '@/components/ui/KPICard';
import { useApp } from '@/context/AppContext';
import { formatAED, formatDateTime } from '@/data/mockData';
import { Deal } from '@/types';
import { badgeClass } from '@/lib/badgeClass';
import CreateDealModal from './CreateDealModal';
import CurrencySwitcher from './CurrencySwitcher';
import { useDateFilter } from '@/hooks/useDateFilter';
import DateFilterBar from '@/components/ui/DateFilterBar';
import {
  btnPrimary,
  kpiGrid,
  pageHeader,
  pageSubtitle,
  pageTitle,
  tableWrap,
  dataTable,
  formInput,
} from '@/lib/ui';

type SortField = 'groupName' | 'amount' | 'goldVolume' | 'totalDeals' | 'completedDeals' | 'onTransitDeals' | 'grossProfit' | 'status';
type SortDirection = 'asc' | 'desc';

export default function DealsManagement() {
  const { deals, dealTransactions } = useApp();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('groupName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const {
    dateFilter, setDateFilter,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
    filteredData: filteredTransactions
  } = useDateFilter(dealTransactions);

  const totalGroups = new Set(deals.map(d => d.groupName || 'General')).size;

  const processedDeals = useMemo(() => {
    return deals.map((deal) => {
      const groupDeals = filteredTransactions.filter(t => t.dealId === deal.id);
      const totalDealsInGroup = groupDeals.length;
      const completedDeals = groupDeals.filter(t => t.grossProfit !== undefined && t.grossProfit !== null && t.grossProfit !== 0).length;
      const onTransitDeals = totalDealsInGroup - completedDeals;
      const totalGrossProfit = groupDeals.reduce((sum, t) => sum + (t.grossProfit || 0), 0);
      const dealGoldGrams = deal.investors.reduce((acc, inv) => acc + (inv.isGold ? inv.amount : 0), 0);
      const dealGoldKg = dealGoldGrams / 1000;

      return {
        ...deal,
        groupNameCalculated: deal.groupName || 'General',
        goldVolume: dealGoldKg,
        totalDeals: totalDealsInGroup,
        completedDeals,
        onTransitDeals,
        grossProfit: totalGrossProfit || deal.totalPL || 0,
      };
    });
  }, [deals, filteredTransactions]);

  const totalDeals = processedDeals.reduce((acc, d) => acc + d.totalDeals, 0);
  const totalDealAmount = deals.reduce((acc, d) => acc + d.amount, 0);
  const totalPL = processedDeals.reduce((acc, d) => acc + d.grossProfit, 0);
  const totalExpense = deals.reduce((acc, deal) => {
    const groupDeals = filteredTransactions.filter(t => t.dealId === deal.id);
    if (groupDeals.length > 0) {
      return acc + groupDeals.reduce((sum, txn) => sum + (txn.expenses || 0), 0);
    }
    return acc + (deal.expense || 0);
  }, 0);

  const totalGoldGrams = deals.reduce((acc, deal) => {
    return acc + deal.investors.reduce((invAcc, inv) => invAcc + (inv.isGold ? inv.amount : 0), 0);
  }, 0);
  const totalGoldKg = (totalGoldGrams / 1000).toFixed(4);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedDeals = useMemo(() => {
    let result = [...processedDeals];

    if (searchTerm.trim()) {
      const lowerQuery = searchTerm.toLowerCase();
      result = result.filter(deal => 
        deal.groupNameCalculated.toLowerCase().includes(lowerQuery) ||
        deal.name.toLowerCase().includes(lowerQuery) ||
        deal.status.toLowerCase().includes(lowerQuery)
      );
    }

    result.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === 'groupName') {
        valA = a.groupNameCalculated;
        valB = b.groupNameCalculated;
      } else {
        valA = a[sortField];
        valB = b[sortField];
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [processedDeals, searchTerm, sortField, sortDirection]);

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

  const getThClass = (align: 'left' | 'center') => 
    `group cursor-pointer select-none px-3 pb-3 text-${align} text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 sm:px-5`;

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className="mb-5 flex items-start justify-between border-b border-slate-200/80 pb-5 sm:items-end">
          <div>
            <h2 className={pageTitle}>Groups</h2>
            <p className={pageSubtitle}>Manage investments and track deal allocations</p>
          </div>
          <div className="flex items-center">
            <button 
              type="button" 
              className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors hover:bg-accent hover:text-white sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:rounded-lg sm:bg-transparent sm:text-slate-500 sm:hover:bg-slate-100 sm:hover:text-slate-900 gap-2 font-semibold text-sm" 
              onClick={() => setShowCreate(true)}
              aria-label="Create New Group"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden className="sm:w-[18px] sm:h-[18px] sm:stroke-2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="hidden sm:inline">Create New Group</span>
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
        >
          <CurrencySwitcher />
        </DateFilterBar>

        <div className={`${kpiGrid} grid-cols-2`}>
          <KPICard
            label="Total Groups"
            value={totalGroups}
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
            value={totalDeals}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            }
            color="#3b82f6"
            bgColor="#dbeafe"
          />
          <KPICard
            label="Total Capital Amount"
            value={formatAED(totalDealAmount)}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
            color="var(--accent)"
            bgColor="var(--accent-light)"
          />
          <KPICard
            label="Total Gold Value"
            value={`${totalGoldKg} kg`}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z" />
              </svg>
            }
            color="var(--warning)"
            bgColor="var(--warning-light)"
          />
          <KPICard
            label="Total P & L"
            value={formatAED(totalPL)}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            }
            color="var(--success)"
            bgColor="var(--success-light)"
          />
          <KPICard
            label="Total Expense"
            value={formatAED(totalExpense)}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                <polyline points="17 18 23 18 23 12" />
              </svg>
            }
            color="#ef4444"
            bgColor="#fee2e2"
          />
        </div>

        <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-4 pb-4 px-4 md:border-b md:border-slate-100 md:px-6 md:py-5 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-bold text-slate-900">All Groups</h3>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Search groups..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={`${formInput} !py-2 !pl-10 !pr-4 !text-sm`}
                />
              </div>
            </div>
          </div>
          <div className="p-0">
            <div className={tableWrap}>
              <table className={`${dataTable} min-w-[900px] hidden md:table`}>
                <thead>
                  <tr>
                    <th className={getThClass('left')} onClick={() => handleSort('groupName')}>
                      <div className="flex items-center gap-2">Group <SortIcon field="groupName" /></div>
                    </th>
                    <th className={getThClass('center')} onClick={() => handleSort('amount')}>
                      <div className="flex items-center justify-center gap-2">Capital <SortIcon field="amount" /></div>
                    </th>
                    <th className={getThClass('center')} onClick={() => handleSort('goldVolume')}>
                      <div className="flex items-center justify-center gap-2">Volume Gold <SortIcon field="goldVolume" /></div>
                    </th>
                    <th className={getThClass('center')} onClick={() => handleSort('totalDeals')}>
                      <div className="flex items-center justify-center gap-2">Total Deals <SortIcon field="totalDeals" /></div>
                    </th>
                    <th className={getThClass('center')} onClick={() => handleSort('completedDeals')}>
                      <div className="flex items-center justify-center gap-2">Settled Deals <SortIcon field="completedDeals" /></div>
                    </th>
                    <th className={getThClass('center')} onClick={() => handleSort('onTransitDeals')}>
                      <div className="flex items-center justify-center gap-2">Unsettled Deals <SortIcon field="onTransitDeals" /></div>
                    </th>
                    <th className={getThClass('center')} onClick={() => handleSort('grossProfit')}>
                      <div className="flex items-center justify-center gap-2">Gross P&L <SortIcon field="grossProfit" /></div>
                    </th>
                    <th className={getThClass('center')} onClick={() => handleSort('status')}>
                      <div className="flex items-center justify-center gap-2">Status <SortIcon field="status" /></div>
                    </th>
                    <th className="px-3 pb-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedDeals.map((deal) => {
                    const totalDealsInGroup = deal.totalDeals;
                    const completedDeals = deal.completedDeals;
                    const onTransitDeals = deal.onTransitDeals;
                    const dealGold = Number((deal.goldVolume || 0).toFixed(2)).toString();
                    const totalGrossProfit = deal.grossProfit;

                    return (
                      <tr
                        key={deal.id}
                        data-interactive-row
                        onClick={() => router.push(`/group/${deal.id}`)}
                        className="cursor-pointer"
                      >
                        <td className="whitespace-nowrap border-y border-l border-black/5 bg-white px-3 py-3.5 text-xs font-semibold text-slate-500 first:rounded-l-2xl sm:px-5 sm:py-4 sm:text-sm">
                          {deal.groupNameCalculated}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-center text-sm font-bold sm:px-5 sm:py-4">
                          {formatAED(deal.amount)}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-center text-sm font-bold sm:px-5 sm:py-4">
                          {dealGold} g
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-center text-sm font-bold sm:px-5 sm:py-4">
                          {totalDealsInGroup}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-center text-sm font-bold sm:px-5 sm:py-4">
                          {completedDeals}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-center text-sm font-bold sm:px-5 sm:py-4">
                          {onTransitDeals}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-center text-sm font-bold text-emerald-600 sm:px-5 sm:py-4">
                          {formatAED(totalGrossProfit)}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-center sm:px-5 sm:py-4">
                          <div className="flex items-center justify-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${deal.status === 'active' ? 'bg-green-500' : deal.status === 'pending' ? 'bg-amber-500' : deal.status === 'completed' ? 'bg-blue-500' : 'bg-red-500'}`}></span>
                            <span className="text-xs font-medium text-slate-600 capitalize">{deal.status}</span>
                          </div>
                        </td>
                        <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 text-center last:rounded-r-2xl sm:px-5 sm:py-4">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/group/${deal.id}`);
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
                  {filteredAndSortedDeals.length === 0 && (
                    <tr>
                      <td colSpan={9} className="border-y border-black/5 bg-white px-5 py-8 text-center text-sm text-slate-500">
                        {searchTerm ? 'No groups found matching your search query.' : 'No groups found. Create a new group to get started.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="flex md:hidden flex-col gap-4 py-4">
                {filteredAndSortedDeals.map((deal) => {
                  const totalDealsInGroup = deal.totalDeals;
                  const completedDeals = deal.completedDeals;
                  const onTransitDeals = deal.onTransitDeals;
                  const totalGrossProfit = deal.grossProfit;
                  const dealGoldKg = deal.goldVolume.toFixed(4);

                  return (
                    <div 
                      key={deal.id}
                      onClick={() => router.push(`/group/${deal.id}`)}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-md cursor-pointer active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">{deal.groupNameCalculated}</span>
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${deal.status === 'active' ? 'bg-green-500' : deal.status === 'pending' ? 'bg-amber-500' : deal.status === 'completed' ? 'bg-blue-500' : 'bg-red-500'}`}></span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{deal.status}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-y border-slate-50 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Capital</span>
                          <span className="font-mono text-sm font-bold text-slate-900">{formatAED(deal.amount)}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Volume Gold</span>
                          <span className="font-mono text-sm font-bold text-slate-900">{dealGoldKg} kg</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross P&L</span>
                          <span className="font-mono text-sm font-bold text-emerald-600">{formatAED(totalGrossProfit)}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Settled</span>
                          <span className="font-mono text-sm font-bold text-slate-900">{completedDeals}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unsettled</span>
                          <span className="font-mono text-sm font-bold text-slate-900">{onTransitDeals}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-medium">Total Deals: {totalDealsInGroup}</span>
                        <span className="text-accent font-bold">View details &rarr;</span>
                      </div>
                    </div>
                  );
                })}
                {filteredAndSortedDeals.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-500">
                    {searchTerm ? 'No groups found matching your search query.' : 'No groups found. Create a new group to get started.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateDealModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
