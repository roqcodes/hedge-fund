'use client';

import React, { useEffect, useState } from 'react';
import { formInput } from '@/lib/ui';
import { getCurrencyUnitRate } from '@/lib/icTransfer/rateCalculations';
import {
  formatRateFieldDisplay,
  isIncompleteDecimalInput,
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
  lockedConversionRate?: number;
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

function DecimalInput({
  value,
  onCommit,
  className,
  disabled,
  keepZero,
}: {
  value: number | null;
  onCommit: (next: number | null) => void;
  className?: string;
  disabled?: boolean;
  keepZero?: boolean;
}) {
  const [text, setText] = useState(() => formatRateFieldDisplay(value, { keepZero }));

  useEffect(() => {
    setText(formatRateFieldDisplay(value, { keepZero }));
  }, [value, keepZero]);

  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      className={className}
      value={text}
      placeholder="—"
      onChange={e => {
        const raw = e.target.value;
        if (raw !== '' && !/^-?\d*\.?\d*$/u.test(raw)) return;
        setText(raw);
        if (raw.trim() === '') {
          onCommit(null);
          return;
        }
        if (isIncompleteDecimalInput(raw)) return;
        onCommit(parseRateFieldInput(raw));
      }}
    />
  );
}

export default function RateSlabTable({
  slabs,
  currency,
  convertedRateOnly = false,
  lockedConversionRate,
  onChange,
}: Props) {
  const updateTier = (index: number, patch: Partial<EditableSlabTier>) => {
    const withLocked =
      lockedConversionRate != null && lockedConversionRate > 0
        ? { ...patch, conversionRate: patch.conversionRate ?? lockedConversionRate }
        : patch;

    const next = slabs.map((tier, i) => (i === index ? { ...tier, ...withLocked } : tier));

    // Keep contiguous inclusive ranges: when To changes, next From becomes To + 1.
    if (patch.maxUnits != null && Number.isFinite(patch.maxUnits) && index + 1 < next.length) {
      next[index + 1] = { ...next[index + 1], minUnits: Number(patch.maxUnits) + 1 };
    }

    onChange(next);
  };

  const addTier = () => {
    const last = slabs[slabs.length - 1];
    const template = last ?? emptyTier();
    const closedMax =
      last?.maxUnits != null
        ? last.maxUnits
        : (last ? last.minUnits + 99 : 99);
    const nextMin = closedMax + 1;
    const newSlabs = slabs.map((tier, i) =>
      i === slabs.length - 1 && tier.maxUnits == null
        ? { ...tier, maxUnits: closedMax }
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
    <div className="space-y-2">
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
              const tierConv =
                lockedConversionRate != null && lockedConversionRate > 0
                  ? lockedConversionRate
                  : tier.conversionRate != null && tier.conversionRate > 0
                    ? tier.conversionRate
                    : null;
              const converted =
                tier.saleRate != null && tierConv != null
                  ? getCurrencyUnitRate(tier.saleRate, tierConv)
                  : null;
              const isLast = index === slabs.length - 1;

              return (
                <tr key={index} className="border-b border-slate-50 last:border-0">
                  <td className="px-3 py-2">
                    <DecimalInput
                      value={tier.minUnits}
                      keepZero
                      disabled={index === 0}
                      className={`${formInput} tabular-nums`}
                      onCommit={next => updateTier(index, { minUnits: next ?? 0 })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {isLast ? (
                      <span className="inline-flex h-10 items-center px-2 text-slate-400">∞</span>
                    ) : (
                      <DecimalInput
                        value={tier.maxUnits}
                        keepZero
                        className={`${formInput} tabular-nums`}
                        onCommit={next => updateTier(index, { maxUnits: next })}
                      />
                    )}
                  </td>
                  {!convertedRateOnly ? (
                    <>
                      <td className="px-3 py-2">
                        <DecimalInput
                          value={tier.saleRate}
                          className={`${formInput} tabular-nums`}
                          onCommit={next => {
                            // AED changed — keep this tier's conversion; converted recalculates.
                            updateTier(index, {
                              saleRate: next,
                              ...(tierConv != null ? { conversionRate: tierConv } : {}),
                            });
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        {lockedConversionRate != null && lockedConversionRate > 0 ? (
                          <span className="inline-flex h-10 items-center tabular-nums text-slate-500">
                            {formatRateFieldDisplay(lockedConversionRate)}
                          </span>
                        ) : (
                          <DecimalInput
                            value={tier.conversionRate}
                            className={`${formInput} tabular-nums`}
                            onCommit={next => {
                              // AED fixed — converted = AED × conversion
                              updateTier(index, { conversionRate: next });
                            }}
                          />
                        )}
                      </td>
                    </>
                  ) : null}
                  <td className="px-3 py-2">
                    <DecimalInput
                      value={converted}
                      className={`${formInput} tabular-nums`}
                      onCommit={next => {
                        if (next == null) return;

                        // Branch: conversion locked → derive AED.
                        if (lockedConversionRate != null && lockedConversionRate > 0) {
                          updateTier(index, {
                            saleRate: next / lockedConversionRate,
                            conversionRate: lockedConversionRate,
                          });
                          return;
                        }

                        // Admin: AED fixed → conversion = converted ÷ AED
                        if (tier.saleRate != null && tier.saleRate > 0) {
                          updateTier(index, {
                            saleRate: tier.saleRate,
                            conversionRate: next / tier.saleRate,
                          });
                          return;
                        }

                        // No AED yet — derive AED if conversion exists.
                        if (tierConv != null && tierConv > 0) {
                          updateTier(index, {
                            saleRate: next / tierConv,
                            conversionRate: tierConv,
                          });
                        }
                      }}
                    />
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
      <p className="text-[11px] leading-snug text-slate-500">
        Ranges are inclusive and must be contiguous — e.g. 0–100, then 101–200, then 201+ (open).
        Next From must be previous To + 1 (no overlap, no gaps).
      </p>
    </div>
  );
}
