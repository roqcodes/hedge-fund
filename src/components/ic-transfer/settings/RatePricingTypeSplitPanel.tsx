'use client';

import React, { useMemo } from 'react';
import {
  IC_SALE_TRANSACTION_TYPE_OPTIONS,
  type ICSaleTransactionType,
} from '@/lib/icTransfer/transactionTypes';
import {
  createDefaultSlabPricing,
  createEmptySlabPricing,
  flatForNormalize,
  getTransactionTypePricingMode,
  isTransactionPricingConfigured,
  transactionPricingMatches,
  typesAssignableToTab,
  type RatePricingKind,
} from '@/lib/icTransfer/ratePricing';
import type { NullableFlatRate } from '@/lib/icTransfer/rateFieldInput';
import type { ICRateGroupPricingConfig, ICRateTransactionPricing } from '@/types';
import FlatRateFields from './FlatRateFields';
import RateSlabTable, { slabsFromEditable, slabsToEditable } from './RateSlabTable';

export type RatePricingTab = RatePricingKind;

type Props = {
  selectedTypes: ICSaleTransactionType[];
  onSelectedTypesChange: (types: ICSaleTransactionType[]) => void;
  rateTab: RatePricingTab;
  onRateTabChange: (tab: RatePricingTab) => void;
  perTypePricing: Partial<NonNullable<ICRateGroupPricingConfig['byTransactionType']>>;
  onApplyToSelected: (pricing: ICRateTransactionPricing) => void;
  flatSeed: NullableFlatRate;
  currency: string;
  convertedRateOnly?: boolean;
  lockedConversionRate?: number;
  defaultConversionRate?: number | null;
};

function IconCheck() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function getSharedPricingForSelection(
  types: ICSaleTransactionType[],
  perTypePricing: Partial<NonNullable<ICRateGroupPricingConfig['byTransactionType']>>,
  tab: RatePricingTab,
  flatSeed: NullableFlatRate,
): { pricing: ICRateTransactionPricing; mixed: boolean } {
  if (types.length === 0) {
    return {
      pricing: tab === 'flat' ? { mode: 'flat' } : createEmptySlabPricing(),
      mixed: false,
    };
  }

  const entries = types
    .map(type => perTypePricing[type])
    .filter((pricing): pricing is ICRateTransactionPricing => !!pricing && pricing.mode === tab);

  if (entries.length === 0) {
    const normalizedFlat = flatForNormalize(flatSeed);
    return {
      pricing:
        tab === 'flat'
          ? { mode: 'flat' }
          : flatSeed.saleRate != null && flatSeed.saleRate > 0
            ? createDefaultSlabPricing(normalizedFlat)
            : createEmptySlabPricing(),
      mixed: false,
    };
  }

  const first = entries[0];
  const mixed = !entries.every(entry => transactionPricingMatches(entry, first));
  if (mixed) {
    return {
      pricing: tab === 'flat' ? { mode: 'flat' } : createEmptySlabPricing(),
      mixed: true,
    };
  }
  return { pricing: first, mixed: false };
}

export default function RatePricingTypeSplitPanel({
  selectedTypes,
  onSelectedTypesChange,
  rateTab,
  onRateTabChange,
  perTypePricing,
  onApplyToSelected,
  flatSeed,
  currency,
  convertedRateOnly = false,
  lockedConversionRate,
  defaultConversionRate,
}: Props) {
  const assignableTypes = useMemo(
    () => typesAssignableToTab(perTypePricing, rateTab),
    [perTypePricing, rateTab],
  );
  const assignableSet = useMemo(() => new Set(assignableTypes), [assignableTypes]);
  const selectedSet = useMemo(() => new Set(selectedTypes), [selectedTypes]);
  const allAssignableSelected =
    assignableTypes.length > 0 && assignableTypes.every(type => selectedSet.has(type));

  const { pricing: editorPricing, mixed } = useMemo(
    () => getSharedPricingForSelection(selectedTypes, perTypePricing, rateTab, flatSeed),
    [selectedTypes, perTypePricing, rateTab, flatSeed],
  );

  const otherTabLabel = rateTab === 'flat' ? 'Slab rate' : 'Flat value';

  const toggleType = (type: ICSaleTransactionType) => {
    if (!assignableSet.has(type)) return;
    onSelectedTypesChange(
      selectedSet.has(type)
        ? selectedTypes.filter(value => value !== type)
        : [...selectedTypes, type],
    );
  };

  const toggleSelectAll = () => {
    onSelectedTypesChange(allAssignableSelected ? [] : [...assignableTypes]);
  };

  const selectedLabels = IC_SALE_TRANSACTION_TYPE_OPTIONS.filter(opt =>
    selectedSet.has(opt.value),
  ).map(opt => opt.label);

  const slabFallback =
    flatSeed.saleRate != null && flatSeed.saleRate > 0
      ? createDefaultSlabPricing(flatForNormalize(flatSeed)).slabs!
      : createEmptySlabPricing().slabs!;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex border-b border-slate-100">
        <button
          type="button"
          onClick={() => onRateTabChange('flat')}
          className={`flex-1 px-4 py-3.5 text-sm font-bold transition-colors ${
            rateTab === 'flat'
              ? 'border-b-2 border-accent bg-accent/[0.03] text-accent'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          Flat value
        </button>
        <button
          type="button"
          onClick={() => onRateTabChange('slab')}
          className={`flex-1 px-4 py-3.5 text-sm font-bold transition-colors ${
            rateTab === 'slab'
              ? 'border-b-2 border-accent bg-accent/[0.03] text-accent'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          Slab rate
        </button>
      </div>

      <div className="space-y-4 p-4 md:p-5">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Transaction types
              </p>
              <p className="text-sm font-bold text-slate-900">
                Select types for {rateTab === 'flat' ? 'flat' : 'slab'} pricing
              </p>
            </div>
            {assignableTypes.length > 0 ? (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[11px] font-bold text-accent hover:text-accent/80"
              >
                {allAssignableSelected ? 'Clear' : 'Select all'}
              </button>
            ) : null}
          </div>

          <ul className="grid gap-1 sm:grid-cols-2">
            {IC_SALE_TRANSACTION_TYPE_OPTIONS.map(opt => {
              const mode = getTransactionTypePricingMode(perTypePricing[opt.value]);
              const assignable = assignableSet.has(opt.value);
              const checked = assignable && selectedSet.has(opt.value);
              const onOtherTab = mode != null && mode !== rateTab;
              const configured = isTransactionPricingConfigured(perTypePricing[opt.value]);

              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    disabled={!assignable}
                    onClick={() => toggleType(opt.value)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      !assignable
                        ? 'cursor-not-allowed bg-slate-50/80 opacity-70'
                        : checked
                          ? 'bg-accent/[0.06] ring-1 ring-inset ring-accent/20'
                          : 'hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                        checked
                          ? 'border-accent bg-accent text-white'
                          : assignable
                            ? 'border-slate-300 bg-white'
                            : 'border-slate-200 bg-slate-100'
                      }`}
                      aria-hidden
                    >
                      {checked ? <IconCheck /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">{opt.label}</span>
                      {onOtherTab ? (
                        <span className="block text-[10px] font-medium text-slate-400">
                          On {otherTabLabel} tab
                        </span>
                      ) : configured ? (
                        <span className="block text-[10px] font-medium text-emerald-600">
                          {rateTab === 'flat' ? 'Flat' : 'Slab'} · configured
                        </span>
                      ) : mode === rateTab ? (
                        <span className="block text-[10px] font-medium text-slate-500">Selected</span>
                      ) : (
                        <span className="block text-[10px] font-medium text-amber-600">Not set</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mt-2 text-[11px] leading-snug text-slate-500">
            Each type is flat or slab — not both. Types picked on one tab are locked out of the other.
          </p>
        </div>

        <div className="border-t border-slate-100 pt-4">
          {assignableTypes.length === 0 ? (
            <p className="text-sm text-slate-500">
              All types are assigned to the other tab. Switch to {otherTabLabel} to edit them.
            </p>
          ) : selectedTypes.length === 0 ? (
            <p className="text-sm text-slate-500">
              Select at least one type above to set {rateTab === 'flat' ? 'flat' : 'slab'} rates.
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs text-slate-500">
                {mixed
                  ? `Selected types have different ${rateTab} rates — enter a value to apply to ${selectedLabels.join(', ')}.`
                  : `Applying ${rateTab === 'flat' ? 'flat value' : 'slab rate'} to ${selectedLabels.join(', ')}.`}
              </p>

              {rateTab === 'flat' ? (
                <FlatRateFields
                  pricing={editorPricing}
                  currency={currency}
                  convertedRateOnly={convertedRateOnly}
                  lockedConversionRate={lockedConversionRate}
                  onChange={onApplyToSelected}
                />
              ) : (
                <RateSlabTable
                  slabs={slabsToEditable(editorPricing.slabs ?? slabFallback)}
                  currency={currency}
                  convertedRateOnly={convertedRateOnly}
                  lockedConversionRate={lockedConversionRate}
                  defaultConversionRate={defaultConversionRate}
                  onChange={slabs =>
                    onApplyToSelected({ mode: 'slab', slabs: slabsFromEditable(slabs) })
                  }
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
