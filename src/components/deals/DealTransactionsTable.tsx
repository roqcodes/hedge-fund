'use client';

import React, { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { formatAED } from '@/data/mockData';
import { tableWrap, dataTable, formInput } from '@/lib/ui';
import { DealTransaction, SPORTS_MOCK_DATA } from '@/data/mockTransactions';

type SortField = keyof DealTransaction;
type SortDirection = 'asc' | 'desc';

export default function DealTransactionsTable({ 
  dealName = '', 
  transactions 
}: { 
  dealName?: string;
  transactions?: DealTransaction[];
}) {
  const router = useRouter();
  const params = useParams();
  const dealId = params?.id as string || '1';

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedData = useMemo(() => {
    const dataSource = transactions || (dealName.toLowerCase().includes('sports') ? SPORTS_MOCK_DATA : []);
    let result = [...dataSource];

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
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [searchTerm, sortField, sortDirection, dealName, transactions]);

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

  const thClass = "group cursor-pointer select-none px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700";

  return (
    <div className="mb-8 mt-8 md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface">
      <div className="flex flex-col gap-4 pb-4 px-4 md:border-b md:border-slate-100 md:px-6 md:py-5 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-bold text-slate-900">Deals</h3>
        <div className="flex items-center gap-3">
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
              className={`${formInput} !py-2 !pl-10 !pr-4 !text-sm`}
            />
          </div>
          <button className="flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M6 12h12m-9 6h6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-0">
        <div className={tableWrap}>
          <table className={`${dataTable} min-w-[900px] hidden md:table`}>
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className={thClass} onClick={() => handleSort('deal')}>
                  <div className="flex items-center gap-2">Deal Number <SortIcon field="deal" /></div>
                </th>
                <th className={thClass} onClick={() => handleSort('weight')}>
                  <div className="flex items-center gap-2">Volume <SortIcon field="weight" /></div>
                </th>
                <th className={thClass} onClick={() => handleSort('pureCostAed')}>
                  <div className="flex items-center gap-2">Purchase (Pure Cost) <SortIcon field="pureCostAed" /></div>
                </th>
                <th className={thClass} onClick={() => handleSort('expenses')}>
                  <div className="flex items-center gap-2">Expense <SortIcon field="expenses" /></div>
                </th>
                <th className={thClass} onClick={() => handleSort('salesAed')}>
                  <div className="flex items-center gap-2">Sales <SortIcon field="salesAed" /></div>
                </th>
                <th className={thClass} onClick={() => handleSort('grossProfit')}>
                  <div className="flex items-center gap-2">P&L Gross <SortIcon field="grossProfit" /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedData.length > 0 ? (
                filteredAndSortedData.map((row) => (
                  <tr 
                    key={row.id} 
                    className="cursor-pointer transition-colors hover:bg-slate-50 active:bg-slate-100"
                    onClick={() => router.push(`/deals/${dealId}/transactions/${row.id}`)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-900">{row.deal}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-600">{row.weight.toLocaleString()}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-900">{formatAED(row.pureCostAed)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-900">{formatAED(row.expenses)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-900">{formatAED(row.salesAed)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-emerald-600">{formatAED(row.grossProfit, true)}</td>
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
                  onClick={() => router.push(`/deals/${dealId}/transactions/${row.id}`)}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-md cursor-pointer active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">Deal: {row.deal}</span>
                    <span className="text-xs font-medium text-slate-500">Vol: {row.weight.toLocaleString()}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-y border-slate-50 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pure Cost</span>
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

                  <div className="flex items-center justify-end text-xs text-accent font-bold">
                    View details &rarr;
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
