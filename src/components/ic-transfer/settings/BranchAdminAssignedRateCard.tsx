'use client';

import React from 'react';
import type { ICRateGroup } from '@/types';
import { formatAmount, getCurrencyUnitRate } from '@/lib/icTransfer/rateCalculations';

type Props = {
  group: ICRateGroup;
};

/** Read-only admin-assigned branch rate — numbers only, no group metadata. */
export default function BranchAdminAssignedRateCard({ group }: Props) {
  const currencyUnitRate = getCurrencyUnitRate(group.saleRate, group.conversionRate || 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 md:p-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Admin assigned rate for your branch
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Applied when HQ fulfills your orders. Used with your customer rate to calculate branch profit.
      </p>
      <div className="mt-4 flex flex-wrap gap-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sale rate (AED)</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-accent">{formatAmount(group.saleRate)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Unit rate ({group.currency})
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-indigo-600">
            {formatAmount(currencyUnitRate)}
          </p>
        </div>
      </div>
    </div>
  );
}
