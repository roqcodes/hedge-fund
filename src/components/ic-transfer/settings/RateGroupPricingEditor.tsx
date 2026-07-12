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
  remapPricingConfigToConversion,
  type RatePricingKind,
  type RatePricingScope,
} from '@/lib/icTransfer/ratePricing';
import type { NullableFlatRate } from '@/lib/icTransfer/rateFieldInput';
import {
  formatRateFieldDisplay,
  parseRateFieldInput,
  isIncompleteDecimalInput,
} from '@/lib/icTransfer/rateFieldInput';
import { formatRateInputValue, getCurrencyUnitRate } from '@/lib/icTransfer/rateCalculations';
import type { ICRateGroup, ICRateGroupPricingConfig, ICRateTransactionPricing } from '@/types';
import RateSlabTable, { slabsFromEditable, slabsToEditable } from './RateSlabTable';

export type RatePricingEditorValue = {
  flat: NullableFlatRate;
  /** Exact converted/local rate from the input when available (preferred for preview). */
  convertedRate?: number | null;
  pricingConfig: ICRateGroupPricingConfig;
};

type Props = {
  group?: ICRateGroup;
  currency: string;
  convertedRateOnly?: boolean;
  /** Branch: lock FX conversion so local rate ↔ AED stays consistent. */
  lockedConversionRate?: number;
  defaultExpanded?: boolean;
  showExpandToggle?: boolean;
  /**
   * `default` — flat fields + optional expand for advanced.
   * `guided` — mode cards drive a single rate surface (bulk update).
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
  lockedConversionRate,
  onChange,
}: {
  pricing: ICRateTransactionPricing;
  currency: string;
  convertedRateOnly?: boolean;
  /** Branch portal: force this conversion when deriving AED from local rate. */
  lockedConversionRate?: number;
  onChange: (next: ICRateTransactionPricing) => void;
}) {
  const sale = pricing.saleRate ?? null;
  const conversion =
    lockedConversionRate != null && lockedConversionRate > 0
      ? lockedConversionRate
      : (pricing.conversionRate ?? null);
  const converted =
    sale != null && conversion != null && conversion > 0
      ? getCurrencyUnitRate(sale, conversion)
      : null;

  const [saleText, setSaleText] = useState(() => formatRateFieldDisplay(sale));
  const [conversionText, setConversionText] = useState(() => formatRateFieldDisplay(conversion));
  const [convertedText, setConvertedText] = useState(() => formatRateFieldDisplay(converted));

  useEffect(() => {
    setSaleText(formatRateFieldDisplay(sale));
    setConversionText(formatRateFieldDisplay(conversion));
    setConvertedText(formatRateFieldDisplay(converted));
  }, [sale, conversion, converted]);

  const commitFlat = (nextSale: number | null, nextConversion: number | null) => {
    const conv =
      lockedConversionRate != null && lockedConversionRate > 0
        ? lockedConversionRate
        : nextConversion;
    onChange({
      mode: 'flat',
      saleRate: nextSale ?? undefined,
      conversionRate: conv ?? undefined,
    });
  };

  if (convertedRateOnly) {
    return (
      <div className="max-w-[220px]">
        <label className={formLabel}>Rate ({currency})</label>
        <input
          type="text"
          inputMode="decimal"
          className={`${formInput} tabular-nums`}
          value={convertedText}
          placeholder="—"
          onChange={e => {
            const raw = e.target.value;
            if (raw !== '' && !/^-?\d*\.?\d*$/u.test(raw)) return;
            setConvertedText(raw);
            if (raw.trim() === '' || isIncompleteDecimalInput(raw)) {
              if (raw.trim() === '') commitFlat(null, conversion);
              return;
            }
            const nextConverted = parseRateFieldInput(raw);
            if (nextConverted == null) {
              commitFlat(null, conversion);
              return;
            }
            const conv =
              lockedConversionRate != null && lockedConversionRate > 0
                ? lockedConversionRate
                : conversion != null && conversion > 0
                  ? conversion
                  : 1;
            commitFlat(nextConverted / conv, conv);
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
          type="text"
          inputMode="decimal"
          className={`${formInput} tabular-nums`}
          value={saleText}
          placeholder="—"
          onChange={e => {
            const raw = e.target.value;
            if (raw !== '' && !/^-?\d*\.?\d*$/u.test(raw)) return;
            setSaleText(raw);
            if (raw.trim() === '' || isIncompleteDecimalInput(raw)) {
              if (raw.trim() === '') commitFlat(null, conversion);
              return;
            }
            // AED changed — keep this row's conversion; converted recalculates.
            commitFlat(parseRateFieldInput(raw), conversion);
          }}
        />
      </div>
      {lockedConversionRate == null ? (
        <div className="w-full max-w-[140px]">
          <label className={formLabel}>Conversion</label>
          <input
            type="text"
            inputMode="decimal"
            className={`${formInput} tabular-nums`}
            value={conversionText}
            placeholder="—"
            onChange={e => {
              const raw = e.target.value;
              if (raw !== '' && !/^-?\d*\.?\d*$/u.test(raw)) return;
              setConversionText(raw);
              if (raw.trim() === '' || isIncompleteDecimalInput(raw)) {
                if (raw.trim() === '') commitFlat(sale, null);
                return;
              }
              const nextConv = parseRateFieldInput(raw);
              if (nextConv == null || nextConv <= 0) {
                commitFlat(sale, null);
                return;
              }
              // AED fixed → converted = AED × conversion
              commitFlat(sale, nextConv);
            }}
          />
        </div>
      ) : null}
      <div className="w-full max-w-[140px]">
        <label className={formLabel}>Rate ({currency})</label>
        <input
          type="text"
          inputMode="decimal"
          className={`${formInput} tabular-nums`}
          value={convertedText}
          placeholder="—"
          onChange={e => {
            const raw = e.target.value;
            if (raw !== '' && !/^-?\d*\.?\d*$/u.test(raw)) return;
            setConvertedText(raw);
            if (raw.trim() === '' || isIncompleteDecimalInput(raw)) return;
            const nextConverted = parseRateFieldInput(raw);
            if (nextConverted == null || nextConverted <= 0) return;

            // AED fixed → conversion = converted ÷ AED
            if (sale != null && sale > 0) {
              commitFlat(sale, nextConverted / sale);
              return;
            }
            // No AED yet — derive AED if conversion exists.
            if (conversion != null && conversion > 0) {
              commitFlat(nextConverted / conversion, conversion);
            }
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
  lockedConversionRate,
  defaultExpanded = false,
  showExpandToggle = true,
  variant = 'default',
  idPrefix = 'pricing',
  onChange,
}: Props) {
  const isGuided = variant === 'guided';
  const [expanded, setExpanded] = useState(defaultExpanded || isGuided);
  const effectiveLockedConversion =
    lockedConversionRate != null && lockedConversionRate > 0
      ? lockedConversionRate
      : undefined;
  const baseFlat = useMemo(
    () => (group ? getFlatRateFromGroup(group) : { saleRate: 0, conversionRate: effectiveLockedConversion ?? 1 }),
    [group?.id, group?.saleRate, group?.conversionRate, effectiveLockedConversion],
  );
  const lastEmitKeyRef = useRef<string | null>(null);

  const {
    saleRate,
    conversionRate,
    convertedRate,
    saleRateNum,
    conversionRateNum,
    convertedRateNum,
    onSaleChange,
    onConversionChange,
    onConvertedChange,
    setConversionSilent,
    setSaleSilent,
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
  /** Admin-only seed value — prefills empty row conversions; does not lock or hide fields. */
  const [defaultConversionText, setDefaultConversionText] = useState(() =>
    baseFlat.conversionRate > 0 ? formatRateInputValue(baseFlat.conversionRate) : '',
  );

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
    setDefaultConversionText(
      groupFlat.conversionRate > 0 ? formatRateInputValue(groupFlat.conversionRate) : '',
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
    () =>
      serializePricingEditorValue({
        flat,
        convertedRate: convertedRateNum,
        pricingConfig,
      }),
    [flat.saleRate, flat.conversionRate, convertedRateNum, scope, kind, commonPricing, perTypePricing],
  );

  useEffect(() => {
    if (lastEmitKeyRef.current === emitKey) return;
    lastEmitKeyRef.current = emitKey;
    onChange({ flat, convertedRate: convertedRateNum, pricingConfig });
  }, [emitKey, flat, convertedRateNum, pricingConfig, onChange]);

  const handleScopeChange = (next: RatePricingScope) => {
    setScope(next);
    if (next === 'per_type') {
      setPerTypePricing(buildPerTypePricing(flatForNormalize(flat), kind, perTypePricing));
    }
  };

  const handleKindChange = (next: RatePricingKind) => {
    setKind(next);
    const normalizedFlat = flatForNormalize(flat);
    const seed = Number(defaultConversionText);
    const seedConv = Number.isFinite(seed) && seed > 0 ? seed : null;

    const withSeed = (pricing: ICRateTransactionPricing): ICRateTransactionPricing => {
      if (!seedConv) return pricing;
      if (pricing.mode === 'flat') {
        if (pricing.conversionRate && pricing.conversionRate > 0) return pricing;
        return { ...pricing, conversionRate: seedConv };
      }
      return {
        mode: 'slab',
        slabs: (pricing.slabs ?? []).map(tier => ({
          ...tier,
          conversionRate: tier.conversionRate > 0 ? tier.conversionRate : seedConv,
        })),
      };
    };

    if (next === 'slab') {
      const hasFlat = flat.saleRate != null && flat.conversionRate != null;
      setCommonPricing(
        withSeed(hasFlat ? createDefaultSlabPricing(normalizedFlat) : createEmptySlabPricing()),
      );
      setPerTypePricing(
        Object.fromEntries(
          Object.entries(buildPerTypePricing(normalizedFlat, 'slab', perTypePricing)).map(
            ([type, pricing]) => [type, withSeed(pricing)],
          ),
        ) as NonNullable<ICRateGroupPricingConfig['byTransactionType']>,
      );
    } else {
      setCommonPricing(withSeed(autofillTransactionPricing(normalizedFlat, null)));
      setPerTypePricing(
        Object.fromEntries(
          Object.entries(buildPerTypePricing(normalizedFlat, 'flat', perTypePricing)).map(
            ([type, pricing]) => [type, withSeed(pricing)],
          ),
        ) as NonNullable<ICRateGroupPricingConfig['byTransactionType']>,
      );
    }
  };

  const handleConvertedInput = (value: string) => {
    // Branch: conversion locked → derive AED from local rate.
    if (convertedRateOnly) {
      onConvertedChange(value);
      if (value.trim() === '' || /^-?\d+\.$/u.test(value.trim())) {
        if (value.trim() === '') setSaleSilent('');
        return;
      }

      const converted = Number(value);
      if (!Number.isFinite(converted) || converted <= 0) return;

      const conv =
        effectiveLockedConversion ??
        (conversionRateNum != null && conversionRateNum > 0
          ? conversionRateNum
          : baseFlat.conversionRate > 0
            ? baseFlat.conversionRate
            : 1);

      if (!conversionRate) {
        setConversionSilent(formatRateInputValue(conv));
      }
      setSaleSilent(formatRateInputValue(converted / conv));
      return;
    }

    // Admin: AED fixed → conversion ↔ converted.
    onConvertedChange(value);
  };

  /** Prefill empty conversions only — never hide or overwrite filled row values. */
  const prefillConversion = (next: number) => {
    if (!Number.isFinite(next) || next <= 0) return;

    // Seed base conversion if empty.
    if (conversionRateNum == null || conversionRateNum <= 0) {
      setConversionSilent(formatRateInputValue(next));
      if (saleRateNum != null && saleRateNum > 0) {
        onConvertedChange(formatRateInputValue(saleRateNum * next));
      }
    }

    const stampEmpty = (pricing: ICRateTransactionPricing): ICRateTransactionPricing => {
      if (pricing.mode === 'flat') {
        if (pricing.conversionRate && pricing.conversionRate > 0) return pricing;
        return { ...pricing, conversionRate: next };
      }
      return {
        mode: 'slab',
        slabs: (pricing.slabs ?? []).map(tier => ({
          ...tier,
          conversionRate: tier.conversionRate > 0 ? tier.conversionRate : next,
        })),
      };
    };

    if (scope === 'all_types' && kind === 'slab') {
      setCommonPricing(prev => stampEmpty(prev));
    }
    if (scope === 'per_type') {
      setPerTypePricing(prev => {
        const nextMap = { ...prev };
        for (const type of Object.keys(nextMap) as ICSaleTransactionType[]) {
          if (nextMap[type]) nextMap[type] = stampEmpty(nextMap[type]!);
        }
        return nextMap;
      });
    }
  };

  const handleDefaultConversionChange = (raw: string) => {
    if (raw !== '' && !/^-?\d*\.?\d*$/u.test(raw)) return;
    setDefaultConversionText(raw);
    if (raw.trim() === '' || /^-?\d+\.$/u.test(raw.trim())) return;
    const next = Number(raw);
    if (!Number.isFinite(next) || next <= 0) return;
    prefillConversion(next);
  };

  // Seed / rebase locked conversion for branch bulk / converted-only flows.
  const prevLockedConversionRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!effectiveLockedConversion) {
      prevLockedConversionRef.current = undefined;
      return;
    }

    const prev = prevLockedConversionRef.current;
    prevLockedConversionRef.current = effectiveLockedConversion;

    if (prev == null) {
      if (!conversionRate) {
        setConversionSilent(formatRateInputValue(effectiveLockedConversion));
      }
      return;
    }

    if (prev === effectiveLockedConversion) return;

    // Keep local (sale × conversion) amounts stable when the lock changes.
    const remapped = remapPricingConfigToConversion(
      {
        scope,
        kind,
        ...(scope === 'all_types' && kind === 'slab' ? { common: commonPricing } : {}),
        ...(scope === 'per_type' ? { byTransactionType: perTypePricing } : {}),
      },
      effectiveLockedConversion,
    );
    if (remapped?.common) setCommonPricing(remapped.common);
    if (remapped?.byTransactionType) setPerTypePricing(remapped.byTransactionType);

    if (saleRateNum != null && saleRateNum > 0) {
      const priorConv = conversionRateNum != null && conversionRateNum > 0 ? conversionRateNum : prev;
      const local = saleRateNum * priorConv;
      setConversionSilent(formatRateInputValue(effectiveLockedConversion));
      setSaleSilent(formatRateInputValue(local / effectiveLockedConversion));
      onConvertedChange(formatRateInputValue(local));
    } else {
      setConversionSilent(formatRateInputValue(effectiveLockedConversion));
    }
  }, [effectiveLockedConversion]);

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
    // When entering flat_per with a filled base rate, seed every type from it.
    if (mode.key === 'flat_per' && flat.saleRate != null && flat.saleRate > 0) {
      setPerTypePricing(buildPerTypePricing(flatForNormalize(flat), 'flat', undefined));
    }
    setExpanded(true);
  };

  const activeModeKey = modeKeyFromState(scope, kind);
  // One rate surface per mode: flat_per uses per-type fields only (no duplicate base row).
  const showBaseRateFields =
    activeModeKey === 'flat_all' ||
    activeModeKey === 'slab_all' ||
    activeModeKey === 'slab_per';
  const showAdvancedPanel = isGuided
    ? activeModeKey !== 'flat_all'
    : expanded;

  const baseRateFields = (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      {!convertedRateOnly ? (
        <>
          <div className="w-full max-w-[140px]">
            <label className={formLabel} htmlFor={`${idPrefix}-sale`}>
              Rate in AED
            </label>
            <input
              id={`${idPrefix}-sale`}
              type="text"
              inputMode="decimal"
              className={`${formInput} tabular-nums`}
              value={saleRate}
              onChange={e => {
                const raw = e.target.value;
                if (raw !== '' && !/^-?\d*\.?\d*$/u.test(raw)) return;
                onSaleChange(raw);
              }}
              placeholder="—"
            />
          </div>
          <div className="w-full max-w-[140px]">
            <label className={formLabel} htmlFor={`${idPrefix}-conv`}>
              Conversion
            </label>
            <input
              id={`${idPrefix}-conv`}
              type="text"
              inputMode="decimal"
              className={`${formInput} tabular-nums`}
              value={conversionRate}
              onChange={e => {
                const raw = e.target.value;
                if (raw !== '' && !/^-?\d*\.?\d*$/u.test(raw)) return;
                onConversionChange(raw);
              }}
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
          type="text"
          inputMode="decimal"
          className={`${formInput} tabular-nums`}
          value={convertedRate}
          onChange={e => {
            const raw = e.target.value;
            if (raw !== '' && !/^-?\d*\.?\d*$/u.test(raw)) return;
            handleConvertedInput(raw);
          }}
          placeholder="—"
        />
      </div>
    </div>
  );

  const defaultConversionField =
    !convertedRateOnly ? (
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Default conversion
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Prefills empty conversion fields only. Each row keeps its own conversion ↔ converted link (AED fixed).
            </p>
          </div>
          <div className="w-full max-w-[180px] shrink-0">
            <label className={formLabel} htmlFor={`${idPrefix}-default-conv`}>
              Conversion rate
            </label>
            <input
              id={`${idPrefix}-default-conv`}
              type="text"
              inputMode="decimal"
              className={`${formInput} tabular-nums`}
              value={defaultConversionText}
              onChange={e => handleDefaultConversionChange(e.target.value)}
              placeholder="—"
            />
          </div>
        </div>
      </div>
    ) : null;

  const typeTabs = (
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
  );

  return (
    <div className="space-y-4">
      {defaultConversionField}

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
                      {active ? <span className="size-1.5 rounded-full bg-white" /> : null}
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
      ) : null}

      {/* Base rate — only when this mode uses it as the primary or seed input */}
      {showBaseRateFields ? (
        <div className="space-y-2">
          {isGuided && (activeModeKey === 'slab_all' || activeModeKey === 'slab_per') ? (
            <p className="text-xs text-slate-500">
              Optional default rate — empty slab cells inherit this when you save.
            </p>
          ) : null}
          {baseRateFields}
        </div>
      ) : null}

      {!isGuided && showExpandToggle ? (
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
                <RateSlabTable
                  slabs={slabsToEditable(
                    commonPricing.slabs ??
                      (flat.saleRate != null
                        ? createDefaultSlabPricing(flatForNormalize(flat)).slabs!
                        : createEmptySlabPricing().slabs!),
                  )}
                  currency={currency}
                  convertedRateOnly={convertedRateOnly}
                  lockedConversionRate={effectiveLockedConversion}
                  onChange={slabs =>
                    setCommonPricing({ mode: 'slab', slabs: slabsFromEditable(slabs) })
                  }
                />
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {isGuided && kind === 'flat' ? (
                <p className="text-xs text-slate-500">
                  Set a rate for each transaction type. Switch tabs below.
                </p>
              ) : null}
              {typeTabs}

              {kind === 'flat' ? (
                <FlatRateFields
                  pricing={activeTypePricing}
                  currency={currency}
                  convertedRateOnly={convertedRateOnly}
                  lockedConversionRate={effectiveLockedConversion}
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
                  lockedConversionRate={effectiveLockedConversion}
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
  const convertedRate =
    flat.saleRate != null && flat.conversionRate != null
      ? getCurrencyUnitRate(flat.saleRate, flat.conversionRate)
      : null;
  return {
    flat,
    convertedRate,
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
    convertedRate: value.convertedRate ?? null,
    pricingConfig: value.pricingConfig,
  });
}

export function arePricingEditorValuesEqual(
  a: RatePricingEditorValue,
  b: RatePricingEditorValue,
): boolean {
  return serializePricingEditorValue(a) === serializePricingEditorValue(b);
}
