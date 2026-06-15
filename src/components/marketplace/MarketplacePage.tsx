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

export default function MarketplacePage() {
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isTaxInvoiceOpen, setIsTaxInvoiceOpen] = useState(false);
  
  // Date filter mock data
  const {
    dateFilter, setDateFilter,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
  } = useDateFilter([]); // Empty array for now since no db connected

  const handleSaveStock = (data: any) => {
    console.log("Stock saved from Manage Stock modal:", data);
    // Usually we would update state/db here.
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
            value="0"
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
            label="Active Listings"
            value="0"
            subValue="Currently visible"
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
            value="0.00 g"
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
            value="$0.00"
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

        <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-surface">
          <div className="flex flex-col items-center justify-center gap-4 text-slate-500">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-sm">No marketplace items yet. Click Manage Stock or New Tax Invoice to begin.</p>
          </div>
        </div>
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
          onClose={() => setIsTaxInvoiceOpen(false)}
        />
      )}
    </>
  );
}
