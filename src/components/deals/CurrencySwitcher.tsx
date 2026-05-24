'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';

export default function CurrencySwitcher() {
  const { activeCurrency, setActiveCurrency } = useApp();

  return (
    <div className="flex items-center gap-0.5 rounded-xl bg-slate-100 p-0.5 border border-slate-200 shadow-sm">
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
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-55'
            }`}
          >
            {curr}
          </button>
        );
      })}
    </div>
  );
}
