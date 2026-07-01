'use client';

import React from 'react';
import { formatAmount } from '@/lib/icTransfer/rateCalculations';

type Props = {
  inrTotal: number;
  currencyTotal: number;
  currencyCode: string;
  aedBaseTotal: number;
  showCurrency?: boolean;
  showAed?: boolean;
};

export default function ICSaleAmountCards({
  inrTotal,
  currencyTotal,
  currencyCode,
  aedBaseTotal,
  showCurrency = true,
  showAed = true,
}: Props) {
  const colsClass = 
    showCurrency && showAed
      ? 'grid-cols-1 sm:grid-cols-3'
      : (showCurrency || showAed)
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1';

  return (
    <div className={`grid gap-4 rounded-xl border border-slate-100 p-4 bg-slate-50/50 ${colsClass}`}>
      <div className="text-center p-3 rounded-xl bg-white border border-slate-100 flex flex-col justify-center shadow-sm">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount (INR)</span>
        <span className="mt-1.5 text-base sm:text-lg font-bold text-slate-800 font-mono">
          {formatAmount(inrTotal)}
        </span>
      </div>

      {showCurrency && (
        <div className="text-center p-3 rounded-xl bg-white border border-slate-100 flex flex-col justify-center shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Amount ({currencyCode})
          </span>
          <span className="mt-1.5 text-base sm:text-lg font-bold text-slate-800 font-mono">
            {formatAmount(currencyTotal)}
          </span>
        </div>
      )}

      {showAed && (
        <div className="text-center p-3 rounded-xl bg-white border border-slate-100 flex flex-col justify-center shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount (AED)</span>
          <span className="mt-1.5 text-base sm:text-lg font-bold text-slate-800 font-mono">
            {formatAmount(aedBaseTotal)}
          </span>
        </div>
      )}
    </div>
  );
}
