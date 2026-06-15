'use client';

import React, { useState } from 'react';
import KPICard from '@/components/ui/KPICard';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { useDateFilter } from '@/hooks/useDateFilter';
import {
  kpiGrid,
  pageHeader,
  pageSubtitle,
  pageTitle,
} from '@/lib/ui';

// Import our new modular modals
import AddStockModal from './AddStockModal';
import TaxInvoiceModal from './TaxInvoiceModal';
import ViewInvoiceModal from './ViewInvoiceModal';

export default function MarketplacePage() {
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isTaxInvoiceOpen, setIsTaxInvoiceOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);
  
  const [stocks, setStocks] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  // Date filter mock data
  const {
    dateFilter, setDateFilter,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
  } = useDateFilter([]); // Empty array for now since no db connected

  const handleSaveStock = (data: any) => {
    setStocks([...stocks, { ...data, id: Date.now() }]);
    setIsStockModalOpen(false);
  };

  const handleSaveInvoice = (invoice: any) => {
    setInvoices([...invoices, { ...invoice, id: Date.now() }]);
    setIsTaxInvoiceOpen(false);
  };

  const handleDeleteStock = (id: number) => {
    setStocks(stocks.filter(s => s.id !== id));
  };

  const handleDeleteInvoice = (id: number) => {
    setInvoices(invoices.filter(i => i.id !== id));
  };

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className="mb-5 flex items-start justify-between border-b border-slate-200/80 pb-5 sm:items-end">
          <div>
            <h2 className={pageTitle}>Marketplace</h2>
            <p className={pageSubtitle}>Manage your stock and marketplace details</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsTaxInvoiceOpen(true)} 
              className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:rounded-lg gap-2 font-semibold text-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span className="hidden sm:inline">New Tax Invoice</span>
            </button>

            <button 
              onClick={() => setIsStockModalOpen(true)} 
              className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors hover:bg-accent hover:text-white sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:rounded-lg sm:bg-accent sm:text-white sm:hover:bg-accent-hover gap-2 font-semibold text-sm"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="sm:w-[18px] sm:h-[18px] sm:stroke-2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="hidden sm:inline">Manage Stock</span>
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
            label="Total Stock"
            value={stocks.length.toString()}
            subValue="Items in marketplace"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            color="var(--purple)"
            bgColor="var(--purple-light)"
          />
          <KPICard
            label="Invoices"
            value={invoices.length.toString()}
            subValue="Created invoices"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            color="var(--accent)"
            bgColor="var(--accent-light)"
          />
          <KPICard
            label="Total Volume"
            value={`${stocks.reduce((acc, s) => acc + (parseFloat(s.grossQtyStr) || 0), 0).toFixed(2)} g`}
            subValue="Gross weight"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            }
            color="var(--warning)"
            bgColor="var(--warning-light)"
          />
          <KPICard
            label="Est. Value"
            value={`$${stocks.reduce((acc, s) => acc + (s.amount || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`}
            subValue="Marketplace value"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="var(--success)"
            bgColor="var(--success-light)"
          />
        </div>

        {stocks.length === 0 && invoices.length === 0 ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-surface">
            <div className="flex flex-col items-center justify-center gap-4 text-slate-500">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-sm">No marketplace items yet. Click Manage Stock or New Tax Invoice to begin.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Stocks List */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-surface p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
                Marketplace Stocks
                <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-md">{stocks.length} Items</span>
              </h3>
              <div className="space-y-3">
                {stocks.map(stock => (
                  <div key={stock.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 group">
                    <div className="flex-1">
                      <p className="font-bold text-sm text-slate-700">{stock.productCode}</p>
                      <p className="text-xs text-slate-500">{stock.grossQtyStr}g • {stock.purityStr} purity</p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="font-bold text-sm text-slate-900">${stock.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                      <p className="text-[10px] uppercase text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded inline-block mt-0.5">Active</p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-accent hover:bg-slate-100 rounded-lg transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => handleDeleteStock(stock.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Invoices List */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-surface p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
                Recent Tax Invoices
                <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-md">{invoices.length} Invoices</span>
              </h3>
              <div className="space-y-3">
                {invoices.map(inv => (
                  <div key={inv.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 group">
                    <div className="flex-1">
                      <p className="font-bold text-sm text-slate-700">{inv.docNo}</p>
                      <p className="text-xs text-slate-500">{inv.docDate} • {inv.items.length} items</p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="font-bold text-sm text-slate-900">${inv.netAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                      <p className="text-[10px] uppercase text-accent font-bold bg-accent/10 px-1.5 py-0.5 rounded inline-block mt-0.5">{inv.orderType}</p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setViewingInvoice(inv)} className="p-1.5 text-slate-400 hover:text-accent hover:bg-slate-100 rounded-lg transition-colors" title="View Invoice">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-accent hover:bg-slate-100 rounded-lg transition-colors" title="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => handleDeleteInvoice(inv.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-colors" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {isStockModalOpen && (
        <AddStockModal 
          open={isStockModalOpen}
          onClose={() => setIsStockModalOpen(false)}
          onSave={handleSaveStock}
        />
      )}

      {isTaxInvoiceOpen && (
        <TaxInvoiceModal
          open={isTaxInvoiceOpen}
          availableStocks={stocks}
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
