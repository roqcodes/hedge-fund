'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formInput, formLabel } from '@/lib/ui';
import { useLinkedRateFields } from '@/lib/icTransfer/useLinkedRateFields';
import {
  IC_SALE_TRANSACTION_TYPE_OPTIONS,
  type ICSaleTransactionType,
} from '@/lib/icTransfer/transactionTypes';
import {
  autofillTransactionPricing,
  buildPerTypePricing,
  createDefaultPricingConfig,
  createDefaultSlabPricing,
  createEmptySlabPricing,
  flatForNormalize,
  getFlatRateFromGroup,
  getPricingKind,
  getPricingScope,
  normalizePricingConfig,
  type RatePricingKind,
  type RatePricingScope,
} from '@/lib/icTransfer/ratePricing';
import type { NullableFlatRate } from '@/lib/icTransfer/rateFieldInput';
import {
  formatRateFieldDisplay,
  parseRateFieldInput,
} from '@/lib/icTransfer/rateFieldInput';
import { getCurrencyUnitRate } from '@/lib/icTransfer/rateCalculations';
import type { ICRateGroup, ICRateGroupPricingConfig, ICRateTransactionPricing } from '@/types';
import RateSlabTable, { slabsFromEditable, slabsToEditable } from './RateSlabTable';

export type RatePricingEditorValue = {
  flat: NullableFlatRate;
  pricingConfig: ICRateGroupPricingConfig;
};

type Props = {
  group?: ICRateGroup;
  currency: string;
  convertedRateOnly?: boolean;
  defaultExpanded?: boolean;
  showExpandToggle?: boolean;
  /**
   * `default` — flat fields + optional expand for advanced.
   * `guided` — flat fields + four clear pricing-mode cards (bulk update).
   */
  variant?: 'default' | 'guided';
  idPrefix?: string;
  onChange: (value: RatePricingEditorValue) => void;
};

type PricingModeKey = 'flat_all' | 'flat_per' | 'slab_all' | 'slab_per';

const GUIDED_MODES: ReadonlyArray<{
  key: PricingModeKey;
  scope: RatePricingScope;
  kind: RatePricingKind;
  title: string;
  description: string;
}> = [
  {
    key: 'flat_all',
    scope: 'all_types',
    kind: 'flat',
    title: 'One flat rate',
    description: 'Same rate for Transfer, CDM, By Hand, and NRE',
  },
  {
    key: 'flat_per',
    scope: 'per_type',
    kind: 'flat',
    title: 'Flat per type',
    description: 'Set a different flat rate for each transaction type',
  },
  {
    key: 'slab_all',
    scope: 'all_types',
    kind: 'slab',
    title: 'Volume slabs',
    description: 'Shared volume tiers for every transaction type',
  },
  {
    key: 'slab_per',
    scope: 'per_type',
    kind: 'slab',
    title: 'Slabs per type',
    description: 'Separate volume tiers for each transaction type',
  },
];

function modeKeyFromState(scope: RatePricingScope, kind: RatePricingKind): PricingModeKey {
  if (scope === 'all_types' && kind === 'flat') return 'flat_all';
  if (scope === 'per_type' && kind === 'flat') return 'flat_per';
  if (scope === 'all_types' && kind === 'slab') return 'slab_all';
  return 'slab_per';
}

function SegmentButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? 'bg-accent text-white shadow-sm'
          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

function FlatRateFields({
  pricing,
  currency,
  convertedRateOnly,
  onChange,
}: {
  pricing: ICRateTransactionPricing;
  currency: string;
  convertedRateOnly?: boolean;
  onChange: (next: ICRateTransactionPricing) => void;
}) {
  const sale = pricing.saleRate ?? null;
  const conversion = pricing.conversionRate ?? null;
  const converted =
    sale != null && conversion != null ? getCurrencyUnitRate(sale, conversion) : null;

  if (convertedRateOnly) {
    return (
      <div className="max-w-[200px]">
        <label className={formLabel}>Rate ({currency})</label>
        <input
          type="number"
          step="0.000001"
          className={`${formInput} tabular-nums`}
          value={formatRateFieldDisplay(converted)}
          onChange={e => {
            const nextConverted = parseRateFieldInput(e.target.value);
            if (nextConverted == null) {
              onChange({ mode: 'flat', saleRate: undefined, conversionRate: conversion ?? undefined });
              return;
            }
            const conv = conversion;
            onChange({
              mode: 'flat',
              saleRate: conv != null && conv > 0 ? nextConverted / conv : undefined,
              conversionRate: conversion ?? undefined,
            });
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="w-full max-w-[140px]">
        <label className={formLabel}>AED rate</label>
        <input
          type="number"
          step="0.000001"
          className={`${formInput} tabular-nums`}
          value={formatRateFieldDisplay(sale)}
          onChange={e =>
            onChange({
              mode: 'flat',
              saleRate: parseRateFieldInput(e.target.value) ?? undefined,
              conversionRate: conversion ?? undefined,
            })
          }
        />
      </div>
      <div className="w-full max-w-[140px]">
        <label className={formLabel}>Conversion</label>
        <input
          type="number"
          step="0.000001"
          className={`${formInput} tabular-nums`}
          value={formatRateFieldDisplay(conversion)}
          onChange={e =>
            onChange({
              mode: 'flat',
              saleRate: sale ?? undefined,
              conversionRate: parseRateFieldInput(e.target.value) ?? undefined,
            })
          }
        />
      </div>
      <div className="w-full max-w-[140px]">
        <label className={formLabel}>Rate ({currency})</label>
        <input
          type="number"
          step="0.000001"
          className={`${formInput} tabular-nums bg-slate-50`}
          value={formatRateFieldDisplay(converted)}
          onChange={e => {
            const nextConverted = parseRateFieldInput(e.target.value);
            if (nextConverted == null) {
              onChange({ mode: 'flat', saleRate: undefined, conversionRate: conversion ?? undefined });
              return;
            }
            const conv = conversion;
            onChange({
              mode: 'flat',
              saleRate: conv != null && conv > 0 ? nextConverted / conv : undefined,
              conversionRate: conversion ?? undefined,
            });
          }}
        />
      </div>
    </div>
  );
}

export default function RateGroupPricingEditor({
  group,
  currency,
  convertedRateOnly = false,
  defaultExpanded = false,
  showExpandToggle = true,
  variant = 'default',
  idPrefix = 'pricing',
  onChange,
}: Props) {
  const isGuided = variant === 'guided';
  const [expanded, setExpanded] = useState(defaultExpanded || isGuided);
  const baseFlat = useMemo(
    () => (group ? getFlatRateFromGroup(group) : { saleRate: 0, conversionRate: 1 }),
    [group?.id, group?.saleRate, group?.conversionRate],
  );
  const lastEmitKeyRef = useRef<string | null>(null);

  const {
    saleRate,
    conversionRate,
    convertedRate,
    saleRateNum,
    conversionRateNum,
    onSaleChange,
    onConversionChange,
    onConvertedChange,
  } = useLinkedRateFields();

  const [scope, setScope] = useState<RatePricingScope>(
    getPricingScope(group?.pricingConfig),
  );
  const [kind, setKind] = useState<RatePricingKind>(getPricingKind(group?.pricingConfig));
  const [commonPricing, setCommonPricing] = useState<ICRateTransactionPricing>(() => {
    const nullableFlat = {
      saleRate: baseFlat.saleRate > 0 ? baseFlat.saleRate : null,
      conversionRate: baseFlat.conversionRate > 0 ? baseFlat.conversionRate : null,
    };
    const normalizedFlat = flatForNormalize(nullableFlat);
    return autofillTransactionPricing(
      normalizedFlat,
      group?.pricingConfig?.common ??
        (group?.pricingConfig?.kind === 'slab' ? createDefaultSlabPricing(normalizedFlat) : null),
    );
  });
  const [perTypePricing, setPerTypePricing] = useState<
    NonNullable<ICRateGroupPricingConfig['byTransactionType']>
  >(() => {
    const nullableFlat = {
      saleRate: baseFlat.saleRate > 0 ? baseFlat.saleRate : null,
      conversionRate: baseFlat.conversionRate > 0 ? baseFlat.conversionRate : null,
    };
    return buildPerTypePricing(flatForNormalize(nullableFlat), kind, group?.pricingConfig?.byTransactionType);
  });

  const [activeType, setActiveType] = useState<ICSaleTransactionType>('transfer');

  useEffect(() => {
    if (!group) return;
    lastEmitKeyRef.current = null;
    const groupFlat = getFlatRateFromGroup(group);
    onSaleChange(groupFlat.saleRate > 0 ? String(groupFlat.saleRate) : '');
    onConversionChange(groupFlat.conversionRate > 0 ? String(groupFlat.conversionRate) : '');
    onConvertedChange(
      groupFlat.saleRate > 0 && groupFlat.conversionRate > 0
        ? String(getCurrencyUnitRate(groupFlat.saleRate, groupFlat.conversionRate))
        : '',
    );
    setScope(getPricingScope(group.pricingConfig));
    setKind(getPricingKind(group.pricingConfig));
    setCommonPricing(
      autofillTransactionPricing(
        flatForNormalize({
          saleRate: groupFlat.saleRate > 0 ? groupFlat.saleRate : null,
          conversionRate: groupFlat.conversionRate > 0 ? groupFlat.conversionRate : null,
        }),
        group.pricingConfig?.common ??
          (group.pricingConfig?.kind === 'slab' ? createDefaultSlabPricing(groupFlat) : null),
      ),
    );
    setPerTypePricing(
      buildPerTypePricing(
        flatForNormalize({
          saleRate: groupFlat.saleRate > 0 ? groupFlat.saleRate : null,
          conversionRate: groupFlat.conversionRate > 0 ? groupFlat.conversionRate : null,
        }),
        getPricingKind(group.pricingConfig),
        group.pricingConfig?.byTransactionType,
      ),
    );
  }, [group?.id]);

  const flat: NullableFlatRate = useMemo(
    () => ({
      saleRate: saleRateNum,
      conversionRate: conversionRateNum,
    }),
    [saleRateNum, conversionRateNum],
  );

  const pricingConfig = useMemo(() => {
    const draft: ICRateGroupPricingConfig = {
      scope,
      kind,
      ...(scope === 'all_types' && kind === 'slab' ? { common: commonPricing } : {}),
      ...(scope === 'per_type' ? { byTransactionType: perTypePricing } : {}),
    };
    return normalizePricingConfig(draft, flatForNormalize(flat));
  }, [scope, kind, commonPricing, perTypePricing, flat.saleRate, flat.conversionRate]);

  const emitKey = useMemo(
    () => serializePricingEditorValue({ flat, pricingConfig }),
    [flat.saleRate, flat.conversionRate, scope, kind, commonPricing, perTypePricing],
  );

  useEffect(() => {
    if (lastEmitKeyRef.current === emitKey) return;
    lastEmitKeyRef.current = emitKey;
    onChange({ flat, pricingConfig });
  }, [emitKey, flat, pricingConfig, onChange]);

  const handleScopeChange = (next: RatePricingScope) => {
    setScope(next);
    if (next === 'per_type') {
      setPerTypePricing(buildPerTypePricing(flatForNormalize(flat), kind, perTypePricing));
    }
  };

  const handleKindChange = (next: RatePricingKind) => {
    setKind(next);
    const normalizedFlat = flatForNormalize(flat);
    if (next === 'slab') {
      const hasFlat = flat.saleRate != null && flat.conversionRate != null;
      setCommonPricing(hasFlat ? createDefaultSlabPricing(normalizedFlat) : createEmptySlabPricing());
      setPerTypePricing(buildPerTypePricing(normalizedFlat, 'slab', perTypePricing));
    } else {
      setCommonPricing(autofillTransactionPricing(normalizedFlat, null));
      setPerTypePricing(buildPerTypePricing(normalizedFlat, 'flat', perTypePricing));
    }
  };

  const handleConvertedInput = (value: string) => {
    onConvertedChange(value);
    if (!convertedRateOnly) return;
    if (value.trim() === '') {
      onSaleChange('');
      return;
    }
    const converted = parseFloat(value);
    const conv = conversionRateNum ?? (baseFlat.conversionRate > 0 ? baseFlat.conversionRate : null);
    if (Number.isFinite(converted) && converted > 0 && conv != null && conv > 0) {
      onSaleChange(String(converted / conv));
      if (!conversionRate) {
        onConversionChange(String(conv));
      }
    }
  };

  const activeTypePricing =
    perTypePricing[activeType] ?? autofillTransactionPricing(flatForNormalize(flat), null);

  const handleGuidedMode = (key: PricingModeKey) => {
    const mode = GUIDED_MODES.find(m => m.key === key);
    if (!mode) return;

    if (mode.kind !== kind) {
      handleKindChange(mode.kind);
    }
    if (mode.scope !== scope) {
      setScope(mode.scope);
      if (mode.scope === 'per_type') {
        setPerTypePricing(
          buildPerTypePricing(flatForNormalize(flat), mode.kind, perTypePricing),
        );
      }
    }
    setExpanded(true);
  };

  const activeModeKey = modeKeyFromState(scope, kind);
  const showAdvancedPanel = isGuided
    ? activeModeKey !== 'flat_all'
    : expanded;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        {!convertedRateOnly ? (
          <>
            <div className="w-full max-w-[140px]">
              <label className={formLabel} htmlFor={`${idPrefix}-sale`}>
                Rate in AED
              </label>
              <input
                id={`${idPrefix}-sale`}
                type="number"
                step="0.000001"
                className={`${formInput} tabular-nums`}
                value={saleRate}
                onChange={e => onSaleChange(e.target.value)}
                placeholder="—"
              />
            </div>
            <div className="w-full max-w-[140px]">
              <label className={formLabel} htmlFor={`${idPrefix}-conv`}>
                Conversion
              </label>
              <input
                id={`${idPrefix}-conv`}
                type="number"
                step="0.000001"
                className={`${formInput} tabular-nums`}
                value={conversionRate}
                onChange={e => onConversionChange(e.target.value)}
                placeholder="—"
              />
            </div>
          </>
        ) : null}
        <div className="w-full max-w-[160px]">
          <label className={formLabel} htmlFor={`${idPrefix}-converted`}>
            Rate ({currency})
          </label>
          <input
            id={`${idPrefix}-converted`}
            type="number"
            step="0.000001"
            className={`${formInput} tabular-nums`}
            value={convertedRate}
            onChange={e => handleConvertedInput(e.target.value)}
            placeholder="—"
          />
        </div>
      </div>

      {isGuided ? (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Pricing mode
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {GUIDED_MODES.map(mode => {
              const active = activeModeKey === mode.key;
              return (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => handleGuidedMode(mode.key)}
                  className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                    active
                      ? 'border-accent/40 bg-accent/[0.04] ring-1 ring-accent/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                  }`}
                >
                  <span className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                        active ? 'border-accent bg-accent' : 'border-slate-300 bg-white'
                      }`}
                      aria-hidden
                    >
                      {active ? (
                        <span className="size-1.5 rounded-full bg-white" />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-bold ${active ? 'text-accent' : 'text-slate-900'}`}>
                        {mode.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                        {mode.description}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : showExpandToggle ? (
        <button
          type="button"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 transition-colors hover:text-accent"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
            aria-hidden
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
          {expanded ? 'Hide transaction-type pricing' : 'Advanced pricing by transaction type'}
        </button>
      ) : null}

      {showAdvancedPanel ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          {!isGuided ? (
            <>
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Applies to
                </p>
                <div className="flex flex-wrap gap-2">
                  <SegmentButton
                    active={scope === 'all_types'}
                    label="Same for all types"
                    onClick={() => handleScopeChange('all_types')}
                  />
                  <SegmentButton
                    active={scope === 'per_type'}
                    label="Per transaction type"
                    onClick={() => handleScopeChange('per_type')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Pricing method
                </p>
                <div className="flex flex-wrap gap-2">
                  <SegmentButton
                    active={kind === 'flat'}
                    label="Flat rate"
                    onClick={() => handleKindChange('flat')}
                  />
                  <SegmentButton
                    active={kind === 'slab'}
                    label="Volume slabs"
                    onClick={() => handleKindChange('slab')}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Volume slabs charge different rates by order size. Empty tiers inherit the flat rate above.
                </p>
              </div>
            </>
          ) : null}

          {scope === 'all_types' ? (
            <div className="space-y-3">
              {kind === 'flat' ? (
                <p className="text-xs text-slate-500">
                  All transaction types use the flat rate fields above.
                </p>
              ) : (
                <>
                  {isGuided ? (
                    <p className="text-xs text-slate-500">
                      Set volume tiers below. Empty rate cells inherit the flat rate above when you save.
                    </p>
                  ) : null}
                  <RateSlabTable
                    slabs={slabsToEditable(
                      commonPricing.slabs ??
                        (flat.saleRate != null
                          ? createDefaultSlabPricing(flatForNormalize(flat)).slabs!
                          : createEmptySlabPricing().slabs!),
                    )}
                    currency={currency}
                    convertedRateOnly={convertedRateOnly}
                    onChange={slabs =>
                      setCommonPricing({ mode: 'slab', slabs: slabsFromEditable(slabs) })
                    }
                  />
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {isGuided ? (
                <p className="text-xs text-slate-500">
                  Switch tabs to set rates for each transaction type. Empty values inherit the flat rate above.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
                {IC_SALE_TRANSACTION_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setActiveType(opt.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      activeType === opt.value
                        ? 'bg-white text-accent shadow-sm ring-1 ring-accent/30'
                        : 'text-slate-500 hover:bg-white/80 hover:text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {kind === 'flat' ? (
                <FlatRateFields
                  pricing={activeTypePricing}
                  currency={currency}
                  convertedRateOnly={convertedRateOnly}
                  onChange={next =>
                    setPerTypePricing(prev => ({ ...prev, [activeType]: next }))
                  }
                />
              ) : (
                <RateSlabTable
                  slabs={slabsToEditable(
                    activeTypePricing.slabs ??
                      (flat.saleRate != null
                        ? createDefaultSlabPricing(flatForNormalize(flat)).slabs!
                        : createEmptySlabPricing().slabs!),
                  )}
                  currency={currency}
                  convertedRateOnly={convertedRateOnly}
                  onChange={slabs =>
                    setPerTypePricing(prev => ({
                      ...prev,
                      [activeType]: { mode: 'slab', slabs: slabsFromEditable(slabs) },
                    }))
                  }
                />
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function getInitialPricingEditorValue(group?: ICRateGroup): RatePricingEditorValue {
  const groupFlat = group ? getFlatRateFromGroup(group) : null;
  const flat: NullableFlatRate = {
    saleRate: groupFlat && groupFlat.saleRate > 0 ? groupFlat.saleRate : null,
    conversionRate: groupFlat && groupFlat.conversionRate > 0 ? groupFlat.conversionRate : null,
  };
  return {
    flat,
    pricingConfig: normalizePricingConfig(
      group?.pricingConfig ?? createDefaultPricingConfig(),
      flatForNormalize(flat),
    ),
  };
}

export function serializePricingEditorValue(value: RatePricingEditorValue): string {
  return JSON.stringify({
    saleRate: value.flat.saleRate,
    conversionRate: value.flat.conversionRate,
    pricingConfig: value.pricingConfig,
  });
}

export function arePricingEditorValuesEqual(
  a: RatePricingEditorValue,
  b: RatePricingEditorValue,
): boolean {
  return serializePricingEditorValue(a) === serializePricingEditorValue(b);
}
