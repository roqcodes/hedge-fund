import type { ICSaleTransactionType } from './transactionTypes';
import {
  IC_SALE_TRANSACTION_TYPES,
  IC_SALE_TRANSACTION_TYPE_OPTIONS,
} from './transactionTypes';
import type { ICRateGroup, ICRateGroupPricingConfig, ICRateSlabTier, ICRateTransactionPricing } from '@/types';
import { coerceFlatRate, nextUnitTierMin, type NullableFlatRate } from './rateFieldInput';

function transactionTypeLabel(type: ICSaleTransactionType | string): string {
  return IC_SALE_TRANSACTION_TYPE_OPTIONS.find(opt => opt.value === type)?.label ?? String(type);
}

export type { NullableFlatRate };

export type RatePricingScope = 'all_types' | 'per_type';
export type RatePricingKind = 'flat' | 'slab';

export type FlatRateValues = {
  saleRate: number;
  conversionRate: number;
};

export function getFlatRateFromGroup(group: Pick<ICRateGroup, 'saleRate' | 'conversionRate'>): FlatRateValues {
  return {
    saleRate: group.saleRate,
    conversionRate: group.conversionRate ?? 1,
  };
}

export function createFlatPricing(flat: FlatRateValues): ICRateTransactionPricing {
  return {
    mode: 'flat',
    saleRate: flat.saleRate,
    conversionRate: flat.conversionRate,
  };
}

export function createDefaultSlabPricing(flat: FlatRateValues): ICRateTransactionPricing {
  return {
    mode: 'slab',
    slabs: [
      {
        minUnits: 0,
        maxUnits: null,
        saleRate: flat.saleRate > 0 ? flat.saleRate : 0,
        conversionRate: flat.conversionRate > 0 ? flat.conversionRate : 0,
      },
    ],
  };
}

/** Empty slab row for new volume tiers — rates filled on save or via autofill. */
export function createEmptySlabPricing(): ICRateTransactionPricing {
  return {
    mode: 'slab',
    slabs: [{ minUnits: 0, maxUnits: null, saleRate: 0, conversionRate: 0 }],
  };
}

export function flatForNormalize(flat: NullableFlatRate): FlatRateValues {
  return {
    saleRate: flat.saleRate ?? 0,
    conversionRate: flat.conversionRate ?? 1,
  };
}

export function resolveEditorSeedFlat(
  flat: NullableFlatRate,
  options?: { lockedConversionRate?: number; convertedRate?: number | null },
): FlatRateValues {
  const locked =
    options?.lockedConversionRate != null && options.lockedConversionRate > 0
      ? options.lockedConversionRate
      : null;
  const coerced = coerceFlatRate(flat);
  if (coerced) return coerced;

  const conv =
    locked ??
    (flat.conversionRate != null && flat.conversionRate > 0 ? flat.conversionRate : 1);

  if (options?.convertedRate != null && options.convertedRate > 0 && conv > 0) {
    return { saleRate: options.convertedRate / conv, conversionRate: conv };
  }

  return {
    saleRate: flat.saleRate ?? 0,
    conversionRate: conv,
  };
}

export function isTransactionPricingConfigured(
  pricing: ICRateTransactionPricing | null | undefined,
): boolean {
  if (!pricing) return false;
  if (pricing.mode === 'flat') {
    return (
      pricing.saleRate != null &&
      pricing.saleRate > 0 &&
      pricing.conversionRate != null &&
      pricing.conversionRate > 0
    );
  }
  if (!pricing.slabs?.length) return false;
  return pricing.slabs.some(tier => tier.saleRate > 0 && tier.conversionRate > 0);
}

export function validatePartialPerTypePricing(
  byTransactionType: Partial<NonNullable<ICRateGroupPricingConfig['byTransactionType']>>,
): string | null {
  const unconfigured = IC_SALE_TRANSACTION_TYPES.filter(
    type => !isTransactionPricingConfigured(byTransactionType[type]),
  );
  if (unconfigured.length > 0) {
    const labels = unconfigured.map(type => transactionTypeLabel(type)).join(', ');
    return `Still need rates for: ${labels}.`;
  }

  for (const type of IC_SALE_TRANSACTION_TYPES) {
    const pricing = byTransactionType[type];
    if (!pricing) continue;
    const err = validateTransactionPricing(pricing, transactionTypeLabel(type));
    if (err) return err;
  }

  return null;
}

export function validatePricingEditorForSave(
  flat: NullableFlatRate,
  config: ICRateGroupPricingConfig,
  options?: { lockedConversionRate?: number; convertedRate?: number | null },
): string | null {
  const scope = config.scope ?? 'all_types';
  const kind = config.kind ?? 'flat';
  const seed = resolveEditorSeedFlat(flat, options);

  // Simple flat: only the base rate matters.
  if (scope === 'all_types' && kind === 'flat') {
    if (seed.saleRate <= 0 || seed.conversionRate <= 0) {
      return 'Enter a valid rate before saving.';
    }
    return null;
  }

  if (config.scope === 'per_type' && config.byTransactionType) {
    return validatePartialPerTypePricing(config.byTransactionType);
  }

  const locked =
    options?.lockedConversionRate != null && options.lockedConversionRate > 0
      ? options.lockedConversionRate
      : null;
  const conversionForSave = locked ?? (seed.conversionRate > 0 ? seed.conversionRate : 1);
  const prepared = ensurePricingConversions(
    normalizePricingConfig(config, seed),
    conversionForSave,
  );
  return validatePricingConfig(prepared, seed);
}

/**
 * Stamp a conversion onto every flat/slab rate that is missing one.
 * Branch portal often edits local currency only; conversion must still be persisted.
 */
export function ensurePricingConversions(
  config: ICRateGroupPricingConfig,
  conversionRate: number,
): ICRateGroupPricingConfig {
  if (!Number.isFinite(conversionRate) || conversionRate <= 0) return config;

  const stamp = (pricing: ICRateTransactionPricing): ICRateTransactionPricing => {
    if (pricing.mode === 'flat') {
      return {
        mode: 'flat',
        saleRate: pricing.saleRate,
        conversionRate:
          pricing.conversionRate && pricing.conversionRate > 0
            ? pricing.conversionRate
            : conversionRate,
      };
    }
    return {
      mode: 'slab',
      slabs: (pricing.slabs ?? []).map(tier => ({
        ...tier,
        minUnits: Number(tier.minUnits),
        maxUnits: tier.maxUnits == null ? null : Number(tier.maxUnits),
        saleRate: Number(tier.saleRate),
        conversionRate:
          tier.conversionRate && tier.conversionRate > 0
            ? Number(tier.conversionRate)
            : conversionRate,
      })),
    };
  };

  if (config.scope === 'all_types' && config.kind === 'slab' && config.common) {
    return { ...config, common: stamp(config.common) };
  }

  if (config.scope === 'per_type' && config.byTransactionType) {
    const byTransactionType: NonNullable<ICRateGroupPricingConfig['byTransactionType']> = {};
    for (const type of IC_SALE_TRANSACTION_TYPES) {
      const pricing = config.byTransactionType[type];
      if (pricing) byTransactionType[type] = stamp(pricing);
    }
    return { ...config, byTransactionType };
  }

  return config;
}

/**
 * Resolve a top-level AED + conversion to persist alongside advanced pricing.
 * Prefers the editor base flat; otherwise seeds from the first valid type/tier.
 */
export function seedFlatRateForSave(
  flat: NullableFlatRate,
  config: ICRateGroupPricingConfig,
  options?: {
    lockedConversionRate?: number;
    convertedRate?: number | null;
  },
): FlatRateValues | null {
  const coerced = coerceFlatRate(flat);
  if (coerced) return coerced;

  if (!hasAdvancedPricing(config)) return null;

  const locked =
    options?.lockedConversionRate != null && options.lockedConversionRate > 0
      ? options.lockedConversionRate
      : null;

  const fromPricing = (pricing: ICRateTransactionPricing | null | undefined): FlatRateValues | null => {
    if (!pricing) return null;
    if (pricing.mode === 'flat') {
      if (!pricing.saleRate || pricing.saleRate <= 0) return null;
      const conv =
        pricing.conversionRate && pricing.conversionRate > 0
          ? pricing.conversionRate
          : locked;
      if (!conv || conv <= 0) return null;
      return { saleRate: pricing.saleRate, conversionRate: conv };
    }
    const tier = (pricing.slabs ?? []).find(t => t.saleRate > 0);
    if (!tier) return null;
    const conv =
      tier.conversionRate > 0 ? tier.conversionRate : locked;
    if (!conv || conv <= 0) return null;
    return { saleRate: tier.saleRate, conversionRate: conv };
  };

  if (config.byTransactionType) {
    for (const type of IC_SALE_TRANSACTION_TYPES) {
      const seeded = fromPricing(config.byTransactionType[type]);
      if (seeded) return seeded;
    }
  }

  const commonSeeded = fromPricing(config.common);
  if (commonSeeded) return commonSeeded;

  if (options?.convertedRate != null && options.convertedRate > 0) {
    const conv = locked ?? 1;
    return { saleRate: options.convertedRate / conv, conversionRate: conv };
  }

  return null;
}

/**
 * Rebase every rate in a pricing config onto a target conversion (branch portal).
 * Intended local rate is always sale × conversion from the editor, then
 * stored as AED = local / targetConversion with conversion = targetConversion.
 */
export function remapPricingConfigToConversion(
  config: ICRateGroupPricingConfig | null | undefined,
  targetConversion: number,
): ICRateGroupPricingConfig | null {
  if (!config || !hasAdvancedPricing(config)) return config ?? null;
  if (!Number.isFinite(targetConversion) || targetConversion <= 0) return config;

  const remapPair = (saleRate: number, conversionRate: number) => {
    const local = saleRate * (conversionRate > 0 ? conversionRate : 1);
    return {
      saleRate: local / targetConversion,
      conversionRate: targetConversion,
    };
  };

  const remapPricing = (pricing: ICRateTransactionPricing): ICRateTransactionPricing => {
    if (pricing.mode === 'flat') {
      const sale = pricing.saleRate ?? 0;
      const conv = pricing.conversionRate ?? 1;
      if (sale <= 0) return pricing;
      const next = remapPair(sale, conv);
      return { mode: 'flat', saleRate: next.saleRate, conversionRate: next.conversionRate };
    }
    return {
      mode: 'slab',
      slabs: (pricing.slabs ?? []).map(tier => {
        if (tier.saleRate <= 0) return { ...tier, conversionRate: targetConversion };
        const next = remapPair(tier.saleRate, tier.conversionRate);
        return { ...tier, saleRate: next.saleRate, conversionRate: next.conversionRate };
      }),
    };
  };

  if (config.scope === 'all_types' && config.kind === 'slab' && config.common) {
    return {
      scope: 'all_types',
      kind: 'slab',
      common: remapPricing(config.common),
    };
  }

  if (config.scope === 'per_type' && config.byTransactionType) {
    const byTransactionType: NonNullable<ICRateGroupPricingConfig['byTransactionType']> = {};
    for (const type of IC_SALE_TRANSACTION_TYPES) {
      const pricing = config.byTransactionType[type];
      if (pricing) byTransactionType[type] = remapPricing(pricing);
    }
    return { scope: 'per_type', kind: config.kind, byTransactionType };
  }

  return config;
}

export function getTransactionTypePricingMode(
  pricing: ICRateTransactionPricing | null | undefined,
): RatePricingKind | null {
  if (!pricing?.mode) return null;
  return pricing.mode;
}

export function typesAssignableToTab(
  perType: Partial<NonNullable<ICRateGroupPricingConfig['byTransactionType']>>,
  tab: RatePricingKind,
): ICSaleTransactionType[] {
  return IC_SALE_TRANSACTION_TYPES.filter(type => {
    const mode = getTransactionTypePricingMode(perType[type]);
    return mode == null || mode === tab;
  });
}

export function inferRateTabFromConfig(config?: ICRateGroupPricingConfig | null): 'flat' | 'slab' {
  if (!config) return 'flat';
  if (config.scope === 'all_types') return config.kind === 'slab' ? 'slab' : 'flat';
  const modes = IC_SALE_TRANSACTION_TYPES.map(type => config.byTransactionType?.[type]?.mode);
  if (modes.length > 0 && modes.every(mode => mode === 'slab')) return 'slab';
  return 'flat';
}

/** Load stored per-type pricing for the editor — preserves mixed flat/slab, no autofill of missing types. */
export function loadPerTypePricingFromGroup(
  config: ICRateGroupPricingConfig | null | undefined,
  flat: FlatRateValues,
): Partial<NonNullable<ICRateGroupPricingConfig['byTransactionType']>> {
  if (!config) {
    if (flat.saleRate <= 0) return {};
    const shared = createFlatPricing(flat);
    return Object.fromEntries(
      IC_SALE_TRANSACTION_TYPES.map(type => [type, { ...shared }]),
    ) as NonNullable<ICRateGroupPricingConfig['byTransactionType']>;
  }

  if (config.scope === 'per_type' && config.byTransactionType) {
    const result: Partial<NonNullable<ICRateGroupPricingConfig['byTransactionType']>> = {};
    for (const type of IC_SALE_TRANSACTION_TYPES) {
      const stored = config.byTransactionType[type];
      if (stored) {
        result[type] = autofillTransactionPricing(flat, stored);
      }
    }
    return result;
  }

  if (config.scope === 'all_types' && config.kind === 'slab' && config.common) {
    const shared = autofillTransactionPricing(flat, config.common);
    return Object.fromEntries(
      IC_SALE_TRANSACTION_TYPES.map(type => [
        type,
        JSON.parse(JSON.stringify(shared)) as ICRateTransactionPricing,
      ]),
    ) as NonNullable<ICRateGroupPricingConfig['byTransactionType']>;
  }

  if (flat.saleRate <= 0) return {};
  const shared = createFlatPricing(flat);
  return Object.fromEntries(
    IC_SALE_TRANSACTION_TYPES.map(type => [type, { ...shared }]),
  ) as NonNullable<ICRateGroupPricingConfig['byTransactionType']>;
}

export function inferInitialSelectedTypes(
  perTypePricing: Partial<NonNullable<ICRateGroupPricingConfig['byTransactionType']>>,
  tab: RatePricingKind,
): ICSaleTransactionType[] {
  return IC_SALE_TRANSACTION_TYPES.filter(
    type => getTransactionTypePricingMode(perTypePricing[type]) === tab,
  );
}

export function hasMixedPerTypePricing(config?: ICRateGroupPricingConfig | null): boolean {
  if (config?.scope !== 'per_type' || !config.byTransactionType) return false;
  const modes = IC_SALE_TRANSACTION_TYPES.map(type => config.byTransactionType?.[type]?.mode);
  return modes.some(mode => mode === 'flat') && modes.some(mode => mode === 'slab');
}

export type PricingEditorHydration = {
  perTypePricing: Partial<NonNullable<ICRateGroupPricingConfig['byTransactionType']>>;
  rateTab: RatePricingKind;
  selectedTypes: ICSaleTransactionType[];
  pricingConfig: ICRateGroupPricingConfig;
};

/** Single source of truth for loading group data into the pricing editor. */
export function hydratePricingEditorFromGroup(
  group: Pick<ICRateGroup, 'saleRate' | 'conversionRate' | 'pricingConfig'> | undefined,
): PricingEditorHydration {
  const groupFlat = group ? getFlatRateFromGroup(group) : { saleRate: 0, conversionRate: 1 };
  const flat = flatForNormalize({
    saleRate: groupFlat.saleRate > 0 ? groupFlat.saleRate : null,
    conversionRate: groupFlat.conversionRate > 0 ? groupFlat.conversionRate : null,
  });
  const perTypePricing = loadPerTypePricingFromGroup(group?.pricingConfig, flat);
  const rateTab = inferRateTabFromConfig(group?.pricingConfig);
  const selectedTypes = inferInitialSelectedTypes(perTypePricing, rateTab);
  const pricingConfig =
    group?.pricingConfig && hasAdvancedPricing(group.pricingConfig)
      ? finalizePerTypePricingConfig(perTypePricing, flat, { fillMissing: false })
      : normalizePricingConfig(createDefaultPricingConfig(), flat);

  return { perTypePricing, rateTab, selectedTypes, pricingConfig };
}

export function expandPricingConfigToPerType(
  config: ICRateGroupPricingConfig | null | undefined,
  flat: FlatRateValues,
): NonNullable<ICRateGroupPricingConfig['byTransactionType']> {
  return loadPerTypePricingFromGroup(config, flat) as NonNullable<
    ICRateGroupPricingConfig['byTransactionType']
  >;
}

export function finalizePerTypePricingConfig(
  byTransactionType: Partial<NonNullable<ICRateGroupPricingConfig['byTransactionType']>>,
  flat: FlatRateValues,
  options?: { fillMissing?: boolean },
): ICRateGroupPricingConfig {
  const complete = { ...byTransactionType } as NonNullable<
    ICRateGroupPricingConfig['byTransactionType']
  >;

  if (options?.fillMissing !== false) {
    for (const type of IC_SALE_TRANSACTION_TYPES) {
      if (!complete[type]) {
        complete[type] = createFlatPricing(flat);
      }
    }
  }

  return {
    scope: 'per_type',
    kind: inferPerTypeConfigKind(complete),
    byTransactionType: complete,
  };
}

export function serializeTransactionPricing(pricing: ICRateTransactionPricing): string {
  return JSON.stringify(pricing);
}

export function transactionPricingMatches(
  a: ICRateTransactionPricing,
  b: ICRateTransactionPricing,
): boolean {
  return serializeTransactionPricing(a) === serializeTransactionPricing(b);
}

/** Empty advanced config — group uses top-level flat rate for all types. */
export function createDefaultPricingConfig(): ICRateGroupPricingConfig {
  return {
    scope: 'all_types',
    kind: 'flat',
  };
}

export function hasAdvancedPricing(config?: ICRateGroupPricingConfig | null): boolean {
  if (!config) return false;
  if (config.scope === 'per_type') return true;
  return config.kind === 'slab';
}

export function getPricingScope(config?: ICRateGroupPricingConfig | null): RatePricingScope {
  return config?.scope ?? 'all_types';
}

export function getPricingKind(config?: ICRateGroupPricingConfig | null): RatePricingKind {
  return config?.kind ?? 'flat';
}

export function autofillTransactionPricing(
  flat: FlatRateValues,
  existing?: ICRateTransactionPricing | null,
): ICRateTransactionPricing {
  if (!existing) {
    return createFlatPricing(flat);
  }

  if (existing.mode === 'flat') {
    return {
      mode: 'flat',
      saleRate: existing.saleRate ?? flat.saleRate,
      conversionRate: existing.conversionRate ?? flat.conversionRate,
    };
  }

  const slabs =
    existing.slabs && existing.slabs.length > 0
      ? existing.slabs.map(tier => ({
          minUnits: tier.minUnits,
          maxUnits: tier.maxUnits,
          saleRate: tier.saleRate > 0 ? tier.saleRate : flat.saleRate,
          conversionRate: tier.conversionRate > 0 ? tier.conversionRate : flat.conversionRate,
        }))
      : createDefaultSlabPricing(flat).slabs!;

  return { mode: 'slab', slabs };
}

export function buildPerTypePricing(
  flat: FlatRateValues,
  _kind: RatePricingKind,
  existing?: ICRateGroupPricingConfig['byTransactionType'],
): NonNullable<ICRateGroupPricingConfig['byTransactionType']> {
  const result: NonNullable<ICRateGroupPricingConfig['byTransactionType']> = {};
  for (const type of IC_SALE_TRANSACTION_TYPES) {
    result[type] = autofillTransactionPricing(flat, existing?.[type] ?? null);
  }
  return result;
}

function inferPerTypeConfigKind(
  byTransactionType: NonNullable<ICRateGroupPricingConfig['byTransactionType']>,
): RatePricingKind {
  const modes = IC_SALE_TRANSACTION_TYPES.map(type => byTransactionType[type]?.mode);
  if (modes.length > 0 && modes.every(mode => mode === 'slab')) return 'slab';
  return 'flat';
}

export function normalizePricingConfig(
  config: ICRateGroupPricingConfig | null | undefined,
  flat: FlatRateValues,
): ICRateGroupPricingConfig {
  const scope = config?.scope ?? 'all_types';
  const kind = config?.kind ?? 'flat';

  if (scope === 'all_types' && kind === 'flat') {
    return { scope: 'all_types', kind: 'flat' };
  }

  if (scope === 'all_types' && kind === 'slab') {
    return {
      scope: 'all_types',
      kind: 'slab',
      common: autofillTransactionPricing(flat, config?.common),
    };
  }

  const byTransactionType = buildPerTypePricing(flat, kind, config?.byTransactionType);
  return {
    scope: 'per_type',
    kind: inferPerTypeConfigKind(byTransactionType),
    byTransactionType,
  };
}

export function validateSlabTiers(slabs: ICRateSlabTier[]): string | null {
  if (slabs.length === 0) return 'Add at least one volume tier.';

  const sorted = [...slabs]
    .map(tier => ({
      ...tier,
      minUnits: Number(tier.minUnits),
      maxUnits: tier.maxUnits == null ? null : Number(tier.maxUnits),
      saleRate: Number(tier.saleRate),
      conversionRate: Number(tier.conversionRate),
    }))
    .sort((a, b) => a.minUnits - b.minUnits);

  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i];
    if (!Number.isFinite(tier.minUnits) || tier.minUnits < 0) {
      return `Tier ${i + 1}: minimum units must be 0 or greater.`;
    }
    if (tier.maxUnits != null && (!Number.isFinite(tier.maxUnits) || tier.maxUnits < tier.minUnits)) {
      return `Tier ${i + 1}: maximum units must be greater than or equal to minimum.`;
    }
    if (!Number.isFinite(tier.saleRate) || tier.saleRate <= 0) {
      return `Tier ${i + 1}: enter a rate greater than zero.`;
    }
    if (!Number.isFinite(tier.conversionRate) || tier.conversionRate <= 0) {
      return `Tier ${i + 1}: conversion must be greater than zero.`;
    }
    if (i > 0) {
      const prev = sorted[i - 1];
      if (prev.maxUnits == null) {
        return `Tier ${i}: only the last tier can be open-ended.`;
      }
      // Inclusive ranges: 0–24 then 25+, or 0–1.999 then 2+ (1 unit = 1000 INR).
      const expectedFrom = nextUnitTierMin(prev.maxUnits);
      if (tier.minUnits <= prev.maxUnits) {
        return `Volume tiers cannot overlap. Tier ${i + 1} From must be ${expectedFrom} (previous To + step), not ${tier.minUnits}.`;
      }
      if (tier.minUnits > expectedFrom) {
        return `Volume tiers cannot have gaps. Tier ${i + 1} From must be ${expectedFrom} (previous To + step).`;
      }
    }
  }

  const last = sorted[sorted.length - 1];
  if (last.maxUnits != null) {
    return 'The last tier should be open-ended (leave max units empty) to cover all volumes.';
  }

  if (sorted[0].minUnits !== 0) {
    return 'The first tier must start at 0 units.';
  }

  return null;
}

export function validateTransactionPricing(
  pricing: ICRateTransactionPricing,
  label: string,
): string | null {
  if (pricing.mode === 'flat') {
    if (!pricing.saleRate || pricing.saleRate <= 0) {
      return `${label}: rate must be greater than zero.`;
    }
    if (!pricing.conversionRate || pricing.conversionRate <= 0) {
      return `${label}: conversion must be greater than zero.`;
    }
    return null;
  }

  if (!pricing.slabs?.length) {
    return `${label}: add at least one volume tier.`;
  }
  return validateSlabTiers(pricing.slabs);
}

export function validatePricingConfig(
  config: ICRateGroupPricingConfig,
  flat: FlatRateValues,
): string | null {
  const normalized = normalizePricingConfig(config, flat);

  if (normalized.scope === 'all_types' && normalized.kind === 'flat') {
    if (flat.saleRate <= 0) return 'Flat rate must be greater than zero.';
    if (flat.conversionRate <= 0) return 'Conversion must be greater than zero.';
    return null;
  }

  if (normalized.scope === 'all_types' && normalized.kind === 'slab' && normalized.common) {
    return validateTransactionPricing(normalized.common, 'All transaction types');
  }

  if (normalized.scope === 'per_type' && normalized.byTransactionType) {
    for (const type of IC_SALE_TRANSACTION_TYPES) {
      const pricing = normalized.byTransactionType[type];
      const label = transactionTypeLabel(type);
      if (!pricing) {
        return `${label}: rate is required.`;
      }
      const err = validateTransactionPricing(pricing, label);
      if (err) return err;
    }
  }

  return null;
}

function resolveFromSlabs(slabs: ICRateSlabTier[], units: number): FlatRateValues | null {
  const sorted = [...slabs].sort((a, b) => a.minUnits - b.minUnits);
  for (const tier of sorted) {
    const inMin = units >= tier.minUnits;
    // Inclusive To: 0–100 covers unit 100; next tier starts at 101.
    const inMax = tier.maxUnits == null || units <= tier.maxUnits;
    if (inMin && inMax) {
      return { saleRate: tier.saleRate, conversionRate: tier.conversionRate };
    }
  }
  const last = sorted[sorted.length - 1];
  if (last) {
    return { saleRate: last.saleRate, conversionRate: last.conversionRate };
  }
  return null;
}

function resolveFromTransactionPricing(
  pricing: ICRateTransactionPricing,
  units: number,
  fallback: FlatRateValues,
): FlatRateValues {
  if (pricing.mode === 'flat') {
    return {
      saleRate: pricing.saleRate ?? fallback.saleRate,
      conversionRate: pricing.conversionRate ?? fallback.conversionRate,
    };
  }
  if (pricing.slabs?.length) {
    const resolved = resolveFromSlabs(pricing.slabs, units);
    if (resolved) return resolved;
  }
  return fallback;
}

/** Resolve AED + conversion for an order from group pricing, transaction type, and units. */
export function resolveGroupOrderRate(
  group: Pick<ICRateGroup, 'saleRate' | 'conversionRate' | 'pricingConfig'>,
  transactionType: ICSaleTransactionType | string | null | undefined,
  units: number,
): FlatRateValues {
  const fallback = getFlatRateFromGroup(group);
  const type = (transactionType || 'transfer') as ICSaleTransactionType;
  const config = group.pricingConfig
    ? normalizePricingConfig(group.pricingConfig, fallback)
    : null;

  if (!config || (config.scope === 'all_types' && config.kind === 'flat')) {
    return fallback;
  }

  if (config.scope === 'all_types' && config.kind === 'slab' && config.common) {
    return resolveFromTransactionPricing(config.common, units, fallback);
  }

  if (config.scope === 'per_type' && config.byTransactionType) {
    const typePricing = config.byTransactionType[type];
    if (typePricing) {
      return resolveFromTransactionPricing(typePricing, units, fallback);
    }
  }

  return fallback;
}

export function getPricingSummaryLabel(config?: ICRateGroupPricingConfig | null): string {
  if (!hasAdvancedPricing(config)) return 'Flat (all types)';
  const scope = getPricingScope(config);
  if (scope === 'all_types' && config?.kind === 'slab') return 'Slabs (all types)';
  if (scope === 'per_type' && config?.byTransactionType) {
    const modes = IC_SALE_TRANSACTION_TYPES.map(type => config.byTransactionType?.[type]?.mode);
    const hasFlat = modes.some(mode => mode === 'flat');
    const hasSlab = modes.some(mode => mode === 'slab');
    if (hasFlat && hasSlab) return 'Mixed (flat + slab)';
    if (hasSlab) return 'Slabs per type';
    return 'Flat per type';
  }
  return 'Slabs per type';
}
