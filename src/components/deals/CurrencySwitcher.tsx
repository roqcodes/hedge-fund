'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { filterSelect } from '@/lib/ui';

export default function CurrencySwitcher() {
  const { activeCurrency, setActiveCurrency } = useApp();

  return (
    <>
      {/* Mobile View: Dropdown */}
      <select
        value={activeCurrency}
        onChange={(e) => setActiveCurrency(e.target.value as 'AED' | 'USD' | 'INR')}
        className={`${filterSelect} w-full sm:hidden`}
        aria-label="Select Currency"
      >
        <option value="AED">AED</option>
        <option value="USD">USD</option>
        <option value="INR">INR</option>
      </select>

      {/* Desktop View: Segmented Buttons */}
      <div className="hidden sm:flex items-center gap-0.5 rounded-xl bg-slate-100 p-0.5 border border-slate-200 shadow-sm shrink-0">
        {(['AED', 'USD', 'INR'] as const).map((curr) => {
          const isActive = activeCurrency === curr;
          return (
            <button
              key={curr}
              type="button"
              onClick={() => setActiveCurrency(curr)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {curr}
            </button>
          );
        })}
      </div>
    </>
  );
}
