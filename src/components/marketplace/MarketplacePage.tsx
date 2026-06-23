'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import PhysicalSplitKPICard, { PhysicalSingleKPICard } from '@/components/physical/PhysicalSplitKPICard';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { useDateFilter } from '@/hooks/useDateFilter';
import {
  kpiGrid,
  pageHeader,
  pageSubtitle,
  pageTitle,
  formInput,
  tableWrap,
  dataTable
} from '@/lib/ui';

import { getTaxInvoicesBySlug, deleteTaxInvoice } from '@/app/actions/marketplaceActions';

import TaxInvoiceModal from './TaxInvoiceModal';
import ViewInvoiceModal from './ViewInvoiceModal';

type SortField = 'doc_no' | 'doc_date' | 'net_amt_dc' | 'order_type';
type SortDirection = 'asc' | 'desc';

export default function MarketplacePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [isTaxInvoiceOpen, setIsTaxInvoiceOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);
  
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrderType, setFilterOrderType] = useState('');
  const [sortField, setSortField] = useState<SortField>('doc_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Date filter mock data
  const {
    dateFilter, setDateFilter,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
  } = useDateFilter([]); 

  const fetchInvoices = async () => {
    setLoading(true);
    const res = await getTaxInvoicesBySlug(slug);
    if (res.success && res.invoices) {
      setInvoices(res.invoices);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [slug]);

  const handleSaveInvoice = () => {
    fetchInvoices();
    setIsTaxInvoiceOpen(false);
  };

  const handleDeleteInvoice = async (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      const res = await deleteTaxInvoice(id);
      if (res.success) {
        fetchInvoices();
      } else {
        alert('Failed to delete invoice');
      }
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

  const filteredAndSortedInvoices = useMemo(() => {
    let result = [...invoices];

    if (searchTerm.trim()) {
      const lowerQuery = searchTerm.toLowerCase();
      result = result.filter(inv => 
        (inv.doc_no && inv.doc_no.toLowerCase().includes(lowerQuery)) ||
        (inv.customer_details && inv.customer_details.toLowerCase().includes(lowerQuery))
      );
    }

    if (filterOrderType) {
      result = result.filter(inv => inv.order_type === filterOrderType);
    }

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'net_amt_dc') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      } else if (sortField === 'doc_date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [invoices, searchTerm, filterOrderType, sortField, sortDirection]);

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

  const totalValue = invoices.reduce((acc, inv) => acc + (parseFloat(inv.net_amt_dc) || 0), 0);
  const totalVolume = invoices.reduce((acc, inv) => acc + (parseFloat(inv.gross_wt) || 0), 0);
  const filteredValue = filteredAndSortedInvoices.reduce((acc, inv) => acc + (parseFloat(inv.net_amt_dc) || 0), 0);

  const fixedCount = invoices.filter(inv => inv.order_type === 'Fixed').length;
  const unfixedCount = invoices.filter(inv => inv.order_type === 'Unfixed').length;

  const fmtMoney = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtWt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' g';

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className="mb-5 flex items-start justify-between border-b border-slate-200/80 pb-5 sm:items-end">
          <div>
            <h2 className={pageTitle}>Physical</h2>
            <p className={pageSubtitle}>Manage tax invoices and physical trade details</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsTaxInvoiceOpen(true)} 
              className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors hover:bg-accent hover:text-white sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:rounded-lg sm:bg-accent sm:text-white sm:hover:bg-accent/90 gap-2 font-semibold text-sm"
              title="New Invoice"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[18px] sm:h-[18px] sm:stroke-2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span className="hidden sm:inline">New Invoice</span>
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
            top={{ label: 'Total Invoices', value: invoices.length }}
            bottom={{ label: 'Filtered', value: filteredAndSortedInvoices.length }}
            color="var(--purple)"
            bgColor="var(--purple-light)"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <PhysicalSplitKPICard
            top={{ label: 'Total Value', value: fmtMoney(totalValue) }}
            bottom={{ label: 'Filtered Value', value: fmtMoney(filteredValue) }}
            color="var(--success)"
            bgColor="var(--success-light)"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <PhysicalSplitKPICard
            top={{ label: 'Fix', value: fixedCount }}
            bottom={{ label: 'Unfix', value: unfixedCount }}
            color="var(--warning)"
            bgColor="var(--warning-light)"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            }
          />
          <PhysicalSingleKPICard
            label="Gross Weight"
            value={fmtWt(totalVolume)}
            color="var(--accent)"
            bgColor="var(--accent-light)"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          />
        </div>

        {/* Data Container */}
        <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          {/* Toolbar */}
          <div className="flex flex-col gap-4 pb-4 px-4 pt-4 md:border-b md:border-slate-100 md:px-6 md:py-5 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-lg font-bold text-slate-900 whitespace-nowrap hidden lg:block">Recent Tax Invoices</h3>
            
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1 lg:justify-end">
              <div className="relative w-full sm:max-w-xs">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Search doc # or customer..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={`${formInput} !py-2 !pl-10 !pr-4 !text-sm w-full`}
                />
              </div>

              <select 
                value={filterOrderType} 
                onChange={e => setFilterOrderType(e.target.value)}
                className={`${formInput} !py-2 !text-sm w-full sm:w-auto appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10`}
              >
                <option value="">All Order Types</option>
                <option value="Fixed">Fixed</option>
                <option value="Unfixed">Unfixed</option>
              </select>

              {/* Mobile Sort */}
              <div className="flex md:hidden items-center gap-2 w-full">
                <select
                  value={sortField}
                  onChange={(e) => handleSort(e.target.value as SortField)}
                  className={`${formInput} !py-2 !text-sm flex-1 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10`}
                >
                  <option value="doc_date">Sort by: Date</option>
                  <option value="doc_no">Sort by: Doc #</option>
                  <option value="order_type">Sort by: Type</option>
                  <option value="net_amt_dc">Sort by: Amount</option>
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

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--primary)]"></div>
            </div>
          ) : (
            <div className="p-0">
              <div className={tableWrap}>
                <table className={`${dataTable} min-w-[900px] hidden md:table`}>
                  <thead>
                    <tr>
                      <th className={getThClass('left')} onClick={() => handleSort('doc_no')}>
                        <div className="flex items-center gap-2">Doc No <SortIcon field="doc_no" /></div>
                      </th>
                      <th className={getThClass('left')} onClick={() => handleSort('doc_date')}>
                        <div className="flex items-center gap-2">Date <SortIcon field="doc_date" /></div>
                      </th>
                      <th className={getThClass('left')}>Customer</th>
                      <th className={getThClass('center')} onClick={() => handleSort('order_type')}>
                        <div className="flex items-center justify-center gap-2">Type <SortIcon field="order_type" /></div>
                      </th>
                      <th className={getThClass('right')}>Gross Wt</th>
                      <th className={getThClass('right')} onClick={() => handleSort('net_amt_dc')}>
                        <div className="flex items-center justify-end gap-2">Net Amount <SortIcon field="net_amt_dc" /></div>
                      </th>
                      <th className="px-3 pb-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedInvoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50 group cursor-pointer"
                        onClick={() => setViewingInvoice(inv)}
                      >
                        <td className="whitespace-nowrap border-y border-l border-black/5 bg-white px-3 py-3.5 text-xs font-semibold text-slate-500 first:rounded-l-2xl sm:px-5 sm:py-4">
                          {inv.doc_no}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm text-slate-600 sm:px-5 sm:py-4">
                          {inv.doc_date ? new Date(inv.doc_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm text-slate-700 font-medium sm:px-5 sm:py-4">
                          {inv.customer_details || 'Cash Customer'}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-center sm:px-5 sm:py-4">
                          <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${inv.order_type === 'Fixed' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                            {inv.order_type}
                          </span>
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-right font-mono text-sm font-bold sm:px-5 sm:py-4">
                          {(parseFloat(inv.gross_wt) || 0).toFixed(3)} g
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-right font-mono text-sm font-bold sm:px-5 sm:py-4">
                          ${(parseFloat(inv.net_amt_dc) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 text-right last:rounded-r-2xl sm:px-5 sm:py-4">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setViewingInvoice(inv)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[var(--primary)] transition-colors"
                              title="View"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(inv.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAndSortedInvoices.length === 0 && (
                      <tr>
                        <td colSpan={7} className="border-y border-black/5 bg-white px-5 py-8 text-center text-sm text-slate-500">
                          No invoices found matching your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Mobile Cards View */}
                <div className="flex md:hidden flex-col gap-4 py-4 px-4">
                  {filteredAndSortedInvoices.map((inv) => (
                    <div 
                      key={inv.id}
                      onClick={() => setViewingInvoice(inv)}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-md cursor-pointer active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-bold text-slate-900 leading-tight">{inv.doc_no}</span>
                          <span className="text-xs text-slate-400 mt-0.5">{inv.doc_date ? new Date(inv.doc_date).toLocaleDateString() : '-'}</span>
                        </div>
                        <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${inv.order_type === 'Fixed' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                          {inv.order_type}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-y border-slate-50 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</span>
                          <span className="text-sm font-medium text-slate-700 truncate">{inv.customer_details || 'Cash Customer'}</span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Items</span>
                          <span className="text-sm font-bold text-slate-900">{inv.items?.length || 0}</span>
                        </div>
                        
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Weight</span>
                          <span className="font-mono text-sm font-bold text-slate-900">{(parseFloat(inv.gross_wt) || 0).toFixed(3)} g</span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Amount</span>
                          <span className="font-mono text-sm font-bold text-slate-900">${(parseFloat(inv.net_amt_dc) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleDeleteInvoice(inv.id)}
                            className="flex items-center justify-center rounded bg-red-50 px-2 py-1 text-[10px] font-bold uppercase text-red-600 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                        <span className="text-accent font-bold">View Invoice &rarr;</span>
                      </div>
                    </div>
                  ))}
                  {filteredAndSortedInvoices.length === 0 && (
                    <div className="p-8 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-2xl">
                      No invoices found matching your filters.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isTaxInvoiceOpen && (
        <TaxInvoiceModal
          slug={slug}
          open={isTaxInvoiceOpen}
          onClose={() => setIsTaxInvoiceOpen(false)}
          onSave={handleSaveInvoice}
        />
      )}

      {viewingInvoice && (
        <ViewInvoiceModal
          open={!!viewingInvoice}
          invoice={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
        />
      )}
    </>
  );
}
