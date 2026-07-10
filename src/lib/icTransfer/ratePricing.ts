import type { ICSaleTransactionType } from './transactionTypes';
import { IC_SALE_TRANSACTION_TYPES } from './transactionTypes';
import type { ICRateGroup, ICRateGroupPricingConfig, ICRateSlabTier, ICRateTransactionPricing } from '@/types';
import { coerceFlatRate, type NullableFlatRate } from './rateFieldInput';

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

export function validatePricingEditorForSave(
  flat: NullableFlatRate,
  config: ICRateGroupPricingConfig,
): string | null {
  const coerced = coerceFlatRate(flat);
  if (!coerced) {
    return 'Enter a valid rate and conversion before saving.';
  }
  return validatePricingConfig(config, coerced);
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
  kind: RatePricingKind,
  existing?: ICRateGroupPricingConfig['byTransactionType'],
): NonNullable<ICRateGroupPricingConfig['byTransactionType']> {
  const result: NonNullable<ICRateGroupPricingConfig['byTransactionType']> = {};
  for (const type of IC_SALE_TRANSACTION_TYPES) {
    const prior = existing?.[type];
    result[type] =
      kind === 'flat'
        ? autofillTransactionPricing(flat, prior?.mode === 'flat' ? prior : null)
        : autofillTransactionPricing(flat, prior?.mode === 'slab' ? prior : null);
  }
  return result;
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

  return {
    scope: 'per_type',
    kind,
    byTransactionType: buildPerTypePricing(flat, kind, config?.byTransactionType),
  };
}

export function validateSlabTiers(slabs: ICRateSlabTier[]): string | null {
  if (slabs.length === 0) return 'Add at least one volume tier.';

  const sorted = [...slabs].sort((a, b) => a.minUnits - b.minUnits);

  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i];
    if (!Number.isFinite(tier.minUnits) || tier.minUnits < 0) {
      return `Tier ${i + 1}: minimum units must be 0 or greater.`;
    }
    if (tier.maxUnits != null && tier.maxUnits <= tier.minUnits) {
      return `Tier ${i + 1}: maximum units must be greater than minimum.`;
    }
    if (!Number.isFinite(tier.saleRate) || tier.saleRate <= 0) {
      return `Tier ${i + 1}: rate must be greater than zero.`;
    }
    if (!Number.isFinite(tier.conversionRate) || tier.conversionRate <= 0) {
      return `Tier ${i + 1}: conversion must be greater than zero.`;
    }
    if (i > 0) {
      const prev = sorted[i - 1];
      if (prev.maxUnits == null) {
        return `Tier ${i}: only the last tier can be open-ended.`;
      }
      if (tier.minUnits < prev.maxUnits) {
        return 'Volume tiers cannot overlap. Each tier should start where the previous ends.';
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
      if (!pricing) continue;
      const err = validateTransactionPricing(pricing, type);
      if (err) return err;
    }
  }

  return null;
}

function resolveFromSlabs(slabs: ICRateSlabTier[], units: number): FlatRateValues | null {
  const sorted = [...slabs].sort((a, b) => a.minUnits - b.minUnits);
  for (const tier of sorted) {
    const inMin = units >= tier.minUnits;
    const inMax = tier.maxUnits == null || units < tier.maxUnits;
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
  const config = group.pricingConfig;

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
  const kind = getPricingKind(config);
  if (scope === 'all_types' && kind === 'slab') return 'Slabs (all types)';
  if (scope === 'per_type' && kind === 'flat') return 'Flat per type';
  return 'Slabs per type';
}
