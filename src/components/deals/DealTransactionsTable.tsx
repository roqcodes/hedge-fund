'use client';

import React, { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { formatAED } from '@/data/mockData';
import { tableWrap, dataTable, formInput } from '@/lib/ui';
import { DealTransaction } from '@/types';

import { useApp } from '@/context/AppContext';

type SortField = keyof DealTransaction;
type SortDirection = 'asc' | 'desc';

export default function DealTransactionsTable({
  dealName = '',
  transactions,
  onEdit,
  onDelete,
}: {
  dealName?: string;
  transactions?: DealTransaction[];
  onEdit?: (txn: DealTransaction) => void;
  onDelete?: (txn: DealTransaction) => void;
}) {
  const router = useRouter();
  const params = useParams();
  const dealId = params?.id as string || '1';
  const branchSlug = params?.branchSlug as string;
  const { currentSlug } = useApp();
  const basePath = branchSlug ? `/group/${branchSlug}` : (currentSlug && currentSlug !== 'superadmin' ? `/${currentSlug}` : '');

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('deal');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [activeTab, setActiveTab] = useState<'all' | 'unsettled' | 'settled'>('all');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const tabCounts = useMemo(() => {
    const src = transactions || [];
    return {
      all: src.length,
      unsettled: src.filter(t => t.fixOrUnfix === 'unfixed').length,
      settled: src.filter(t => t.fixOrUnfix === 'fixed').length,
    };
  }, [transactions]);

  const formatTime12h = (timeStr?: string) => {
    if (!timeStr) return '—';
    try {
      const [h, m] = timeStr.split(':');
      let hours = parseInt(h, 10);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 becomes 12
      return `${String(hours).padStart(2, '0')}:${m} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  const filteredAndSortedData = useMemo(() => {
    const dataSource = transactions || [];
    let result = [...dataSource];

    // 0. Tab filter
    if (activeTab === 'unsettled') result = result.filter(t => t.fixOrUnfix === 'unfixed');
    else if (activeTab === 'settled') result = result.filter(t => t.fixOrUnfix === 'fixed');

    // 1. Search Filtering
    if (searchTerm.trim()) {
      const lowerQuery = searchTerm.toLowerCase();
      result = result.filter(
        item =>
          item.deal.toString().toLowerCase().includes(lowerQuery) ||
          item.date.includes(lowerQuery)
      );
    }

    // 2. Sorting
    result.sort((a, b) => {
      let valA = a[sortField] ?? '';
      let valB = b[sortField] ?? '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        const compare = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? compare : -compare;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [searchTerm, sortField, sortDirection, dealName, transactions, activeTab]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 opacity-0 transition-opacity group-hover:opacity-100">
          <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
        <path d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
        <path d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const thClass = "group cursor-pointer select-none px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700";

  return (
    <div className="mb-8 mt-8 md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface">
      <div className="flex flex-col gap-4 pb-4 px-4 md:border-b md:border-slate-100 md:px-6 md:py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <h3 className="text-lg font-bold text-slate-900">Deals</h3>

          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {([
              { key: 'all', label: 'All', count: tabCounts.all },
              { key: 'unsettled', label: 'Unsettled', count: tabCounts.unsettled },
              { key: 'settled', label: 'Settled', count: tabCounts.settled },
            ] as const).map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${activeTab === tab.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {tab.label}
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black transition-colors ${activeTab === tab.key
                  ? tab.key === 'unsettled'
                    ? 'bg-amber-100 text-amber-700'
                    : tab.key === 'settled'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  : 'bg-slate-200/60 text-slate-400'
                  }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex gap-2 w-full">
            <div className="relative flex-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Search deals..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`${formInput} !py-2 !pl-10 !pr-4 !text-sm w-full`}
              />
            </div>
            <button className="flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 sm:w-auto flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M6 12h12m-9 6h6" />
              </svg>
            </button>
          </div>
          <div className="flex md:hidden items-center gap-2">
            <select
              value={sortField as string}
              onChange={(e) => handleSort(e.target.value as SortField)}
              className={`${formInput} !py-2 !text-sm flex-1 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10`}
            >
              <option value="deal">Sort by: Deal Number</option>
              <option value="date">Sort by: Date & Time</option>
              <option value="weight">Sort by: Volume</option>
              <option value="pureCostAed">Sort by: Purchase Cost</option>
              <option value="expenses">Sort by: Expense</option>
              <option value="salesAed">Sort by: Sales</option>
              <option value="grossProfit">Sort by: P&L Gross</option>
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
          <table className={`${dataTable} min-w-[900px] hidden md:table`}>
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className={thClass} onClick={() => handleSort('deal')}>
                  <div className="flex items-center gap-2">Deal Number {renderSortIcon('deal')}</div>
                </th>
                <th className={thClass} onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-2">Date & Time {renderSortIcon('date')}</div>
                </th>
                <th className={thClass}>
                  Status
                </th>
                <th className={thClass} onClick={() => handleSort('weight')}>
                  <div className="flex items-center gap-2">Volume {renderSortIcon('weight')}</div>
                </th>
                <th className={thClass} onClick={() => handleSort('pureCostAed')}>
                  <div className="flex items-center gap-2">Purchase Cost {renderSortIcon('pureCostAed')}</div>
                </th>
                <th className={thClass} onClick={() => handleSort('expenses')}>
                  <div className="flex items-center gap-2">Expense {renderSortIcon('expenses')}</div>
                </th>
                <th className={thClass} onClick={() => handleSort('salesAed')}>
                  <div className="flex items-center gap-2">Sales {renderSortIcon('salesAed')}</div>
                </th>
                <th className={thClass} onClick={() => handleSort('grossProfit')}>
                  <div className="flex items-center gap-2">P&L Gross {renderSortIcon('grossProfit')}</div>
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedData.length > 0 ? (
                filteredAndSortedData.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer transition-colors hover:bg-slate-50 active:bg-slate-100"
                    onClick={() => router.push(`${basePath}/group/${dealId}/deal/${row.id}`)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-900">{row.deal}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-slate-900">{row.date}</span>
                        <span className="text-xs font-semibold text-slate-500">{formatTime12h(row.time)}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${row.fixOrUnfix === 'unfixed'
                        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                        : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        }`}>
                        {row.fixOrUnfix === 'unfixed' ? 'Unsettled' : 'Settled'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-600">{row.weight.toLocaleString()}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-900">{formatAED(row.pureCostAed)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-900">{formatAED(row.expenses)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-900">{formatAED(row.salesAed)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-emerald-600">{formatAED(row.grossProfit, true)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          onClick={() => {
                            if (onEdit) onEdit(row);
                          }}
                          title="Edit Deal"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.3-4.3" />
                      </svg>
                      <p className="text-sm font-medium">No deals found</p>
                      {searchTerm && <p className="text-xs">Try adjusting your search query</p>}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile View */}
          <div className="flex md:hidden flex-col gap-4 py-4">
            {filteredAndSortedData.length > 0 ? (
              filteredAndSortedData.map((row) => (
                <div
                  key={row.id}
                  onClick={() => router.push(`${basePath}/group/${dealId}/deal/${row.id}`)}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-md cursor-pointer active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">Deal: {row.deal}</span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${row.fixOrUnfix === 'unfixed'
                          ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                          : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          }`}>
                          {row.fixOrUnfix === 'unfixed' ? 'Unsettled' : 'Settled'}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-500 mt-0.5">
                        {row.date}{row.time ? ` • ${formatTime12h(row.time)}` : ''}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-500">Vol: {row.weight.toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-y border-slate-50 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Purchase Cost</span>
                      <span className="font-mono text-sm font-bold text-slate-900">{formatAED(row.pureCostAed)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross P&L</span>
                      <span className="font-mono text-sm font-bold text-emerald-600">{formatAED(row.grossProfit, true)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expense</span>
                      <span className="font-mono text-sm font-bold text-slate-900">{formatAED(row.expenses)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sales</span>
                      <span className="font-mono text-sm font-bold text-slate-900">{formatAED(row.salesAed)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs mt-1" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="flex h-8 items-center gap-1 rounded-lg px-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:bg-slate-100 transition-colors"
                        onClick={() => {
                          if (onEdit) onEdit(row);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>Edit</span>
                      </button>
                    </div>
                    <div className="text-accent font-bold" onClick={() => router.push(`${basePath}/group/${dealId}/deal/${row.id}`)}>
                      View &rarr;
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-12 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.3-4.3" />
                  </svg>
                  <p className="text-sm font-medium">No deals found</p>
                  {searchTerm && <p className="text-xs">Try adjusting your search query</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
