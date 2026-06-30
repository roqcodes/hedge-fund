'use client';

import React from 'react';
import type { ICRateGroup } from '@/types';
import { formatAmount, getCurrencyUnitRate } from '@/lib/icTransfer/rateCalculations';

type Props = {
  group: ICRateGroup;
};

export default function RateGroupBanner({ group }: Props) {
  const currencyUnitRate = getCurrencyUnitRate(group.saleRate, group.conversionRate || 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
      <span className="font-semibold text-slate-500 uppercase tracking-wider">
        Applicable Rate Group: <strong className="text-slate-700">{group.name}</strong>
      </span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          <span className="font-semibold text-slate-400 uppercase">Sale Rate (AED):</span>{' '}
          <span className="font-bold text-accent">{formatAmount(group.saleRate)}</span>
        </span>
        <span>
          <span className="font-semibold text-slate-400 uppercase">Rate ({group.currency}):</span>{' '}
          <span className="font-bold text-indigo-600">{formatAmount(currencyUnitRate)}</span>
        </span>
      </div>
    </div>
  );
}
