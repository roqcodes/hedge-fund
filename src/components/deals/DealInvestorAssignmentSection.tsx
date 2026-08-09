'use client';

import React from 'react';
import { formatAED } from '@/data/mockData';
import type { Investor } from '@/types';
import {
  computeInvestorRowTotal,
  parseSafeDealNumber,
  type DealInvestorRow,
} from '@/lib/dealInvestorAssignment';
import { formHint, formInput, formSelect } from '@/lib/ui';

type Props = {
  dealAmount: number;
  investors: Investor[];
  rows: DealInvestorRow[];
  onChange: (rows: DealInvestorRow[]) => void;
  disabled?: boolean;
  embedded?: boolean;
  allowPendingIds?: string[];
};

export default function DealInvestorAssignmentSection({
  dealAmount,
  investors,
  rows,
  onChange,
  disabled = false,
  embedded = false,
  allowPendingIds = [],
}: Props) {
  const pendingSet = new Set(allowPendingIds);
  const selectableInvestors = investors.filter(
    i => i.status !== 'pending' || pendingSet.has(i.id),
  );

  const totalInvestment = computeInvestorRowTotal(rows, dealAmount);
  const balance = totalInvestment - dealAmount;

  const handleAddRow = () => {
    onChange([...rows, { investorId: '', percentageStr: '', amountStr: '', inputMode: 'amount' }]);
  };

  const handleRemoveRow = (index: number) => {
    const next = [...rows];
    next.splice(index, 1);
    onChange(next);
  };

  const handleChange = (
    index: number,
    field: 'investorId' | 'percentageStr' | 'amountStr',
    value: string,
  ) => {
    const next = [...rows];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const toggleInputMode = (index: number) => {
    const next = [...rows];
    const inv = { ...next[index] };
    if (inv.inputMode === 'percentage') {
      const pct = parseSafeDealNumber(inv.percentageStr);
      inv.amountStr = dealAmount > 0
        ? ((pct / 100) * dealAmount).toFixed(6).replace(/\.?0+$/, '')
        : '';
      inv.inputMode = 'amount';
    } else {
      const amt = parseSafeDealNumber(inv.amountStr);
      inv.percentageStr = dealAmount > 0
        ? ((amt / dealAmount) * 100).toFixed(6).replace(/\.?0+$/, '')
        : '';
      inv.inputMode = 'percentage';
    }
    next[index] = inv;
    onChange(next);
  };

  const content = (
    <>
      {!embedded && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-800">Investors</h4>
          {!disabled && (
            <button
              type="button"
              onClick={handleAddRow}
              className="text-xs font-semibold text-accent hover:text-accent-dark"
            >
              + Add Investor
            </button>
          )}
        </div>
      )}
      <p className={`${formHint} ${embedded ? 'mb-4' : 'mb-3'}`}>
        Assign investors and their capital share. Total share must equal 100% of group capital.
      </p>

      {dealAmount <= 0 && (
        <p className="mb-3 text-xs text-amber-700">Set group capital before assigning investor amounts.</p>
      )}

      {embedded && !disabled && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={handleAddRow}
            className="text-xs font-semibold text-accent hover:text-accent-dark"
          >
            + Add Investor
          </button>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((inv, index) => (
          <div key={index} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <select
                  className={formSelect}
                  value={inv.investorId}
                  onChange={e => handleChange(index, 'investorId', e.target.value)}
                  disabled={disabled}
                >
                  <option value="">Select Investor</option>
                  {selectableInvestors.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              {(rows.length > 1 || inv.investorId) && !disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveRow(index)}
                  className="shrink-0 flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  aria-label="Remove investor"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 shrink-0">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => { if (inv.inputMode !== 'percentage') toggleInputMode(index); }}
                  className={`rounded-md px-3 py-1 text-[11px] font-bold transition-all duration-200 ${
                    inv.inputMode === 'percentage'
                      ? 'bg-white text-accent shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  % Share
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => { if (inv.inputMode !== 'amount') toggleInputMode(index); }}
                  className={`rounded-md px-3 py-1 text-[11px] font-bold transition-all duration-200 ${
                    inv.inputMode === 'amount'
                      ? 'bg-white text-accent shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Amount
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="relative">
                  {inv.inputMode === 'percentage' ? (
                    <>
                      <input
                        className={`${formInput} !pr-8`}
                        type="number"
                        placeholder="Enter share %"
                        value={inv.percentageStr}
                        onChange={e => handleChange(index, 'percentageStr', e.target.value)}
                        max="100"
                        min="0"
                        disabled={disabled}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
                    </>
                  ) : (
                    <>
                      <input
                        className={`${formInput} !pr-12`}
                        type="number"
                        placeholder="Enter amount"
                        value={inv.amountStr}
                        onChange={e => handleChange(index, 'amountStr', e.target.value)}
                        min="0"
                        disabled={disabled}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">AED</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-slate-500">No investors assigned yet.</p>
      )}

      {rows.some(r => r.investorId) && (
        <div className="mt-4 flex flex-col gap-1 border-t border-slate-200 pt-3">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-slate-600">Total Investment:</span>
            <span className="font-bold text-slate-900">{formatAED(totalInvestment)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium text-slate-600">Balance (Investment - Group Capital):</span>
            <span className={`font-bold ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {formatAED(balance)}
            </span>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      {content}
    </div>
  );
}
