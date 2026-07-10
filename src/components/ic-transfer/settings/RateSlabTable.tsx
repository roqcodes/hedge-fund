'use client';

import React from 'react';
import { formInput } from '@/lib/ui';
import { getCurrencyUnitRate } from '@/lib/icTransfer/rateCalculations';
import {
  formatRateFieldDisplay,
  parseRateFieldInput,
} from '@/lib/icTransfer/rateFieldInput';
import type { ICRateSlabTier } from '@/types';

export type EditableSlabTier = {
  minUnits: number;
  maxUnits: number | null;
  saleRate: number | null;
  conversionRate: number | null;
};

type Props = {
  slabs: EditableSlabTier[];
  currency: string;
  convertedRateOnly?: boolean;
  onChange: (slabs: EditableSlabTier[]) => void;
};

function emptyTier(): EditableSlabTier {
  return {
    minUnits: 0,
    maxUnits: null,
    saleRate: null,
    conversionRate: null,
  };
}

export function slabsToEditable(slabs: ICRateSlabTier[]): EditableSlabTier[] {
  return slabs.map(tier => ({
    minUnits: tier.minUnits,
    maxUnits: tier.maxUnits,
    saleRate: tier.saleRate > 0 ? tier.saleRate : null,
    conversionRate: tier.conversionRate > 0 ? tier.conversionRate : null,
  }));
}

export function slabsFromEditable(slabs: EditableSlabTier[]): ICRateSlabTier[] {
  return slabs.map(tier => ({
    minUnits: tier.minUnits,
    maxUnits: tier.maxUnits,
    saleRate: tier.saleRate ?? 0,
    conversionRate: tier.conversionRate ?? 0,
  }));
}

export default function RateSlabTable({
  slabs,
  currency,
  convertedRateOnly = false,
  onChange,
}: Props) {
  const updateTier = (index: number, patch: Partial<EditableSlabTier>) => {
    onChange(slabs.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));
  };

  const addTier = () => {
    const last = slabs[slabs.length - 1];
    const nextMin = last?.maxUnits ?? (last ? last.minUnits + 1 : 0);
    const template = last ?? emptyTier();
    const newSlabs = slabs.map((tier, i) =>
      i === slabs.length - 1 && tier.maxUnits == null
        ? { ...tier, maxUnits: nextMin > tier.minUnits ? nextMin : tier.minUnits + 1 }
        : tier,
    );
    onChange([
      ...newSlabs,
      {
        minUnits: nextMin,
        maxUnits: null,
        saleRate: template.saleRate,
        conversionRate: template.conversionRate,
      },
    ]);
  };

  const removeTier = (index: number) => {
    if (slabs.length <= 1) return;
    const next = slabs.filter((_, i) => i !== index);
    if (next.length > 0 && next[next.length - 1].maxUnits != null) {
      next[next.length - 1] = { ...next[next.length - 1], maxUnits: null };
    }
    onChange(next);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[520px] text-xs">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80">
            <th className="px-3 py-2.5 text-left font-semibold text-slate-500">From (units)</th>
            <th className="px-3 py-2.5 text-left font-semibold text-slate-500">To (units)</th>
            {!convertedRateOnly ? (
              <>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500">AED rate</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Conversion</th>
              </>
            ) : null}
            <th className="px-3 py-2.5 text-left font-semibold text-slate-500">
              Rate ({currency})
            </th>
            <th className="px-3 py-2.5 text-center font-semibold text-slate-500 w-10" />
          </tr>
        </thead>
        <tbody>
          {slabs.map((tier, index) => {
            const converted =
              tier.saleRate != null && tier.conversionRate != null
                ? getCurrencyUnitRate(tier.saleRate, tier.conversionRate)
                : null;
            const isLast = index === slabs.length - 1;

            return (
              <tr key={index} className="border-b border-slate-50 last:border-0">
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="1"
                    className={`${formInput} tabular-nums`}
                    value={formatRateFieldDisplay(tier.minUnits, { keepZero: true })}
                    disabled={index === 0}
                    onChange={e => {
                      const parsed = parseRateFieldInput(e.target.value);
                      updateTier(index, { minUnits: parsed ?? 0 });
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  {isLast ? (
                    <span className="inline-flex h-10 items-center px-2 text-slate-400">∞</span>
                  ) : (
                    <input
                      type="number"
                      step="1"
                      className={`${formInput} tabular-nums`}
                      value={tier.maxUnits == null ? '' : formatRateFieldDisplay(tier.maxUnits, { keepZero: true })}
                      onChange={e => {
                        const v = e.target.value;
                        updateTier(index, {
                          maxUnits: v.trim() === '' ? null : parseRateFieldInput(v),
                        });
                      }}
                    />
                  )}
                </td>
                {!convertedRateOnly ? (
                  <>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.000001"
                        className={`${formInput} tabular-nums`}
                        value={formatRateFieldDisplay(tier.saleRate)}
                        onChange={e =>
                          updateTier(index, { saleRate: parseRateFieldInput(e.target.value) })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.000001"
                        className={`${formInput} tabular-nums`}
                        value={formatRateFieldDisplay(tier.conversionRate)}
                        onChange={e =>
                          updateTier(index, {
                            conversionRate: parseRateFieldInput(e.target.value),
                          })
                        }
                      />
                    </td>
                  </>
                ) : null}
                <td className="px-3 py-2">
                  {convertedRateOnly ? (
                    <input
                      type="number"
                      step="0.000001"
                      className={`${formInput} tabular-nums`}
                      value={formatRateFieldDisplay(converted)}
                      onChange={e => {
                        const nextConverted = parseRateFieldInput(e.target.value);
                        const conv = tier.conversionRate;
                        if (nextConverted == null) {
                          updateTier(index, { saleRate: null });
                          return;
                        }
                        if (conv != null && conv > 0) {
                          updateTier(index, { saleRate: nextConverted / conv });
                        }
                      }}
                    />
                  ) : (
                    <span className="inline-flex h-10 items-center font-semibold tabular-nums text-indigo-700">
                      {converted != null ? converted.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—'}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {slabs.length > 1 ? (
                    <button
                      type="button"
                      aria-label="Remove tier"
                      className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      onClick={() => removeTier(index)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-2">
        <button
          type="button"
          className="text-xs font-semibold text-accent hover:text-accent/80"
          onClick={addTier}
        >
          + Add volume tier
        </button>
      </div>
    </div>
  );
}
