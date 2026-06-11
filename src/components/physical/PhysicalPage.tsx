'use client';
import React from 'react';
import { pageHeader, pageSubtitle, pageTitle } from '@/lib/ui';

export default function PhysicalPage() {
  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className={pageHeader}>
        <div>
          <h2 className={pageTitle}>Physical Assets</h2>
          <p className={pageSubtitle}>Vault inventory, bullion tracking, and physical custody</p>
        </div>
      </div>

      <div className="flex min-h-[min(50vh,420px)] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50/80 to-white px-4 py-12 text-center shadow-surface-xs sm:min-h-[min(60vh,520px)] sm:rounded-3xl sm:px-6 sm:py-16">
        <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-3xl shadow-surface ring-1 ring-amber-500/20 sm:mb-6 sm:size-20 sm:rounded-3xl sm:text-4xl">
          🪙
        </div>
        <h3 className="max-w-md text-lg font-bold text-slate-900 sm:text-xl md:text-2xl">Physical Metals Module</h3>
        <p className="mt-3 max-w-lg px-1 text-sm font-medium leading-relaxed text-slate-500">
          This module supports branch inventory for physical assets, including unallocated gold
          balances, specific bar tracking, and physical withdrawal processing.
        </p>
        <ul className="mt-6 grid w-full max-w-md gap-2 text-left text-sm font-medium text-slate-600 sm:mt-8">
          {['Vault & custody registry', 'Bullion serial tracking', 'Physical audit workflows', 'Investor gold reconciliation'].map(
            item => (
              <li
                key={item}
                className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-surface-xs sm:px-4"
              >
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400"
                  aria-hidden
                >
                  ○
                </span>
                <span className="min-w-0 flex-1 leading-snug">{item}</span>
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}
